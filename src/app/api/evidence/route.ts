import { backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend } from "@/lib/bff-backend";
import {
  addAttachmentToService,
  addAttachmentToZoneResult,
  evidenceCache,
  sanitizeFilename,
  serviceFixtures,
  zoneResultFixtures,
} from "@/lib/services-fixtures";
import {
  addAttachmentToContainer,
  getContainerAttachments,
  getContainerFixture,
} from "@/lib/containers-fixtures";
import {
  addAttachmentToInspection,
  getEnvironmentalInspectionFixture,
  getInspectionAttachments,
} from "@/lib/environmental-report-fixtures";
import {
  evidenceOwnerTypeSchema,
  type Attachment,
  type EvidenceOwnerType,
} from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";



const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
// Allow room for multipart boundaries and the owner metadata.
const MULTIPART_MARGIN_BYTES = 64 * 1024;



const scopeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const serviceScopeSchema = z.object({ id: scopeIdSchema, crewId: scopeIdSchema.nullable() });
const zoneScopeSchema = z.array(z.object({ id: scopeIdSchema }));

async function readEvidenceScope<T>(request: Request, resource: string, schema: z.ZodType<T>, path: string): Promise<
  { data: T; response?: never } | { data?: never; response: NextResponse }
> {
  const response = await fetchBackend(request, resource);
  if (!response.ok) return { response: forwardResponse(response) };
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    return { response: errorResponse(502, "La respuesta del propietario de evidencia es inválida.", path) };
  }
  return { data: parsed.data };
}

