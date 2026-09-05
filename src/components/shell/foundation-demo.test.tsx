import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { FoundationDemo } from "./foundation-demo";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
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
  it("renders the unauthenticated state on a 401 scenario response", async () => {
    server.use(
      http.get("*/api/mock/scenarios/office-duty-queue", () =>
        HttpResponse.json(documentedError(401, "La sesión no está activa."), { status: 401 })),
    );

    render(<FoundationDemo scenarioId="office-duty-queue" />);

    expect(await screen.findByText("Inicie sesión para continuar")).toBeVisible();
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
