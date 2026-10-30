import { getScenario } from "./scenarios";

import type { NextResponse } from "next/server";

import { fetchBackend } from "./bff-backend";
import { meSchema, type Me, type M6Role } from "./m6-roles";
import {
  AUTH_COOKIE_NAME,
  BackendUnavailableError,
  CitizenForbiddenError,
  InvalidSessionError,
  getRequiredSession,
  sealSession,
  sessionCookieOptions,
  type Session,
} from "./session";

const ME_TIMEOUT_MS = 15_000;

/** Interpreta la respuesta de `GET /me`: 401 es sesión rechazada, 403 es un ciudadano, lo demás es indisponibilidad. */
export async function readMeResponse(response: Response): Promise<Me> {
  if (response.status === 401) throw new InvalidSessionError("El backend rechazó la sesión.");
  if (response.status === 403) throw new CitizenForbiddenError();
  if (!response.ok) {
    throw new BackendUnavailableError(response.status, `El backend respondió con un error (HTTP ${response.status}).`);
  }
  const parsed = meSchema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) {
    throw new BackendUnavailableError(502, "La respuesta de identidad no respeta el contrato documentado.");
  }
  return parsed.data;
}

/** Login: todavía no hay sesión, así que se pide con el token de demo. */
export async function fetchMeWithToken(origin: string, accessToken: string): Promise<Me> {
  let response: Response;
  try {
    response = await fetch(new URL("/me", origin), {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(ME_TIMEOUT_MS),
    });
  } catch {
    throw new BackendUnavailableError(503);
  }
  return readMeResponse(response);
}

/** Con sesión: única fuente de los roles de M6 (se calculan en cada request del backend). */
export async function fetchMe(request: Request): Promise<Me> {
  return readMeResponse(await fetchBackend(request, "/me"));
}

export function sameRoles(a: readonly M6Role[], b: readonly M6Role[]): boolean {
  return a.length === b.length && a.every((role, index) => role === b[index]);
}

/** Si los roles cambiaron en el backend, la cookie los toma ya: el BFF autoriza con lo mismo que la UI. */
export function sealRolesIfChanged(response: NextResponse, request: Request, roles: readonly M6Role[]): void {
  // Parte de la sesión del pedido (la renovada, si fetchMe renovó), no de una copia leída antes.
  const session = getRequiredSession(request);
  if (sameRoles(session.roles, roles)) return;
  const next = { ...session, roles: [...roles] };
  response.cookies.set({ name: AUTH_COOKIE_NAME, value: sealSession(next), ...sessionCookieOptions(next) });
}

/** Selecciona la cuadrilla del backend, priorizando liderazgo y luego el nombre del perfil. */
export function sessionFromMe(session: Session, me: Me): Session {
  const isFieldCrew = me.roles.includes("M6_CAMPO_CUADRILLA");
  const candidates = isFieldCrew ? me.crews.filter((crew) => crew.role === (me.crews.some((item) => item.role === "LEADER") ? "LEADER" : "MEMBER")) : [];
  const preferredName = getScenario(session.scenarioId).actor.backendCrewName;
  const selected = candidates.find((crew) => crew.name === preferredName) ?? candidates[0];
  return { ...session, roles: me.roles, crew: selected ? { id: selected.id, name: selected.name } : undefined, fieldRole: selected ? (selected.role === "LEADER" ? "CREW_LEADER" : "CREW_MEMBER") : undefined };
}
