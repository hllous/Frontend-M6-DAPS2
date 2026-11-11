import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetIntegrationMonitorFixtures } from "@/mocks/integration-monitor-fixtures";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";
import { IntegrationMonitor } from "./integration-monitor";

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
    const { container } = render(<IntegrationMonitor canManage initialTab="events" />);

    const list = await screen.findByRole("table", { name: "Eventos salientes" });
    expect(within(list).getByText("containerDamaged")).toBeVisible();
    expect(within(list).queryByText(/damageType|containerId/)).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Eventos fallidos")).toHaveTextContent("2 eventos fallidos");
    const heading = screen.getByRole("heading", { name: "Eventos" });
    expect(heading).toBeVisible();
    expectNoInternalJargon(container, { allowTechnicalIds: true });
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

    expect(await screen.findByText("El evento se reencoló y ahora está pendiente.")).toHaveAttribute("role", "status");
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

    expect(await screen.findByText("Se reencoló 1 evento; queda 1 evento fallido.")).toHaveAttribute("role", "status");
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

  it("shows formal Spanish labels for known audit actions and statuses", async () => {
    render(<IntegrationMonitor canManage initialTab="activity" />);

    const table = await screen.findByRole("table", { name: "Registro de actividad" });
    expect(within(table).getByText("Creó el registro")).toBeVisible();
    expect(within(table).getByText("Informó un daño")).toBeVisible();
    expect(within(table).getAllByText("Activo").length).toBeGreaterThan(0);
    expect(within(table).queryByText(/Acción registrada/)).not.toBeInTheDocument();
  });

  it("shows an inbox event READ row with its Spanish labels", async () => {
    render(<IntegrationMonitor canManage initialTab="activity" />);

    const table = await screen.findByRole("table", { name: "Registro de actividad" });
    expect(within(table).getByText("Consultó el dato")).toBeVisible();
    expect(within(table).getByRole("link", { name: /Ver actividad de Evento recibido 550e8400-e29b-41d4-a716-446655440051/ })).toBeVisible();
  });

  it("falls back to a Spanish label for unknown values and shows the raw code only to administrators", async () => {
    const { unmount } = render(<IntegrationMonitor canManage initialTab="activity" />);

    const adminTable = await screen.findByRole("table", { name: "Registro de actividad" });
    expect(within(adminTable).getByText("Otra acción")).toBeVisible();
    expect(within(adminTable).getByText("Otro estado")).toBeVisible();
    expect(within(adminTable).getByText("Código: ARCHIVE_RECORD")).toBeVisible();
    expect(within(adminTable).getByText("Código: PAUSED_BY_CITY")).toBeVisible();
    unmount();

    render(<IntegrationMonitor canManage={false} initialTab="activity" />);
    const auditorTable = await screen.findByRole("table", { name: "Registro de actividad" });
    expect(within(auditorTable).getByText("Otra acción")).toBeVisible();
    expect(within(auditorTable).queryByText(/ARCHIVE_RECORD/)).not.toBeInTheDocument();
    expect(within(auditorTable).queryByText(/PAUSED_BY_CITY/)).not.toBeInTheDocument();
  });

  it("shows the area that acted, not a user id, when the actor is the system (#875)", async () => {
    const { container } = render(<IntegrationMonitor canManage initialTab="activity" />);

    const table = await screen.findByRole("table", { name: "Registro de actividad" });
    expect(within(table).getByText("Sistema · Obras Públicas")).toBeVisible();
    expect(within(table).queryByText("system:m3")).not.toBeInTheDocument();
    expectNoInternalJargon(container, { allowTechnicalIds: true });
  });

  it("lists the events received from other areas with their sender, state and error (#875)", async () => {
    const user = userEvent.setup();
    const { container } = render(<IntegrationMonitor canManage={false} initialTab="events" />);

    await user.click(await screen.findByRole("tab", { name: "Eventos recibidos" }));
    const table = await screen.findByRole("table", { name: "Eventos recibidos" });
    expect(within(table).getByText("workOrderCompleted")).toBeVisible();
    expect(within(table).getByText("Obras Públicas")).toBeVisible();
    expect(within(table).getByText("Tránsito")).toBeVisible();
    expect(within(table).getByText("closureRequestId inexistente")).toBeVisible();
    expect(within(table).getByLabelText("Estado: Procesado")).toBeVisible();
    expect(within(table).getByLabelText("Estado: Fallido")).toBeVisible();
    expect(within(table).getByLabelText("Estado: En curso")).toBeVisible();
    expectNoInternalJargon(container, { allowTechnicalIds: true });
  });

  it("filters the received events by state and explains an empty result (#875)", async () => {
    const user = userEvent.setup();
    render(<IntegrationMonitor canManage={false} initialTab="received" />);

    expect(await screen.findByRole("table", { name: "Eventos recibidos" })).toBeVisible();
    await user.click(screen.getByRole("combobox", { name: "Estado de eventos recibidos" }));
    await user.click(await screen.findByRole("option", { name: "Fallido" }));
    await user.click(screen.getByRole("button", { name: "Aplicar filtros de recibidos" }));

    await waitFor(() => expect(screen.queryByText("workOrderCompleted")).not.toBeInTheDocument());
    expect(within(screen.getByRole("table", { name: "Eventos recibidos" })).getByText("streetClosureApproved")).toBeVisible();

    await user.type(screen.getByRole("textbox", { name: "Tipo de evento" }), "noExiste");
    await user.click(screen.getByRole("button", { name: "Aplicar filtros de recibidos" }));
    expect(await screen.findByText("No hay eventos recibidos con esos filtros")).toBeVisible();
  });

  it("shows a recoverable error when the received events cannot be loaded (#875)", async () => {
    server.use(http.get("*/api/events/inbox", () => HttpResponse.json({ message: "Servicio no disponible." }, { status: 503 })));
    render(<IntegrationMonitor canManage={false} initialTab="received" />);

    expect(await screen.findByText("No se pudieron cargar los eventos recibidos")).toBeVisible();
    expect(screen.getByRole("button", { name: "Actualizar recibidos" })).toBeEnabled();
  });
});
