import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { operationalMapAdapter } from "@/lib/operational-map";
import { handlers } from "@/mocks/handlers";
import { MapaOperativo } from "./mapa-operativo";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  operationalMapAdapter.invalidate();
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("MapaOperativo: actualizar", () => {
  it.each(["Zonas", "Cobertura", "Recorrido", "Hoy"])("vuelve a pedir el inventario al actualizar la vista %s", async (tab) => {
    let containerReads = 0;
    server.use(http.get("*/api/containers", ({ request }) => {
      containerReads += 1;
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: Number(new URL(request.url).searchParams.get("pageSize") ?? 100), totalPages: 0 } });
    }));
    const user = userEvent.setup();
    render(<MapaOperativo scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Elementos" });
    await user.click(screen.getByRole("tab", { name: tab }));
    await screen.findByText(/Consultado/);

    const before = containerReads;
    await user.click(screen.getByRole("button", { name: "Actualizar" }));

    await waitFor(() => expect(containerReads).toBeGreaterThan(before));
    expect(await screen.findByText(/Consultado/)).toBeVisible();
  });
});
