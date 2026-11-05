import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { IndicatorsDashboard } from "./indicators-dashboard";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); window.history.replaceState(null, "", "/"); });
afterAll(() => server.close());

it("abre el detalle de cada familia y vuelve al tablero", async () => {
  render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
  expect(screen.queryByText("Resumen del período")).not.toBeInTheDocument();
  const user = userEvent.setup();
  for (const family of ["Cobertura", "Cumplimiento", "Incidencias", "Residuos"]) {
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(screen.getByRole("menuitem", { name: family }));
    expect(await screen.findByRole("heading", { name: `Detalle de ${family}` })).toBeVisible();
    expect(screen.queryByText("Registros")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Volver a Tableros" }));
  }
});

it("devuelve el foco al control de origen y conserva el período", async () => {
  render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Más filtros" }));
  await user.click(screen.getByRole("button", { name: "Semana" }));
  const before = new URLSearchParams(window.location.search).get("from");
  const trigger = screen.getByRole("button", { name: "Cobertura" });
  await user.click(trigger);
  expect(screen.getByRole("heading", { name: "Detalle de Cobertura" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Volver a Tableros" }));
  await screen.findByRole("button", { name: "Cobertura" });
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(screen.getByRole("button", { name: "Cobertura" })).toHaveFocus();
  expect(new URLSearchParams(window.location.search).get("from")).toBe(before);
});
