import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { resetCrewFixtures } from "@/lib/crew-fixtures";
import { resetDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import { resetEnvironmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { resetGreenPointFixtures } from "@/lib/green-point-fixtures";
import { resetGreenSpaceFixtures } from "@/lib/green-space-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetRouteFixtures } from "@/lib/routes-fixtures";
import { resetServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { resetServiceTypeFixtures } from "@/lib/service-type-fixtures";
import { resetServiceFixtures, resetZoneResultFixtures } from "@/lib/services-fixtures";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { resetTreeFixtures } from "@/lib/tree-fixtures";
import { resetVehicleFixtures } from "@/lib/vehicles-fixtures";
import { resetZoneFixtures } from "@/lib/zones-fixtures";

function navigate(href: string, replace = false) {
  window.history[replace ? "replaceState" : "pushState"](null, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// next/link needs the app router context to navigate client-side; in jsdom it would
// fall back to a full document navigation. This stand-in renders the same <a> and
// navigates through the same history shim as the useRouter mock below, but lets
// modified clicks (Cmd/Ctrl/Shift/Alt, middle button) keep their browser default.
vi.mock("next/link", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  type LinkProps = Omit<React.ComponentPropsWithoutRef<"a">, "href"> & {
    href: string;
    replace?: boolean;
    prefetch?: boolean;
    scroll?: boolean;
  };
  const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
    { href, replace, prefetch: _prefetch, scroll: _scroll, onClick, ...rest },
    ref,
  ) {
    return React.createElement("a", {
      ...rest,
      ref,
      href,
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(href, replace);
      },
    });
  });
  return { default: Link };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await vi.importActual<typeof import("react")>("react");

  function useLocationSlice(read: () => string) {
    return useSyncExternalStore(
      (notify) => {
        window.addEventListener("popstate", notify);
        return () => window.removeEventListener("popstate", notify);
      },
      read,
      read,
    );
  }

  return {
    usePathname: () => useLocationSlice(() => window.location.pathname),
    useSearchParams: () => {
      const search = useLocationSlice(() => window.location.search);
      return new URLSearchParams(search);
    },
    useRouter: () => ({
      push: (href: string) => navigate(href),
      replace: (href: string) => navigate(href, true),
      refresh: vi.fn(),
      prefetch: vi.fn(),
      back: () => window.history.back(),
      forward: () => window.history.forward(),
    }),
  };
});

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});

// Restore shared mutable fixtures before each test; each test can mutate its own baseline.
beforeEach(() => {
  resetContainerFixtures();
  resetCrewFixtures();
  resetDisposalSiteFixtures();
  resetEnvironmentalReportFixtures();
  resetGreenPointFixtures();
  resetGreenSpaceFixtures();
  resetRepairRequestFixtures();
  resetRouteFixtures();
  resetServiceFrequencyFixtures();
  resetServiceTypeFixtures();
  resetServiceFixtures();
  resetZoneResultFixtures();
  resetStreetClosureRequestFixtures();
  resetTreeInterventionFixtures();
  resetTreeSurveyFixtures();
  resetTreeFixtures();
  resetVehicleFixtures();
  resetZoneFixtures();
});

// #397 field-draft owner for component tests
import { setFieldDraftOwner } from "@/lib/field-drafts";

beforeEach(() => setFieldDraftOwner("test-actor"));
afterEach(() => setFieldDraftOwner(undefined));
