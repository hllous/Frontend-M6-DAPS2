import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  return { onConfirmed, dateInput: screen.getByRole("button", { name: /^Nueva fecha/i }) };
}

describe("ConfirmRescheduleDialog", () => {
  it("does not prefill the previous (past) date and shows the 24-hour window of the service", () => {
    const { dateInput } = renderDialog();
    expect(dateInput).toHaveTextContent("dd/mm/aaaa");
    const from = within(screen.getByRole("group", { name: /Desde/ }));
    const to = within(screen.getByRole("group", { name: /Hasta/ }));
    expect(from.getByRole("combobox", { name: "Hora" })).toHaveTextContent("16");
    expect(from.getByRole("combobox", { name: "Minutos" })).toHaveTextContent("00");
    expect(to.getByRole("combobox", { name: "Hora" })).toHaveTextContent("19");
  });

  it("disables days before today in Argentina", async () => {
    const { dateInput } = renderDialog();
    const day = todayInArgentina().split("-").map(Number)[2];
    await userEvent.click(dateInput);
    const grid = await screen.findByRole("grid");
    expect(within(grid).getByRole("button", { name: new RegExp(`, ${day} de `, "i") })).toBeEnabled();
    if (day > 1) expect(within(grid).getByRole("button", { name: new RegExp(`, ${day - 1} de `, "i") })).toBeDisabled();
  });

  it("asks for a date when none was chosen, without calling the backend", async () => {
    let posts = 0;
    server.use(http.post("*/api/services/:id/confirm-reschedule", () => { posts += 1; return HttpResponse.json({}, { status: 500 }); }));
    const { dateInput } = renderDialog();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Seleccione la nueva fecha del servicio.");
    expect(dateInput).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(dateInput.getAttribute("aria-describedby")!)).toHaveTextContent("Seleccione la nueva fecha del servicio.");
    expect(posts).toBe(0);
  });

  it("confirms a future date", async () => {
    const { dateInput, onConfirmed } = renderDialog();
    await userEvent.click(dateInput);
    await userEvent.click(await screen.findByRole("button", { name: "Mes siguiente" }));
    await userEvent.click(within(await screen.findByRole("grid")).getByRole("button", { name: /, 15 de /i }));
    expect(dateInput).toHaveTextContent(/^15\/\d{2}\/\d{4}/);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar nueva fecha" }));
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ status: "SCHEDULED" })));
  });
});
