import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";

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
const ROW = /Recorrido Casco Histórico/;
const DETAIL = /Ver detalle de la frecuencia de Recolección domiciliaria para Recorrido Casco Histórico/;

async function openDetail(user: ReturnType<typeof userEvent.setup>) {
  const row = await screen.findByRole("row", { name: ROW });
  await user.click(within(row).getByRole("button", { name: DETAIL }));
  return screen.findByRole("dialog", { name: "Detalle de frecuencia de servicio" });
}

describe("ServiceFrequenciesPanel flows", () => {
  it("shows the load failure and recovers when the user retries", async () => {
    server.use(
      http.get("*/api/service-frequencies", () =>
        HttpResponse.json(
          { statusCode: 500, message: "Frecuencias no disponibles.", error: "Internal", timestamp: "t", path: "/p" },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={office} />);

    expect(await screen.findByText("Frecuencias no disponibles.")).toBeVisible();

    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("row", { name: ROW })).toBeVisible();
    expect(screen.queryByText("Frecuencias no disponibles.")).not.toBeInTheDocument();
  });

  it("closes a frequency's validity after confirmation and reloads the list", async () => {
    const close = vi.spyOn(serviceFrequenciesAdapter, "close");
    const list = vi.spyOn(serviceFrequenciesAdapter, "list");
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={office} />);
    const sheet = await openDetail(user);
    await user.click(within(sheet).getByRole("button", { name: "Cerrar vigencia" }));
    const before = list.mock.calls.length;

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Cerrar vigencia$/ }));

    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(before));
  });

  it("keeps the confirmation open and shows the message when closing the validity fails", async () => {
    vi.spyOn(serviceFrequenciesAdapter, "close").mockRejectedValue(new Error("La vigencia ya está cerrada."));
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={office} />);
    const sheet = await openDetail(user);
    await user.click(within(sheet).getByRole("button", { name: "Cerrar vigencia" }));

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Cerrar vigencia$/ }));

    expect(await screen.findByText("La vigencia ya está cerrada.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Confirmar cierre de vigencia" })).toBeVisible();
  });

  it("sends the toggled weekdays on edit, shows a rejected update, and saves on retry", async () => {
    const update = vi
      .spyOn(serviceFrequenciesAdapter, "update")
      .mockRejectedValueOnce(new Error("Se superpone con otra frecuencia."))
      .mockResolvedValue({} as ServiceFrequency);
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={office} />);
    const sheet = await openDetail(user);
    await user.click(within(sheet).getByRole("button", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar frecuencia" });
    const saturday = within(dialog).getByRole("button", { name: "Sábado" });
    const wasPressed = saturday.getAttribute("aria-pressed") === "true";

    await user.click(saturday);
    expect(saturday).toHaveAttribute("aria-pressed", String(!wasPressed));
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    expect(await within(dialog).findByText("Se superpone con otra frecuencia.")).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    const sent = update.mock.calls[1][1].weekdays as number[];
    expect(sent.includes(6)).toBe(!wasPressed);
    expect([...sent].sort((a, b) => a - b)).toEqual(sent);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar frecuencia" })).not.toBeInTheDocument());
  });

  it("keeps the creation dialog open with a message when the data is incomplete", async () => {
    const create = vi.spyOn(serviceFrequenciesAdapter, "create");
    const user = userEvent.setup();
    render(<ServiceFrequenciesPanel scenario={office} />);
    await screen.findByRole("row", { name: ROW });

    await user.click(screen.getByRole("button", { name: "Nueva frecuencia" }));
    const dialog = await screen.findByRole("dialog", { name: "Nueva frecuencia" });
    await user.click(within(dialog).getByRole("button", { name: "Crear frecuencia" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(await within(dialog).findByRole("alert")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Nueva frecuencia" })).toBeVisible();
  });
});
