import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { serviceFixtures } from "@/lib/services-fixtures";
import { streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { ServiceDetail } from "./service-detail";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

describe("ServiceDetail", () => {
  it("shows a skeleton while derivaciones load and the list replaces it", () => {
    const service = serviceFixtures[0];
    const { rerender } = render(<ServiceDetail service={service} onBack={vi.fn()} repairRequests={[]} repairRequestsLoading />);
    const region = screen.getByRole("region", { name: "Carga de derivaciones" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(within(region).getByRole("status")).toHaveTextContent("Cargando");
    expect(screen.queryByText(/Cargando\.\.\.|Cargando…/)).not.toBeInTheDocument();

    rerender(<ServiceDetail service={service} onBack={vi.fn()} repairRequests={[]} repairRequestsLoading={false} />);
    expect(screen.getByRole("region", { name: "Carga de derivaciones" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByText("Sin derivaciones.")).toBeVisible();
  });

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

  it("shows the authorized closure window for approved and expired dependencies", () => {
    const request = {
      ...streetClosureRequestFixtures[0]!,
      status: "APPROVED" as const,
      approvedFrom: "2026-11-10T09:30:00.000Z",
      approvedTo: "2026-11-10T13:15:00.000Z",
    };
    const dependency = { request, outcome: "allowed" as const };
    const service = serviceFixtures[0];
    const { rerender } = render(
      <ServiceDetail service={service} onBack={vi.fn()} streetClosureDependency={dependency} />,
    );

    expect(screen.getByText(/Período autorizado:/)).toBeVisible();
    expect(screen.getByText(/10\/11\/2026/)).toBeVisible();

    rerender(
      <ServiceDetail
        service={service}
        onBack={vi.fn()}
        streetClosureDependency={{ request: { ...request, status: "EXPIRED" }, outcome: "expired" }}
      />,
    );
    expect(screen.getByText(/10\/11\/2026/)).toBeVisible();
  });

  it("shows M7's rejection reason or an explicit missing-value label", () => {
    const request = {
      ...streetClosureRequestFixtures[0]!,
      status: "REJECTED" as const,
      rejectionReason: "Debe permanecer libre la avenida durante el desfile.",
    };
    const service = serviceFixtures[0];
    const { rerender } = render(
      <ServiceDetail
        service={service}
        onBack={vi.fn()}
        streetClosureDependency={{ request, outcome: "rejected" }}
      />,
    );

    expect(screen.getByText(/Motivo del rechazo:/)).toBeVisible();
    expect(screen.getByText(/Motivo del rechazo: Debe permanecer libre la avenida durante el desfile\./)).toBeVisible();

    rerender(
      <ServiceDetail
        service={service}
        onBack={vi.fn()}
        streetClosureDependency={{
          request: { ...request, rejectionReason: null },
          outcome: "rejected",
        }}
      />,
    );
    expect(screen.getByText(/Motivo del rechazo: Sin informar/)).toBeVisible();
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
