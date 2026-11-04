import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { createSessionCookie } from "@/test/session";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";

const server = setupServer(...handlers);
const fieldCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("BFF error copy", () => {
  it.each([
    ["GET", "/api/role-assignments/abc", undefined, "El legajo debe ser numérico."],
    ["POST", "/api/zones/zone-1/neighborhoods", { neighborhoodIds: ["barrio-inexistente"] }, "Algún barrio no figura en el catálogo de barrios de la ciudad."],
    ["POST", "/api/environmental-reports/ER-1001/request-information", { message: "Detalle adicional" }, "Solo se puede pedir información en un expediente en revisión con reclamo ciudadano."],
  ] as const)("returns plain language for %s %s", async (method, path, body, message) => {
    const response = await fetch(`http://localhost${path}`, {
      method,
      headers: SESSION_MUTATION_HEADERS,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    const payload = await response.json();
    expect(payload.message).toBe(message);
    expect(payload.message).not.toMatch(/\bM[1-9]\b|m[oó]dulo\s+[1-9]/i);
  });

  it("names Tránsito when a field service cannot start until the closure is answered", async () => {
    const response = await fetch("http://localhost/api/services/SVC-1050/start", {
      method: "POST", headers: { ...SESSION_MUTATION_HEADERS, cookie: fieldCookie }, body: "{}",
    });
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.message).toContain("pendiente de respuesta de Tránsito");
    expect(payload.message).not.toMatch(/\bM[1-9]\b|m[oó]dulo\s+[1-9]/i);
  });
});
