import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { coverageIndicatorFixture } from "@/lib/indicator-fixtures";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { scenarios } from "@/lib/scenarios";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-04T15:00:00.000Z"));
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
  olvidarCatalogoDeEtiquetas();
  vi.useRealTimers();
});
afterAll(() => server.close());

const visibleLoadingText = () => screen.queryAllByText(/Cargando(\.\.\.|…)/);

function expectBusy(region: HTMLElement) {
  expect(region).toHaveAttribute("aria-busy", "true");
  const message = within(region).getByText("Cargando");
  expect(message).toHaveAttribute("role", "status");
  expect(message).toHaveClass("sr-only");
  expect(visibleLoadingText()).toHaveLength(0);
}

describe("IndicatorsDashboard loading skeletons (#591)", () => {
  it("shows the family cards as a busy region with a skeleton until the families arrive", async () => {
    server.use(http.get("*/api/indicators/:family", async () => {
      await delay(1000);
      return HttpResponse.json(coverageIndicatorFixture);
    }));
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    const band = screen.getByRole("region", { name: "Requiere atención" });
    expectBusy(band);
    expect(band.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);

    await waitFor(() => expect(band).toHaveAttribute("aria-busy", "false"), { timeout: 3000 });
    expect(within(band).queryByRole("status")).toBeNull();
    expect(band.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it("shows the trend module as a busy region with a skeleton, then the chart takes its place", async () => {
    let release!: () => void;
    const responseReady = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.get("*/api/indicators/coverage", async () => {
      await responseReady;
      return HttpResponse.json(coverageIndicatorFixture);
    }));
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Detalle por familia" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Cobertura" }));
    const trend = screen.getByRole("region", { name: "Por categoría" });
    expectBusy(trend);
    expect(trend.querySelector('[data-slot="skeleton"]')).not.toBeNull();

    release();
    const loaded = await screen.findByRole("heading", { name: "Cobertura por tipo de servicio" });
    expect(loaded).toBeVisible();
    expect(screen.getByRole("region", { name: "Por categoría" })).not.toHaveAttribute("aria-busy");
    expect(within(screen.getByRole("region", { name: "Por categoría" })).queryByText("Cargando")).toBeNull();
  });

  it("keeps the catalog filters in place while the options load: no spinner, no extra bar", async () => {
    server.use(http.get("*/api/service-types", async () => {
      await delay(800);
      return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    }));
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Más filtros" }));
    const filter = screen.getByLabelText("Tipo de servicio");
    const hint = screen.getByRole("region", { name: "Opciones de Tipo de servicio" });
    expectBusy(hint);
    expect(hint.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(hint).toHaveClass("sr-only");
    expect(filter).toBeDisabled();
    expect(filter.querySelector('[data-slot="spinner"], svg.animate-spin')).toBeNull();
    expect(filter).not.toHaveAttribute("aria-busy");

    await waitFor(() => expect(screen.queryByRole("region", { name: "Opciones de Tipo de servicio" })).toBeNull(), { timeout: 4000 });
  });

  it("shows the narrow summary as a busy region with a skeleton until the family arrives", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({ matches: true, media: "(max-width: 760px)", onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
    server.use(http.get("*/api/indicators/:family", async () => {
      await delay(1000);
      return HttpResponse.json(coverageIndicatorFixture);
    }));
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Detalle por familia" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Cobertura" }));
    const summary = screen.getByRole("region", { name: "Resumen de Cobertura", busy: true });
    expectBusy(summary);
    expect(summary.querySelector('[data-slot="skeleton"]')).not.toBeNull();

    await waitFor(() => expect(screen.queryByRole("region", { name: "Resumen de Cobertura", busy: true })).toBeNull(), { timeout: 4000 });
  });
});

