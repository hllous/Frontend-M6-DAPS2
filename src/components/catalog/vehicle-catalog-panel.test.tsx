import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("lets Office register a vehicle and refreshes the list", async () => {
    const user = userEvent.setup();
    render(<VehicleCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await user.click(await screen.findByRole("button", { name: "Registrar vehículo" }));
    await user.type(screen.getByLabelText("Patente"), "AA 999 ZZ");
    await user.selectOptions(screen.getByLabelText("Tipo de vehículo para el registro"), "VAN");
    await user.clear(screen.getByLabelText("Capacidad"));
    await user.type(screen.getByLabelText("Capacidad"), "5");
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
