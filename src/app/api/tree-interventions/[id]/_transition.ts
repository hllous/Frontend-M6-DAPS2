import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  getTreeInterventionFixture,
  updateTreeInterventionFixture,
} from "@/lib/tree-intervention-fixtures";
import {
  treeInterventionAuthorizeInputSchema,
  type TreeInterventionAuthorizeInput,
} from "@/lib/tree-interventions";
import { getScenario } from "@/lib/scenarios";
import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  InvalidSessionError,
  requireCapability,
} from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

export type TreeInterventionTransition = "submit" | "authorize" | "reject";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  503: "Service Unavailable",
  500: "Internal Server Error",
};

function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    {
      statusCode: status,
      message,
      error: ERROR_LABELS[status] ?? "Error",
      timestamp: new Date().toISOString(),
      path,
    },
    { status },
  );
}

function transitionCapability(transition: TreeInterventionTransition) {
  return transition === "submit" ? "treeIntervention:request" as const : "treeIntervention:authorize" as const;
}

function transitionLabel(transition: TreeInterventionTransition) {
  if (transition === "submit") return "enviar intervenciones a autorización";
  if (transition === "authorize") return "autorizar intervenciones";
  return "rechazar intervenciones";
}

async function backendTransition(
  request: Request,
  id: string,
  transition: TreeInterventionTransition,
  input?: TreeInterventionAuthorizeInput,
) {
  const init: RequestInit = { method: "POST" };
  if (input) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(input);
  }
  const response = await fetchBackend(
    request,
    `/tree-interventions/${encodeURIComponent(id)}/${transition === "submit" ? "submit-for-authorization" : transition}`,
    transitionCapability(transition),
    init,
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

export async function handleTreeInterventionTransition(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
  transition: TreeInterventionTransition,
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE") {
      return errorResponse(403, `Solo Oficina puede ${transitionLabel(transition)}.`, path);
    }
    requireCapability(session, transitionCapability(transition));

    let input: TreeInterventionAuthorizeInput | undefined;
    if (transition === "authorize") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, "La identidad de autorización es obligatoria.", path);
      }
      const parsed = treeInterventionAuthorizeInputSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
      input = parsed.data;
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      return backendTransition(request, id, transition, input);
    }

    const intervention = getTreeInterventionFixture(id);
    if (!intervention) return errorResponse(404, `Intervención de arbolado ${id} no encontrada.`, path);

    if (transition === "submit") {
      if (intervention.interventionType !== "REMOVAL") {
        return errorResponse(400, "Solo las extracciones requieren el envío a autorización.", path);
      }
      if (intervention.status !== "REQUESTED") {
        return errorResponse(409, "Solo se puede enviar a autorización una extracción solicitada.", path);
      }
      return NextResponse.json(updateTreeInterventionFixture(id, { status: "PENDING_AUTHORIZATION" }), { status: 200 });
    }

    if (transition === "authorize") {
      const validStatus = intervention.interventionType === "REMOVAL"
        ? intervention.status === "PENDING_AUTHORIZATION"
        : intervention.status === "REQUESTED";
      if (!validStatus) {
        return errorResponse(
          409,
          intervention.interventionType === "REMOVAL"
            ? "La extracción debe estar pendiente de autorización antes de autorizarse."
            : "Solo se pueden autorizar intervenciones solicitadas.",
          path,
        );
      }
      return NextResponse.json(updateTreeInterventionFixture(id, {
        status: "AUTHORIZED",
        authorizedByUserId: input?.authorizedByUserId ?? null,
        authorizedAt: new Date().toISOString(),
      }), { status: 200 });
    }

    if (intervention.interventionType !== "REMOVAL" || intervention.status !== "PENDING_AUTHORIZATION") {
      return errorResponse(409, "Solo se puede rechazar una extracción pendiente de autorización.", path);
    }
    return NextResponse.json(updateTreeInterventionFixture(id, { status: "REJECTED" }), { status: 200 });
  } catch (error) {
    if (error instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa.", path);
    }
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo actualizar la intervención de arbolado.", path);
  }
}
