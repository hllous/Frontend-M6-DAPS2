import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function renderDialog(onCreated = vi.fn()) {
  return render(
    <CreateStreetClosureRequestDialog
      open={true}
      onOpenChange={vi.fn()}
      service={service}
      onCreated={onCreated}
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

function changeValue(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } });
}

async function pickDay(user: ReturnType<typeof userEvent.setup>, fieldName: RegExp, day: number, monthsAhead = 0) {
  await user.click(screen.getByRole("button", { name: fieldName }));
  const calendar = await screen.findByRole("grid");
  for (let month = 0; month < monthsAhead; month += 1) {
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
  }
  await user.click(await within(calendar).findByRole("button", { name: new RegExp(`, ${day} de `) }));
}

async function setTime(user: ReturnType<typeof userEvent.setup>, groupName: RegExp, value: string) {
  const [hour, minute] = value.split(":");
  const group = screen.getByRole("group", { name: groupName });
  await user.click(within(group).getByRole("combobox", { name: "Hora" }));
  await user.click(await screen.findByRole("option", { name: new RegExp(`^${hour}$`) }));
  await user.click(within(group).getByRole("combobox", { name: "Minutos" }));
  await user.click(await screen.findByRole("option", { name: new RegExp(`^${minute}$`) }));
}

describe("CreateStreetClosureRequestDialog", () => {
  it("prefills the Service window while keeping both fields editable", async () => {
    renderDialog();

    const fromDate = await screen.findByRole("button", { name: /Inicio solicitado/ });
    const fromTime = screen.getByRole("group", { name: /Inicio solicitado/ });
    expect(fromDate).toHaveAttribute("data-slot", "date-picker");
    expect(fromDate).toHaveTextContent("05/09/2026");
    expect(fromDate).not.toBeDisabled();
    expect(fromTime).toHaveAttribute("data-slot", "time-picker");
    expect(within(fromTime).getByRole("combobox", { name: "Hora" })).toHaveTextContent("08");
    expect(within(fromTime).getByRole("combobox", { name: "Minutos" })).toHaveTextContent("00");
    expect(screen.getByRole("combobox", { name: /Tipo de corte/ })).toHaveAttribute("data-slot", "select-trigger");
    expect(screen.getByRole("combobox", { name: "Sentido *" })).toHaveTextContent("Seleccione un sentido");
    expect(screen.getByRole("textbox", { name: /Motivo/ })).toHaveAttribute("data-slot", "textarea");
    expect(await screen.findByText(service.title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(service.id))).toBeInTheDocument();
  });

  it("adds and removes sections with focus moved to the affected row", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Agregar tramo" }));
    const sectionStreets = screen.getAllByLabelText("Calle *", { selector: "input" });
    const directions = screen.getAllByRole("combobox", { name: "Sentido *" });
    expect(sectionStreets).toHaveLength(2);
    expect(directions).toHaveLength(2);
    expect(directions[1]).toHaveTextContent("Seleccione un sentido");
    expect(document.activeElement).toBe(sectionStreets[1]);

    await user.click(screen.getByRole("button", { name: "Quitar tramo 2" }));
    await waitFor(() => expect(document.activeElement).toBe(sectionStreets[0]));
    expect(screen.getAllByLabelText("Calle *", { selector: "input" })).toHaveLength(1);
  });

  it("rejects empty structured sections with field-level accessible errors", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(screen.getByText("El motivo es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("Indique el nombre de la calle")).toBeInTheDocument();
    expect(screen.getByLabelText("Calle *", { selector: "input" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Calle *", { selector: "input" })).toHaveAttribute(
      "aria-describedby",
      "affected-section-0-street-error",
    );
  });

  it("requires a direction for each section and announces the field-level error", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Motivo *"), "Trabajo operativo con circulación reducida");
    await user.type(screen.getByLabelText("Calle *", { selector: "input" }), "Bulevar Costero");
    await user.type(screen.getByLabelText("Desde calle *"), "Av. Belgrano");
    await user.type(screen.getByLabelText("Hasta calle *"), "Calle 12");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    const direction = screen.getByRole("combobox", { name: "Sentido *" });
    expect(screen.getByText("Indique el sentido del tramo")).toBeInTheDocument();
    expect(direction).toHaveAttribute("aria-invalid", "true");
    expect(direction).toHaveAttribute("aria-describedby", "affected-section-0-direction-error");
  });

  it("shows a successful creation as pending", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderDialog(onCreated);

    await user.type(screen.getByLabelText("Motivo *"), "Trabajo operativo con circulación reducida");
    await user.type(screen.getByLabelText("Calle *", { selector: "input" }), "Bulevar Costero");
    await user.type(screen.getByLabelText("Desde calle *"), "Av. Belgrano");
    await user.type(screen.getByLabelText("Hasta calle *"), "Calle 12");
    await user.click(screen.getByRole("combobox", { name: "Sentido *" }));
    await user.click(await screen.findByRole("option", { name: "Ascendente" }));
    expect(screen.getByRole("combobox", { name: "Sentido *" })).toHaveTextContent("Ascendente");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Solicitud enviada"));
    expect(screen.getByText("Tránsito debe responder.")).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({
      closureType: "PARTIAL",
      affectedSections: [expect.objectContaining({ direction: "FORWARD" })],
    }));
  });

  it("retains entered values and presents an unsent state after a network failure", async () => {
    const user = userEvent.setup();
    server.use(http.post("*/api/street-closure-requests", () => HttpResponse.error()));
    renderDialog();

    const reason = screen.getByLabelText("Motivo *");
    await user.type(reason, "Corte necesario para el operativo");
    await user.type(screen.getByLabelText("Calle *", { selector: "input" }), "Calle 12");
    await user.type(screen.getByLabelText("Desde calle *"), "Av. Belgrano");
    await user.type(screen.getByLabelText("Hasta calle *"), "Av. Libertad");
    await user.click(screen.getByRole("combobox", { name: "Sentido *" }));
    await user.click(await screen.findByRole("option", { name: "Ascendente" }));
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Sin enviar"));
    expect(reason).toHaveValue("Corte necesario para el operativo");
  });

  it("creates a pending request with the authorized TreeIntervention as canonical source", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderTreeDialog(onCreated);

    expect(screen.getByLabelText("Motivo *")).toHaveValue("");
    expect(screen.getByText("Av. Mitre 1140")).toBeVisible();
    changeValue(screen.getByLabelText("Motivo *"), "Corte preventivo durante el tratamiento del arbolado");
    await pickDay(user, /Inicio solicitado/, 10);
    await pickDay(user, /Fin solicitado/, 10);
    await setTime(user, /Inicio solicitado/, "09:00");
    await setTime(user, /Fin solicitado/, "11:00");
    changeValue(screen.getByLabelText("Calle *", { selector: "input" }), "Av. Mitre");
    changeValue(screen.getByLabelText("Desde calle *"), "Calle 10");
    changeValue(screen.getByLabelText("Hasta calle *"), "Calle 12");
    await user.click(screen.getByRole("combobox", { name: "Sentido *" }));
    await user.click(await screen.findByRole("option", { name: "Ambos sentidos" }));
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tránsito debe responder."));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "TREE_INTERVENTION",
      sourceId: "intervention-2",
      status: "REQUESTED",
      affectedSections: [expect.objectContaining({ direction: "BOTH" })],
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
    changeValue(reason, "Corte preventivo durante el tratamiento del arbolado");
    await pickDay(user, /Inicio solicitado/, 10);
    await pickDay(user, /Fin solicitado/, 10);
    await setTime(user, /Inicio solicitado/, "09:00");
    await setTime(user, /Fin solicitado/, "11:00");
    changeValue(screen.getByLabelText("Calle *", { selector: "input" }), "Av. Mitre");
    changeValue(screen.getByLabelText("Desde calle *"), "Calle 10");
    changeValue(screen.getByLabelText("Hasta calle *"), "Calle 12");
    await user.click(screen.getByRole("combobox", { name: "Sentido *" }));
    await user.click(await screen.findByRole("option", { name: "Ascendente" }));
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Sin enviar"));
    expect(reason).toHaveValue("Corte preventivo durante el tratamiento del arbolado");
    expect(screen.getByText(/Sin conexión/)).toBeVisible();
  });
});
