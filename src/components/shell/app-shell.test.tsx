import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";
import { scenarios } from "@/lib/scenarios";

describe("AppShell", () => {
  it("shows the Office action queue and every permitted destination", () => {
    render(<AppShell scenario={scenarios.officeDutyQueue} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(moduleNavigation).toBeVisible();
    expect(within(moduleNavigation).getByRole("button", { name: "Servicios" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Acciones de la jornada" })).toBeVisible();
    expect(screen.getByText("Revisar reprogramación de barrido")).toBeVisible();
  });

  it("keeps state-changing Service actions unavailable to a Field crew member", () => {
    render(<AppShell scenario={scenarios.fieldCrewMember} />);

    expect(screen.getByRole("heading", { name: "Servicios asignados" })).toBeVisible();
    expect(screen.getByText("Integrante de cuadrilla")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Iniciar servicio" })).not.toBeInTheDocument();
  });

  it("hides a module an actor is not optimistically permitted to see", () => {
    render(<AppShell scenario={scenarios.officeLimited} />);

    const moduleNavigation = screen.getByRole("navigation", { name: "Módulos" });
    expect(within(moduleNavigation).queryByRole("button", { name: "Inventario" })).not.toBeInTheDocument();
    expect(within(moduleNavigation).getByRole("button", { name: "Servicios" })).toBeVisible();
  });
});
