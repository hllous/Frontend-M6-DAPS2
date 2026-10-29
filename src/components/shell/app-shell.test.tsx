import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { AppShell } from "./app-shell";
import { scenarios } from "@/lib/scenarios";
import { handlers } from "@/mocks/handlers";
import { resetTreeInterventionFixtures, updateTreeInterventionFixture } from "@/lib/tree-intervention-fixtures";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.title = "Ambiente e Higiene";
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
      ["Inventario urbano", "/app?destination=inventory"],
      ["Control Ambiental", "/app?destination=environment"],
      ["Mapa", "/app?destination=map"],
      ["Configuración", "/app?destination=catalog"],
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

  it("moves focus to main after a module change", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/app?destination=work");
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const main = screen.getByRole("main");
    await user.click(within(screen.getByRole("navigation", { name: "Módulos" })).getByRole("link", { name: "Servicios" }));

    await waitFor(() => expect(main).toHaveFocus());
  });

  it("keeps the Configuración destination active on nested catalog routes", () => {
    window.history.replaceState(null, "", "/app/catalog/zones");
    render(<AppShell scenario={scenarios.officeDutyQueue} routeContent={<p>Zonas</p>} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(within(moduleNavigation).getByRole("link", { name: "Configuración" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps Inventario urbano active on urban-asset routes and lists its four cards without a vacant destination", () => {
    window.history.replaceState(null, "", "/app/catalog/trees");
    const { unmount } = render(<AppShell scenario={scenarios.officeDutyQueue} routeContent={<p>Árboles</p>} />);
    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(within(moduleNavigation).getByRole("link", { name: "Inventario urbano" })).toHaveAttribute("aria-current", "page");
    expect(within(moduleNavigation).getByRole("link", { name: "Configuración" })).not.toHaveAttribute("aria-current");
    unmount();

    window.history.replaceState(null, "", "/app?destination=inventory");
    render(<AppShell scenario={scenarios.officeDutyQueue} />);
    expect(screen.getByRole("heading", { level: 1, name: "Inventario urbano" })).toBeVisible();
    expect(screen.queryByText(/próxima entrega/)).not.toBeInTheDocument();
    const hrefs = screen.getAllByRole("link", { name: /^Abrir/ }).map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/app/catalog/green-spaces",
      "/app/catalog/containers",
      "/app/catalog/green-points",
      "/app/catalog/trees",
    ]);
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

    await user.click(screen.getByRole("button", { name: "Más" }));
    const sheet = await screen.findByRole("dialog", { name: "Más" });

    expect(within(sheet).getByRole("button", { name: "Cerrar" })).toBeVisible();
    expect(within(sheet).queryByText("Seleccione un módulo disponible para su sesión.")).not.toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "Configuración" })).toHaveAttribute("href", "/app?destination=catalog");
    expect(within(sheet).getByRole("link", { name: "Tableros" })).toHaveAttribute("href", "/app?destination=dashboards");
  });

  it("shows the Office action queue and every permitted destination", () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(moduleNavigation).toBeVisible();
    expect(within(moduleNavigation).getByRole("link", { name: "Servicios" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
    expect(screen.getByText("Revisar reprogramación de barrido")).toBeVisible();
    expect(screen.queryByText("Sesión operativa")).not.toBeInTheDocument();
    expect(screen.queryByText("Priorice y coordine")).not.toBeInTheDocument();
    expect(screen.queryByText("Requiere revisión")).not.toBeInTheDocument();
  });

  it("keeps state-changing Service actions unavailable to a Field crew member", () => {
    render(<AppShell scenario={scenarios.fieldCrewMember} />);

    expect(screen.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    expect(screen.getByText("Integrante de cuadrilla")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
    expect(screen.queryByText("Requiere revisión")).not.toBeInTheDocument();
  });

  it("adds requested and pending tree interventions to the Office My Work queue", async () => {
    updateTreeInterventionFixture("intervention-3", { status: "PENDING_AUTHORIZATION" });
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByText(/Poda de seguridad · Parque del Bicentenario/)).toBeVisible();
    expect(screen.getAllByText("Solicitada")).toHaveLength(1);
    expect(screen.getByText("Pendiente de autorización")).toBeVisible();
    expect(screen.getByText(/Extracción · Paseo de la Costa 220/)).toBeVisible();
  });

  it("keeps the queue loading and error messages outside the work item list", async () => {
    server.use(http.get("*/tree-interventions*", () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const list = screen.getByRole("list");
    const loading = screen.getByText("Cargando intervenciones de arbolado…");
    expect(list).not.toContainElement(loading);
    expect(within(list).getAllByRole("listitem")).toHaveLength(scenarios.officeDutyQueue.work.items.length);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudieron cargar las autorizaciones pendientes. Intente nuevamente.");
    expect(list).not.toContainElement(alert);
    expect(within(list).getAllByRole("listitem")).toHaveLength(scenarios.officeDutyQueue.work.items.length);
  });

  it("hides a module an actor is not optimistically permitted to see", () => {
    const withoutInventory = {
      ...scenarios.officeLimited,
      capabilities: scenarios.officeLimited.capabilities.filter((capability) => capability !== "inventory:view"),
    };
    render(<AppShell scenario={withoutInventory} />);

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

describe("internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", async () => {
    const { container } = render(<AppShell scenario={scenarios.officeDutyQueue} />);
    expect(screen.getByRole("navigation", { name: "Módulos" })).toBeVisible();

    expectNoInternalJargon(container);
  });
});
