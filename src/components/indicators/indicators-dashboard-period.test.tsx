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
  it.each([["Última semana", "2026-09-28", "28/09/2026"], ["Último mes", "2026-09-05", "05/09/2026"], ["Último trimestre", "2026-07-07", "07/07/2026"]])("aplica %s y conserva el período en la URL", async (label, from, display) => {
    const requests: string[] = [];
    server.events.on("request:start", ({ request }) => { if (request.url.includes("/api/indicators/coverage")) requests.push(request.url); });
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Actualizar" })).toBeEnabled());
    await userEvent.setup().click(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(new URLSearchParams(window.location.search).get("from")).toBe(from));
    expect(new URLSearchParams(window.location.search).get("to")).toBe("2026-10-04");
    expect(screen.getByRole("button", { name: /^Desde/ })).toHaveTextContent(display);
    expect(screen.getByRole("button", { name: /^Hasta/ })).toHaveTextContent("04/10/2026");
    await waitFor(() => expect(requests.some((url) => { const params = new URL(url).searchParams; return params.get("from") === from && params.get("to") === "2026-10-04"; })).toBe(true));
  });
  it("conserva los datos anteriores mientras carga y los reemplaza al recibir la respuesta", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const band = screen.getByRole("region", { name: "Familias" });
    await waitFor(() => expect(band).toHaveAttribute("aria-busy", "false"));
    const card = within(band).getByRole("button", { name: /Cobertura: seleccionar familia/ });
    server.use(http.get("*/api/indicators/coverage", async () => {
      await delay(500);
      return HttpResponse.json({ ...coverageIndicatorFixture, totals: { ...coverageIndicatorFixture.totals, coveragePct: 42 } });
    }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Última semana" }));
    expect(band).toHaveAttribute("aria-busy", "true");
    expect(within(card).getByText("82,2 %")).toBeVisible();
    expect(within(card).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Detalle de Cobertura" })).toHaveAttribute("aria-busy", "true");
    await waitFor(() => expect(card).toHaveTextContent("42"), { timeout: 3000 });
    expect(band).toHaveAttribute("aria-busy", "false");
  });

  it("conserva los datos y ofrece reintentar si falla la actualización", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const band = screen.getByRole("region", { name: "Familias" });
    await waitFor(() => expect(band).toHaveAttribute("aria-busy", "false"));
    const card = within(band).getByRole("button", { name: /Cobertura: seleccionar familia/ });
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({ message: "Error" }, { status: 503 })));
    await userEvent.setup().click(screen.getByRole("button", { name: "Última semana" }));
    expect(await within(band).findByRole("button", { name: "Reintentar Cobertura" })).toBeVisible();
    expect(within(card).getByText("82,2 %")).toBeVisible();
    expect(within(card).queryByText(/Cumple la meta|Bajo la meta|Sobre la meta/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Detalle de Cobertura" })).toBeVisible();
  });

});
