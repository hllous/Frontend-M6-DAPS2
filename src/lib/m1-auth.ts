import { m1BaseUrl } from "./m1-refresh";

const MAX_BODY_CHARS = 8_192;
const MAX_TOKEN_CHARS = 1_200;
const MAX_ACCESS_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const LOGIN_TIMEOUT_MS = 90_000;
const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

export type M1AccessClaims = {
  subject: string;
  subType: "CIUDADANO" | "EMPLEADO";
  role: string;
  expiresAt: number;
};

export class M1CredentialsRejectedError extends Error {
  constructor() {
    super("M1 rechazó las credenciales.");
    this.name = "M1CredentialsRejectedError";
  }
}

export class M1AccountBlockedError extends Error {
  constructor() {
    super("M1 no permite el ingreso de esta cuenta.");
    this.name = "M1AccountBlockedError";
  }
}

export class M1ServiceUnavailableError extends Error {
  constructor() {
    super("El servicio de ingreso no está disponible.");
    this.name = "M1ServiceUnavailableError";
  }
}

export class M1LoginTimeoutError extends Error {
  constructor() {
    super("M1 no respondió dentro del tiempo de espera.");
    this.name = "M1LoginTimeoutError";
  }
}

export class M1InvalidResponseError extends Error {
  constructor() {
    super("M1 devolvió una respuesta inválida.");
    this.name = "M1InvalidResponseError";
  }
}

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  claims: M1AccessClaims;
};

export async function loginWithM1(
  email: string,
  password: string,
  options: { timeoutMs?: number; now?: number } = {},
): Promise<LoginResult> {
  const base = m1BaseUrl();
  if (!base) throw new M1ServiceUnavailableError();

  let response: Response;
  let timeoutSignal: AbortSignal | undefined;
  try {
    timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? LOGIN_TIMEOUT_MS);
    response = await fetch(new URL("auth/usuario/login", base), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ gmail: email, password }),
      redirect: "error",
      signal: timeoutSignal,
    });
  } catch (error) {
    if (timeoutSignal?.aborted) throw new M1LoginTimeoutError();
    throw new M1ServiceUnavailableError();
  }

  // Catalog v3.0 §6/§9 groups these login responses with rejected credentials; unknown statuses stay unavailable.
  if ([400, 401, 404, 422].includes(response.status)) throw new M1CredentialsRejectedError();
  if (response.status === 403) throw new M1AccountBlockedError();
  if (!response.ok) throw new M1ServiceUnavailableError();

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    if (timeoutSignal?.aborted) throw new M1LoginTimeoutError();
    throw new M1ServiceUnavailableError();
  }
  if (text.length > MAX_BODY_CHARS) throw new M1InvalidResponseError();
  try {
    const body: unknown = text ? JSON.parse(text) : undefined;
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("invalid body");
  } catch {
    throw new M1InvalidResponseError();
  }

  const token = response.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const refreshToken = response.headers.get("x-refresh-token") ?? undefined;
  const expiresIn = Number(response.headers.get("x-token-expires-in"));
  if (
    !token || token.length > MAX_TOKEN_CHARS || !JWT_SHAPE.test(token) ||
    !refreshToken || refreshToken.length > MAX_TOKEN_CHARS ||
    !Number.isFinite(expiresIn) || expiresIn <= 0
  ) {
    throw new M1InvalidResponseError();
  }

  const claims = readM1AccessClaims(token, options.now ?? Date.now());
  if (!claims) throw new M1InvalidResponseError();
  return { accessToken: token, refreshToken, claims };
}

export function readM1AccessClaims(token: string, now = Date.now()): M1AccessClaims | undefined {
  if (token.length > MAX_TOKEN_CHARS || !JWT_SHAPE.test(token)) return undefined;
  const encodedPayload = token.split(".")[1];
  if (!encodedPayload) return undefined;

  try {
    const value = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>;
    const subject = value.sub;
    const numericSubject = typeof subject === "number"
      ? Number.isSafeInteger(subject) && subject >= 0
      : typeof subject === "string" && /^\d{1,19}$/.test(subject);
    const normalizedSubject = numericSubject ? BigInt(String(subject)).toString() : undefined;
    const expiresAt = typeof value.exp === "number" ? value.exp * 1000 : Number.NaN;
    if (
      value.iss !== "modulo1-ciudadanos" ||
      value.typ !== "access" ||
      !normalizedSubject ||
      (value.sub_type !== "CIUDADANO" && value.sub_type !== "EMPLEADO") ||
      typeof value.rol !== "string" || value.rol.length === 0 ||
      typeof value.exp !== "number" || !Number.isFinite(value.exp) || !Number.isFinite(expiresAt) ||
      expiresAt <= now || expiresAt > now + MAX_ACCESS_LIFETIME_MS
    ) {
      return undefined;
    }

    return {
      subject: normalizedSubject,
      subType: value.sub_type,
      role: value.rol,
      expiresAt,
    };
  } catch {
    return undefined;
  }
}
