import { NextResponse } from "next/server";

import {
  AuthUnavailableError,
  ForbiddenSessionError,
  InvalidSessionError,
  type Session,
} from "./session";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export function backendMode(session: Pick<Session, "mode">): boolean {
  if (session.mode === "mock") return false;
  if (!process.env.M6_BACKEND_ORIGIN) {
    throw new AuthUnavailableError("El backend de desarrollo no está configurado.");
  }
  return true;
}

export function errorResponse(status: number, message: string, path: string): NextResponse {
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

export function mapSessionError(error: unknown, path: string, fallbackMessage: string): NextResponse {
  if (error instanceof InvalidSessionError) {
    return errorResponse(401, "La sesión no está activa.", path);
  }
  if (error instanceof ForbiddenSessionError) {
    return errorResponse(403, error.message, path);
  }
  if (error instanceof AuthUnavailableError) {
    return errorResponse(503, error.message, path);
  }
  return errorResponse(500, fallbackMessage, path);
}

export function forwardResponse(response: Response): NextResponse {
  return new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}
