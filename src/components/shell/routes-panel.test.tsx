import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { handlers } from "@/mocks/handlers";
import { routeFixtures } from "@/lib/routes-fixtures";
import { RoutesPanel } from "./routes-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const apiError = (status: number) =>
  HttpResponse.json({ statusCode: status, error: "Error", message: "x", timestamp: new Date().toISOString(), path: "/api/routes" }, { status });
const emptyPage = () => HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });

describe("RoutesPanel", () => {
  it("lista los recorridos con su cantidad de paradas", async () => {
    render(<RoutesPanel />);

    expect(await screen.findByRole("heading", { name: "Recorridos" })).toBeVisible();
    const first = routeFixtures[0]!;
    expect(screen.getByText(first.code)).toBeVisible();
    expect(screen.getAllByText(/\(\d+ paradas?\)/).length).toBeGreaterThan(0);
  });

  it("muestra el estado vacío cuando no hay recorridos", async () => {
    server.use(http.get("*/api/routes", emptyPage));
    render(<RoutesPanel />);

    expect(await screen.findByText("Sin recorridos")).toBeVisible();
  });

  it("pide iniciar sesión ante un 401", async () => {
    server.use(http.get("*/api/routes", () => apiError(401)));
    render(<RoutesPanel />);

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
  });

  it("informa acceso no disponible ante un 403", async () => {
    server.use(http.get("*/api/routes", () => apiError(403)));
    render(<RoutesPanel />);

    expect(await screen.findByText("Acceso no disponible")).toBeVisible();
  });

  it("ofrece reintentar tras un error y recupera la lista", async () => {
    let calls = 0;
    server.use(http.get("*/api/routes", () => {
      calls += 1;
      return calls === 1 ? apiError(500) : undefined;
    }));
    const user = userEvent.setup();
    render(<RoutesPanel />);

    expect(await screen.findByText("No se pudieron cargar los recorridos")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reintentar carga" }));

    expect(await screen.findByRole("heading", { name: "Recorridos" })).toBeVisible();
    expect(calls).toBe(2);
  });
});
