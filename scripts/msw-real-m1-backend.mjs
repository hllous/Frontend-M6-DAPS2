import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

if (process.env.NODE_ENV === "production" || process.env.M6_REAL_M1_MOCK_BACKEND !== "true") {
  throw new Error("El Backend MSW de real-m1 solo se puede cargar desde la configuración local de desarrollo.");
}

const employees = new Map([
  ["2", { roles: ["M6_ADMIN"] }],
  ["3", { roles: ["M6_OFICINA_OPERACIONES"] }],
  ["5", { roles: ["M6_OFICINA_AMBIENTAL"] }],
  ["8", { roles: ["M6_AUDITOR"] }],
  ["10000", { roles: ["M6_CAMPO_CUADRILLA"], crews: [{ id: "crew-10000", name: "Cuadrilla Demo", role: "LEADER" }] }],
  ["10001", { roles: ["M6_CAMPO_CUADRILLA"], crews: [{ id: "crew-10001", name: "Cuadrilla Demo", role: "MEMBER" }] }],
  ["10070", { roles: ["M6_CAMPO_INSPECTOR"] }],
  ["900", { roles: [] }],
]);

function tokenClaims(request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/i)?.[1];
  if (!token) return undefined;
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
}

const server = setupServer(
  http.get("http://m6-demo-backend.invalid/me", ({ request }) => {
    const claims = tokenClaims(request);
    if (!claims || claims.sub_type !== "EMPLEADO") {
      return HttpResponse.json({ message: "Este sistema es solo para personal municipal." }, { status: 403 });
    }
    const userId = String(claims.sub);
    const assigned = employees.get(userId) ?? { roles: [] };
    return HttpResponse.json({
      userId,
      subType: claims.sub_type,
      m1Role: claims.rol,
      roles: assigned.roles,
      crews: assigned.crews ?? [],
    });
  }),
);

server.listen({ onUnhandledRequest: "bypass" });
process.on("exit", () => server.close());
