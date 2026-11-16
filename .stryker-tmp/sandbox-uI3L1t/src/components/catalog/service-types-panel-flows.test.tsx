// @ts-nocheck
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { ServiceTypeRequestError, serviceTypesAdapter, type ServiceType } from "@/lib/service-types";
import { ServiceTypesPanel } from "./service-types-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const office = scenarios.officeDutyQueue;
const updated = { id: "x", code: "WASTE-ROUTE", name: "Renombrado" } as unknown as ServiceType;

async function openType(user: ReturnType<typeof userEvent.setup>, code: string) {
  const row = await screen.findByRole("row", { name: new RegExp(code) });
  await user.click(within(row).getByRole("button", { name: `Ver detalle del tipo de servicio ${code}` }));
  return screen.findByRole("dialog", { name: "Detalle del tipo de servicio" });
}

describe("ServiceTypesPanel flows", () => {
  it("shows the load failure message and recovers on retry", async () => {
    server.use(
      http.get("*/api/service-types", () =>
        HttpResponse.json(
          { statusCode: 500, message: "Catálogo caído.", error: "Internal", timestamp: "t", path: "/p" },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={office} />);

    expect(await screen.findByText("Catálogo caído.")).toBeVisible();

    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("row", { name: /WASTE-ROUTE/ })).toBeVisible();
    expect(screen.queryByText("Catálogo caído.")).not.toBeInTheDocument();
  });

  it("sends the search term to the adapter and shows the empty state when nothing matches", async () => {
    const list = vi.spyOn(serviceTypesAdapter, "list");
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={office} />);
    await screen.findByRole("row", { name: /WASTE-ROUTE/ });

    await user.type(screen.getByRole("textbox", { name: "Buscar tipos de servicio" }), "zzz-nada");

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "zzz-nada" })));
    await waitFor(() => expect(screen.queryByRole("row", { name: /WASTE-ROUTE/ })).not.toBeInTheDocument());
  });

  it("creates a type with the typed code and name, closes the dialog and reloads", async () => {
    const create = vi.spyOn(serviceTypesAdapter, "create").mockResolvedValue(updated);
    const list = vi.spyOn(serviceTypesAdapter, "list");
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={office} />);
    await screen.findByRole("row", { name: /WASTE-ROUTE/ });
    const before = list.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Nuevo tipo de servicio" }));
    const dialog = await screen.findByRole("dialog", { name: "Alta de tipo de servicio" });
    await user.type(within(dialog).getByLabelText("Código"), "NUEVO-1");
    await user.type(within(dialog).getByLabelText("Nombre"), "Tipo nuevo");
    await user.click(within(dialog).getByRole("button", { name: "Crear tipo" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ code: "NUEVO-1", name: "Tipo nuevo" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(before));
  });

  it("keeps the creation dialog open with the backend message when creation fails", async () => {
    vi.spyOn(serviceTypesAdapter, "create").mockRejectedValue(new Error("El código ya existe."));
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={office} />);
    await screen.findByRole("row", { name: /WASTE-ROUTE/ });

    await user.click(screen.getByRole("button", { name: "Nuevo tipo de servicio" }));
    const dialog = await screen.findByRole("dialog", { name: "Alta de tipo de servicio" });
    await user.type(within(dialog).getByLabelText("Código"), "WASTE-ROUTE");
    await user.type(within(dialog).getByLabelText("Nombre"), "Duplicado");
    await user.click(within(dialog).getByRole("button", { name: "Crear tipo" }));

    expect(await within(dialog).findByText("El código ya existe.")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Alta de tipo de servicio" })).toBeVisible();
  });

  it("reports a rejected update and then saves the edited name", async () => {
    const update = vi
      .spyOn(serviceTypesAdapter, "update")
      .mockRejectedValueOnce(new Error("No se pudo actualizar el tipo de servicio."))
      .mockResolvedValue(updated);
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={office} />);
    const sheet = await openType(user, "WASTE-ROUTE");
    await user.click(within(sheet).getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar tipo de servicio" });
    const name = within(dialog).getByRole("textbox", { name: "Nombre" });
    await user.clear(name);
    await user.type(name, "Renombrado");

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    expect(await within(dialog).findByText("No se pudo actualizar el tipo de servicio.")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ name: "Renombrado" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar tipo de servicio" })).not.toBeInTheDocument());
  });

  it("deactivates after confirmation, and shows the conflict message of a rejected deactivation", async () => {
    const remove = vi
      .spyOn(serviceTypesAdapter, "remove")
      .mockRejectedValueOnce(new ServiceTypeRequestError("Tiene servicios programados.", 409))
      .mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={office} />);
    const sheet = await openType(user, "WASTE-ROUTE");
    await user.click(within(sheet).getByRole("button", { name: "Dar de baja" }));

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tiene servicios programados.");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
