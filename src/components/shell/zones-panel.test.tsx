import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

import { handlers } from "@/mocks/handlers";
import { ZonesPanel } from "./zones-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ZonesPanel", () => {
  it("shows a loading state before the read resolves", () => {
    render(<ZonesPanel />);

    expect(screen.getByLabelText("Cargando zonas operativas")).toBeVisible();
  });

  it("renders the fixture zones on a successful read", async () => {
    render(<ZonesPanel />);

    expect(await screen.findByRole("heading", { name: "Zonas operativas" })).toBeVisible();
    expect(screen.getByText(/Z-01/)).toBeVisible();
  });

  it("renders an empty state when the adapter returns no zones", async () => {
    server.use(
      http.get("*/api/zones", () =>
        HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
      ),
    );

    render(<ZonesPanel />);

    expect(await screen.findByText("Sin zonas operativas")).toBeVisible();
  });

  it("renders an error state when the read fails", async () => {
    server.use(http.get("*/api/zones", () => HttpResponse.json({ oops: true }, { status: 500 })));

    render(<ZonesPanel />);

    expect(await screen.findByText("No se pudieron cargar las zonas")).toBeVisible();
  });
});
