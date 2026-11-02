import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";
import { scenarios } from "@/lib/scenarios";

describe("LoginForm", () => {
  it("lets an operator choose a profile and enter through the BFF", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ session: { scenarioId: "office-duty-queue" } }), { status: 200 }),
    );

    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    expect(screen.getByRole("heading", { name: "Ingresar" })).toBeVisible();
    expect(screen.getByText("Ambiente e Higiene")).toBeVisible();
    expect(screen.queryByText("Ambiente y servicios")).not.toBeInTheDocument();
    expect(screen.queryByText("Seleccione un escenario de trabajo para abrir una sesión protegida.")).not.toBeInTheDocument();
    expect(screen.queryByText("El alcance de la sesión se limita al escenario elegido.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Perfil" }));
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

  it("links to the public tracking section", () => {
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    expect(screen.getByRole("link", { name: "Consultar una denuncia" })).toHaveAttribute("href", "/consulta");
  });

  it("tells the person that the session ended when the login opens after an expiry", () => {
    const { rerender } = render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app?destination=services" sessionExpired />);
    expect(screen.getByRole("alert")).toHaveTextContent("Su sesión terminó. Vuelva a ingresar.");

    rerender(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    expect(screen.queryByText("Su sesión terminó. Vuelva a ingresar.")).not.toBeInTheDocument();
  });

  it("shows the seed id of the profile only against the real backend", () => {
    const { rerender } = render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    expect(screen.getByText(/Entorno de demostración/)).not.toHaveTextContent("del seed del backend");

    rerender(<LoginForm scenarios={Object.values(scenarios)} authMode="backend-development" redirectTo="/app" />);
    expect(screen.getByText(/Entorno de demostración/)).toHaveTextContent("id 2 del seed del backend");
    expect(screen.getByRole("combobox", { name: "Perfil" })).toHaveAccessibleDescription(/Entorno de demostración/);
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

  it("gives an actionable message when the BFF error has no message", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 500 }),
    );

    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo ingresar. Intente nuevamente.");
    fetchMock.mockRestore();
  });

  it("asks the operator to check the connection when login cannot reach the BFF", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo ingresar. Revise la conexión e intente nuevamente.");
    fetchMock.mockRestore();
  });

  it("shows the real credential form without the demo persona picker", () => {
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="real-m1" redirectTo="/app" />);

    expect(screen.getByRole("textbox", { name: "Correo electrónico" })).toBeVisible();
    expect(screen.getByLabelText("Contraseña")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Perfil" })).not.toBeInTheDocument();
  });

  it("sends real-M1 credentials only to the BFF and preserves the email after a failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ message: "El correo o la contraseña no son correctos." }, { status: 401 }),
    );
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="real-m1" redirectTo="/app?destination=services" />);

    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "persona@example.test");
    await user.type(screen.getByLabelText("Contraseña"), "clave incorrecta");
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/session/login", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "persona@example.test", password: "clave incorrecta" }),
      headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
    }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El correo o la contraseña no son correctos.");
    expect(screen.getByRole("textbox", { name: "Correo electrónico" })).toHaveValue("persona@example.test");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
    expect(document.cookie).not.toContain("m6_session=");
    fetchMock.mockRestore();
  });

  it("shows progress and blocks a second submit while real-M1 login is pending", async () => {
    const user = userEvent.setup();
    let resolveLogin: ((response: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="real-m1" redirectTo="/app" />);

    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "persona@example.test");
    await user.type(screen.getByLabelText("Contraseña"), "clave");
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));
    await user.click(screen.getByRole("button", { name: "Ingresando…" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("El servicio de ingreso está iniciando, puede tardar hasta un minuto y medio.");
    resolveLogin?.(Response.json({ message: "El correo o la contraseña no son correctos." }, { status: 401 }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El correo o la contraseña no son correctos.");
    fetchMock.mockRestore();
  });
});
