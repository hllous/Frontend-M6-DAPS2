import { POST as login } from "@/app/api/session/login/route";
import {
  AUTH_COOKIE_NAME,
  createSession,
  getAuthMode,
  sealSession,
  type SupportedAuthMode,
} from "@/lib/session";
import type { ScenarioCrew, ScenarioId } from "@/lib/scenarios";

export type LoginAsOptions = {
  mode?: SupportedAuthMode;
  devJwt?: string;
  backendOrigin?: string;
};

function configureSessionEnvironment(options: LoginAsOptions): void {
  if (options.mode !== undefined) process.env.M6_AUTH_MODE = options.mode;
  if (options.devJwt !== undefined) process.env.M6_DEV_JWT = options.devJwt;
  if (options.backendOrigin !== undefined) process.env.M6_BACKEND_ORIGIN = options.backendOrigin;
}

/** Uses the login handler; backend Field logins need a stubbed /crews response. */
export async function loginAs(scenarioId: string, options: LoginAsOptions = {}): Promise<string> {
  configureSessionEnvironment(options);

  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
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
  options: LoginAsOptions & { crew?: ScenarioCrew },
): string {
  configureSessionEnvironment(options);
  const session = createSession(scenarioId, {
    mode: options.mode ?? getAuthMode(),
    devJwt: options.devJwt ?? process.env.M6_DEV_JWT,
    backendOrigin: options.backendOrigin ?? process.env.M6_BACKEND_ORIGIN,
  });
  return `${AUTH_COOKIE_NAME}=${sealSession(options.crew ? { ...session, crew: options.crew } : session)}`;
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
