import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

let currentSearch = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(currentSearch) }));

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  olvidarCatalogoDeEtiquetas();
  currentSearch = "";
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("IndicatorsDashboard: estado en la URL y filtros no aplicables (#334)", () => {
  it("restaura familia, período, filtros y vista desde la URL y avisa qué filtros no aplican", async () => {
    currentSearch = "family=incidents&from=2026-09-01&to=2026-09-15&zoneId=z1&serviceTypeId=s1&view=table";
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await screen.findByRole("heading", { name: "Detalle de Incidencias" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Más filtros" }));
    expect(screen.getByRole("button", { name: /^Desde/ })).toHaveTextContent("01/09/2026");
    expect(screen.getByRole("button", { name: /^Hasta/ })).toHaveTextContent("15/09/2026");
    expect(screen.getByRole("button", { name: "Ver tabla" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Filtros sin efecto en Incidencias: Zona y Tipo de servicio/)).toBeVisible();
  });

  it("no avisa en coverage y escribe familia y vista en la URL conservando destination", async () => {
    window.history.replaceState(null, "", "/app?destination=dashboards");
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("button", { name: "Detalle por familia" });
    expect(screen.queryByText(/Filtros sin efecto/)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Detalle por familia" }));
    await user.click(await screen.findByRole("menuitem", { name: "Residuos" }));
    await user.click(screen.getByRole("button", { name: "Ver tabla" }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("destination")).toBe("dashboards");
    expect(params.get("family")).toBe("waste");
    expect(params.get("view")).toBe("table");
  });
});

it("restaura un enlace anterior de detalle de familia", async () => {
  currentSearch = "family=waste&from=2026-09-01&to=2026-09-15&view=table";
  render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
  expect(await screen.findByRole("heading", { name: "Detalle de Residuos" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Volver a Tableros" })).toBeVisible();
});
