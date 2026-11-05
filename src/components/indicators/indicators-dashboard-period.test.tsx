import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { coverageIndicatorFixture } from "@/lib/indicator-fixtures";
import { scenarios } from "@/lib/scenarios";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";
import { IndicatorsDashboard } from "./indicators-dashboard";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-04T15:00:00Z")); });
afterEach(() => { server.resetHandlers(); server.events.removeAllListeners(); olvidarCatalogoDeEtiquetas(); window.history.replaceState(null, "", "/"); vi.useRealTimers(); });
afterAll(() => server.close());

describe("Atajos de período", () => {
  it.each([["Semana", "2026-09-28", "28/09/2026"], ["Mes", "2026-09-05", "05/09/2026"], ["Trimestre", "2026-07-07", "07/07/2026"]])("aplica %s y conserva el período en la URL", async (label, from, display) => {
    const requests: string[] = [];
    server.events.on("request:start", ({ request }) => { if (request.url.includes("/api/indicators/coverage")) requests.push(request.url); });
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Más filtros" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Actualizar" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(new URLSearchParams(window.location.search).get("from")).toBe(from));
    expect(new URLSearchParams(window.location.search).get("to")).toBe("2026-10-04");
    expect(screen.getByRole("button", { name: /^Desde/ })).toHaveTextContent(display);
    expect(screen.getByRole("button", { name: /^Hasta/ })).toHaveTextContent("04/10/2026");
    await waitFor(() => expect(requests.some((url) => { const params = new URL(url).searchParams; return params.get("from") === from && params.get("to") === "2026-10-04"; })).toBe(true));
  });
  it("no muestra el período fuera de «Más filtros» y resume lo activo en el disparador", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const user = userEvent.setup();
    expect(screen.queryByRole("button", { name: "Semana" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Período" })).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Más filtros" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Mes" }));
    await waitFor(() => expect(trigger).toHaveAccessibleDescription(/^Mes/));
    await user.click(screen.getByRole("button", { name: "Trimestre" }));
    await waitFor(() => expect(trigger).toHaveAccessibleDescription("Trimestre"));
  });

  it("permite elegir el período con el teclado", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const user = userEvent.setup();
    screen.getByRole("button", { name: "Más filtros" }).focus();
    await user.keyboard("{Enter}");
    const week = await screen.findByRole("button", { name: "Semana" });
    week.focus();
    await user.keyboard(" ");
    await waitFor(() => expect(new URLSearchParams(window.location.search).get("from")).toBe("2026-09-28"));
    expect(week).toHaveAttribute("aria-pressed", "true");
  });

  it("conserva los datos anteriores mientras carga y los reemplaza al recibir la respuesta", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Detalle por familia" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Cobertura" }));
    const card = screen.getByRole("region", { name: "Resumen de Cobertura" });
    await within(card).findByText("82,2 %");
    server.use(http.get("*/api/indicators/coverage", async () => {
      await delay(500);
      return HttpResponse.json({ ...coverageIndicatorFixture, totals: { ...coverageIndicatorFixture.totals, coveragePct: 42 } });
    }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Más filtros" }));
    await user.click(screen.getByRole("button", { name: "Semana" }));
    expect(within(card).getByText("82,2 %")).toBeVisible();
    expect(within(card).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Detalle de Cobertura" })).toHaveAttribute("aria-busy", "true");
    await waitFor(() => expect(card).toHaveTextContent("42"), { timeout: 3000 });
  });

  it("conserva los datos y ofrece reintentar si falla la actualización", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Detalle por familia" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Cobertura" }));
    const card = screen.getByRole("region", { name: "Resumen de Cobertura" });
    await within(card).findByText("82,2 %");
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({ message: "Error" }, { status: 503 })));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Más filtros" }));
    await user.click(screen.getByRole("button", { name: "Semana" }));
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(within(card).getByText("82,2 %")).toBeVisible();
    expect(within(card).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Detalle de Cobertura" })).toBeVisible();
  });

});
