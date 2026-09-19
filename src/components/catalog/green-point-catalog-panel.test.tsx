import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { GreenPointCatalogPanel } from "./green-point-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("GreenPointCatalogPanel", () => {
  it("lists points for any authenticated actor and opens the detail without lifecycle actions", async () => {
    render(<GreenPointCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Puntos verdes" })).toBeVisible();
    expect(await screen.findByRole("row", { name: /GP-001/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Ver detalle" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Registrar punto verde" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dar de baja/i })).not.toBeInTheDocument();
  });

  it("lets Office edit the complete accepted-waste set and deactivate logically", async () => {
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("row", { name: /GP-001/ })).toBeVisible();
    const row = screen.getByRole("row", { name: /GP-001/ });
    await within(row).getByRole("button", { name: "Editar" }).click();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("conjunto completo");
    await within(dialog).getByLabelText("Domiciliarios").click();
    await within(dialog).getByRole("button", { name: "Guardar punto verde" }).click();
    expect(await screen.findByText("Punto verde actualizado con éxito.")).toBeVisible();

    const refreshedRow = await screen.findByRole("row", { name: /GP-001/ });
    await within(refreshedRow).getByRole("button", { name: "Dar de baja" }).click();
    expect(await screen.findByText(/Punto verde dado de baja/)).toBeVisible();
  });
});
