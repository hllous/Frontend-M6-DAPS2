import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { resetServiceFixtures, serviceFixtures } from "@/lib/services-fixtures";
import { scenarios } from "@/lib/scenarios";
import { TreeInterventionsPanel } from "./tree-interventions-panel";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetTreeInterventionFixtures();
  resetServiceFixtures();
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("TreeInterventionsPanel", () => {
  it("lists requests, filters by status and shows every linked tree in detail", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    expect(await screen.findByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    expect(within(request).getByText("Solicitada")).toBeVisible();
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));

    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    expect(await within(detail).findByText(/ARB-00443/)).toBeVisible();
    expect(await within(detail).findByText(/ARB-00445/)).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Autorizar intervención" })).toBeVisible();
    expect(within(detail).queryByRole("button", { name: "Solicitar corte de calle" })).not.toBeInTheDocument();

    await within(detail).getByRole("button", { name: "Cerrar detalle" }).click();
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "AUTHORIZED");
    expect(await screen.findByRole("article", { name: /intervention-2|Tratamiento/i })).toBeVisible();
    expect(screen.queryByRole("article", { name: /intervention-1|Poda de seguridad/i })).not.toBeInTheDocument();
  });

  it("offers a street closure request only from an authorized intervention", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(within(detail).getByRole("button", { name: "Solicitar corte de calle" })).toBeVisible();
    await user.click(within(detail).getByRole("button", { name: "Solicitar corte de calle" }));

    const closureDialog = await screen.findByRole("dialog", { name: /Solicitar corte de calle/ });
    expect(within(closureDialog).getByText("Av. Mitre 1140")).toBeVisible();
    expect(within(closureDialog).getByText(/intervention-2/)).toBeVisible();
    expect(within(closureDialog).getByLabelText("Motivo *")).toHaveValue("");
  });

  it("creates a multi-tree request and enforces justification for removal", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    await screen.findByRole("heading", { name: "Intervenciones de arbolado" });
    await screen.getByRole("button", { name: "Solicitar intervención" }).click();
    const dialog = screen.getByRole("dialog", { name: /Solicitar intervención/ });
    await user.selectOptions(within(dialog).getByLabelText(/^Árboles a intervenir/), ["tree-2", "tree-4"]);
    await user.selectOptions(within(dialog).getByLabelText(/^Tipo de intervención/), "REMOVAL");
    await user.type(within(dialog).getByLabelText(/^Dirección/), "Paseo de la Costa 220");
    await within(dialog).getByRole("button", { name: "Crear solicitud de intervención" }).click();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("justificación");

    await user.type(within(dialog).getByLabelText(/^Justificación/), "El tronco presenta inestabilidad crítica.");
    await within(dialog).getByRole("button", { name: "Crear solicitud de intervención" }).click();
    expect(await screen.findByText("Solicitud de intervención creada. Estado inicial: solicitada.")).toBeVisible();
  });

  it("keeps the request action out of read-only sessions", async () => {
    render(<TreeInterventionsPanel scenario={scenarios.officeLimited} />);
    expect(await screen.findByRole("heading", { name: "Intervenciones de arbolado" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Solicitar intervención" })).not.toBeInTheDocument();
    expect(screen.getByText(/puede consultar las solicitudes/i)).toBeVisible();
  });

  it("authorizes a non-removal intervention and shows the recorded author and time", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    await user.click(within(detail).getByRole("button", { name: "Autorizar intervención" }));

    expect(await within(detail).findByText("Autorizada")).toBeVisible();
    expect(within(detail).getByText("user-lucia")).toBeVisible();
    expect(within(detail).getByText(/Fecha de autorización/)).toBeVisible();
  });

  it("schedules an authorized multi-tree intervention as a POINT Service and keeps every tree in context", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    await user.click(within(detail).getByRole("button", { name: "Autorizar intervención" }));
    expect(await within(detail).findByRole("button", { name: "Programar servicio" })).toBeVisible();
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));

    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    expect(within(form).getByLabelText("Fecha programada")).toBeVisible();
    expect(within(form).getByLabelText("Desde")).toBeVisible();
    expect(within(form).getByLabelText("Hasta")).toBeVisible();
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));
    expect(await within(detail).findByRole("alert")).toHaveTextContent(/Servicio vinculado: SVC-/);
    expect(within(detail).getByText(/ARB-00443/)).toBeVisible();
    expect(within(detail).getByText(/ARB-00445/)).toBeVisible();
    const serviceId = detail.textContent?.match(/Servicio vinculado: (SVC-\d+)/)?.[1];
    const linkedService = serviceFixtures.find((service) => service.id === serviceId);
    expect(linkedService).toMatchObject({ mode: "POINT", targetType: "TREE", targetId: "tree-2", zoneIds: ["zone-2"] });
    expect(linkedService?.targetRef).toMatch(/ARB-00443/);
    expect(linkedService?.targetRef).toMatch(/ARB-00445/);
  });

  it("surfaces a created-but-unlinked Service as an actionable unsynced state", async () => {
    server.use(
      http.post("*/api/tree-interventions/:interventionId/assign-service", () => HttpResponse.json({
        statusCode: 409,
        message: "La intervención ya tiene un servicio asociado.",
        error: "Conflict",
        timestamp: new Date().toISOString(),
        path: "/api/tree-interventions/intervention-2/assign-service",
      }, { status: 409 })),
    );
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));
    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(await within(detail).findByRole("alert")).toHaveTextContent(/creado.*no pudo vincularse|sincronizar/i);
    expect(within(detail).getByRole("button", { name: "Reintentar vinculación" })).toBeVisible();
    expect(within(detail).queryByText(/La intervención fue programada/)).not.toBeInTheDocument();
  });

  it("keeps the schedule error recoverable when Service creation fails", async () => {
    server.use(
      http.post("*/api/services", () => HttpResponse.json({
        statusCode: 400,
        message: "No se puede programar el servicio.",
        error: "Bad Request",
        timestamp: new Date().toISOString(),
        path: "/api/services",
      }, { status: 400 })),
    );
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-2|Tratamiento/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Programar servicio" }));
    const form = within(detail).getByRole("form", { name: "Programar servicio para la intervención" });
    await user.click(within(form).getByRole("button", { name: "Programar servicio de intervención" }));

    expect(await within(detail).findByRole("alert")).toHaveTextContent("No se puede programar el servicio");
    expect(within(detail).getByRole("form", { name: "Programar servicio para la intervención" })).toBeVisible();
    expect(within(detail).queryByText(/Servicio vinculado:/)).not.toBeInTheDocument();
  });

  it("moves a removal to pending authorization before exposing authorize and reject", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-3|Extracción/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(within(detail).getByRole("button", { name: "Enviar a autorización" })).toBeVisible();
    await user.click(within(detail).getByRole("button", { name: "Enviar a autorización" }));

    expect(await within(detail).findByText("Pendiente de autorización")).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Autorizar intervención" })).toBeVisible();
    expect(within(detail).getByRole("button", { name: "Rechazar intervención" })).toBeVisible();
  });

  it("rejects a removal terminally and offers a fresh request with its original values", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-3|Extracción/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Enviar a autorización" }));
    await user.click(await within(detail).findByRole("button", { name: "Rechazar intervención" }));

    const confirmation = await screen.findByRole("dialog", { name: /Confirmar rechazo/ });
    expect(within(confirmation).getByText(/no podrá reabrirse/i)).toBeVisible();
    await user.click(within(confirmation).getByRole("button", { name: "Confirmar rechazo de intervención" }));

    expect(await within(detail).findByText("Rechazada")).toBeVisible();
    expect(within(detail).queryByText(/motivo/i)).not.toBeInTheDocument();
    await user.click(within(detail).getByRole("button", { name: "Crear nueva solicitud" }));
    const freshRequest = await screen.findByRole("dialog", { name: /Solicitar intervención/ });
    expect(within(freshRequest).getByLabelText(/^Tipo de intervención/)).toHaveValue("REMOVAL");
    expect(within(freshRequest).getByLabelText(/^Árboles a intervenir/)).toHaveValue(["tree-4"]);
    expect(within(freshRequest).getByLabelText(/^Dirección/)).toHaveValue("Paseo de la Costa 220");
    expect(within(freshRequest).getByLabelText(/^Prioridad/)).toHaveValue("CRITICAL");
    expect(within(freshRequest).getByLabelText(/^Justificación/)).toHaveValue("El ejemplar presenta inestabilidad crítica.");
  });

  it("surfaces a backend transition error without presenting a false authorization", async () => {
    server.use(
      http.post("*/api/tree-interventions/:interventionId/authorize", () => HttpResponse.json({
        statusCode: 409,
        message: "La intervención ya fue autorizada por otra persona.",
        error: "Conflict",
        timestamp: new Date().toISOString(),
        path: "/api/tree-interventions/intervention-1/authorize",
      }, { status: 409 })),
    );
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });
    await user.click(within(detail).getByRole("button", { name: "Autorizar intervención" }));

    expect(await within(detail).findByRole("alert")).toHaveTextContent("ya fue autorizada");
    expect(within(detail).getByText("Solicitada")).toBeVisible();
  });

  it("does not expose authorization controls to Field", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.fieldCrewMember} />);
    const request = await screen.findByRole("article", { name: /intervention-1|Poda de seguridad/i });
    await user.click(within(request).getByRole("button", { name: "Ver detalle" }));
    const detail = await screen.findByRole("dialog", { name: /Detalle de la intervención/ });

    expect(within(detail).queryByRole("button", { name: /autorizar|rechazar|enviar a autorización/i })).not.toBeInTheDocument();
  });
});
