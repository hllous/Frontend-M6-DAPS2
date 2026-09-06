import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { ContainerCatalogPanel } from "./container-catalog-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetContainerFixtures();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe("ContainerCatalogPanel", () => {
  it("lists Containers and filters them by status, type, zone, and search", async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Contenedores" })).toBeVisible();
    expect(screen.getByText("CONT-001")).toBeVisible();

    // Filter by type
    await user.selectOptions(screen.getByLabelText("Tipo de contenedor"), "RECYCLABLE");
    expect(await screen.findByText("CONT-002")).toBeVisible();
    expect(screen.queryByText("CONT-001")).not.toBeInTheDocument();

    // Filter by status
    await user.selectOptions(screen.getByLabelText("Estado"), "OVERFLOWED");
    expect(await screen.findByText("CONT-002")).toBeVisible();

    // Filter by zone
    await user.selectOptions(screen.getByLabelText("Zona"), "zone-2");
    expect(screen.getByText("CONT-002")).toBeVisible();

    // Reset filters
    await user.selectOptions(screen.getByLabelText("Tipo de contenedor"), "all");
    await user.selectOptions(screen.getByLabelText("Estado"), "all");
    await user.selectOptions(screen.getByLabelText("Zona"), "all");

    // Search filter
    await user.type(screen.getByLabelText("Buscar contenedor"), "Santa Fe");
    expect(await screen.findByText("CONT-002")).toBeVisible();
    expect(screen.queryByText("CONT-001")).not.toBeInTheDocument();
  });

  it("allows any actor to view Container detail including damage information", async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-003")).toBeVisible();

    const row = screen.getByRole("row", { name: /CONT-003/ });
    await user.click(within(row).getByRole("button", { name: "Ver detalle" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Detalle del contenedor CONT-003/ })).toBeVisible();
    expect(within(dialog).getByText("Dañado")).toBeVisible();
    expect(within(dialog).getByText("Tapa rota")).toBeVisible();
    expect(within(dialog).getByText("Media")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Cerrar detalle" }));
    expect(dialog).not.toBeVisible();
  });

  it("allows Office to create and edit a Container", { timeout: 10000 }, async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    await screen.findByText("CONT-001");
    await user.click(screen.getByRole("button", { name: "Registrar contenedor" }));

    const createDialog = screen.getByRole("dialog");
    await user.type(screen.getByLabelText("Código"), "CONT-PANEL-01");
    await user.selectOptions(screen.getByLabelText("Tipo de contenedor en el formulario"), "RECYCLABLE");
    await user.selectOptions(screen.getByLabelText("Zona en el formulario"), "zone-2");
    await user.type(screen.getByLabelText("Capacidad (litros)"), "1500");
    await user.type(screen.getByLabelText("Dirección"), "Av. Paseo Colón 850");
    await user.type(screen.getByLabelText("Latitud"), "-34.618");
    await user.type(screen.getByLabelText("Longitud"), "-58.369");

    await user.click(screen.getByRole("button", { name: "Guardar contenedor" }));

    expect(await screen.findByText("Contenedor registrado con éxito.")).toBeVisible();
    expect(createDialog).not.toBeVisible();
    expect(await screen.findByText("CONT-PANEL-01")).toBeVisible();

    // Edit container
    const createdRow = screen.getByRole("row", { name: /CONT-PANEL-01/ });
    await user.click(within(createdRow).getByRole("button", { name: "Editar" }));

    const editDialog = screen.getByRole("dialog");
    expect(within(editDialog).getByLabelText("Código")).toBeDisabled();
    expect(within(editDialog).getByLabelText("Tipo de contenedor en el formulario")).toBeDisabled();

    await user.clear(screen.getByLabelText("Dirección"));
    await user.type(screen.getByLabelText("Dirección"), "Av. Paseo Colón 900");
    await user.click(screen.getByRole("button", { name: "Guardar contenedor" }));

    expect(await screen.findByText("Contenedor actualizado con éxito.")).toBeVisible();
    expect(editDialog).not.toBeVisible();
    expect(screen.getByText("Av. Paseo Colón 900")).toBeVisible();
  });

  it("keeps management controls hidden for Field actors", async () => {
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Registrar contenedor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    // Detail button remains accessible to Field
    expect(screen.getAllByRole("button", { name: "Ver detalle" }).length).toBeGreaterThan(0);
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

  it("allows Field and Office actors with container:report to report overflow, transitioning ACTIVE -> OVERFLOWED", { timeout: 10000 }, async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();

    const row = screen.getByRole("row", { name: /CONT-001/ });
    const overflowButton = within(row).getByRole("button", { name: "Reportar desborde" });
    expect(overflowButton).toBeVisible();

    await user.click(overflowButton);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Reportar desborde de contenedor CONT-001/ })).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar desborde" }));

    expect(await screen.findByText("Desborde reportado con éxito para el contenedor CONT-001.")).toBeVisible();

    // In the row, status badge is now OVERFLOWED
    const updatedRow = screen.getByRole("row", { name: /CONT-001/ });
    expect(within(updatedRow).getByText("Desbordado")).toBeVisible();

    // Report buttons are gone since status is no longer ACTIVE
    expect(within(updatedRow).queryByRole("button", { name: "Reportar desborde" })).not.toBeInTheDocument();
    expect(within(updatedRow).queryByRole("button", { name: "Reportar daño" })).not.toBeInTheDocument();
  });

  it("allows reporting container damage with damageType, severity, and requiresPublicWorks", { timeout: 10000 }, async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();

    const row = screen.getByRole("row", { name: /CONT-001/ });
    await user.click(within(row).getByRole("button", { name: "Reportar daño" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Reportar daño en contenedor CONT-001/ })).toBeVisible();

    await user.selectOptions(within(dialog).getByLabelText("Tipo de daño"), "VANDALIZED");
    await user.selectOptions(within(dialog).getByLabelText("Severidad"), "HIGH");
    await user.click(within(dialog).getByLabelText(/Requiere intervención de Obras Públicas/));

    await user.click(within(dialog).getByRole("button", { name: "Confirmar daño" }));

    expect(await screen.findByText("Reporte de daño registrado con éxito para el contenedor CONT-001.")).toBeVisible();

    // In the row, status is now DAMAGED
    const updatedRow = screen.getByRole("row", { name: /CONT-001/ });
    expect(within(updatedRow).getByText("Dañado")).toBeVisible();

    // Verify detail reflects damage
    await user.click(within(updatedRow).getByRole("button", { name: "Ver detalle" }));
    const detailDialog = screen.getByRole("dialog");
    expect(within(detailDialog).getByText("Vandalizado")).toBeVisible();
    expect(within(detailDialog).getByText("Alta")).toBeVisible();
    expect(within(detailDialog).getByText(/Sí \(notificación a M3\)/)).toBeVisible();
  });

  it("hides report buttons when actor lacks container:report or container is not ACTIVE", async () => {
    render(<ContainerCatalogPanel scenario={scenarios.officeLimited} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();

    // officeLimited lacks container:report, so neither button is rendered
    expect(screen.queryByRole("button", { name: "Reportar desborde" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reportar daño" })).not.toBeInTheDocument();
  });

  it("validates evidence file constraints as defense in depth", async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.fieldCrewMember} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-001/ });
    await user.click(within(row).getByRole("button", { name: "Reportar desborde" }));

    const dialog = screen.getByRole("dialog");
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // File > 10MB
    const oversizedFile = new File(["x".repeat(100)], "huge-file.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", { value: 11 * 1024 * 1024 });

    // Invalid MIME type
    const invalidMimeFile = new File(["test content"], "script.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(fileInput, { target: { files: [oversizedFile, invalidMimeFile] } });

    expect(
      await within(dialog).findByText(
        /"huge-file.pdf" supera el tamaño máximo permitido de 10 MB\./,
        { exact: false },
      ),
    ).toBeVisible();
    expect(
      within(dialog).getByText(
        /"script.exe" tiene un formato no permitido/,
        { exact: false },
      ),
    ).toBeVisible();
  });

  it("uploads evidence after report and reuses idempotencyKey on retry", { timeout: 10000 }, async () => {
    const user = userEvent.setup();
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
    await user.click(within(row).getByRole("button", { name: "Reportar desborde" }));

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
    const user = userEvent.setup();

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

    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("CONT-001")).toBeVisible();
    const row = screen.getByRole("row", { name: /CONT-001/ });
    await user.click(within(row).getByRole("button", { name: "Reportar desborde" }));

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
    it("allows Office actor to empty an OVERFLOWED container (OVERFLOWED -> ACTIVE)", { timeout: 10000 }, async () => {
      const user = userEvent.setup();
      render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

      expect(await screen.findByText("CONT-002")).toBeVisible();
      const row = screen.getByRole("row", { name: /CONT-002/ });
      expect(within(row).getByText("Desbordado")).toBeVisible();

      const emptyButton = within(row).getByRole("button", { name: "Vaciar contenedor" });
      await user.click(emptyButton);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: /Registrar vaciado de contenedor CONT-002/i })).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "Confirmar vaciado" }));

      expect(await screen.findByText("Vaciado registrado con éxito para el contenedor CONT-002.")).toBeVisible();
      const updatedRow = screen.getByRole("row", { name: /CONT-002/ });
      expect(within(updatedRow).getByText("Activo")).toBeVisible();
      expect(within(updatedRow).queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();
    });

    it("allows Office actor to initiate and confirm relocation (ACTIVE -> RELOCATING -> ACTIVE with new address)", { timeout: 15000 }, async () => {
      const user = userEvent.setup();
      render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

      expect(await screen.findByText("CONT-001")).toBeVisible();
      const initialRow = screen.getByRole("row", { name: /CONT-001/ });
      expect(within(initialRow).getByText("Activo")).toBeVisible();

      // Step 1: Start relocation
      const relocateButton = within(initialRow).getByRole("button", { name: "Reubicar" });
      await user.click(relocateButton);

      const startDialog = screen.getByRole("dialog");
      expect(within(startDialog).getByRole("heading", { name: /Iniciar reubicación de contenedor CONT-001/i })).toBeVisible();

      await user.click(within(startDialog).getByRole("button", { name: "Iniciar reubicación" }));

      expect(await screen.findByText("Proceso de reubicación iniciado para el contenedor CONT-001.")).toBeVisible();
      const relocatingRow = screen.getByRole("row", { name: /CONT-001/ });
      expect(within(relocatingRow).getByText("En reubicación")).toBeVisible();

      // Step 2: Confirm relocation with new address and coordinates
      const confirmButton = within(relocatingRow).getByRole("button", { name: "Confirmar ubicación" });
      await user.click(confirmButton);

      const confirmDialog = screen.getByRole("dialog");
      expect(within(confirmDialog).getByRole("heading", { name: /Confirmar nueva ubicación de contenedor CONT-001/i })).toBeVisible();

      await user.type(within(confirmDialog).getByLabelText("Nueva dirección"), "Av. Callao 1500");
      await user.type(within(confirmDialog).getByLabelText("Latitud"), "-34.595");
      await user.type(within(confirmDialog).getByLabelText("Longitud"), "-58.390");

      await user.click(within(confirmDialog).getByRole("button", { name: "Confirmar ubicación" }));

      expect(await screen.findByText("Nueva ubicación confirmada con éxito para el contenedor CONT-001.")).toBeVisible();
      const activeRow = screen.getByRole("row", { name: /CONT-001/ });
      expect(within(activeRow).getByText("Activo")).toBeVisible();
      expect(within(activeRow).getByText("Av. Callao 1500")).toBeVisible();
    });

    it("prevents duplicate standalone transition when an in-flight linked service exists", async () => {
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

      render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

      expect(await screen.findByTestId("in-flight-badge-cont-2")).toBeVisible();
      const row = screen.getByRole("row", { name: /CONT-002/ });

      // Standalone "Vaciar contenedor" button must NOT be rendered
      expect(within(row).queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();

      // Instead, in-flight badge must be rendered
      expect(within(row).getByText(/Servicio en curso \(SVC-9901\)/)).toBeVisible();
    });

    it("keeps standalone emptying and relocation dispatch hidden for Field actors", async () => {
      render(<ContainerCatalogPanel scenario={scenarios.fieldCrewLeader} />);

      expect(await screen.findByText("CONT-001")).toBeVisible();
      expect(screen.getByText("CONT-002")).toBeVisible();

      expect(screen.queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reubicar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Confirmar ubicación" })).not.toBeInTheDocument();
    });

    it("keeps standalone emptying and relocation dispatch hidden for Office actor without container:manage", async () => {
      render(<ContainerCatalogPanel scenario={scenarios.officeLimited} />);

      expect(await screen.findByText("CONT-001")).toBeVisible();
      expect(screen.getByText("CONT-002")).toBeVisible();

      expect(screen.queryByRole("button", { name: "Vaciar contenedor" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reubicar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Confirmar ubicación" })).not.toBeInTheDocument();
    });

    it("surfaces authoritative backend failure in emptying dialog without false success", async () => {
      const user = userEvent.setup();

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

      render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

      expect(await screen.findByText("CONT-002")).toBeVisible();
      const row = screen.getByRole("row", { name: /CONT-002/ });
      await user.click(within(row).getByRole("button", { name: "Vaciar contenedor" }));

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
