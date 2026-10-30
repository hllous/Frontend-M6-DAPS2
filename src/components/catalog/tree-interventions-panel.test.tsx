import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetTreeInterventionFixtures, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { resetServiceFixtures, serviceFixtures } from "@/lib/services-fixtures";
import { scenarios } from "@/lib/scenarios";
import { servicesAdapter } from "@/lib/services";
import { TreeInterventionsPanel } from "./tree-interventions-panel";

const server = setupServer(...handlers);

async function chooseSelectOption(user: ReturnType<typeof userEvent.setup>, trigger: HTMLElement, name: string | RegExp) {
  await waitFor(() => expect(trigger).toBeEnabled());
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name }));
  if (trigger.getAttribute("aria-expanded") === "true") await user.keyboard("{Escape}");
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetTreeInterventionFixtures();
  resetServiceFixtures();
  window.localStorage.clear();
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("TreeInterventionsPanel", () => {
  it("opens a linked intervention outside the current page", async () => {
    window.history.replaceState(null, "", "/app/catalog/tree-interventions?detail=intervention-1");
    server.use(http.get("*/api/tree-interventions", () => HttpResponse.json({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } })));
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const dialog = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    expect(await within(dialog).findByText("Poda de seguridad")).toBeVisible();
    window.history.replaceState(null, "", "/app");
  });
  it("filters priority on the server and restores all requests", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("article", { name: /Poda de seguridad/i });
    const filter = screen.getByRole("combobox", { name: "Filtrar por prioridad" });
    await chooseSelectOption(user, filter, "Crítica");
    expect(await screen.findByRole("article", { name: /Extracción/i })).toBeVisible();
    expect(screen.queryByRole("article", { name: /Poda de seguridad/i })).not.toBeInTheDocument();
    await chooseSelectOption(user, filter, "Baja");
    expect(await screen.findByText("No hay solicitudes para los filtros seleccionados. Quite uno o más filtros para consultar el registro completo.")).toBeVisible();
    await chooseSelectOption(user, filter, "Todas");
    expect(await screen.findByRole("article", { name: /Poda de seguridad/i })).toBeVisible();
  });

  it("lists requests, filters by status and shows every linked tree in detail", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    expect(within(request).getByText("Solicitada")).toBeVisible();
    expect(within(request).getByRole("button", { name: "Ver detalle" })).toHaveClass("max-[760px]:h-12");
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));

    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    expect(await within(detail).findByText(/ARB-00443/)).toBeVisible();
    expect(await within(detail).findByText(/ARB-00445/)).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Autorizar intervención" })).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Solicitar corte de calle" })).not.toBeInTheDocument();

    await within(detail).getByRole("button", { name: "Cerrar detalle" }).click();
    await chooseSelectOption(user, screen.getByRole("combobox", { name: "Filtrar por estado" }), "Autorizada");
    expect(await screen.findByRole("article", { name: /intervention-2|Tratamiento/i })).toBeVisible();
    expect(screen.queryByRole("article", { name: /intervention-1|Poda de seguridad/i })).not.toBeInTheDocument();
    const statusFilter = screen.getByRole("combobox", { name: "Filtrar por estado" });
    await chooseSelectOption(user, statusFilter, "Todos");
    expect(await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i })).toBeVisible();

    const typeFilter = screen.getByRole("combobox", { name: "Filtrar por tipo de intervención" });
    await chooseSelectOption(user, typeFilter, "Tratamiento");
    expect(screen.queryByRole("article", { name: /intervention-1|Poda de seguridad/i })).not.toBeInTheDocument();
    await chooseSelectOption(user, typeFilter, "Todos");
    expect(await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i })).toBeVisible();
  });

  it("names each card by its trees, never by the request id, and falls back to the tree address", async () => {
    updateTreeInterventionFixture("intervention-3", { address: null });
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    const request = await screen.findByRole("article", { name: "Poda de seguridad · ARB-00443, ARB-00445" });
    expect(within(request).getByText("ARB-00443, ARB-00445")).toBeVisible();
    expect(screen.queryByText("intervention-1")).not.toBeInTheDocument();
    const removal = await screen.findByRole("article", { name: "Extracción · ARB-00445" });
    expect(within(removal).getByText("Av. Las Heras 2100")).toBeVisible();
  });

  it("shows each intervention priority as a text-labeled semantic badge", async () => {
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    const cases = [
      { name: /intervention-1|Poda de seguridad/i, label: "Alta", variant: "warning" },
      { name: /intervention-2|Tratamiento/i, label: "Media", variant: "info" },
      { name: /intervention-3|Extracción/i, label: "Crítica", variant: "danger" },
    ] as const;

    for (const { name, label, variant } of cases) {
      const request = await screen.findByRole("article", { name });
      const priority = within(request).getByText(label);

      expect(priority).toHaveAttribute("data-variant", variant);
    }
  });

  it("shows the priority badge and keeps the decision actions in the detail footer", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    const request = await screen.findByRole("article", { name: /Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));

    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    const priority = await within(detail).findByText("Alta");
    expect(priority).toHaveAttribute("data-slot", "badge");
    const footer = detail.querySelector("[data-slot=dialog-footer]") as HTMLElement;
    expect(within(footer).getByRole("button", { name: "Autorizar intervención" })).toBeVisible();
    expect(within(footer).getByRole("button", { name: "Cerrar detalle" })).toBeVisible();
  });

  it("shows an unrecorded intervention priority as neutral text", async () => {
    updateTreeInterventionFixture("intervention-1", { priority: "LOW" });
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    const priority = within(request).getByText("Baja");

    expect(priority).toHaveAttribute("data-variant", "secondary");
  });

  it("offers a street closure request only from an authorized intervention", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(within(detail).getByRole("button", { name: "Solicitar corte de calle" })).toBeVisible();
    await user.click(within(detail).getByRole("button", { name: "Solicitar corte de calle" }));

    const closureDialog = await screen.findByRole("dialog", { name: /Solicitar corte de calle/ });
    expect(within(closureDialog).getByText("Av. Mitre 1140")).toBeVisible();
    expect(within(closureDialog).getByText(/Autorizada/)).toBeVisible();
    expect(within(closureDialog).getByLabelText("Motivo *")).toHaveValue("");
  });

  it("creates a multi-tree request and enforces justification for removal", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Intervenciones de arbolado" });
    await screen.getByRole("button", { name: "Solicitar intervención" }).click();
    const dialog = screen.getByRole("dialog", { name: /Solicitar intervención/ });
    const interventionType = within(dialog).getByRole("combobox", { name: "Tipo de intervención" });
    expect(interventionType).toHaveAttribute("aria-required", "true");
    await chooseSelectOption(user, interventionType, /Extracci/);
    await user.click(within(dialog).getByRole("button", { name: "Crear solicitud de intervención" }));
    const treesInput = within(dialog).getByRole("combobox", { name: "Árboles a intervenir" });
    expect(treesInput).toHaveAttribute("aria-required", "true");
    expect(await within(dialog).findByText("Seleccione al menos un árbol.")).toBeVisible();
    expect(treesInput).toHaveAttribute("aria-invalid", "true");
    expect(treesInput).toHaveAttribute("aria-describedby", "intervention-trees-error");

    await chooseSelectOption(user, treesInput, /ARB-00443/);
    await chooseSelectOption(user, treesInput, /ARB-00445/);
    await user.type(within(dialog).getByLabelText(/^Dirección/), "Paseo de la Costa 220");
    await user.click(within(dialog).getByRole("button", { name: "Crear solicitud de intervención" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("justificación");
    const justificationInput = within(dialog).getByLabelText(/^Justificación/);
    expect(justificationInput).toHaveAttribute("aria-invalid", "true");
    expect(justificationInput).toHaveAttribute("aria-describedby", "intervention-justification-help intervention-justification-error");

    await user.type(within(dialog).getByLabelText(/^Justificación/), "El tronco presenta inestabilidad crítica.");
    expect(within(dialog).getByLabelText(/^Justificación/)).toBeRequired();
    await user.click(within(dialog).getByRole("button", { name: "Crear solicitud de intervención" }));
    expect(await screen.findByText("Solicitud de intervención creada. Estado inicial: solicitada.")).toBeVisible();
  }, 15_000);

  it("keeps the request action out of read-only sessions", async () => {
    render(<TreeInterventionsPanel scenario={scenarios.officeLimited} />);
    expect(await screen.findByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Solicitar intervención" })).not.toBeInTheDocument();
    expect(screen.getByText("Solo consulta")).toBeVisible();
  });

  it("authorizes a non-removal intervention and shows the recorded author and time", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    await user.click(within(detail).getByRole("button", { name: "Autorizar intervención" }));

    expect(await within(detail).findByText("Autorizada")).toBeVisible();
    expect(within(detail).getByText("user-lucia")).toBeVisible();
    expect(within(detail).getByText(/Fecha de autorización/)).toBeVisible();
  });

  it("schedules an authorized multi-tree intervention as a POINT Service and keeps every tree in context", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    await user.click(within(detail).getByRole("button", { name: "Autorizar intervención" }));
    expect(await within(detail).findByRole("button", { name: "Programar servicio" })).toBeVisible();
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));

    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    expect(await within(form).findByText(/Se creará un servicio de punto/)).toBeVisible();
    expect(within(form).getByLabelText(/^Fecha programada/)).toBeVisible();
    const fromGroup = within(form).getByRole("group", { name: "Desde" });
    const toGroup = within(form).getByRole("group", { name: "Hasta" });
    expect(fromGroup).toBeVisible();
    expect(toGroup).toBeVisible();
    for (const control of within(fromGroup).getAllByRole("combobox")) expect(control).toHaveAttribute("aria-required", "true");
    for (const control of within(toGroup).getAllByRole("combobox")) expect(control).toHaveAttribute("aria-required", "true");
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));
    expect(await within(detail).findByRole("alert")).toHaveTextContent(/Servicio vinculado: SVC-/);
    expect(within(detail).getByText(/ARB-00443/)).toBeVisible();
    expect(within(detail).getByText(/ARB-00445/)).toBeVisible();
    const serviceId = detail.textContent?.match(/Servicio vinculado: (SVC-\d+)/)?.[1];
    const linkedService = serviceFixtures.find((service) => service.id === serviceId);
    expect(linkedService).toMatchObject({ mode: "POINT", targetType: "TREE", targetId: "tree-2", zoneIds: ["zone-2"] });
    expect(linkedService?.targetRef).toMatch(/ARB-00443/);
    expect(linkedService?.targetRef).toMatch(/ARB-00445/);
  });

  it("creates the Service with the id returned by the Service types lookup, not a fixture id", async () => {
    const backendServiceTypeId = "0b8f2c6e-1a4d-4f7e-9c3b-5d2e8a1f6b70";
    server.use(
      http.get("*/api/service-types", () => HttpResponse.json({
        data: [{ id: backendServiceTypeId, code: "ARB-POD", name: "Poda de arbolado", category: "TREES", mode: "POINT", requiresVehicle: true, active: true }],
        meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
      })),
    );
    const createSpy = vi.spyOn(servicesAdapter, "create");
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));
    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(await within(detail).findByRole("alert")).toHaveTextContent(/Servicio vinculado: SVC-/);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].serviceTypeId).toBe(backendServiceTypeId);
    createSpy.mockRestore();
  });

  it("shows a clear Spanish error and creates nothing when there is no active pruning Service type", async () => {
    server.use(
      http.get("*/api/service-types", () => HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } })),
    );
    const createSpy = vi.spyOn(servicesAdapter, "create");
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));
    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(await within(detail).findByRole("alert")).toHaveTextContent("No hay un tipo de servicio activo de poda de arbolado en la configuración");
    expect(createSpy).not.toHaveBeenCalled();
    expect(within(detail).getByRole("form", { name: "Programar servicio para la intervención" })).toBeVisible();
    createSpy.mockRestore();
  });

  it("surfaces a created-but-unlinked Service as an actionable unsynced state", async () => {
    server.use(
      http.post("*/api/tree-interventions/:interventionId/assign-service", () => HttpResponse.json({
        statusCode: 409,
        message: "La intervención ya tiene un servicio asociado.",
        error: "Conflict",
        timestamp: new Date().toISOString(),
        path: "/api/tree-interventions/intervention-2/assign-service",
      }, { status: 409 })),
    );
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));
    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(await within(detail).findByText(/La vinculación quedó pendiente/)).toHaveTextContent(/SVC-\d+.*Tratamiento/);
    expect(within(detail).getByRole("button", { name: "Reintentar vinculación" })).toBeVisible();
    expect(within(detail).queryByText(/La intervención fue programada/)).not.toBeInTheDocument();
  });

  it("recovers an unlinked Service after storage fails, including from page two after reload", async () => {
    server.use(
      http.post("*/api/tree-interventions/:interventionId/assign-service", () => HttpResponse.json({
        statusCode: 500,
        message: "No se pudo vincular el servicio.",
        error: "Internal Server Error",
        timestamp: new Date().toISOString(),
        path: "/api/tree-interventions/intervention-2/assign-service",
      }, { status: 500 })),
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const user = userEvent.setup();
    const first = await openScheduleForm(user, /intervention-2|Tratamiento/i);
    await user.click(within(first.form).getByRole("button", { name: "Programar servicio de intervención" }));

    const pendingWarning = await within(first.detail).findByText(/La vinculación quedó pendiente/);
    expect(pendingWarning).toHaveTextContent(/SVC-\d+/);
    expect(pendingWarning).toHaveTextContent("Tratamiento · Av. Mitre 1140");
    expect(pendingWarning).toHaveTextContent("antes de salir de esta página");
    const createdService = serviceFixtures.find((service) => service.notes === "Intervención de arbolado intervention-2.");
    expect(createdService).toBeDefined();

    cleanup();
    server.resetHandlers();
    const requestedPages: number[] = [];
    const fillerServices = Array.from({ length: 100 }, (_, index) => ({
      ...createdService!,
      id: `SVC-FILLER-${index}`,
      targetId: `tree-filler-${index}`,
      notes: "Otro servicio",
    }));
    server.use(http.get("*/api/services", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page"));
      requestedPages.push(page);
      return HttpResponse.json({
        data: page === 1 ? fillerServices : [createdService],
        meta: { total: 101, page, pageSize: 100, totalPages: 2 },
      });
    }));

    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await within(detail).findByRole("button", { name: "Reintentar vinculación" });

    expect(requestedPages).toEqual([1, 2]);
    expect(within(detail).queryByRole("button", { name: "Programar servicio" })).not.toBeInTheDocument();
    expect(within(detail).getByText(/La vinculación quedó pendiente/)).toHaveTextContent(createdService!.title);
  });

  it("keeps scheduling unavailable when the Service lookup fails and retries the lookup", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.json({
      statusCode: 500,
      message: "Error de lectura.",
      error: "Internal Server Error",
      timestamp: new Date().toISOString(),
      path: "/api/services",
    }, { status: 500 })));
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(await within(detail).findByText("No se pudo verificar si ya existe un servicio para esta intervención. Reintente.")).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Programar servicio" })).not.toBeInTheDocument();
    server.resetHandlers();
    await user.click(within(detail).getByRole("button", { name: "Reintentar" }));

    expect(await within(detail).findByRole("button", { name: "Programar servicio" })).toBeVisible();
    expect(within(detail).queryByText("No se pudo verificar si ya existe un servicio para esta intervención. Reintente.")).not.toBeInTheDocument();
  });

  it("offers scheduling after the backend confirms there is no Service for the intervention", async () => {
    const requestedUrls: string[] = [];
    server.use(http.get("*/api/services", ({ request }) => {
      requestedUrls.push(request.url);
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } });
    }));
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(await within(detail).findByRole("button", { name: "Programar servicio" })).toBeVisible();
    expect(new URL(requestedUrls[0]).searchParams.get("pageSize")).toBe("100");
  });

  async function openScheduleForm(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(await within(detail).findByRole("button", { name: "Programar servicio" }));
    return { detail, form: within(detail).getByRole("form", { name: "Programar servicio para la intervención" }) };
  }

  it("assigns the chosen crew and vehicle when it creates the Service", async () => {
    const create = vi.spyOn(servicesAdapter, "create");
    const user = userEvent.setup();
    const { detail, form } = await openScheduleForm(user, /intervention-2|Tratamiento/i);
    await chooseSelectOption(user, within(form).getByRole("combobox", { name: "Cuadrilla (opcional)" }), /Cuadrilla A/);
    await chooseSelectOption(user, within(form).getByRole("combobox", { name: "Vehículo (opcional)" }), /AA 123 AA/);
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));
    const note = await within(form).findByLabelText(/Justificación de la asignación/i);
    await user.type(note, "Refuerzo coordinado para la intervención.");
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ overrideNote: "Refuerzo coordinado para la intervención." }));
    const serviceId = (await within(detail).findByRole("link", { name: /SVC-\d+/ })).textContent;
    expect(serviceFixtures.find((service) => service.id === serviceId)).toMatchObject({ crewId: "crew-a", vehicleId: "vehicle-1" });
    expect(within(detail).getByRole("link", { name: /SVC-\d+/ })).toHaveAttribute("href", expect.stringContaining(`detail=${serviceId}`));
  });

  it("un 409 que no pide justificación muestra su error y no abre la justificación", async () => {
    server.use(http.post("*/api/services", () => HttpResponse.json({ statusCode: 409, message: "La cuadrilla está inactiva.", error: "Conflict", timestamp: new Date().toISOString(), path: "/api/services" }, { status: 409 })));
    const user = userEvent.setup();
    const { detail, form } = await openScheduleForm(user, /intervention-2|Tratamiento/i);
    await chooseSelectOption(user, within(form).getByRole("combobox", { name: "Cuadrilla (opcional)" }), /Cuadrilla A/);
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));
    expect(await within(detail).findByText("La cuadrilla está inactiva.")).toBeVisible();
    expect(within(form).queryByLabelText(/Justificación de la asignación/i)).not.toBeInTheDocument();
  });

  it("re-reads the intervention after a 409 and treats an existing link as done", async () => {
    server.use(
      http.post("*/api/tree-interventions/:interventionId/assign-service", ({ params }) => {
        updateTreeInterventionFixture(params.interventionId as string, { serviceId: "SVC-7777" });
        return HttpResponse.json({ statusCode: 409, message: "La intervención ya tiene un servicio asociado.", error: "Conflict", timestamp: new Date().toISOString(), path: "/" }, { status: 409 });
      }),
    );
    const user = userEvent.setup();
    const { detail, form } = await openScheduleForm(user, /intervention-2|Tratamiento/i);
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(await within(detail).findByRole("link", { name: "SVC-7777" })).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Reintentar vinculación" })).not.toBeInTheDocument();
  });

  it("keeps an unlinked Service across a reload and resumes the link", async () => {
    server.use(
      http.post("*/api/tree-interventions/:interventionId/assign-service", () => HttpResponse.json({ statusCode: 409, message: "La intervención no está autorizada.", error: "Conflict", timestamp: new Date().toISOString(), path: "/" }, { status: 409 })),
    );
    const user = userEvent.setup();
    const first = await openScheduleForm(user, /intervention-2|Tratamiento/i);
    await user.click(within(first.form).getByRole("button", { name: "Programar servicio de intervención" }));
    await within(first.detail).findByRole("button", { name: "Reintentar vinculación" });
    cleanup();
    server.resetHandlers();

    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(await within(detail).findByRole("button", { name: "Reintentar vinculación" }));
    expect(await within(detail).findByRole("link", { name: /SVC-\d+/ })).toBeVisible();
    expect(window.localStorage.length).toBe(0);
  });

  it("keeps the schedule error recoverable when Service creation fails", async () => {
    server.use(
      http.post("*/api/services", () => HttpResponse.json({
        statusCode: 400,
        message: "No se puede programar el servicio.",
        error: "Bad Request",
        timestamp: new Date().toISOString(),
        path: "/api/services",
      }, { status: 400 })),
    );
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));
    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(await within(detail).findByRole("alert")).toHaveTextContent("No se puede programar el servicio");
    expect(within(detail).getByRole("form", { name: "Programar servicio para la intervención" })).toBeVisible();
    expect(within(detail).queryByText(/Servicio vinculado:/)).not.toBeInTheDocument();
  });

  it("moves a removal to pending authorization before exposing authorize and reject", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-3|Extracción/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(within(detail).getByRole("button", { name: "Enviar a autorización" })).toBeVisible();
    await user.click(within(detail).getByRole("button", { name: "Enviar a autorización" }));

    expect(await within(detail).findByText("Pendiente de autorización")).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Autorizar intervención" })).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Rechazar intervención" })).toBeVisible();
  });

  it("hides authorize and reject on a pending removal for Operations, who still authorizes other types", async () => {
    const user = userEvent.setup();
    updateTreeInterventionFixture("intervention-3", { status: "PENDING_AUTHORIZATION" });
    render(<TreeInterventionsPanel scenario={scenarios.officeOperations} />);
    const removal = await screen.findByRole("article", { name: /intervention-3|Extracción/i });
    await user.click(within(removal).getByRole("button", { name: "Ver detalle" }));
    const removalDetail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    expect(await within(removalDetail).findByText("Pendiente de autorización")).toBeVisible();
    expect(within(removalDetail).queryByRole("button", { name: "Autorizar intervención" })).not.toBeInTheDocument();
    expect(within(removalDetail).queryByRole("button", { name: "Rechazar intervención" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    const pruning = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(pruning).getByRole("button", { name: "Ver detalle" }));
    const pruningDetail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    expect(await within(pruningDetail).findByRole("button", { name: "Autorizar intervención" })).toBeVisible();
  });

  it("shows authorize and reject on a pending removal to the Admin", async () => {
    const user = userEvent.setup();
    updateTreeInterventionFixture("intervention-3", { status: "PENDING_AUTHORIZATION" });
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const removal = await screen.findByRole("article", { name: /intervention-3|Extracción/i });
    await user.click(within(removal).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    expect(await within(detail).findByRole("button", { name: "Autorizar intervención" })).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Rechazar intervención" })).toBeVisible();
  });

  it("rejects a removal terminally and offers a fresh request with its original values", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-3|Extracción/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Enviar a autorización" }));
    await user.click(await within(detail).findByRole("button", { name: "Rechazar intervención" }));

    const confirmation = await screen.findByRole("dialog", { name: /Confirmar rechazo/ });
    expect(within(confirmation).getByText(/No se puede deshacer/i)).toBeVisible();
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar rechazo de intervención" }));

    expect(await within(detail).findByText("Rechazada")).toBeVisible();
    expect(within(detail).queryByText(/motivo/i)).not.toBeInTheDocument();
    await user.click(within(detail).getByRole("button", { name: "Crear nueva solicitud" }));
    const freshRequest = await screen.findByRole("dialog", { name: /Solicitar intervención/ });
    expect(within(freshRequest).getByRole("combobox", { name: "Tipo de intervención" })).toHaveTextContent("Extracción");
    expect(within(freshRequest).getByRole("combobox", { name: "Árboles a intervenir" })).toHaveTextContent("ARB-00445");
    expect(within(freshRequest).getByLabelText(/^Dirección/)).toHaveValue("Paseo de la Costa 220");
    expect(within(freshRequest).getByRole("combobox", { name: "Prioridad" })).toHaveTextContent("Crítica");
    expect(within(freshRequest).getByLabelText(/^Justificación/)).toHaveValue("El ejemplar presenta inestabilidad crítica.");
  });

  it("surfaces a backend transition error without presenting a false authorization", async () => {
    server.use(
      http.post("*/api/tree-interventions/:interventionId/authorize", () => HttpResponse.json({
        statusCode: 409,
        message: "La intervención ya fue autorizada por otra persona.",
        error: "Conflict",
        timestamp: new Date().toISOString(),
        path: "/api/tree-interventions/intervention-1/authorize",
      }, { status: 409 })),
    );
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Autorizar intervención" }));

    expect(await within(detail).findByRole("alert")).toHaveTextContent("ya fue autorizada");
    expect(within(detail).getByText("Solicitada")).toBeVisible();
  });

  it("lets Operations submit a requested removal for authorization", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeOperations} />);
    const removal = await screen.findByRole("article", { name: /Extracción/i });
    await user.click(within(removal).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    await user.click(within(detail).getByRole("button", { name: "Enviar a autorización" }));

    expect(await within(detail).findByText("Pendiente de autorización")).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Autorizar intervención" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Rechazar intervención" })).not.toBeInTheDocument();
  });

  it("shows the role denial and asks for a fresh GET /me when the backend refuses a removal decision", async () => {
    const roleStale = vi.fn();
    window.addEventListener("m6:roles-stale", roleStale);
    updateTreeInterventionFixture("intervention-3", { status: "PENDING_AUTHORIZATION" });
    server.use(
      http.post("*/api/tree-interventions/:interventionId/reject", () => HttpResponse.json({
        statusCode: 403,
        message: "Requiere M6_ADMIN.",
        error: "Forbidden",
        code: "ROLE_REQUIRED",
        timestamp: new Date().toISOString(),
        path: "/api/tree-interventions/intervention-3/reject",
      }, { status: 403 })),
    );
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const removal = await screen.findByRole("article", { name: /Extracción/i });
    await user.click(within(removal).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(await within(detail).findByRole("button", { name: "Rechazar intervención" }));
    const confirmation = await screen.findByRole("dialog", { name: /Confirmar rechazo/ });
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar rechazo de intervención" }));

    await waitFor(() => expect(roleStale).toHaveBeenCalled());
    expect(await within(confirmation).findByRole("alert")).toHaveTextContent(/No tiene el rol necesario/);
    expect(within(detail).getByText("Pendiente de autorización")).toBeVisible();
    window.removeEventListener("m6:roles-stale", roleStale);
  });

  it("does not expose authorization controls to Field", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.fieldCrewMember} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(within(detail).queryByRole("button", { name: /autorizar|rechazar|enviar a autorización/i })).not.toBeInTheDocument();
  });
});
