import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import TrackReportPage from "@/app/consulta/denuncia/page";
import ServicesPage from "@/app/consulta/servicios/page";
import GreenPointsPage from "@/app/consulta/puntos-verdes/page";

describe("public page headers", () => {
  it("gives every public sub-page a link back to the consultation landing", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const pages = [
      await TrackReportPage({ searchParams: Promise.resolve({}) }),
      await ServicesPage({ searchParams: Promise.resolve({}) }),
      await GreenPointsPage({ searchParams: Promise.resolve({}) }),
    ];

    for (const page of pages) {
      const { unmount } = render(page);
      expect(screen.getByRole("link", { name: "Volver a consultas" })).toHaveAttribute("href", "/consulta");
      unmount();
    }
  });
});
