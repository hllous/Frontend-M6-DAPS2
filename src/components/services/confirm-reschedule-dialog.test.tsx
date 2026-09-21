import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { todayInArgentina } from "@/lib/argentina-date";
import { resetServiceFixtures, serviceFixtures } from "@/lib/services-fixtures";
import { ConfirmRescheduleDialog } from "./confirm-reschedule-dialog";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => resetServiceFixtures());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// SVC-1053 está A REPROGRAMAR y su fecha original (2026-09-05) ya es pasada.
const service = serviceFixtures.find((candidate) => candidate.id === "SVC-1053")!;

function renderDialog(onConfirmed = vi.fn()) {
  render(<ConfirmRescheduleDialog open onOpenChange={vi.fn()} service={service} onConfirmed={onConfirmed} />);
  return { onConfirmed, dateInput: screen.getByLabelText(/Nueva fecha/i) };
}

describe("ConfirmRescheduleDialog", () => {
  it("does not prefill the previous (past) date and restricts the input to today in Argentina onwards", () => {
    const { dateInput } = renderDialog();
    expect(dateInput).toHaveValue("");
    expect(dateInput).toHaveAttribute("min", todayInArgentina());
  });

  it("asks for a date when none was chosen, without calling the backend", async () => {
    let posts = 0;
    server.use(http.post("*/api/services/:id/confirm-reschedule", () => { posts += 1; return HttpResponse.json({}, { status: 500 }); }));
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Seleccione la nueva fecha del servicio.");
    expect(posts).toBe(0);
  });

  it("blocks a past date with a clear message and does not call the backend", async () => {
    let posts = 0;
    server.use(http.post("*/api/services/:id/confirm-reschedule", () => { posts += 1; return HttpResponse.json({}, { status: 500 }); }));
    const { dateInput, onConfirmed } = renderDialog();
    fireEvent.change(dateInput, { target: { value: "2020-01-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La nueva fecha no puede ser anterior a hoy.");
    expect(posts).toBe(0);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it("confirms a future date", async () => {
    const { dateInput, onConfirmed } = renderDialog();
    fireEvent.change(dateInput, { target: { value: "2099-09-12" } });
    await userEvent.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ status: "SCHEDULED", scheduledDate: "2099-09-12" })));
  });
});
