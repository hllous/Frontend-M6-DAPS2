import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ShellExamplesPage from "./page";

// The global setup mock of next/navigation has no notFound; keep the real one and stub the hooks the shell uses.
vi.mock("next/navigation", async () => {
  const { notFound } = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    notFound,
    usePathname: () => "/prototype/shell-examples",
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  };
});

describe("shell examples page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("responds with not found in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => ShellExamplesPage()).toThrow(
      expect.objectContaining({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404") }),
    );
  });

  it.each(["development", "test"])("renders the catalog heading in %s", (env) => {
    vi.stubEnv("NODE_ENV", env);

    render(ShellExamplesPage());

    expect(screen.getByRole("heading", { level: 1, name: "Catálogo de ejemplos del shell" })).toBeTruthy();
  });
});
