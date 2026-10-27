import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import UiComponentsPage from "./page";

vi.mock("next/navigation", async () => {
  const { notFound } = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { notFound };
});

describe("ui components page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("responds with not found in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => UiComponentsPage()).toThrow(
      expect.objectContaining({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK;404") }),
    );
  });

  it.each(["development", "test"])("renders the fixture in %s", (env) => {
    vi.stubEnv("NODE_ENV", env);

    render(UiComponentsPage());

    expect(screen.getByRole("heading", { level: 1, name: "Componentes base" })).toBeTruthy();
    expect(screen.getByTestId("ui-field-inputs")).toBeTruthy();
  });
});
