import { POST as login } from "@/app/api/session/login/route";

/** Uses the configured auth mode; backend Field logins need a stubbed /crews response. */
export async function loginAs(scenarioId: string): Promise<string> {
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
