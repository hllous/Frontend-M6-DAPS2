import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";
import { ServiceRequestError, servicesAdapter } from "@/lib/services";
import { scenarios } from "@/lib/scenarios";
import { serviceFixtures } from "@/lib/services-fixtures";
import { ServicesWorkspace } from "./services-workspace";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

afterEach(() => {
  vi.restoreAllMocks();
  server.resetHandlers();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/app");
});

describe("Services workspace period", () => {
  it("keeps the whole period for 54 services without sending a date filter", async () => {
    const services = Array.from({ length: 54 }, (_, i) => ({ ...serviceFixtures[0], id: `service-${i}` }));
    const list = vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({
      services: query?.pageSize === 1 ? services.slice(0, 1) : services,
      total: 54, totalPages: query?.pageSize === 1 ? 54 : 1, page: 1, pageSize: query?.pageSize ?? 100,
    }));
    render(<ServicesWorkspace />);
    expect(await screen.findByRole("region", { name: "Tabla operativa de Servicios" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveValue("todo");
    expect(list.mock.calls).toEqual([[{ pageSize: 1 }], [{ pageSize: 100 }]]);
  });

  it("defaults to the Argentine week for 240 services, loads every window page and persists a month choice", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T01:00:00Z")); // Sunday in Argentina, Monday in UTC.
    const list = vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({
      services: query?.pageSize === 1 ? [] : Array.from({ length: query?.page === 2 ? 1 : 20 }, (_, i) => ({
        ...serviceFixtures[0], id: `${query?.page ?? 1}-${i}`,
      })),
      total: query?.pageSize === 1 ? 240 : 21, totalPages: query?.pageSize === 1 ? 240 : 2,
      page: query?.page ?? 1, pageSize: query?.pageSize ?? 100,
    }));
    render(<ServicesWorkspace />);
    expect(await screen.findByRole("region", { name: "Tabla operativa de Servicios" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveValue("semana");
    expect(list).toHaveBeenCalledWith({ pageSize: 100, scheduledFrom: "2026-10-26", scheduledTo: "2026-11-01" });
    expect(list).toHaveBeenCalledWith({ pageSize: 100, page: 2, scheduledFrom: "2026-10-26", scheduledTo: "2026-11-01" });
    fireEvent.change(screen.getByRole("combobox", { name: "Período" }), { target: { value: "mes" } });
    await waitFor(() => expect(list).toHaveBeenCalledWith({ pageSize: 100, scheduledFrom: "2026-11-01", scheduledTo: "2026-11-30" }));
    expect(new URLSearchParams(window.location.search).get("periodo")).toBe("mes");
  });

  it("updates a period without replacing the map, table, or their scroll position", async () => {
    const list = vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => {
      const service = {
        ...serviceFixtures[0],
        id: query?.scheduledFrom ? "month-service" : "all-service",
        title: query?.scheduledFrom ? "Servicio del mes" : "Servicio de todo el período",
      };
      return {
        services: [service],
        total: 1,
        totalPages: 1,
        page: 1,
        pageSize: query?.pageSize ?? 100,
      };
    });

    render(<ServicesWorkspace />);
    const map = await screen.findByRole("region", { name: "Mapa territorial de Servicios" });
    const table = screen.getByRole("region", { name: "Tabla operativa de Servicios" });
    table.scrollTop = 48;

    fireEvent.change(screen.getByRole("combobox", { name: "Período" }), { target: { value: "mes" } });

    expect(await screen.findByText("Servicio del mes")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mapa territorial de Servicios" })).toBe(map);
    expect(screen.getByRole("region", { name: "Tabla operativa de Servicios" })).toBe(table);
    expect(table.scrollTop).toBe(48);
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("resolves a detail outside the window through get and displays its notice", async () => {
    const service = { ...serviceFixtures[0], id: "550e8400-e29b-41d4-a716-446655440921" };
    window.history.replaceState(null, "", `/app?periodo=semana&detail=${service.id}`);
    vi.spyOn(servicesAdapter, "list").mockResolvedValue({ services: [], total: 240, totalPages: 1, page: 1, pageSize: 100 });
    const get = vi.spyOn(servicesAdapter, "get").mockResolvedValue(service);
    render(<ServicesWorkspace />);
    expect(await screen.findByText("Este servicio está fuera del período seleccionado.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: `Detalle completo de ${service.title}` })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(service.id);
  });

  it("keeps one empty-state message in the table when the selected window is empty", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T01:00:00Z"));
    window.history.replaceState(null, "", "/app?periodo=semana");
    const list = vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({
      services: query?.scheduledFrom || query?.pageSize === 1 ? [] : [serviceFixtures[0]],
      total: query?.pageSize === 1 ? 54 : 0, totalPages: 1, page: 1, pageSize: 100,
    }));
    render(<ServicesWorkspace />);
    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(await screen.findByText("No hay servicios para mostrar en este período.")).toBeInTheDocument();
    expect(within(table).getAllByText("No hay servicios para mostrar en este período.")).toHaveLength(1);
    expect(screen.queryByText("No hay servicios en este período.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver todo el período" })).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledWith({ pageSize: 100, scheduledFrom: "2026-10-26", scheduledTo: "2026-11-01" });
    expect(new URLSearchParams(window.location.search).get("periodo")).toBe("semana");
  });

  it("retains the Field crew filter in every explicitly selected window page", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    const list = vi.spyOn(servicesAdapter, "list").mockResolvedValue({ services: [], total: 240, totalPages: 3, page: 1, pageSize: 100 });
    render(<ServicesWorkspace scenario={scenarios.fieldCrewLeader} />);
    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveValue("todo");
    expect(list.mock.calls).toEqual([
      [{ crewId: "crew-b", pageSize: 100 }],
      [{ crewId: "crew-b", pageSize: 100, page: 2 }],
      [{ crewId: "crew-b", pageSize: 100, page: 3 }],
    ]);
  });

  it("stops at twenty pages with an actionable period error", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    const list = vi.spyOn(servicesAdapter, "list").mockResolvedValue({ services: [], total: 2100, totalPages: 21, page: 1, pageSize: 100 });
    render(<ServicesWorkspace />);
    expect(await screen.findByText("El período tiene demasiados servicios; acote el período.")).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(20); // Twenty result pages; the explicit period needs no count request.
    expect(list).not.toHaveBeenCalledWith(expect.objectContaining({ page: 21 }));
    expect(screen.getByRole("combobox", { name: "Período" })).toBeEnabled();
  });

  it("ignores an unknown URL period and keeps the list for a genuinely unknown detail", async () => {
    window.history.replaceState(null, "", "/app?periodo=desconocido&detail=unknown-id");
    vi.spyOn(servicesAdapter, "list").mockResolvedValue({ services: [], total: 54, totalPages: 1, page: 1, pageSize: 100 });
    const get = vi.spyOn(servicesAdapter, "get").mockRejectedValue(new ServiceRequestError("No encontrado", 404));
    render(<ServicesWorkspace />);
    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    await waitFor(() => expect(get).toHaveBeenCalledWith("unknown-id"));
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveValue("todo");
    expect(screen.queryByText("Este servicio está fuera del período seleccionado.")).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has("periodo")).toBe(false);
  });
});
