import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addAttachmentToZoneResult,
  evidenceCache,
  sanitizeFilename,
  zoneResultFixtures,
} from "@/lib/services-fixtures";
import {
  evidenceOwnerTypeSchema,
  type Attachment,
} from "@/lib/services";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  500: "Internal Server Error",
};

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);

    const idempotencyKey = request.headers.get("Idempotency-Key") || request.headers.get("idempotency-key");
    if (!idempotencyKey || !idempotencyKey.trim()) {
      return errorResponse(
        400,
        "La cabecera Idempotency-Key es obligatoria para la carga de evidencia.",
        path,
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud debe ser multipart/form-data válido.", path);
    }

    const file = formData.get("file");
    const rawOwnerType = formData.get("ownerType");
    const ownerId = formData.get("ownerId");

    if (!file || typeof file === "string" || typeof (file as { size?: unknown }).size !== "number") {
      return errorResponse(400, "Debe incluir un archivo válido en el campo 'file'.", path);
    }

    if (!rawOwnerType || typeof rawOwnerType !== "string") {
      return errorResponse(400, "El campo 'ownerType' es obligatorio.", path);
    }

    const parsedOwnerType = evidenceOwnerTypeSchema.safeParse(rawOwnerType);
    if (!parsedOwnerType.success) {
      return errorResponse(400, "Tipo de propietario de evidencia inválido.", path);
    }
    const ownerType = parsedOwnerType.data;

    if (!ownerId || typeof ownerId !== "string" || !ownerId.trim()) {
      return errorResponse(400, "El campo 'ownerId' es obligatorio.", path);
    }

    const rawFileSize = formData.get("fileSize");
    const declaredSize = rawFileSize ? Number(rawFileSize) : NaN;
    const fileSize = !isNaN(declaredSize) ? declaredSize : file.size;

    // File validation: Size & MIME
    if (fileSize > MAX_FILE_SIZE) {
      return errorResponse(400, "El archivo supera el tamaño máximo permitido de 10 MB.", path);
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return errorResponse(
        400,
        "Tipo de archivo no permitido. Solo se aceptan JPEG, PNG, WebP o PDF.",
        path,
      );
    }

    // Idempotency check: if already processed for this owner, return existing attachment
    const cacheKey = `${ownerType}:${ownerId}:${idempotencyKey}`;
    if (evidenceCache.has(cacheKey)) {
      return NextResponse.json(evidenceCache.get(cacheKey)!, { status: 200 });
    }

    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const backendResponse = await fetchBackend(
        request,
        "/evidence",
        undefined,
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: formData,
        },
      );
      const bodyText = await backendResponse.text();
      return new NextResponse(bodyText, {
        status: backendResponse.status,
        headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
      });
    }

    // Validate owner exists
    if (ownerType === "ZONE_RESULT") {
      const zoneResult = zoneResultFixtures.find((zr) => zr.id === ownerId);
      if (!zoneResult) {
        return errorResponse(404, `El resultado de zona ${ownerId} no existe.`, path);
      }
    }

    const rawNameFromForm = formData.get("fileName");
    const fileObjName = (file as { name?: string }).name;
    const fileName =
      (typeof rawNameFromForm === "string" && rawNameFromForm.trim() ? rawNameFromForm : null) ||
      (fileObjName && fileObjName !== "blob" ? fileObjName : null) ||
      "archivo";
    const sanitizedFilename = sanitizeFilename(fileName, mimeType);

    const attachment: Attachment = {
      id: `att-${Math.floor(1000 + Math.random() * 9000)}`,
      url: `/mock/evidence/${sanitizedFilename}`,
      filename: sanitizedFilename,
      contentType: mimeType,
      uploadedAt: new Date().toISOString(),
    };

    if (ownerType === "ZONE_RESULT") {
      addAttachmentToZoneResult(ownerId, attachment);
    }

    evidenceCache.set(cacheKey, attachment);

    return NextResponse.json(attachment, { status: 201 });
  } catch (caught: unknown) {
    if (caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa o es inválida.", path);
    }
    return errorResponse(500, "Error interno del servidor.", path);
  }
}
