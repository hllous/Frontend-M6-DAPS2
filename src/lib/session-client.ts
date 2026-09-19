import { recordTelemetryEvent } from "./telemetry";

const CHANNEL_NAME = "m6-session";
const LOGOUT_MESSAGE = "logout";

let channel: BroadcastChannel | undefined;

function getChannel(): BroadcastChannel | undefined {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return undefined;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export async function broadcastLogout(): Promise<void> {
  recordTelemetryEvent({ name: "auth_logout_broadcast" });
  try {
    await fetch("/api/session/logout", { method: "POST", cache: "no-store" });
  } catch {
    // Best-effort: every open tab still redirects to login regardless.
  }
  getChannel()?.postMessage(LOGOUT_MESSAGE);
  if (typeof window !== "undefined") window.location.assign("/login");
}

export function onRemoteLogout(callback: () => void): () => void {
  const activeChannel = getChannel();
  if (!activeChannel) return () => undefined;

  const handleMessage = (event: MessageEvent) => {
    if (event.data === LOGOUT_MESSAGE) callback();
  };
  activeChannel.addEventListener("message", handleMessage);
  return () => activeChannel.removeEventListener("message", handleMessage);
}
