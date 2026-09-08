import { render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { AppShell } from "./app-shell";
import { scenarios } from "@/lib/scenarios";
import { handlers } from "@/mocks/handlers";
import { resetTreeInterventionFixtures, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetTreeInterventionFixtures());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AppShell", () => {
  it("shows the Office action queue and every permitted destination", () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(moduleNavigation).toBeVisible();
    expect(within(moduleNavigation).getByRole("button", { name: "Servicios" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
    expect(screen.getByText("Revisar reprogramación de barrido")).toBeVisible();
  });

  it("keeps state-changing Service actions unavailable to a Field crew member", () => {
    render(<AppShell scenario={scenarios.fieldCrewMember} />);

    expect(screen.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    expect(screen.getByText("Integrante de cuadrilla")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
  });

  it("adds requested and pending tree interventions to the Office My Work queue", async () => {
    updateTreeInterventionFixture("intervention-3", { status: "PENDING_AUTHORIZATION" });
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText(/Poda de seguridad · Parque del Bicentenario/)).toBeVisible();
    expect(screen.getAllByText("Solicitada")).toHaveLength(1);
    expect(screen.getByText("Pendiente de autorización")).toBeVisible();
    expect(screen.getByText(/Extracción · Paseo de la Costa 220/)).toBeVisible();
  });

  it("hides a module an actor is not optimistically permitted to see", () => {
    render(<AppShell scenario={scenarios.officeLimited} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(within(moduleNavigation).queryByRole("button", { name: "Inventario" })).not.toBeInTheDocument();
    expect(within(moduleNavigation).getByRole("button", { name: "Servicios" })).toBeVisible();
  });
});
