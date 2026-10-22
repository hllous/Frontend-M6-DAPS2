import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

import { handlers } from "@/mocks/handlers";
import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { scenarios } from "@/lib/scenarios";
import type { Tree } from "@/lib/trees";
import { TreeSurveyPanel } from "./tree-survey-panel";

const server = setupServer(...handlers);
const tree: Tree = { id: "tree-2", surveyCode: "ARB-00443", zoneId: "zone-2", species: "Tipa", address: "Parque del Bicentenario, sector norte", lat: -34.5692, lng: -58.4051, heightM: 18, diameterCm: 72.5, active: true, lastSurvey: null };

async function chooseSelectOption(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, name: string | RegExp) {
  await waitFor(() => expect(trigger).toBeEnabled());
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name }));
  if (trigger.getAttribute("aria-expanded") === "true") await user.keyboard("{Escape}");
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetTreeSurveyFixtures());
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

describe("TreeSurveyPanel", () => {
  it("lets users clear survey filters and optional survey selections", async () => {
    const user = userEvent.setup();
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });

    const healthFilter = screen.getByRole("combobox", { name: "Filtrar por estado sanitario" });
    await chooseSelectOption(user, healthFilter, "Debilitado");
    await chooseSelectOption(user, healthFilter, "Todos");
    expect(healthFilter).toHaveTextContent("Todos");

    const riskFilter = screen.getByRole("combobox", { name: "Filtrar por nivel de riesgo" });
    await chooseSelectOption(user, riskFilter, "Alto");
    await chooseSelectOption(user, riskFilter, "Todos");
    expect(riskFilter).toHaveTextContent("Todos");

    await user.click(screen.getByRole("button", { name: "Registrar relevamiento" }));
    const dialog = screen.getByRole("dialog", { name: /Registrar relevamiento/ });
    const riskType = within(dialog).getByRole("combobox", { name: "Tipo de riesgo" });
    await chooseSelectOption(user, riskType, "Caída de ramas");
    await chooseSelectOption(user, riskType, "Sin tipo");
    expect(riskType).toHaveTextContent("Seleccione un tipo");

    const suggestedIntervention = within(dialog).getByRole("combobox", { name: "Intervención sugerida" });
    await chooseSelectOption(user, suggestedIntervention, "Poda de formación");
    await chooseSelectOption(user, suggestedIntervention, "Sin sugerencia");
    expect(suggestedIntervention).toHaveTextContent("Sin sugerencia");
  });

  it("lets Field review newest-first history and inspect an immutable detail", async () => {
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: /Historial de relevamientos/ })).toBeVisible();
    expect(screen.getByText("06/09/2026")).toBeVisible();
    expect(screen.getByText("20/08/2026")).toBeVisible();
    const highRisk = screen.getByRole("article", { name: /06\/09\/2026/ });
    await within(highRisk).getByRole("button", { name: "Ver detalle" }).click();
    const dialog = await screen.findByRole("dialog", { name: /Detalle del relevamiento/ });
    expect(dialog.textContent).toContain("Ramas secas sobre la vereda.");
    expect(within(dialog).queryByRole("button", { name: /Editar|Eliminar|Borrar/ })).not.toBeInTheDocument();
  });

  it("blocks high-risk capture until riskType is selected and submits without Service linkage", async () => {
    const user = userEvent.setup();
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });
    await screen.getByRole("button", { name: "Registrar relevamiento" }).click();
    const dialog = screen.getByRole("dialog", { name: /Registrar relevamiento/ });
    expect(within(dialog).getByLabelText(/^Fecha/)).toBeVisible();
    expect(within(dialog).getByRole("combobox", { name: "Estado sanitario" })).toHaveAttribute("aria-required", "true");
    expect(within(dialog).getByRole("combobox", { name: "Nivel de riesgo" })).toHaveAttribute("aria-required", "true");
    await chooseSelectOption(user, within(dialog).getByRole("combobox", { name: "Estado sanitario" }), "Debilitado");
    await chooseSelectOption(user, within(dialog).getByRole("combobox", { name: "Nivel de riesgo" }), /Cr/);
    expect(within(dialog).getByRole("combobox", { name: "Tipo de riesgo" })).toHaveAttribute("aria-required", "true");
    await user.click(within(dialog).getByRole("button", { name: "Guardar relevamiento" }));
    expect((await within(dialog).findByRole("alert")).textContent).toContain("tipo de riesgo");

    await chooseSelectOption(user, within(dialog).getByRole("combobox", { name: "Tipo de riesgo" }), "Inestabilidad del tronco");
    await user.click(within(dialog).getByRole("button", { name: "Guardar relevamiento" }));
    expect(await screen.findByText("Relevamiento registrado.")).toBeVisible();
    expect(screen.queryByText(/Service|servicio asignado/i)).not.toBeInTheDocument();
  });

  it("shows read-only access when the scenario lacks tree:survey", async () => {
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.officeLimited} onClose={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: /Historial de relevamientos/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar relevamiento" })).not.toBeInTheDocument();
  });

  it("offers a guided intervention request from a high-risk survey with a readable source trail", async () => {
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });
    await (await screen.findByRole("button", { name: "Solicitar intervención sugerida" })).click();
    const dialog = screen.getByRole("dialog", { name: /Solicitar intervención/ });
    expect(within(dialog).getByRole("combobox", { name: "Tipo de intervención" })).toHaveTextContent("Poda de seguridad");
    expect(within(dialog).getByRole("combobox", { name: "Árboles a intervenir" })).toHaveTextContent("ARB-00443");
    expect(within(dialog).getByLabelText(/^Justificación/)).toHaveValue("Relevamiento 06/09/2026 (survey-2).");
  });

  it("covers accessible empty and retryable error states", async () => {
    server.use(http.get("*/api/trees/:treeId/surveys", () => HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 } })));
    const { unmount } = render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    expect(await screen.findByText("Sin relevamientos")).toBeVisible();
    unmount();

    server.use(http.get("*/api/trees/:treeId/surveys", () => HttpResponse.json({ malformed: true })));
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  it("defaults the survey date to today in Argentina (not UTC) and blocks later dates", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-21T01:30:00Z"));
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });
    await screen.getByRole("button", { name: "Registrar relevamiento" }).click();
    const dialog = screen.getByRole("dialog", { name: /Registrar relevamiento/ });
    const dateInput = within(dialog).getByLabelText(/^Fecha/);
    expect(dateInput).toHaveTextContent("20/09/2026");
    fireEvent.click(dateInput);
    const tomorrow = screen.getAllByRole("button").find((button) => button.getAttribute("data-day") === "21/9/2026");
    expect(tomorrow).toBeDisabled();
  });

  it("refreshes the default date each time the form opens instead of freezing it at load", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T15:00:00Z"));
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });
    vi.setSystemTime(new Date("2026-09-22T15:00:00Z"));
    await screen.getByRole("button", { name: "Registrar relevamiento" }).click();
    const dialog = screen.getByRole("dialog", { name: /Registrar relevamiento/ });
    expect(within(dialog).getByLabelText(/^Fecha/)).toHaveTextContent("22/09/2026");
  });

  it("does not allow a future date to be selected", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-21T15:00:00Z"));
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.fieldCrewLeader} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });
    await screen.getByRole("button", { name: "Registrar relevamiento" }).click();
    const dialog = screen.getByRole("dialog", { name: /Registrar relevamiento/ });
    fireEvent.click(within(dialog).getByLabelText(/^Fecha/));
    const tomorrow = screen.getAllByRole("button").find((button) => button.getAttribute("data-day") === "22/9/2026");
    expect(tomorrow).toBeDisabled();
  });
});
