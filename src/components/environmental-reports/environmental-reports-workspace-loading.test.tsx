import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http } from "msw";
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

// Un resolver que sólo espera y no responde deja pasar la petición al handler real.
const delayed = (path: string, ms = 200) => http.get(path, async () => { await delay(ms); });

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
    server.use(delayed("*/api/environmental-reports"));
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);

    expectBusy(screen.getByRole("region", { name: "Expedientes ambientales" }));

    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getAllByRole("button").length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: "Expedientes ambientales" })).toBeNull();
  });

  it("shows the inspection history as a busy region with skeleton items until the inspections arrive", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    server.use(delayed("*/api/environmental-reports/:id/inspections"));
    await user.click(within(list).getByRole("button", { name: reportRowName("ER-1008") }));

    const history = await screen.findByRole("region", { name: "Inspecciones" });
    expectBusy(history);

    await waitFor(() => expect(history).toHaveAttribute("aria-busy", "false"), { timeout: 2000 });
    expect(history.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(within(history).getAllByText(/Inspección \d/).length).toBeGreaterThan(0);
  });

  it("shows the violation notice as a busy region with a skeleton until the notice arrives", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });

    server.use(delayed("*/api/environmental-inspections/:id/violation-notice"));
    await user.click(within(list).getByRole("button", { name: reportRowName("ER-1008") }));

    const notice = await screen.findByRole("region", { name: "Acta de infracción" });
    expectBusy(notice);

    await waitFor(() => expect(notice).toHaveAttribute("aria-busy", "false"), { timeout: 2000 });
    expect(notice.querySelector('[data-slot="skeleton"]')).toBeNull();
  });
});
