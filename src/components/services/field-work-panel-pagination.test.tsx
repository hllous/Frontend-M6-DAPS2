import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import type { Service, ServiceStatus } from "@/lib/services";
import { addServiceFixture, serviceFixtures } from "@/lib/services-fixtures";
import { FieldWorkPanel } from "./field-work-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const crewId = scenarios.fieldCrewLeader.actor.crewId!;

function crewService(index: number, status: ServiceStatus, scheduledDate: string): Service {
  const template = serviceFixtures.find((service) => service.crewId === crewId)!;
  return {
    ...structuredClone(template),
    id: `svc-mywork-${index}`,
    title: `Servicio de la cuadrilla ${String(index).padStart(2, "0")}`,
    status,
    scheduledDate,
  };
}

function day(offset: number) {
  const date = new Date(Date.UTC(2026, 0, 1 + offset));
  return date.toISOString().slice(0, 10);
}

describe("My Work de Field con más Services que una página", () => {
  beforeEach(() => {
    // 72 Services terminados, con fechas más nuevas que el único En curso: ordenados por fecha, el En curso
    // quedaría al final de la lista.
    for (let index = 1; index <= 72; index += 1) addServiceFixture(crewService(index, "COMPLETED", day(200 + index)));
    addServiceFixture(crewService(73, "IN_PROGRESS", day(1)));
  });

  it("muestra primero el Service En curso, el total, y permite llegar al último", async () => {
    const total = serviceFixtures.filter((service) => service.crewId === crewId).length;
    expect(total).toBeGreaterThan(50);
    const user = userEvent.setup();
    render(<FieldWorkPanel scenario={scenarios.fieldCrewLeader} />);

    expect(await screen.findByText(`${total} servicios asignados`)).toBeVisible();
    const list = screen.getByRole("list", { name: "Servicios asignados" });
    const first = within(list).getAllByRole("listitem")[0]!;
    expect(within(first).getByText("Servicio de la cuadrilla 73")).toBeVisible();

    while (screen.queryByRole("button", { name: "Ver más servicios" })) {
      await user.click(screen.getByRole("button", { name: "Ver más servicios" }));
    }
    expect(within(list).getAllByRole("listitem")).toHaveLength(total);
    // Entre los terminados va primero el más reciente: el más viejo queda último.
    const last = within(list).getAllByRole("listitem").at(-1)!;
    expect(within(last).getByText("Servicio de la cuadrilla 01")).toBeVisible();
  });
});
