import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { mockResponseAfter } from "@/mocks/delayed-response";
import { handlers } from "@/mocks/handlers";
import { fixtureReferrals } from "@/app/api/referrals/route";
import { addRepairRequestFixture, resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { scenarios } from "@/lib/scenarios";
import { isReferralVisibleToScenario, referralFromBackendRepairRequest } from "@/lib/referrals";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { ReferralsWorkspace } from "./referrals-workspace";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetRepairRequestFixtures();
  resetStreetClosureRequestFixtures();
  window.history.replaceState(null, "", "/app?destination=referrals");
});
afterAll(() => server.close());

describe("ReferralsWorkspace", () => {
  it("shows a busy skeleton region while the referrals response is delayed", async () => {
    server.use(http.get("*/api/referrals", () => mockResponseAfter(350, () => HttpResponse.json({ data: fixtureReferrals(), meta: { total: fixtureReferrals().length } }))));
    const { container } = render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const region = screen.getByRole("region", { name: "Derivaciones" });
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(within(region).getByRole("status")).toHaveTextContent("Cargando");
    expect(container.querySelector('[data-skeleton="referral-count"]')).not.toBeNull();
    expect(region.querySelector('[data-skeleton="referral-reconciliation-banner"]')).not.toBeNull();
    expect(region.querySelectorAll('[data-skeleton="referral-reconciliation-detail"]')).toHaveLength(6);
    const recordCards = region.querySelectorAll('[data-skeleton="referral-record"]');
    expect(recordCards).toHaveLength(3);
    for (const card of recordCards) {
      expect(card.querySelector('[data-skeleton="referral-record-icon"]')).not.toBeNull();
      expect(card.querySelector('[data-skeleton="referral-record-title"]')).not.toBeNull();
      expect(card.querySelectorAll('[data-skeleton="referral-record-detail"]')).toHaveLength(2);
      expect(card.querySelector('[data-skeleton="referral-record-status"]')).not.toBeNull();
    }
    expect(screen.queryByText(/Cargando\.\.\./)).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("region", { name: "Derivaciones" })).toHaveAttribute("aria-busy", "false"), { timeout: 3000 });
    expect(screen.getByRole("region", { name: "Derivaciones" }).querySelector("[data-skeleton]")).toBeNull();
    expect(screen.getByRole("list", { name: "Derivaciones" })).toBeVisible();
  });

  it("renders a BFF-scoped Field referral whose source UUID is absent from fixtures", async () => {
    const id = "15c86465-54d3-4e0a-83a5-26a3cc510017";
    const inspectionId = "bd685878-7c96-4e99-9b38-b0368a011fa0";
    const referral = referralFromBackendRepairRequest({
      id, damageType: "BROKEN_SIDEWALK", address: "Av. Rivadavia 2200",
      severity: "LOW", publicSafetyRisk: false, detectedInType: "INSPECTION",
      detectedInId: inspectionId, status: "REQUESTED", requestedAt: "2026-10-01T08:00:00.000Z",
    });
    server.use(http.get("*/api/referrals", () => HttpResponse.json({ data: [referral], meta: { total: 1 } })));
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={{
      ...scenarios.fieldCrewLeader,
      actor: { ...scenarios.fieldCrewLeader.actor, crewId: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516" },
    }} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    // #741: the row is named by what it is (kind, damage, address), never by its UUID.
    const row = within(list).getByRole("button", { name: /Reparación · Vereda hundida o rota · Av\. Rivadavia 2200/ });
    expect(row).toHaveAccessibleName(expect.stringContaining("#15c86465"));
    expect(row).not.toHaveAccessibleName(expect.stringContaining(id));
    await user.click(row);
    const detail = await screen.findByRole("region", { name: "Detalle de Reparación · Vereda hundida o rota · Av. Rivadavia 2200" });
    expect(within(detail).getByText(id)).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Copiar identificador técnico de la derivación" })).toBeVisible();
    expect(within(detail).getByRole("link", { name: /Ver inspección/ })).toHaveAttribute(
      "href", `/app?destination=environment&inspectionId=${inspectionId}`,
    );
  });

  it("lets Office list both referral kinds and open their own detail", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    expect(within(list).getByRole("button", { name: /RR-1001/ })).toBeVisible();
    // Literal copy (not derived from referralLabel): kind, damage, address, and the business id of the source.
    expect(within(list).getByText("Reparación · Pavimento roto · Bulevar Costero y Calle 12")).toBeVisible();
    expect(within(list).getAllByText(/SVC-1050 · /)[0]).toBeVisible();
    expect(within(list).getByRole("button", { name: /SCR-1001/ })).toBeVisible();
    expect(within(list).getByText("Obras Públicas · Reparación")).toBeVisible();
    expect(within(list).getAllByText("Tránsito · Corte de calle")).toHaveLength(2);
    expect(within(list).getByRole("button", { name: /SCR-1002/ })).toBeVisible();

    await user.click(within(list).getByRole("button", { name: /SCR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Corte de calle · Bulevar Costero" });
    expect(within(detail).getByRole("status", { name: "Estado: Solicitada" })).toBeVisible();
    expect(within(detail).getByText("05/09/2026 08:00")).toBeVisible();
    expect(within(detail).getByText("05/09/2026 12:00")).toBeVisible();
    expect(within(detail).getByRole("link", { name: /Ver servicio/ })).toHaveAttribute(
      "href",
      "/app?destination=services&detail=SVC-1050",
    );
    expect(within(detail).queryByText(/módulo de origen/)).not.toBeInTheDocument();
  });

  it("shows section directions in the list and detail, with final M7 response fields", async () => {
    const base = fixtureReferrals().find((referral) => referral.kind === "STREET_CLOSURE_REQUEST" && referral.sourceType === "SERVICE");
    if (!base || base.kind !== "STREET_CLOSURE_REQUEST") throw new Error("Expected a StreetClosureRequest fixture");
    const approved = {
      ...base,
      id: "SCR-APPROVED",
      status: "APPROVED" as const,
      request: {
        ...base.request,
        id: "SCR-APPROVED",
        status: "APPROVED" as const,
        affectedSections: [
          { streetName: "Bulevar Costero", fromCross: "Av. Belgrano", toCross: "Calle 12", direction: "FORWARD" as const },
          { streetName: "Av. Independencia", fromCross: "Calle 1", toCross: "Calle 2" },
        ],
        startDate: "2026-10-01T09:00:00.000Z",
        endDate: "2026-10-01T12:00:00.000Z",
      },
    };
    const rejected = {
      ...base,
      id: "SCR-REJECTED",
      status: "REJECTED" as const,
      request: {
        ...base.request,
        id: "SCR-REJECTED",
        status: "REJECTED" as const,
        rejectionReason: "Debe quedar libre el corredor durante el evento.",
      },
    };
    server.use(http.get("*/api/referrals", () => HttpResponse.json({ data: [approved, rejected], meta: { total: 2 } })));

    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    const approvedRow = within(list).getByRole("button", { name: /SCR-APPROVED/ });
    expect(approvedRow).toHaveAccessibleName(expect.stringContaining("Bulevar Costero: Ascendente"));
    expect(within(list).getByText(/Av\. Independencia: Sentido no informado/)).toBeVisible();
    await user.click(approvedRow);

    const approvedDetail = await screen.findByRole("region", { name: "Detalle de Corte de calle · Bulevar Costero" });
    expect(within(approvedDetail).getByText("Sentido: Ascendente")).toBeVisible();
    expect(within(approvedDetail).getByText("Sentido no informado")).toBeVisible();
    expect(within(approvedDetail).getByText("Período autorizado")).toBeVisible();
    expect(within(approvedDetail).getByText(/01\/10\/2026/)).toBeVisible();

    await user.click(within(approvedDetail).getByRole("button", { name: "Volver a derivaciones" }));
    const returnedList = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(returnedList).getByRole("button", { name: /SCR-REJECTED/ }));

    const rejectedDetail = await screen.findByRole("region", { name: "Detalle de Corte de calle · Bulevar Costero" });
    expect(within(rejectedDetail).getByText("Motivo del rechazo")).toBeVisible();
    expect(within(rejectedDetail).getByText("Debe quedar libre el corredor durante el evento.")).toBeVisible();
  });

  it("exposes an EnvironmentalInspection source and keeps the RepairRequest pending", async () => {
    addRepairRequestFixture({
      id: "RR-INS-1012",
      damageType: "BLOCKED_DRAIN",
      address: "Av. Brasil 2450",
      severity: "LOW",
      publicSafetyRisk: true,
      detectedInType: "INSPECTION",
      detectedInId: "INS-1012",
      sourceContext: {
        type: "INSPECTION",
        id: "INS-1012",
        label: "Inspección INS-1012 · ER-1012",
        href: "/app?destination=environment&detail=ER-1012&inspectionId=INS-1012",
      },
      status: "REQUESTED",
      workOrderId: null,
      requestedAt: "2026-09-07T08:00:00.000Z",
    });
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /RR-INS-1012/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Reparación · Sumidero obstruido · Av. Brasil 2450" });
    expect(within(detail).getByRole("heading", { name: "Inspección" })).toBeVisible();
    expect(within(detail).getByRole("link", { name: /Ver inspección/ })).toHaveAttribute("href", "/app?destination=environment&detail=ER-1012&inspectionId=INS-1012");
    expect(within(detail).getByRole("status", { name: "Estado: Pendiente" })).toBeVisible();
    expect(within(detail).queryByText("Nº de orden de trabajo")).not.toBeInTheDocument();
  });

  it("navigates TreeIntervention referrals to their catalog source", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /SCR-1002/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Corte de calle · Av. Mitre" });

    expect(within(detail).getByRole("heading", { name: "Intervención" })).toBeVisible();
    expect(within(detail).getByRole("link", { name: /Ver intervención/ })).toHaveAttribute(
      "href",
      "/app/catalog/tree-interventions?detail=intervention-2",
    );
    expect(within(detail).getByText(/Tratamiento.*Av\. Mitre 1140/)).toBeVisible();
  });

  it("surfaces stale and duplicate referrals without changing their status", async () => {
    const all = fixtureReferrals();
    const base = all.find((referral) => referral.kind === "REPAIR_REQUEST");
    if (!base) throw new Error("Expected a repair referral fixture");
    const stale = { ...base, id: "RR-118-STALE", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    const duplicate = { ...stale, id: "RR-118-DUPLICATE" };
    server.use(
      http.get("*/api/referrals", () => HttpResponse.json({ data: [stale, duplicate], meta: { total: 2 } })),
    );

    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    expect(within(list).getAllByText("Vencida")).toHaveLength(2);
    expect(within(list).getAllByText("Posible duplicada")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Alertas" })).toHaveTextContent("2 vencidas");

    await user.click(within(list).getByRole("button", { name: /RR-118-STALE/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" });
    expect(within(detail).getByRole("region", { name: "Alertas" })).toHaveTextContent("Vencida: Obras Públicas no respondió a tiempo.");
    expect(within(detail).getByRole("status", { name: "Estado: Pendiente" })).toBeVisible();
  });

  it("shows live source changes as reconciliation work and preserves the original context", async () => {
    const all = fixtureReferrals();
    const base = all.find((referral) => referral.kind === "STREET_CLOSURE_REQUEST" && referral.sourceType === "SERVICE");
    if (!base || base.kind !== "STREET_CLOSURE_REQUEST") throw new Error("Expected a Service closure referral fixture");
    const changed = {
      ...base,
      id: "SCR-118-CHANGED-SOURCE",
      request: {
        ...base.request,
        sourceContext: { ...base.request.sourceContext, scheduledDate: "2026-09-07" },
      },
    };
    server.use(
      http.get("*/api/referrals", () => HttpResponse.json({ data: [changed], meta: { total: 1 } })),
    );

    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    expect(within(list).getByText("Cambió el servicio")).toBeVisible();

    await user.click(within(list).getByRole("button", { name: /SCR-118-CHANGED-SOURCE/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Corte de calle · Bulevar Costero" });
    expect(within(detail).getByText("El servicio cambió desde que se derivó.")).toBeVisible();
    expect(within(detail).getByText(/Antes: 2026-09-07/)).toBeVisible();
  });

  it("keeps Field list and detail scoped to assigned Services", async () => {
    const all = fixtureReferrals();
    const outOfScope = { ...all[0], id: "RR-OTHER", sourceServiceId: "SVC-1042", sourceLabel: "Servicio de otra cuadrilla" };
    server.use(
      http.get("*/api/referrals", () => {
        const data = [...all, outOfScope].filter((referral) => isReferralVisibleToScenario(referral, scenarios.fieldCrewLeader));
        return HttpResponse.json({ data, meta: { total: data.length } });
      }),
    );

    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.fieldCrewLeader} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    expect(within(list).getByRole("button", { name: /RR-1001/ })).toBeVisible();
    expect(within(list).getByRole("button", { name: /SCR-1001/ })).toBeVisible();
    expect(within(list).queryByRole("button", { name: /RR-OTHER/ })).not.toBeInTheDocument();

    await user.click(within(list).getByRole("button", { name: /RR-1001/ }));
    expect(await screen.findByRole("region", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" })).toBeVisible();
  });

  it("supports keyboard opening and returns from detail to the list", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("button", { name: /RR-1001/ });
    row.focus();
    await user.keyboard("{Enter}");
    const detail = await screen.findByRole("region", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" });
    expect(detail).toBeVisible();
    await waitFor(() => expect(within(detail).getByRole("heading", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" })).toHaveFocus());

    await user.click(screen.getByRole("button", { name: "Volver a derivaciones" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Lista de derivaciones" })).toBeVisible());
  });

  it("lets Office manually reconcile a repair with the external work order", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /RR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" });
    await user.click(within(detail).getByRole("button", { name: "Registrar inicio" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Obras Públicas ya asignó la orden.")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/nº de orden de trabajo/i);
    const recoveryIdentifier = within(dialog).getByLabelText(/Nº de orden de trabajo/);
    const recoveryAlert = within(dialog).getByRole("alert");
    const describedByIds = recoveryIdentifier.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
    expect(recoveryIdentifier).toHaveAttribute("aria-invalid", "true");
    expect(recoveryAlert.getAttribute("id")).toBeTruthy();
    expect(describedByIds).toContain(recoveryAlert.getAttribute("id"));

    await user.type(within(dialog).getByLabelText(/Nº de orden de trabajo/), "OT-2048");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("En curso")).toBeVisible();
    expect(within(detail).getByText("OT-2048")).toBeVisible();

    await user.click(within(detail).getByRole("button", { name: "Registrar cierre" }));
    const closeDialog = screen.getByRole("dialog");
    await user.type(within(closeDialog).getByLabelText(/Nº de orden de trabajo/), "OT-2048");
    await user.click(within(closeDialog).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Cerrada")).toBeVisible();
  });

  it("shows a 409 message, refreshes the referral, and removes the invalid action", async () => {
    const all = fixtureReferrals();
    const base = all.find((referral) => referral.id === "RR-1001");
    if (!base || base.kind !== "REPAIR_REQUEST") throw new Error("Expected the RR-1001 repair referral fixture");

    const refreshedRequest = {
      ...base.request,
      status: "CLOSED" as const,
      workOrderId: "OT-2048",
      updatedAt: "2026-09-19T12:00:00.000Z",
    };
    server.use(
      http.post("*/api/repair-requests/RR-1001/start", () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message: "La derivación ya fue cerrada por otra operación.",
            error: "Conflict",
            timestamp: new Date().toISOString(),
            path: "/api/repair-requests/RR-1001/start",
          },
          { status: 409 },
        ),
      ),
      http.get("*/api/repair-requests/RR-1001", () => HttpResponse.json(refreshedRequest)),
    );

    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /RR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" });
    await user.click(within(detail).getByRole("button", { name: "Registrar inicio" }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Nº de orden de trabajo/), "OT-2048");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      // By attribute: with the dialog open the detail is aria-hidden, which empties its computed accessible name.
      expect(document.querySelector('[role="status"][aria-label="Estado: Cerrada"]')).not.toBeNull();
    });
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(
      "La derivación ya fue cerrada por otra operación.",
    );

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Registrar inicio" })).not.toBeInTheDocument();
  });

  it("keeps manual recovery unavailable to Field", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.fieldCrewLeader} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /RR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Reparación · Pavimento roto · Bulevar Costero y Calle 12" });
    expect(within(detail).queryByText("Registrar respuesta")).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it("requires the M7 identifier and updates the closure detail after approval", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /SCR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Corte de calle · Bulevar Costero" });
    await user.click(within(detail).getByRole("button", { name: "Registrar aprobación" }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/nº de corte/i);

    await user.type(within(dialog).getByLabelText(/Nº de corte/), "C-882");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Aprobada")).toBeVisible();
    expect(within(detail).getByText("C-882")).toBeVisible();

    await user.click(within(detail).getByRole("button", { name: "Registrar finalización" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Finalizada")).toBeVisible();
  });

  it("lets Office record a confirmed M7 rejection without inventing a closure id", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /SCR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de Corte de calle · Bulevar Costero" });
    await user.click(within(detail).getByRole("button", { name: "Registrar rechazo" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText(/Nº de corte/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Rechazada")).toBeVisible();
  });

  it("announces empty and error states", async () => {
    server.use(
      http.get("*/api/referrals", () => HttpResponse.json({ data: [], meta: { total: 0 } })),
    );
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByText("Sin derivaciones")).toBeVisible();

    server.resetHandlers();
    server.use(http.get("*/api/referrals", () => HttpResponse.json({ message: "Servidor no disponible" }, { status: 503 })));
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las derivaciones");
  });
  it("labels an EXPIRED closure as Vencido and warns when the BFF dropped unreadable records", async () => {
    const closure = fixtureReferrals().find((referral) => referral.kind === "STREET_CLOSURE_REQUEST");
    if (!closure || closure.kind !== "STREET_CLOSURE_REQUEST") throw new Error("Expected a closure fixture");
    const expired = { ...closure, status: "EXPIRED", request: { ...closure.request, status: "EXPIRED" } };
    server.use(http.get("*/api/referrals", () => HttpResponse.json({ data: [expired], meta: { total: 1, invalid: 2 } })));
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    expect(screen.getByRole("status", { name: /derivaciones sin mostrar/i })).toHaveTextContent("2");
    const street = closure.request.affectedSections[0].streetName;
    await user.click(within(list).getByRole("button", { name: new RegExp(`Corte de calle · ${street}`) }));
    const detail = await screen.findByRole("region", { name: `Detalle de Corte de calle · ${street}` });
    expect(within(detail).getByRole("status", { name: "Estado: Vencido" })).toBeVisible();
  });
});

describe("internal jargon guard", () => {
  it("keeps module codes, backend and API field names out of the rendered copy", async () => {
    const { container } = render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("list", { name: "Derivaciones" });

    expectNoInternalJargon(container);
  });
});
