import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const HOST = "127.0.0.1";
const PORT = Number(process.env.FAKE_M1_PORT ?? 3120);
const DEFAULT_SECRET = Buffer.from("m6-fake-m1-development-secret-only-796").toString("base64");
const secret = Buffer.from(process.env.M1_FAKE_JWT_SECRET ?? DEFAULT_SECRET, "base64");
const TOKEN_TTL_SECONDS = 900;
const refreshTokens = new Map();

const accounts = [
  { email: "carlos.rodriguez@m6.local", password: "m6-dev-796", sub: "2", role: "RESPONSABLE_AREA" },
  { email: "julian.lopez@m6.local", password: "m6-dev-796", sub: "3", role: "ADMINISTRATIVO" },
  { email: "diego.sosa@m6.local", password: "m6-dev-796", sub: "5", role: "ADMINISTRATIVO" },
  { email: "camila.medina@m6.local", password: "m6-dev-796", sub: "8", role: "AUDITOR" },
  { email: "diego.dominguez@m6.local", password: "m6-dev-796", sub: "101", role: "ADMINISTRATIVO" },
  { email: "valeria.aguirre@m6.local", password: "m6-dev-796", sub: "102", role: "ADMINISTRATIVO" },
  { email: "lucia.lopez@m6.local", password: "m6-dev-796", sub: "601", role: "ADMINISTRATIVO" },
  { email: "sin-rol@m6.local", password: "m6-dev-796", sub: "900", role: "ADMINISTRATIVO" },
  { email: "ciudadano@m6.local", password: "m6-dev-796", sub: "901", role: "CIUDADANO", subType: "CIUDADANO" },
  { email: "inactivo@m6.local", password: "m6-dev-796", sub: "902", role: "ADMINISTRATIVO", active: false },
];

if (process.env.NODE_ENV === "production") {
  throw new Error("El M1 falso no se puede ejecutar en producción.");
}
if (secret.length < 32) throw new Error("M1_FAKE_JWT_SECRET debe decodificar a 32 bytes como mínimo.");
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error("FAKE_M1_PORT debe estar entre 1024 y 65535.");

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

function issueAccessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    iss: "modulo1-ciudadanos",
    sub: account.sub,
    sub_type: account.subType ?? "EMPLEADO",
    rol: account.role,
    typ: "access",
    actorType: account.subType ?? "EMPLEADO",
    ...(account.subType === "CIUDADANO"
      ? { citizenId: `00000000-0000-4000-8000-${String(account.sub).padStart(12, "0")}` }
      : { actorId: `00000000-0000-4000-8000-${String(account.sub).padStart(12, "0")}` }),
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  })}`;
  return `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
}

function writeTokens(response, account, refreshToken) {
  response.writeHead(200, {
    authorization: `Bearer ${issueAccessToken(account)}`,
    "x-refresh-token": refreshToken,
    "x-token-expires-in": String(TOKEN_TTL_SECONDS),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify({ user_id: account.sub, role: account.role, auth: true }));
}

const server = createServer(async (request, response) => {
  const remote = request.socket.remoteAddress;
  if (remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
    sendJson(response, 403, { message: "Solo se permiten conexiones locales." });
    return;
  }

  if (request.method === "POST" && request.url === "/api/v1/auth/usuario/login") {
    let body;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 8_192) {
          sendJson(response, 413, { message: "Solicitud demasiado grande." });
          return;
        }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      sendJson(response, 400, { message: "Solicitud inválida." });
      return;
    }

    if (body?.gmail === "m1-caido@m6.local") {
      sendJson(response, 503, { message: "Servicio de prueba no disponible." });
      return;
    }
    if (typeof body?.gmail !== "string" || typeof body?.password !== "string") {
      sendJson(response, 400, { message: "Solicitud inválida." });
      return;
    }
    const account = accounts.find((candidate) => candidate.email === body.gmail.trim().toLowerCase());
    const supplied = Buffer.from(body.password);
    const expected = Buffer.from(account?.password ?? "invalid-password");
    const matches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
    if (!account || !matches) {
      sendJson(response, 401, { message: "Credenciales inválidas." });
      return;
    }
    if (account.active === false) {
      sendJson(response, 403, { message: "La cuenta está inactiva." });
      return;
    }

    const refreshToken = randomBytes(40).toString("base64url");
    refreshTokens.set(refreshToken, account);
    writeTokens(response, account, refreshToken);
    return;
  }

  if (request.method === "POST" && request.url === "/api/v1/auth/refresh") {
    const refreshToken = request.headers["x-refresh-token"];
    const account = typeof refreshToken === "string" ? refreshTokens.get(refreshToken) : undefined;
    if (!account || account.active === false) {
      sendJson(response, 401, { message: "Sesión de prueba vencida." });
      return;
    }
    writeTokens(response, account, refreshToken);
    return;
  }

  sendJson(response, 404, { message: "Ruta de prueba no encontrada." });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`M1 de desarrollo disponible en http://${HOST}:${PORT}/api/v1/\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
