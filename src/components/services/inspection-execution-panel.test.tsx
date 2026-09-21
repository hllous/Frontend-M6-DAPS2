import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { handlers } from "@/mocks/handlers";
import type { Service } from "@/lib/services";
import { InspectionExecutionPanel } from "./inspection-execution-panel";

const server = setupServer(...handlers);

const service: Service = {
  id: "SVC-INS-1",
  serviceTypeId: "st-env-inspection",
  serviceTypeName: "Control ambiental",
  title: "Inspección ambiental — Establecimiento de prueba",
  mode: "POINT",
  status: "IN_PROGRESS",
  statusReason: null,
  origin: "INSPECTION",
  zoneIds: ["zone-2"],
  zoneNames: ["Zona Sur"],
  inspectionId: "INS-TEST-1",
  scheduledDate: "2026-09-07",
  windowFrom: "09:00",
  windowTo: "11:00",
  crewId: "crew-b",
  crewName: "Cuadrilla B · Fernández",
  vehicleId: null,
  vehiclePlate: null,
  coordinates: { x: 10, y: 20 },
  attachments: [],
  history: [],
  updatedAt: "2026-09-07T08:00:00.000Z",
};

// InspectionResponseDto real del backend (+ attachments, que agrega el BFF).
function inspectionResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: "INS-TEST-1",
    reportId: "ER-TEST-1",
    serviceId: "SVC-INS-1",
    inspectorId: null,
    inspectedAt: null,
    findings: null,
    outcome: null,
    nextStep: null,
    conclusion: null,
    violationType: null,
    severity: null,
    suggestedAction: null,
    checklistItems: [],
    attachments: [],
    createdAt: "2026-09-07T07:00:00.000Z",
    updatedAt: "2026-09-07T08:00:00.000Z",
    ...overrides,
  };
}

// Sin checklistItems la pantalla usa la plantilla del frontend.
const templateChecklist = [
  { id: "location", label: "Verificar ubicación y contexto del hallazgo", completed: true },
  { id: "source", label: "Identificar la fuente del impacto", completed: true },
  { id: "evidence", label: "Registrar observaciones para el acta", completed: true },
];
const recordedItems = templateChecklist.map((item, index) => ({ id: `chk-${index}`, itemCode: item.id, label: item.label, result: true, observations: null }));

