import { describe, expect, it } from "vitest";

import { BackendContractError, BackendRequestError, parseBackendError, readJsonBody } from "@/lib/backend-client";

describe("backend client response parsing", () => {
  it("returns JSON without assuming a resource success schema", async () => {
    expect(await readJsonBody(Response.json({ id: "example" }), "vehículos")).toEqual({ id: "example" });
  });

  it("rejects malformed JSON with a resource-specific contract error and its cause", async () => {
    const result = readJsonBody(new Response("<html>upstream</html>"), "cuadrillas");
    await expect(result).rejects.toBeInstanceOf(BackendContractError);
    await expect(result).rejects.toMatchObject({ message: "La respuesta de cuadrillas no es JSON válido.", cause: expect.any(Error) });
  });

  it.each(["Acceso denegado.", ["El código es obligatorio.", "La fecha es inválida."]])("parses a documented error message %j", (message) => {
    const result = parseBackendError({
      statusCode: 403, message, error: "Forbidden", timestamp: "2026-10-13T18:00:00.000Z", path: "/services",
    }, "servicios");
    expect(result).toBeInstanceOf(BackendRequestError);
    expect(result).toMatchObject({ status: 403, message: Array.isArray(message) ? "El código es obligatorio. La fecha es inválida." : "Acceso denegado." });
  });

  it.each([null, { statusCode: 400, message: "incomplete" }, { statusCode: "400", message: "bad" }])("rejects malformed error envelopes %j", (payload) => {
    const result = parseBackendError(payload, "vehículos");
    expect(result).toBeInstanceOf(BackendContractError);
    expect(result).toMatchObject({ message: "La respuesta de error de vehículos no respeta el contrato documentado.", cause: expect.any(Error) });
  });
});
