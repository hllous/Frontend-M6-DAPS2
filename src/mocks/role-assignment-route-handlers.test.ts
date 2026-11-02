import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { backendEnv, createSessionCookie } from "@/test/session";
import { getSessionFromRequest } from "@/lib/session";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { resetRoleAssignmentFixtures } from "./role-assignment-fixtures";
import { handlers } from "./handlers";
const server = setupServer(...handlers);
const field = createSessionCookie("field-crew-leader-route", { mode: "mock" });
const auditor = createSessionCookie("office-limited-intake", { mode: "mock" });
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetRoleAssignmentFixtures(); });
afterAll(() => server.close());
function call(method: string, path: string, body?: unknown, cookie?: string) {
  return fetch(`http://localhost/api/role-assignments${path}`, { method, headers: { ...SESSION_MUTATION_HEADERS, ...(cookie ? { cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
describe("asignaciones mediante las rutas BFF", () => {
  it("lista y consulta una persona sin roles", async () => {
    const response = await call("GET", "");
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(expect.arrayContaining([expect.objectContaining({ userId: "2", roles: ["M6_ADMIN"] })]));
    expect(await (await call("GET", "/999")).json()).toEqual({ userId: "999", roles: [] });
  });
  it("guarda y quita roles", async () => {
    expect((await call("PUT", "/999", { roles: ["M6_CAMPO_INSPECTOR"] })).status).toBe(200);
    expect((await (await call("GET", "/999")).json()).roles).toEqual(["M6_CAMPO_INSPECTOR"]);
    expect((await call("DELETE", "/999")).status).toBe(204);
    expect((await call("DELETE", "/999")).status).toBe(204);
  });
  it("rechaza ids, roles duplicados o desconocidos y mezclas", async () => {
    for (const method of ["GET", "PUT", "DELETE"]) expect((await call(method, "/abc", { roles: [] })).status).toBe(400);
    for (const roles of [["M6_ADMIN", "M6_ADMIN"], ["INVALIDO"], ["M6_ADMIN", "M6_CAMPO_CUADRILLA"]]) expect((await call("PUT", "/999", { roles })).status).toBe(400);
  });
  it("actualiza la sesión al modificar los propios roles", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "mock" });
    expect((await call("PUT", "/999", { roles: ["M6_ADMIN"] }, cookie)).status).toBe(200);
    const response = await call("PUT", "/2", { roles: ["M6_AUDITOR"] }, cookie);
    expect(response.status).toBe(200);
    const renewed = response.headers.get("set-cookie")?.split(";")[0];
    expect(renewed).toBeTruthy();
    expect(getSessionFromRequest(new Request("http://localhost", { headers: { cookie: renewed! } }))?.roles).toEqual(["M6_AUDITOR"]);
  });
  it("protege al último administrador", async () => {
    expect((await call("PUT", "/2", { roles: [] })).status).toBe(409);
    expect((await call("DELETE", "/2")).status).toBe(409);
  });
  it("niega acceso a Campo y auditoría", async () => {
    for (const cookie of [field, auditor]) for (const [method, path] of [["GET", ""], ["GET", "/2"], ["PUT", "/2"], ["DELETE", "/2"]]) expect((await call(method, path, { roles: [] }, cookie)).status).toBe(403);
  });
});

describe("respuestas del backend", () => {
  it("reenvía estados y contenido de las cuatro operaciones", async () => {
    const restore = backendEnv();
    try {
      const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
      for (const status of [200, 400, 403, 404, 409]) {
        server.use(...["https://backend.internal/role-assignments", "https://backend.internal/role-assignments/:userId"].map((path) => http.all(path, () => HttpResponse.json({ message: `backend ${status}` }, { status }))));
        for (const [method, path] of [["GET", ""], ["GET", "/42"], ["PUT", "/42"], ["DELETE", "/42"]]) {
          const response = await call(method, path, method === "PUT" ? { roles: ["M6_AUDITOR"] } : undefined, cookie);
          expect(response.status).toBe(status);
          expect(await response.json()).toMatchObject({ message: `backend ${status}` });
        }
      }
    } finally { restore(); }
  });
  it("rechaza una sesión ausente o inválida", async () => {
    for (const [method, path] of [["GET", ""], ["GET", "/42"], ["PUT", "/42"], ["DELETE", "/42"]]) {
      expect((await call(method, path, method === "PUT" ? { roles: [] } : undefined, "m6_session=invalid")).status).toBe(401);
    }
  });
});