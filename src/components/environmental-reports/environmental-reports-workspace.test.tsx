import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetEnvironmentalReportFixtures, updateEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { repairRequestFixtures, resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetServiceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { scenarios } from "@/lib/scenarios";
import { EnvironmentalReportsWorkspace } from "./environmental-reports-workspace";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetEnvironmentalReportFixtures(); resetRepairRequestFixtures(); resetServiceFixtures(); window.localStorage.clear(); window.history.replaceState(null, "", "/app?destination=environment"); });
afterAll(() => server.close());

describe("EnvironmentalReportsWorkspace", () => {
  it("shows Office's complete queue and exposes only valid actions", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    expect(within(list).getByRole("button", { name: /ER-1001/ })).toBeVisible();
    expect(within(list).getByRole("button", { name: /ER-1011/ })).toBeVisible();
    await user.click(within(list).getByRole("button", { name: /ER-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1001" });
    expect(within(detail).getByRole("button", { name: "Iniciar revisión" })).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Derivar expediente" })).not.toBeInTheDocument();
    await user.click(within(detail).getByRole("button", { name: "Iniciar revisión" }));
    expect(await within(detail).findByText("En revisión")).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Derivar expediente" })).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Desestimar expediente" })).toBeVisible();
  });

  it("keeps Field scoped and submits an own-initiative report", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    const list = await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    expect(within(list).getByRole("button", { name: /ER-1001/ })).toBeVisible();
    expect(within(list).queryByRole("button", { name: /ER-1002/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir reporte" }));
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText(/Tipo de hallazgo/), "NOISE");
    await user.type(within(dialog).getByLabelText(/Dirección o referencia/), "Calle Nueva 100");
    await user.type(within(dialog).getByLabelText(/Descripción del hallazgo/), "Ruido nocturno constante.");
    await user.type(within(dialog).getByLabelText(/Latitud/), "-34.6");
    await user.type(within(dialog).getByLabelText(/Longitud/), "-58.4");
    await user.click(within(dialog).getByRole("button", { name: "Abrir reporte" }));
    expect(await screen.findByText(/Expediente ER-/)).toBeInTheDocument();
  });

  it("lets Office schedule and assign an inspection from a report under review", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1002" });
    await user.click(within(detail).getByRole("button", { name: "Programar inspección" }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Fecha de inspección"), "2026-09-10");
    await user.selectOptions(within(dialog).getByLabelText("Cuadrilla"), "crew-a");
    await user.click(within(dialog).getByRole("button", { name: "Programar inspección" }));

    expect(await within(detail).findByRole("status", { name: "Estado: Inspección programada" })).toBeVisible();
    expect(within(detail).getByText(/^SVC-/)).toBeVisible();
    expect(within(detail).getByText(/Cuadrilla A/)).toBeVisible();
  });

  it("lets authorized Office issue an immutable notice from a completed violation inspection", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });
    await user.click(within(detail).getByRole("button", { name: "Emitir aviso de infracción" }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Buscar establecimiento/), "EST-BOEDO-1880");
    await user.click(within(dialog).getByRole("button", { name: "Buscar establecimiento" }));
    expect(await within(dialog).findByText(/Planta de tratamiento Boedo/)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Emitir aviso de infracción" }));

    expect(await within(detail).findByText("ACTA-2026-0001")).toBeVisible();
    expect(within(detail).getByText("Acta inmutable")).toBeVisible();
    expect(within(detail).getByText("Actas previas del establecimiento")).toBeVisible();
    expect(within(detail).queryByRole("button", { name: /Editar acta|Eliminar acta/ })).not.toBeInTheDocument();
  });

  it("keeps issuance disabled until inspection evidence is present", async () => {
    updateEnvironmentalInspectionFixture("INS-1008", { attachments: [] });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });

    const issueButton = await within(detail).findByRole("button", { name: "Emitir aviso de infracción" });
    expect(issueButton).toBeDisabled();
    expect(within(detail).getByText(/evidencia.*antes de emitir/i)).toBeVisible();
  });

  it("records an explicit non-forwarded notice without claiming an M4 sanction", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });
    await user.click(within(detail).getByRole("button", { name: "Emitir aviso de infracción" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Buscar establecimiento/), "referencia inexistente");
    await user.click(within(dialog).getByRole("button", { name: "Buscar establecimiento" }));
    await user.click(await within(dialog).findByRole("button", { name: "Continuar sin establecimiento" }));
    await user.click(within(dialog).getByRole("button", { name: "Registrar aviso no-forwarded" }));

    expect(await within(detail).findByText("Aviso no-forwarded")).toBeVisible();
    expect(within(detail).getByText("M4 no fue contactado")).toBeVisible();
    expect(within(detail).getByText(/cerrado localmente/i)).toBeVisible();
    expect(within(detail).getByRole("status", { name: "Estado: Cerrado" })).toBeVisible();
  });

  it("surfaces a second issuance attempt as a conflict", async () => {
    server.use(http.post("*/api/environmental-inspections/INS-1008/violation-notice", () => HttpResponse.json({
      statusCode: 409,
      message: "La inspección ya tiene un acta emitida.",
      error: "Conflict",
      timestamp: new Date().toISOString(),
      path: "/api/environmental-inspections/INS-1008/violation-notice",
    }, { status: 409 })));
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });
    await user.click(within(detail).getByRole("button", { name: "Emitir aviso de infracción" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Buscar establecimiento/), "EST-BOEDO-1880");
    await user.click(within(dialog).getByRole("button", { name: "Buscar establecimiento" }));
    await user.click(within(dialog).getByRole("button", { name: "Emitir aviso de infracción" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/conflicto/i);
  });

  it("does not expose issuance to a limited Office session", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeLimited} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1008/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1008" });

    expect(within(detail).queryByRole("button", { name: "Emitir aviso de infracción" })).not.toBeInTheDocument();
  });

  it("lets Office create a pending RepairRequest from an inspection without deriving safety risk", async () => {
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Cola de expedientes ambientales" });
    await user.click(within(list).getByRole("button", { name: /ER-1012/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1012" });
    const action = await within(detail).findByRole("button", { name: "Crear derivación de reparación" });
    await user.click(action);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Contexto de origen INS-1012")).toBeVisible();
    expect(within(dialog).getByLabelText(/Ubicación del daño/)).toHaveValue("Av. Brasil 2450");
    expect(within(dialog).getByRole("link", { name: /Ver inspección fuente/ })).toHaveAttribute("href", "/app?destination=environment&detail=ER-1012&inspectionId=INS-1012");
    await user.selectOptions(within(dialog).getByLabelText(/^Severidad/), "LOW");
    await user.click(within(dialog).getByLabelText(/^Sí,/));
    await user.click(within(dialog).getByRole("button", { name: /Crear deriv.*a M3/ }));

    expect(await within(dialog).findByText(/pendiente de respuesta de M3/i)).toBeVisible();
    expect(repairRequestFixtures[0]).toMatchObject({
      detectedInType: "INSPECTION",
      detectedInId: "INS-1012",
      severity: "LOW",
      publicSafetyRisk: true,
      sourceContext: { type: "INSPECTION", id: "INS-1012" },
    });
  });

  it("shows the inspection action to Field only when its linked Service belongs to the actor crew", async () => {
    updateServiceFixture("SVC-1112", { crewId: "crew-a" });
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    const list = await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    await user.click(within(list).getByRole("button", { name: /ER-1012/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1012" });
    await waitFor(() => expect(within(detail).queryByRole("button", { name: "Crear derivación de reparación" })).not.toBeInTheDocument());
  });

  it("shows an unsent inspection referral after a pre-creation network failure", async () => {
    server.use(http.post("*/api/repair-requests", () => HttpResponse.error()));
    const user = userEvent.setup();
    render(<EnvironmentalReportsWorkspace scenario={scenarios.fieldCrewLeader} />);
    const list = await screen.findByRole("region", { name: "Reportes ambientales asignados" });
    await user.click(within(list).getByRole("button", { name: /ER-1012/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de ER-1012" });
    await user.click(await within(detail).findByRole("button", { name: "Crear derivación de reparación" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Crear deriv.*a M3/ }));

    expect(await within(dialog).findByText(/Derivación sin enviar/i)).toBeVisible();
    expect(within(dialog).getByLabelText(/Ubicación del daño/)).toHaveValue("Av. Brasil 2450");
    expect(repairRequestFixtures).toHaveLength(1);
  });
});
