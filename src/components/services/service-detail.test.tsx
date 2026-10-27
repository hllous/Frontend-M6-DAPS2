import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { serviceFixtures } from "@/lib/services-fixtures";
import { ServiceDetail } from "./service-detail";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

describe("ServiceDetail", () => {
  it("keeps one primary action and wraps the action row for rescheduled services", () => {
    const service = { ...serviceFixtures[0], status: "RESCHEDULED" as const };
    render(
      <ServiceDetail
        service={service}
        onBack={vi.fn()}
        onAssignCrew={vi.fn()}
        onConfirmReschedule={vi.fn()}
      />,
    );

    const primaryActions = screen.getAllByRole("button").filter(
      (button) => button.classList.contains("bg-primary"),
    );
    expect(primaryActions).toHaveLength(1);
    expect(primaryActions[0]).toHaveAccessibleName("Confirmar nueva fecha");
    expect(screen.getByRole("button", { name: "Reasignar cuadrilla" }).parentElement).toHaveClass("flex-wrap");
  });

  it("shows the suspension reason and the crew note as separate items", () => {
    const service = { ...serviceFixtures[0], status: "SUSPENDED" as const, statusReason: "Desperfecto vehicular", statusNote: "El camión no arranca." };
    render(<ServiceDetail service={service} onBack={vi.fn()} />);
    expect(screen.getByText("Motivo")).toBeInTheDocument();
    expect(screen.getByText("Desperfecto vehicular")).toBeInTheDocument();
    expect(screen.getByText("Nota de la cuadrilla")).toBeInTheDocument();
    expect(screen.getByText("El camión no arranca.")).toBeInTheDocument();
  });

  it("still shows the reason alone for services suspended before statusNote existed", () => {
    const service = { ...serviceFixtures[0], status: "SUSPENDED" as const, statusReason: "Desperfecto vehicular: El camión no arranca." };
    render(<ServiceDetail service={service} onBack={vi.fn()} />);
    expect(screen.getByText("Desperfecto vehicular: El camión no arranca.")).toBeInTheDocument();
    expect(screen.queryByText("Nota de la cuadrilla")).not.toBeInTheDocument();
  });

});

describe("ServiceDetail internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", () => {
    const { container } = render(
      <ServiceDetail
        service={serviceFixtures[0]}
        onBack={vi.fn()}
        onAssignCrew={vi.fn()}
        onConfirmReschedule={vi.fn()}
      />,
    );

    expectNoInternalJargon(container);
  });
});
