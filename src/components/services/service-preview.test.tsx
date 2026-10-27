import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { serviceFixtures } from "@/lib/services-fixtures";
import { ServicePreview } from "./service-preview";

describe("ServicePreview suspension details", () => {
  it("shows the suspension reason and crew note as separate items", () => {
    const service = {
      ...serviceFixtures[0],
      status: "SUSPENDED" as const,
      statusReason: "Desperfecto vehicular",
      statusNote: "El camión no arranca.",
    };

    render(<ServicePreview service={service} onOpenDetail={() => {}} />);

    expect(screen.getByText("Motivo de estado:")).toBeVisible();
    expect(screen.getByText("Desperfecto vehicular")).toBeVisible();
    expect(screen.getByText("Nota de la cuadrilla:")).toBeVisible();
    expect(screen.getByText("El camión no arranca.")).toBeVisible();
  });
});
