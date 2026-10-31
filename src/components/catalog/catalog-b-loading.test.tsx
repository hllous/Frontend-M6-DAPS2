import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { delay, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { RouteCatalogPanel } from "./route-catalog-panel";
import { RoutesPanel } from "@/components/shell/routes-panel";
import { resetZoneFixtures, zoneFixtures } from "@/lib/zones-fixtures";
import { ZonesPanel } from "@/components/shell/zones-panel";

import { CrewCatalogPanel } from "./crew-catalog-panel";
import { DisposalSitesPanel } from "./disposal-sites-panel";
import { ServiceFrequenciesPanel } from "./service-frequencies-panel";
import { ServiceTypesPanel } from "./service-types-panel";
import { VehicleCatalogPanel } from "./vehicle-catalog-panel";
import { ZoneCatalogPanel } from "./zone-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetZoneFixtures(); });
afterAll(() => server.close());

// A resolver that only waits and does not answer falls through to the real handler.
const delayed = (path: string, ms = 250) => http.get(path, async () => { await delay(ms); });

const visibleLoadingText = () => screen.queryAllByText(/Cargando(\.\.\.|…)/);

function expectBusy(region: HTMLElement) {
  expect(region).toHaveAttribute("aria-busy", "true");
  const message = within(region).getByText("Cargando");
  expect(message).toHaveAttribute("role", "status");
  expect(message).toHaveClass("sr-only");
  expect(region.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  expect(visibleLoadingText()).toHaveLength(0);
}

const gone = (name: string) => waitFor(() => expect(screen.queryByRole("region", { name })).toBeNull(), { timeout: 3000 });

describe("Catalogo B loading skeletons (#590)", () => {
  it("crews: busy table skeleton, then the rows", async () => {
    server.use(delayed("*/api/crews"));
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const region = screen.getByRole("region", { name: "Listado de cuadrillas" });
    expectBusy(region);
    expect(region.querySelectorAll("thead th").length).toBeGreaterThan(3);
    await gone("Listado de cuadrillas");
    expect((await screen.findAllByRole("row")).length).toBeGreaterThan(1);
  });

  it("vehicles: busy table skeleton, then the rows", async () => {
    server.use(delayed("*/api/vehicles"));
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expectBusy(screen.getByRole("region", { name: "Listado de vehículos" }));
    await gone("Listado de vehículos");
    expect(await screen.findByRole("row", { name: /AA 123 AA/ })).toBeVisible();
  });

  it("zones catalog: busy table skeleton, then the rows", async () => {
    server.use(delayed("*/api/zones"));
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expectBusy(screen.getByRole("region", { name: "Listado de zonas operativas" }));
    await gone("Listado de zonas operativas");
    expect((await screen.findAllByRole("row")).length).toBeGreaterThan(1);
  });

  it("disposal sites: busy table skeleton, then the rows", async () => {
    server.use(delayed("*/api/disposal-sites"));
    render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);
    expectBusy(screen.getByRole("region", { name: "Listado de sitios de disposición" }));
    await gone("Listado de sitios de disposición");
    expect((await screen.findAllByRole("row")).length).toBeGreaterThan(1);
  });

  it("service types: busy table skeleton, then the rows", async () => {
    server.use(delayed("*/api/service-types"));
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);
    expectBusy(screen.getByRole("region", { name: "Listado de tipos de servicio" }));
    await gone("Listado de tipos de servicio");
    expect((await screen.findAllByRole("row")).length).toBeGreaterThan(1);
  });

  it("service frequencies: busy table skeleton, then the rows", async () => {
    server.use(delayed("*/api/service-frequencies"));
    render(<ServiceFrequenciesPanel scenario={scenarios.officeDutyQueue} />);
    expectBusy(screen.getByRole("region", { name: "Listado de frecuencias de servicio" }));
    await gone("Listado de frecuencias de servicio");
    expect((await screen.findAllByRole("row")).length).toBeGreaterThan(1);
  });

  it("crew relocation history: busy list skeleton, then the history", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const button = await screen.findByRole("button", { name: "Ver detalle de Cuadrilla C · Ibáñez" });
    server.use(delayed("*/api/crews/:id/zone-assignments"));
    await user.click(button);
    const sheet = await screen.findByRole("dialog", { name: "Detalle de cuadrilla" });
    const region = await within(sheet).findByRole("region", { name: "Historial de reubicaciones" });
    expectBusy(region);
    expect(await within(sheet).findByRole("list", { name: "Historial de reubicaciones" })).toBeVisible();
    expect(within(sheet).queryByRole("region", { name: "Historial de reubicaciones" })).toBeNull();
  });

  it("zone neighborhoods: busy list skeleton, then the assigned neighborhoods", async () => {
    const user = userEvent.setup({ delay: null });
    zoneFixtures.splice(3);
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Belgrano/ });
    server.use(delayed("*/api/zones/:id"), delayed("*/api/neighborhoods*"));
    await user.click(within(row).getByRole("button", { name: /^barrios$/i }));
    const dialog = await screen.findByRole("dialog");
    expectBusy(within(dialog).getByRole("region", { name: "Barrios de la zona" }));
    await waitFor(() => expect(within(dialog).queryByRole("region", { name: "Barrios de la zona" })).toBeNull(), { timeout: 3000 });
    expect(await within(dialog).findByRole("list", { name: "Barrios" })).toBeVisible();
  });

  it("routes catalog: busy table skeleton, then the rows", async () => {
    server.use(delayed("*/api/routes"));
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expectBusy(screen.getByRole("region", { name: "Listado de recorridos" }));
    await gone("Listado de recorridos");
    expect((await screen.findAllByRole("row")).length).toBeGreaterThan(1);
  });

  it("routes: busy list skeleton, then the routes", async () => {
    server.use(delayed("*/api/routes"));
    render(<RoutesPanel />);
    expectBusy(screen.getByRole("region", { name: "Recorridos" }));
    await screen.findByRole("heading", { name: "Recorridos" });
    expect(screen.queryByRole("region", { name: "Recorridos" })?.getAttribute("aria-busy")).not.toBe("true");
  });

  it("shell zones: busy list skeleton, then the zones", async () => {
    server.use(delayed("*/api/zones"));
    render(<ZonesPanel />);
    expectBusy(screen.getByRole("region", { name: "Zonas operativas" }));
    await screen.findByRole("heading", { name: "Zonas operativas" });
    expect(screen.queryByRole("region", { name: "Zonas operativas" })?.getAttribute("aria-busy")).not.toBe("true");
  });

  it("crews: unresolved zone cells show a skeleton, not a loading message, until the zones arrive", async () => {
    server.use(delayed("*/api/zones*", 600));
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await waitFor(() => expect(screen.queryByRole("region", { name: "Listado de cuadrillas" })).toBeNull(), { timeout: 3000 });
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-slot="zone-name-skeleton"]').length).toBeGreaterThan(0);
    expect(visibleLoadingText()).toHaveLength(0);
    await waitFor(() => expect(document.querySelectorAll('[data-slot="zone-name-skeleton"]')).toHaveLength(0), { timeout: 3000 });
  });

  it("zones: the reference check before deactivating is announced as a status", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Belgrano/ });
    server.use(delayed("*/api/zones/:id/references"));
    await user.click(within(row).getByRole("button", { name: "Dar de baja" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Verificando…");
    await waitFor(() => expect(within(dialog).queryByRole("status")).toBeNull(), { timeout: 3000 });
  });
});
