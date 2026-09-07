import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetEnvironmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { scenarios } from "@/lib/scenarios";
import { EnvironmentalReportsWorkspace } from "./environmental-reports-workspace";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetEnvironmentalReportFixtures(); window.history.replaceState(null, "", "/app?destination=environment"); });
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
});
