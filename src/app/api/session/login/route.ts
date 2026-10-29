import { NextResponse } from "next/server";
import { z } from "zod";

import { DEMO_IDENTITIES } from "@/lib/demo-identities";

import { demoSigningConfigured, signDemoJwt } from "@/lib/demo-jwt";
import { fetchMeWithToken } from "@/lib/me";
import { getSessionMutationRejection } from "@/lib/session-request";
import { getScenario, isScenarioId, type ScenarioCrew } from "@/lib/scenarios";
import {
  AUTH_COOKIE_NAME,
  AuthUnavailableError,
  BackendUnavailableError,
  CitizenForbiddenError,
  InvalidSessionError,
  createSession,
  getAuthMode,
  publicSession,
  SESSION_MARKER_COOKIE_NAME,
  sessionMarkerCookieOptions,
  sealSession,
  sessionCookieOptions,
  type Session,
} from "@/lib/session";

class CrewResolutionError extends Error {}

const crewListSchema = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string(), leaderUserId: z.string().nullish() })),
});
// El listado trae solo `membersCount`; los integrantes vienen en el detalle (GET /crews/:id).
const crewDetailSchema = z.object({ members: z.array(z.object({ userId: z.string() })).optional() });

async function backendJson(url: URL, token: string): Promise<{ status: number; body: unknown }> {
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
    return { status: response.status, body: await response.json().catch(() => null) };
  } catch {
    throw new BackendUnavailableError(503);
  }
}

/**
 * Campo filtra por su cuadrilla y el backend exige su UUID, que cambia con cada seed.
 * Con firma local la persona es la del seed: se busca la cuadrilla que lidera y, si no lidera ninguna, la que integra
 * (detalle de cada cuadrilla activa). Si hay varias, gana la que lidera, luego la del nombre del escenario y luego la
 * primera del listado. Con M6_DEV_JWT todos los perfiles comparten el sub del token: se resuelve por el nombre del escenario.
 */
async function resolveBackendCrew(session: Session, origin: string | undefined, token: string): Promise<ScenarioCrew | undefined> {
  const crewName = getScenario(session).actor.backendCrewName;
  if (session.mode !== "backend-development" || !crewName || !origin) return undefined;

  const unavailable = `No se pudo resolver la cuadrilla «${crewName}» del escenario de Campo contra el backend.`;
  // ponytail: una sola página de 100 (el máximo del backend); el seed tiene ~12 cuadrillas.
  const list = await backendJson(new URL("/crews?active=true&pageSize=100", origin), token);
  if (list.status < 200 || list.status >= 300) throw new CrewResolutionError(`${unavailable} (HTTP ${list.status})`);
  const crews = crewListSchema.safeParse(list.body);
  if (!crews.success) throw new CrewResolutionError(`${unavailable} (respuesta inesperada)`);

  const preferred = (candidates: typeof crews.data.data) => candidates.find((candidate) => candidate.name === crewName) ?? candidates[0];
  let crew = crews.data.data.find((candidate) => candidate.name === crewName);
  if (session.source === "demo") {
    const subject = DEMO_IDENTITIES[session.scenarioId].sub;
    const led = crews.data.data.filter((candidate) => candidate.leaderUserId === subject);
    if (led.length > 0) {
      crew = preferred(led);
    } else {
      const details = await Promise.all(crews.data.data.map(async (candidate) => {
        const detail = await backendJson(new URL(`/crews/${encodeURIComponent(candidate.id)}`, origin), token);
        const parsed = crewDetailSchema.safeParse(detail.body);
        return parsed.success && parsed.data.members?.some((member) => member.userId === subject) ? candidate : undefined;
      }));
      const joined = details.filter((candidate) => candidate !== undefined);
      if (joined.length > 0) crew = preferred(joined);
    }
  }
  if (!crew) {
    throw new CrewResolutionError(
      `La cuadrilla «${crewName}» del escenario de Campo no existe o está inactiva en el backend. Revise el seed.`,
    );
  }
  return { id: crew.id, name: crew.name };
}

export async function POST(request: Request) {
  const rejection = getSessionMutationRejection(request);
  if (rejection) return NextResponse.json({ message: rejection.message }, { status: rejection.status });

  let body: { scenarioId?: unknown };
  try {
    body = (await request.json()) as { scenarioId?: unknown };
  } catch {
    return NextResponse.json({ message: "El escenario de ingreso no es válido." }, { status: 400 });
  }

  if (!isScenarioId(body.scenarioId)) {
    return NextResponse.json({ message: "Seleccione un escenario operativo válido." }, { status: 400 });
  }

  try {
    const backendOrigin = process.env.M6_BACKEND_ORIGIN;
    const mode = getAuthMode();
    if (mode === "mock" && getScenario(body.scenarioId).subType === "CIUDADANO") throw new CitizenForbiddenError();
    const demoSigning = mode === "backend-development" && demoSigningConfigured();
    const devJwt = demoSigning ? undefined : process.env.M6_DEV_JWT;
    const loginToken = demoSigning ? signDemoJwt(body.scenarioId) : devJwt;
    // En modo backend los roles de M6 salen de GET /me, no del escenario elegido ni del token.
    const me = mode === "backend-development" && backendOrigin && loginToken
      ? await fetchMeWithToken(backendOrigin, loginToken)
      : undefined;
    const created = createSession(body.scenarioId, { mode, devJwt, backendOrigin, roles: me?.roles, demoSigning });
    const crew = created.roles.some((role) => role === "M6_CAMPO_CUADRILLA") ? await resolveBackendCrew(created, backendOrigin, loginToken ?? "") : undefined;
    const session = crew ? { ...created, crew } : created;
    const response = NextResponse.json({ session: publicSession(session) });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: sealSession(session),
      ...sessionCookieOptions(session),
    });
    response.cookies.set(SESSION_MARKER_COOKIE_NAME, "1", sessionMarkerCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof CitizenForbiddenError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error instanceof InvalidSessionError) {
      return NextResponse.json({ message: "El servicio rechazó la sesión de desarrollo. Renueve el token." }, { status: 401 });
    }
    if (error instanceof AuthUnavailableError || error instanceof CrewResolutionError || error instanceof BackendUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: "No se pudo iniciar la sesión." }, { status: 500 });
  }
}
