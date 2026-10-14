import { NextResponse } from "next/server";

import { getSessionMutationRejection } from "@/lib/session-request";
import { getScenario, isScenarioId, type ScenarioCrew } from "@/lib/scenarios";
import {
  AUTH_COOKIE_NAME,
  AuthUnavailableError,
  BackendUnavailableError,
  createSession,
  getAuthMode,
  publicSession,
  sealSession,
  sessionCookieOptions,
  type Session,
} from "@/lib/session";

class CrewResolutionError extends Error {}

/**
 * Campo filtra por su cuadrilla y el backend exige su UUID, que cambia con cada seed.
 * El escenario guarda el nombre (Crew no tiene código) y acá se busca el id real.
 */
async function resolveBackendCrew(session: Session, origin: string | undefined): Promise<ScenarioCrew | undefined> {
  const crewName = getScenario(session.scenarioId).actor.backendCrewName;
  if (session.mode !== "backend-development" || !crewName || !origin) return undefined;

  const unavailable = `No se pudo resolver la cuadrilla «${crewName}» del escenario de Campo contra el backend.`;
  let response: Response;
  try {
    // ponytail: una sola página de 100 (el máximo del backend); el seed tiene ~10 cuadrillas.
    response = await fetch(new URL("/crews?active=true&pageSize=100", origin), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new BackendUnavailableError(503);
  }
  if (!response.ok) throw new CrewResolutionError(`${unavailable} (HTTP ${response.status})`);
  const body = (await response.json().catch(() => null)) as { data?: { id?: unknown; name?: unknown }[] } | null;
  const crew = body?.data?.find((candidate) => candidate.name === crewName);
  if (typeof crew?.id !== "string") {
    throw new CrewResolutionError(
      `La cuadrilla «${crewName}» del escenario de Campo no existe o está inactiva en el backend. Revise el seed.`,
    );
  }
  return { id: crew.id, name: crewName };
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
    const created = createSession(body.scenarioId, {
      mode: getAuthMode(),
      devJwt: process.env.M6_DEV_JWT,
      backendOrigin,
    });
    const crew = await resolveBackendCrew(created, backendOrigin);
    const session = crew ? { ...created, crew } : created;
    const response = NextResponse.json({ session: publicSession(session) });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: sealSession(session),
      ...sessionCookieOptions(session),
    });
    return response;
  } catch (error) {
    if (error instanceof AuthUnavailableError || error instanceof CrewResolutionError || error instanceof BackendUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: "No se pudo iniciar la sesión." }, { status: 500 });
  }
}
