import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { handlers } from "@/mocks/handlers";
import { serviceFixtures } from "@/lib/services-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
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

describe("CreateRepairRequestDialog", () => {
  it("validates required values and keeps publicSafetyRisk independent from severity", async () => {
    const user = userEvent.setup();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);
    const dialog = screen.getByRole("dialog");

    await user.click(screen.getByRole("button", { name: /Crear deriv.*a M3/ }));
    expect(screen.getByText("Debe indicar la ubicación del daño.")).toBeVisible();

    await user.selectOptions(screen.getByLabelText(/^Severidad/), "LOW");
    await user.click(screen.getByLabelText(/^Sí,/));
    await user.type(screen.getByLabelText(/^Ubic/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: /Crear deriv.*a M3/ }));

    await waitFor(() => expect(screen.getByText(/pendiente de respuesta de M3/i)).toBeVisible());
    expect(dialog).toHaveTextContent("SVC-1043");
  });

  it("shows an Unsent referral and retains entered values after a network failure", async () => {
    server.use(http.post("*/api/repair-requests", () => HttpResponse.error()));
    const user = userEvent.setup();
    render(<CreateRepairRequestDialog open service={service} onOpenChange={() => undefined} onCreated={() => undefined} />);

    await user.type(screen.getByLabelText(/^Ubic/), "Av. Rivadavia 2200");
    await user.click(screen.getByRole("button", { name: /Crear deriv.*a M3/ }));

    await waitFor(() => expect(screen.getByText(/Unsent referral/i)).toBeVisible());
    expect(screen.getByLabelText(/^Ubic/)).toHaveValue("Av. Rivadavia 2200");
    expect(window.localStorage.length).toBe(1);
  });
});
