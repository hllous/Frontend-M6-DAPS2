import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

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
  it("links to all three public consultations", () => {
    render(<PublicLanding />);

    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    const tracking = screen.getByRole("link", { name: /Seguir mi denuncia/ });
    expect(tracking).toHaveAttribute("href", "/consulta/denuncia");

    expect(screen.getByRole("link", { name: /Servicios/ })).toHaveAttribute("href", "/consulta/servicios");

    const greenPoints = screen.getByRole("link", { name: /Puntos verdes/ });
    expect(greenPoints).toHaveAttribute("href", "/consulta/puntos-verdes");
  });
});
