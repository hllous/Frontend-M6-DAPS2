import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetIntegrationMonitorFixtures } from "@/mocks/integration-monitor-fixtures";
import { IntegrationMonitor, actionLabels, statusLabels } from "./integration-monitor";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  process.env.M6_AUTH_MODE = "mock";
  resetIntegrationMonitorFixtures();
  window.history.replaceState(null, "", "/app/admin/integration-monitor");
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("IntegrationMonitor", () => {
  it("loads a paginated outgoing event list without exposing payload", async () => {
    render(<IntegrationMonitor canManage initialTab="events" />);

    const list = await screen.findByRole("table", { name: "Eventos salientes" });
    expect(within(list).getByText("containerDamaged")).toBeVisible();
    expect(within(list).queryByText(/damageType|containerId/)).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Eventos fallidos")).toHaveTextContent("2 eventos fallidos");
  });

  it("announces calendar days in Spanish", async () => {
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage initialTab="events" />);

    await user.click(await screen.findByRole("button", { name: "Desde" }));

    expect(await screen.findByRole("button", { name: /^Hoy,/ })).toBeVisible();
  });

  it("lets an administrator inspect a payload and confirms a single retry with the same event id warning", async () => {
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage initialTab="events" />);

    await user.click((await screen.findAllByRole("button", { name: "Ver detalle de containerDamaged" }))[0]);
    const detail = await screen.findByRole("dialog", { name: "Detalle del evento" });
    expect(within(detail).getByText(/"severity": "HIGH"/)).toBeVisible();
    await user.click(within(detail).getByRole("button", { name: "Reintentar evento" }));

    const confirmation = await screen.findByRole("dialog", { name: "Confirmar reintento" });
    expect(confirmation).toHaveTextContent("mismo identificador del evento");
    expect(confirmation).toHaveTextContent("Esta acción no corrige un contenido que el sistema receptor haya rechazado");
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar reintento" }));

    expect(await screen.findByRole("status")).toHaveTextContent("El evento se reencoló y ahora está pendiente.");
    expect((await screen.findAllByLabelText("Estado: Pendiente"))[0]).toBeVisible();
  });

  it("hides event detail and retry actions from an auditor", async () => {
    render(<IntegrationMonitor canManage={false} initialTab="events" />);

    expect(await screen.findByRole("table", { name: "Eventos salientes" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Ver detalle/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reintentar/ })).not.toBeInTheDocument();
  });

  it("shows a conflict message when a single retry is no longer available", async () => {
    const user = userEvent.setup();
    server.use(http.post("*/api/events/outbox/:id/retry", () => HttpResponse.json({ statusCode: 409, message: "El evento ya cambió", error: "Conflict", path: "/api/events/outbox/id" }, { status: 409 })));
    render(<IntegrationMonitor canManage initialTab="events" />);

    await user.click((await screen.findAllByRole("button", { name: "Ver detalle de containerDamaged" }))[0]);
    const detail = await screen.findByRole("dialog", { name: "Detalle del evento" });
    await user.click(within(detail).getByRole("button", { name: "Reintentar evento" }));
    const confirmation = await screen.findByRole("dialog", { name: "Confirmar reintento" });
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar reintento" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El evento ya no está fallido");
    expect(screen.getByRole("alert")).toHaveTextContent("Actualice la lista");
  });

  it("confirms a limited bulk retry and announces how many events remain failed", async () => {
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage initialTab="events" />);

    await user.click(await screen.findByRole("button", { name: "Reintentar eventos fallidos" }));
    const confirmation = await screen.findByRole("dialog", { name: "Reintentar eventos fallidos" });
    await user.clear(within(confirmation).getByRole("spinbutton", { name: "Límite de reintentos" }));
    await user.type(within(confirmation).getByRole("spinbutton", { name: "Límite de reintentos" }), "1");
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar reintento masivo" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Se reencoló 1 evento; queda 1 evento fallido.");
  });

  it("filters the activity log by entity type and identifier", async () => {
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage={false} initialTab="activity" />);

    await user.click(await screen.findByRole("tab", { name: "Registro de actividad" }));
    expect(await screen.findByRole("table", { name: "Registro de actividad" })).toBeVisible();
    await user.click(screen.getByRole("combobox", { name: "Tipo de entidad" }));
    await user.click(await screen.findByRole("option", { name: "Contenedor" }));
    await user.type(screen.getByRole("textbox", { name: "Identificador de entidad" }), "550e8400-e29b-41d4-a716-446655440001");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros de actividad" }));

    const table = screen.getByRole("table", { name: "Registro de actividad" });
    expect(within(table).getByText("Informó un daño")).toBeVisible();
    expect(within(table).queryByText("Completó un servicio")).not.toBeInTheDocument();
  });

  it("translates every known audit action and status, and falls back to readable Spanish for unknown ones", async () => {
    const base = { entityType: "SERVICE", entityId: "550e8400-e29b-41d4-a716-446655440021", actorUserId: "42", actorRoles: ["M6_ADMIN"], note: null, occurredAt: "2026-10-31T12:00:00.000Z" };
    const data = [
      { ...base, id: "650e8400-e29b-41d4-a716-446655440101", action: "CREATE", fromStatus: null, toStatus: "ACTIVE" },
      { ...base, id: "650e8400-e29b-41d4-a716-446655440102", action: "ASSIGN_CREW", fromStatus: "SCHEDULED", toStatus: "UNDER_REPAIR" },
      { ...base, id: "650e8400-e29b-41d4-a716-446655440103", action: "NEW_BACKEND_ACTION", fromStatus: "SCHEDULED", toStatus: "NEW_STATE" },
    ];
    server.use(http.get("*/api/audit", () => HttpResponse.json({ data, meta: { total: 3, page: 1, pageSize: 20, totalPages: 1 } })));
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage={false} initialTab="activity" />);

    await user.click(await screen.findByRole("tab", { name: "Registro de actividad" }));
    const table = await screen.findByRole("table", { name: "Registro de actividad" });
    expect(within(table).getByText("Creó un registro")).toBeVisible();
    expect(within(table).getByText("Asignó una cuadrilla")).toBeVisible();
    expect(within(table).getByText("Acción registrada: new backend action")).toBeVisible();
    expect(within(table).getByText("En reparación")).toBeVisible();
    expect(within(table).getByText("Estado: new state")).toBeVisible();
    expect(within(table).queryByText(/CREATE|ASSIGN_CREW|NEW_BACKEND_ACTION|UNDER_REPAIR/)).not.toBeInTheDocument();
  });

  it("translates every label in the maps and never shows the raw code", async () => {
    const id = (n: number) => `650e8400-e29b-41d4-a716-${String(n).padStart(12, "0")}`;
    const actions = Object.keys(actionLabels);
    const statuses = Object.keys(statusLabels);
    const rows = Array.from({ length: Math.max(actions.length, statuses.length) }, (_, n) => ({
      id: id(n), entityType: "SERVICE", entityId: "550e8400-e29b-41d4-a716-446655440021", actorUserId: "42",
      actorRoles: ["M6_ADMIN"], note: null, occurredAt: "2026-10-31T12:00:00.000Z",
      action: actions[n % actions.length], fromStatus: statuses[n % statuses.length], toStatus: statuses[(n + 1) % statuses.length],
    }));
    server.use(http.get("*/api/audit", () => HttpResponse.json({ data: rows, meta: { total: rows.length, page: 1, pageSize: 20, totalPages: 1 } })));
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage={false} initialTab="activity" />);
    await user.click(await screen.findByRole("tab", { name: "Registro de actividad" }));
    const table = await screen.findByRole("table", { name: "Registro de actividad" });
    for (const label of [...Object.values(actionLabels), ...Object.values(statusLabels)]) expect(within(table).getAllByText(label).length).toBeGreaterThan(0);
    expect(within(table).queryByText(/[A-Z]+_[A-Z_]+|^[A-Z]{3,}$/)).not.toBeInTheDocument();
  });

  it("shows a dash for missing statuses and safe fallbacks for empty or prototype-like actions", async () => {
    const base = { entityType: "SERVICE", entityId: "550e8400-e29b-41d4-a716-446655440021", actorUserId: "42", actorRoles: ["M6_ADMIN"], note: null, occurredAt: "2026-10-31T12:00:00.000Z", fromStatus: null, toStatus: "" };
    const data = [
      { ...base, id: "650e8400-e29b-41d4-a716-446655440201", action: "   " },
      { ...base, id: "650e8400-e29b-41d4-a716-446655440202", action: "constructor" },
      { ...base, id: "650e8400-e29b-41d4-a716-446655440203", action: "__proto__" },
    ];
    server.use(http.get("*/api/audit", () => HttpResponse.json({ data, meta: { total: 3, page: 1, pageSize: 20, totalPages: 1 } })));
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage={false} initialTab="activity" />);
    await user.click(await screen.findByRole("tab", { name: "Registro de actividad" }));
    const table = await screen.findByRole("table", { name: "Registro de actividad" });
    expect(within(table).getByText("Acción no especificada")).toBeVisible();
    expect(within(table).getByText("Acción registrada: constructor")).toBeVisible();
    expect(within(table).getByText("Acción registrada: proto")).toBeVisible();
    expect(within(table).getAllByText("—").length).toBeGreaterThanOrEqual(6);
  });
});
