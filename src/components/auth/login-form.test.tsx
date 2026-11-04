import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";
import { scenarios } from "@/lib/scenarios";
import { expectNoInternalJargon } from "@/test/no-internal-jargon";

const originalLocation = window.location;

afterEach(() => {
  Object.defineProperty(window, "location", { value: originalLocation, writable: true, configurable: true });
  vi.restoreAllMocks();
});

describe("LoginForm", () => {
  it.each(["mock", "real-m1"] as const)("uses plain language in %s login", (authMode) => {
    const { container } = render(<LoginForm scenarios={Object.values(scenarios)} authMode={authMode} redirectTo="/app" />);
    expectNoInternalJargon(container);
  });

  it("lets an operator choose a profile and enter through the BFF", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ session: { scenarioId: "office-duty-queue" } }), { status: 200 }),
    );

    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    expect(screen.getByRole("heading", { name: "Ingresar" })).toBeVisible();
    expect(screen.getByText("Ambiente, Higiene y Servicios Urbanos")).toBeVisible();
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

  it("describes the selected demo profile in mock mode", () => {
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
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

  it("does not blame the connection when the BFF answers with a non-JSON error page", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Gateway Timeout</html>", { status: 504, headers: { "content-type": "text/html" } }),
    );

    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudo ingresar. Intente nuevamente.");
    expect(alert).not.toHaveTextContent("Revise la conexión");
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

  it("presents the institutional portal without options M1 may not support", () => {
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="real-m1" redirectTo="/app" />);

    expect(screen.queryByText("Módulo 6")).not.toBeInTheDocument();
    expect(screen.getByText("Acceso para empleados municipales y empresas contratistas")).toBeVisible();
    expect(screen.getByText("Ingrese con su usuario y contraseña municipal.")).toBeVisible();
    expect(screen.getByText("Desarrollo de Aplicaciones II · UADE · Grupo 4")).toBeInTheDocument();
    expect(screen.queryByText("Mantener sesión iniciada")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Olvidó su contraseña?")).not.toBeInTheDocument();
    expect(screen.queryByText(/no tiene usuarios propios/)).not.toBeInTheDocument();
  });

  it("does not mention Module 1 credentials in the demo profile mode", () => {
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="mock" redirectTo="/app" />);

    expect(screen.queryByText(/credenciales del Módulo 1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/administrador del Módulo 1/)).not.toBeInTheDocument();
  });

  it("lets the person reveal and hide the password", async () => {
    const user = userEvent.setup();
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="real-m1" redirectTo="/app" />);
    const password = screen.getByLabelText("Contraseña");

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password).toHaveAttribute("type", "password");
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
    fetchMock.mockRestore();
  });

  it("keeps submit locked after a successful login while navigation starts", async () => {
    const user = userEvent.setup();
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { assign }, writable: true, configurable: true });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ session: {} }));
    render(<LoginForm scenarios={Object.values(scenarios)} authMode="real-m1" redirectTo="/app" />);

    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "persona@example.test");
    await user.type(screen.getByLabelText("Contraseña"), "clave");
    await user.click(screen.getByRole("button", { name: "Ingresar al sistema" }));

    expect(assign).toHaveBeenCalledWith("/app");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Ingresando…" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
