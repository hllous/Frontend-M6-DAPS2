import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { handlers } from "@/mocks/handlers";
import { serviceFixtures } from "@/lib/services-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { saveFieldDraft, snapshotService } from "@/lib/field-drafts";
import type { CreateRepairRequestInput, RepairRequest } from "@/lib/repair-requests";
import { CreateRepairRequestDialog } from "./create-repair-request-dialog";

const server = setupServer(...handlers);
const service = serviceFixtures.find((item) => item.id === "SVC-1043")!;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRepairRequestFixtures();
  window.localStorage.clear();
});
afterAll(() => server.close());

const input: CreateRepairRequestInput = {
  damageType: "BROKEN_PAVEMENT",
  address: "Av. Rivadavia 2200",
  severity: "MEDIUM",
  publicSafetyRisk: false,
  detectedInType: "SERVICE",
  detectedInId: service.id,
};
const composedAt = "2026-10-01T12:00:00.000Z";

function storeDraft() {
  saveFieldDraft({
    serviceId: service.id,
    actionType: "repairRequest",
    payload: { input, composedAt },
    composedAgainst: snapshotService(service),
    savedAt: composedAt,
  });
}

const emptyList = () => HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
const listWith = (request: RepairRequest) => HttpResponse.json({ data: [request], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } });
const failedList = () => HttpResponse.json({ message: "caído" }, { status: 500 });
const matching: RepairRequest = {
  id: "RR-1", damageType: "BROKEN_PAVEMENT", address: input.address, severity: "MEDIUM", publicSafetyRisk: false,
  detectedInType: "SERVICE", detectedInId: service.id, status: "REQUESTED",
  requestedAt: "2026-10-02T12:00:00.000Z", createdAt: "2026-10-02T12:00:00.000Z",
};

describe("CreateRepairRequestDialog: respuesta perdida y borradores", () => {
  it("avisa que no pudo verificar cuando falla la consulta posterior a una respuesta perdida", async () => {
    server.use(
      http.post("*/api/repair-requests", () => HttpResponse.error()),
      http.get("*/api/repair-requests", failedList),
    );
    const user = userEvent.setup();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);
    await user.type(screen.getByLabelText(/^Ubic/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: "Derivar" }));

    expect(await screen.findByText("No se pudo verificar")).toBeVisible();
    expect(window.localStorage.length).toBe(1);
  });

  it("deja la derivación como sin enviar cuando no hay una igual registrada", async () => {
    server.use(
      http.post("*/api/repair-requests", () => HttpResponse.error()),
      http.get("*/api/repair-requests", emptyList),
    );
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/^Ubic/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: "Derivar" }));

    expect(await screen.findByText("Sin enviar")).toBeVisible();
    expect(screen.getByRole("button", { name: "Verificar y reenviar" })).toBeEnabled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("al abrir con un borrador, detecta que la derivación ya existía y limpia el borrador", async () => {
    storeDraft();
    server.use(http.get("*/api/repair-requests", () => listWith(matching)));
    const onCreated = vi.fn();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={onCreated} />);

    expect(await screen.findByText("Ya estaba derivada.")).toBeVisible();
    expect(onCreated).toHaveBeenCalledWith(matching);
    expect(window.localStorage.length).toBe(0);
  });

  it("al abrir con un borrador, informa si no puede verificarlo", async () => {
    storeDraft();
    server.use(http.get("*/api/repair-requests", failedList));
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);

    expect(await screen.findByText("No se pudo verificar")).toBeVisible();
    expect(window.localStorage.length).toBe(1);
  });

  it("reenvía un borrador verificado y confirma la derivación creada", async () => {
    storeDraft();
    let posts = 0;
    server.use(
      http.get("*/api/repair-requests", emptyList),
      http.get("*/api/services/:serviceId", () => HttpResponse.json(service)),
      http.post("*/api/repair-requests", () => { posts += 1; return HttpResponse.json(matching); }),
    );
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={onCreated} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Verificar y reenviar" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Verificar y reenviar" }));

    expect(await screen.findByText("Derivada a Obras Públicas.")).toBeVisible();
    expect(posts).toBe(1);
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(window.localStorage.length).toBe(0);
  });

  it("si al reenviar el listado ya tiene la derivación, no vuelve a crearla", async () => {
    storeDraft();
    let posts = 0;
    let lists = 0;
    server.use(
      http.get("*/api/repair-requests", () => {
        lists += 1;
        return lists === 1 ? emptyList() : listWith(matching);
      }),
      http.post("*/api/repair-requests", () => { posts += 1; return HttpResponse.json(matching); }),
    );
    const user = userEvent.setup();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Verificar y reenviar" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Verificar y reenviar" }));

    expect(await screen.findByText("Ya estaba derivada.")).toBeVisible();
    expect(posts).toBe(0);
  });

  it("si la verificación previa al reenvío falla, no reenvía", async () => {
    storeDraft();
    let posts = 0;
    let lists = 0;
    server.use(
      http.get("*/api/repair-requests", () => {
        lists += 1;
        return lists === 1 ? emptyList() : failedList();
      }),
      http.post("*/api/repair-requests", () => { posts += 1; return HttpResponse.json(matching); }),
    );
    const user = userEvent.setup();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Verificar y reenviar" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Verificar y reenviar" }));

    expect(await screen.findByText("No se pudo verificar")).toBeVisible();
    expect(posts).toBe(0);
  });
});