// TODO #431: migrate this preflight to requireCrewScope when the shared helper lands.
async function checkBackendEvidenceCrew(
  request: Request, ownerType: EvidenceOwnerType, ownerId: string,
  serviceId: string | null, crewId: string | undefined, path: string,
): Promise<NextResponse | null> {
  const denied = () => errorResponse(403, "Solo la cuadrilla asignada puede subir evidencia de este registro.", path);
  if (!crewId) return denied();

  if (ownerType === "SERVICE" || ownerType === "INSPECTION") {
    let owningServiceId = ownerId;
    if (ownerType === "INSPECTION") {
      const inspection = await readEvidenceScope(request, `/environmental-inspections/${encodeURIComponent(ownerId)}`,
        z.object({ id: scopeIdSchema, serviceId: scopeIdSchema.nullable() }), path);
      if (inspection.response) return inspection.response;
      if (inspection.data.id !== ownerId || !inspection.data.serviceId) return denied();
      owningServiceId = inspection.data.serviceId;
    }
    const service = await readEvidenceScope(request, `/services/${encodeURIComponent(owningServiceId)}`, serviceScopeSchema, path);
    if (service.response) return service.response;
    return service.data.id === owningServiceId && service.data.crewId === crewId ? null : denied();
  }

  if (ownerType === "ZONE_RESULT") {
    if (serviceId) {
      const service = await readEvidenceScope(request, `/services/${encodeURIComponent(serviceId)}`, serviceScopeSchema, path);
      if (service.response) return service.response;
      if (service.data.id !== serviceId || service.data.crewId !== crewId) return denied();
      const zones = await readEvidenceScope(request, `/services/${encodeURIComponent(serviceId)}/zone-results`, zoneScopeSchema, path);
      if (zones.response) return zones.response;
      return zones.data.some((zone) => zone.id === ownerId) ? null : denied();
    }

    // The API has no ZoneResult-to-Service lookup. Bound the legacy-client fallback.
    const pageSchema = z.object({
      data: z.array(serviceScopeSchema).max(100),
      meta: z.object({ totalPages: z.number().int().nonnegative() }),
    });
    for (let page = 1; page <= 10; page++) {
      type ServicesPage = z.infer<typeof pageSchema>;
      const services: { data: ServicesPage; response?: never } | { data?: never; response: NextResponse } =
        await readEvidenceScope<ServicesPage>(request,
          `/services?crewId=${encodeURIComponent(crewId)}&pageSize=100&page=${page}`, pageSchema, path);
      if (services.response) return services.response;
      for (const listedService of services.data.data) {
        if (listedService.crewId !== crewId) continue;
        const zones = await readEvidenceScope(request, `/services/${encodeURIComponent(listedService.id)}/zone-results`, zoneScopeSchema, path);
        if (zones.response) return zones.response;
        if (zones.data.some((zone) => zone.id === ownerId)) return null;
      }
      if (page >= services.data.meta.totalPages) break;
    }
    return denied();
  }

  return null;
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;

  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);

    const idempotencyKey = request.headers.get("Idempotency-Key") || request.headers.get("idempotency-key");
    if (!idempotencyKey || !idempotencyKey.trim()) {
      return errorResponse(
        400,
        "La cabecera Idempotency-Key es obligatoria para la carga de evidencia.",
        path,
      );
    }

    if (!/^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey)) {
      return errorResponse(400, "La cabecera Idempotency-Key debe contener entre 1 y 128 letras, números, guiones o guiones bajos.", path);
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + MULTIPART_MARGIN_BYTES) {
      return errorResponse(413, "El archivo supera el tamaño máximo permitido de 10 MB.", path);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse(400, "El cuerpo de la solicitud debe ser multipart/form-data válido.", path);
    }

    const files = formData.getAll("file");
    if (files.length > 1) {
      return errorResponse(400, "Solo se permite un archivo por solicitud de evidencia.", path);
    }

    const file = files[0] ?? null;
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

    // Permission check by ownerType
    if (ownerType === "CONTAINER") {
      if (!scenario.capabilities.includes("container:report")) {
        return errorResponse(
          403,
          "No tiene permisos para subir evidencia de contenedores.",
          path,
        );
      }
    } else if (ownerType === "INSPECTION") {
      if (!scenario.capabilities.includes("environmentalInspection:execute")) {
        return errorResponse(
          403,
          "No tiene permisos para subir evidencia de inspección.",
          path,
        );
      }
    } else {
      // SERVICE or ZONE_RESULT
      if (!scenario.capabilities.includes("service:execute")) {
        return errorResponse(
          403,
          "No tiene permisos para subir evidencia. Solo la persona responsable de la cuadrilla puede hacerlo.",
          path,
        );
      }
    }

    if (!ownerId || typeof ownerId !== "string" || !ownerId.trim()) {
      return errorResponse(400, "El campo 'ownerId' es obligatorio.", path);
    }

    if (!/^[A-Za-z0-9_-]{1,100}$/.test(ownerId)) {
      return errorResponse(400, "El campo 'ownerId' debe ser un identificador válido de hasta 100 caracteres.", path);
    }

    // File validation: Size & MIME
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(413, "El archivo supera el tamaño máximo permitido de 10 MB.", path);
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return errorResponse(
        400,
        "Tipo de archivo no permitido. Solo se aceptan JPEG, PNG, WebP o PDF.",
        path,
      );
    }

    if (backendMode(session)) {
      if (scenario.actor.kind === "FIELD" && ownerType !== "CONTAINER") {
        const rawServiceId = ownerType === "ZONE_RESULT" ? formData.get("serviceId") : null;
        if (rawServiceId !== null && (typeof rawServiceId !== "string" || !scopeIdSchema.safeParse(rawServiceId).success)) {
          return errorResponse(400, "El campo 'serviceId' debe ser un identificador válido de hasta 100 caracteres.", path);
        }
        const denied = await checkBackendEvidenceCrew(request, ownerType, ownerId, rawServiceId as string | null, session.crew?.id, path);
        if (denied) return denied;
      }
      // UploadEvidenceDto (forbidNonWhitelisted) sólo acepta file, ownerType y ownerId:
      // fileName es metadato local y daría 400.
      const backendForm = new FormData();
      backendForm.append("file", file);
      backendForm.append("ownerType", ownerType);
      backendForm.append("ownerId", ownerId);
      const backendResponse = await fetchBackend(
        request,
        "/evidence",
        undefined,
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: backendForm,
        },
        { timeoutMs: 60_000 },
      );
            return forwardResponse(backendResponse);
    }

    // Validate owner exists and resolve the Service it belongs to, for the crew-ownership check below
    let owningService = null;
    if (ownerType === "ZONE_RESULT") {
      const zoneResult = zoneResultFixtures.find((zr) => zr.id === ownerId);
      if (!zoneResult) {
        return errorResponse(404, `El resultado de zona ${ownerId} no existe.`, path);
      }
      owningService = serviceFixtures.find((s) => s.id === zoneResult.serviceId) ?? null;
    }
    if (ownerType === "SERVICE") {
      owningService = serviceFixtures.find((s) => s.id === ownerId) ?? null;
      if (!owningService) {
        return errorResponse(404, `El servicio ${ownerId} no existe.`, path);
      }
    }

    if (ownerType === "CONTAINER") {
      const container = getContainerFixture(ownerId);
      if (!container) {
        return errorResponse(404, `El contenedor ${ownerId} no existe.`, path);
      }
    }

    if (ownerType === "INSPECTION") {
      const inspection = getEnvironmentalInspectionFixture(ownerId);
      const owningInspectionService = inspection?.serviceId
        ? serviceFixtures.find((candidate) => candidate.id === inspection.serviceId) ?? null
        : null;
      if (!inspection) return errorResponse(404, `La inspección ${ownerId} no existe.`, path);
      if (scenario.actor.kind === "FIELD" && (!owningInspectionService || owningInspectionService.crewId !== scenario.actor.crewId)) {
        return errorResponse(403, "Solo la cuadrilla asignada puede subir evidencia de esta inspección.", path);
      }
    }

    if (
      (ownerType === "SERVICE" || ownerType === "ZONE_RESULT") &&
      scenario.actor.kind === "FIELD" &&
      (!owningService || !scenario.actor.crewId || owningService.crewId !== scenario.actor.crewId)
    ) {
      return errorResponse(403, "Solo la cuadrilla asignada al servicio puede subir evidencia.", path);
    }

    // Authorization always precedes a mock replay. Backend idempotency stays upstream.
    const cacheKey = `${session.scenarioId}:${scenario.actor.crewId ?? scenario.actor.kind}:${ownerType}:${ownerId}:${idempotencyKey}`;
    const cachedAttachment = evidenceCache.get(cacheKey);
    if (cachedAttachment) {
      return NextResponse.json(cachedAttachment, { status: 200 });
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
    if (ownerType === "SERVICE") {
      addAttachmentToService(ownerId, attachment);
    }
    if (ownerType === "CONTAINER") {
      addAttachmentToContainer(ownerId, attachment);
    }
    if (ownerType === "INSPECTION") {
      addAttachmentToInspection(ownerId, attachment);
    }

    evidenceCache.set(cacheKey, attachment);

    return NextResponse.json(attachment, { status: 201 });
  } catch (caught: unknown) {
    if (caught instanceof AuthUnavailableError) {
      return errorResponse(503, caught.message, path);
    }
    if (caught instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa o es inválida.", path);
    }
    return mapSessionError(caught, path, "Error interno del servidor.");
  }
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const ownerType = url.searchParams.get("ownerType");
  const ownerId = url.searchParams.get("ownerId");

  try {
    getRequiredSession(request);

    if (!ownerType || !ownerId) {
      return errorResponse(400, "Los parámetros ownerType y ownerId son obligatorios.", path);
    }

    const parsedOwnerType = evidenceOwnerTypeSchema.safeParse(ownerType);
    if (!parsedOwnerType.success) {
      return errorResponse(400, "Tipo de propietario de evidencia inválido.", path);
    }

    if (parsedOwnerType.data === "CONTAINER") {
      const container = getContainerFixture(ownerId);
      if (!container) {
        return errorResponse(404, `El contenedor ${ownerId} no existe.`, path);
      }
      return NextResponse.json(getContainerAttachments(ownerId));
    }

    if (parsedOwnerType.data === "SERVICE") {
      const service = serviceFixtures.find((s) => s.id === ownerId);
      if (!service) {
        return errorResponse(404, `El servicio ${ownerId} no existe.`, path);
      }
      return NextResponse.json(service.attachments ?? []);
    }

    if (parsedOwnerType.data === "ZONE_RESULT") {
      const zr = zoneResultFixtures.find((r) => r.id === ownerId);
      if (!zr) {
        return errorResponse(404, `El resultado de zona ${ownerId} no existe.`, path);
      }
      return NextResponse.json(zr.attachments ?? []);
    }

    if (parsedOwnerType.data === "INSPECTION") {
      const inspection = getEnvironmentalInspectionFixture(ownerId);
      if (!inspection) return errorResponse(404, `La inspección ${ownerId} no existe.`, path);
      return NextResponse.json(getInspectionAttachments(ownerId) ?? []);
    }

    return NextResponse.json([]);
  } catch (caught: unknown) {
    if (caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError) {
      recordTelemetryEvent({ name: "auth_session_expired", status: 401 });
      return errorResponse(401, "La sesión no está activa o es inválida.", path);
    }
    return mapSessionError(caught, path, "Error interno del servidor.");
  }
}

