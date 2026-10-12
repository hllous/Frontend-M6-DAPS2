import { AuthUnavailableError } from "./session";
import type { Session } from "./session";

export function backendMode(session: Pick<Session, "mode">): boolean {
  if (session.mode === "mock") return false;
  if (!process.env.M6_BACKEND_ORIGIN) {
    throw new AuthUnavailableError("El backend de desarrollo no está configurado.");
  }
  return true;
}
