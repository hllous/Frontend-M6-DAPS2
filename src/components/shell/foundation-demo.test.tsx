import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as navigation from "next/navigation";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { mockResponseAfter } from "@/mocks/delayed-response";
import { ROLES_STALE_EVENT } from "@/lib/authenticated-fetch";
import { scenarioForRoles, scenarios } from "@/lib/scenarios";
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

  it("explains the Backend message on a 403 without a code (a citizen token), not a generic error", async () => {
    server.use(
      http.get("*/api/mock/scenarios/office-duty-queue", () =>
        HttpResponse.json(documentedError(403, "Este sistema es solo para personal municipal."), { status: 403 })),
    );

    render(<FoundationDemo scenarioId="office-duty-queue" />);

    expect(await screen.findByText("Acceso no disponible")).toBeVisible();
    expect(screen.getByText("Este sistema es solo para personal municipal.")).toBeVisible();
  });

  it("says the user has no M6 role yet instead of showing an error or an empty shell", async () => {
    server.use(http.get("*/api/mock/scenarios/office-duty-queue", () =>
      HttpResponse.json(scenarioForRoles(scenarios.officeDutyQueue, []))));

    render(<FoundationDemo scenarioId="office-duty-queue" />);

    expect(await screen.findByText("Sin rol asignado")).toBeVisible();
    expect(screen.getByText("Su usuario aún no tiene un rol asignado en Ambiente. Solicite a un administrador que se lo asigne y vuelva a ingresar.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reintentar carga" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Servicios" })).not.toBeInTheDocument();
  });

  it("re-reads the roles after a ROLE_REQUIRED 403 and recomputes the actor without reloading", async () => {
    const refresh = vi.fn();
    const router = navigation.useRouter();
    vi.spyOn(navigation, "useRouter").mockReturnValue({ ...router, refresh });
    server.use(
      http.get("*/api/mock/scenarios/office-duty-queue", () => HttpResponse.json(scenarios.officeDutyQueue)),
      http.get("*/api/me", () => HttpResponse.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: ["M6_CAMPO_CUADRILLA"] })),
    );
    render(<FoundationDemo scenarioId="office-duty-queue" />);
    expect(await screen.findAllByText("Oficina")).not.toHaveLength(0);

    act(() => { window.dispatchEvent(new Event(ROLES_STALE_EVENT)); });

    expect(await screen.findAllByText("Integrante de cuadrilla")).not.toHaveLength(0);
    expect(screen.queryByText("Oficina")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it("updates the Field crew and member actions after an activity pulse", async () => {
    server.use(
      http.get("*/api/mock/scenarios/field-crew-leader-route", () => HttpResponse.json(scenarios.fieldCrewLeader)),
      http.get("*/api/session", () => HttpResponse.json({ session: { mode: "backend-development", roles: ["M6_CAMPO_CUADRILLA"], crew: { id: "crew-c", name: "Cuadrilla nueva" }, fieldRole: "CREW_MEMBER" } })),
    );
    render(<FoundationDemo scenarioId="field-crew-leader-route" />);
    expect(await screen.findByText(/Cuadrilla B · Fernández/)).toBeVisible();
    fireEvent.pointerDown(window);
    expect(await screen.findByText(/Cuadrilla nueva/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
    expect(screen.getByText("Solo consulta")).toBeVisible();
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
