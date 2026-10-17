const {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} = require("node:crypto");
const { AUTH_COOKIE_NAME } = require("./session-config.cjs");

const DEFAULT_LOCAL_SESSION_SECRET = "m6-local-development-session-secret";
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;

const sessionKeySalt = Buffer.from("m6-bff-session-key-salt-v1", "utf8");
const sessionKeyInfo = Buffer.from("aes-256-gcm cookie encryption v1", "utf8");

/**
 * @template {string} TScenarioId
 * @param {TScenarioId} scenarioId
 * @param {number} now
 * @returns {{ mode: "mock", scenarioId: TScenarioId, issuedAt: number, lastActivityAt: number, absoluteExpiresAt: number, jwtExpiresAt: number }}
 */
function createMockSessionState(scenarioId, now) {
  return {
    mode: "mock",
    scenarioId,
    issuedAt: now,
    lastActivityAt: now,
    absoluteExpiresAt: now + SESSION_ABSOLUTE_MS,
    jwtExpiresAt: now + SESSION_ABSOLUTE_MS,
  };
}

/** @param {object} session @param {string} secret */
function sealSessionValue(session, secret) {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((value) => value.toString("base64url")).join(".");
}

/** @param {string} cookieValue @param {string} secret */
function openSessionValue(cookieValue, secret) {
  const [encodedIv, encodedAuthTag, encodedCiphertext] = cookieValue.split(".");
  if (!encodedIv || !encodedAuthTag || !encodedCiphertext) throw new Error("Invalid session cookie.");

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedAuthTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * @param {{ NODE_ENV?: string, M6_AUTH_MODE?: string, M6_SESSION_SECRET?: string }} environment
 * @param {number} [now]
 */
function createLocalMockWarmupCookie(environment, now = Date.now()) {
  if (environment.NODE_ENV === "production") {
    throw new Error("Authenticated warm-up is available only in local development.");
  }
  if (environment.M6_AUTH_MODE && environment.M6_AUTH_MODE !== "mock") {
    throw new Error("Authenticated warm-up requires mock authentication.");
  }

  const secret = environment.M6_SESSION_SECRET || DEFAULT_LOCAL_SESSION_SECRET;
  const session = createMockSessionState("office-duty-queue", now);
  return `${AUTH_COOKIE_NAME}=${sealSessionValue(session, secret)}`;
}

function deriveKey(secret) {
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(secret, "utf8"),
    sessionKeySalt,
    sessionKeyInfo,
    32,
  ));
}

module.exports = {
  createLocalMockWarmupCookie,
  createMockSessionState,
  DEFAULT_LOCAL_SESSION_SECRET,
  openSessionValue,
  sealSessionValue,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
};
