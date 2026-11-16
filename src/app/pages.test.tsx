import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType, ReactElement } from "react";

import type { Session } from "@/lib/session";
import { scenarios } from "@/lib/scenarios";

const getSessionMock = vi.hoisted(() => vi.fn());
const getAuthModeMock = vi.hoisted(() => vi.fn(() => "mock"));
const headersMock = vi.hoisted(() => vi.fn());
const sessionActorMock = vi.hoisted(() => vi.fn());

class Redirect extends Error {
  constructor(readonly location: string) {
    super(`redirect:${location}`);
  }
}

vi.mock("next/navigation", () => ({ redirect: (location: string) => { throw new Redirect(location); } }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/lib/session", async () => ({ ...(await vi.importActual<typeof import("@/lib/session")>("@/lib/session")), getSession: getSessionMock, getAuthMode: getAuthModeMock }));
vi.mock("@/lib/session-actor", async () => ({ ...(await vi.importActual<typeof import("@/lib/session-actor")>("@/lib/session-actor")), sessionActor: sessionActorMock }));

import { ContainerCatalogPanel } from "@/components/catalog/container-catalog-panel";
import { CrewCatalogPanel } from "@/components/catalog/crew-catalog-panel";
import { DisposalSitesPanel } from "@/components/catalog/disposal-sites-panel";
import { GreenPointCatalogPanel } from "@/components/catalog/green-point-catalog-panel";
import { GreenSpacesPanel } from "@/components/catalog/green-spaces-panel";
import { RouteCatalogPanel } from "@/components/catalog/route-catalog-panel";
import { ServiceFrequenciesPanel } from "@/components/catalog/service-frequencies-panel";
import { ServiceTypesPanel } from "@/components/catalog/service-types-panel";
import { TreeCatalogPanel } from "@/components/catalog/tree-catalog-panel";
import { TreeInterventionsPanel } from "@/components/catalog/tree-interventions-panel";
import { VehicleCatalogPanel } from "@/components/catalog/vehicle-catalog-panel";
import { ZoneCatalogPanel } from "@/components/catalog/zone-catalog-panel";
import { AccessWorkspace } from "@/components/admin/access-workspace";
import { LoginForm } from "@/components/auth/login-form";
import { NoRoleScreen } from "@/components/auth/no-role-screen";
import { SessionShell } from "@/components/auth/session-shell";
import { PublicLanding } from "@/components/public/public-landing";
import { PublicShell } from "@/components/public/public-shell";
import { ShellForbidden } from "@/components/shell/shell-states";

import AccessPage from "./app/access/page";
import AppLayout from "./app/layout";
import CatalogAlias from "./app/catalog/page";
import CatalogLayout from "./app/catalog/layout";
import ContainersPage from "./app/catalog/containers/page";
import CrewsPage from "./app/catalog/crews/page";
import DashboardPage from "./app/dashboard/page";
import DisposalSitesPage from "./app/catalog/disposal-sites/page";
import GreenPointsPage from "./app/catalog/green-points/page";
import GreenSpacesPage from "./app/catalog/green-spaces/page";
import Home from "./page";
import LoginPage from "./login/page";
import NoRolePage from "./no-role/page";
import PublicLandingPage from "./consulta/page";
import PublicLayout from "./consulta/layout";
import RoutesPage from "./app/catalog/routes/page";
import ServiceFrequenciesPage from "./app/catalog/service-frequencies/page";
import ServiceTypesPage from "./app/catalog/service-types/page";
import TreeInterventionsPage from "./app/catalog/tree-interventions/page";
import TreesPage from "./app/catalog/trees/page";
import VehiclesPage from "./app/catalog/vehicles/page";
import ZonesPage from "./app/catalog/zones/page";

function session(overrides: Partial<Session> = {}): Session {
  const now = Date.now();
  return { mode: "mock", scenarioId: "office-duty-queue", issuedAt: now, lastActivityAt: now, absoluteExpiresAt: now + 3_600_000, jwtExpiresAt: now + 900_000, roles: ["M6_ADMIN"], ...overrides } as Session;
}

async function redirectOf(run: () => unknown): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof Redirect) return error.location;
    throw error;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  getSessionMock.mockReset();
  getAuthModeMock.mockReturnValue("mock");
  headersMock.mockReset();
  sessionActorMock.mockReset();
});

