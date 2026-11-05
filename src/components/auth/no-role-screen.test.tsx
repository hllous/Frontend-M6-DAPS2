import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as navigation from "next/navigation";

import { expectNoInternalJargon } from "@/test/no-internal-jargon";
import { NoRoleScreen } from "./no-role-screen";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("NoRoleScreen", () => {
  it("explains the missing M6 role, identifies the signed-in employee, and offers sign-out", () => {
    const { container } = render(<NoRoleScreen identity="Legajo 900" />);

    expect(screen.getByRole("heading", { name: "Sin rol asignado" })).toBeVisible();
    expect(screen.getByText("Legajo 900")).toBeVisible();
    expectNoInternalJargon(container);
    expect(screen.getByText(/Su usuario todavía no tiene un rol en Ambiente e Higiene/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
  });

  it("announces logout failures and keeps the screen available", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ message: "No disponible" }, { status: 503 }));
    render(<NoRoleScreen identity="Legajo 900" />);

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
    render(<NoRoleScreen identity="Legajo 900" />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60_001);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
  });

  it("does not refresh roles when keyboard activity targets the logout button", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ session: { roles: [] } }));
    render(<NoRoleScreen identity="Legajo 900" />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60_001);
    fireEvent.keyDown(screen.getByRole("button", { name: "Cerrar sesión" }), { key: "Enter" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
