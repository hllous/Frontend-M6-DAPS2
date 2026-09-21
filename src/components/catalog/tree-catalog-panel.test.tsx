import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetTreeFixtures } from "@/lib/tree-fixtures";
import { scenarios } from "@/lib/scenarios";
import { TreeCatalogPanel } from "./tree-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetTreeFixtures());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("TreeCatalogPanel", () => {
  it("lists trees for any authenticated actor and opens detail without management actions", async () => {
    render(<TreeCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Árboles" })).toBeVisible();
    expect(await screen.findByRole("row", { name: /ARB-00442/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Ver detalle" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Registrar árbol" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
  });

  it("lets Office edit mutable measurements and deactivate logically while keeping survey code immutable", async () => {
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /ARB-00442/ });
    await within(row).getByRole("button", { name: "Editar" }).click();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Código de relevamiento")).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Altura (m)"), { target: { value: "15" } });
    await within(dialog).getByRole("button", { name: "Guardar árbol" }).click();
    expect(await screen.findByText("Árbol actualizado con éxito.")).toBeVisible();
    const refreshedRow = await screen.findByRole("row", { name: /ARB-00442/ });
    await within(refreshedRow).getByRole("button", { name: "Dar de baja" }).click();
    expect(await screen.findByText(/Árbol dado de baja/)).toBeVisible();
  });

  it("shows the zone name in the Zona column and never the raw zone id", async () => {
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /ARB-00442/ });
    expect(await within(row).findByText("Z-BEL · Belgrano")).toBeVisible();
    expect(within(row).queryByText("zone-1")).not.toBeInTheDocument();
  });

  it("shows neutral text while zones load and when a zone cannot be resolved", async () => {
    let releaseZones = () => {};
    const zonesGate = new Promise<void>((resolve) => { releaseZones = resolve; });
    server.use(http.get("*/api/zones", async () => {
      await zonesGate;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } });
    }));
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /ARB-00442/ });
    expect(within(row).getByText("Cargando zona…")).toBeVisible();
    releaseZones();
    expect(await within(row).findByText("Zona no disponible")).toBeVisible();
    expect(within(row).queryByText("zone-1")).not.toBeInTheDocument();
  });

  it("requests zones with the maximum page size so every zone resolves", async () => {
    const pageSizes: Array<string | null> = [];
    server.use(http.get("*/api/zones", ({ request }) => {
      pageSizes.push(new URL(request.url).searchParams.get("pageSize"));
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } });
    }));
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("row", { name: /ARB-00442/ });
    expect(pageSizes).toContain("100");
  });
});
