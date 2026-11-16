import { chooseCatalogOption } from "./catalog-a-test-controls";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { GreenSpacesPanel } from "./green-spaces-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

const apiError = (status: number, message: string) =>
  HttpResponse.json({ statusCode: status, error: "Error", message, timestamp: new Date().toISOString(), path: "/api/green-spaces" }, { status });

async function openCreate(user: ReturnType<typeof userEvent.setup>, area: string) {
  render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
  await screen.findByText("Parque del Bicentenario");
  await user.click(screen.getByRole("button", { name: "Registrar espacio verde" }));
  await user.type(screen.getByLabelText("Nombre"), "Plaza de prueba");
  await user.type(screen.getByLabelText("Superficie (m²)"), area);
  await chooseCatalogOption(user, screen.getByLabelText("Zona en el formulario"), "Belgrano");
}

describe("GreenSpacesPanel: validaciones y fallas", () => {
  it("exige nombre, superficie y zona", async () => {
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByText("Parque del Bicentenario");
    await user.click(screen.getByRole("button", { name: "Registrar espacio verde" }));

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect((await screen.findAllByText("Indique nombre, una superficie mayor que cero y una zona."))[0]).toBeVisible();
  });

  it("rechaza una superficie mayor que el máximo sin llamar al backend", async () => {
    let posts = 0;
    server.use(http.post("*/api/green-spaces", () => { posts += 1; return HttpResponse.json({}); }));
    const user = userEvent.setup();
    await openCreate(user, "100000000");

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect((await screen.findAllByText(/La superficie no puede superar/))[0]).toBeVisible();
    expect(posts).toBe(0);
  });

  it("muestra el rechazo del backend al registrar y deja abierto el formulario", async () => {
    server.use(http.post("*/api/green-spaces", () => apiError(409, "Ya existe un espacio verde con ese nombre.")));
    const user = userEvent.setup();
    await openCreate(user, "275");

    await user.click(screen.getByRole("button", { name: "Guardar espacio verde" }));

    expect((await screen.findAllByText("Ya existe un espacio verde con ese nombre."))[0]).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("muestra el rechazo del backend al dar de baja", async () => {
    server.use(http.delete("*/api/green-spaces/:id", () => apiError(409, "Tiene servicios pendientes.")));
    const user = userEvent.setup();
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);
    const row = await screen.findByRole("row", { name: /Parque del Bicentenario/ });
    await user.click(within(row).getByRole("button", { name: /^Ver detalle de / }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Dar de baja" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Dar de baja el espacio verde/ }));

    expect((await screen.findAllByText("Tiene servicios pendientes."))[0]).toBeVisible();
  });
});
