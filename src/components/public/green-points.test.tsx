import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { GET as getPublicGreenPoints } from "@/app/api/public/green-points/route";
import { handlers } from "@/mocks/handlers";
import { publicZoneFixtures } from "@/lib/public-service-fixtures";

import { PublicGreenPoints } from "./green-points";

type MapPoint = { id: string; name: string };

vi.mock("next/dynamic", () => ({
  default: () => function MockGreenPointsMap({ points }: { points: MapPoint[] }) {
    return (
      <div data-testid="green-points-map-markers">
        {points.map((point) => <button key={point.id} type="button">{point.name}</button>)}
      </div>
    );
  },
}));

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

const centro = publicZoneFixtures[0]!;

describe("PublicGreenPoints", () => {
  it("filters the zone's list by the existing waste labels and keeps unlocated points in the list", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const user = userEvent.setup();

    render(<PublicGreenPoints initialZoneId={centro.id} />);

    const list = await screen.findByRole("list", { name: "Puntos verdes" });
    expect(await within(list).findByText("Punto verde Estación Centro")).toBeVisible();
    expect(within(list).getByText("Punto verde Plaza Mitre")).toBeVisible();
    expect(screen.getByRole("region", { name: "Mapa de puntos verdes" })).toBeVisible();
    expect(screen.getByTestId("green-points-map-markers")).toHaveTextContent("Punto verde Plaza Mitre");
    expect(screen.getByTestId("green-points-map-markers")).not.toHaveTextContent("Punto verde Estación Centro");

    await user.click(screen.getByRole("combobox", { name: "Tipo de residuo" }));
    await user.click(screen.getByRole("option", { name: "Domiciliarios" }));

    expect(within(list).getByText("Punto verde Estación Centro")).toBeVisible();
    expect(within(list).queryByText("Punto verde Plaza Mitre")).not.toBeInTheDocument();
    expect(screen.getByText("No hay puntos con ubicación disponible para mostrar en el mapa.")).toBeVisible();
  });

  it("lets the resident retry a failed green-points lookup", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    let attempts = 0;
    server.use(http.get("*/api/public/green-points", ({ request }) => {
      attempts += 1;
      if (attempts === 1) return HttpResponse.json({ message: "fallo" }, { status: 503 });
      return getPublicGreenPoints(request);
    }));
    const user = userEvent.setup();

    render(<PublicGreenPoints initialZoneId={centro.id} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("El servicio no responde en este momento.");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    const list = await screen.findByRole("list", { name: "Puntos verdes" });
    expect(await within(list).findByText("Punto verde Plaza Mitre")).toBeVisible();
  });
});
