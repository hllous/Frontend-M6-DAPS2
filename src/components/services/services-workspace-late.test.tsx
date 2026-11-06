import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { servicesAdapter, type Service } from "@/lib/services";
import { serviceFixtures } from "@/lib/services-fixtures";

import { invalidateServicesListCache } from "./services-list-cache";
import { ServicesWorkspace } from "./services-workspace";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  sessionStorage.clear();
  invalidateServicesListCache();
  vi.restoreAllMocks();
  server.resetHandlers();
  window.history.replaceState(null, "", "/app");
});

const result = (recordedAt: string) => ({ id: `r-${recordedAt}`, zoneId: "zone-1", status: "SERVICED" as const, recordedAt, attachments: [] });
const base = serviceFixtures[0];
const services: Service[] = [
  { ...base, id: "late-1", title: "Tardío uno", status: "COMPLETED", scheduledDate: "2026-09-05", zoneResults: [result("2026-09-05T20:00:00.000Z"), result("2026-09-06T15:00:00.000Z")] },
  { ...base, id: "ontime-1", title: "A tiempo uno", status: "COMPLETED", scheduledDate: "2026-09-05", zoneResults: [result("2026-09-05T15:00:00.000Z")] },
  { ...base, id: "open-1", title: "Pendiente uno", status: "SCHEDULED", scheduledDate: "2026-09-05", zoneResults: [] },
];

function mockList() {
  vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({
    services: query?.pageSize === 1 ? services.slice(0, 1) : services,
    total: services.length, totalPages: 1, page: 1, pageSize: query?.pageSize ?? 100,
  }));
}

describe("Servicios: filtro «Fuera de horario»", () => {
  it("aplica ?late=true desde la URL y muestra solo los servicios terminados después de su fecha", async () => {
    window.history.replaceState(null, "", "/app?destination=services&periodo=todo&late=true");
    mockList();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(await within(table).findByText("Tardío uno")).toBeVisible();
    expect(within(table).queryByText("A tiempo uno")).toBeNull();
    expect(within(table).queryByText("Pendiente uno")).toBeNull();
    expect(screen.getAllByText("1 filtro activo").length).toBeGreaterThan(0);
  });

  it("se activa desde la opción del filtro Estado y queda en la URL", async () => {
    window.history.replaceState(null, "", "/app?destination=services&periodo=todo");
    mockList();
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);
    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(await within(table).findByText("A tiempo uno")).toBeVisible();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Estado/ }));
    await user.click(await screen.findByRole("checkbox", { name: "Fuera de horario" }));

    expect(within(table).queryByText("A tiempo uno")).toBeNull();
    expect(within(table).getByText("Tardío uno")).toBeVisible();
    expect(new URLSearchParams(window.location.search).get("late")).toBe("true");
  });
});
