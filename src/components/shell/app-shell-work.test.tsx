import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { AppShell } from "./app-shell";
import { scenarios } from "@/lib/scenarios";
import { handlers } from "@/mocks/handlers";
import { resetTreeInterventionFixtures, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  window.history.replaceState(null, "", "/app?destination=work");
  resetTreeInterventionFixtures();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const emptyPage = { data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 } };

function group(name: RegExp) {
  return screen.findByRole("list", { name });
}

function hrefs(list: HTMLElement) {
  return within(list).getAllByRole("link").map((link) => link.getAttribute("href"));
}

describe("Mi trabajo de Oficina · cola de decisiones (Admin)", () => {
  it("shows every group the Admin can act on, built from real records, oldest first", async () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const reports = await group(/Expedientes por clasificar: 3 pendientes/);
    expect(within(reports).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("TK-2026-095"),
      expect.stringContaining("TK-2026-091"),
      expect.stringContaining("ER-1001"),
    ]);
    expect(hrefs(reports)).toEqual([
      "/app?destination=environment&detail=ER-1013",
      "/app?destination=environment&detail=ER-1002",
      "/app?destination=environment&detail=ER-1001",
    ]);
    expect(screen.getByRole("link", { name: /Ver todos los expedientes por clasificar/ })).toHaveAttribute(
      "href",
      "/app?destination=environment&status=RECEIVED&status=UNDER_REVIEW",
    );

    const noCrew = await group(/Servicios sin cuadrilla: 1 pendiente/);
    expect(within(noCrew).getAllByRole("listitem")).toHaveLength(1);
    expect(hrefs(noCrew)).toEqual(["/app?destination=services&action=assign&serviceId=SVC-1099"]);

    const rescheduled = await group(/Servicios por reprogramar: 2 pendientes/);
    expect(hrefs(rescheduled)).toEqual([
      "/app?destination=services&detail=SVC-1053",
      "/app?destination=services&detail=SVC-1091",
    ]);
    expect(screen.getByRole("link", { name: /Ver todos los servicios por reprogramar/ })).toHaveAttribute(
      "href",
      "/app?destination=services&status=RESCHEDULED",
    );

    const trees = await group(/Intervenciones de arbolado: 2 pendientes/);
    expect(within(trees).getAllByRole("listitem")).toHaveLength(2);
    expect(within(trees).getAllByRole("link")[0]).toHaveAttribute("href", "/app/catalog/tree-interventions");

    const containers = await group(/Contenedores desbordados: 1 pendiente/);
    expect(hrefs(containers)).toEqual(["/app/catalog/containers?detail=cont-2"]);
  });

  it("keeps the page heading without a subtitle under it", async () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    await group(/Contenedores desbordados/);

    expect(screen.getByRole("heading", { level: 1, name: scenarios.officeDutyQueue.work.title })).toBeInTheDocument();
    expect(screen.queryByText(/lo más antiguo primero/)).not.toBeInTheDocument();
  });

  it("shows the interventions waiting for authorization next to the requested ones", async () => {
    updateTreeInterventionFixture("intervention-3", { status: "PENDING_AUTHORIZATION" });
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const trees = await group(/Intervenciones de arbolado: 2 pendientes/);
    expect(within(trees).getAllByText("Solicitada")).toHaveLength(1);
    expect(within(trees).getAllByText("Pendiente de autorización")).toHaveLength(1);
  });

  it("shows no simulated text and no button that does nothing", async () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    await group(/Contenedores desbordados/);

    expect(screen.queryByText("Revisar reprogramación de barrido")).not.toBeInTheDocument();
    expect(screen.queryByText("Confirmar cuadrilla para plaza del Parque")).not.toBeInTheDocument();
    expect(screen.queryByText("Clasificar aviso ambiental recibido")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
  });

  it("limits each group to five items but keeps the backend total in its count", async () => {
    const reports = Array.from({ length: 7 }, (_, index) => ({
      id: `ER-90${index}`,
      reportType: "NOISE",
      address: `Calle ${index}`,
      status: "RECEIVED",
      priority: "LOW",
      createdAt: `2026-09-0${index + 1}T10:00:00.000Z`,
      updatedAt: `2026-09-0${index + 1}T10:00:00.000Z`,
    }));
    server.use(http.get("*/api/environmental-reports*", () =>
      HttpResponse.json({ data: reports, meta: { page: 1, pageSize: 100, total: 12, totalPages: 1 } })));
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const list = await group(/Expedientes por clasificar: 12 pendientes/);
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getAllByRole("link")[0]).toHaveAttribute("href", "/app?destination=environment&detail=ER-900");
  });

  it("keeps the other groups when one source fails, and retries only the failed one", async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(http.get("*/api/containers*", () =>
      failing ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json(emptyPage)));
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    await group(/Expedientes por clasificar: 3 pendientes/);
    const failed = await screen.findByRole("alert");
    expect(failed).toHaveTextContent(/No se pudieron cargar los contenedores desbordados/);

    failing = false;
    await user.click(within(failed).getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("list", { name: /Expedientes por clasificar/ })).toBeVisible();
  });

  it("says there is nothing pending when every group is empty", async () => {
    server.use(
      http.get("*/api/environmental-reports*", () => HttpResponse.json(emptyPage)),
      http.get("*/api/services*", () => HttpResponse.json(emptyPage)),
      http.get("*/api/tree-interventions*", () => HttpResponse.json(emptyPage)),
      http.get("*/api/containers*", () => HttpResponse.json(emptyPage)),
    );
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("No tenés tareas pendientes")).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("Mi trabajo de Oficina · tablero de cifras", () => {
  it("shows one tile per group with its backend total", async () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    await group(/Contenedores desbordados/);

    const tiles = screen.getByRole("list", { name: "Pendientes por grupo" });
    expect(within(tiles).getAllByRole("listitem").map((tile) => tile.textContent)).toEqual([
      "3Expedientes por clasificar",
      "1Servicios sin cuadrilla",
      "2Servicios por reprogramar",
      "2Intervenciones de arbolado",
      "1Contenedores desbordados",
    ]);
  });

  it("takes the focus to the group card when its tile is clicked", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    await group(/Contenedores desbordados/);

    await user.click(screen.getByRole("link", { name: "Contenedores desbordados: 1 pendiente" }));
    expect(screen.getByRole("heading", { level: 2, name: "Contenedores desbordados" })).toHaveFocus();
  });

  it("keeps a group with nothing pending as a plain zero tile without a card", async () => {
    server.use(http.get("*/api/containers*", () => HttpResponse.json(emptyPage)));
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    await group(/Expedientes por clasificar/);

    const tiles = screen.getByRole("list", { name: "Pendientes por grupo" });
    expect(within(tiles).getByText("Contenedores desbordados").closest("li")).toHaveTextContent("0");
    expect(within(tiles).queryByRole("link", { name: /Contenedores desbordados/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Contenedores desbordados" })).not.toBeInTheDocument();
  });
});

describe("Mi trabajo por rol", () => {
  it("shows Operaciones its groups and not the environmental one", async () => {
    render(<AppShell scenario={scenarios.officeOperations} />);

    await group(/Servicios sin cuadrilla/);
    expect(screen.getByRole("list", { name: /Servicios por reprogramar/ })).toBeVisible();
    expect(screen.getByRole("list", { name: /Contenedores desbordados/ })).toBeVisible();
    expect(screen.queryByRole("list", { name: /Expedientes por clasificar/ })).not.toBeInTheDocument();
  });

  it("shows Ambiental only the reports to classify", async () => {
    render(<AppShell scenario={scenarios.officeEnvironmental} />);

    await group(/Expedientes por clasificar/);
    const tiles = screen.getByRole("list", { name: "Pendientes por grupo" });
    expect(within(tiles).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getAllByRole("list")).toHaveLength(2);
  });

  it("tells the auditor the profile is read-only and points to Tableros", () => {
    render(<AppShell scenario={scenarios.officeLimited} />);

    expect(screen.getByText(/Su perfil es de solo lectura/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Tableros" })).toHaveAttribute("href", "/app?destination=dashboards");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it.each([
    ["responsable", scenarios.fieldCrewLeader],
    ["integrante", scenarios.fieldCrewMember],
  ])("keeps the %s of a crew on their assigned services without simulated text", async (_name, scenario) => {
    render(<AppShell scenario={scenario} />);

    expect(await screen.findByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    expect(screen.queryByText("Recorrido de higiene urbana — corredor costero")).not.toBeInTheDocument();
    expect(screen.queryByText("Revisión de punto verde — Plaza de las Artes")).not.toBeInTheDocument();
  });
});
