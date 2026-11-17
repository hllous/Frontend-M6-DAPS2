import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { GreenPointCatalogPanel } from "./green-point-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

const apiError = (status: number, message: string, path: string) =>
  HttpResponse.json({ statusCode: status, error: "Error", message, timestamp: new Date().toISOString(), path }, { status });

async function openDetail(user: ReturnType<typeof userEvent.setup>) {
  const row = await screen.findByRole("row", { name: /GP-001/ });
  await user.click(within(row).getByRole("button", { name: /^Ver detalle de / }));
  return screen.getByRole("dialog");
}

describe("GreenPointCatalogPanel: fallas", () => {
  it("muestra el mensaje del backend cuando falla el detalle", async () => {
    server.use(http.get("*/api/green-points/:id", () => apiError(500, "Detalle no disponible.", "/api/green-points/green-point-1")));
    const user = userEvent.setup();
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /GP-001/ });
    await user.click(within(row).getByRole("button", { name: /^Ver detalle de / }));

    expect(await screen.findByText("Detalle no disponible.")).toBeVisible();
  });

  it("mantiene abierto el formulario y muestra el rechazo del backend al guardar", async () => {
    server.use(http.patch("*/api/green-points/:id", () => apiError(409, "El punto verde fue modificado por otra persona.", "/api/green-points/green-point-1")));
    const user = userEvent.setup();
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const detail = await openDetail(user);
    await user.click(within(detail).getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox", { name: "Domiciliarios" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar punto verde" }));

    expect(await within(dialog).findByText("El punto verde fue modificado por otra persona.")).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("mantiene abierta la confirmación y muestra el rechazo al dar de baja", async () => {
    server.use(http.delete("*/api/green-points/:id", () => apiError(409, "Tiene servicios activos.", "/api/green-points/green-point-1")));
    const user = userEvent.setup();
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const detail = await openDetail(user);
    await user.click(within(detail).getByRole("button", { name: "Dar de baja" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Dar de baja el punto verde GP-001/ }));

    expect(await screen.findByText("Tiene servicios activos.")).toBeVisible();
    expect(screen.queryByText(/Punto verde dado de baja/)).not.toBeInTheDocument();
  });

  it("marca y desmarca un tipo de residuo en el alta", async () => {
    const user = userEvent.setup();
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Puntos verdes" });
    await user.click(screen.getByRole("button", { name: "Registrar punto verde" }));
    const dialog = screen.getByRole("dialog");

    const waste = within(dialog).getByRole("checkbox", { name: "Domiciliarios" });
    await user.click(waste);
    expect(waste).toBeChecked();
    await user.click(waste);
    expect(waste).not.toBeChecked();
  });
});
