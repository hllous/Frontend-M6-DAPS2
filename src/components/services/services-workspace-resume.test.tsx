import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetServiceFixtures, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { invalidateServicesListCache } from "./services-list-cache";
import { ServicesWorkspace } from "./services-workspace";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  sessionStorage.clear();
  invalidateServicesListCache();
  resetServiceFixtures();
  updateServiceFixture("SVC-1096", { status: "SUSPENDED", statusReason: "Lluvia intensa" });
});
afterEach(() => {
  server.resetHandlers();
  resetServiceFixtures();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/app");
});
afterAll(() => server.close());

const DETAIL = "Detalle completo de Barrido mecánico — Recorrido 11";

describe("ServicesWorkspace: reanudar un servicio suspendido", () => {
  it("muestra el error del backend y permite reintentar hasta que el servicio vuelve a estar en curso", async () => {
    const message = "No se puede reanudar: la cuadrilla no está disponible.";
    let calls = 0;
    server.use(http.post("*/api/services/SVC-1096/resume", () => {
      calls += 1;
      if (calls === 1) {
        return HttpResponse.json({ statusCode: 409, message, error: "Conflict", timestamp: "2026-10-12T15:00:00.000Z", path: "/api/services/SVC-1096/resume" }, { status: 409 });
      }
      return HttpResponse.json({ ...serviceFixtures.find((s) => s.id === "SVC-1096")!, status: "IN_PROGRESS" });
    }));
    window.history.replaceState(null, "", "/app?detail=SVC-1096");
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);

    const detail = await screen.findByRole("region", { name: DETAIL });
    await user.click(within(detail).getByRole("button", { name: "Reanudar servicio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);

    await user.click(within(detail).getByRole("button", { name: "Reanudar servicio" }));
    await waitFor(() => expect(calls).toBe(2));
    await waitFor(() => expect(within(detail).queryByRole("button", { name: "Reanudar servicio" })).not.toBeInTheDocument());
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it("usa un mensaje genérico cuando la falla no viene del contrato de errores", async () => {
    server.use(http.post("*/api/services/SVC-1096/resume", () => HttpResponse.error()));
    window.history.replaceState(null, "", "/app?detail=SVC-1096");
    const user = userEvent.setup();
    render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);

    const detail = await screen.findByRole("region", { name: DETAIL });
    await user.click(within(detail).getByRole("button", { name: "Reanudar servicio" }));

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(within(detail).getByRole("button", { name: /Reanudar servicio|Reenviar/ })).toBeEnabled();
  });
});
