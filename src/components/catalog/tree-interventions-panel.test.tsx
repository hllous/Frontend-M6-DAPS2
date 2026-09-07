import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { scenarios } from "@/lib/scenarios";
import { TreeInterventionsPanel } from "./tree-interventions-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetTreeInterventionFixtures());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("TreeInterventionsPanel", () => {
  it("lists requests, filters by status and shows every linked tree in detail", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    expect(within(request).getByText("Solicitada")).toBeVisible();
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));

    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    expect(await within(detail).findByText(/ARB-00443/)).toBeVisible();
    expect(await within(detail).findByText(/ARB-00445/)).toBeVisible();
    expect(within(detail).queryByRole("button", { name: /autorizar|rechazar|programar/i })).not.toBeInTheDocument();

    await within(detail).getByRole("button", { name: "Cerrar detalle" }).click();
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "AUTHORIZED");
    expect(await screen.findByRole("article", { name: /intervention-2|Tratamiento/i })).toBeVisible();
    expect(screen.queryByRole("article", { name: /intervention-1|Poda de seguridad/i })).not.toBeInTheDocument();
  });

  it("creates a multi-tree request and enforces justification for removal", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Intervenciones de arbolado" });
    await screen.getByRole("button", { name: "Solicitar intervención" }).click();
    const dialog = screen.getByRole("dialog", { name: /Solicitar intervención/ });
    await user.selectOptions(within(dialog).getByLabelText(/^Árboles a intervenir/), ["tree-2", "tree-4"]);
    await user.selectOptions(within(dialog).getByLabelText(/^Tipo de intervención/), "REMOVAL");
    await user.type(within(dialog).getByLabelText(/^Dirección/), "Paseo de la Costa 220");
    await within(dialog).getByRole("button", { name: "Crear solicitud de intervención" }).click();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("justificación");

    await user.type(within(dialog).getByLabelText(/^Justificación/), "El tronco presenta inestabilidad crítica.");
    await within(dialog).getByRole("button", { name: "Crear solicitud de intervención" }).click();
    expect(await screen.findByText("Solicitud de intervención creada. Estado inicial: solicitada.")).toBeVisible();
  });

  it("keeps the request action out of read-only sessions", async () => {
    render(<TreeInterventionsPanel scenario={scenarios.officeLimited} />);
    expect(await screen.findByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Solicitar intervención" })).not.toBeInTheDocument();
    expect(screen.getByText(/puede consultar las solicitudes/i)).toBeVisible();
  });
});
