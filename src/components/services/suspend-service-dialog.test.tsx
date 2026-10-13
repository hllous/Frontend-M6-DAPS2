import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { useState } from "react";

import { handlers } from "@/mocks/handlers";
import type { Service } from "@/lib/services";
import { SuspendServiceDialog } from "./suspend-service-dialog";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  localStorage.clear();
});
afterAll(() => server.close());

const service: Service = {
  id: "svc-suspend-evidence-retry-387",
  serviceTypeId: "type-suspend-evidence-retry-387",
  serviceTypeName: "Barrido mecánico",
  title: "Barrido mecánico — Zona Centro",
  mode: "ROUTE",
  status: "IN_PROGRESS",
  origin: "PLANNED",
  zoneIds: ["zone-suspend-evidence-retry-387"],
  zoneNames: ["Zona Centro"],
  scheduledDate: "2026-10-12",
  windowFrom: "08:00",
  windowTo: "12:00",
  crewId: "crew-suspend-evidence-retry-387",
  crewName: "Cuadrilla Centro",
  coordinates: { x: 50, y: 50 },
  attachments: [],
  history: [],
};

function errorResponse(statusCode: number, message: string) {
  return {
    statusCode,
    message,
    error: "Unprocessable Entity",
    timestamp: "2026-10-12T12:00:00.000Z",
    path: "/api/evidence",
  };
}

function ControlledSuspendServiceDialog({
  onOpenChange,
  onSuspended,
}: {
  onOpenChange: (open: boolean) => void;
  onSuspended: (updatedService: Service) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <SuspendServiceDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        setOpen(nextOpen);
      }}
      service={service}
      onSuspended={onSuspended}
    />
  );
}

