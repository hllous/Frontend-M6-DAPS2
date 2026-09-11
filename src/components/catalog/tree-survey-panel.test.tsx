import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

import { handlers } from "@/mocks/handlers";
import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { scenarios } from "@/lib/scenarios";
import type { Tree } from "@/lib/trees";
import { TreeSurveyPanel } from "./tree-survey-panel";

const server = setupServer(...handlers);
const tree: Tree = { id: "tree-2", surveyCode: "ARB-00443", zoneId: "zone-2", species: "Tipa", address: "Parque del Bicentenario, sector norte", lat: -34.5692, lng: -58.4051, heightM: 18, diameterCm: 72.5, active: true, lastSurvey: null };

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetTreeSurveyFixtures());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("TreeSurveyPanel", () => {
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
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.officeDutyQueue} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });
    await screen.getByRole("button", { name: "Registrar relevamiento" }).click();
    const dialog = screen.getByRole("dialog", { name: /Registrar relevamiento/ });
    fireEvent.change(within(dialog).getByLabelText("Estado sanitario"), { target: { value: "WEAKENED" } });
    fireEvent.change(within(dialog).getByLabelText("Nivel de riesgo"), { target: { value: "CRITICAL" } });
    await within(dialog).getByRole("button", { name: "Guardar relevamiento" }).click();
    expect((await within(dialog).findByRole("alert")).textContent).toContain("tipo de riesgo");

    fireEvent.change(within(dialog).getByLabelText("Tipo de riesgo"), { target: { value: "TRUNK_INSTABILITY" } });
    await within(dialog).getByRole("button", { name: "Guardar relevamiento" }).click();
    expect(await screen.findByText("Relevamiento registrado con éxito.")).toBeVisible();
    expect(screen.queryByText(/Service|servicio asignado/i)).not.toBeInTheDocument();
  });

  it("shows read-only access when the scenario lacks tree:survey", async () => {
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.officeLimited} onClose={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: /Historial de relevamientos/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar relevamiento" })).not.toBeInTheDocument();
  });

  it("offers a guided intervention request from a high-risk survey with a readable source trail", async () => {
    render(<TreeSurveyPanel tree={tree} scenario={scenarios.officeDutyQueue} onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: /Historial de relevamientos/ });
    await (await screen.findByRole("button", { name: "Solicitar intervención sugerida" })).click();
    const dialog = screen.getByRole("dialog", { name: /Solicitar intervención/ });
    expect(within(dialog).getByLabelText(/^Tipo de intervención/)).toHaveValue("SAFETY_PRUNING");
    expect(within(dialog).getByLabelText(/^Árboles a intervenir/)).toHaveValue(["tree-2"]);
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
});
