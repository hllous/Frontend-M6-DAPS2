import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { serviceFixtures } from "@/lib/services-fixtures";
import { ServiceDetail } from "./service-detail";

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
});
