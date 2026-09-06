import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { CrewCatalogPanel } from "./crew-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("CrewCatalogPanel", () => {
  it("lists identity-backed crew references and operational status", async () => {
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("heading", { name: "Cuadrillas" })).toBeVisible();
    expect(screen.getByText("Cuadrilla A · López")).toBeVisible();
    expect(screen.getByText("Carlos López")).toBeVisible();
    expect(screen.getAllByText("Municipalidad").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Turno" })).toBeVisible();
  });

  it("scopes Field views and hides management controls", async () => {
    render(<CrewCatalogPanel scenario={scenarios.fieldCrewMember} />);
    expect(await screen.findByText("Cuadrilla B · Fernández")).toBeVisible();
    expect(screen.queryByText("Cuadrilla A · López")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar cuadrilla" })).not.toBeInTheDocument();
  });

  it("lets Office manage resolved M1 members without exposing editable ids", async () => {
    const user = userEvent.setup();
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Cuadrilla E - Membresia/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle" }));

    const dialog = await screen.findByRole("dialog");
    const members = within(dialog).getByRole("list", { name: "Integrantes de la cuadrilla" });
    expect(within(members).getByText("Ana Morales")).toBeVisible();
    expect(within(dialog).queryByText("user-ana")).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByRole("listbox", { name: "Agregar integrantes (M1)" }), "user-pedro");
    await user.click(within(dialog).getByRole("button", { name: "Agregar integrantes" }));
    expect(await within(members).findByText("Pedro Ruiz")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Quitar a Pedro Ruiz" }));
    expect(within(members).queryByText("Pedro Ruiz")).not.toBeInTheDocument();
  });
});
