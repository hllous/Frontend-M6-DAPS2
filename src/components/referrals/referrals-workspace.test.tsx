import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { fixtureReferrals } from "@/app/api/referrals/route";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { scenarios } from "@/lib/scenarios";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { ReferralsWorkspace } from "./referrals-workspace";

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
  it("lets Office list both referral kinds and open their own detail", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    expect(within(list).getByRole("button", { name: /RR-1001/ })).toBeVisible();
    expect(within(list).getByRole("button", { name: /SCR-1001/ })).toBeVisible();
    expect(within(list).getByText("M3 · Reparaciones")).toBeVisible();
    expect(within(list).getByText("M7 · Cortes de calle")).toBeVisible();

    await user.click(within(list).getByRole("button", { name: /SCR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de SCR-1001" });
    expect(within(detail).getByText("Solicitada")).toBeVisible();
    expect(within(detail).getByRole("link", { name: /Ver Servicio de origen/ })).toHaveAttribute(
      "href",
      "/app?destination=services&detail=SVC-1050",
    );
    expect(within(detail).getByText("La información del Servicio se consulta en su módulo de origen.")).toBeVisible();
  });

  it("keeps Field list and detail scoped to assigned Services", async () => {
    const all = fixtureReferrals();
    const outOfScope = { ...all[0], id: "RR-OTHER", sourceServiceId: "SVC-1042", sourceLabel: "Servicio de otra cuadrilla" };
    server.use(
      http.get("*/api/referrals", () => HttpResponse.json({ data: [...all, outOfScope], meta: { total: all.length + 1 } })),
    );

    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.fieldCrewLeader} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    expect(within(list).getByRole("button", { name: /RR-1001/ })).toBeVisible();
    expect(within(list).getByRole("button", { name: /SCR-1001/ })).toBeVisible();
    expect(within(list).queryByRole("button", { name: /RR-OTHER/ })).not.toBeInTheDocument();

    await user.click(within(list).getByRole("button", { name: /RR-1001/ }));
    expect(await screen.findByRole("region", { name: "Detalle de RR-1001" })).toBeVisible();
  });

  it("supports keyboard opening and returns from detail to the list", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const row = await screen.findByRole("button", { name: /RR-1001/ });
    row.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("region", { name: "Detalle de RR-1001" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Volver a derivaciones" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Lista de derivaciones" })).toBeVisible());
  });

  it("lets Office manually reconcile a repair with the external work order", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /RR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de RR-1001" });
    await user.click(within(detail).getByRole("button", { name: "Registrar inicio de reparación" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/acción solo registra un hecho externo ya confirmado/i)).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recuperación" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/identificador externo de m3/i);

    await user.type(within(dialog).getByLabelText(/Identificador externo de M3/), "M3-OT-2048");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recuperación" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("En curso")).toBeVisible();
    expect(within(detail).getByText("M3-OT-2048")).toBeVisible();

    await user.click(within(detail).getByRole("button", { name: "Registrar cierre de reparación" }));
    const closeDialog = screen.getByRole("dialog");
    await user.type(within(closeDialog).getByLabelText(/Identificador externo de M3/), "M3-OT-2048");
    await user.click(within(closeDialog).getByRole("button", { name: "Confirmar recuperación" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Cerrada")).toBeVisible();
  });

  it("keeps manual recovery unavailable to Field", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.fieldCrewLeader} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /RR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de RR-1001" });
    expect(within(detail).queryByText("Recuperación manual")).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it("requires the M7 identifier and updates the closure detail after approval", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /SCR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de SCR-1001" });
    await user.click(within(detail).getByRole("button", { name: "Registrar aprobación de M7" }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recuperación" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/identificador externo de m7/i);

    await user.type(within(dialog).getByLabelText(/Identificador externo de M7/), "M7-C-882");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recuperación" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Aprobada")).toBeVisible();
    expect(within(detail).getByText("M7-C-882")).toBeVisible();

    await user.click(within(detail).getByRole("button", { name: "Registrar finalización de M7" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar recuperación" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Finalizada")).toBeVisible();
  });

  it("lets Office record a confirmed M7 rejection without inventing a closure id", async () => {
    const user = userEvent.setup();
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);

    const list = await screen.findByRole("region", { name: "Lista de derivaciones" });
    await user.click(within(list).getByRole("button", { name: /SCR-1001/ }));
    const detail = await screen.findByRole("region", { name: "Detalle de SCR-1001" });
    await user.click(within(detail).getByRole("button", { name: "Registrar rechazo de M7" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText(/Identificador externo de M7/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar recuperación" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(detail).getByText("Rechazada")).toBeVisible();
  });

  it("announces empty and error states", async () => {
    server.use(
      http.get("*/api/referrals", () => HttpResponse.json({ data: [], meta: { total: 0 } })),
    );
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByText("No hay derivaciones para esta sesión")).toBeVisible();

    server.resetHandlers();
    server.use(http.get("*/api/referrals", () => HttpResponse.json({ message: "Servidor no disponible" }, { status: 503 })));
    render(<ReferralsWorkspace scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las derivaciones");
  });
});
