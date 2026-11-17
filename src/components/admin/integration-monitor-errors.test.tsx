import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetIntegrationMonitorFixtures } from "@/mocks/integration-monitor-fixtures";
import { IntegrationMonitor } from "./integration-monitor";

const server = setupServer(...handlers);
const unavailable = () => HttpResponse.json({ message: "Servicio no disponible." }, { status: 503 });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  process.env.M6_AUTH_MODE = "mock";
  resetIntegrationMonitorFixtures();
  window.history.replaceState(null, "", "/app/admin/integration-monitor");
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("IntegrationMonitor: errores de carga", () => {
  it("informa que no pudo cargar los eventos salientes y sigue mostrando la pantalla", async () => {
    server.use(http.get("*/api/events/outbox", unavailable));
    render(<IntegrationMonitor canManage initialTab="events" />);

    expect(await screen.findAllByText(/Servicio no disponible|No se pudieron cargar/)).not.toHaveLength(0);
    expect(screen.queryByRole("table", { name: "Eventos salientes" })).not.toBeInTheDocument();
  });

  it("informa que no pudo cargar el registro de actividad", async () => {
    server.use(http.get("*/api/audit", unavailable));
    render(<IntegrationMonitor canManage initialTab="activity" />);

    expect(await screen.findAllByText(/Servicio no disponible|No se pudo cargar el registro/)).not.toHaveLength(0);
  });

  it("informa que no pudo cargar el detalle de un evento", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/events/outbox/:id", unavailable));
    render(<IntegrationMonitor canManage initialTab="events" />);

    await user.click((await screen.findAllByRole("button", { name: "Ver detalle de containerDamaged" }))[0]);
    const detail = await screen.findByRole("dialog", { name: "Detalle del evento" });
    await waitFor(() => expect(detail).toHaveTextContent(/Servicio no disponible|No se pudo cargar el detalle/));
  });

  it("no rompe cuando falla solo el total de eventos fallidos", async () => {
    server.use(http.get("*/api/events/outbox", ({ request }) => {
      const status = new URL(request.url).searchParams.get("status");
      return status === "FAILED" ? unavailable() : undefined;
    }));
    render(<IntegrationMonitor canManage initialTab="events" />);

    expect(await screen.findByRole("table", { name: "Eventos salientes" })).toBeVisible();
    expect(screen.queryByLabelText("Eventos fallidos")).not.toHaveTextContent("2 eventos fallidos");
  });
});
