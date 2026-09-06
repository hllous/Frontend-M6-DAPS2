import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import type { Container } from "@/lib/containers";
import { StartRelocationDialog } from "./start-relocation-dialog";

const activeContainer: Container = {
  id: "cont-test-1",
  code: "CONT-TEST-001",
  containerType: "HOUSEHOLD",
  zoneId: "zone-1",
  address: "Av. Rivadavia 1200",
  lat: -34.6083,
  lng: -58.3712,
  capacityLiters: 1100,
  status: "ACTIVE",
};

const server = setupServer(
  http.post("*/api/containers/:id/relocate", ({ params }) => {
    return HttpResponse.json({
      ...activeContainer,
      id: params.id,
      status: "RELOCATING",
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("StartRelocationDialog", () => {
  it("renders container details and handles initiating relocation transition", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <StartRelocationDialog
        open={true}
        onOpenChange={onOpenChange}
        container={activeContainer}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByRole("heading", { name: /Iniciar reubicación de contenedor CONT-TEST-001/i })).toBeVisible();
    expect(screen.getByText("Av. Rivadavia 1200")).toBeVisible();

    const confirmButton = screen.getByRole("button", { name: "Iniciar reubicación" });
    await user.click(confirmButton);

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cont-test-1",
        status: "RELOCATING",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("displays actionable error message on backend 409 conflict and remains open", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    server.use(
      http.post("*/api/containers/:id/relocate", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "Solo se puede iniciar la reubicación en contenedores activos.",
            error: "Conflict",
            timestamp: new Date().toISOString(),
            path: "/api/containers/cont-test-1/relocate",
          },
          { status: 409 },
        ),
      ),
    );

    render(
      <StartRelocationDialog
        open={true}
        onOpenChange={onOpenChange}
        container={activeContainer}
        onSuccess={onSuccess}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Iniciar reubicación" });
    await user.click(confirmButton);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Solo se puede iniciar la reubicación en contenedores activos.")).toBeVisible();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes dialog when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <StartRelocationDialog
        open={true}
        onOpenChange={onOpenChange}
        container={activeContainer}
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