describe("catalog pages", () => {
  const pages: Array<[string, () => Promise<ReactElement>, ComponentType<never>]> = [
    ["containers", ContainersPage, ContainerCatalogPanel as ComponentType<never>],
    ["crews", CrewsPage, CrewCatalogPanel as ComponentType<never>],
    ["disposal-sites", DisposalSitesPage, DisposalSitesPanel as ComponentType<never>],
    ["green-points", GreenPointsPage, GreenPointCatalogPanel as ComponentType<never>],
    ["green-spaces", GreenSpacesPage, GreenSpacesPanel as ComponentType<never>],
    ["routes", RoutesPage, RouteCatalogPanel as ComponentType<never>],
    ["service-frequencies", ServiceFrequenciesPage, ServiceFrequenciesPanel as ComponentType<never>],
    ["service-types", ServiceTypesPage, ServiceTypesPanel as ComponentType<never>],
    ["tree-interventions", TreeInterventionsPage, TreeInterventionsPanel as ComponentType<never>],
    ["trees", TreesPage, TreeCatalogPanel as ComponentType<never>],
    ["vehicles", VehiclesPage, VehicleCatalogPanel as ComponentType<never>],
    ["zones", ZonesPage, ZoneCatalogPanel as ComponentType<never>],
  ];

  it.each(pages)("%s sends a visitor without a session to the login", async (_name, Page) => {
    getSessionMock.mockResolvedValue(null);
    expect(await redirectOf(() => Page())).toBe("/login");
  });

  it.each(pages)("%s renders its panel with the scenario of the session", async (_name, Page, Panel) => {
    getSessionMock.mockResolvedValue(session());
    const element = await Page();
    expect(element.type).toBe(Panel);
    expect((element.props as { scenario: { id: string } }).scenario.id).toBe(scenarios.officeDutyQueue.id);
  });

  it("keeps the catalog layout transparent for its children", () => {
    const child = <span>hijo</span>;
    expect(CatalogLayout({ children: child })).toBe(child);
  });

  it("redirects the legacy /app/catalog alias to the catalog destination", async () => {
    getSessionMock.mockResolvedValue(session());
    expect(await redirectOf(() => CatalogAlias())).toBe("/app?destination=catalog");
    getSessionMock.mockResolvedValue(null);
    expect(await redirectOf(() => CatalogAlias())).toBe("/login");
  });
});

describe("dashboard alias", () => {
  it("requires a session", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await redirectOf(() => DashboardPage())).toBe("/login");
  });

  it("opens the dashboards destination when the actor can view indicators", async () => {
    getSessionMock.mockResolvedValue(session({ roles: ["M6_ADMIN"] }));
    expect(await redirectOf(() => DashboardPage())).toBe("/app?destination=dashboards");
  });

  it("sends an actor without the indicator capability back to the start", async () => {
    getSessionMock.mockResolvedValue(session({ roles: [] }));
    expect(await redirectOf(() => DashboardPage())).toBe("/app");
  });
});

