import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { clearFieldDraft } from "@/lib/field-drafts";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { CreateStreetClosureRequestDialog } from "./create-street-closure-request-dialog";

const server = setupServer(...handlers);
const service = serviceFixtures.find((item) => item.id === "SVC-1050")!;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetStreetClosureRequestFixtures();
  clearFieldDraft(service.id, "streetClosureRequest");
});
afterEach(() => {
  server.resetHandlers();
  clearFieldDraft(service.id, "streetClosureRequest");
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function renderDialog() {
  return render(
    <CreateStreetClosureRequestDialog
      open={true}
      onOpenChange={vi.fn()}
      service={service}
      onCreated={vi.fn()}
    />,
  );
}

describe("CreateStreetClosureRequestDialog", () => {
  it("prefills the Service window while keeping both fields editable", async () => {
    renderDialog();

    expect(await screen.findByLabelText("Inicio solicitado *")).toHaveValue("2026-09-05T08:00");
    expect(screen.getByLabelText("Fin solicitado *")).toHaveValue("2026-09-05T12:00");
    expect(screen.getByLabelText("Inicio solicitado *")).not.toBeDisabled();
    expect(await screen.findByText(service.title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(service.id))).toBeInTheDocument();
  });

  it("adds and removes sections with focus moved to the affected row", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Agregar tramo afectado" }));
    const sectionStreets = screen.getAllByLabelText("Calle *", { selector: "input" });
    expect(sectionStreets).toHaveLength(2);
    expect(document.activeElement).toBe(sectionStreets[1]);

    await user.click(screen.getByRole("button", { name: "Quitar tramo afectado 2" }));
    await waitFor(() => expect(document.activeElement).toBe(sectionStreets[0]));
    expect(screen.getAllByLabelText("Calle *", { selector: "input" })).toHaveLength(1);
  });

  it("rejects empty structured sections with field-level accessible errors", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Crear solicitud de corte" }));

    expect(screen.getByText("El motivo es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("Indique el nombre de la calle")).toBeInTheDocument();
    expect(screen.getByLabelText("Calle *", { selector: "input" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Calle *", { selector: "input" })).toHaveAttribute(
      "aria-describedby",
      "affected-section-0-street-error",
    );
  });

  it("shows a successful creation as pending", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Motivo *"), "Trabajo operativo con circulación reducida");
    await user.type(screen.getByLabelText("Calle *", { selector: "input" }), "Bulevar Costero");
    await user.type(screen.getByLabelText("Desde calle transversal *"), "Av. Belgrano");
    await user.type(screen.getByLabelText("Hasta calle transversal *"), "Calle 12");
    await user.click(screen.getByRole("button", { name: "Crear solicitud de corte" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Solicitud pendiente"));
    expect(screen.getByText(/M6 creó el registro/i)).toBeInTheDocument();
  });

  it("retains entered values and presents an unsent state after a network failure", async () => {
    const user = userEvent.setup();
    server.use(http.post("*/api/street-closure-requests", () => HttpResponse.error()));
    renderDialog();

    const reason = screen.getByLabelText("Motivo *");
    await user.type(reason, "Corte necesario para el operativo");
    await user.type(screen.getByLabelText("Calle *", { selector: "input" }), "Calle 12");
    await user.type(screen.getByLabelText("Desde calle transversal *"), "Av. Belgrano");
    await user.type(screen.getByLabelText("Hasta calle transversal *"), "Av. Libertad");
    await user.click(screen.getByRole("button", { name: "Crear solicitud de corte" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Solicitud sin enviar"));
    expect(reason).toHaveValue("Corte necesario para el operativo");
  });
});
