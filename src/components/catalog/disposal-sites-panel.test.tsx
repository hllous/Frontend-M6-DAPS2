import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { scenarios } from "@/lib/scenarios";
import { DisposalSitesPanel } from "./disposal-sites-panel";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DisposalSitesPanel", () => {
  it("lists sites and exposes only logical deactivation to Office", async () => {
    render(<DisposalSitesPanel scenario={scenarios.officeDutyQueue} />);
    expect(await screen.findByRole("heading", { name: "Sitios de disposición" })).toBeVisible();
    expect(screen.getByText("RS-01")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Dar de baja" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it("hides mutation actions from Field", async () => {
    render(<DisposalSitesPanel scenario={scenarios.fieldCrewLeader} />);
    expect(await screen.findByRole("heading", { name: "Sitios de disposición" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nuevo sitio de disposición" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).not.toBeInTheDocument();
  });
});
