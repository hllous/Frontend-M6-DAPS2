import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { CrewCatalogPanel } from "./crew-catalog-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("CrewCatalogPanel", () => {
  it("lists identity-backed crew references and operational status", async () => {
    render(<CrewCatalogPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("heading", { name: "Cuadrillas" })).toBeVisible();
    expect(screen.getByText("Cuadrilla A · López")).toBeVisible();
    expect(screen.getByText("Carlos López")).toBeVisible();
    expect(screen.getAllByText("Municipalidad").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: "Turno" })).toBeVisible();
  });

  it("scopes Field views and hides management controls", async () => {
    render(<CrewCatalogPanel scenario={scenarios.fieldCrewMember} />);
    expect(await screen.findByText("Cuadrilla B · Fernández")).toBeVisible();
    expect(screen.queryByText("Cuadrilla A · López")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar cuadrilla" })).not.toBeInTheDocument();
  });
});
