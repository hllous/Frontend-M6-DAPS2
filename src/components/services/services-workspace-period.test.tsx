import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { handlers } from "@/mocks/handlers";
import { ServiceRequestError, servicesAdapter } from "@/lib/services";
import { scenarios } from "@/lib/scenarios";
import { serviceFixtures } from "@/lib/services-fixtures";
import { ServicesWorkspace } from "./services-workspace";
import { choosePeriod, periodSelect } from "./services-period-test-helpers";

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
  it("warns with the dropped count summed across pages, and stays silent when the total only exceeds the rows because of paging (#651)", async () => {
    const mockPages = (dropped: (page: number) => number) => vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({
      services: query?.pageSize === 1 ? [] : [{ ...serviceFixtures[0], id: `p${query?.page ?? 1}` }],
      dropped: dropped(query?.page ?? 1),
      total: query?.pageSize === 1 ? 240 : 300, totalPages: query?.pageSize === 1 ? 240 : 3,
      page: query?.page ?? 1, pageSize: query?.pageSize ?? 100,
    }));
    const first = mockPages((page) => (page === 2 ? 2 : page === 3 ? 1 : 0));
    const { unmount } = render(<ServicesWorkspace />);
    expect(await screen.findByText("3 registros no se pudieron mostrar con esta versión de la aplicación.")).toBeVisible();
    unmount();
    first.mockRestore();
    mockPages(() => 0);
    render(<ServicesWorkspace />);
    expect(await screen.findByRole("region", { name: "Tabla operativa de Servicios" })).toBeVisible();
    expect(screen.queryByText(/no se pudieron? mostrar/)).toBeNull();
  });

  it("keeps the whole period for 54 services without sending a date filter", async () => {
    const services = Array.from({ length: 54 }, (_, i) => ({ ...serviceFixtures[0], id: `service-${i}` }));
    const list = vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => ({
      services: query?.pageSize === 1 ? services.slice(0, 1) : services,
      total: 54, totalPages: query?.pageSize === 1 ? 54 : 1, page: 1, pageSize: query?.pageSize ?? 100,
    }));
    render(<ServicesWorkspace />);
    expect(await screen.findByRole("region", { name: "Tabla operativa de Servicios" })).toBeVisible();
    expect(periodSelect()).toHaveTextContent("Todo el período");
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
    expect(periodSelect()).toHaveTextContent("Esta semana");
    expect(list).toHaveBeenCalledWith({ pageSize: 100, scheduledFrom: "2026-10-26", scheduledTo: "2026-11-01" });
    expect(list).toHaveBeenCalledWith({ pageSize: 100, page: 2, scheduledFrom: "2026-10-26", scheduledTo: "2026-11-01" });
    await choosePeriod("Este mes");
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
    const map = await screen.findByRole("region", { name: "Mapa de servicios" });
    const table = screen.getByRole("region", { name: "Tabla operativa de Servicios" });
    table.scrollTop = 48;

    await choosePeriod("Este mes");

    expect(await screen.findByText("Servicio del mes")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mapa de servicios" })).toBe(map);
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
    expect(await screen.findByText("Fuera del período elegido.")).toBeInTheDocument();
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
    expect(await screen.findByText("Sin servicios en este período.")).toBeInTheDocument();
    expect(within(table).getAllByText("Sin servicios en este período.")).toHaveLength(1);
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
    expect(periodSelect()).toHaveTextContent("Todo el período");
    expect(list.mock.calls).toEqual([
      [{ crewId: "crew-b", pageSize: 100 }],
      [{ crewId: "crew-b", pageSize: 100, page: 2 }],
      [{ crewId: "crew-b", pageSize: 100, page: 3 }],
    ]);
  });

  it("shows 25 services per page in chronological order with a pager and quick filters", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    const services = Array.from({ length: 60 }, (_, index) => ({ ...serviceFixtures[0], id: `s${index}`, title: `Servicio ${String(index).padStart(2, "0")}`, scheduledDate: `2026-09-${String(28 - (index % 28)).padStart(2, "0")}`, windowFrom: "08:00" }));
    vi.spyOn(servicesAdapter, "list").mockResolvedValue({ services, total: 60, totalPages: 1, page: 1, pageSize: 100 });
    const user = userEvent.setup();
    render(<ServicesWorkspace />);

    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(await screen.findByText("Mostrando 1–25 de 60")).toBeVisible();
    expect(within(table).getAllByRole("row").length - 1).toBe(25);
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Mostrando 26–50 de 60")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Mostrando 51–60 de 60")).toBeVisible();
    expect(within(table).getAllByRole("row").length - 1).toBe(10);
    expect(screen.getByRole("combobox", { name: "Estado" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Zona" })).toBeVisible();
  });

  const pick = async (combobox: string, option: string) => {
    const user = userEvent.setup();
    screen.getByRole("combobox", { name: combobox }).focus();
    await user.keyboard("{Enter}");
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: option }));
  };

  const svc = (id: string, over: Record<string, unknown> = {}) => ({ ...serviceFixtures[0], id, title: `Servicio ${id}`, scheduledDate: "2026-09-10", windowFrom: "08:00", ...over });
  const pagesOf = (pages: ReturnType<typeof svc>[][]) => vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => {
    const page = query?.page ?? 1;
    return { services: pages[page - 1], total: pages.flat().length, totalPages: pages.length, page, pageSize: 100 };
  });

  it("loads the remaining pages in order and with at most four requests in flight", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo&sort=service");
    let inFlight = 0;
    let peak = 0;
    vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => {
      const page = query?.page ?? 1;
      inFlight += 1; peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { services: [svc(`p${String(page).padStart(2, "0")}`)], total: 20, totalPages: 20, page, pageSize: 100 };
    });
    render(<ServicesWorkspace />);
    const table = await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(await screen.findByText("Mostrando 1–20 de 20")).toBeVisible(); // exactly 20 pages: all of them load
    expect(peak).toBeLessThanOrEqual(4);
    const titles = within(table).getAllByRole("row").slice(1).map((row) => row.textContent ?? "");
    expect(titles[0]).toContain("Servicio p01");
    expect(titles[19]).toContain("Servicio p20");
  });

  it("fails clearly when one of the remaining pages is rejected", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    vi.spyOn(servicesAdapter, "list").mockImplementation(async (query) => {
      if ((query?.page ?? 1) === 2) throw new ServiceRequestError("boom", 500);
      return { services: [svc("a")], total: 3, totalPages: 3, page: query?.page ?? 1, pageSize: 100 };
    });
    render(<ServicesWorkspace />);
    expect(await screen.findByText("No se pudieron cargar los servicios. Intente nuevamente.")).toBeInTheDocument();
  });

  it("filters by status and zone from the toolbar, goes back to page 1 and clamps an out-of-range page", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    const many = Array.from({ length: 60 }, (_, index) => svc(`s${String(index).padStart(2, "0")}`, { status: index < 30 ? "SCHEDULED" : "COMPLETED", zoneNames: [index % 2 === 0 ? "Zona Norte" : "Zona Sur"], scheduledDate: `2026-09-${String(1 + (index % 28)).padStart(2, "0")}` }));
    pagesOf([many]);
    const user = userEvent.setup();
    render(<ServicesWorkspace />);
    await screen.findByText("Mostrando 1–25 de 60");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Mostrando 26–50 de 60")).toBeVisible();

    await pick("Estado", "Completado");
    expect(await screen.findByText("Mostrando 1–25 de 30")).toBeVisible(); // page reset and filtered

    await pick("Zona", "Zona Norte");
    expect(await screen.findByText("Mostrando 1–15 de 15")).toBeVisible();
  });

  it("returns to page 1 when a filter changes and to the filtered page 1 after clearing it (no stale page)", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    pagesOf([Array.from({ length: 60 }, (_, index) => svc(`s${String(index).padStart(2, "0")}`, { status: index < 30 ? "SCHEDULED" : "COMPLETED" }))]);
    const user = userEvent.setup();
    render(<ServicesWorkspace />);
    await screen.findByText("Mostrando 1–25 de 60");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText("Mostrando 51–60 de 60")).toBeVisible();
    await pick("Estado", "Completado");
    await screen.findByText("Mostrando 1–25 de 30");
    await pick("Estado", "Todos");
    expect(await screen.findByText("Mostrando 1–25 de 60")).toBeVisible();
  });

  it("opens the page that holds a service selected from the URL", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo&sort=service&selected=s40");
    pagesOf([Array.from({ length: 60 }, (_, index) => svc(`s${String(index).padStart(2, "0")}`, { title: `Servicio ${String(index).padStart(2, "0")}` }))]);
    render(<ServicesWorkspace />);
    expect(await screen.findByText("Mostrando 26–50 de 60")).toBeVisible();
  });

  it("announces the number of services in a persistent live region", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    pagesOf([[svc("a"), svc("b")]]);
    render(<ServicesWorkspace />);
    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    expect(screen.getAllByRole("status").some((region) => region.textContent === "2 servicios")).toBe(true);
  });

  it("stops at twenty pages with an actionable period error", async () => {
    window.history.replaceState(null, "", "/app?periodo=todo");
    const list = vi.spyOn(servicesAdapter, "list").mockResolvedValue({ services: [], total: 2100, totalPages: 21, page: 1, pageSize: 100 });
    render(<ServicesWorkspace />);
    expect(await screen.findByText("Hay demasiados servicios en el período. Elija un período más corto.")).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1); // The first page already reports 21 pages: the rest is not requested.
    expect(list).not.toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    expect(periodSelect()).toBeEnabled();
  });

  it("ignores an unknown URL period and keeps the list for a genuinely unknown detail", async () => {
    window.history.replaceState(null, "", "/app?periodo=desconocido&detail=unknown-id");
    vi.spyOn(servicesAdapter, "list").mockResolvedValue({ services: [], total: 54, totalPages: 1, page: 1, pageSize: 100 });
    const get = vi.spyOn(servicesAdapter, "get").mockRejectedValue(new ServiceRequestError("No encontrado", 404));
    render(<ServicesWorkspace />);
    await screen.findByRole("region", { name: "Tabla operativa de Servicios" });
    await waitFor(() => expect(get).toHaveBeenCalledWith("unknown-id"));
    expect(periodSelect()).toHaveTextContent("Todo el período");
    expect(screen.queryByText("Fuera del período elegido.")).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has("periodo")).toBe(false);
  });
});
