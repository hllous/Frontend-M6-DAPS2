import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { serviceFixtures } from "@/lib/services-fixtures";
import { CancelServiceDialog } from "./cancel-service-dialog";
import { RescheduleReasonDialog } from "./reschedule-reason-dialog";

const service = serviceFixtures[0];

describe("service dialog validation associations", () => {
  it("associates cancel reason errors with the reason field", async () => {
    const user = userEvent.setup();
    render(<CancelServiceDialog open onOpenChange={() => undefined} service={service} onCancelled={() => undefined} />);

    const reason = screen.getByLabelText(/Motivo/);
    expect(reason).toHaveAttribute("data-slot", "textarea");
    await user.click(screen.getByRole("button", { name: "Cancelar servicio" }));

    expect(reason).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(reason.getAttribute("aria-describedby")!.split(" ").at(-1)!)).toHaveTextContent("Debe indicar el motivo de la cancelación.");
  });

  it("associates reschedule reason errors with the reason field", async () => {
    const user = userEvent.setup();
    render(<RescheduleReasonDialog open onOpenChange={() => undefined} service={service} onRescheduled={() => undefined} />);

    const reason = screen.getByLabelText(/Motivo/);
    expect(reason).toHaveAttribute("data-slot", "textarea");
    await user.click(screen.getByRole("button", { name: "Mover a reprogramar" }));

    expect(reason).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(reason.getAttribute("aria-describedby")!.split(" ").at(-1)!)).toHaveTextContent("Debe indicar el motivo de la reprogramación.");
  });
});
