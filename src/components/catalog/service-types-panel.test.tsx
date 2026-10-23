import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http } from "msw";
import { GET as listServiceTypes } from "@/app/api/service-types/route";
import { mockResponseAfter } from "@/mocks/delayed-response";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { serviceTypesAdapter } from "@/lib/service-types";
import { createSessionCookie } from "@/test/session";
import { ServiceTypesPanel } from "./service-types-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

describe("ServiceTypesPanel", () => {
  it("keeps the catalog header and seven columns while a response is delayed", async () => {
    server.use(http.get("*/api/service-types", ({ request }) => mockResponseAfter(350, () => {
      const headers = new Headers(request.headers);
      headers.set("cookie", createSessionCookie("office-duty-queue", { mode: "mock" }));
      return listServiceTypes(new Request(request, { headers }));
    })));
    const { container } = render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);
    const loading = screen.getByRole("status", { name: "Cargando tipos de servicio" });
    expect(loading.querySelectorAll("thead th")).toHaveLength(7);
    expect(loading.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(loading.querySelectorAll("tbody tr:first-child td")).toHaveLength(7);
    expect(loading.querySelectorAll("tbody tr:first-child td:last-child [data-slot=skeleton]")).toHaveLength(1);
    const widths = Array.from(loading.querySelectorAll("col"), (column) => column.className);
    await screen.findByRole("row", { name: /WASTE-ROUTE/ }, { timeout: 3000 });
    expect(screen.queryByRole("status", { name: "Cargando tipos de servicio" })).not.toBeInTheDocument();
    expect(Array.from(container.querySelectorAll("col"), (column) => column.className)).toEqual(widths);
    expect(container.querySelectorAll("thead th")).toHaveLength(7);
  });
  it("lists fixtures, filters them, and keeps locked fields read-only in the edit form", async () => {
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Tipos de servicio" })).toBeVisible();
    expect(screen.getByText("WASTE-ROUTE")).toBeVisible();
    const row = await screen.findByRole("row", { name: /WASTE-ROUTE/ });
    expect(row.querySelector('th[data-label="Código"]')).not.toBeNull();
    expect(row.querySelector('td[data-label="Acciones"]')).toBeNull();

    await user.click(within(row).getByRole("button", { name: "Ver detalle del tipo de servicio WASTE-ROUTE" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle del tipo de servicio" });
    await user.click(within(sheet).getByRole("button", { name: "Editar" }));
    const editDialog = await screen.findByRole("dialog", { name: "Editar tipo de servicio" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(editDialog).getByRole("textbox", { name: "Código" })).toHaveAttribute("readonly");
    expect(within(editDialog).getByRole("textbox", { name: "Categoría" })).toHaveAttribute("readonly");
    expect(within(editDialog).getByRole("textbox", { name: "Modo" })).toHaveAttribute("readonly");
    expect(within(editDialog).getByRole("textbox", { name: "Nombre" })).not.toHaveAttribute("readonly");
  });

  it("opens the creation form in a dialog and returns focus to its trigger on close", async () => {
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);

    const newButton = await screen.findByRole("button", { name: "Nuevo tipo de servicio" });
    await user.click(newButton);
    const createDialog = await screen.findByRole("dialog", { name: "Alta de tipo de servicio" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(createDialog).getByRole("button", { name: "Crear tipo" })).toBeVisible();
    await user.click(within(createDialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(newButton).toHaveFocus();
  });

  it("opens service type details and available actions from the row", async () => {
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /WASTE-ROUTE/ });
    await user.click(
      within(row).getByRole("button", {
        name: "Ver detalle del tipo de servicio WASTE-ROUTE",
      }),
    );

    const sheet = await screen.findByRole("dialog", {
      name: "Detalle del tipo de servicio",
    });
    expect(sheet).toHaveTextContent("WASTE-ROUTE");
    expect(within(sheet).getByRole("button", { name: "Editar" })).toBeVisible();
    expect(within(sheet).getByRole("button", { name: "Dar de baja" })).toBeVisible();
  });

  it("does not expose management actions to a Field actor", async () => {
    render(<ServiceTypesPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Tipos de servicio" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nuevo tipo de servicio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
    expect(screen.getByText("Solo consulta")).toBeVisible();
  });

  it("returns the BFF forbidden envelope for a Field write", async () => {
    const fieldCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
    const response = await fetch("http://localhost/api/service-types", {
      method: "POST",
      headers: { cookie: fieldCookie, "content-type": "application/json" },
      body: JSON.stringify({ code: "NEW", name: "Nuevo", category: "TREES", mode: "POINT", requiresVehicle: false }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      statusCode: 403,
      message: "Solo Oficina puede administrar tipos de servicio.",
      error: "Forbidden",
      path: "/api/service-types",
    });
  });

  it("asks before deactivating a service type and announces a failed request as an alert", async () => {
    const remove = vi.spyOn(serviceTypesAdapter, "remove").mockRejectedValue(new Error("No se pudo guardar el tipo de servicio."));
    const user = userEvent.setup();
    render(<ServiceTypesPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /WASTE-ROUTE/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle del tipo de servicio WASTE-ROUTE" }));
    const sheet = await screen.findByRole("dialog", { name: "Detalle del tipo de servicio" });
    await user.click(within(sheet).getByRole("button", { name: "Dar de baja" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("WASTE-ROUTE");
    expect(within(dialog).getByRole("button", { name: "Conservar tipo" })).toBeVisible();
    expect(remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Dar de baja" }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo dar de baja el tipo de servicio.");
    expect(screen.queryByRole("status", { name: /No se pudo guardar el tipo de servicio/ })).not.toBeInTheDocument();
  });
});
