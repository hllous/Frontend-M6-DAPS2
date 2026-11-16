import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetServiceFixtures, serviceFixtures } from "@/lib/services-fixtures";
import { ConfirmRescheduleDialog } from "./confirm-reschedule-dialog";
import { RescheduleReasonDialog } from "./reschedule-reason-dialog";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetServiceFixtures());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const service = serviceFixtures.find((candidate) => candidate.id === "SVC-1053")!;

const apiError = (statusCode: number, message: string) =>
  HttpResponse.json({ statusCode, message, error: "Error", timestamp: "t", path: "/p" }, { status: statusCode });

async function pickNextMonthDay15(user: ReturnType<typeof userEvent.setup>) {
  const dateButton = screen.getByRole("button", { name: /^Nueva fecha/i });
  await user.click(dateButton);
  await user.click(await screen.findByRole("button", { name: "Mes siguiente" }));
  await user.click(within(await screen.findByRole("grid")).getByRole("button", { name: /, 15 de /i }));
  expect(dateButton).toHaveTextContent(/^15\/\d{2}\/\d{4}/);
}

describe("ConfirmRescheduleDialog failures", () => {
  it("keeps the dialog open and shows the backend message when the date cannot be confirmed", async () => {
    server.use(http.post("*/api/services/:id/confirm-reschedule", () => apiError(409, "La cuadrilla ya tiene un servicio ese día.")));
    const onConfirmed = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmRescheduleDialog open onOpenChange={onOpenChange} service={service} onConfirmed={onConfirmed} />);

    await pickNextMonthDay15(user);
    await user.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));

    expect(await screen.findByText("La cuadrilla ya tiene un servicio ese día.")).toBeVisible();
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("sends the chosen date and the 24-hour window of the service to the backend", async () => {
    let body: unknown;
    server.use(
      http.post("*/api/services/:id/confirm-reschedule", async ({ request }) => {
        body = await request.json();
        return apiError(500, "No importa.");
      }),
    );
    const user = userEvent.setup();
    render(<ConfirmRescheduleDialog open onOpenChange={vi.fn()} service={service} onConfirmed={vi.fn()} />);

    await pickNextMonthDay15(user);
    await user.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      scheduledDate: expect.stringMatching(/^\d{4}-\d{2}-15$/),
      timeWindow: { start: "16:00", end: "19:00" },
    });
  });

  it("closes without calling the backend when cancelled", async () => {
    const hit = vi.fn();
    server.use(http.post("*/api/services/:id/confirm-reschedule", () => (hit(), HttpResponse.json({}))));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmRescheduleDialog open onOpenChange={onOpenChange} service={service} onConfirmed={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(hit).not.toHaveBeenCalled();
  });
});

describe("RescheduleReasonDialog flows", () => {
  const confirmedBody = { ...serviceFixtures[0], id: "SVC-1053", status: "SCHEDULED" };

  it("asks for the new date after the reason, without calling the backend", async () => {
    const hit = vi.fn();
    server.use(http.post("*/api/services/:id/reschedule", () => (hit(), HttpResponse.json(confirmedBody))));
    const user = userEvent.setup();
    render(<RescheduleReasonDialog open onOpenChange={vi.fn()} service={service} onRescheduled={vi.fn()} />);

    await user.type(screen.getByLabelText(/Motivo/), "Alerta meteorológica");
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    expect(await screen.findByText("Seleccione la nueva fecha.")).toBeVisible();
    expect(hit).not.toHaveBeenCalled();
  });

  it("shows the backend message and does not confirm a date when registering the reason fails", async () => {
    server.use(http.post("*/api/services/:id/reschedule", () => apiError(409, "El servicio ya fue reprogramado.")));
    const confirm = vi.fn();
    server.use(http.post("*/api/services/:id/confirm-reschedule", () => (confirm(), HttpResponse.json({}))));
    const user = userEvent.setup();
    render(<RescheduleReasonDialog open onOpenChange={vi.fn()} service={service} onRescheduled={vi.fn()} />);

    await user.type(screen.getByLabelText(/Motivo/), "Falta de personal");
    await pickNextMonthDay15(user);
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    expect(await screen.findByText("El servicio ya fue reprogramado.")).toBeVisible();
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Motivo/)).toBeEnabled();
  });

  it("registers the reason once and, after a failed confirmation, retries only the date", async () => {
    const reschedule = vi.fn();
    const confirm = vi.fn();
    server.use(
      http.post("*/api/services/:id/reschedule", async ({ request }) => {
        reschedule(await request.json());
        return HttpResponse.json({ ...confirmedBody, status: "RESCHEDULED" });
      }),
      http.post("*/api/services/:id/confirm-reschedule", () => {
        confirm();
        return confirm.mock.calls.length === 1 ? apiError(409, "Fecha ocupada.") : HttpResponse.json(confirmedBody);
      }),
    );
    const onRescheduled = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<RescheduleReasonDialog open onOpenChange={onOpenChange} service={service} onRescheduled={onRescheduled} />);

    await user.type(screen.getByLabelText(/Motivo/), "  Alerta meteorológica ");
    await pickNextMonthDay15(user);
    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    expect(await screen.findByText("Fecha ocupada.")).toBeVisible();
    expect(screen.getByLabelText(/Motivo/)).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Reprogramar" }));

    await waitFor(() => expect(onRescheduled).toHaveBeenCalledWith(expect.objectContaining({ status: "SCHEDULED" })));
    expect(reschedule).toHaveBeenCalledTimes(1);
    expect(reschedule).toHaveBeenCalledWith({ reason: "Alerta meteorológica" });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without any request when cancelled", async () => {
    const hit = vi.fn();
    server.use(http.post("*/api/services/:id/reschedule", () => (hit(), HttpResponse.json({}))));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<RescheduleReasonDialog open onOpenChange={onOpenChange} service={service} onRescheduled={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(hit).not.toHaveBeenCalled();
  });
});
