import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import type { OperationalScenario } from "@/lib/scenarios";
import { vehiclesAdapter } from "@/lib/vehicles";
import { VehicleCatalogPanel } from "./vehicle-catalog-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("VehicleCatalogPanel", () => {
  it("lists vehicles with filter controls and their operational status", async () => {
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Vehículos" })).toBeVisible();
    expect(screen.getByText("AA 123 AA")).toBeVisible();
    expect(screen.getByText("Inactivo")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Tipo de vehículo" })).toBeVisible();
    const row = await screen.findByRole("row", { name: /AA 123 AA/ });
    expect(row.querySelector('th[data-label="Patente"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).not.toBeNull();
  });

  it("shows capacity in tonnes with es-AR formatting", async () => {
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("columnheader", { name: "Capacidad (t)" })).toBeVisible();
    expect(screen.getByText("16 t")).toBeVisible();
    expect(screen.getByText("5 t")).toBeVisible();
  });

  it("uses the same select label in the form as in the filter and accepts decimal tonnes", async () => {
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("button", { name: "Registrar vehículo" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Tipo de vehículo")).toBeVisible();
    const capacity = dialog.getByLabelText("Capacidad (toneladas)");
    expect(capacity).toHaveAttribute("step", "0.01");

    await user.type(dialog.getByLabelText("Patente"), "AA 555 ZZ");
    await user.type(capacity, "10.5");
    await user.click(screen.getByRole("button", { name: "Guardar vehículo" }));

    expect(await screen.findByText("AA 555 ZZ")).toBeVisible();
    expect(screen.getByText("10,5 t")).toBeVisible();
  });

  it("associates vehicle validation errors with the invalid fields", async () => {
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("button", { name: "Registrar vehículo" }));
    const form = screen.getByRole("dialog").querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    const plate = screen.getByLabelText("Patente");
    const capacity = screen.getByLabelText("Capacidad (toneladas)");
    expect(plate).toHaveAttribute("aria-invalid", "true");
    expect(plate).toHaveAttribute("aria-describedby", "vehicle-plate-error");
    expect(capacity).toHaveAttribute("aria-invalid", "true");
    expect(capacity).toHaveAttribute("aria-describedby", "vehicle-capacity-error");
    expect(screen.getByText("Ingrese una patente.")).toBeVisible();
    expect(screen.getByText("Ingrese una capacidad mayor que cero.")).toBeVisible();
  });

  it("lets Office register a vehicle and refreshes the list", async () => {
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("button", { name: "Registrar vehículo" }));
    await user.type(screen.getByLabelText("Patente"), "AA 999 ZZ");
    await user.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Tipo de vehículo"), "VAN");
    await user.clear(screen.getByLabelText("Capacidad (toneladas)"));
    await user.type(screen.getByLabelText("Capacidad (toneladas)"), "5");
    await user.click(screen.getByRole("button", { name: "Guardar vehículo" }));

    expect(await screen.findByText("AA 999 ZZ")).toBeVisible();
  });

  it("does not show management actions when the hypothesis is absent", async () => {
    const limited: OperationalScenario = { ...scenarios.officeDutyQueue, capabilities: ["catalog:view"] };
    render(<VehicleCatalogPanel scenario={limited} />);

    expect(await screen.findByRole("heading", { name: "Vehículos" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar vehículo" })).not.toBeInTheDocument();
  });
});

it("requires a named confirmation before deactivating a vehicle", async () => {
  const vehicle = { id: "a358142e-a427-46b3-8b36-fb13091e023f", plate: "ZZ 999 ZZ", vehicleType: "VAN" as const, capacity: 10, active: true };
  const remove = vi.spyOn(vehiclesAdapter, "remove").mockResolvedValue({ ...vehicle, active: false });
  vi.spyOn(vehiclesAdapter, "list").mockResolvedValue({ vehicles: [vehicle], page: 1, pageSize: 20, total: 1, totalPages: 1 });
  const user = userEvent.setup();
  render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

  const row = await screen.findByRole("row", { name: /ZZ 999 ZZ/ });
  await user.click(within(row).getByRole("button", { name: "Dar de baja" }));

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("ZZ 999 ZZ");
  expect(within(dialog).getByRole("button", { name: /Conservar el vehículo ZZ 999 ZZ/ })).toBeVisible();
  expect(within(dialog).getByRole("button", { name: /Dar de baja el vehículo ZZ 999 ZZ/ })).toBeVisible();
  expect(remove).not.toHaveBeenCalled();

  await user.click(within(dialog).getByRole("button", { name: /Dar de baja el vehículo ZZ 999 ZZ/ }));
  await waitFor(() => expect(remove).toHaveBeenCalledWith(vehicle.id));
});


describe("Vehicle catalog pagination", () => {
  it("pages through backend results and resets the page when filtering", async () => {
    const list = vi.spyOn(vehiclesAdapter, "list").mockImplementation(async (query) => ({ vehicles: Array.from({ length: 20 }, (_, index) => ({ ...{ id: "a358142e-a427-46b3-8b36-fb13091e023f", plate: "ZZ 999 ZZ", vehicleType: "VAN" as const, capacity: 10, active: true }, id: `remote-${index}` })), page: query?.page ?? 1, pageSize: 20, total: 57, totalPages: 3 }));
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 20 })));
    expect(await screen.findByText("Mostrando 21–40 de 57")).toBeVisible();
    for (const [label, value] of [["Estado", "true"], ["Tipo de vehículo", "VAN"]]) {
      await user.selectOptions(screen.getByLabelText(label), value);
      await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
      expect(await screen.findByText("Mostrando 1–20 de 57")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Siguiente" }));
      await screen.findByText("Mostrando 21–40 de 57");
    }
  });
});


it("clamps the current page after its last active vehicle is deactivated", async () => {
  const vehicle = { id: "a358142e-a427-46b3-8b36-fb13091e023f", plate: "ZZ 999 ZZ", vehicleType: "VAN" as const, capacity: 10, active: true };
  let removed = false;
  vi.spyOn(vehiclesAdapter, "remove").mockImplementation(async () => { removed = true; return { ...vehicle, active: false }; });
  const list = vi.spyOn(vehiclesAdapter, "list").mockImplementation(async (query) => ({ vehicles: removed && query?.page === 3 ? [] : [vehicle], page: query?.page ?? 1, pageSize: 20, total: removed ? 40 : 41, totalPages: removed ? 2 : 3 }));
  const user = userEvent.setup();
  render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);
  await screen.findByText("ZZ 999 ZZ");
  await user.selectOptions(screen.getByLabelText("Estado"), "true");
  await user.click(await screen.findByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 2 de 3");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 3 de 3");
  await user.click(screen.getByRole("button", { name: "Dar de baja" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("ZZ 999 ZZ");
  await user.click(within(dialog).getByRole("button", { name: /Dar de baja el vehículo ZZ 999 ZZ/ }));
  expect(await screen.findByText("Página 2 de 2")).toBeVisible();
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, active: true })));
});
