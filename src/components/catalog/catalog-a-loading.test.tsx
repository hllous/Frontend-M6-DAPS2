import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { resetTreeFixtures, treeFixtures } from "@/lib/tree-fixtures";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";

import { AuditedTreeSurveyPanel } from "./audited-tree-survey-panel";
import { ContainerCatalogPanel } from "./container-catalog-panel";
import { GreenPointCatalogPanel } from "./green-point-catalog-panel";
import { GreenSpacesPanel } from "./green-spaces-panel";
import { TreeCatalogPanel } from "./tree-catalog-panel";
import { TreeInterventionsPanel } from "./tree-interventions-panel";

const server = setupServer(...handlers);
vi.mock("next/dynamic", () => ({ default: () => () => <div>Mapa</div> }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => { resetTreeFixtures(); resetTreeInterventionFixtures(); window.history.replaceState(null, "", "/app/catalog"); });
afterEach(() => { server.resetHandlers(); window.localStorage.clear(); });
afterAll(() => server.close());

// Un resolver que sólo espera y no responde deja pasar la petición al handler real.
const delayed = (path: string, ms = 250) => http.get(path, async () => { await delay(ms); });

const visibleLoadingText = () => screen.queryAllByText(/Cargando(\.\.\.|…)/);

function expectBusy(region: HTMLElement) {
  expect(region).toHaveAttribute("aria-busy", "true");
  const message = within(region).getByText("Cargando");
  expect(message).toHaveAttribute("role", "status");
  expect(message).toHaveClass("sr-only");
  expect(region.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  expect(visibleLoadingText()).toHaveLength(0);
}

const gone = (name: string) => waitFor(() => expect(screen.queryByRole("region", { name })).toBeNull(), { timeout: 3000 });

describe("Catalogo A loading skeletons (#589)", () => {
  it("shows the tree list as a busy region until the trees arrive", async () => {
    server.use(delayed("*/api/trees"));
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expectBusy(await screen.findByRole("region", { name: "Árboles registrados" }));

    expect(await screen.findByRole("table", { name: "Catálogo de árboles" }, { timeout: 3000 })).toBeInTheDocument();
    await gone("Árboles registrados");
  });

  it("shows the tree detail dialog as a busy region until the detail arrives", async () => {
    const user = userEvent.setup();
    render(<TreeCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const table = await screen.findByRole("table", { name: "Catálogo de árboles" });

    server.use(delayed("*/api/trees/:id"));
    await user.click(within(table).getAllByRole("button", { name: /Ver detalle/ })[0]);

    const dialog = await screen.findByRole("dialog");
    expectBusy(within(dialog).getByRole("region", { name: "Detalle del árbol" }));
    await gone("Detalle del árbol");
  });

  it("shows the intervention list as a busy region until the requests arrive", async () => {
    server.use(delayed("*/api/tree-interventions"));
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);

    expectBusy(await screen.findByRole("region", { name: "Solicitudes de intervención" }));

    expect(await screen.findAllByRole("button", { name: /Ver detalle/ }, { timeout: 3000 })).not.toHaveLength(0);
    await gone("Solicitudes de intervención");
  });

  it("shows the intervention detail as a busy region until the detail arrives", async () => {
    const user = userEvent.setup();
    render(<TreeInterventionsPanel scenario={scenarios.officeDutyQueue} />);
    const buttons = await screen.findAllByRole("button", { name: /Ver detalle/ });

    server.use(delayed("*/api/tree-interventions/:id"));
    await user.click(buttons[0]);

    const dialog = await screen.findByRole("dialog");
    expectBusy(within(dialog).getByRole("region", { name: "Detalle de la intervención" }));
    await gone("Detalle de la intervención");
  });

  it("shows the survey history as a busy region until the surveys arrive", async () => {
    const tree = treeFixtures[0];
    server.use(delayed("*/api/trees/:id/surveys"));
    render(<AuditedTreeSurveyPanel tree={tree} scenario={scenarios.officeDutyQueue} onClose={() => undefined} />);

    expectBusy(await screen.findByRole("region", { name: "Relevamientos del árbol" }));

    expect(await screen.findAllByRole("button", { name: /Ver detalle/ }, { timeout: 3000 })).not.toHaveLength(0);
    await gone("Relevamientos del árbol");
  });

  it("shows the survey detail as a busy region until the survey arrives", async () => {
    const user = userEvent.setup();
    render(<AuditedTreeSurveyPanel tree={treeFixtures[0]} scenario={scenarios.officeDutyQueue} onClose={() => undefined} />);
    const buttons = await screen.findAllByRole("button", { name: /Ver detalle/ });

    server.use(delayed("*/api/trees/:id/surveys/:surveyId"));
    await user.click(buttons[0]);

    const dialog = await screen.findByRole("dialog");
    expectBusy(within(dialog).getByRole("region", { name: "Detalle del relevamiento" }));
    await gone("Detalle del relevamiento");
  });

  it("shows the green spaces table as a busy region until the spaces arrive", async () => {
    server.use(delayed("*/api/green-spaces"));
    render(<GreenSpacesPanel scenario={scenarios.officeDutyQueue} />);

    expectBusy(await screen.findByRole("region", { name: "Espacios verdes registrados" }));

    expect(await screen.findByRole("table", { name: "Espacios verdes registrados" }, { timeout: 3000 })).toBeInTheDocument();
    await gone("Espacios verdes registrados");
  });

  it("shows the green points table as a busy region until the points arrive", async () => {
    server.use(delayed("*/api/green-points"));
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expectBusy(await screen.findByRole("region", { name: "Puntos verdes registrados" }));

    expect(await screen.findByRole("table", { name: "Catálogo de puntos verdes" }, { timeout: 3000 })).toBeInTheDocument();
    await gone("Puntos verdes registrados");
  });

  it("shows the green point detail as a busy region until the detail arrives", async () => {
    const user = userEvent.setup();
    render(<GreenPointCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const table = await screen.findByRole("table", { name: "Catálogo de puntos verdes" });

    server.use(delayed("*/api/green-points/:id"));
    await user.click(within(table).getAllByRole("button", { name: /^Ver detalle de / })[0]);

    const dialog = await screen.findByRole("dialog");
    expectBusy(within(dialog).getByRole("region", { name: "Detalle del punto verde" }));
    await gone("Detalle del punto verde");
  });

  it("shows the container table as a busy region until the containers arrive", async () => {
    server.use(delayed("*/api/containers"));
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);

    expectBusy(await screen.findByRole("region", { name: "Contenedores registrados" }));

    expect(await screen.findByRole("table", { name: "Inventario de contenedores registrados" }, { timeout: 3000 })).toBeInTheDocument();
    await gone("Contenedores registrados");
  });

  it("shows the container evidence as a busy region until the attachments arrive", async () => {
    const user = userEvent.setup();
    render(<ContainerCatalogPanel scenario={scenarios.officeDutyQueue} />);
    const table = await screen.findByRole("table", { name: "Inventario de contenedores registrados" });

    server.use(delayed("*/api/evidence"));
    await user.click(within(table).getAllByRole("button", { name: /^Ver detalle de / })[0]);

    const dialog = await screen.findByRole("dialog");
    expectBusy(within(dialog).getByRole("region", { name: "Evidencias adjuntas" }));
    await gone("Evidencias adjuntas");
  });
});
