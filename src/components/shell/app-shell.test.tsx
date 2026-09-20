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
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  resetTreeInterventionFixtures();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AppShell", () => {
  it("renders every permitted destination as a real link with one canonical URL", () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    const links = within(moduleNavigation).getAllByRole("link");

    expect(links.map((link) => [link.getAttribute("aria-label"), link.getAttribute("href")])).toEqual([
      ["Mi trabajo", "/app?destination=work"],
      ["Servicios", "/app?destination=services"],
      ["Derivaciones", "/app?destination=referrals"],
      ["Inventario", "/app?destination=inventory"],
      ["Control Ambiental", "/app?destination=environment"],
      ["Mapa", "/app?destination=map"],
      ["Catálogo", "/app?destination=catalog"],
      ["Tableros", "/app?destination=dashboards"],
    ]);
    expect(within(moduleNavigation).queryAllByRole("button")).toHaveLength(0);
  });

  it("marks only the active destination with aria-current=page", () => {
    window.history.replaceState(null, "", "/app?destination=services");
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(within(moduleNavigation).getByRole("link", { name: "Servicios" })).toHaveAttribute("aria-current", "page");
    expect(within(moduleNavigation).getByRole("link", { name: "Mi trabajo" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the catalog destination active on nested catalog routes", () => {
    window.history.replaceState(null, "", "/app/catalog/containers");
    render(<AppShell scenario={scenarios.officeDutyQueue} routeContent={<p>Contenedores</p>} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(within(moduleNavigation).getByRole("link", { name: "Catálogo" })).toHaveAttribute("aria-current", "page");
  });

  it("navigates client-side on a plain click but leaves modified clicks to the browser", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    const services = within(moduleNavigation).getByRole("link", { name: "Servicios" });

    await user.keyboard("{Control>}");
    await user.click(services);
    await user.keyboard("{/Control}");
    expect(window.location.search).toBe("");

    await user.click(services);
    expect(window.location.search).toBe("?destination=services");
  });

  it("keeps the accessible name and tooltip on icon-only links when focused by keyboard", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    await user.click(screen.getByRole("button", { name: /Contraer navegaci.n/ }));

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    const services = within(moduleNavigation).getByRole("link", { name: "Servicios" });
    services.focus();

    expect(services).toHaveAccessibleName("Servicios");
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Servicios");
  });

  it("lists the same links in the mobile overflow sheet", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    await user.click(screen.getByRole("button", { name: "Más módulos" }));
    const sheet = await screen.findByRole("dialog");

    expect(within(sheet).getByRole("link", { name: "Catálogo" })).toHaveAttribute("href", "/app?destination=catalog");
    expect(within(sheet).getByRole("link", { name: "Tableros" })).toHaveAttribute("href", "/app?destination=dashboards");
  });

  it("shows the Office action queue and every permitted destination", () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(moduleNavigation).toBeVisible();
    expect(within(moduleNavigation).getByRole("link", { name: "Servicios" })).toBeVisible();
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
    expect(within(moduleNavigation).queryByRole("link", { name: "Inventario" })).not.toBeInTheDocument();
    expect(within(moduleNavigation).getByRole("link", { name: "Servicios" })).toBeVisible();
  });

  it("only mounts module tooltips when the sidebar is collapsed", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: /M.dulos/ });
    expect(moduleNavigation.querySelector('[data-slot="tooltip-trigger"]')).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Contraer navegaci.n/ }));

    expect(moduleNavigation.querySelector('[data-slot="tooltip-trigger"]')).toBeInTheDocument();
    expect(within(moduleNavigation).getByRole("link", { name: "Servicios" })).toHaveAttribute("aria-label", "Servicios");
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
      expect(within(moduleNavigation).getByRole("link", { name: "Servicios" })).toHaveAttribute("aria-label", "Servicios");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("opens the operational map from the map destination", async () => {
    const user = userEvent.setup();
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    await user.click(within(moduleNavigation).getByRole("link", { name: "Mapa" }));

    expect(await screen.findByRole("heading", { name: "Mapa operativo" })).toBeVisible();
  });
});
