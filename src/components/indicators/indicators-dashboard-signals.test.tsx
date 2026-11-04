import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
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
afterEach(() => { server.resetHandlers(); olvidarCatalogoDeEtiquetas(); window.history.replaceState(null, "", "/"); vi.useRealTimers(); });
afterAll(() => server.close());

async function signals() {
  render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
  const section = screen.getByRole("region", { name: "Requiere atención" });
  await waitFor(() => expect(section).toHaveAttribute("aria-busy", "false"));
  return section;
}

describe("Requiere atención", () => {
  it("muestra las tres señales con el valor real, la variación contra el período anterior y la meta", async () => {
    const section = await signals();

    const notServiced = within(section).getByRole("group", { name: "Servicios sin realizar" });
    expect(within(notServiced).getByText("24")).toBeVisible();
    expect(within(notServiced).getByText("4 más que antes")).toBeVisible();
    expect(within(notServiced).getAllByText(/meta 95 %/)[0]).toBeVisible();

    const late = within(section).getByRole("group", { name: "Servicios fuera de horario" });
    expect(within(late).getByText("46")).toBeVisible();
    expect(within(late).getByText("6 más que antes")).toBeVisible();
    expect(within(late).getAllByText(/meta 90 %/)[0]).toBeVisible();

    const overflow = within(section).getByRole("group", { name: "Contenedores desbordados" });
    expect(within(overflow).getByText("7")).toBeVisible();
    expect(within(overflow).getByText("2 menos que antes")).toBeVisible();
  });

  it("marca con color de alerta solo lo que empeora y lo dice en texto", async () => {
    const section = await signals();

    const late = within(section).getByRole("group", { name: "Servicios fuera de horario" });
    expect(within(late).getByText("6 más que antes")).toHaveClass("text-destructive");
    expect(late).toHaveAccessibleDescription(/empeora/);
    const overflow = within(section).getByRole("group", { name: "Contenedores desbordados" });
    expect(within(overflow).getByText("2 menos que antes")).not.toHaveClass("text-destructive");
  });

  it("cada tarjeta lleva a su lista ya filtrada", async () => {
    const section = await signals();
    const links = within(section).getAllByRole("link", { name: /^Ver / });
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs[0]).toContain("destination=services");
    expect(hrefs[0]).toContain("status=PARTIALLY_COMPLETED");
    expect(hrefs[1]).toBe("/app?destination=services&late=true&periodo=mes");
    expect(hrefs[2]).toBe("/app/catalog/containers?status=OVERFLOWED");
  });

  it("el período rápido recarga las señales y Más filtros esconde fechas, zona y tipo", async () => {
    const requests: string[] = [];
    server.use(http.get("*/api/indicators/coverage", ({ request }) => {
      requests.push(request.url);
      return HttpResponse.json(coverageIndicatorFixture);
    }));
    await signals();
    expect(screen.queryByLabelText("Familia")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Desde/ })).toBeNull();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Más filtros" }));
    expect(await screen.findByRole("button", { name: /^Desde/ })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Semana" }));
    await waitFor(() => expect(requests.some((url) => new URL(url).searchParams.get("from") === "2026-09-28")).toBe(true));
    expect(screen.getByRole("button", { name: "Semana" })).toHaveAttribute("aria-pressed", "true");
  });

  it("indica cuándo se actualizaron los datos", async () => {
    await signals();
    expect(await screen.findByText(/^Actualizado/)).toBeVisible();
  });
});

