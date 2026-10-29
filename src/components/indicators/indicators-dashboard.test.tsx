import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse, passthrough } from "msw";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { coverageIndicatorFixture, incidentsIndicatorFixture, wasteIndicatorFixture } from "@/lib/indicator-fixtures";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const server = setupServer(...handlers);

async function chooseDate(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const trigger = screen.getByRole("button", { name: new RegExp(`^${label}`) });
  const displayedValue = trigger.textContent?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const currentMonth = displayedValue ? Number(displayedValue[2]) - 1 : new Date().getMonth();
  const currentYear = displayedValue ? Number(displayedValue[3]) : new Date().getFullYear();
  const [year, month, day] = value.split("-").map(Number);
  const offset = (year - currentYear) * 12 + month - 1 - currentMonth;

  await user.click(trigger);
  for (let index = 0; index < Math.abs(offset); index += 1) {
    await user.click(screen.getByRole("button", { name: offset < 0 ? "Mes anterior" : "Mes siguiente" }));
  }
  const dateLabel = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
  await user.click(screen.getByRole("button", { name: new RegExp(`(?:^|,\\s)${dateLabel}$`, "i") }));
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-04T15:00:00.000Z"));
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/"); // el tablero escribe su estado en la URL
  olvidarCatalogoDeEtiquetas();
  vi.useRealTimers();
});
afterAll(() => server.close());

