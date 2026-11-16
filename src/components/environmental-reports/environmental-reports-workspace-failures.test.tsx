import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetEnvironmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { scenarios } from "@/lib/scenarios";
import { reportRowName } from "@/test/row-names";
import { EnvironmentalReportsWorkspace } from "./environmental-reports-workspace";

const server = setupServer(...handlers);
vi.mock("next/dynamic", () => ({ default: () => () => <div>Mapa</div> }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetEnvironmentalReportFixtures();
  resetRepairRequestFixtures();
  resetServiceFixtures();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/app?destination=environment");
});
afterAll(() => server.close());

const apiError = (status: number, message: string) =>
  HttpResponse.json({ statusCode: status, error: "Error", message, timestamp: new Date().toISOString(), path: "/api/environmental-reports" }, { status });

async function openReport(user: ReturnType<typeof userEvent.setup>) {
  render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
  const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
  await user.click(within(list).getByRole("button", { name: reportRowName("ER-1001") }));
  return screen.findByRole("region", { name: reportRowName("ER-1001") });
}

describe("EnvironmentalReportsWorkspace: fallas", () => {
  it("explica que no se pudo cargar la cola cuando el backend responde con error", async () => {
    server.use(http.get("*/api/environmental-reports", () => apiError(503, "Cola no disponible.")));
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);

    expect((await screen.findAllByText(/Cola no disponible\./)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: reportRowName("ER-1001") })).not.toBeInTheDocument();
  });

  it("avisa que el expediente cambió cuando iniciar la revisión da 409", async () => {
    server.use(http.post("*/api/environmental-reports/ER-1001/start-review", () => apiError(409, "conflicto")));
    const user = userEvent.setup();
    const detail = await openReport(user);

    await user.click(within(detail).getByRole("button", { name: "Iniciar revisión" }));
    const dialog = await screen.findByRole("dialog", { name: /^Iniciar revisión/ });
    await user.click(within(dialog).getByRole("button", { name: "Iniciar revisión" }));

    expect(await screen.findByText("El expediente cambió. Revise el estado actual.")).toBeVisible();
  });

  it("muestra el mensaje del backend cuando falla iniciar la revisión", async () => {
    server.use(http.post("*/api/environmental-reports/ER-1001/start-review", () => apiError(500, "No se pudo iniciar por una falla interna.")));
    const user = userEvent.setup();
    const detail = await openReport(user);

    await user.click(within(detail).getByRole("button", { name: "Iniciar revisión" }));
    const dialog = await screen.findByRole("dialog", { name: /^Iniciar revisión/ });
    await user.click(within(dialog).getByRole("button", { name: "Iniciar revisión" }));

    await waitFor(() => expect(screen.getAllByText(/No se pudo iniciar por una falla interna\.|No se pudo actualizar el expediente/).length).toBeGreaterThan(0));
    expect(screen.getByRole("dialog", { name: /^Iniciar revisión/ })).toBeVisible();
  });
});
