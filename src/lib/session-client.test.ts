import { afterEach, describe, expect, it, vi } from "vitest";

import { broadcastLogout, onRemoteLogout } from "./session-client";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockLocationAssign() {
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { assign }, writable: true, configurable: true });
  return assign;
}

describe("cross-tab session logout", () => {
  it("clears the session, redirects the initiating tab, and notifies other tabs over BroadcastChannel", async () => {
    localStorage.setItem("m6:field-draft:v2:actor-a:service:start", "private");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const assignMock = mockLocationAssign();
    const otherTabChannel = new BroadcastChannel("m6-session");
    const receivedInOtherTab = new Promise<string>((resolve) => {
      otherTabChannel.addEventListener("message", (event) => resolve(event.data as string), { once: true });
    });

    await broadcastLogout();

    expect(fetchMock).toHaveBeenCalledWith("/api/session/logout", expect.objectContaining({
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
      body: "{}",
    }));
    expect(assignMock).toHaveBeenCalledWith("/login");
    expect(localStorage.getItem("m6:field-draft:v2:actor-a:service:start")).toBeNull();
    await expect(receivedInOtherTab).resolves.toBe("logout");
    otherTabChannel.close();
  });

  it("still redirects the initiating tab even when the best-effort logout request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const assignMock = mockLocationAssign();

    await broadcastLogout();

    expect(assignMock).toHaveBeenCalledWith("/login");
  });

  it("lets another tab listen for a remote logout and unsubscribe", async () => {
    localStorage.setItem("m6:field-draft:v2:actor-a:service:start", "private");
    const remoteTabChannel = new BroadcastChannel("m6-session");
    const onLogout = vi.fn();
    const stopListening = onRemoteLogout(onLogout);

    remoteTabChannel.postMessage("logout");
    await vi.waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("m6:field-draft:v2:actor-a:service:start")).toBeNull();

    stopListening();
    const deliveredAfterUnsubscribe = vi.fn();
    const stopObserving = onRemoteLogout(deliveredAfterUnsubscribe);
    remoteTabChannel.postMessage("logout");
    await vi.waitFor(() => expect(deliveredAfterUnsubscribe).toHaveBeenCalledTimes(1));
    expect(onLogout).toHaveBeenCalledTimes(1);
    stopObserving();
    remoteTabChannel.close();
  });
});
