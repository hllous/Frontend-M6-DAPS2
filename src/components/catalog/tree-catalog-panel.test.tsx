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
beforeEach(() => { resetTreeFixtures(); window.history.replaceState(null, "", "/app/catalog/trees"); });
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
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirmar baja" }));
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

  it("asks for confirmation before deactivating and does nothing if cancelled", async () => {
    let removed = 0;
    server.events.on("request:start", ({ request }) => { if (request.method === "DELETE") removed += 1; });
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /ARB-00442/ });
    fireEvent.click(within(row).getByRole("button", { name: "Dar de baja" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(removed).toBe(0);
    expect(screen.queryByText(/Árbol dado de baja/)).not.toBeInTheDocument();
  });

  it("keeps filters and selected tree in the URL and restores them on load", async () => {
    window.history.replaceState(null, "", "/app/catalog/trees?q=Jacar&active=true&page=1");
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByLabelText("Buscar árbol")).toHaveValue("Jacar");
    expect(screen.getByLabelText("Filtrar árboles por estado")).toHaveValue("true");
    await screen.findByRole("row", { name: /ARB-00442/ });
    fireEvent.change(screen.getByLabelText("Filtrar árboles por zona"), { target: { value: "zone-1" } });
    const params = new URLSearchParams(window.location.search);
    expect(params.get("zone")).toBe("zone-1");
    expect(params.get("active")).toBe("true");
    expect(params.get("q")).toBe("Jacar");
    expect(params.has("page")).toBe(false);
  });

  it("opens the detail from the list, selects the tree in the URL and links surveys, map and interventions", async () => {
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /ARB-00442/ });
    fireEvent.click(within(row).getByRole("button", { name: "Ver detalle" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("tree")).toBe("tree-1");
    expect(params.get("detail")).toBe("tree-1");

    const dialog = await screen.findByRole("dialog", { name: /Detalle del árbol ARB-00442/ });
    expect(await within(dialog).findByText("Riesgo medio")).toBeVisible();
    expect(within(dialog).getByText(/1 relevamiento,/)).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Ver en el mapa" })).toHaveAttribute("href", "/app?destination=map&tree=tree-1");
    expect(within(dialog).getByRole("link", { name: "Ir a intervenciones de arbolado" })).toHaveAttribute("href", "/app/catalog/tree-interventions");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar detalle" }));
    const after = new URLSearchParams(window.location.search);
    expect(after.has("detail")).toBe(false);
    expect(after.get("tree")).toBe("tree-1");
    expect(await screen.findByRole("row", { name: /ARB-00442/ })).toHaveAttribute("aria-current", "true");
  });

  it("restores the detail opened from the map link and opens the survey history from it", async () => {
    window.history.replaceState(null, "", "/app/catalog/trees?tree=tree-1&detail=tree-1");
    render(<TreeCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    const dialog = await screen.findByRole("dialog", { name: /Detalle del árbol ARB-00442/ });
    fireEvent.click(await within(dialog).findByRole("button", { name: "Ver historial de relevamientos" }));
    expect(await screen.findByRole("heading", { name: "Historial de relevamientos · ARB-00442" })).toBeVisible();
    expect(new URLSearchParams(window.location.search).has("detail")).toBe(false);
  });

  it("keeps the tree detail when surveys fail and says so", async () => {
    window.history.replaceState(null, "", "/app/catalog/trees?tree=tree-1&detail=tree-1");
    server.use(http.get("*/api/trees/:treeId/surveys", () => HttpResponse.json({ statusCode: 503, message: "No disponible", error: "Service Unavailable" }, { status: 503 })));
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const dialog = await screen.findByRole("dialog", { name: /Detalle del árbol/ });
    expect(await within(dialog).findByText("No se pudieron cargar los relevamientos.")).toBeVisible();
    expect(within(dialog).getByText("Jacarandá")).toBeVisible();
  });

  it("requests the page from the URL with the backend default page size and paginates", async () => {
    window.history.replaceState(null, "", "/app/catalog/trees?page=2");
    const seen: Array<{ page: string | null; pageSize: string | null }> = [];
    server.use(http.get("*/api/trees", ({ request }) => {
      const p = new URL(request.url).searchParams;
      seen.push({ page: p.get("page"), pageSize: p.get("pageSize") });
      return HttpResponse.json({ data: [], meta: { total: 45, page: 2, pageSize: 20, totalPages: 3 } });
    }));
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByText("Sin árboles");
    expect(seen[0]).toEqual({ page: "2", pageSize: "20" });
  });
});