async function checkTemplate(user: ReturnType<typeof userEvent.setup>) {
  for (const item of templateChecklist) await user.click(screen.getByRole("checkbox", { name: new RegExp(item.label) }));
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe("InspectionExecutionPanel", () => {
  it("lets a Crew Leader complete a clean inspection and renders the returned next step", async () => {
    const user = userEvent.setup();
    let completionBody: unknown;
    server.use(
      http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())),
      http.post("*/api/environmental-inspections/INS-TEST-1/complete", async ({ request }) => {
        completionBody = await request.json();
        return HttpResponse.json(inspectionResponse({
          inspectedAt: "2026-09-07T12:00:00.000Z",
          outcome: "NO_VIOLATION",
          nextStep: "CASE_CLOSED",
          conclusion: "No se constató infracción durante la visita.",
          checklistItems: recordedItems,
        }));
      }),
    );

    render(<InspectionExecutionPanel service={service} canExecute />);

    expect(await screen.findByRole("heading", { name: "Ejecución de inspección ambiental" })).toBeVisible();
    await checkTemplate(user);
    await user.type(screen.getByRole("textbox", { name: /Conclus/ }), "No se constató infracción durante la visita.");
    await user.click(screen.getByRole("button", { name: "Completar inspección" }));

    await screen.findByText(/Resultado registrado/);
    expect(screen.getAllByText(/Siguiente paso:.*Cierre del expediente/).length).toBeGreaterThan(0);
    expect(completionBody).toEqual({
      inspectedAt: expect.any(String),
      outcome: "NO_VIOLATION",
      checklist: templateChecklist,
      conclusion: "No se constató infracción durante la visita.",
    });
    expect(screen.getByText("No se constató infracción durante la visita.")).toBeVisible();
  });

  it("keeps the same assigned context read-only for a Crew Member", async () => {
    server.use(http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())));

    render(<InspectionExecutionPanel service={service} />);

    expect(await screen.findByText("Esta inspección se encuentra en modo de solo consulta para integrantes de la cuadrilla.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Completar inspección" })).not.toBeInTheDocument();
    expect(screen.getByText("Identificar la fuente del impacto")).toBeVisible();
  });

  it("uploads inspection evidence before submitting a violation outcome", async () => {
    const user = userEvent.setup();
    let evidenceUploaded = false;
    let completionBody: unknown;
    server.use(
      http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())),
      http.post("*/api/evidence", async ({ request }) => {
        const formData = await request.formData();
        evidenceUploaded = formData.get("ownerType") === "INSPECTION";
        return HttpResponse.json({ id: "att-test-1", url: "/evidence/test.jpg", filename: "test.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-07T12:00:00.000Z" }, { status: 201 });
      }),
      http.post("*/api/environmental-inspections/INS-TEST-1/complete", async ({ request }) => {
        completionBody = await request.json();
        return HttpResponse.json(inspectionResponse({ outcome: "VIOLATION_FOUND", nextStep: "NOTICE_TO_BE_ISSUED", findings: "Emisión visible", conclusion: "Humo negro continuo.", violationType: "AIR_EMISSION", severity: "HIGH", suggestedAction: "FORMAL_NOTICE", checklistItems: recordedItems, attachments: [{ id: "att-test-1", url: "/evidence/test.jpg", filename: "test.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-07T12:00:00.000Z" }] }));
      }),
    );

    render(<InspectionExecutionPanel service={service} canExecute />);
    await screen.findByRole("heading", { name: /Ejecuci/ });
    await checkTemplate(user);
    await user.selectOptions(screen.getByRole("combobox", { name: /Resultado/ }), "VIOLATION_FOUND");
    await user.type(screen.getByRole("textbox", { name: /Hallazgos/ }), "Emisión visible");
    await user.type(screen.getByRole("textbox", { name: /Conclus/ }), "Humo negro continuo.");
    await user.selectOptions(screen.getByRole("combobox", { name: /Tipo de infracc/ }), "AIR_EMISSION");
    await user.selectOptions(screen.getByRole("combobox", { name: /Gravedad/ }), "HIGH");
    await user.selectOptions(screen.getByRole("combobox", { name: /Acc/ }), "FORMAL_NOTICE");
    await user.upload(screen.getByLabelText(/Seleccionar archivos/), new File(["evidence"], "chimenea.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("button", { name: /Completar inspecci/ }));

    expect(await screen.findByText(/Resultado registrado/)).toBeVisible();
    expect(evidenceUploaded).toBe(true);
    expect(completionBody).toEqual({
      inspectedAt: expect.any(String),
      outcome: "VIOLATION_FOUND",
      nextStep: "NOTICE_TO_BE_ISSUED",
      checklist: templateChecklist,
      conclusion: "Humo negro continuo.",
      findings: "Emisión visible",
      violationType: "AIR_EMISSION",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
    });
    // El resultado se lee de vuelta de la respuesta real, con los cuatro campos de cierre.
    expect(screen.getByText("Humo negro continuo.")).toBeVisible();
    expect(screen.getByText("Emisión al aire")).toBeVisible();
    expect(screen.getByText("Alta")).toBeVisible();
    expect(screen.getByText("Aviso formal")).toBeVisible();
  });

  it("saves an offline draft and blocks resubmission when the service has drifted", async () => {
    const user = userEvent.setup();
    let completionAttempts = 0;
    server.use(
      http.get("*/api/environmental-inspections/INS-TEST-1", () => HttpResponse.json(inspectionResponse())),
      http.post("*/api/environmental-inspections/INS-TEST-1/complete", () => {
        completionAttempts += 1;
        return HttpResponse.error();
      }),
      http.get("*/api/services/SVC-INS-1", () => HttpResponse.json({ ...service, updatedAt: "2026-09-07T13:00:00.000Z", crewName: "Cuadrilla C" })),
    );

    render(<InspectionExecutionPanel service={service} canExecute />);
    await screen.findByRole("heading", { name: /Ejecuci/ });
    await checkTemplate(user);
    await user.type(screen.getByRole("textbox", { name: /Conclus/ }), "Sin infracción constatada.");
    await user.click(screen.getByRole("button", { name: /Completar inspecci/ }));

    expect(await screen.findByText(/Borrador local pendiente/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Reintentar env/ }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveTextContent(/cambi/);
    expect(completionAttempts).toBe(1);
  });
});
