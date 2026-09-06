import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import type { Container } from "@/lib/containers";
import { ConfirmRelocationDialog } from "./confirm-relocation-dialog";

const relocatingContainer: Container = {
  id: "cont-test-5",
  code: "CONT-TEST-005",
  containerType: "HOUSEHOLD",
  zoneId: "zone-1",
  address: "Av. Corrientes 4500",
  lat: -34.602,
  lng: -58.428,
  capacityLiters: 1100,
  status: "RELOCATING",
};

const server = setupServer(
  http.post("*/api/containers/:id/confirm-relocation", async ({ params, request }) => {
    const body = (await request.json()) as { address: string; lat: number; lng: number };
    return HttpResponse.json({
      ...relocatingContainer,
      id: params.id,
      status: "ACTIVE",
      address: body.address,
      lat: body.lat,
      lng: body.lng,
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("ConfirmRelocationDialog", () => {
  it("validates required fields client-side before sending", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <ConfirmRelocationDialog
        open={true}
        onOpenChange={vi.fn()}
        container={relocatingContainer}
        onSuccess={onSuccess}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Confirmar ubicación" });
    await user.click(submitButton);

    expect(await screen.findByText("La nueva dirección es obligatoria.")).toBeVisible();
    expect(screen.getByText("Indique una latitud numérica válida.")).toBeVisible();
    expect(screen.getByText("Indique una longitud numérica válida.")).toBeVisible();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("submits valid new location and returns updated container in ACTIVE state", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ConfirmRelocationDialog
        open={true}
        onOpenChange={onOpenChange}
        container={relocatingContainer}
        onSuccess={onSuccess}
      />,
    );

    await user.type(screen.getByLabelText("Nueva dirección"), "Av. La Plata 1250");
    await user.type(screen.getByLabelText("Latitud"), "-34.625");
    await user.type(screen.getByLabelText("Longitud"), "-58.43");

    await user.click(screen.getByRole("button", { name: "Confirmar ubicación" }));

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cont-test-5",
        status: "ACTIVE",
        address: "Av. La Plata 1250",
        lat: -34.625,
        lng: -58.43,
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("surfaces authoritative backend rejection without claiming false success", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    server.use(
      http.post("*/api/containers/:id/confirm-relocation", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "Solo se puede confirmar la reubicación en contenedores en estado de reubicación.",
            error: "Conflict",
            timestamp: new Date().toISOString(),
            path: "/api/containers/cont-test-5/confirm-relocation",
          },
          { status: 409 },
        ),
      ),
    );

    render(
      <ConfirmRelocationDialog
        open={true}
        onOpenChange={onOpenChange}
        container={relocatingContainer}
        onSuccess={onSuccess}
      />,
    );

    await user.type(screen.getByLabelText("Nueva dirección"), "Av. La Plata 1250");
    await user.type(screen.getByLabelText("Latitud"), "-34.625");
    await user.type(screen.getByLabelText("Longitud"), "-58.43");

    await user.click(screen.getByRole("button", { name: "Confirmar ubicación" }));

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByText(
        "Solo se puede confirmar la reubicación en contenedores en estado de reubicación.",
      ),
    ).toBeVisible();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("supports keyboard interactions and proper aria attributes for screen readers", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ConfirmRelocationDialog
        open={true}
        onOpenChange={onOpenChange}
        container={relocatingContainer}
        onSuccess={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");

    const addressInput = screen.getByLabelText("Nueva dirección");
    expect(addressInput).toHaveAttribute("aria-invalid", "false");

    await user.click(screen.getByRole("button", { name: "Confirmar ubicación" }));
    expect(addressInput).toHaveAttribute("aria-invalid", "true");
    expect(addressInput).toHaveAttribute("aria-describedby", "relocation-address-error");

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
