import { POST as login } from "@/app/api/session/login/route";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import {
  AUTH_COOKIE_NAME,
  createSession,
  createM1Session,
  getAuthMode,
  readJwtExpiry,
  readJwtSubject,
  sealSession,
  type SupportedAuthMode,
  type Session,
} from "@/lib/session";
import type { M6Role } from "@/lib/m6-roles";
import { getScenario, isScenarioId, type ScenarioCrew, type ScenarioId } from "@/lib/scenarios";

type TestCrew = ScenarioCrew & { role?: "LEADER" | "MEMBER" };

export type LoginAsOptions = {
  mode?: SupportedAuthMode;
  accessToken?: string;
  backendOrigin?: string;
  /** Roles que devuelve el GET /me de prueba; por defecto, los del fixture del escenario. */
  roles?: readonly M6Role[];
  crew?: TestCrew | null;
};

function configureSessionEnvironment(options: Omit<LoginAsOptions, "crew">): void {
  if (options.mode !== undefined) process.env.M6_AUTH_MODE = options.mode;
  if (options.backendOrigin !== undefined) process.env.M6_BACKEND_ORIGIN = options.backendOrigin;
}

/** Uses the mock login handler; real-M1 route tests seed a sealed session instead. */
export async function loginAs(scenarioId: string, options: LoginAsOptions = {}): Promise<string> {
  configureSessionEnvironment(options);

  if ((options.mode ?? getAuthMode()) === "real-m1") {
    if (!isScenarioId(scenarioId)) throw new Error(`Escenario de prueba desconocido: ${scenarioId}`);
    return createSessionCookie(scenarioId, options);
  }

  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: SESSION_MUTATION_HEADERS,
    body: JSON.stringify({ scenarioId }),
  }));
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!response.ok || !cookie) {
    throw new Error(`No se pudo iniciar la sesión de prueba (HTTP ${response.status}).`);
  }
  return cookie;
}

/** Creates a sealed session directly when a test needs a state the login route cannot select. */
export function createSessionCookie(
  scenarioId: ScenarioId,
  options: Omit<LoginAsOptions, "crew"> & { crew?: TestCrew | null } = {},
): string {
  configureSessionEnvironment(options);
  const mode = options.mode ?? getAuthMode();
  const session = mode === "mock"
    ? createSession(scenarioId, { mode, roles: options.roles })
    : testM1Session(scenarioId, options);
  return `${AUTH_COOKIE_NAME}=${sealSession(options.crew ? { ...session, crew: options.crew, fieldRole: getScenario(scenarioId).actor.fieldRole } : session)}`;
}

export const TEST_M1_ACCESS_TOKEN = `header.${Buffer.from(JSON.stringify({ sub: "42", exp: Math.floor(Date.now() / 1000) + 3_600 })).toString("base64url")}.signature`;

function testM1Session(scenarioId: ScenarioId, options: Omit<LoginAsOptions, "crew"> & { crew?: TestCrew | null }): Session {
  const accessToken = options.accessToken ?? process.env.M1_TEST_ACCESS_TOKEN ?? TEST_M1_ACCESS_TOKEN;
  const scenario = getScenario(scenarioId);
  const session = createM1Session({
    accessToken,
    refreshToken: "test-refresh-token",
    jwtExpiresAt: readJwtExpiry(accessToken) ?? Date.now() + 3_600_000,
    identity: { userId: readJwtSubject(accessToken) ?? "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO" },
    roles: options.roles ?? scenario.roles,
  });
  return {
    ...session,
    scenarioId,
    crew: options.crew === null ? undefined : options.crew ?? (scenario.actor.crewId && scenario.actor.crewName
      ? { id: scenario.actor.crewId, name: scenario.actor.crewName }
      : undefined),
    fieldRole: options.crew?.role === "MEMBER" ? "CREW_MEMBER" : options.crew?.role === "LEADER" ? "CREW_LEADER" : scenario.actor.fieldRole,
  };
}

/** Configure beforeEach with this helper and invoke its returned teardown in afterEach. */
export function backendEnv(): () => void {
  const values = {
    M6_AUTH_MODE: "real-m1",
    M1_TEST_ACCESS_TOKEN: TEST_M1_ACCESS_TOKEN,
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
