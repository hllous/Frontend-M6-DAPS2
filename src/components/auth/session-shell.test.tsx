import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { getScenario } from "@/lib/scenarios";
import { SessionShell } from "./session-shell";

afterEach(() => vi.restoreAllMocks());

it("broadcasts and redirects after the logout action succeeds", async () => {
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { assign, pathname: "/app", search: "" }, configurable: true });
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
    String(input).includes("/api/session/logout")
      ? new Response(null, { status: 200 })
      : Response.json(getScenario("office-duty-queue")),
  );
  const remote = new BroadcastChannel("m6-session");
  const received = new Promise((resolve) => remote.addEventListener("message", (event) => resolve(event.data), { once: true }));
  const logoutAction = vi.fn().mockResolvedValue(undefined);
  render(<SessionShell scenarioId="office-duty-queue" logoutAction={logoutAction} />);
  await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
  await expect(received).resolves.toBe("logout");
  expect(logoutAction).toHaveBeenCalledOnce();
  expect(assign).toHaveBeenCalledWith("/login");
  remote.close();
});

it("shows a retry message without broadcasting when the logout action fails", async () => {
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { assign, pathname: "/app", search: "" }, configurable: true });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(getScenario("office-duty-queue")));
  const remote = new BroadcastChannel("m6-session");
  const received = vi.fn();
  remote.addEventListener("message", received);
  render(<SessionShell scenarioId="office-duty-queue" logoutAction={async () => { throw new TypeError("offline"); }} />);
  await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cerrar la sesión. Reintente.");
  await waitFor(() => expect(assign).not.toHaveBeenCalled());
  expect(received).not.toHaveBeenCalled();
  remote.close();
});

