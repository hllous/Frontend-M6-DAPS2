import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { GreenSpacesPanel } from "./green-spaces-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe("GreenSpacesPanel", () => {
  it("lists GreenSpaces and filters them by type and zone", async () => {
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Espacios verdes" })).toBeVisible();
    expect(screen.getByText("Parque del Bicentenario")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Tipo de espacio"), "PLANTER");
    expect(await screen.findByText("Cantero Central")).toBeVisible();
    expect(screen.queryByText("Parque del Bicentenario")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Zona"), "zone-2");
    expect(screen.getByText("Cantero Central")).toBeVisible();
  });

  it("allows Office to create, edit, and logically deactivate a GreenSpace", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", () => true);
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByText("Parque del Bicentenario");
    await user.click(screen.getByRole("button", { name: "Registrar espacio verde" }));
    const dialog = screen.getByRole("dialog");
    await user.type(screen.getByLabelText("Nombre"), "Plaza creada desde panel");
    await user.selectOptions(screen.getByLabelText("Tipo de espacio en el formulario"), "SQUARE");
    await user.type(screen.getByLabelText("Superficie (m²)"), "275");
    await user.selectOptions(screen.getByLabelText("Zona en el formulario"), "zone-1");
    await user.click(screen.getByRole("button", { name: "Guardar espacio verde" }));

    expect(await screen.findByText("Espacio verde registrado.")).toBeVisible();
    expect(dialog).not.toBeVisible();

    const createdRow = screen.getByRole("row", { name: /Plaza creada desde panel/ });
    await user.click(within(createdRow).getByRole("button", { name: "Editar" }));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Plaza editada desde panel");
    await user.click(screen.getByRole("button", { name: "Guardar espacio verde" }));
    expect(await screen.findByText("Espacio verde actualizado.")).toBeVisible();
    expect(screen.getByText("Plaza editada desde panel")).toBeVisible();

    const editedRow = screen.getByRole("row", { name: /Plaza editada desde panel/ });
    await user.click(within(editedRow).getByRole("button", { name: "Dar de baja" }));
    expect(await screen.findByText(/dado de baja/)).toBeVisible();
  }, 10_000);

  it("keeps management controls hidden for Field actors", async () => {
    render(<GreenSpacesPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("Parque del Bicentenario")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar espacio verde" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });

  it("renders a retryable error state", async () => {
    server.use(http.get("*/api/green-spaces", () => HttpResponse.json({ oops: true }, { status: 500 })));

    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText(/contrato documentado/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar carga" })).toBeVisible();
  });
});
