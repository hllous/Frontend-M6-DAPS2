import { POST as login } from "@/app/api/session/login/route";
import { DEMO_IDENTITIES } from "@/lib/demo-identities";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { sessionFromMe } from "@/lib/me";
import {
  AUTH_COOKIE_NAME,
  createM1Session,
  createSession,
  getAuthMode,
  publicSession,
  readJwtExpiry,
  sealSession,
  type SupportedAuthMode,
} from "@/lib/session";
import type { M6Role } from "@/lib/m6-roles";
import { getScenario, isScenarioId, type ScenarioCrew, type ScenarioId } from "@/lib/scenarios";

/** Access token falso de M1 (vence en 2099) que los tests de BFF reenvían al backend mockeado. */
export const TEST_ACCESS_TOKEN = "header.eyJleHAiOjQxMDAwMDAwMDB9.signature";

export type LoginAsOptions = {
  mode?: SupportedAuthMode;
  /** Access token de M1 de la sesión `real-m1`; por defecto, TEST_ACCESS_TOKEN. */
  accessToken?: string;
  backendOrigin?: string;
  /** Roles que devuelve el GET /me de prueba; por defecto, los del fixture del escenario. */
  roles?: readonly M6Role[];
  crew?: ScenarioCrew & { role: "LEADER" | "MEMBER" };
};

function configureSessionEnvironment(options: Omit<LoginAsOptions, "crew">): void {
  if (options.mode !== undefined) process.env.M6_AUTH_MODE = options.mode;
  if (options.backendOrigin !== undefined) process.env.M6_BACKEND_ORIGIN = options.backendOrigin;
}

/** Sesión `real-m1` ya resuelta contra un GET /me de prueba (sin pasar por el login real de M1). */
function m1SessionFor(scenarioId: ScenarioId, options: { accessToken?: string; roles?: readonly M6Role[]; crew?: LoginAsOptions["crew"] }, fixtureCrew = false) {
  const accessToken = options.accessToken ?? TEST_ACCESS_TOKEN;
  const userId = DEMO_IDENTITIES[scenarioId].sub;
  const actor = getScenario(scenarioId).actor;
  const crews = options.crew
    ? [options.crew]
    : fixtureCrew && actor.crewId && actor.crewName ? [{ id: actor.crewId, name: actor.crewName, role: actor.fieldRole === "CREW_MEMBER" ? "MEMBER" as const : "LEADER" as const }] : [];
  const created = createM1Session({
    accessToken,
    refreshToken: "refresh-test",
    jwtExpiresAt: readJwtExpiry(accessToken) ?? Date.now() + 15 * 60 * 1000,
    identity: { userId, subType: "EMPLEADO", m1Role: "ADMINISTRATIVO" },
  });
  return sessionFromMe({ ...created, scenarioId }, { userId, subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: [...(options.roles ?? getScenario(scenarioId).roles)], crews });
}

/** Sesión `real-m1` sellable, sin cuadrilla salvo que el test la pase (la resolvería GET /me). */
export function createTestSession(scenarioId: ScenarioId, options: { accessToken?: string; roles?: readonly M6Role[]; crew?: ScenarioCrew } = {}) {
  return m1SessionFor(scenarioId, { ...options, crew: undefined });
}

/** El handler de login de mock; en `real-m1` devuelve la sesión que dejaría un login real de M1 con un GET /me de prueba. */
export async function loginWithMe(request: Request, roles?: readonly M6Role[], crew?: LoginAsOptions["crew"]): Promise<Response> {
  if (getAuthMode() !== "real-m1") return login(request);
  const body = (await request.clone().json().catch(() => ({}))) as { scenarioId?: unknown };
  if (!isScenarioId(body.scenarioId)) return Response.json({ message: "Escenario inválido." }, { status: 400 });
  const session = m1SessionFor(body.scenarioId, { roles, crew }, true);
  return Response.json({ session: publicSession(session) }, { headers: { "set-cookie": `${AUTH_COOKIE_NAME}=${sealSession(session)}; Path=/; HttpOnly` } });
}

/** Inicia una sesión de prueba: por el handler de login en mock, o con un GET /me de prueba en `real-m1`. */
export async function loginAs(scenarioId: string, options: LoginAsOptions = {}): Promise<string> {
  configureSessionEnvironment(options);
  const mockRequest = new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: SESSION_MUTATION_HEADERS,
    body: JSON.stringify({ scenarioId }),
  });
  const response = getAuthMode() === "real-m1" && isScenarioId(scenarioId)
    ? Response.json({}, { headers: { "set-cookie": `${AUTH_COOKIE_NAME}=${sealSession(m1SessionFor(scenarioId, options, true))}; Path=/` } })
    : await loginWithMe(mockRequest, options.roles, options.crew);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!response.ok || !cookie) {
    throw new Error(`No se pudo iniciar la sesión de prueba (HTTP ${response.status}).`);
  }
  return cookie;
}

/** Creates a sealed session directly when a test needs a state the login route cannot select. */
export function createSessionCookie(
  scenarioId: ScenarioId,
  options: Omit<LoginAsOptions, "crew"> & { crew?: ScenarioCrew },
): string {
  configureSessionEnvironment(options);
  const mode = options.mode ?? getAuthMode();
  if (mode === "real-m1") {
    const session = createTestSession(scenarioId, options);
    return `${AUTH_COOKIE_NAME}=${sealSession(options.crew ? { ...session, crew: options.crew, fieldRole: getScenario(scenarioId).actor.fieldRole } : session)}`;
  }
  const session = createSession(scenarioId, { mode, roles: options.roles });
  return `${AUTH_COOKIE_NAME}=${sealSession(options.crew ? { ...session, crew: options.crew, fieldRole: getScenario(scenarioId).actor.fieldRole } : session)}`;
}

/** Configure beforeEach with this helper and invoke its returned teardown in afterEach. */
export function backendEnv(): () => void {
  const values = {
    M6_AUTH_MODE: "real-m1",
    M6_BACKEND_ORIGIN: "https://backend.internal",
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}
