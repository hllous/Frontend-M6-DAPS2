import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { serviceFrequenciesAdapter, type ServiceFrequency } from "@/lib/service-frequencies";
import { resetServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { ServiceFrequenciesPanel } from "./service-frequencies-panel";

const server = setupServer(...handlers);
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  resetServiceFrequencyFixtures();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const office = scenarios.officeDutyQueue;

async function choose(user: ReturnType<typeof userEvent.setup>, name: string, option: string | RegExp) {
  await user.click(screen.getByRole("combobox", { name }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("ServiceFrequenciesPanel: filtros", () => {
  it("pide al backend cada filtro elegido y vuelve a pedir sin él al elegir Todos", async () => {
    const list = vi.spyOn(serviceFrequenciesAdapter, "list");
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={office} />);
    await screen.findByRole("row", { name: /Recorrido Casco Histórico/ });
    const lastQuery = () => list.mock.calls.at(-1)![0] ?? {};

    await choose(user, "Filtrar por turno", "Tarde");
    await waitFor(() => expect(lastQuery()).toMatchObject({ shift: "AFTERNOON" }));

    await choose(user, "Filtrar por día", "Martes");
    await waitFor(() => expect(lastQuery()).toMatchObject({ shift: "AFTERNOON", weekday: 2 }));

    await choose(user, "Filtrar por turno", "Todos");
    await waitFor(() => expect(lastQuery().shift).toBeUndefined());
    expect(lastQuery().weekday).toBe(2);

    await user.click(screen.getByRole("combobox", { name: "Filtrar por tipo" }));
    const typeOptions = await screen.findAllByRole("option");
    await user.click(typeOptions[1]!);
    await waitFor(() => expect(lastQuery().serviceTypeId).toBeTruthy());

    await user.click(screen.getByRole("combobox", { name: "Filtrar por recorrido" }));
    const routeOptions = await screen.findAllByRole("option");
    await user.click(routeOptions[1]!);
    await waitFor(() => expect(lastQuery().routeId).toBeTruthy());
  });

  it("crea una frecuencia completa con días, turno, recorrido y tipo elegidos", async () => {
    const create = vi.spyOn(serviceFrequenciesAdapter, "create").mockResolvedValue({} as ServiceFrequency);
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={office} />);
    await screen.findByRole("row", { name: /Recorrido Casco Histórico/ });

    await user.click(screen.getByRole("button", { name: "Nueva frecuencia" }));
    const dialog = await screen.findByRole("dialog", { name: "Nueva frecuencia" });
    await user.click(within(dialog).getByRole("combobox", { name: "Tipo de servicio" }));
    await user.click(await screen.findByRole("option", { name: "Recolección domiciliaria · WASTE-ROUTE" }));
    await user.click(within(dialog).getByRole("combobox", { name: "Recorrido" }));
    await user.click((await screen.findAllByRole("option"))[0]!);
    await user.click(within(dialog).getByRole("combobox", { name: "Turno" }));
    await user.click(await screen.findByRole("option", { name: "Noche" }));
    const monday = within(dialog).getByRole("button", { name: "Lunes" });
    const wednesday = within(dialog).getByRole("button", { name: "Miércoles" });
    const mondayWasOn = monday.getAttribute("aria-pressed") === "true";
    const wednesdayWasOn = wednesday.getAttribute("aria-pressed") === "true";
    await user.click(monday);
    await user.click(wednesday);
    await user.click(wednesday);
    expect(monday).toHaveAttribute("aria-pressed", String(!mondayWasOn));
    expect(wednesday).toHaveAttribute("aria-pressed", String(wednesdayWasOn));

    await user.click(within(dialog).getByRole("button", { name: "Crear frecuencia" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).toMatchObject({ shift: "NIGHT" });
    expect((create.mock.calls[0]![0].weekdays as number[]).includes(1)).toBe(!mondayWasOn);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nueva frecuencia" })).not.toBeInTheDocument());
  });

  it("avisa cuando no se pueden cargar los catálogos relacionados", async () => {
    const { http, HttpResponse } = await import("msw");
    server.use(http.get("*/api/routes", () => HttpResponse.json(
      { statusCode: 503, error: "Service Unavailable", message: "Recorridos caídos.", timestamp: "t", path: "/api/routes" },
      { status: 503 },
    )));
    render(<ServiceFrequenciesPanel scenario={office} />);

    expect((await screen.findAllByText("Recorridos caídos.")).length).toBeGreaterThan(0);
  });
});
