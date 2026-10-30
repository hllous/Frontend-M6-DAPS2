import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { PublicLanding } from "./public-landing";
import { PublicShell } from "./public-shell";

describe("PublicShell", () => {
  it("shows the demo notice and a way back to the staff login, without the staff shell", () => {
    render(<PublicShell><p>contenido</p></PublicShell>);

    expect(screen.getByText(/Entorno de demostración/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ingreso del personal" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /Consulta ciudadana/ })).toHaveAttribute("href", "/consulta");
    expect(screen.getByText("contenido")).toBeVisible();
    expect(screen.queryByRole("navigation", { name: /principal/i })).not.toBeInTheDocument();
  });
});

describe("PublicLanding", () => {
  it("links the tracking page and shows services and green points as coming soon", () => {
    render(<PublicLanding />);

    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    const tracking = screen.getByRole("link", { name: /Seguir mi denuncia/ });
    expect(tracking).toHaveAttribute("href", "/consulta/denuncia");

    for (const name of ["Servicios", "Puntos verdes"]) {
      const entry = screen.getByRole("heading", { name }).closest("[data-slot=card]") as HTMLElement;
      expect(within(entry).getByText("Próximamente")).toBeVisible();
      expect(within(entry).queryByRole("link")).not.toBeInTheDocument();
    }
  });
});
