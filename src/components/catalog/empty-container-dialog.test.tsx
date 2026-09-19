import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import type { Container } from "@/lib/containers";
import { EmptyContainerDialog } from "./empty-container-dialog";

const overflowedContainer: Container = {
  id: "cont-test-2",
  code: "CONT-TEST-002",
  containerType: "RECYCLABLE",
  zoneId: "zone-2",
  address: "Av. Santa Fe 3400",
  lat: -34.588,
  lng: -58.411,
  capacityLiters: 2400,
  status: "OVERFLOWED",
};

const server = setupServer(
  http.post("*/api/containers/:id/empty", ({ params }) => {
    return HttpResponse.json({
      ...overflowedContainer,
      id: params.id,
      status: "ACTIVE",
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("EmptyContainerDialog", () => {
  it("renders container details and handles successful emptying transition", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <EmptyContainerDialog
        open={true}
        onOpenChange={onOpenChange}
        container={overflowedContainer}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByRole("heading", { name: /Registrar vaciado de contenedor CONT-TEST-002/i })).toBeVisible();
    expect(screen.getByText("Av. Santa Fe 3400")).toBeVisible();
    expect(screen.getByText(/2\.400 L/)).toBeVisible();

    const confirmButton = screen.getByRole("button", { name: "Confirmar vaciado" });
    await user.click(confirmButton);

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cont-test-2",
        status: "ACTIVE",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("displays actionable error message and remains open on backend 409 conflict", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    server.use(
      http.post("*/api/containers/:id/empty", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "Solo se puede vaciar un contenedor en estado desbordado.",
            error: "Conflict",
            timestamp: new Date().toISOString(),
            path: "/api/containers/cont-test-2/empty",
          },
          { status: 409 },
        ),
      ),
    );

    render(
      <EmptyContainerDialog
        open={true}
        onOpenChange={onOpenChange}
        container={overflowedContainer}
        onSuccess={onSuccess}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Confirmar vaciado" });
    await user.click(confirmButton);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Solo se puede vaciar un contenedor en estado desbordado.")).toBeVisible();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes dialog when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <EmptyContainerDialog
        open={true}
        onOpenChange={onOpenChange}
        container={overflowedContainer}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
