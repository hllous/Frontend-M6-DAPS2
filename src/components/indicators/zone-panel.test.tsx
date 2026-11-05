import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { coverageIndicatorFixture } from "@/lib/indicator-fixtures";
import { scenarios } from "@/lib/scenarios";
import { handlers } from "@/mocks/handlers";
import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); window.history.replaceState(null, "", "/"); });
afterAll(() => server.close());

describe("Dónde se concentra", () => {
  it("cambia entre medidas reales y muestra los mismos datos en tabla", async () => {
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const panel = await screen.findByRole("region", { name: "¿Dónde se concentra?" });
    expect(await within(panel).findByText("Norte tiene 10 de los 24 objetivos sin atención.")).toBeVisible();
    expect(within(panel).queryByText("Servicios fuera de horario")).toBeNull();
    const user = userEvent.setup();
    await user.click(within(panel).getByRole("button", { name: "Contenedores desbordados ahora, por zona" }));
    expect(within(panel).getByText("Centro tiene 6 de los 14 contenedores desbordados ahora.")).toBeVisible();
    await user.click(within(panel).getByRole("button", { name: "Tabla" }));
    const table = within(panel).getByRole("table");
    expect(within(table).getByRole("row", { name: /Centro.*6/ })).toBeVisible();
    expect(within(table).queryByText(/Prioritario/)).toBeNull();
    await user.click(within(panel).getByRole("button", { name: "Objetivos sin atención por zona" }));
    expect(within(table).getByRole("row", { name: /Norte.*Prioritario.*10/ })).toBeVisible();
  });
  it("explica cuando todas las zonas tienen cero casos", async () => {
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json({ ...coverageIndicatorFixture, byZone: coverageIndicatorFixture.byZone.map((row) => ({ ...row, notServiced: 0 })) })));
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    const panel = await screen.findByRole("region", { name: "¿Dónde se concentra?" });
    expect(await within(panel).findByText("No hay objetivos sin atención en ninguna zona." )).toBeVisible();
  });
});
