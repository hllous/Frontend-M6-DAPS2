import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { olvidarCatalogoDeEtiquetas } from "@/lib/service-labels";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  olvidarCatalogoDeEtiquetas();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("IndicatorsDashboard: botón Atrás y Adelante del navegador", () => {
  it("cierra el detalle y vuelve a abrirlo con la familia y la vista que dice la URL", async () => {
    window.history.replaceState(null, "", "/app?destination=dashboards&family=waste&view=table");
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("heading", { name: "Detalle de Residuos" })).toBeVisible();

    act(() => {
      window.history.replaceState(null, "", "/app?destination=dashboards");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Detalle de Residuos" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Detalle por familia" })).toBeVisible();

    act(() => {
      window.history.replaceState(null, "", "/app?destination=dashboards&family=incidents&view=table");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findByRole("heading", { name: "Detalle de Incidencias" })).toBeVisible();
    expect(new URLSearchParams(window.location.search).get("family")).toBe("incidents");
  });
});
