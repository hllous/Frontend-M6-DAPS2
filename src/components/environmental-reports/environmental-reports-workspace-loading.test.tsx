import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetEnvironmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { scenarios } from "@/lib/scenarios";

import { EnvironmentalReportsWorkspace } from "./environmental-reports-workspace";
import { reportRowName } from "@/test/row-names";

const server = setupServer(...handlers);
vi.mock("next/dynamic", () => ({ default: () => () => <div>Mapa</div> }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetEnvironmentalReportFixtures();
  resetRepairRequestFixtures();
  resetServiceFixtures();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

// Un resolver que sólo espera y no responde deja pasar la petición al handler real. La respuesta
// queda retenida hasta que el test llama a `release()`: así el estado «cargando» dura lo que
// necesitan las aserciones y no depende de un reloj (con un retardo fijo de 200 ms, un runner
// cargado lo agotaba antes de llegar a `expectBusy` y el test fallaba al azar).
function gated(path: string) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  server.use(http.get(path, async () => { await gate; }));
  return release;
}

const visibleLoadingText = () => screen.queryAllByText(/Cargando(\.\.\.|…)|Consultando/);

function expectBusy(region: HTMLElement) {
  expect(region).toHaveAttribute("aria-busy", "true");
  const message = within(region).getByText("Cargando");
  expect(message).toHaveAttribute("role", "status");
  expect(message).toHaveClass("sr-only");
  expect(region.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  expect(visibleLoadingText()).toHaveLength(0);
}

describe("EnvironmentalReportsWorkspace loading skeletons (#591)", () => {
  it("shows the report queue as a busy region with skeleton items until the reports arrive", async () => {
    const release = gated("*/api/environmental-reports");
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);

    expectBusy(screen.getByRole("region", { name: "Expedientes ambientales" }));
    release();

    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getAllByRole("button").length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: "Expedientes ambientales" })).toBeNull();
  });

  it("shows the inspection history as a busy region with skeleton items until the inspections arrive", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    const release = gated("*/api/environmental-reports/:id/inspections");
    await user.click(within(list).getByRole("button", { name: reportRowName("ER-1008") }));

    const history = await screen.findByRole("region", { name: "Inspecciones" });
    expectBusy(history);
    release();

    await waitFor(() => expect(history).toHaveAttribute("aria-busy", "false"));
    expect(history.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(within(history).getAllByText(/Inspección del /).length).toBeGreaterThan(0);
  });

  it("shows the violation notice as a busy region with a skeleton until the notice arrives", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    const release = gated("*/api/environmental-inspections/:id/violation-notice");
    await user.click(within(list).getByRole("button", { name: reportRowName("ER-1008") }));

    const notice = await screen.findByRole("region", { name: "Acta de infracción" });
    expectBusy(notice);
    release();

    await waitFor(() => expect(notice).toHaveAttribute("aria-busy", "false"));
    expect(notice.querySelector('[data-slot="skeleton"]')).toBeNull();
  });
});
