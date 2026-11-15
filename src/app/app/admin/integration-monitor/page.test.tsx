import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { getScenario } from "@/lib/scenarios";
import { createTestSession } from "@/test/session";
import IntegrationMonitorPage from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  monitor: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/session")>()),
  getSession: mocks.getSession,
}));
vi.mock("@/components/admin/integration-monitor", () => ({
  IntegrationMonitor: (props: Record<string, unknown>) => {
    mocks.monitor(props);
    return <div data-testid="monitor" />;
  },
}));

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  return render(await IntegrationMonitorPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("IntegrationMonitorPage", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.monitor.mockClear();
  });

  it("redirects to login when there is no session", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mocks.monitor).not.toHaveBeenCalled();
  });

  it("shows a no-access message to a profile without the monitor capability", async () => {
    mocks.getSession.mockResolvedValue(createTestSession("field-crew-leader-route"));
    expect(getScenario("field-crew-leader-route").capabilities).not.toContain("integrationMonitor:view");

    await renderPage();

    expect(screen.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
    expect(screen.getByText("Su perfil no tiene acceso a esta pantalla.")).toBeVisible();
    expect(mocks.monitor).not.toHaveBeenCalled();
  });

  describe("with the monitor capability", () => {
    const withAccess = () => mocks.getSession.mockResolvedValue(createTestSession("office-duty-queue"));

    it("opens the events tab by default without filters", async () => {
      withAccess();
      expect(getScenario("office-duty-queue").capabilities).toContain("integrationMonitor:view");

      await renderPage();

      expect(screen.getByTestId("monitor")).toBeInTheDocument();
      expect(mocks.monitor.mock.calls[0][0]).toMatchObject({ initialTab: "events", initialEntityType: undefined, initialEntityId: undefined });
    });

    it.each(["activity", "received"])("honors the %s tab", async (tab) => {
      withAccess();

      await renderPage({ tab });

      expect(mocks.monitor.mock.calls[0][0]).toMatchObject({ initialTab: tab });
    });

    it("falls back to the events tab for an unknown tab", async () => {
      withAccess();

      await renderPage({ tab: "hacked" });

      expect(mocks.monitor.mock.calls[0][0]).toMatchObject({ initialTab: "events" });
    });

    it("takes the first value of repeated filters and passes valid ones to the monitor", async () => {
      withAccess();

      const first = "6f1c1c3e-3f0a-4d0e-9a53-0d6d8d1a4e11";
      const second = "7a2d2d4f-4a1b-4e1f-8b64-1e7e9e2b5f22";

      await renderPage({ tab: "activity", entityType: ["CONTAINER", "ENVIRONMENTAL_REPORT"], entityId: [first, second] });

      expect(mocks.monitor.mock.calls[0][0]).toMatchObject({
        initialTab: "activity",
        initialEntityType: "CONTAINER",
        initialEntityId: first,
      });
    });

    it("drops filters that do not pass validation instead of forwarding them", async () => {
      withAccess();

      await renderPage({ entityType: "NOT_A_TYPE", entityId: "x" });

      expect(mocks.monitor.mock.calls[0][0]).toMatchObject({ initialEntityType: undefined, initialEntityId: undefined });
    });
  });
});