describe("IndicatorsDashboard", () => {
  it("keeps the family selector available with skeletons while indicators are loading", () => {
    server.use(http.get("*/api/indicators/:family", async () => {
      await delay("infinite");
      return HttpResponse.json({});
    }));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = screen.getByRole("region", { name: "Familias" });
    expect(familyBand).toBeVisible();
    expect(within(familyBand).getByRole("button", { name: /Cobertura.*seleccionar/i })).toBeVisible();
    expect(familyBand).toHaveAttribute("aria-busy", "true");
    expect(within(familyBand).getByText("Cargando")).toHaveClass("sr-only");
  });

  it("keeps a ready family usable when another family errors and reports module states independently", async () => {
    server.use(
      http.get("*/api/indicators/coverage", () => HttpResponse.json({ ...coverageIndicatorFixture, byZone: [] })),
      http.get("*/api/indicators/compliance", () => HttpResponse.json({ statusCode: 503, message: "Servicio no disponible" }, { status: 503 })),
    );

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = await screen.findByRole("region", { name: "Familias" });
    expect(within(familyBand).getByRole("button", { name: /Reintentar Cumplimiento/i })).toBeVisible();

    const trend = await screen.findByRole("region", { name: "Por categoría" });
    expect(within(trend).getByRole("heading", { name: "Cobertura por tipo de servicio" })).toBeVisible();
    const territory = screen.getByRole("region", { name: "Detalle territorial" });
    expect(within(territory).getByText("Sin resultados territoriales")).toBeVisible();

    await userEvent.setup().click(within(familyBand).getByRole("button", { name: /Cumplimiento.*seleccionar/i }));
    expect(await screen.findByText("No se pudo cargar Cumplimiento")).toBeVisible();
    expect(screen.getByRole("region", { name: "Familias" })).toBeVisible();
  });

  it("uses task-focused tabs on narrow screens without changing the selected family", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(max-width: 760px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = await screen.findByRole("region", { name: "Familias" });
    await user.click(within(familyBand).getByRole("button", { name: /Incidencias.*seleccionar/i }));
    const tabs = await screen.findByRole("tablist", { name: "Secciones del tablero" });
    expect(tabs).toBeVisible();
    expect(within(tabs).getByRole("tab", { name: "Resumen" })).toBeVisible();
    expect(within(tabs).getByRole("tab", { name: "Por categoría" })).toBeVisible();
    expect(within(tabs).getByRole("tab", { name: "Territorio" })).toBeVisible();
    expect(within(tabs).getByRole("tab", { name: "Registros" })).toBeVisible();

    const viewToggle = screen.getByRole("group", { name: "Vista" });
    await user.click(within(viewToggle).getByRole("button", { name: "Tabla" }));
    expect(within(viewToggle).getByRole("button", { name: "Tabla" })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(tabs).getByRole("tab", { name: "Territorio" }));
    expect(within(familyBand).getByRole("button", { name: /Incidencias.*seleccionar/i })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("heading", { name: "Contenedores por zona" })).toBeVisible();
    expect(await within(screen.getByRole("region", { name: "Detalle territorial" })).findByRole("table")).toBeVisible();

    vi.unstubAllGlobals();
  });

  it("pins chart detail from hover or keyboard focus and returns focus after Escape or outside interaction", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Cumplimiento/ }));
    const centro = await screen.findByRole("button", { name: /En fecha.*344 servicios/i });

    await user.hover(centro);
    expect(screen.getByRole("status", { name: /Detalle de En fecha/i })).toBeVisible();
    await user.click(centro);
    expect(screen.getByRole("status", { name: /Detalle fijado de En fecha/i })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("status", { name: /Detalle .*En fecha/i })).not.toBeInTheDocument();
    expect(centro).toHaveFocus();

    await user.click(centro);
    expect(screen.getByRole("status", { name: /Detalle fijado de En fecha/i })).toBeVisible();
    await user.click(document.body);
    expect(screen.queryByRole("status", { name: /Detalle .*En fecha/i })).not.toBeInTheDocument();
    expect(centro).toHaveFocus();
  });

  it("uses semantic colors for danger, success, warning, and neutral indicator points (#420)", async () => {
    const user = userEvent.setup();
    const dimensions = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, width: 480, height: 280, top: 0, right: 480, bottom: 280, left: 0, toJSON: () => ({}),
    } as DOMRect);
    const { container } = render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await screen.findByRole("button", { name: "Centro" });

    await user.click(screen.getByRole("button", { name: /Cumplimiento/ }));
    await screen.findByRole("heading", { name: "Cumplimiento" });
    await screen.findByRole("button", { name: /En fecha.*344 servicios/i });
    expect(container.querySelector('[fill="var(--color-success)"]')).not.toBeNull();
    expect(container.querySelector('[fill="var(--color-warning)"]')).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /Incidencias/ }));
    await screen.findByRole("heading", { name: "Incidencias" });
    await screen.findByRole("button", { name: /Crítico.*3 árboles/i });
    expect(container.querySelector('[fill="var(--color-danger)"]')).not.toBeNull();
    dimensions.mockRestore();
  });

  it("lets Office explore exact coverage and compliance values through keyboard-accessible detail", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Cobertura" })).toBeVisible();
    expect(await screen.findByText(/^\d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
    expect(screen.getByText(/Actualizado \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/)).toBeVisible();
    expect(screen.queryByText(/Unidad de análisis/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Atendidos")[0]).toBeVisible();
    expect(screen.getAllByText("Programados")[0]).toBeVisible();

    const centro = await screen.findByRole("button", { name: "Centro" });
    centro.focus();
    await user.keyboard("{Enter}");
    const selectedStatus = screen.getAllByRole("status").find((status) => status.textContent?.includes("Seleccionado:"));
    expect(selectedStatus).toHaveTextContent("Seleccionado: Centro");

    await user.click(screen.getByRole("button", { name: "Tabla" }));
    const coverageTable = screen.getByRole("region", { name: "Tabla de datos de Cobertura" });
    const categoryHeader = within(coverageTable).getAllByRole("columnheader", { name: "Categoría" })[0];
    expect(categoryHeader).not.toHaveAttribute("aria-sort");
    expect(within(categoryHeader).queryByRole("button")).not.toBeInTheDocument();
    expect(within(coverageTable).getAllByRole("columnheader", { name: "Atendidos" })[0]).toBeVisible();
    expect(within(coverageTable).getAllByRole("columnheader", { name: "Programados" })[0]).toBeVisible();
    expect(within(coverageTable).getAllByText("140 objetivos")[0]).toBeVisible();
    expect(within(coverageTable).getAllByText("156 objetivos")[0]).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Cumplimiento/ }));
    expect((await screen.findAllByText("344 servicios"))[0]).toBeVisible();
    expect((await screen.findAllByText("Demorados"))[0]).toBeVisible();
    expect(screen.getAllByText(/Cuadrilla no disponible/)[0]).toBeVisible();
    expect(screen.queryByText(/ZoneResult\.recordedAt/i)).not.toBeInTheDocument();
  });

  it("lets Office inspect exact Incidencias and Residuos details with their data semantics", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Incidencias/ }));

    expect(screen.getAllByText(/Resolución media de reportes/)[0]).toBeVisible();
    expect(screen.getByText("Contenedores y arbolado: situación actual.")).toBeVisible();
    expect(screen.queryByText(/reportes consideran el período/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reportes por estado" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Tabla" }));
    const incidentsTable = screen.getByRole("region", { name: "Tabla de datos de Incidencias" });
    expect(within(incidentsTable).getByRole("columnheader", { name: "Desbordes" })).toBeVisible();
    expect(within(incidentsTable).getByRole("columnheader", { name: "Daños" })).toBeVisible();
    expect(within(incidentsTable).getByText("Cerrado")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Residuos/ }));
    expect(screen.getAllByText(/Desvío de relleno sanitario/)[0]).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tabla" }));
    const wasteTable = screen.getByRole("region", { name: "Tabla de datos de Residuos" });
    expect(within(wasteTable).getAllByRole("columnheader", { name: "Kilogramos" })[0]).toBeVisible();
    expect(within(wasteTable).getAllByRole("columnheader", { name: "Metros cúbicos" })[0]).toBeVisible();
    expect(within(wasteTable).getAllByText("62,8 m³")[0]).toBeVisible();
  });

  it("shows fractional mean resolution days without rounding them away (#421)", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Incidencias/ }));
    expect((await screen.findAllByText("2,4 días"))[0]).toBeVisible();
  });

  it("does not add a trailing decimal to whole mean resolution days (#421)", async () => {
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json({
      ...incidentsIndicatorFixture,
      reports: { ...incidentsIndicatorFixture.reports, avgResolutionDays: 2 },
    })));
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Incidencias/ }));
    expect((await screen.findAllByText("2 días"))[0]).toBeVisible();
    expect(screen.queryByText("2,0 días")).not.toBeInTheDocument();
  });

  it("unions compliance detail columns across zones and leaves missing details empty (#421)", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Cumplimiento/ }));
    await screen.findByRole("heading", { name: "Cumplimiento" });
    await user.click(screen.getByRole("button", { name: "Tabla" }));

    const tablesRegion = screen.getByRole("region", { name: "Tabla de datos de Cumplimiento" });
    const zonesTable = within(tablesRegion).getByRole("table", { name: "Valores exactos de zonas sin atención" });
    const headers = within(zonesTable).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "Categoría",
      "Cuadrilla no disponible",
      "Condición meteorológica",
      "Desperfecto vehicular",
      "Acceso bloqueado",
      "Corte de calle / Obra",
      "Objetivos",
    ]);

    const costera = within(zonesTable).getByRole("row", { name: /Costera/ });
    expect(within(costera).getByRole("cell", { name: "5 objetivos" })).toBeVisible();
    expect(within(costera).getByRole("cell", { name: "3 objetivos" })).toBeVisible();
    const costeraButton = within(costera).getByRole("button", { name: /Costera/ });
    await user.click(costeraButton);
    expect(costeraButton).toHaveAttribute("aria-pressed", "true");
    const norte = within(zonesTable).getByRole("row", { name: /Norte/ });
    expect(within(norte).getByRole("cell", { name: "7 objetivos" })).toBeVisible();
    expect(within(norte).getByRole("cell", { name: "5 objetivos" })).toBeVisible();
    expect(within(norte).getAllByRole("cell").filter((cell) => cell.textContent === "")).toHaveLength(3);
  });

  it("traces a selected zone to services and restores the unfiltered records view", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(await screen.findByRole("button", { name: "Centro" }));

    const recordsRegion = await screen.findByRole("region", { name: "Registros" });
    const recordsTable = within(recordsRegion).getByRole("table", { name: "Registros accesibles de Servicios" });
    const recordHeader = within(recordsTable).getByRole("columnheader", { name: "Registro" });
    expect(recordHeader).not.toHaveAttribute("aria-sort");
    expect(within(recordHeader).queryByRole("button")).not.toBeInTheDocument();
    // La fila se nombra con el título del servicio, no con su identificador.
    const serviceLink = () => within(recordsRegion).getAllByRole("link", { name: "Recolección de residuos — Recorrido 4" }).find((link) => link.getAttribute("href") === "/app?destination=services&detail=SVC-1042");
    expect(serviceLink()).toBeVisible();
    expect(within(recordsRegion).queryByText("SVC-1042")).not.toBeInTheDocument();
    expect(recordsRegion).toHaveTextContent(/Filtro:.*Centro/i);
    expect(recordsRegion).toHaveTextContent(/Cobertura por zona/i);
    expect(screen.getByRole("link", { name: /Ver servicios/i })).toHaveAttribute("href", "/app?destination=services");

    await user.click(screen.getByRole("button", { name: "Quitar filtro" }));

    expect(recordsRegion).toHaveTextContent(/Todos los registros del período/);
    expect(serviceLink()).toBeVisible();
  });

  it("traces container incidents to the container catalog without adding record mutations", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Incidencias/ }));
    await user.click(await screen.findByRole("button", { name: /Centro.*8 incidentes/i }));

    const recordsRegion = await screen.findByRole("region", { name: "Registros" });
    expect(within(recordsRegion).getByRole("row", { name: /CONT-001/ })).toBeVisible();
    // Se muestra el código, pero el enlace usa el UUID que `GET /containers/:id` espera.
    expect(within(recordsRegion).getByRole("link", { name: "CONT-001" })).toHaveAttribute("href", "/app/catalog/containers?detail=cont-1");
    expect(screen.getByRole("link", { name: /Ver contenedores/i })).toHaveAttribute("href", "/app/catalog/containers");
    expect(screen.queryByRole("button", { name: /Editar|Eliminar|Dar de baja/i })).not.toBeInTheDocument();
  });

  it("explains when a signal has no contract-backed operational record relationship", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Cobertura" });
    await user.click(screen.getByRole("button", { name: /Incidencias/ }));
    await user.click(await screen.findByRole("button", { name: /Alto.*9 árboles/i }));

    expect(screen.getByText("No hay registros para «Alto».")).toBeVisible();
    expect(screen.queryByRole("link", { name: /Ver árboles/i })).not.toBeInTheDocument();
  });

  it("shows «Sin reportes cerrados» when the backend sends avgResolutionDays null (#302)", async () => {
    server.use(http.get("*/api/indicators/incidents", () => HttpResponse.json({ ...incidentsIndicatorFixture, reports: { ...incidentsIndicatorFixture.reports, avgResolutionDays: null } })));
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = await screen.findByRole("region", { name: "Familias" });
    const incidentsButton = within(familyBand).getByRole("button", { name: /Incidencias.*seleccionar/i });
    expect(await within(incidentsButton).findByText("Sin reportes cerrados")).toBeVisible();
    expect(within(familyBand).queryByText("No se pudo cargar Incidencias")).not.toBeInTheDocument();

    await user.click(incidentsButton);
    expect(await screen.findByRole("heading", { name: "Incidencias" })).toBeVisible();
    expect(screen.getByText(/Resolución media de reportes:/).closest("p")).toHaveTextContent("Sin reportes cerrados");
  });

  it("marks Incidencias and Residuos as empty when their families have no records", async () => {
    const incidents = structuredClone(incidentsIndicatorFixture);
    incidents.containers.byStatus = [];
    incidents.containers.byZone = [];
    incidents.trees.byRiskLevel = [];
    incidents.reports.total = 0;
    incidents.reports.byType = [];
    incidents.reports.byStatus = [];
    incidents.reports.avgResolutionDays = null;

    const waste = structuredClone(wasteIndicatorFixture);
    waste.totals = { weightKg: 0, volumeM3: 0, divertedKg: 0, divertedPct: 0 };
    waste.byWasteType = [];
    waste.byDisposalSite = [];
    waste.records = 0;

    server.use(
      http.get("*/api/indicators/incidents", () => HttpResponse.json(incidents)),
      http.get("*/api/indicators/waste", () => HttpResponse.json(waste)),
    );
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const familyBand = await screen.findByRole("region", { name: "Familias" });
    expect(await within(familyBand).findAllByText("Sin datos")).toHaveLength(2);
  });

  it("lists real zones and service types and sends their UUIDs as filters (#302)", async () => {
    const zoneId = "3f0c1a52-6a7e-4c1b-9a3e-1d2b3c4d5e6f";
    const serviceTypeId = "a52e440f-37d0-42a4-92c7-28c281cf21e3";
    const page = (data: unknown[]) => ({ data, meta: { total: data.length, page: 1, pageSize: 100, totalPages: 1 } });
    server.use(
      http.get("*/api/zones", () => HttpResponse.json(page([{ id: zoneId, code: "Z-SUR", name: "Zona Sur real", active: true, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" }]))),
      http.get("*/api/service-types", () => HttpResponse.json(page([{ id: serviceTypeId, code: "ARB-CENSO", name: "Censo de arbolado urbano", category: "TREES", mode: "ROUTE", requiresVehicle: false, active: true, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" }]))),
    );
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Cobertura" });

    const requested: string[] = [];
    server.use(http.get("*/api/indicators/:family", ({ request }) => { requested.push(new URL(request.url).search); return passthrough(); }));
    await user.click(await screen.findByRole("combobox", { name: "Zona operativa" }));
    await user.click(await screen.findByRole("option", { name: "Zona Sur real" }));
    await user.click(screen.getByRole("combobox", { name: "Tipo de servicio" }));
    await user.click(await screen.findByRole("option", { name: "Censo de arbolado urbano" }));
    expect(screen.queryByRole("option", { name: "Centro" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actualizar" }));

    await vi.waitFor(() => expect(requested.some((search) => search.includes(`zoneId=${zoneId}`) && search.includes(`serviceTypeId=${serviceTypeId}`))).toBe(true));
  });

  it("disables the catalog filters with a notice while loading and when the catalogs fail (#302)", async () => {
    server.use(
      http.get("*/api/zones", () => HttpResponse.json({ statusCode: 503, message: "No disponible" }, { status: 503 })),
      http.get("*/api/service-types", async () => { await delay("infinite"); return HttpResponse.json({}); }),
    );
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByLabelText("Zona operativa")).toBeDisabled();
    expect(screen.getByLabelText("Tipo de servicio")).toBeDisabled();
    expect(screen.getByRole("region", { name: "Opciones de Tipo de servicio" })).toHaveAttribute("aria-busy", "true");
  });

  it("blocks an inverted date range with a message and does not call the backend", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Cobertura" });

    let indicatorRequests = 0;
    server.use(http.get("*/api/indicators/:family", () => { indicatorRequests += 1; return HttpResponse.json({}, { status: 500 }); }));

    await chooseDate(user, "Desde", "2026-09-20");
    await chooseDate(user, "Hasta", "2026-09-01");
    await user.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(await screen.findByText("La fecha «Desde» no puede ser posterior a «Hasta».")).toBeVisible();
    expect(screen.getByRole("button", { name: /^Hasta/ })).toHaveAttribute("aria-invalid", "true");
    expect(indicatorRequests).toBe(0);

    await chooseDate(user, "Hasta", "2026-09-20");
    expect(screen.queryByText("La fecha «Desde» no puede ser posterior a «Hasta».")).not.toBeInTheDocument();
  });
});

describe("internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", async () => {
    const { container } = render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Cobertura" });
    await screen.findAllByText("Atendidos");

    expectNoInternalJargon(container);
  });
});
