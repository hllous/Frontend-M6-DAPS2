import { POST as login } from "@/app/api/session/login/route";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import {
  AUTH_COOKIE_NAME,
  createSession,
  getAuthMode,
  sealSession,
  type SupportedAuthMode,
} from "@/lib/session";
import type { M6Role } from "@/lib/m6-roles";
import { getScenario, isScenarioId, type ScenarioCrew, type ScenarioId } from "@/lib/scenarios";

export type LoginAsOptions = {
  mode?: SupportedAuthMode;
  devJwt?: string;
  backendOrigin?: string;
  /** Roles que devuelve el GET /me de prueba; por defecto, los del fixture del escenario. */
  roles?: readonly M6Role[];
  crew?: ScenarioCrew & { role: "LEADER" | "MEMBER" };
};

function configureSessionEnvironment(options: Omit<LoginAsOptions, "crew">): void {
  if (options.mode !== undefined) process.env.M6_AUTH_MODE = options.mode;
  if (options.devJwt !== undefined) process.env.M6_DEV_JWT = options.devJwt;
  if (options.backendOrigin !== undefined) process.env.M6_BACKEND_ORIGIN = options.backendOrigin;
}

/** Responde GET /me aparte mientras corre `run`, sin tocar la cola de respuestas que el test armó para el resto. */
async function withMeStub<T>(roles: readonly M6Role[], scenarioId: ScenarioId | undefined, crew: LoginAsOptions["crew"], run: () => Promise<T>): Promise<T> {
  const actor = scenarioId ? getScenario(scenarioId).actor : undefined;
  const crews = crew ? [crew] : actor?.crewId && actor.crewName ? [{ id: actor.crewId, name: actor.crewName, role: actor.fieldRole === "CREW_MEMBER" ? "MEMBER" : "LEADER" }] : [];
  const currentFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (new URL(url, "http://localhost").pathname === "/me") {
      return Promise.resolve(Response.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles, crews }));
    }
    return currentFetch(input, init);
  }) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = currentFetch;
  }
}

/** El handler de login con un GET /me de prueba: por defecto, los roles del fixture del escenario pedido. */
export async function loginWithMe(request: Request, roles?: readonly M6Role[], crew?: LoginAsOptions["crew"]): Promise<Response> {
  const body = (await request.clone().json().catch(() => ({}))) as { scenarioId?: unknown };
  const meRoles = roles ?? (isScenarioId(body.scenarioId) ? getScenario(body.scenarioId).roles : []);
  return withMeStub(meRoles, isScenarioId(body.scenarioId) ? body.scenarioId : undefined, crew, () => login(request));
}

/** Uses the login handler with a stubbed backend identity. */
export async function loginAs(scenarioId: string, options: LoginAsOptions = {}): Promise<string> {
  configureSessionEnvironment(options);

  const response = await loginWithMe(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: SESSION_MUTATION_HEADERS,
    body: JSON.stringify({ scenarioId }),
  }), options.roles, options.crew);
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
  const session = createSession(scenarioId, {
    mode: options.mode ?? getAuthMode(),
    devJwt: options.devJwt ?? process.env.M6_DEV_JWT,
    backendOrigin: options.backendOrigin ?? process.env.M6_BACKEND_ORIGIN,
    roles: options.roles,
  });
  return `${AUTH_COOKIE_NAME}=${sealSession(options.crew ? { ...session, crew: options.crew, fieldRole: getScenario(scenarioId).actor.fieldRole } : session)}`;
}

/** Configure beforeEach with this helper and invoke its returned teardown in afterEach. */
export function backendEnv(): () => void {
  const values = {
    M6_AUTH_MODE: "backend-development",
    M6_DEV_JWT: `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`,
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
