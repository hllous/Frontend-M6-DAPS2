import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { notifyError } from "@/components/ui/feedback";
import { getScenario, scenarioForRoles } from "@/lib/scenarios";
import { getFieldDraft, setFieldDraftOwner } from "@/lib/field-drafts";
import { SessionShell } from "./session-shell";

vi.mock("@/components/ui/feedback", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

it("renders the frame before hydration without mounting Field children for another draft owner", () => {
  setFieldDraftOwner("actor-b");
  const readDraft = vi.fn(() => <p>Private Field content</p>);
  const FieldChild = readDraft;
  const html = renderToString(<SessionShell actorId="actor-a" scenarioId="office-duty-queue" logoutAction={async () => undefined}><FieldChild /></SessionShell>);
  expect(html).toContain('aria-label="Módulos"');
  expect(html).toContain("<header");
  expect(html).toContain('aria-busy="true"');
  expect(readDraft).not.toHaveBeenCalled();
});

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
  render(<SessionShell actorId="actor-a" scenarioId="office-duty-queue" logoutAction={logoutAction} />);
  await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
  await expect(received).resolves.toBe("logout");
  expect(logoutAction).toHaveBeenCalledOnce();
  expect(assign).toHaveBeenCalledWith("/login");
  remote.close();
});

it("lets an employee without an assigned role log out and return to login", async () => {
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { assign, pathname: "/app", search: "" }, configurable: true });
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
    String(input).includes("/api/session/logout")
      ? new Response(null, { status: 200 })
      : Response.json(scenarioForRoles(getScenario("office-duty-queue"), [])),
  );
  const logoutAction = vi.fn().mockResolvedValue(undefined);

  render(<SessionShell actorId="actor-a" scenarioId="office-duty-queue" logoutAction={logoutAction} />);

  expect(await screen.findByText("Sin rol asignado")).toBeVisible();
  await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));

  expect(logoutAction).toHaveBeenCalledOnce();
  expect(assign).toHaveBeenCalledWith("/login");
});

it("shows a retry message without broadcasting when the logout action fails", async () => {
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { assign, pathname: "/app", search: "" }, configurable: true });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(getScenario("office-duty-queue")));
  const remote = new BroadcastChannel("m6-session");
  const received = vi.fn();
  remote.addEventListener("message", received);
  render(<SessionShell actorId="actor-a" scenarioId="office-duty-queue" logoutAction={async () => { throw new TypeError("offline"); }} />);
  await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
  await waitFor(() => expect(notifyError).toHaveBeenCalledWith("No se pudo cerrar la sesión. Reintente."));
  await waitFor(() => expect(assign).not.toHaveBeenCalled());
  expect(received).not.toHaveBeenCalled();
  remote.close();
});

it("initializes the actor before Field children first read a saved draft", async () => {
  setFieldDraftOwner("actor-b");
  localStorage.setItem("m6:field-draft:v2:actor-a:SVC-9001:start", JSON.stringify({ payload: "actor-a private" }));
  Object.defineProperty(window, "location", { value: { assign: vi.fn(), pathname: "/app/services", search: "" }, configurable: true });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(getScenario("office-duty-queue")));
  function FieldChild() {
    return <p>{getFieldDraft<string>("SVC-9001", "start")?.payload ?? "missing"}</p>;
  }
  render(<SessionShell actorId="actor-a" scenarioId="office-duty-queue" logoutAction={async () => undefined}><FieldChild /></SessionShell>);
  expect(await screen.findByText("actor-a private")).toBeVisible();
});

