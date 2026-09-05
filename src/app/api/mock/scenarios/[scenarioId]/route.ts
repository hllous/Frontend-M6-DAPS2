import { NextResponse } from "next/server";

import { loadAuthorizedScenario } from "@/lib/bff-data";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  InvalidSessionError,
} from "@/lib/session";
import { isScenarioId } from "@/lib/scenarios";

export async function GET(
  request: Request,
  context: { params: Promise<{ scenarioId: string }> },
) {
  const { scenarioId } = await context.params;
  if (!isScenarioId(scenarioId)) {
    return NextResponse.json({ message: "Escenario no encontrado." }, { status: 404 });
  }

  try {
    return NextResponse.json(await loadAuthorizedScenario(request, scenarioId));
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      return NextResponse.json({ message: "La sesión no está activa." }, { status: 401 });
    }
    if (error instanceof ForbiddenSessionError) {
      return NextResponse.json({ message: "La sesión no puede consultar este escenario." }, { status: 403 });
    }
    if (error instanceof AuthUnavailableError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }
    return NextResponse.json({ message: "No se pudo cargar el escenario." }, { status: 500 });
  }
}
