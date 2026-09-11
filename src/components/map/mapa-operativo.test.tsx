import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { MapaOperativo } from "./mapa-operativo";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MapaOperativo", () => {
  it("presents every point layer with a synchronized accessible list", async () => {
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    expect(screen.getByRole("status", { name: "Cargando mapa operativo" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Elementos visibles" })).toBeInTheDocument();
    expect(screen.getByText("CONT-002")).toBeInTheDocument();
    expect(screen.getByText("Punto verde Plaza Mitre")).toBeInTheDocument();
    expect(screen.getByText("Parque del Bicentenario")).toBeInTheDocument();
    expect(screen.getByText("ARB-00442")).toBeInTheDocument();
    expect(screen.getByText(/Riesgo alto/)).toBeInTheDocument();
    expect(screen.getByText(/Sin relevamiento/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /OpenStreetMap contributors/ })).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: /Contenedores/ }));

    expect(screen.queryByText("CONT-002")).not.toBeInTheDocument();
    expect(screen.getByText("Punto verde Plaza Mitre")).toBeInTheDocument();
  });

  it("explains how to recover when territorial data cannot be loaded", async () => {
    server.use(
      http.get("*/api/containers", () =>
        HttpResponse.json(
          {
            statusCode: 503,
            message: "Servicio no disponible.",
            error: "Service Unavailable",
            timestamp: new Date().toISOString(),
            path: "/api/containers",
          },
          { status: 503 },
        ),
      ),
    );

    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText("El mapa no está disponible")).toBeVisible();
    expect(screen.getByText(/Revise la conexión e intente nuevamente/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});
