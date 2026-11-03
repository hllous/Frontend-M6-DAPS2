import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { PUBLIC_DEMO_TICKET_ID, publicReportFixtures } from "@/lib/public-report-fixtures";

import { ReportTracker } from "./report-tracker";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const closedTicketId = publicReportFixtures[1].ticketId;

async function lookUp(code: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Código de seguimiento"), code);
  await user.click(screen.getByRole("button", { name: "Consultar" }));
}

describe("ReportTracker", () => {
  it("shows the stage sentence, the reference and the dates as dd/mm/aaaa for a valid code, and moves focus to the result", async () => {
    render(<ReportTracker />);
    await lookUp(PUBLIC_DEMO_TICKET_ID);

    const result = await screen.findByRole("region", { name: /TK-2026-000123/ });
    expect(result).toHaveFocus();
    expect(result).toHaveTextContent("Un inspector ya visitó el lugar y estamos evaluando lo que encontró.");
    expect(result).toHaveTextContent("Ruidos molestos");
    expect(result).toHaveTextContent("Av. Rivadavia 4500");
    expect(result).toHaveTextContent("01/10/2026");
    expect(result).toHaveTextContent("05/10/2026");
    expect(result).toHaveTextContent("04/10/2026");
    expect(screen.getByRole("status")).toHaveTextContent("Un inspector ya visitó el lugar");
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Inspeccionada");
    expect(screen.queryByText("Trámite cerrado")).not.toBeInTheDocument();
  });

  it("shows the closed sign for a closed case", async () => {
    render(<ReportTracker />);
    await lookUp(closedTicketId);
    expect(await screen.findByText("Trámite cerrado")).toBeVisible();
  });

  it("shows DERIVADA as its own end state", async () => {
    server.use(http.get("*/api/public/reports/:ticketId", () => HttpResponse.json({
      ...publicReportFixtures[0], stage: "DERIVADA", stageLabel: "Tu denuncia se derivó al área que corresponde.", inspectedAt: null,
    })));
    render(<ReportTracker />);
    await lookUp(PUBLIC_DEMO_TICKET_ID);

    expect(await screen.findByRole("listitem", { current: "step" })).toHaveTextContent("Derivada");
    expect(screen.queryByText("Cerrada")).not.toBeInTheDocument();
  });

  it("looks the code up on load when it arrives in the link", async () => {
    render(<ReportTracker initialCode={PUBLIC_DEMO_TICKET_ID} />);
    expect(await screen.findByRole("region", { name: /TK-2026-000123/ })).toBeVisible();
    expect(screen.getByLabelText("Código de seguimiento")).toHaveValue(PUBLIC_DEMO_TICKET_ID);
  });

  it("explains a code that finds nothing without saying the case does not exist", async () => {
    render(<ReportTracker />);
    await lookUp("11111111-2222-4333-8444-555555555555");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No encontramos una denuncia con ese código. Revisá que sea el código de seguimiento de tu comprobante.",
    );
  });

  it("catches a malformed code before any request", async () => {
    let requests = 0;
    server.use(http.get("*/api/public/reports/:ticketId", () => { requests += 1; return HttpResponse.json({}); }));
    render(<ReportTracker />);
    await lookUp("hola");
    expect(await screen.findByRole("alert")).toHaveTextContent("Ese código no tiene el formato correcto.");
    expect(requests).toBe(0);
  });

  it("gives the readable TK reference its own hint", async () => {
    let requests = 0;
    server.use(http.get("*/api/public/reports/:ticketId", () => { requests += 1; return HttpResponse.json({}); }));
    render(<ReportTracker />);
    await lookUp("TK-2026-000123");
    expect(await screen.findByRole("alert")).toHaveTextContent("necesitás el código de seguimiento, que es otro");
    expect(requests).toBe(0);
  });

  it("tells the person to wait when the backend rate-limits", async () => {
    server.use(http.get("*/api/public/reports/:ticketId", () => HttpResponse.json({}, { status: 429, headers: { "retry-after": "30" } })));
    render(<ReportTracker />);
    await lookUp(PUBLIC_DEMO_TICKET_ID);
    expect(await screen.findByRole("alert")).toHaveTextContent("Hiciste muchas consultas seguidas. Probá de nuevo en un minuto.");
  });

  it.each([
    ["a 5xx", () => HttpResponse.json({}, { status: 502 })],
    ["a network failure", () => HttpResponse.error()],
    ["a response outside the contract", () => HttpResponse.json({ ticketId: "x", stage: "OTRA" })],
  ])("offers a retry after %s", async (_name, failure) => {
    server.use(http.get("*/api/public/reports/:ticketId", failure, { once: true }));
    render(<ReportTracker />);
    await lookUp(PUBLIC_DEMO_TICKET_ID);
    expect(await screen.findByRole("alert")).toHaveTextContent("El servicio no responde en este momento.");

    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("region", { name: /TK-2026-000123/ })).toBeVisible();
  });

  it("shows no field outside the public report", async () => {
    server.use(http.get("*/api/public/reports/:ticketId", () => HttpResponse.json({
      ...publicReportFixtures[0], inspectorName: "Marta Gómez", complainantEmail: "vecino@example.com", findings: "Hallazgo interno",
    })));
    render(<ReportTracker />);
    await lookUp(PUBLIC_DEMO_TICKET_ID);
    const result = await screen.findByRole("region", { name: /TK-2026-000123/ });
    expect(result).not.toHaveTextContent("Marta Gómez");
    expect(result).not.toHaveTextContent("vecino@example.com");
    expect(result).not.toHaveTextContent("Hallazgo interno");
  });
});
