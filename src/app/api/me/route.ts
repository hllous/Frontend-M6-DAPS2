import { NextResponse } from "next/server";

import { backendMode, mapSessionError } from "@/lib/bff-route";
import { fetchMe, sealRolesIfChanged } from "@/lib/me";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";

/** Quién soy y qué roles de M6 tengo ahora (GET /me del backend; en mock, el fixture del escenario). */
export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    if (!backendMode(session)) {
      return NextResponse.json({
        userId: getScenario(session).actor.userId,
        subType: "EMPLEADO",
        m1Role: "MOCK",
        roles: session.roles,
        crews: getScenario(session).actor.crewId && getScenario(session).actor.crewName ? [{ id: getScenario(session).actor.crewId, name: getScenario(session).actor.crewName, role: getScenario(session).actor.fieldRole === "CREW_MEMBER" ? "MEMBER" : "LEADER" }] : [],
        isAssignedInspector: session.roles.includes("M6_CAMPO_INSPECTOR"),
      });
    }

    const me = await fetchMe(request);
    const response = NextResponse.json(me);
    sealRolesIfChanged(response, request, me.roles);
    return response;
  } catch (error) {
    return mapSessionError(error, path, "No se pudo consultar la identidad.");
  }
}
