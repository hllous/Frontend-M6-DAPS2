import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import type { OperationalScenario } from "@/lib/scenarios";
import { VehicleCatalogPanel } from "./vehicle-catalog-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("VehicleCatalogPanel", () => {
  it("lists vehicles with filter controls and their operational status", async () => {
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Vehículos" })).toBeVisible();
    expect(screen.getByText("AA 123 AA")).toBeVisible();
    expect(screen.getByText("Inactivo")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Tipo de vehículo" })).toBeVisible();
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
