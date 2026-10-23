import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { addEnvironmentalInspectionFixture, environmentalReportFixtures, ingestSanctionOutcomeFixture, paginateEnvironmentalReportFixtures, resetEnvironmentalReportFixtures, updateEnvironmentalInspectionFixture, updateEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { environmentalReportsAdapter } from "@/lib/environmental-reports";
import { repairRequestsAdapter } from "@/lib/repair-requests";
import { resetServiceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { servicesAdapter } from "@/lib/services";
import { scenarios } from "@/lib/scenarios";
import { EnvironmentalReportsWorkspace } from "./environmental-reports-workspace";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const server = setupServer(...handlers);
// Leaflet needs browser layout; exercise the real picker controls in jsdom.
vi.mock("next/dynamic", () => ({ default: () => () => <div>Mapa</div> }));

async function chooseOption(user: ReturnType<typeof userEvent.setup>, scope: ReturnType<typeof within>, label: string | RegExp, option: string | RegExp) {
  const trigger = scope.getByRole("combobox", { name: label });
  trigger.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("listbox");
  await user.click(await screen.findByRole("option", { name: option }));
}

async function chooseDate(user: ReturnType<typeof userEvent.setup>, scope: ReturnType<typeof within>, label: string, value: string) {
  const trigger = scope.getByRole("button", { name: label });
  const displayedValue = trigger.textContent?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const currentMonth = displayedValue ? Number(displayedValue[2]) - 1 : new Date().getMonth();
  const currentYear = displayedValue ? Number(displayedValue[3]) : new Date().getFullYear();
  const [year, month, day] = value.split("-").map(Number);
  const offset = (year - currentYear) * 12 + month - 1 - currentMonth;
  await user.click(trigger);
  const calendar = await screen.findByRole("grid");
  for (let index = 0; index < Math.abs(offset); index += 1) {
    await user.click(await screen.findByRole("button", { name: offset < 0 ? "Mes anterior" : "Mes siguiente" }));
  }
  const dateLabel = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
  await user.click(await within(calendar).findByRole("button", { name: new RegExp(`(?:^|,\\s)${dateLabel}$`, "i") }));
}

async function chooseTime(user: ReturnType<typeof userEvent.setup>, scope: ReturnType<typeof within>, label: string, value: string) {
  const [hour, minute] = value.split(":");
  const timeGroup = scope.getByRole("group", { name: label });
  await user.click(within(timeGroup).getByRole("combobox", { name: "Hora" }));
  await user.click(await screen.findByRole("option", { name: hour }));
  await user.click(within(timeGroup).getByRole("combobox", { name: "Minutos" }));
  await user.click(await screen.findByRole("option", { name: minute }));
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetEnvironmentalReportFixtures(); resetRepairRequestFixtures(); resetServiceFixtures(); window.localStorage.clear(); window.history.replaceState(null, "", "/app?destination=environment"); server.events.removeAllListeners("request:start"); vi.useRealTimers(); });
afterAll(() => server.close());

describe("EnvironmentalReportsWorkspace", () => {
  it("lets Office open the same required map location form", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(screen.getByRole("button", { name: "Abrir reporte" }));
    const dialog = screen.getByRole("dialog", { name: "Abrir reporte" });
    await user.click(within(dialog).getByRole("button", { name: "Marcar en el mapa" }));
    expect(await screen.findByRole("dialog", { name: "Ubicación" })).toBeVisible();
  });

  it.each(["", "Frente a la escuela"])("confirms a searched address without overwriting typed text (%s), preserves failed submissions and cancels changes", async (typedAddress) => {
    const payloads: unknown[] = [];
    server.use(
      http.get("/api/address-search", ({ request }) => {
        expect(new URL(request.url).searchParams.get("q")).toBe("Corrientes 1000");
        return HttpResponse.json({ outcome: "results", data: [{ label: "AV CORRIENTES 1000", latitude: -34.123456789, longitude: -58.123456789 }] });
      }),
      http.post("/api/environmental-reports", async ({ request }) => {
        payloads.push(await request.json());
        return HttpResponse.json({ statusCode: 503, error: "Service Unavailable", timestamp: "2026-10-22T12:00:00Z", path: "/api/environmental-reports", message: "No se pudo abrir el reporte. Intente nuevamente." }, { status: 503 });
      }),
    );
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    await user.click(screen.getByRole("button", { name: "Abrir reporte" }));
    const dialog = screen.getByRole("dialog", { name: "Abrir reporte" });
    await chooseOption(user, within(dialog), /Tipo de hallazgo/, "Ruidos molestos");
    const address = within(dialog).getByLabelText(/Dirección o referencia/);
    if (typedAddress) await user.type(address, typedAddress);
    await user.type(within(dialog).getByLabelText(/Descripción del hallazgo/), "Ruido nocturno constante.");
    await user.click(within(dialog).getByRole("button", { name: "Marcar en el mapa" }));
    const picker = await screen.findByRole("dialog", { name: "Ubicación" });
    const query = within(picker).getByRole("textbox", { name: "Dirección" });
    expect(query).toHaveValue(typedAddress);
    await user.clear(query);
    await user.type(query, "Corrientes 1000{Enter}");
    await user.click(await within(picker).findByRole("button", { name: "AV CORRIENTES 1000" }));
    await user.click(within(picker).getByRole("button", { name: "Confirmar ubicación" }));
    expect(address).toHaveValue(typedAddress || "AV CORRIENTES 1000");
    expect(within(dialog).getByText("Fuera de las zonas operativas")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Abrir reporte" }));
    expect(await within(dialog).findByText("No se pudo abrir el reporte. Intente nuevamente.")).toBeVisible();
    expect(within(dialog).getByLabelText(/Descripción del hallazgo/)).toHaveValue("Ruido nocturno constante.");
    expect(address).toHaveValue(typedAddress || "AV CORRIENTES 1000");
    const change = within(dialog).getByRole("button", { name: "Cambiar" });
    await user.click(change);
    const reopened = await screen.findByRole("dialog", { name: "Ubicación" });
    expect(within(reopened).getByRole("status")).toHaveTextContent("-34.1234568, -58.1234568");
    await user.click(within(reopened).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(change).toHaveFocus());
    await user.click(within(dialog).getByRole("button", { name: "Abrir reporte" }));
    await waitFor(() => expect(payloads).toHaveLength(2));
    expect(payloads).toEqual([expect.objectContaining({ address: typedAddress || "AV CORRIENTES 1000", lat: -34.1234568, lng: -58.1234568 }), payloads[0]]);
    expect(window.localStorage.length).toBe(0);
  });

  it("requires a deliberate location and never sends fallback coordinates", async () => {
    const posts: Request[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST" && new URL(request.url).pathname === "/api/environmental-reports") posts.push(request);
    });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    await user.click(screen.getByRole("button", { name: "Abrir reporte" }));
    const dialog = screen.getByRole("dialog", { name: "Abrir reporte" });
    await chooseOption(user, within(dialog), /Tipo de hallazgo/, "Ruidos molestos");
    await user.type(within(dialog).getByLabelText(/Dirección o referencia/), "Frente a la escuela");
    await user.type(within(dialog).getByLabelText(/Descripción del hallazgo/), "Ruido nocturno constante.");
    await user.click(within(dialog).getByRole("button", { name: "Abrir reporte" }));
    expect(await within(dialog).findByText("Marque la ubicación")).toBeVisible();
    expect(posts).toHaveLength(0);
    expect(within(dialog).queryByLabelText(/Latitud|Longitud/)).not.toBeInTheDocument();
  });

  it("shows the queue without explanatory subtitles or notes", async () => {
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const queue = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    expect(screen.queryByText("Cola de expedientes para clasificar y derivar.")).not.toBeInTheDocument();
    expect(queue).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(/ciclo completo del expediente/i)).not.toBeInTheDocument();
  });

  it("bounds the Estado options within a vertically scrollable listbox", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    const listbox = await screen.findByRole("listbox");
    const content = listbox.parentElement;

    expect(content).toHaveAttribute("data-slot", "select-content");
    expect(content).toHaveClass("max-h-[min(24rem,calc(var(--available-height)-5rem))]");
    expect(content).toHaveClass("overflow-y-auto");
  });

  it("keeps subsection bulk actions out of the Estado options", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    const trigger = screen.getByRole("combobox", { name: "Estado" });
    expect(trigger).toHaveTextContent("Todos los estados");

    await user.click(trigger);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).queryAllByRole("option", { name: /Seleccionar todos en|Limpiar subsección de/ })).toHaveLength(0);
    expect(within(listbox).getByRole("option", { name: "Todos los estados" })).toBeVisible();
    expect(within(listbox).getByRole("option", { name: "Recibido" })).toBeVisible();
    expect(within(listbox).getByRole("option", { name: "En revisión" })).toBeVisible();

    await user.click(within(listbox).getByRole("option", { name: "Recibido" }));
    await user.click(within(listbox).getByRole("option", { name: "Derivado" }));
    await user.click(within(listbox).getByRole("option", { name: "Desestimado" }));
    expect(trigger).toHaveTextContent("3 estados");
    await user.click(within(listbox).getByRole("option", { name: "Todos los estados" }));
    expect(trigger).toHaveTextContent("Todos los estados");
    expect(new URLSearchParams(window.location.search).getAll("status")).toEqual([]);
  });

  it("keeps subsection titles sticky within the Estado list", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    const listbox = await screen.findByRole("listbox");
    const group = await screen.findByRole("group", { name: "Ingreso y revisión" });
    const title = within(group).getByText("Ingreso y revisión");
    expect(title).toHaveClass("sticky", "top-10", "bg-popover", "px-0");
    expect(within(listbox).getByRole("option", { name: "Todos los estados" })).toHaveClass("pl-2");
    expect(group).toHaveClass("mx-0", "pl-2", "before:hidden");
    expect(within(group).getByRole("option", { name: "Recibido" })).toHaveClass("pl-5", "before:absolute", "before:inset-y-0");
  });

  it("toggles a status from the keyboard and exposes its selected state", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    const trigger = screen.getByRole("combobox", { name: "Estado" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const listbox = await screen.findByRole("listbox");
    await user.keyboard("r{Enter}");

    expect(within(listbox).getByRole("option", { name: "Recibido" })).toHaveAttribute("aria-selected", "true");
    expect(trigger).toHaveTextContent("Recibido");
    expect(new URLSearchParams(window.location.search).getAll("status")).toEqual(["RECEIVED"]);
  });

  it("restores repeated statuses, drops unknown values, and resets the page after a change", async () => {
    window.history.replaceState(null, "", "/app?destination=environment&page=2&priority=HIGH&status=RECEIVED&status=UNDER_REVIEW&status=UNKNOWN");
    const requests: URLSearchParams[] = [];
    server.events.on("request:start", ({ request }) => {
      if (new URL(request.url).pathname === "/api/environmental-reports") requests.push(new URL(request.url).searchParams);
    });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Filtros de la cola" });
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].getAll("status")).toEqual(["RECEIVED", "UNDER_REVIEW"]);
    expect(requests[0].get("page")).toBe("2");
    expect(requests[0].get("priority")).toBe("HIGH");
    await waitFor(() => expect(new URLSearchParams(window.location.search).getAll("status")).toEqual(["RECEIVED", "UNDER_REVIEW"]));

    const trigger = screen.getByRole("combobox", { name: "Estado" });
    await user.click(trigger);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: "En revisión" }));
    await waitFor(() => expect(requests.at(-1)?.get("page")).toBe("1"));
    expect(new URLSearchParams(window.location.search).getAll("status")).toEqual(["RECEIVED"]);
    expect(new URLSearchParams(window.location.search).get("priority")).toBe("HIGH");
    expect(new URLSearchParams(window.location.search).has("page")).toBe(false);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getByRole("button", { name: /ER-1001/ })).toBeVisible();
  });

  it("restores a legacy single status from the URL", async () => {
    window.history.replaceState(null, "", "/app?destination=environment&status=UNDER_REVIEW");
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getByRole("button", { name: /ER-1002/ })).toBeVisible();
    expect(within(list).getByRole("button", { name: /ER-1013/ })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent("En revisión");
  });

  it("restores a date range from the URL and clears it without clearing other filters", async () => {
    window.history.replaceState(null, "", "/app?destination=environment&from=2026-09-04&to=2026-09-05&priority=HIGH");
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getByRole("button", { name: /ER-1006/ })).toBeVisible();
    expect(within(list).queryByRole("button", { name: /ER-1001/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desde" })).toHaveTextContent("04/09/2026");
    expect(screen.getByRole("button", { name: "Hasta" })).toHaveTextContent("05/09/2026");
    await user.click(screen.getByRole("button", { name: "Limpiar fechas" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /ER-1001/ })).toBeVisible());
    expect(window.location.search).toContain("priority=HIGH");
    expect(window.location.search).not.toMatch(/from=|to=/);
  });

  it("announces an inverted date range, blocks fetching and recovers when corrected", async () => {
    window.history.replaceState(null, "", "/app?destination=environment&from=2026-09-07&to=2026-09-06&page=2");
    const requests: string[] = [];
    server.events.on("request:start", ({ request }) => {
      if (new URL(request.url).pathname === "/api/environmental-reports") requests.push(request.url);
    });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("La fecha «Desde» no puede ser posterior a «Hasta».");
    expect(screen.getByRole("button", { name: "Hasta" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Hasta" })).toHaveAccessibleDescription("La fecha «Desde» no puede ser posterior a «Hasta».");
    expect(requests).toEqual([]);
    await chooseDate(user, within(screen.getByRole("group", { name: "Última actualización" })), "Desde", "2026-09-06");
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0]).searchParams.get("from")).toBe("2026-09-06");
    expect(new URL(requests[0]).searchParams.get("to")).toBe("2026-09-06");
    expect(new URL(requests[0]).searchParams.get("page")).toBe("1");
    expect(window.location.search).toContain("from=2026-09-06");
    expect(window.location.search).not.toContain("page=");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an uncorrelated Faltas outcome as a resolution without an acta", async () => {
    ingestSanctionOutcomeFixture({
      violationNoticeId: "NOTICE-UNKNOWN",
      decision: "CLOSURE_ORDERED",
      decidedAt: "2026-09-08T10:00:00.000Z",
      externalRef: "M4-CLOSURE-UNKNOWN",
    });
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);

    const exceptionPanel = await screen.findByRole("region", { name: "Resoluciones sin acta" });
    expect(within(exceptionPanel).getByText("NOTICE-UNKNOWN")).toBeVisible();
    expect(within(exceptionPanel).getByText("M4-CLOSURE-UNKNOWN")).toBeVisible();
    expect(within(exceptionPanel).getByText("No coinciden con ningún acta.")).toBeVisible();
  });

  it("shows the Faltas SanctionOutcome as read-only in the Office detail", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1010/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1010" });

    expect(within(detail).getByRole("region", { name: "Resolución de Faltas" })).toBeVisible();
    expect(within(detail).getByText("Multa emitida")).toBeVisible();
    expect(within(detail).getByText("M4-FINE-1010")).toBeVisible();
    expect(within(detail).queryByText(/solo lectura|M6 no edita/i)).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: /Editar|Eliminar|Modificar/ })).not.toBeInTheDocument();
  });

  it("does not expose Faltas sanction detail to Field even when the report is assigned", async () => {
    updateEnvironmentalReportFixture("ER-1010", { assignedCrewId: "crew-b" });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    const list = await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    await user.click(within(list).getByRole("button", { name: /ER-1010/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1010" });

    expect(within(detail).queryByRole("region", { name: "Resolución de Faltas" })).not.toBeInTheDocument();
    expect(within(detail).queryByText("M4-FINE-1010")).not.toBeInTheDocument();
  });

  it("shows the active Faltas deadline as a waiting state without an automatic-close CTA", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-10T10:00:00.000Z"));
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1009/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1009" });

    expect(within(detail).getByRole("region", { name: "Cierre" })).toHaveTextContent("Esperando resolución de Faltas");
    expect(within(detail).getByText(/Faltas debe resolver antes del/)).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Cerrar expediente" })).not.toBeInTheDocument();
  });

  it("labels an already reflected deadline closure separately from local closure", async () => {
    updateEnvironmentalReportFixture("ER-1009", { status: "CLOSED", deadlineAt: "2026-09-01T12:00:00.000Z" });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1009/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1009" });
    expect(within(detail).getByRole("region", { name: "Cierre" })).toHaveTextContent("Cierre automático por vencimiento");

    await user.click(within(detail).getByRole("button", { name: "Volver a expedientes" }));
    const nextList = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(nextList).getByRole("button", { name: /ER-1011/ }));
    const localDetail = await screen.findByRole("region", { name: "Detalle de ER-1011" });
    expect(within(localDetail).getByRole("region", { name: "Cierre" })).toHaveTextContent("Cierre local");
  });

  it("shows Office's complete queue and exposes only valid actions", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getByRole("button", { name: /ER-1001/ })).toBeVisible();
    expect(within(list).getByRole("button", { name: /ER-1011/ })).toBeVisible();
    await user.click(within(list).getByRole("button", { name: /ER-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1001" });
    expect(within(detail).getByRole("button", { name: "Iniciar revisión" })).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Derivar expediente" })).not.toBeInTheDocument();
    await user.click(within(detail).getByRole("button", { name: "Iniciar revisión" }));
    expect(await within(detail).findByText("En revisión")).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Derivar expediente" })).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Desestimar expediente" })).toBeVisible();
  });

  it("agrupa los estados del filtro con etiquetas accesibles e íconos decorativos", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    const trigger = screen.getByRole("combobox", { name: "Estado" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const listbox = await screen.findByRole("listbox");
    const group = within(listbox).getByRole("group", { name: "Ingreso y revisión" });
    const option = within(group).getByRole("option", { name: "Recibido" });
    expect(within(group).getByRole("option", { name: "En revisión" })).toBeVisible();
    expect(option.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    for (const name of ["Derivación", "Inspección y resultado", "Acta y cierre"]) expect(within(listbox).getByRole("group", { name })).toBeVisible();
  });

  it("pide al backend el filtro de prioridad y lo deja en la URL (#332)", async () => {
    const user = userEvent.setup();
    const requested: URLSearchParams[] = [];
    server.use(http.get("*/api/environmental-reports", ({ request }) => {
      const params = new URL(request.url).searchParams;
      requested.push(params);
      const items = environmentalReportFixtures.filter((report) => !params.get("priority") || report.priority === params.get("priority"));
      return HttpResponse.json({ ...paginateEnvironmentalReportFixtures(items, 1, 25), sanctionOutcomeIntegrationExceptions: [] });
    }));
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getByRole("button", { name: /ER-1004/ })).toBeVisible();

    await chooseOption(user, within(screen.getByRole("region", { name: "Filtros de la cola" })), "Prioridad", "Crítica");

    await waitFor(() => expect(requested.at(-1)?.get("priority")).toBe("CRITICAL"));
    expect(requested.at(-1)?.get("pageSize")).toBe("25");
    await waitFor(() => expect(screen.queryByRole("button", { name: /ER-1004/ })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /ER-1005/ })).toBeVisible();
    expect(new URLSearchParams(window.location.search).get("priority")).toBe("CRITICAL");
  });

  it("recorre las páginas del backend y restaura la página desde la URL (#332)", async () => {
    const user = userEvent.setup();
    const pages: string[] = [];
    server.use(http.get("*/api/environmental-reports", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      pages.push(String(page));
      return HttpResponse.json({
        data: [{ ...environmentalReportFixtures[page - 1] }],
        meta: { total: 3, page, pageSize: 1, totalPages: 3 },
        sanctionOutcomeIntegrationExceptions: [],
      });
    }));
    window.history.replaceState(null, "", "/app?destination=environment&page=2");
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("Página 2 de 3 · 3 expedientes")).toBeVisible();
    expect(pages).toEqual(["2"]);
    await user.click(screen.getByRole("link", { name: /siguiente/i }));
    expect(await screen.findByText("Página 3 de 3 · 3 expedientes")).toBeVisible();
    expect(screen.getByRole("link", { name: /siguiente/i })).toHaveAttribute("aria-disabled", "true");
    expect(new URLSearchParams(window.location.search).get("page")).toBe("3");
  });

  it("warns how many records of the page were dropped for an unknown enum, and not when only paginating (#651)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const dropped = (page: number) => (page === 2 ? 1 : 0);
    server.use(http.get("*/api/environmental-reports", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      return HttpResponse.json({
        data: [{ ...environmentalReportFixtures[0] }, ...(dropped(page) ? [{ ...environmentalReportFixtures[1], id: "report-future", status: "FUTURE_STATUS" }] : [])],
        meta: { total: 40, page, pageSize: 2, totalPages: 20 },
        sanctionOutcomeIntegrationExceptions: [],
      });
    }));
    window.history.replaceState(null, "", "/app?destination=environment&page=1");
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(screen.queryByText(/no se pudieron? mostrar/)).toBeNull();
    await user.click(screen.getByRole("link", { name: /siguiente/i }));
    expect(await screen.findByText("1 registro no se pudo mostrar con esta versión de la aplicación.")).toBeVisible();
    await user.click(screen.getByRole("link", { name: /siguiente/i }));
    await waitFor(() => expect(screen.queryByText(/no se pudieron? mostrar/)).toBeNull());
  });

  it("puts the dropped-records notice above the filters so it is not pushed below the fold on a phone (#651)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    server.use(http.get("*/api/environmental-reports", () => HttpResponse.json({
      data: [{ ...environmentalReportFixtures[0] }, { ...environmentalReportFixtures[1], id: "report-future", status: "FUTURE_STATUS" }],
      meta: { total: 2, page: 1, pageSize: 25, totalPages: 1 },
      sanctionOutcomeIntegrationExceptions: [],
    })));
    window.history.replaceState(null, "", "/app?destination=environment");
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const notice = await screen.findByText("1 registro no se pudo mostrar con esta versión de la aplicación.");
    const search = screen.getByRole("textbox", { name: "Buscar expediente" });
    expect(notice.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("asks for a reason before forwarding and sends it to the backend", async () => {
    const user = userEvent.setup();
    const forward = vi.spyOn(environmentalReportsAdapter, "forward");
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1001" });
    await user.click(within(detail).getByRole("button", { name: "Iniciar revisión" }));
    await user.click(await within(detail).findByRole("button", { name: "Derivar expediente" }));

    const dialog = await screen.findByRole("dialog", { name: "Derivar expediente" });
    await user.click(within(dialog).getByRole("button", { name: "Derivar expediente" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Indique el motivo.");
    const reason = within(dialog).getByLabelText(/Motivo/);
    expect(reason).toHaveAttribute("aria-invalid", "true");
    const describedBy = reason.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Indique el motivo.");
    expect(forward).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Motivo/), "Corresponde a otra dependencia");
    await user.click(within(dialog).getByRole("button", { name: "Derivar expediente" }));

    await waitFor(() => expect(forward).toHaveBeenCalledWith("ER-1001", { reason: "Corresponde a otra dependencia" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Derivar expediente" })).not.toBeInTheDocument());
    await waitFor(() => expect(within(detail).getByRole("heading", { name: "Expediente ER-1001" })).toHaveFocus());
  });

  it("returns focus to the report heading after dismissing a report", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1001" });
    await user.click(within(detail).getByRole("button", { name: "Iniciar revisión" }));
    await user.click(await within(detail).findByRole("button", { name: "Desestimar expediente" }));

    const dialog = await screen.findByRole("dialog", { name: "Desestimar expediente" });
    await user.type(within(dialog).getByLabelText(/Motivo/), "El hallazgo no requiere intervención.");
    await user.click(within(dialog).getByRole("button", { name: "Desestimar expediente" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Desestimar expediente" })).not.toBeInTheDocument());
    await waitFor(() => expect(within(detail).getByRole("heading", { name: "Expediente ER-1001" })).toHaveFocus());
  });

  it("asks the neighbour for information, then shows the pending request and hides the decisions the backend would reject", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1002" });
    await user.click(within(detail).getByRole("button", { name: "Pedir información al vecino" }));

    const dialog = await screen.findByRole("dialog", { name: "Pedir información al vecino" });
    expect(within(dialog).getByText("Opcional. Si vence sin respuesta, el expediente se desestima.")).toBeVisible();
    expect(within(dialog).getByText("Nota interna (el vecino no la ve)")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Pedir información" }));
    expect(await within(dialog).findByText("Indique qué información pide.")).toBeVisible();
    await user.type(within(dialog).getByLabelText(/Qué información necesita/), "Una foto del frente, de noche.");
    await user.click(within(dialog).getByRole("button", { name: "Pedir información" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Pedir información al vecino" })).not.toBeInTheDocument());
    const pending = await within(detail).findByRole("status", { name: "Información pedida" });
    expect(pending).toHaveTextContent("Una foto del frente, de noche.");
    expect(pending).toHaveTextContent("Si vence, el expediente se desestima.");
    expect(within(detail).queryByRole("button", { name: "Pedir información al vecino" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Derivar expediente" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Desestimar expediente" })).not.toBeInTheDocument();
  });

  it("does not offer to ask for information without a ticket or outside review", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1001" });
    await user.click(within(detail).getByRole("button", { name: "Iniciar revisión" }));
    await within(detail).findByRole("button", { name: "Derivar expediente" });
    expect(within(detail).queryByRole("button", { name: "Pedir información al vecino" })).not.toBeInTheDocument();
  });

  it("refreshes the report and explains a 409 when a request is already pending", async () => {
    const user = userEvent.setup();
    server.use(http.post("*/api/environmental-reports/ER-1002/request-information", () => {
      updateEnvironmentalReportFixture("ER-1002", { informationRequestPending: true, informationRequestMessage: "Ya pedida", informationRequestedAt: "2026-09-06T12:00:00.000Z" });
      return HttpResponse.json({ statusCode: 409, message: "pendiente" }, { status: 409 });
    }));
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1002" });
    await user.click(within(detail).getByRole("button", { name: "Pedir información al vecino" }));
    const dialog = await screen.findByRole("dialog", { name: "Pedir información al vecino" });
    await user.type(within(dialog).getByLabelText(/Qué información necesita/), "Otra foto");
    await user.click(within(dialog).getByRole("button", { name: "Pedir información" }));

    expect(await within(dialog).findByText("Ya hay una solicitud pendiente.")).toBeVisible();
    // the dialog is still open, so the page behind it is aria-hidden
    expect(await within(detail).findByRole("status", { name: "Información pedida", hidden: true })).toHaveTextContent("Ya pedida");
  });

  it("finds a report by publicId and shows it as the claim number in its detail", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const search = await screen.findByLabelText("Buscar expediente");

    await user.type(search, "TK-2026-091");

    await waitFor(() => expect(screen.queryByRole("button", { name: /ER-1003/ })).not.toBeInTheDocument());
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getByRole("button", { name: /ER-1002/ })).toBeVisible();

    await user.click(within(list).getByRole("button", { name: /ER-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1002" });
    expect(within(detail).getByText("TK-2026-091")).toBeVisible();
    expect(within(detail).getByText(/^Reclamo:/)).toBeVisible();
    expect(within(detail).queryByText("550e8400-e29b-41d4-a716-446655440091")).not.toBeInTheDocument();
  });

  it("keeps Field scoped and submits an own-initiative report", async () => {
    const payloads: unknown[] = [];
    server.events.on("request:start", async ({ request }) => {
      if (request.method === "POST" && new URL(request.url).pathname === "/api/environmental-reports") payloads.push(await request.clone().json());
    });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: -34.544687149, longitude: -58.438682649, accuracy: 30 } } as GeolocationPosition),
    } });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    const list = await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    expect(within(list).getByRole("button", { name: /ER-1001/ })).toBeVisible();
    expect(within(list).queryByRole("button", { name: /ER-1002/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir reporte" }));
    const dialog = screen.getByRole("dialog");
    await chooseOption(user, within(dialog), /Tipo de hallazgo/, "Ruidos molestos");
    await user.type(within(dialog).getByLabelText(/Dirección o referencia/), "Calle Nueva 100");
    await user.type(within(dialog).getByLabelText(/Descripción del hallazgo/), "Ruido nocturno constante.");
    await user.click(within(dialog).getByRole("button", { name: "Marcar en el mapa" }));
    const picker = await screen.findByRole("dialog", { name: "Ubicación" });
    expect(within(picker).getByRole("textbox", { name: "Dirección" })).toHaveValue("Calle Nueva 100");
    await user.click(within(picker).getByRole("button", { name: "Usar mi ubicación" }));
    await user.click(within(picker).getByRole("button", { name: "Confirmar ubicación" }));
    expect(within(dialog).getByText("Belgrano")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Abrir reporte" }));
    expect(await screen.findByText(/Expediente ER-/)).toBeInTheDocument();
    expect(payloads).toEqual([expect.objectContaining({ address: "Calle Nueva 100", lat: -34.5446871, lng: -58.4386826 })]);
  });

  it("lets Office schedule and assign an inspection from a report under review", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(servicesAdapter, "create");
    const assignCrew = vi.spyOn(servicesAdapter, "assignCrew");
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1002" });
    await user.click(within(detail).getByRole("button", { name: "Programar inspección" }));

    const dialog = screen.getByRole("dialog");
    const scheduledDate = within(dialog).getByRole("button", { name: "Fecha de inspección" });
    const zone = within(dialog).getByRole("combobox", { name: "Zona operativa" });
    const crew = within(dialog).getByRole("combobox", { name: "Cuadrilla" });
    expect(scheduledDate).toHaveAttribute("aria-required", "true");
    expect(scheduledDate.parentElement).toHaveTextContent("Fecha de inspección *");
    expect(zone).toHaveAttribute("aria-required", "true");
    expect(zone.parentElement).toHaveTextContent("Zona operativa *");
    expect(crew).toHaveAttribute("aria-required", "true");
    expect(crew.parentElement).toHaveTextContent("Cuadrilla *");
    await chooseDate(user, within(dialog), "Fecha de inspección", "2026-09-10");
    await chooseTime(user, within(dialog), "Inicio", "09:30");
    await chooseTime(user, within(dialog), "Fin", "10:30");
    await chooseOption(user, within(dialog), "Zona operativa", /Belgrano/);
    await chooseOption(user, within(dialog), "Cuadrilla", /Cuadrilla A/);
    await user.click(within(dialog).getByRole("button", { name: "Programar inspección" }));

    expect(await within(detail).findByRole("status", { name: "Estado: Inspección programada" })).toBeVisible();
    expect(within(detail).getByText(/^SVC-/)).toBeVisible();
    expect(within(detail).getByText(/Cuadrilla A/)).toBeVisible();
    // #320: dos escrituras; la cuadrilla viaja en el alta del servicio, sin assign-crew aparte.
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ origin: "INSPECTION", inspectionId: expect.any(String), crewId: "crew-a", zoneIds: ["zone-1"], scheduledDate: "2026-09-10", timeWindow: { start: "09:30", end: "10:30" } }));
    expect(assignCrew).not.toHaveBeenCalled();
    expect(within(detail).queryByRole("button", { name: "Programar servicio" })).not.toBeInTheDocument();
  });

  it("keeps the inspection and offers to retry only the Service when its creation fails (#320)", async () => {
    const user = userEvent.setup();
    const schedule = vi.spyOn(environmentalReportsAdapter, "schedule");
    const create = vi.spyOn(servicesAdapter, "create");
    server.use(http.post("*/api/services", () => HttpResponse.json({ statusCode: 500, message: "Error interno.", error: "Internal Server Error", timestamp: new Date().toISOString(), path: "/api/services" }, { status: 500 }), { once: true }));
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1002" });
    await user.click(within(detail).getByRole("button", { name: "Programar inspección" }));

    const dialog = screen.getByRole("dialog");
    await chooseDate(user, within(dialog), "Fecha de inspección", "2026-09-10");
    await chooseOption(user, within(dialog), "Zona operativa", /Belgrano/);
    await chooseOption(user, within(dialog), "Cuadrilla", /Cuadrilla A/);
    await user.click(within(dialog).getByRole("button", { name: "Programar inspección" }));

    expect(await within(detail).findByText("Inspección programada, pero no se creó el servicio. Use «Programar servicio».")).toBeVisible();
    expect(await within(detail).findByRole("status", { name: "Estado: Inspección programada" })).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Programar inspección" })).not.toBeInTheDocument();
    expect(within(detail).getByText("Falta fecha y cuadrilla.")).toBeVisible();

    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));
    const retry = await screen.findByRole("dialog", { name: "Programar servicio" });
    // El reintento conserva lo que se cargó y sólo vuelve a dar de alta el servicio.
    expect(within(retry).getByRole("button", { name: "Fecha de inspección" })).toHaveTextContent("10/09/2026");
    expect(within(retry).getByRole("combobox", { name: "Cuadrilla" })).toHaveTextContent("Cuadrilla A");
    await user.click(within(retry).getByRole("button", { name: "Programar servicio" }));

    expect(await within(detail).findByText(/^SVC-/)).toBeVisible();
    expect(within(detail).getByText(/Cuadrilla A/)).toBeVisible();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].inspectionId).toBe(create.mock.calls[0][0].inspectionId);
    expect(within(detail).queryByRole("button", { name: "Programar servicio" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers to schedule the Service of an open inspection left without one and justifies an overlap (#320)", async () => {
    const inspectionId = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
    updateEnvironmentalReportFixture("ER-1002", { status: "INSPECTION_SCHEDULED" });
    addEnvironmentalInspectionFixture({ id: inspectionId, reportId: "ER-1002", serviceId: null, inspectedAt: null, checklistVersion: "ambiental-v1", checklist: [], attachments: [], findings: null, outcome: null, nextStep: null, notes: null, createdAt: "2026-09-06T11:00:00.000Z", updatedAt: "2026-09-06T11:00:00.000Z" });
    const create = vi.spyOn(servicesAdapter, "create");
    server.use(http.post("*/api/services", () => HttpResponse.json({ statusCode: 409, message: "La cuadrilla ya está tomada en esa franja.", error: "Conflict", timestamp: new Date().toISOString(), path: "/api/services" }, { status: 409 }), { once: true }));
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1002" });

    await user.click(await within(detail).findByRole("button", { name: "Programar servicio" }));
    const dialog = await screen.findByRole("dialog", { name: "Programar servicio" });
    expect(within(dialog).queryByLabelText("Versión del checklist")).not.toBeInTheDocument();
    await chooseDate(user, within(dialog), "Fecha de inspección", "2026-09-12");
    await chooseOption(user, within(dialog), "Zona operativa", /Belgrano/);
    await chooseOption(user, within(dialog), "Cuadrilla", /Cuadrilla A/);
    await user.click(within(dialog).getByRole("button", { name: "Programar servicio" }));

    const note = await within(dialog).findByRole("textbox", { name: /Justificación/ });
    expect(note).toHaveAttribute("aria-required", "true");
    expect(note.parentElement).toHaveTextContent("Justificación *");
    expect(within(dialog).getByText(/La cuadrilla ya está tomada en esa franja/)).toBeVisible();
    await user.type(note, "La otra parada termina antes.");
    await user.click(within(dialog).getByRole("button", { name: "Programar servicio" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ origin: "INSPECTION", inspectionId, crewId: "crew-a", overrideNote: "La otra parada termina antes." }));
    expect(await within(detail).findByText(/^SVC-/)).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Programar servicio" })).not.toBeInTheDocument();
  });

  it("reprograms a scheduled inspection through its linked Service instead of creating another inspection (#294)", async () => {
    const user = userEvent.setup();
    const schedule = vi.spyOn(environmentalReportsAdapter, "schedule");
    const reschedule = vi.spyOn(servicesAdapter, "reschedule");
    const confirmReschedule = vi.spyOn(servicesAdapter, "confirmReschedule");
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1005/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1005" });

    await user.click(await within(detail).findByRole("button", { name: "Reprogramar inspección" }));
    const reasonDialog = await screen.findByRole("dialog", { name: /^Reprogramar/ });
    await user.type(within(reasonDialog).getByLabelText(/Motivo/), "Alerta meteorológica");

    await user.click(within(reasonDialog).getByRole("button", { name: /^Nueva fecha/ }));
    await user.click(await screen.findByRole("button", { name: "Mes siguiente" }));
    await user.click(within(await screen.findByRole("grid")).getByRole("button", { name: /, 15 de / }));
    await user.click(within(reasonDialog).getByRole("button", { name: "Reprogramar" }));

    await waitFor(() => expect(confirmReschedule).toHaveBeenCalledWith("SVC-1072", { scheduledDate: expect.stringMatching(/^\d{4}-\d{2}-15$/), timeWindow: { start: "13:00", end: "16:00" } }));
    expect(reschedule).toHaveBeenCalledWith("SVC-1072", { reason: "Alerta meteorológica" });
    expect(schedule).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByRole("button", { name: "Reprogramar inspección" })).toBeVisible();
  });

  it("shows the inspection history with the Service agenda, the crew name and the result in Spanish (#295)", async () => {
    // Como el backend real: la inspección no trae agenda y el servicio no trae crewName.
    updateEnvironmentalInspectionFixture("INS-1005", { scheduledDate: undefined, timeWindow: undefined, outcome: "VIOLATION_FOUND" });
    updateServiceFixture("SVC-1072", { crewName: null, scheduledDate: "2026-09-05T00:00:00.000Z" });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1005/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1005" });

    const item = (await within(detail).findByText("INS-1005")).closest<HTMLElement>('[role="listitem"]')!;
    expect(within(item).getByText("Resultado: Infracción constatada")).toBeVisible();
    // #321: fecha legible, sin el ISO del backend ni una versión de checklist que no existe.
    expect(await within(item).findByText(/^05\/09\/2026 · 13:00–16:00$/)).toBeVisible();
    expect(item).not.toHaveTextContent("ambiental-v");
    expect(within(item).getByText("Cuadrilla C · Ibáñez")).toBeVisible();
    expect(item).not.toHaveTextContent("crew-c");
    expect(item).not.toHaveTextContent("VIOLATION_FOUND");
  });

  it("lets authorized Office issue an immutable notice from a completed violation inspection", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });
    await user.click(within(detail).getByRole("button", { name: "Emitir acta" }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Buscar establecimiento/), "EST-BOEDO-1880");
    await user.click(within(dialog).getByRole("button", { name: "Buscar establecimiento" }));
    expect(await within(dialog).findByText(/Planta de tratamiento Boedo/)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Emitir acta" }));

    expect(await within(detail).findByText("ACTA-2026-0001")).toBeVisible();
    expect(within(detail).getByText("Acta emitida. No se puede modificar.")).toBeVisible();
    expect(within(detail).getByText("Actas previas")).toBeVisible();
    expect(within(detail).queryByRole("button", { name: /Editar acta|Eliminar acta/ })).not.toBeInTheDocument();
    await waitFor(() => expect(within(detail).getByRole("heading", { name: "Expediente ER-1008" })).toHaveFocus());
  });

  it("keeps issuance disabled until inspection evidence is present", async () => {
    updateEnvironmentalInspectionFixture("INS-1008", { attachments: [] });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });

    const issueButton = await within(detail).findByRole("button", { name: "Emitir acta" });
    expect(issueButton).toBeDisabled();
    expect(within(detail).getByText("Agregue evidencia a la inspección para emitir el acta.")).toBeVisible();
  });

  it("records an explicit non-forwarded notice without claiming a Faltas sanction", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });
    await user.click(within(detail).getByRole("button", { name: "Emitir acta" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Buscar establecimiento/), "referencia inexistente");
    await user.click(within(dialog).getByRole("button", { name: "Buscar establecimiento" }));
    await user.click(await within(dialog).findByRole("button", { name: "Continuar sin establecimiento" }));
    await user.click(within(dialog).getByRole("button", { name: "Emitir sin establecimiento" }));

    expect(await within(detail).findByRole("status", { name: "Acta no enviada a Faltas" })).toBeVisible();
    expect(within(detail).getByText("El expediente se cerró sin resolución de Faltas.")).toBeVisible();
    expect(within(detail).getByRole("status", { name: "Estado: Cerrado" })).toBeVisible();
  });

  it("surfaces a second issuance attempt as a conflict", async () => {
    server.use(http.post("*/api/environmental-inspections/INS-1008/violation-notice", () => HttpResponse.json({
      statusCode: 409,
      message: "La inspección ya tiene un acta emitida.",
      error: "Conflict",
      timestamp: new Date().toISOString(),
      path: "/api/environmental-inspections/INS-1008/violation-notice",
    }, { status: 409 })));
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });
    await user.click(within(detail).getByRole("button", { name: "Emitir acta" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Buscar establecimiento/), "EST-BOEDO-1880");
    await user.click(within(dialog).getByRole("button", { name: "Buscar establecimiento" }));
    await user.click(within(dialog).getByRole("button", { name: "Emitir acta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo emitir el acta. Intente nuevamente.");
  });

  it("does not expose issuance to a limited Office session", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeLimited} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });

    expect(within(detail).queryByRole("button", { name: "Emitir acta" })).not.toBeInTheDocument();
  });

  it("lets Office create a pending RepairRequest from an inspection without deriving safety risk", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1012/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1012" });
    const action = await within(detail).findByRole("button", { name: "Crear derivación de reparación" });
    await user.click(action);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Contexto de origen INS-1012")).toBeVisible();
    expect(within(dialog).getByLabelText(/Ubicación del daño/)).toHaveValue("Av. Brasil 2450");
    expect(within(dialog).getByRole("link", { name: /Ver inspección/ })).toHaveAttribute("href", "/app?destination=environment&detail=ER-1012&inspectionId=INS-1012");
    await chooseOption(user, within(dialog), /^Severidad/, "Baja");
    await user.click(within(dialog).getByRole("radio", { name: "Sí" }));
    await user.click(within(dialog).getByRole("button", { name: "Derivar" }));

    expect(await within(dialog).findByText(/Derivada a Obras Públicas/i)).toBeVisible();
    const created = await repairRequestsAdapter.list({ detectedInId: "INS-1012" });
    expect(created.repairRequests).toHaveLength(1);
    expect(created.repairRequests[0]).toMatchObject({
      detectedInType: "INSPECTION",
      detectedInId: "INS-1012",
      severity: "LOW",
      publicSafetyRisk: true,
      sourceContext: { type: "INSPECTION", id: "INS-1012" },
    });
  });

  it("shows the inspection action to Field only when its linked Service belongs to the actor crew", async () => {
    updateServiceFixture("SVC-1112", { crewId: "crew-a" });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    const list = await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    await user.click(within(list).getByRole("button", { name: /ER-1012/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1012" });
    await waitFor(() => expect(within(detail).queryByRole("button", { name: "Crear derivación de reparación" })).not.toBeInTheDocument());
  });

  it("shows an unsent inspection referral after a pre-creation network failure", async () => {
    server.use(http.post("*/api/repair-requests", () => HttpResponse.error()));
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    const list = await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    await user.click(within(list).getByRole("button", { name: /ER-1012/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1012" });
    await user.click(await within(detail).findByRole("button", { name: "Crear derivación de reparación" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Derivar" }));

    expect(await within(dialog).findByText("Sin enviar")).toBeVisible();
    expect(within(dialog).getByLabelText(/Ubicación del daño/)).toHaveValue("Av. Brasil 2450");
    const notCreated = await repairRequestsAdapter.list({ detectedInId: "INS-1012" });
    expect(notCreated.repairRequests).toHaveLength(0);
  });
});

describe("internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", async () => {
    const { container } = render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    expectNoInternalJargon(container);
  });
});
