import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
