import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("only mounts module tooltips when the sidebar is collapsed", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: /M.dulos/ });
    expect(moduleNavigation.querySelector('[data-slot="tooltip-trigger"]')).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Contraer navegaci.n/ }));

    expect(moduleNavigation.querySelector('[data-slot="tooltip-trigger"]')).toBeInTheDocument();
    expect(within(moduleNavigation).getByRole("button", { name: "Servicios" })).toHaveAttribute("aria-label", "Servicios");
  });

  it("mounts module tooltips when tablet layout hides the labels", async () => {
    const media = {
      matches: true,
      media: "(min-width: 761px) and (max-width: 1023px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => media));

    try {
      render(<AppShell scenario={scenarios.officeDutyQueue} />);
      const moduleNavigation = screen.getByRole("navigation", { name: /M.dulos/ });

      await waitFor(() => {
        expect(moduleNavigation.querySelector('[data-slot="tooltip-trigger"]')).toBeInTheDocument();
      });
      expect(within(moduleNavigation).getByRole("button", { name: "Servicios" })).toHaveAttribute("aria-label", "Servicios");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("opens the operational map from the map destination", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    await user.click(within(moduleNavigation).getByRole("button", { name: "Mapa" }));

    expect(await screen.findByRole("heading", { name: "Mapa operativo" })).toBeVisible();
  });
});
