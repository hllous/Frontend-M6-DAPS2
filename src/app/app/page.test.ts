import { describe, expect, it } from "vitest";

import { generateMetadata } from "./page";

describe("AppPage metadata", () => {
  it.each([
    ["work", "Mi trabajo"],
    ["services", "Servicios"],
    ["referrals", "Derivaciones"],
    ["inventory", "Inventario"],
    ["environment", "Control Ambiental"],
    ["map", "Mapa"],
    ["catalog", "Catálogo"],
    ["dashboards", "Tableros"],
  ])("uses a title for the %s destination", async (destination, label) => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ destination }),
    });

    expect(metadata.title).toBe(`M6 — ${label}`);
  });

  it("uses the My Work title when no destination is selected", async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe("M6 — Mi trabajo");
  });
});
