import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { clearFieldDraft } from "@/lib/field-drafts";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { serviceFixtures } from "@/lib/services-fixtures";
import { resetTreeInterventionFixtures, treeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { CreateStreetClosureRequestDialog } from "./create-street-closure-request-dialog";

const server = setupServer(...handlers);
const service = serviceFixtures.find((item) => item.id === "SVC-1050")!;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetStreetClosureRequestFixtures();
  resetTreeInterventionFixtures();
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

function renderTreeDialog(onCreated = vi.fn()) {
  const treeIntervention = treeInterventionFixtures.find((item) => item.id === "intervention-2")!;
  return render(
    <CreateStreetClosureRequestDialog
      open={true}
      onOpenChange={vi.fn()}
      service={null}
      treeIntervention={treeIntervention}
      onCreated={onCreated}
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

  it("creates a pending request with the authorized TreeIntervention as canonical source", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderTreeDialog(onCreated);

    expect(screen.getByLabelText("Motivo *")).toHaveValue("");
    expect(screen.getByText("Av. Mitre 1140")).toBeVisible();
    await user.type(screen.getByLabelText("Motivo *"), "Corte preventivo durante el tratamiento del arbolado");
    fireEvent.change(screen.getByLabelText("Inicio solicitado *"), { target: { value: "2026-09-10T09:00" } });
    fireEvent.change(screen.getByLabelText("Fin solicitado *"), { target: { value: "2026-09-10T11:00" } });
    await user.type(screen.getByLabelText("Calle *", { selector: "input" }), "Av. Mitre");
    await user.type(screen.getByLabelText("Desde calle transversal *"), "Calle 10");
    await user.type(screen.getByLabelText("Hasta calle transversal *"), "Calle 12");
    await user.click(screen.getByRole("button", { name: "Crear solicitud de corte" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("desde la intervención autorizada"));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "TREE_INTERVENTION",
      sourceId: "intervention-2",
      status: "REQUESTED",
      sourceContext: expect.objectContaining({ sourceType: "TREE_INTERVENTION", sourceId: "intervention-2" }),
    }));
  });

  it("does not render a TreeIntervention entry point before authorization", () => {
    const requestedIntervention = treeInterventionFixtures.find((item) => item.id === "intervention-1")!;
    render(
      <CreateStreetClosureRequestDialog
        open={true}
        onOpenChange={vi.fn()}
        treeIntervention={requestedIntervention}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a TreeIntervention request unsent after a network failure", async () => {
    const user = userEvent.setup();
    server.use(http.post("*/api/street-closure-requests", () => HttpResponse.error()));
    renderTreeDialog();

    const reason = screen.getByLabelText("Motivo *");
    await user.type(reason, "Corte preventivo durante el tratamiento del arbolado");
    fireEvent.change(screen.getByLabelText("Inicio solicitado *"), { target: { value: "2026-09-10T09:00" } });
    fireEvent.change(screen.getByLabelText("Fin solicitado *"), { target: { value: "2026-09-10T11:00" } });
    await user.type(screen.getByLabelText("Calle *", { selector: "input" }), "Av. Mitre");
    await user.type(screen.getByLabelText("Desde calle transversal *"), "Calle 10");
    await user.type(screen.getByLabelText("Hasta calle transversal *"), "Calle 12");
    await user.click(screen.getByRole("button", { name: "Crear solicitud de corte" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Solicitud sin enviar"));
    expect(reason).toHaveValue("Corte preventivo durante el tratamiento del arbolado");
    expect(screen.getByText(/No se creó un registro en M6/)).toBeVisible();
  });
});