describe("SuspendServiceDialog", () => {
  it("explains that the note is sent with the reason within the combined 500-character limit", () => {
    render(
      <ControlledSuspendServiceDialog
        onOpenChange={vi.fn()}
        onSuspended={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Obligatoria. Se envía junto con el motivo seleccionado; entre ambos no pueden superar los 500 caracteres.",
      ),
    ).toBeVisible();
  });

  it("keeps a suspended service open after an evidence upload fails and closes after retry", async () => {
    let suspendAttempts = 0;
    let uploadAttempts = 0;
    const idempotencyKeys: string[] = [];
    server.use(
      http.post("*/api/services/:serviceId/suspend", () => {
        suspendAttempts += 1;
        return HttpResponse.json({ ...service, status: "SUSPENDED", statusReason: "Desperfecto vehicular" });
      }),
      http.post("*/api/evidence", ({ request }) => {
        uploadAttempts += 1;
        idempotencyKeys.push(request.headers.get("Idempotency-Key") ?? "");
        if (uploadAttempts === 1) {
          return HttpResponse.json(errorResponse(422, "No se pudo validar el archivo."), { status: 422 });
        }
        return HttpResponse.json({
          id: "attachment-suspend-evidence-retry-387",
          url: "https://evidence.example.com/evidencia.jpg",
          filename: "evidencia.jpg",
          contentType: "image/jpeg",
          uploadedAt: "2026-10-12T12:01:00.000Z",
        });
      }),
    );
    const onOpenChange = vi.fn();
    const onSuspended = vi.fn();
    const user = userEvent.setup();

    render(
      <ControlledSuspendServiceDialog onOpenChange={onOpenChange} onSuspended={onSuspended} />,
    );

    await user.selectOptions(screen.getByLabelText(/Motivo de suspensión/i), "VEHICLE_BREAKDOWN");
    await user.type(screen.getByLabelText(/^Nota/), "Desperfecto en el vehículo asignado.");
    await user.upload(
      screen.getByLabelText("Seleccionar archivo"),
      new File(["foto"], "evidencia.jpg", { type: "image/jpeg" }),
    );
    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));

    await waitFor(() => expect(suspendAttempts).toBe(1));
    expect(uploadAttempts).toBe(1);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Servicio suspendido; falta subir 1 archivo",
    );
    expect(screen.getByText("No se pudo validar el archivo.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Suspender servicio" })).not.toBeInTheDocument();
    expect(onSuspended).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(onSuspended).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(uploadAttempts).toBe(2);
    expect(idempotencyKeys[0]).toBeTruthy();
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  });

  it("retries only failed uploads when another evidence file already succeeded", async () => {
    let uploadAttempts = 0;
    const idempotencyKeys: string[] = [];
    const onOpenChange = vi.fn();
    const onSuspended = vi.fn();
    server.use(
      http.post("*/api/services/:serviceId/suspend", () =>
        HttpResponse.json({ ...service, status: "SUSPENDED", statusReason: "Desperfecto vehicular" }),
      ),
      http.post("*/api/evidence", ({ request }) => {
        uploadAttempts += 1;
        idempotencyKeys.push(request.headers.get("Idempotency-Key") ?? "");
        if (uploadAttempts === 1) {
          return HttpResponse.json(errorResponse(422, "No se pudo validar el archivo."), { status: 422 });
        }
        return HttpResponse.json({
          id: `attachment-suspend-evidence-retry-${uploadAttempts}`,
          url: "https://evidence.example.com/evidencia.jpg",
          filename: `evidencia-${uploadAttempts}.jpg`,
          contentType: "image/jpeg",
          uploadedAt: "2026-10-12T12:01:00.000Z",
        });
      }),
    );
    const user = userEvent.setup();

    render(
      <ControlledSuspendServiceDialog onOpenChange={onOpenChange} onSuspended={onSuspended} />,
    );
    await user.selectOptions(screen.getByLabelText(/Motivo de suspensión/i), "VEHICLE_BREAKDOWN");
    await user.type(screen.getByLabelText(/^Nota/), "Desperfecto en el vehículo asignado.");
    await user.upload(screen.getByLabelText("Seleccionar archivo"), [
      new File(["foto 1"], "evidencia-1.jpg", { type: "image/jpeg" }),
      new File(["foto 2"], "evidencia-2.jpg", { type: "image/jpeg" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Servicio suspendido; falta subir 1 archivo",
    );
    expect(uploadAttempts).toBe(2);
    await user.click(screen.getByRole("button", { name: "Reintentar archivos pendientes" }));

    await waitFor(() => {
      expect(onSuspended).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(uploadAttempts).toBe(3);
    expect(idempotencyKeys[0]).toBeTruthy();
    expect(idempotencyKeys[1]).toBeTruthy();
    expect(idempotencyKeys[1]).not.toBe(idempotencyKeys[0]);
    expect(idempotencyKeys[2]).toBe(idempotencyKeys[0]);
  });

  it("closes after the suspension and every evidence upload succeed", async () => {
    const onOpenChange = vi.fn();
    const onSuspended = vi.fn();
    server.use(
      http.post("*/api/services/:serviceId/suspend", () =>
        HttpResponse.json({ ...service, status: "SUSPENDED", statusReason: "Desperfecto vehicular" }),
      ),
      http.post("*/api/evidence", () =>
        HttpResponse.json({
          id: "attachment-suspend-evidence-success-387",
          url: "https://evidence.example.com/evidencia.jpg",
          filename: "evidencia.jpg",
          contentType: "image/jpeg",
          uploadedAt: "2026-10-12T12:01:00.000Z",
        }),
      ),
    );
    const user = userEvent.setup();

    render(
      <ControlledSuspendServiceDialog onOpenChange={onOpenChange} onSuspended={onSuspended} />,
    );
    await user.selectOptions(screen.getByLabelText(/Motivo de suspensión/i), "VEHICLE_BREAKDOWN");
    await user.type(screen.getByLabelText(/^Nota/), "Desperfecto en el vehículo asignado.");
    await user.upload(
      screen.getByLabelText("Seleccionar archivo"),
      new File(["foto"], "evidencia.jpg", { type: "image/jpeg" }),
    );
    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));

    await waitFor(() => {
      expect(onSuspended).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation before discarding failed evidence and then closes", async () => {
    const onOpenChange = vi.fn();
    const onSuspended = vi.fn();
    let uploadAttempts = 0;
    server.use(
      http.post("*/api/services/:serviceId/suspend", () =>
        HttpResponse.json({ ...service, status: "SUSPENDED", statusReason: "Desperfecto vehicular" }),
      ),
      http.post("*/api/evidence", () => {
        uploadAttempts += 1;
        return HttpResponse.json(errorResponse(422, "No se pudo validar el archivo."), { status: 422 });
      }),
    );
    const user = userEvent.setup();

    render(
      <ControlledSuspendServiceDialog onOpenChange={onOpenChange} onSuspended={onSuspended} />,
    );
    await user.selectOptions(screen.getByLabelText(/Motivo de suspensión/i), "VEHICLE_BREAKDOWN");
    await user.type(screen.getByLabelText(/^Nota/), "Desperfecto en el vehículo asignado.");
    await user.upload(
      screen.getByLabelText("Seleccionar archivo"),
      new File(["foto"], "evidencia.jpg", { type: "image/jpeg" }),
    );
    await user.click(screen.getByRole("button", { name: "Suspender servicio" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Servicio suspendido; falta subir 1 archivo",
    );
    await user.click(screen.getByRole("button", { name: "Descartar archivos pendientes" }));

    const confirmation = screen.getByRole("dialog", { name: "Descartar archivos pendientes" });
    expect(confirmation).toHaveTextContent("Los archivos pendientes no se enviarán");
    expect(onSuspended).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar descarte" }));

    await waitFor(() => {
      expect(onSuspended).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(uploadAttempts).toBe(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
