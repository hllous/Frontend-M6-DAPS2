import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingRegion } from "./loading-region";

describe("LoadingRegion", () => {
  it("marks a loading region busy and exposes the hidden Spanish status message", () => {
    render(
      <LoadingRegion label="Tipos de servicio">
        <div aria-hidden="true">Placeholder</div>
      </LoadingRegion>,
    );

    const region = screen.getByRole("region", { name: "Tipos de servicio" });
    expect(region).toHaveAttribute("aria-busy", "true");

    const status = within(region).getByRole("status");
    expect(status).toHaveTextContent("Cargando");
    expect(status).toHaveClass("sr-only");
  });

  it("clears the busy state and hidden status when content is ready", () => {
    render(
      <LoadingRegion label="Tipos de servicio" isLoading={false}>
        <p>Catálogo listo</p>
      </LoadingRegion>,
    );

    const region = screen.getByRole("region", { name: "Tipos de servicio" });
    expect(region).toHaveAttribute("aria-busy", "false");
    expect(within(region).queryByRole("status")).not.toBeInTheDocument();
    expect(within(region).getByText("Catálogo listo")).toBeVisible();
  });
});
