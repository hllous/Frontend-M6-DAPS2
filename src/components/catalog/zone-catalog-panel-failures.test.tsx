import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetZoneFixtures } from "@/lib/zones-fixtures";
import { ZoneCatalogPanel } from "./zone-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetZoneFixtures();
});
afterAll(() => server.close());

describe("ZoneCatalogPanel: fallas de red", () => {
  it("muestra un mensaje genérico y deja abierto el alta cuando la red falla", async () => {
    server.use(http.post("*/api/zones", () => HttpResponse.error()));
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await waitFor(() => expect(screen.getAllByText("Belgrano")[0]).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /nueva zona/i }));
    await user.type(screen.getByLabelText("Código"), "Z-99");
    await user.type(screen.getByLabelText("Nombre"), "Zona de prueba");
    await user.click(screen.getByRole("button", { name: "Crear zona" }));

    expect(await screen.findByText("No se pudo crear la zona. Intente nuevamente.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Nueva zona operativa" })).toBeVisible();
  });

  it("muestra un mensaje genérico y deja abierta la edición cuando la red falla", async () => {
    server.use(http.patch("*/api/zones/:id", () => HttpResponse.error()));
    const user = userEvent.setup({ delay: null });
    render(<ZoneCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await waitFor(() => expect(screen.getAllByText("Belgrano")[0]).toBeInTheDocument());

    const row = screen.getAllByText("Belgrano")[0]!.closest("tr")!;
    await user.click(within(row).getByRole("button", { name: /editar/i }));
    const name = screen.getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Belgrano renombrada");
    await user.click(screen.getByRole("button", { name: /Guardar/ }));

    expect(await screen.findByText("No se pudo actualizar la zona. Intente nuevamente.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Editar zona operativa" })).toBeVisible();
  });
});
