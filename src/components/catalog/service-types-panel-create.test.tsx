import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { serviceTypesAdapter, type ServiceType } from "@/lib/service-types";
import { ServiceTypesPanel } from "./service-types-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

async function fillCreateForm(user: ReturnType<typeof userEvent.setup>) {
  render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);
  await user.click(await screen.findByRole("button", { name: "Nuevo tipo de servicio" }));
  const dialog = await screen.findByRole("dialog", { name: "Alta de tipo de servicio" });
  await user.type(within(dialog).getByLabelText("Código"), "PODA-TEST");
  await user.type(within(dialog).getByLabelText("Nombre"), "Poda de prueba");
  await user.click(within(dialog).getByRole("combobox", { name: "Categoría" }));
  await user.click(await screen.findByRole("option", { name: "Arbolado" }));
  await user.click(within(dialog).getByRole("combobox", { name: "Modo" }));
  await user.click(await screen.findByRole("option", { name: "Punto" }));
  await user.click(within(dialog).getByRole("checkbox", { name: "Requiere vehículo" }));
  return dialog;
}

describe("ServiceTypesPanel: alta", () => {
  it("envía categoría, modo y requisito de vehículo elegidos en el formulario", async () => {
    const create = vi.spyOn(serviceTypesAdapter, "create").mockResolvedValue({} as ServiceType);
    const user = userEvent.setup();
    const dialog = await fillCreateForm(user);

    await user.click(within(dialog).getByRole("button", { name: "Crear tipo" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).toMatchObject({ code: "PODA-TEST", name: "Poda de prueba", category: "TREES", mode: "POINT" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Alta de tipo de servicio" })).not.toBeInTheDocument());
  });

  it("muestra el rechazo del backend y deja abierto el formulario", async () => {
    server.use(http.post("*/api/service-types", () => HttpResponse.json(
      { statusCode: 409, error: "Conflict", message: "Ya existe un tipo con ese código.", timestamp: new Date().toISOString(), path: "/api/service-types" },
      { status: 409 },
    )));
    const user = userEvent.setup();
    const dialog = await fillCreateForm(user);

    await user.click(within(dialog).getByRole("button", { name: "Crear tipo" }));

    expect((await screen.findAllByText("Ya existe un tipo con ese código.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog", { name: "Alta de tipo de servicio" })).toBeVisible();
  });
});
