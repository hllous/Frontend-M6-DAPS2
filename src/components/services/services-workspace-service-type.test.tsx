import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

const base = serviceFixtures[0];
const services: Service[] = [
  { ...base, id: "a", title: "Barrido uno", serviceTypeId: "st-street-cleaning", status: "COMPLETED", scheduledDate: "2026-09-05" },
  { ...base, id: "b", title: "Poda uno", serviceTypeId: "st-tree-pruning", status: "COMPLETED", scheduledDate: "2026-09-05" },
];

describe("Servicios: filtro por tipo de servicio (?serviceType=)", () => {
  it("muestra solo los servicios del tipo pedido en la URL y lo cuenta como filtro activo", async () => {
    window.history.replaceState(null, "", "/app?destination=services&periodo=todo&serviceType=st-street-cleaning");
    vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({ services, total: 2, totalPages: 1, page: 1, pageSize: query?.pageSize ?? 100 }));
    render(<ServicesWorkspace scenario={scenarios.officeDutyQueue} />);
    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(await within(table).findByText("Barrido uno")).toBeVisible();
    expect(within(table).queryByText("Poda uno")).toBeNull();
    expect(screen.getAllByText("1 filtro activo").length).toBeGreaterThan(0);
    expect(new URLSearchParams(window.location.search).get("serviceType")).toBe("st-street-cleaning");
  });
});
