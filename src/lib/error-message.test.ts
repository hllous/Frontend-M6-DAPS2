import { describe, expect, it } from "vitest";

import { errorMessage } from "./error-message";

describe("errorMessage", () => {
  it("returns the message from an Error", () => {
    expect(errorMessage(new Error("No se pudo guardar."), "Error desconocido.")).toBe("No se pudo guardar.");
  });

  it("returns the fallback for non-Error values", () => {
    expect(errorMessage({ message: "No confiable." }, "Error desconocido.")).toBe("Error desconocido.");
  });
});
