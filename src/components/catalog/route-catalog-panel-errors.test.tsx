import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetRouteFixtures } from "@/lib/routes-fixtures";
import { resetZoneFixtures } from "@/lib/zones-fixtures";
import { RouteCatalogPanel } from "./route-catalog-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRouteFixtures();
  resetZoneFixtures();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const error = (status: number, message: string, path: string) =>
  HttpResponse.json({ statusCode: status, error: "Error", message, timestamp: new Date().toISOString(), path }, { status });

async function openStopBuilder(user: ReturnType<typeof userEvent.setup>) {
  render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);
  await screen.findByText("REC-001");
  await user.click(screen.getByTestId("view-route-route-1"));
  await user.click(screen.getByTestId("edit-stops-button"));
  await screen.findByTestId("stop-sequence-builder");
}

describe("RouteCatalogPanel: errores y validaciones", () => {
  it("muestra el mensaje del backend cuando no se pueden cargar los recorridos", async () => {
    server.use(http.get("*/api/routes", () => error(503, "Recorridos no disponibles.", "/api/routes")));
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("Recorridos no disponibles.")).toBeVisible();
    expect(screen.queryByTestId("routes-table")).not.toBeInTheDocument();
  });

  it("exige código y nombre al crear un recorrido", async () => {
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByText("REC-001");

    await user.click(screen.getByTestId("create-route-button"));
    await user.click(screen.getByTestId("submit-create-route"));

    expect(screen.getByTestId("create-route-code-input")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("create-route-name-input")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("El código es obligatorio.")).toBeVisible();
    expect(screen.getByText("El nombre es obligatorio.")).toBeVisible();
  });

  it("muestra el error del backend al guardar la edición y deja el diálogo abierto", async () => {
    server.use(http.patch("*/api/routes/:id", () => error(409, "El recorrido cambió mientras lo editaba.", "/api/routes/route-1")));
    const user = userEvent.setup();
    render(<RouteCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByText("REC-001");

    await user.click(screen.getByTestId("edit-route-route-1"));
    const name = screen.getByTestId("edit-route-name-input");
    await user.clear(name);
    await user.type(name, "Nombre nuevo");
    await user.click(screen.getByTestId("submit-edit-route"));

    expect(await screen.findByText("El recorrido cambió mientras lo editaba.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Editar recorrido" })).toBeVisible();
  });

  it("pide elegir una zona antes de agregar una parada", async () => {
    const user = userEvent.setup();
    await openStopBuilder(user);

    await user.click(screen.getByTestId("add-stop-button"));

    expect(screen.getByTestId("stop-editor-error")).toHaveTextContent("Seleccione una zona.");
  });

  it("rechaza una duración fuera de rango al agregar una parada", async () => {
    const user = userEvent.setup();
    await openStopBuilder(user);

    await user.click(screen.getByRole("combobox", { name: "Zona operativa" }));
    await user.click(await screen.findByRole("option", { name: /^Recoleta$/ }));
    const duration = screen.getByTestId("stop-duration-input");
    await user.clear(duration);
    await user.type(duration, "2000");
    await user.click(screen.getByTestId("add-stop-button"));

    expect(screen.getByTestId("stop-editor-error")).toHaveTextContent("La duración debe ser de 1 a 1440 minutos.");
    expect(screen.queryByTestId("stop-item-2")).not.toBeInTheDocument();
  });

  it("no guarda la secuencia si una parada quedó con duración inválida", async () => {
    let puts = 0;
    server.use(http.put("*/api/routes/:id/stops", () => { puts += 1; return HttpResponse.json({}); }));
    const user = userEvent.setup();
    await openStopBuilder(user);

    const first = screen.getByTestId("stop-duration-input-0");
    await user.clear(first);
    await user.type(first, "0");
    await user.click(screen.getByTestId("save-sequence-button"));

    await waitFor(() => expect(screen.getByTestId("stop-editor-error")).toHaveTextContent("La duración debe ser de 1 a 1440 minutos."));
    expect(puts).toBe(0);
  });

  it("deshabilita mover la primera parada hacia arriba y la última hacia abajo", async () => {
    const user = userEvent.setup();
    await openStopBuilder(user);

    expect(screen.getByTestId("stop-move-up-0")).toBeDisabled();
    expect(screen.getByTestId("stop-move-down-1")).toBeDisabled();
    expect(screen.getByTestId("stop-move-down-0")).toBeEnabled();
    expect(screen.getByTestId("stop-move-up-1")).toBeEnabled();
  });
});
