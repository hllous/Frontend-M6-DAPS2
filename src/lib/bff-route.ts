import { NextResponse } from "next/server";

import { bffPathForResponse } from "./bff-response-path";
import {
  AuthUnavailableError,
  BackendUnavailableError,
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
  if (error instanceof BackendUnavailableError) {
    return errorResponse(503, error.message, path);
  }
  return errorResponse(500, fallbackMessage, path);
}

export function forwardResponse(response: Response, path = bffPathForResponse(response) ?? ""): NextResponse {
  const contentType = response.headers.get("content-type");
  const bodyless = [204, 205, 304].includes(response.status);
  if (!bodyless && contentType?.split(";")[0].trim().toLowerCase() !== "application/json") {
    void response.body?.cancel().catch(() => undefined);
    const errorStatus = response.status >= 200 && response.status < 300 ? 502 : response.status;
    const error = errorResponse(errorStatus, "La respuesta del backend no tiene un tipo de contenido JSON válido.", path);
    error.headers.set("X-Content-Type-Options", "nosniff");
    return error;
  }
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      ...(contentType ? { "content-type": contentType } : {}),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
