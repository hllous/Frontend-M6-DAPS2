import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const nav = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => nav.current }));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-04T15:00:00Z")); });
afterEach(() => { server.resetHandlers(); nav.current = new URLSearchParams(); window.history.replaceState(null, "", "/"); vi.useRealTimers(); });
afterAll(() => server.close());

describe("Tableros B: ajustes de la revisión del PO", () => {
  it("el disparador dice «Más filtros - <resumen>» y, sin resumen, solo «Más filtros»", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const trigger = screen.getByRole("button", { name: /^Más filtros/ });
    await waitFor(() => expect(trigger).toHaveAccessibleName("Más filtros - Mes"));
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Trimestre" }));
    await waitFor(() => expect(trigger).toHaveAccessibleName("Más filtros - Trimestre"));
  });

  it("cada panel tiene un único botón Gráfico/Tabla que alterna y expone aria-pressed", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const zones = await screen.findByRole("region", { name: "¿Dónde se concentra?" });
    expect(within(zones).queryByRole("group", { name: "Vista de zonas" })).not.toBeInTheDocument();
    expect(within(zones).queryByRole("button", { name: "Ver gráfico" })).not.toBeInTheDocument();
    const toTable = within(zones).getByRole("button", { name: "Ver tabla" });
    expect(toTable).toHaveAttribute("aria-pressed", "false");
    await user.click(toTable);
    expect(within(zones).getByRole("table")).toBeVisible();
    const toChart = within(zones).getByRole("button", { name: "Ver gráfico" });
    expect(toChart).toHaveAttribute("aria-pressed", "true");
    expect(within(zones).queryByRole("button", { name: "Ver tabla" })).not.toBeInTheDocument();
    await user.click(toChart);
    expect(within(zones).getByRole("button", { name: "Ver tabla" })).toHaveAttribute("aria-pressed", "false");
  });

  it("el selector de zonas dice «Objetivos sin atención» y «Contenedores desbordados»", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const zones = await screen.findByRole("region", { name: "¿Dónde se concentra?" });
    expect(await within(zones).findByRole("button", { name: "Objetivos sin atención" })).toBeVisible();
    expect(within(zones).getByRole("button", { name: "Contenedores desbordados" })).toBeVisible();
    expect(within(zones).queryByRole("button", { name: /por zona|ahora/ })).not.toBeInTheDocument();
  });

  it("el encabezado de cada detalle de familia lleva el ícono del menú", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    for (const family of ["Cobertura", "Cumplimiento", "Incidencias", "Residuos"]) {
      await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
      const item = await screen.findByRole("menuitem", { name: family });
      const menuIcon = item.querySelector("svg")!.getAttribute("class");
      await user.click(item);
      const heading = await screen.findByRole("heading", { name: `Detalle de ${family}` });
      const headerIcon = heading.querySelector("svg");
      expect(headerIcon).not.toBeNull();
      expect(headerIcon).toHaveAttribute("aria-hidden", "true");
      expect(headerIcon!.getAttribute("class")).toContain(menuIcon!.split(" ").find((name) => name.startsWith("lucide-") && name !== "lucide")!);
      await user.click(screen.getByRole("button", { name: "Volver a Tableros" }));
    }
  });

  it("«Tableros» de la barra lateral cierra el detalle y conserva el período", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await user.click(screen.getByRole("button", { name: /^Más filtros/ }));
    await user.click(screen.getByRole("button", { name: "Semana" }));
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(await screen.findByRole("menuitem", { name: "Cobertura" }));
    expect(await screen.findByRole("heading", { name: "Detalle de Cobertura" })).toBeVisible();
    const from = new URLSearchParams(window.location.search).get("from");
    // La barra lateral navega a /app?destination=dashboards sin parámetros de familia.
    window.history.pushState(null, "", "/?destination=dashboards");
    nav.current = new URLSearchParams("destination=dashboards");
    rerender(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Detalle de Cobertura" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Detalle por familia" })).toBeVisible();
    await waitFor(() => expect(new URLSearchParams(window.location.search).get("from")).toBe(from));
    expect(screen.getByRole("button", { name: /^Más filtros - Semana/ })).toBeVisible();
  });
});
