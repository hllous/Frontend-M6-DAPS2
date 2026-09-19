import { describe, expect, it } from "vitest";

import { establishmentDirectoryAdapter } from "./establishment-directory";

describe("establishment directory adapter seam", () => {
  it("resolves a known fixture without coupling the notice flow to M4", async () => {
    await expect(establishmentDirectoryAdapter.resolve({ query: "EST-BOEDO-1880" })).resolves.toMatchObject({
      id: "EST-BOEDO-1880",
      address: "Av. Boedo 1880",
    });
  });

  it("returns null when the replaceable directory cannot resolve a reference", async () => {
    await expect(establishmentDirectoryAdapter.resolve({ query: "referencia inexistente" })).resolves.toBeNull();
  });
});
