import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as navigation from "next/navigation";

import { NoRoleScreen } from "./no-role-screen";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("NoRoleScreen", () => {
  it("explains the missing M6 role, identifies the signed-in employee, and offers sign-out", () => {
    render(<NoRoleScreen identity="Empleado M1 · 900" />);

    expect(screen.getByRole("heading", { name: "Sin rol asignado" })).toBeVisible();
    expect(screen.getByText("Empleado M1 · 900")).toBeVisible();
    expect(screen.getByText(/Solicite a un administrador de M6 que le asigne un rol/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
  });

  it("announces logout failures and keeps the screen available", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ message: "No disponible" }, { status: 503 }));
    render(<NoRoleScreen identity="Empleado M1 · 900" />);

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cerrar la sesión. Intente nuevamente.");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledWith("/api/session/logout", expect.objectContaining({ method: "POST" }));
    fetchMock.mockRestore();
  });

  it("checks for a newly assigned role on activity and opens the application", async () => {
    vi.useFakeTimers();
    const replace = vi.fn();
    const router = navigation.useRouter();
    vi.spyOn(navigation, "useRouter").mockReturnValue({ ...router, replace });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ session: { roles: [] } }))
      .mockResolvedValueOnce(Response.json({ session: { roles: ["M6_ADMIN"] } }));
    render(<NoRoleScreen identity="Empleado M1 · 900" />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60_001);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
  });
});
