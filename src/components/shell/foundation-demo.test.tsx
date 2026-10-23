import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { mockResponseAfter } from "@/mocks/delayed-response";
import { scenarios } from "@/lib/scenarios";
import { FoundationDemo } from "./foundation-demo";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function documentedError(statusCode: number, message: string) {
  return {
    statusCode,
    message,
    error: "Error",
    timestamp: new Date().toISOString(),
    path: "/api/mock/scenarios/office-duty-queue",
  };
}

describe("FoundationDemo", () => {
  it("keeps the frame visible while navigation and actor data load", async () => {
    server.use(http.get("*/api/mock/scenarios/office-duty-queue", () =>
      mockResponseAfter(150, () => HttpResponse.json(scenarios.officeDutyQueue))));
    render(<FoundationDemo scenarioId="office-duty-queue" />);
    const banner = screen.getByRole("banner");
    const navigation = screen.getByRole("navigation", { name: "Módulos" });
    const region = screen.getByRole("region", { name: "Navegación" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Cargando");
    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Servicios" })).not.toBeInTheDocument();
    expect(await within(navigation).findByRole("link", { name: "Servicios" })).toBeVisible();
    expect(region).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("banner")).toBe(banner);
    expect(screen.getByRole("navigation", { name: "Módulos" })).toBe(navigation);
  });

  it("renders the unauthenticated state on a 401 scenario response", async () => {
    server.use(
      http.get("*/api/mock/scenarios/office-duty-queue", () =>
        HttpResponse.json(documentedError(401, "La sesión no está activa."), { status: 401 })),
    );

    render(<FoundationDemo scenarioId="office-duty-queue" />);

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeVisible();
    expect(screen.queryByText("Inicie sesión para continuar")).not.toBeInTheDocument();
  });

  it("preserves the session and shows the forbidden state on a 403 scenario response, without a retry", async () => {
    server.use(
      http.get("*/api/mock/scenarios/office-duty-queue", () =>
        HttpResponse.json(documentedError(403, "La sesión no puede consultar este escenario."), { status: 403 })),
    );

    render(<FoundationDemo scenarioId="office-duty-queue" />);

    expect(await screen.findByText("Acceso no disponible")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reintentar carga" })).not.toBeInTheDocument();
  });

  it("recovers to the normal shell after a retryable network failure", async () => {
    const user = userEvent.setup();
    let callCount = 0;
    server.use(
      http.get("*/api/mock/scenarios/office-duty-queue", () => {
        callCount += 1;
        if (callCount === 1) return HttpResponse.error();
        return HttpResponse.json(scenarios.officeDutyQueue);
      }),
    );

    render(<FoundationDemo scenarioId="office-duty-queue" />);
    await user.click(await screen.findByRole("button", { name: "Reintentar carga" }));

    expect(await screen.findByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
  });
});
