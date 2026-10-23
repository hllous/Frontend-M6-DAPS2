import { chooseCatalogOption } from "./catalog-a-test-controls";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { handlers } from "@/mocks/handlers";
import { withNodeFile } from "@/mocks/node-file";
import { scenarios } from "@/lib/scenarios";
import { containersAdapter, type ContainerStatus } from "@/lib/containers";
import { ContainerCatalogPanel } from "./container-catalog-panel";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const server = setupServer(...handlers);

async function openContainerDetail(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
) {
  await user.click(within(row).getByRole("button", { name: /^Ver detalle de / }));
  return screen.getByRole("dialog");
}

async function clickContainerAction(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
  action: string,
) {
  const detail = await openContainerDetail(user, row);
  await user.click(within(detail).getByRole("button", { name: action }));
  return detail;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetContainerFixtures();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe("Container Service lookup", () => {
  const containerId = "70423999-647b-4b29-98ce-efcd33b3d7c2";
  beforeEach(() => {
    server.use(
      http.get("*/api/containers", () => HttpResponse.json({
        data: [{ id: containerId, code: "CONT-REMOTO", containerType: "RECYCLABLE", zoneId: "zone-2", address: "Santa Fe 123", lat: null, lng: null, capacityLiters: 2400, status: "OVERFLOWED" }],
        meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
      })),
      http.get(`*/api/containers/${containerId}/evidence`, () => HttpResponse.json({ data: [] })),
    );
  });

  it("disables standalone transitions after a failed lookup and enables them after retry", async () => {
    let failing = true;
    server.use(http.get("*/api/services", () => failing
      ? HttpResponse.error()
      : HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } })));
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    const row = await screen.findByRole("row", { name: /CONT-REMOTO/ });
    await openContainerDetail(user, row);
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("No se pudo verificar. Intente nuevamente.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Vaciar contenedor" })).toBeDisabled();
    failing = false;
    await user.click(within(dialog).getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Vaciar contenedor" })).toBeEnabled());
  });

  it("blocks standalone emptying when the linked Service is beyond the first 100 results", async () => {
    const requestedPages: number[] = [];
    const service = {
      id: "48dc03df-65b5-4530-8013-d5072e970170",
      title: "Vaciado remoto", serviceTypeId: "st-container-repair",
      serviceTypeName: "Vaciado de contenedor", mode: "POINT", status: "IN_PROGRESS",
      origin: "MANUAL", zoneIds: ["zone-2"], targetType: "CONTAINER",
      targetId: containerId, scheduledDate: "2026-09-06",
    };
    server.use(http.get("*/api/services", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      requestedPages.push(page);
      return HttpResponse.json({
        data: page === 1 ? Array.from({ length: 100 }, (_, index) => ({ ...service, id: `other-${index}`, targetId: "another-container" })) : [service],
        meta: { total: 101, page, pageSize: 100, totalPages: 2 },
      });
    }));
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    const row = await screen.findByRole("row", { name: /CONT-REMOTO/ });
    await openContainerDetail(user, row);
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText(`Servicio en curso (${service.id})`)).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();
    expect(requestedPages).toContain(2);
  });

  it("keeps actions disabled when the lookup exceeds its twenty-page limit", async () => {
    const requestedPages: number[] = [];
    server.use(http.get("*/api/services", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      requestedPages.push(page);
      return HttpResponse.json({ data: [], meta: { total: 2001, page, pageSize: 100, totalPages: 21 } });
    }));
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    const row = await screen.findByRole("row", { name: /CONT-REMOTO/ });
    await openContainerDetail(user, row);
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("No se pudo verificar. Intente nuevamente.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Vaciar contenedor" })).toBeDisabled();
    expect(requestedPages.slice(-20)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(requestedPages).not.toContain(21);
  });

  it("does not treat an incomplete result as absence of a linked Service", async () => {
    server.use(http.get("*/api/services", () => HttpResponse.json({
      data: [], meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
    })));
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    const row = await screen.findByRole("row", { name: /CONT-REMOTO/ });
    await openContainerDetail(user, row);
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("No se pudo verificar. Intente nuevamente.")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Vaciar contenedor" })).toBeDisabled();
  });

  it("offers standalone emptying when no Service exists and refreshes verification when opening detail", async () => {
    let lookups = 0;
    server.use(http.get("*/api/services", () => {
      lookups += 1;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 0 } });
    }));
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);
    const row = await screen.findByRole("row", { name: /CONT-REMOTO/ });
    const previousLookups = lookups;
    await openContainerDetail(user, row);
    const detail = screen.getByRole("dialog");
    await waitFor(() => expect(within(detail).getByRole("button", { name: "Vaciar contenedor" })).toBeEnabled());
    await waitFor(() => expect(lookups).toBeGreaterThan(previousLookups));
    expect(within(detail).queryByText(/Servicio en curso/)).not.toBeInTheDocument();
  });

  it.each<[ContainerStatus, string]>([
    ["OVERFLOWED", "Vaciar contenedor"],
    ["UNDER_REPAIR", "Completar reparación"],
    ["RELOCATING", "Confirmar ubicación"],
    ["DAMAGED", "Retirar contenedor"],
  ])("disables the %s standalone transition when verification fails", async (status, action) => {
    server.use(
      http.get("*/api/containers", () => HttpResponse.json({
        data: [{ id: containerId, code: "CONT-REMOTO", containerType: "RECYCLABLE", zoneId: "zone-2", address: "Santa Fe 123", lat: null, lng: null, capacityLiters: 2400, status }],
        meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
      })),
      http.get("*/api/services", () => HttpResponse.error()),
    );
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={status === "OVERFLOWED" ? scenarios.fieldCrewLeader : scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /CONT-REMOTO/ });
    await openContainerDetail(user, row);
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByText("No se pudo verificar. Intente nuevamente.");
    expect(within(dialog).getByRole("button", { name: action })).toBeDisabled();
  });
});

