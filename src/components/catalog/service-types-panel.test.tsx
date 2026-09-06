import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { ServiceTypesPanel } from "./service-types-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ServiceTypesPanel", () => {
  it("lists fixtures, filters them, and keeps locked fields read-only in the edit form", async () => {
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Tipos de servicio" })).toBeVisible();
    expect(screen.getByText("WASTE-ROUTE")).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect(screen.getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Modo" })).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Nombre" })).not.toHaveAttribute("readonly");
  });

  it("does not expose management actions to a Field actor", async () => {
    render(<ServiceTypesPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Tipos de servicio" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nuevo tipo de servicio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.getByText(/puede consultar el catálogo/i)).toBeVisible();
  });
});
