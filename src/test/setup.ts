import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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

  function navigate(href: string, replace = false) {
    window.history[replace ? "replaceState" : "pushState"](null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
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