describe("ContainerCatalogPanel", () => {
  it("lists Containers and filters them by status, type, zone, and search", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Contenedores" })).toBeVisible();
    expect(screen.getByText("CONT-001")).toBeVisible();

    // Filter by type
    await chooseCatalogOption(user, screen.getByLabelText("Tipo de contenedor"), "Materiales reciclables");
    expect(await screen.findByText("CONT-002")).toBeVisible();
    expect(screen.queryByText("CONT-001")).not.toBeInTheDocument();

    // Filter by status
    await chooseCatalogOption(user, screen.getByLabelText("Estado"), "Desbordado");
    expect(await screen.findByText("CONT-002")).toBeVisible();

    // Filter by zone
    await chooseCatalogOption(user, screen.getByLabelText("Zona"), "Palermo");
    expect(screen.getByText("CONT-002")).toBeVisible();

    // Reset filters
    await chooseCatalogOption(user, screen.getByLabelText("Tipo de contenedor"), /^Todos(?: los (?:tipos|estados))?$|^Todas las zonas$/);
    await chooseCatalogOption(user, screen.getByLabelText("Estado"), /^Todos(?: los (?:tipos|estados))?$|^Todas las zonas$/);
    await chooseCatalogOption(user, screen.getByLabelText("Zona"), /^Todos(?: los (?:tipos|estados))?$|^Todas las zonas$/);

    // Search filter
    await user.type(screen.getByLabelText("Buscar contenedor"), "Santa Fe");
    expect(await screen.findByText("CONT-002")).toBeVisible();
    expect(screen.queryByText("CONT-001")).not.toBeInTheDocument();
  });

  it("opens the Container named by ?detail= in the URL", async () => {
    window.history.replaceState(null, "", "/app/catalog/containers?detail=cont-3");
    try {
      render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);
      expect(await screen.findByRole("dialog", { name: /Detalle del contenedor CONT-003/ })).toBeVisible();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("allows any actor to view Container detail including damage information", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-003")).toBeVisible();

    const row = screen.getByRole("row", { name: /CONT-003/ });
    await openContainerDetail(user, row);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Detalle del contenedor CONT-003/ })).toBeVisible();
    expect(within(dialog).getByText("Dañado")).toBeVisible();
    expect(within(dialog).getByText("Tapa rota")).toBeVisible();
    expect(within(dialog).getByText("Media")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(dialog).not.toBeVisible();
  });

  it("opens the detail with Enter and restores focus to the row after closing", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    await screen.findByText("CONT-003");
    const rowButton = screen.getByRole("button", { name: "Ver detalle de CONT-003" });
    rowButton.focus();
    expect(rowButton).toHaveFocus();

    await user.keyboard("{Enter}");
    const detail = screen.getByRole("dialog", { name: /Detalle del contenedor CONT-003/ });
    expect(detail).toBeVisible();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(detail).not.toBeInTheDocument());
    expect(rowButton).toHaveFocus();
  });

  it("allows Office to create and edit a Container", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByText("CONT-001");
    await user.click(screen.getByRole("button", { name: "Registrar contenedor" }));

    const createDialog = screen.getByRole("dialog");
    await user.type(screen.getByLabelText("Código"), "CONT-PANEL-01");
    await chooseCatalogOption(user, screen.getByLabelText("Tipo de contenedor en el formulario"), "Materiales reciclables");
    await chooseCatalogOption(user, screen.getByLabelText("Zona en el formulario"), "Palermo");
    await user.type(screen.getByLabelText("Capacidad (litros)"), "1500");
    const address = screen.getByLabelText("Dirección");
    await user.click(address);
    await user.paste("Av. Paseo Colón 850");
    await user.type(screen.getByLabelText("Latitud"), "-34.618");
    await user.type(screen.getByLabelText("Longitud"), "-58.369");

    await user.click(screen.getByRole("button", { name: "Guardar contenedor" }));

    expect(await screen.findByText("Contenedor registrado.")).toBeVisible();
    expect(createDialog).not.toBeVisible();
    expect(await screen.findByText("CONT-PANEL-01")).toBeVisible();

    // Edit container
    const createdRow = screen.getByRole("row", { name: /CONT-PANEL-01/ });
    await clickContainerAction(user, createdRow, "Editar");

    const editDialog = screen.getByRole("dialog");
    expect(within(editDialog).getByLabelText("Código")).toBeDisabled();
    expect(within(editDialog).getByLabelText("Tipo de contenedor en el formulario")).toBeDisabled();

    await user.clear(screen.getByLabelText("Dirección"));
    await user.paste("Av. Paseo Colón 900");
    await user.click(screen.getByRole("button", { name: "Guardar contenedor" }));

    expect(await screen.findByText("Contenedor actualizado.")).toBeVisible();
    expect(editDialog).not.toBeVisible();
    expect(screen.getByText("Av. Paseo Colón 900")).toBeVisible();
  });

  it("keeps management controls hidden for Field actors", async () => {
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar contenedor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reparación independiente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retirar contenedor" })).not.toBeInTheDocument();
    // Detail button remains accessible to Field
    expect(screen.getAllByRole("button", { name: /^Ver detalle de / }).length).toBeGreaterThan(0);
  });

  it("labels each container table cell for the Field-width list layout", async () => {
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    const row = await screen.findByRole("row", { name: /CONT-001/ });
    expect(Array.from(row.querySelectorAll("[data-label]"), (cell) => cell.getAttribute("data-label"))).toEqual([
      "Código",
      "Tipo",
      "Zona",
      "Dirección",
      "Capacidad",
      "Estado",
    ]);
    expect(within(row).getByRole("button", { name: "Ver detalle de CONT-001" })).toBeEnabled();
  });

  it("lets Office dispatch standalone repair and removal transitions", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("CONT-003")).toBeVisible();
    const damagedRow = screen.getByRole("row", { name: /CONT-003/ });

    await clickContainerAction(user, damagedRow, "Iniciar reparación");
    const startDialog = screen.getByRole("dialog");
    expect(within(startDialog).getByText("El contenedor pasa a En reparación.")).toBeVisible();
    await user.click(within(startDialog).getByRole("button", { name: "Iniciar reparación" }));

    const repairRow = screen.getByRole("row", { name: /CONT-003/ });
    expect(within(repairRow).getByText("En reparación")).toBeVisible();
    await clickContainerAction(user, repairRow, "Completar reparación");
    const completeDialog = await screen.findByRole("dialog");
    expect(within(completeDialog).getByText("El contenedor vuelve a Activo.")).toBeVisible();
    await user.click(within(completeDialog).getByRole("button", { name: "Confirmar reparación" }));

    const activeRow = screen.getByRole("row", { name: /CONT-003/ });
    expect(within(activeRow).getByText("Activo")).toBeVisible();

    // A fresh damaged fixture is used by the next test; this confirms no removal
    // action was rendered for the active state.
    await openContainerDetail(user, activeRow);
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Retirar contenedor" })).not.toBeInTheDocument();
  });

  it("keeps the repair action name stable and returns focus to container detail after repair starts", async () => {
    const user = userEvent.setup({ delay: null });
    const originalStartRepair = containersAdapter.startRepair.bind(containersAdapter);
    let releaseRepair!: () => void;
    const repairGate = new Promise<void>((resolve) => {
      releaseRepair = resolve;
    });
    vi.spyOn(containersAdapter, "startRepair").mockImplementation(async (containerId) => {
      await repairGate;
      return originalStartRepair(containerId);
    });

    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("row", { name: /CONT-003/ });
    const detailButton = within(row).getByRole("button", { name: "Ver detalle de CONT-003" });
    await user.click(detailButton);
    const detailDialog = screen.getByRole("dialog", { name: /Detalle del contenedor CONT-003/ });
    await user.click(within(detailDialog).getByRole("button", { name: "Iniciar reparación" }));

    const repairDialog = screen.getByRole("dialog", { name: /Iniciar reparación · CONT-003/ });
    const repairButton = within(repairDialog).getByRole("button", { name: "Iniciar reparación" });
    await user.click(repairButton);
    expect(repairButton).toHaveAttribute("aria-busy", "true");
    expect(repairButton).toHaveTextContent("Iniciar reparación");

    releaseRepair();
    expect(await screen.findByText("Reparación iniciada para el contenedor CONT-003.")).toBeVisible();
    await waitFor(() => expect(detailButton).toHaveFocus());
  });

  it("allows Office to remove a damaged container and hides lifecycle actions after removal", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("CONT-003")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-003/ });
    await clickContainerAction(user, row, "Retirar contenedor");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Retirar contenedor CONT-003/ })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Conservar contenedor CONT-003" })).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar retiro" }));

    const removedRow = screen.getByRole("row", { name: /CONT-003/ });
    expect(within(removedRow).getByText("Retirado")).toBeVisible();
    expect(within(removedRow).queryByRole("button", { name: /reparación|retirar/i })).not.toBeInTheDocument();
  });

  it("uploads repair evidence as flat Container evidence", async () => {
    const user = userEvent.setup({ delay: null });
    const evidenceOwners: string[] = [];
    server.use(
      http.post("*/api/evidence", async ({ request }) => {
        const formData = await withNodeFile(() => request.formData());
        evidenceOwners.push(String(formData.get("ownerType")));
        return HttpResponse.json({
          id: "att-repair-1",
          url: "/files/repair.png",
          filename: "repair.png",
          contentType: "image/png",
          uploadedAt: new Date().toISOString(),
        });
      }),
    );

    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("CONT-004")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-004/ });
    await clickContainerAction(user, row, "Completar reparación");
    const dialog = screen.getByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(["image-bytes"], "repair.png", { type: "image/png" }));
    await user.click(within(dialog).getByRole("button", { name: "Confirmar reparación" }));

    expect(await screen.findByText("Reparación completada: CONT-004.")).toBeVisible();
    expect(evidenceOwners).toEqual(["CONTAINER"]);
  });

  it("uploads removal evidence as flat Container evidence", async () => {
    const user = userEvent.setup({ delay: null });
    const evidenceOwners: string[] = [];
    server.use(
      http.post("*/api/evidence", async ({ request }) => {
        const formData = await withNodeFile(() => request.formData());
        evidenceOwners.push(String(formData.get("ownerType")));
        return HttpResponse.json({
          id: "att-removal-1",
          url: "/files/removal.pdf",
          filename: "removal.pdf",
          contentType: "application/pdf",
          uploadedAt: new Date().toISOString(),
        });
      }),
    );

    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("CONT-003")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-003/ });
    await clickContainerAction(user, row, "Retirar contenedor");
    const dialog = screen.getByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(["pdf-bytes"], "removal.pdf", { type: "application/pdf" }));
    await user.click(within(dialog).getByRole("button", { name: "Confirmar retiro" }));

    expect(await screen.findByText("Contenedor retirado: CONT-003.")).toBeVisible();
    expect(evidenceOwners).toEqual(["CONTAINER"]);
  });

  it("renders a retryable error state on load failure", async () => {
    server.use(
      http.get("*/api/containers", () =>
        HttpResponse.json(
          {
            statusCode: 500,
            message: "Fallo en el servidor de inventario.",
            error: "Internal Server Error",
            timestamp: new Date().toISOString(),
            path: "/api/containers",
          },
          { status: 500 },
        ),
      ),
    );

    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("Fallo en el servidor de inventario.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar carga" })).toBeVisible();
  });

  it("allows Field and Office actors with container:report to report overflow, transitioning ACTIVE -> OVERFLOWED", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();

    const row = screen.getByRole("row", { name: /CONT-001/ });
    const detail = await openContainerDetail(user, row);
    const overflowButton = within(detail).getByRole("button", { name: "Reportar desborde" });
    expect(overflowButton).toBeVisible();

    await user.click(overflowButton);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Reportar desborde de contenedor CONT-001/ })).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar desborde" }));

    expect(await screen.findByText("Desborde reportado: CONT-001.")).toBeVisible();

    // In the row, status badge is now OVERFLOWED
    const updatedRow = screen.getByRole("row", { name: /CONT-001/ });
    expect(within(updatedRow).getByText("Desbordado")).toBeVisible();

    // Report buttons are gone since status is no longer ACTIVE
    await openContainerDetail(user, updatedRow);
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Reportar desborde" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Reportar daño" })).not.toBeInTheDocument();
  });

  it("allows reporting container damage with damageType, severity, and requiresPublicWorks", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();

    const row = screen.getByRole("row", { name: /CONT-001/ });
    await clickContainerAction(user, row, "Reportar daño");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Reportar daño en contenedor CONT-001/ })).toBeVisible();

    await chooseCatalogOption(user, within(dialog).getByLabelText("Tipo de daño"), "Vandalizado");
    await chooseCatalogOption(user, within(dialog).getByLabelText("Severidad"), "Alta");
    await user.click(within(dialog).getByRole("checkbox", { name: /Requiere intervención de Obras Públicas/ }));

    await user.click(within(dialog).getByRole("button", { name: "Confirmar daño" }));

    expect(await screen.findByText("Daño registrado: CONT-001.")).toBeVisible();

    // In the row, status is now DAMAGED
    const updatedRow = screen.getByRole("row", { name: /CONT-001/ });
    expect(within(updatedRow).getByText("Dañado")).toBeVisible();

    // Verify detail reflects damage
    await openContainerDetail(user, updatedRow);
    const detailDialog = screen.getByRole("dialog");
    expect(within(detailDialog).getByText("Vandalizado")).toBeVisible();
    expect(within(detailDialog).getByText("Alta")).toBeVisible();
    expect(within(detailDialog).getByText("Sí (avisa a Obras Públicas)")).toBeVisible();
  });

  it("hides report buttons when actor lacks container:report or container is not ACTIVE", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.officeLimited} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();

    // officeLimited lacks container:report, so neither button is rendered
    const row = await screen.findByRole("row", { name: /CONT-001/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle de CONT-001" }));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Reportar desborde" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Reportar daño" })).not.toBeInTheDocument();
  });

  it("validates evidence file constraints as defense in depth", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-001/ });
    await clickContainerAction(user, row, "Reportar desborde");

    const dialog = screen.getByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(within(dialog).getByText("Evidencia adjunta")).toBeVisible();
    expect(
      within(dialog).getByText("Formatos JPEG, PNG, WebP o PDF hasta 4 MB."),
    ).toBeVisible();
    const pickerLabel = within(dialog).getByText("Seleccionar archivo").closest("label");
    expect(pickerLabel).toHaveAttribute("for", fileInput.id);
    fileInput.focus();
    expect(fileInput).toHaveFocus();

    // File > 4 MB
    const oversizedFile = new File(["x".repeat(100)], "huge-file.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", { value: 4 * 1024 * 1024 + 1 });

    // Invalid MIME type
    const invalidMimeFile = new File(["test content"], "script.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(fileInput, { target: { files: [oversizedFile, invalidMimeFile] } });

    expect(
      await within(dialog).findByText(
        /"huge-file.pdf" pesa más de 4 MB./,
        { exact: false },
      ),
    ).toBeVisible();
    expect(
      within(dialog).getByText(
        /"script.exe" no es una foto ni un PDF/,
        { exact: false },
      ),
    ).toBeVisible();
    expect(fileInput).toHaveAccessibleDescription(/huge-file.pdf.*script.exe/);
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/script.exe/);
  });

  it("uploads evidence after report and reuses idempotencyKey on retry", async () => {
    const user = userEvent.setup({ delay: null });
    const interceptedKeys: string[] = [];
    let evidenceShouldFail = true;

    server.use(
      http.post("*/api/evidence", ({ request }) => {
        const key = request.headers.get("Idempotency-Key") || request.headers.get("idempotency-key") || "";
        interceptedKeys.push(key);
        if (evidenceShouldFail) {
          return HttpResponse.json(
            {
              statusCode: 500,
              message: "Error temporal de almacenamiento",
              error: "Internal Server Error",
              timestamp: new Date().toISOString(),
              path: "/api/evidence",
            },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          id: "att-test-1",
          url: "/files/evidence-test.png",
          filename: "evidence-test.png",
          contentType: "image/png",
          uploadedAt: new Date().toISOString(),
        });
      }),
    );

    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-001/ });
    await clickContainerAction(user, row, "Reportar desborde");

    const dialog = screen.getByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;

    const validFile = new File(["image-bytes"], "photo.png", { type: "image/png" });
    await user.upload(fileInput, validFile);

    expect(within(dialog).getByText("photo.png")).toBeVisible();
    expect(within(dialog).getByText("Pendiente")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar desborde" }));

    // Report succeeded, but evidence upload failed with 500
    expect(await within(dialog).findByText("Error temporal de almacenamiento")).toBeVisible();
    const retryButton = within(dialog).getByRole("button", { name: "Reintentar" });
    expect(retryButton).toBeVisible();

    expect(interceptedKeys.length).toBe(1);
    const initialKey = interceptedKeys[0];
    expect(initialKey).toBeTruthy();

    // Now unblock evidence upload
    evidenceShouldFail = false;
    await user.click(retryButton);

    expect(await within(dialog).findByText("Subido")).toBeVisible();
    expect(interceptedKeys.length).toBe(2);
    // Key must be identical across retries
    expect(interceptedKeys[1]).toBe(initialKey);
  });

  it("handles authoritative backend 409 conflict without presenting false success", async () => {
    const user = userEvent.setup({ delay: null });

    server.use(
      http.post("*/api/containers/:id/report-overflow", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "El contenedor no se encuentra en estado Activo para reportar desborde.",
            error: "Conflict",
            timestamp: new Date().toISOString(),
            path: "/api/containers/cont-1/report-overflow",
          },
          { status: 409 },
        ),
      ),
    );

    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-001/ });
    await clickContainerAction(user, row, "Reportar desborde");

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar desborde" }));

    // Error is displayed in dialog alert
    expect(
      await within(dialog).findByText(
        "El contenedor no se encuentra en estado Activo para reportar desborde.",
      ),
    ).toBeVisible();

    // Dialog stays open
    expect(dialog).toBeVisible();

    // No false success notice
    expect(screen.queryByText(/Desborde reportado con éxito/)).not.toBeInTheDocument();
  });

  describe("Office emptying and relocation dispatch (#123)", () => {
    it("allows Field actor to empty an OVERFLOWED container (OVERFLOWED -> ACTIVE)", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

      expect(await screen.findByText("CONT-002")).toBeVisible();
      const row = screen.getByRole("row", { name: /CONT-002/ });
      expect(within(row).getByText("Desbordado")).toBeVisible();

      await clickContainerAction(user, row, "Vaciar contenedor");

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: /Registrar vaciado de contenedor CONT-002/i })).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "Confirmar vaciado" }));

      expect(await screen.findByText("Vaciado registrado: CONT-002.")).toBeVisible();
      const updatedRow = screen.getByRole("row", { name: /CONT-002/ });
      expect(within(updatedRow).getByText("Activo")).toBeVisible();
      await openContainerDetail(user, updatedRow);
      expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();
    });

    it("allows Office actor to initiate and confirm relocation (ACTIVE -> RELOCATING -> ACTIVE with new address)", { timeout: 15000 }, async () => {
      const user = userEvent.setup({ delay: null });
      render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

      expect(await screen.findByText("CONT-001")).toBeVisible();
      const initialRow = screen.getByRole("row", { name: /CONT-001/ });
      expect(within(initialRow).getByText("Activo")).toBeVisible();

      // Step 1: Start relocation
      await clickContainerAction(user, initialRow, "Reubicar");

      const startDialog = screen.getByRole("dialog");
      expect(within(startDialog).getByRole("heading", { name: /Iniciar reubicación de contenedor CONT-001/i })).toBeVisible();

      await user.click(within(startDialog).getByRole("button", { name: "Iniciar reubicación" }));

      expect(await screen.findByText("Proceso de reubicación iniciado para el contenedor CONT-001.")).toBeVisible();
      const relocatingRow = screen.getByRole("row", { name: /CONT-001/ });
      expect(within(relocatingRow).getByText("En reubicación")).toBeVisible();

      // Step 2: Confirm relocation with new address and coordinates
      await clickContainerAction(user, relocatingRow, "Confirmar ubicación");

      const confirmDialog = screen.getByRole("dialog");
      expect(within(confirmDialog).getByRole("heading", { name: /Confirmar nueva ubicación de contenedor CONT-001/i })).toBeVisible();

      const newAddress = within(confirmDialog).getByLabelText("Nueva dirección");
      await user.click(newAddress);
      await user.paste("Av. Callao 1500");
      await user.type(within(confirmDialog).getByLabelText("Latitud"), "-34.595");
      await user.type(within(confirmDialog).getByLabelText("Longitud"), "-58.390");

      await user.click(within(confirmDialog).getByRole("button", { name: "Confirmar ubicación" }));

      expect(await screen.findByText("Nueva ubicación confirmada: CONT-001.")).toBeVisible();
      const activeRow = screen.getByRole("row", { name: /CONT-001/ });
      expect(within(activeRow).getByText("Activo")).toBeVisible();
      expect(within(activeRow).getByText("Av. Callao 1500")).toBeVisible();
    });

    it("prevents duplicate standalone transition when an in-flight linked service exists", async () => {
      const user = userEvent.setup({ delay: null });
      server.use(
        http.get("*/api/services", () => {
          return HttpResponse.json({
            data: [
              {
                id: "SVC-9901",
                title: "Vaciado de contenedor CONT-002",
                serviceTypeId: "st-container-repair",
                serviceTypeName: "Vaciado de contenedor",
                mode: "POINT",
                status: "IN_PROGRESS",
                origin: "MANUAL",
                zoneIds: ["zone-2"],
                targetType: "CONTAINER",
                targetId: "cont-2",
                scheduledDate: "2026-09-06",
              },
            ],
            meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
          });
        }),
      );

      render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

      await screen.findByText("CONT-002");
      const row = screen.getByRole("row", { name: /CONT-002/ });
      const detail = await openContainerDetail(user, row);

      // Standalone "Vaciar contenedor" button must NOT be rendered
      expect(within(detail).queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();

      // Instead, in-flight badge must be rendered
      expect(await within(detail).findByText(/Servicio en curso \(SVC-9901\)/)).toBeVisible();
    });

    it("keeps relocation hidden for Field while allowing emptying", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

      expect(await screen.findByText("CONT-001")).toBeVisible();
      expect(screen.getByText("CONT-002")).toBeVisible();

      const activeDetail = await openContainerDetail(user, screen.getByRole("row", { name: /CONT-001/ }));
      expect(within(activeDetail).queryByRole("button", { name: "Reubicar" })).not.toBeInTheDocument();
      await user.keyboard("{Escape}");
      const overflowDetail = await openContainerDetail(user, screen.getByRole("row", { name: /CONT-002/ }));
      expect(within(overflowDetail).getByRole("button", { name: "Vaciar contenedor" })).toBeInTheDocument();
    });

    it("keeps standalone emptying and relocation dispatch hidden for Office actor without container:manage", async () => {
      const user = userEvent.setup({ delay: null });
      render(<ContainerCatalogPanel scenario={scenarios.officeLimited} />);

      expect(await screen.findByText("CONT-001")).toBeVisible();
      expect(screen.getByText("CONT-002")).toBeVisible();

      const activeDetail = await openContainerDetail(user, screen.getByRole("row", { name: /CONT-001/ }));
      expect(within(activeDetail).queryByRole("button", { name: "Reubicar" })).not.toBeInTheDocument();
      await user.keyboard("{Escape}");
      const overflowDetail = await openContainerDetail(user, screen.getByRole("row", { name: /CONT-002/ }));
      expect(within(overflowDetail).queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();
    });

    it("surfaces authoritative backend failure in emptying dialog without false success", async () => {
      const user = userEvent.setup({ delay: null });

      server.use(
        http.post("*/api/containers/:id/empty", () =>
          HttpResponse.json(
            {
              statusCode: 409,
              message: "Conflicto en el servidor: el contenedor ya fue procesado.",
              error: "Conflict",
              timestamp: new Date().toISOString(),
              path: "/api/containers/cont-2/empty",
            },
            { status: 409 },
          ),
        ),
      );

      render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

      expect(await screen.findByText("CONT-002")).toBeVisible();
      const row = screen.getByRole("row", { name: /CONT-002/ });
      await clickContainerAction(user, row, "Vaciar contenedor");

      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Confirmar vaciado" }));

      expect(
        await within(dialog).findByText(
          "Conflicto en el servidor: el contenedor ya fue procesado.",
        ),
      ).toBeVisible();
      expect(dialog).toBeVisible();
      expect(screen.queryByText(/Vaciado registrado con éxito/)).not.toBeInTheDocument();
    });
  });
});

describe("internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", async () => {
    const { container } = render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(1));

    expectNoInternalJargon(container);
  });
});
