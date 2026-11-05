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
    await user.click(within(screen.getByRole("navigation", { name: "Detalle por familia" })).getByRole("button", { name: family }));
    expect(await screen.findByRole("heading", { name: `Detalle de ${family}` })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Volver a Tableros" }));
  }
});
