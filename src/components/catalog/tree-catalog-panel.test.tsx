import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetTreeFixtures } from "@/lib/tree-fixtures";
import { scenarios } from "@/lib/scenarios";
import { TreeCatalogPanel } from "./tree-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetTreeFixtures());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("TreeCatalogPanel", () => {
  it("lists trees for any authenticated actor and opens detail without management actions", async () => {
    render(<TreeCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Árboles" })).toBeVisible();
    expect(await screen.findByRole("row", { name: /ARB-00442/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Ver detalle" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Registrar árbol" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
  });

  it("lets Office edit mutable measurements and deactivate logically while keeping survey code immutable", async () => {
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /ARB-00442/ });
    await within(row).getByRole("button", { name: "Editar" }).click();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Código de relevamiento")).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Altura (m)"), { target: { value: "15" } });
    await within(dialog).getByRole("button", { name: "Guardar árbol" }).click();
    expect(await screen.findByText("Árbol actualizado con éxito.")).toBeVisible();
    const refreshedRow = await screen.findByRole("row", { name: /ARB-00442/ });
    await within(refreshedRow).getByRole("button", { name: "Dar de baja" }).click();
    expect(await screen.findByText(/Árbol dado de baja/)).toBeVisible();
  });
});
