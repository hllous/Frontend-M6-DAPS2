import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { mockResponseAfter } from "@/mocks/delayed-response";
import { publicZoneFixtures } from "@/lib/public-service-fixtures";

import { ServiceSchedule } from "./service-schedule";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-02T15:00:00Z") }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

const [centro, norte, , oeste] = publicZoneFixtures;

async function pickZone(name: string) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await user.click(await screen.findByRole("combobox", { name: "Tu zona" }));
  await user.click(await screen.findByRole("option", { name }));
}

describe("ServiceSchedule", () => {
  it("asks for a zone first and lists nothing", async () => {
    render(<ServiceSchedule />);
    expect(await screen.findByRole("combobox", { name: "Tu zona" })).toBeEnabled();
    expect(screen.getByText("Elegí tu zona para ver cuándo pasan los servicios.")).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("groups the chosen zone's services by date in dd/mm/aaaa with 24-hour windows and stage, and keeps the zone in the URL", async () => {
    render(<ServiceSchedule />);
    await pickZone("Centro");

    const groups = await screen.findAllByRole("group", { name: /\d{2}\/\d{2}\/\d{4}/ });
    expect(groups.map((group) => within(group).getByRole("heading").textContent)).toEqual([
      expect.stringContaining("02/11/2026"),
      expect.stringContaining("04/11/2026"),
      expect.stringContaining("07/11/2026"),
    ]);

    const today = within(groups[0]).getAllByRole("listitem");
    expect(today).toHaveLength(2);
    expect(today[0]).toHaveTextContent("Recolección domiciliaria");
    expect(today[0]).toHaveTextContent("06:00 a 10:00");
    expect(today[0]).toHaveTextContent("En curso");
    expect(today[1]).toHaveTextContent("Barrido y limpieza de calles");
    expect(today[1]).toHaveTextContent("14:00 a 18:00");
    expect(today[1]).toHaveTextContent("Programado");
    expect(within(groups[2]).getByRole("listitem")).toHaveTextContent("Reprogramado");

    expect(new URLSearchParams(window.location.search).get("zona")).toBe(centro.id);
  });

  it("restores the zone from the link and loads its services without a click", async () => {
    render(<ServiceSchedule initialZoneId={norte.id} />);

    expect(await screen.findByRole("combobox", { name: "Tu zona" })).toHaveTextContent("Norte");
    expect(await screen.findByText("Lavado de contenedores")).toBeVisible();
    expect(screen.getByText("Sin horario definido")).toBeVisible();
  });

  it("ignores a zone in the link that is not in the list", async () => {
    render(<ServiceSchedule initialZoneId="no-existe" />);
    expect(await screen.findByText("Elegí tu zona para ver cuándo pasan los servicios.")).toBeVisible();
  });

  it("explains an empty zone instead of showing an error", async () => {
    render(<ServiceSchedule initialZoneId={oeste.id} />);
    expect(await screen.findByText("No hay servicios programados en tu zona para los próximos 30 días.")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a skeleton shaped like the list while the services load", async () => {
    server.use(http.get("*/api/public/services", () => mockResponseAfter(300, () => HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 } }))));
    render(<ServiceSchedule initialZoneId={centro.id} />);

    expect(await screen.findByRole("region", { name: "Cargando servicios" })).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByText(/No hay servicios programados/, undefined, { timeout: 2000 })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Cargando servicios" })).not.toBeInTheDocument();
  });

  it.each([
    ["429", () => HttpResponse.json({ message: "x" }, { status: 429, headers: { "retry-after": "30" } }), "Hiciste muchas consultas seguidas. Probá de nuevo en un minuto."],
    ["a server error", () => HttpResponse.json({ message: "x" }, { status: 500 }), "El servicio no responde en este momento."],
    ["a body that breaks the contract", () => HttpResponse.json({ data: [{ id: 1 }], meta: {} }), "El servicio no responde en este momento."],
  ])("shows the message for %s and recovers on retry", async (_name, failure, message) => {
    let failing = true;
    server.use(http.get("*/api/public/services", ({ request }) => {
      if (failing) return failure();
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 100, totalPages: 1 }, url: request.url });
    }));
    render(<ServiceSchedule initialZoneId={centro.id} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    failing = false;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText(/No hay servicios programados/)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the unavailable message with a retry when the zones cannot be loaded", async () => {
    server.use(http.get("*/api/public/zones", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    render(<ServiceSchedule />);
    expect(await screen.findByRole("alert")).toHaveTextContent("El servicio no responde en este momento.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });

  it("shows nothing the public contract does not carry", async () => {
    server.use(http.get("*/api/public/services", () => HttpResponse.json({
      data: [{ id: "a", serviceTypeName: "Recolección domiciliaria", category: "WASTE_COLLECTION", scheduledDate: "2026-11-03T00:00:00.000Z", windowFrom: "06:00", windowTo: "10:00", stage: "PROGRAMADO", zones: ["Centro"], crewName: "Cuadrilla 4", vehiclePlate: "AB123CD" }],
      meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
    })));
    const { container } = render(<ServiceSchedule initialZoneId={centro.id} />);
    await screen.findByText("Recolección domiciliaria");
    expect(container).not.toHaveTextContent("Cuadrilla 4");
    expect(container).not.toHaveTextContent("AB123CD");
  });
});
