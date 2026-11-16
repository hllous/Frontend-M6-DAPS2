import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { DAMAGE_TYPE_LABELS, SEVERITY_LABELS, type Container } from "@/lib/containers";
import { getContainerFixture, resetContainerFixtures } from "@/lib/containers-fixtures";
import { ReportDamageDialog } from "./report-damage-dialog";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetContainerFixtures(); vi.restoreAllMocks(); });
afterAll(() => server.close());

const container = () => getContainerFixture("cont-1") as Container;

async function choose(user: ReturnType<typeof userEvent.setup>, name: RegExp, option: string) {
  await user.click(screen.getByRole("combobox", { name }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("ReportDamageDialog", () => {
  it("no muestra nada sin contenedor", () => {
    const { container: dom } = render(<ReportDamageDialog open onOpenChange={vi.fn()} container={null} onSuccess={vi.fn()} />);
    expect(dom).toBeEmptyDOMElement();
  });

  it("exige tipo de daño y severidad antes de llamar al backend", async () => {
    let posts = 0;
    server.use(http.post("*/api/containers/:id/report-damage", () => { posts += 1; return HttpResponse.json({}); }));
    const user = userEvent.setup();
    render(<ReportDamageDialog open onOpenChange={vi.fn()} container={container()} onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Confirmar daño" }));

    expect(await screen.findByText("Debe seleccionar el tipo de daño.")).toBeVisible();
    expect(screen.getByText("Debe seleccionar la severidad del daño.")).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Tipo de daño/ })).toHaveAttribute("aria-invalid", "true");
    expect(posts).toBe(0);
  });

  it("limpia cada error al elegir el valor que faltaba", async () => {
    const user = userEvent.setup();
    render(<ReportDamageDialog open onOpenChange={vi.fn()} container={container()} onSuccess={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Confirmar daño" }));
    await screen.findByText("Debe seleccionar el tipo de daño.");

    await choose(user, /Tipo de daño/, Object.values(DAMAGE_TYPE_LABELS)[0]!);
    expect(screen.queryByText("Debe seleccionar el tipo de daño.")).not.toBeInTheDocument();
    await choose(user, /Severidad/, Object.values(SEVERITY_LABELS)[0]!);
    expect(screen.queryByText("Debe seleccionar la severidad del daño.")).not.toBeInTheDocument();
  });

  it("registra el daño, avisa al panel y cierra el diálogo", async () => {
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ReportDamageDialog open onOpenChange={onOpenChange} container={container()} onSuccess={onSuccess} />);

    await choose(user, /Tipo de daño/, Object.values(DAMAGE_TYPE_LABELS)[0]!);
    await choose(user, /Severidad/, Object.values(SEVERITY_LABELS)[0]!);
    await user.click(screen.getByRole("checkbox", { name: /Obras Públicas/ }));
    await user.click(screen.getByRole("button", { name: "Confirmar daño" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess.mock.calls[0]![0]).toMatchObject({ id: "cont-1", status: "DAMAGED" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("muestra el rechazo del backend y no avisa éxito ni cierra", async () => {
    server.use(http.post("*/api/containers/:id/report-damage", () => HttpResponse.json(
      { statusCode: 409, error: "Conflict", message: "El contenedor ya está dañado.", timestamp: new Date().toISOString(), path: "/api/containers/cont-1/report-damage" },
      { status: 409 },
    )));
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ReportDamageDialog open onOpenChange={onOpenChange} container={container()} onSuccess={onSuccess} />);

    await choose(user, /Tipo de daño/, Object.values(DAMAGE_TYPE_LABELS)[0]!);
    await choose(user, /Severidad/, Object.values(SEVERITY_LABELS)[0]!);
    await user.click(screen.getByRole("button", { name: "Confirmar daño" }));

    expect(await screen.findByText("El contenedor ya está dañado.")).toBeVisible();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirmar daño" })).toBeEnabled();
  });

  it("sube la evidencia adjunta después de registrar el daño y cierra cuando todo salió bien", async () => {
    let uploads = 0;
    server.use(http.post("*/api/evidence", () => {
      uploads += 1;
      return HttpResponse.json({ id: "att-1", url: "https://evidence.example.com/foto.jpg", filename: "foto.jpg", contentType: "image/jpeg", uploadedAt: "2026-10-12T12:01:00.000Z" });
    }));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ReportDamageDialog open onOpenChange={onOpenChange} container={container()} onSuccess={vi.fn()} />);

    await choose(user, /Tipo de daño/, Object.values(DAMAGE_TYPE_LABELS)[0]!);
    await choose(user, /Severidad/, Object.values(SEVERITY_LABELS)[0]!);
    const dialog = screen.getByRole("dialog");
    await user.upload(dialog.querySelector<HTMLInputElement>("input[type=file]")!, new File(["foto"], "foto.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: "Confirmar daño" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(uploads).toBe(1);
  });
});
