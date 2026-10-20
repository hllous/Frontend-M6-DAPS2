import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";
import { scenarios } from "@/lib/scenarios";

describe("LoginForm", () => {
  it("lets an operator choose a named scenario and enter through the BFF", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ session: { scenarioId: "office-duty-queue" } }), { status: 200 }),
    );

    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    await user.click(screen.getByRole("combobox", { name: "Escenario operativo" }));
    await user.click(await screen.findByRole("option", { name: "Campo · responsable de recorrido" }));
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/session/login", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ scenarioId: "field-crew-leader-route" }),
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
    }));
    expect(document.cookie).not.toContain("m6_session=");
    fetchMock.mockRestore();
  });

  it("announces a server error from the BFF without leaving the form", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Escenario no disponible." }), { status: 400 }),
    );

    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Escenario no disponible.");
    fetchMock.mockRestore();
  });

  it("fails closed in unavailable real-M1 mode", () => {
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="real-m1" redirectTo="/app" />);

    expect(screen.getByText(/autenticación real de M1 no está disponible/i)).toBeVisible();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ingresar al sistema" })).not.toBeInTheDocument();
  });
});