describe("access page", () => {
  it("requires a session", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await redirectOf(() => AccessPage())).toBe("/login");
  });

  it("forbids anyone who is not an administrator", async () => {
    getSessionMock.mockResolvedValue(session({ roles: ["M6_OFICINA_OPERACIONES"] }));
    expect((await AccessPage()).type).toBe(ShellForbidden);
  });

  it("forbids an administrator whose session carries no user id", async () => {
    getSessionMock.mockResolvedValue(session({ roles: ["M6_ADMIN"], scenarioId: undefined, identity: undefined }));
    expect((await AccessPage()).type).toBe(ShellForbidden);
  });

  it("renders the workspace with the own user id and the mock flag", async () => {
    getSessionMock.mockResolvedValue(session({ roles: ["M6_ADMIN"], identity: { userId: "user-77", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO" } }));
    const element = await AccessPage();
    expect(element.type).toBe(AccessWorkspace);
    expect(element.props).toMatchObject({ ownUserId: "user-77", mock: true });
  });
});

describe("home, login and no-role pages", () => {
  it("home goes to the app with a session and to the login without one", async () => {
    getSessionMock.mockResolvedValue(session());
    expect(await redirectOf(() => Home())).toBe("/app");
    getSessionMock.mockResolvedValue(null);
    expect(await redirectOf(() => Home())).toBe("/login");
  });

  it("login sends a signed-in user to the screen they asked for", async () => {
    getSessionMock.mockResolvedValue(session());
    expect(await redirectOf(() => LoginPage({ searchParams: Promise.resolve({ destination: "services" }) }))).toBe("/app?destination=services");
    expect(await redirectOf(() => LoginPage({ searchParams: Promise.resolve({ destination: "otra-cosa" }) }))).toBe("/app");
  });

  it("login renders the form with the return path, the auth mode and the expiry notice", async () => {
    getSessionMock.mockResolvedValue(null);
    getAuthModeMock.mockReturnValue("real-m1");
    const element = await LoginPage({ searchParams: Promise.resolve({ destination: "map", expired: "1" }) });
    expect(element.type).toBe(LoginForm);
    expect(element.props).toMatchObject({ authMode: "real-m1", redirectTo: "/app?destination=map", sessionExpired: true });
    expect((element.props as { scenarios: unknown[] }).scenarios).toHaveLength(Object.values(scenarios).length);

    const plain = await LoginPage({ searchParams: Promise.resolve({}) });
    expect(plain.props).toMatchObject({ redirectTo: "/app", sessionExpired: false });
  });

  it("no-role page redirects an expired session to the login with the expiry notice", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await redirectOf(() => NoRolePage())).toBe("/login?expired=1");
  });

  it("no-role page sends a user who does have a role back to the app", async () => {
    getSessionMock.mockResolvedValue(session({ roles: ["M6_ADMIN"] }));
    expect(await redirectOf(() => NoRolePage())).toBe("/app");
  });

  it("no-role page shows the identity of an employee without roles", async () => {
    getSessionMock.mockResolvedValue(session({ roles: [] }));
    sessionActorMock.mockResolvedValue({ displayName: "Ana Pérez" });
    const element = await NoRolePage();
    expect(element.type).toBe(NoRoleScreen);
    expect(element.props).toMatchObject({ identity: "Ana Pérez" });
  });
});

describe("app layout", () => {
  it("sends an expired session to the login keeping the requested screen", async () => {
    getSessionMock.mockResolvedValue(null);
    headersMock.mockResolvedValue(new Headers({ "x-m6-destination": "services" }));
    expect(await redirectOf(() => AppLayout({ children: null }))).toBe("/login?expired=1&destination=services");
  });

  it("drops a missing destination header", async () => {
    getSessionMock.mockResolvedValue(null);
    headersMock.mockResolvedValue(new Headers());
    expect(await redirectOf(() => AppLayout({ children: null }))).toBe("/login?expired=1");
  });

  it("sends a user without roles to the no-role screen", async () => {
    getSessionMock.mockResolvedValue(session({ roles: [] }));
    expect(await redirectOf(() => AppLayout({ children: null }))).toBe("/no-role");
  });

  it("wraps the children in the session shell with the actor", async () => {
    getSessionMock.mockResolvedValue(session());
    sessionActorMock.mockResolvedValue({ userId: "user-1", scenarioId: "office-duty-queue", m1Identity: undefined });
    const child = <main>contenido</main>;
    const element = await AppLayout({ children: child });
    expect(element.type).toBe(SessionShell);
    expect(element.props).toMatchObject({ actorId: "user-1", scenarioId: "office-duty-queue", children: child });
  });
});

describe("public pages", () => {
  it("the landing page renders the public landing", () => {
    expect(PublicLandingPage().type).toBe(PublicLanding);
  });

  it("the public layout wraps the pages in the public shell and flags demo data in mock mode", () => {
    const element = PublicLayout({ children: <span>x</span> });
    expect(element.type).toBe(PublicShell);
    expect(typeof (element.props as { demo: unknown }).demo).toBe("boolean");
  });
});
