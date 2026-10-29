import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { ZonesPanel } from "./zones-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function documentedError(statusCode: number, message: string) {
  return { statusCode, message, error: "Error", timestamp: new Date().toISOString(), path: "/zones" };
}

describe("ZonesPanel", () => {
  it("shows a loading state before the read resolves", () => {
    render(<ZonesPanel />);

    expect(screen.getByLabelText("Cargando zonas operativas")).toBeVisible();
  });

  it("renders the fixture zones on a successful read", async () => {
    render(<ZonesPanel />);

    expect(await screen.findByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    expect(screen.getByText("Belgrano")).toBeVisible();
    expect(screen.queryByText(/Z-BEL/)).not.toBeInTheDocument();
  });

  it("groups zones under a heading per commune in numeric order, with Comuna 2 before Comuna 10", async () => {
    const zone = (id: string, name: string, commune: string) => ({ id, code: id, name, active: true, commune: { id: commune, code: commune, name: commune } });
    server.use(
      http.get("*/api/zones", () =>
        HttpResponse.json({
          data: [zone("a", "Parque Chacabuco", "Comuna 10"), zone("b", "Recoleta", "Comuna 2"), zone("c", "Retiro", "Comuna 1")],
          meta: { total: 3, page: 1, pageSize: 100, totalPages: 1 },
        }),
      ),
    );

    render(<ZonesPanel />);

    const headings = await screen.findAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["Comuna 1", "Comuna 2", "Comuna 10"]);
  });

  it("renders an empty state when the adapter returns no zones", async () => {
    server.use(
      http.get("*/api/zones", () =>
        HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
      ),
    );

    render(<ZonesPanel />);

    expect(await screen.findByText("Sin zonas operativas")).toBeVisible();
    expect(screen.queryByText("No hay zonas registradas para mostrar.")).not.toBeInTheDocument();
  });

  it("renders a retryable error state when the read fails", async () => {
    server.use(http.get("*/api/zones", () => HttpResponse.json({ oops: true }, { status: 500 })));

    render(<ZonesPanel />);

    expect(await screen.findByText("No se pudieron cargar las zonas")).toBeVisible();
    expect(screen.getByText("Revise la conexión e intente nuevamente.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar carga" })).toBeVisible();
  });

  it("renders the unauthenticated state on a 401 and never shows zone data", async () => {
    server.use(
      http.get("*/api/zones", () => HttpResponse.json(documentedError(401, "La sesión no está activa."), { status: 401 })),
    );

    render(<ZonesPanel />);

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeVisible();
    expect(screen.queryByText("Inicie sesión para continuar")).not.toBeInTheDocument();
    expect(screen.queryByText("La aplicación operativa requiere una sesión activa.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Z-BEL/)).not.toBeInTheDocument();
  });

  it("renders the forbidden state on a 403 without offering a retry", async () => {
    server.use(
      http.get("*/api/zones", () => HttpResponse.json(documentedError(403, "No autorizado."), { status: 403 })),
    );

    render(<ZonesPanel />);

    expect(await screen.findByText("Acceso no disponible")).toBeVisible();
    expect(screen.getByText("No tiene permiso para ver esta sección.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reintentar carga" })).not.toBeInTheDocument();
  });

  it("recovers to the normal read path after a retryable network failure", async () => {
    const user = userEvent.setup();
    let callCount = 0;
    server.use(
      http.get("*/api/zones", () => {
        callCount += 1;
        if (callCount === 1) return HttpResponse.error();
        return HttpResponse.json({
          data: [{ id: "zone-1", code: "Z-01", name: "Zona Norte", active: true, neighborhoodIds: [] }],
          meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
        });
      }),
    );

    render(<ZonesPanel />);
    await user.click(await screen.findByRole("button", { name: "Reintentar carga" }));

    expect(await screen.findByRole("heading", { name: "Zonas operativas" })).toBeVisible();
  });
});
