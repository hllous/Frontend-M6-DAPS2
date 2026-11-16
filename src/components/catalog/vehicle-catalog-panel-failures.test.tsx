import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { VehicleCatalogPanel } from "./vehicle-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

const apiError = (status: number, message: string) =>
  HttpResponse.json({ statusCode: status, error: "Error", message, timestamp: new Date().toISOString(), path: "/api/vehicles" }, { status });

describe("VehicleCatalogPanel: fallas y límites", () => {
  it("rechaza una capacidad que supera el máximo permitido sin llamar al backend", async () => {
    let posts = 0;
    server.use(http.post("*/api/vehicles", () => { posts += 1; return HttpResponse.json({}); }));
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("button", { name: "Registrar vehículo" }));
    await user.type(screen.getByLabelText("Patente"), "AA 999 ZZ");
    await user.clear(screen.getByLabelText("Capacidad (toneladas)"));
    await user.type(screen.getByLabelText("Capacidad (toneladas)"), "100000000");
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(await screen.findByText(/La capacidad no puede superar/)).toBeVisible();
    expect(posts).toBe(0);
  });

  it("muestra el rechazo del backend al registrar y mantiene abierto el formulario", async () => {
    server.use(http.post("*/api/vehicles", () => apiError(409, "Ya existe un vehículo con esa patente.")));
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("button", { name: "Registrar vehículo" }));
    await user.type(screen.getByLabelText("Patente"), "AA 123 AA");
    await user.clear(screen.getByLabelText("Capacidad (toneladas)"));
    await user.type(screen.getByLabelText("Capacidad (toneladas)"), "5");
    await user.click(screen.getByRole("button", { name: "Guardar vehículo" }));

    expect(await screen.findByText("Ya existe un vehículo con esa patente.")).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("edita un vehículo con los datos cargados y muestra el rechazo del backend", async () => {
    server.use(http.patch("*/api/vehicles/:id", () => apiError(409, "El vehículo cambió.")));
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /AA 123 AA/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle del vehículo AA 123 AA" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de vehículo" });
    await user.click(within(sheet).getByRole("button", { name: "Editar" }));

    const plate = await screen.findByLabelText("Patente");
    expect(plate).toHaveValue("AA 123 AA");
    await user.click(screen.getByRole("button", { name: "Guardar vehículo" }));

    expect(await screen.findByText("El vehículo cambió.")).toBeVisible();
  });

  it("muestra el rechazo del backend al dar de baja y no confirma la baja", async () => {
    server.use(http.delete("*/api/vehicles/:id", () => apiError(409, "El vehículo tiene servicios asignados.")));
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /AA 123 AA/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle del vehículo AA 123 AA" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle de vehículo" });
    await user.click(within(sheet).getByRole("button", { name: "Dar de baja" }));
    const confirmation = screen.getByRole("dialog");
    await user.click(within(confirmation).getByRole("button", { name: /Dar de baja/ }));

    expect(await screen.findByText("El vehículo tiene servicios asignados.")).toBeVisible();
    expect(screen.queryByText(/dado de baja\./)).not.toBeInTheDocument();
  });
});
