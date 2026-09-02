import { z } from "zod";

export const ZONE_STATUSES = ["SERVICED", "PARTIAL", "NOT_SERVICED"] as const;
export const REASONS = [
  "Acceso bloqueado",
  "Residuo no admisible",
  "Falla del vehículo",
  "Riesgo para la cuadrilla",
  "Otro",
] as const;

export const ZoneResultSchema = z
  .object({
    zoneId: z.string(),
    zoneName: z.string(),
    status: z.enum(ZONE_STATUSES),
    reason: z.string(),
    note: z.string(),
    evidenceIds: z.array(z.string()),
    photoUnavailable: z.boolean(),
    photoUnavailableReason: z.string(),
  })
  .superRefine((zone, context) => {
    if (zone.status === "SERVICED") return;
    if (!zone.reason) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Elegí el motivo de la excepción." });
    }
    if (zone.note.trim().length < 10) {
      context.addIssue({ code: "custom", path: ["note"], message: "Describí lo ocurrido en al menos 10 caracteres." });
    }
    if (zone.evidenceIds.length === 0 && !zone.photoUnavailable) {
      context.addIssue({ code: "custom", path: ["evidenceIds"], message: "Adjuntá una foto o indicá por qué no fue posible." });
    }
    if (zone.photoUnavailable && zone.photoUnavailableReason.trim().length < 10) {
      context.addIssue({
        code: "custom",
        path: ["photoUnavailableReason"],
        message: "Explicá por qué no fue posible tomar una foto.",
      });
    }
  });

export const CompletionSchema = z.object({
  serviceId: z.string(),
  baseUpdatedAt: z.string(),
  recordedAt: z.string(),
  overallNote: z.string().max(500, "La observación general admite hasta 500 caracteres."),
  zoneResults: z.array(ZoneResultSchema).min(1),
});

export type CompletionValues = z.infer<typeof CompletionSchema>;
export type ZoneStatus = (typeof ZONE_STATUSES)[number];

export const INITIAL_VALUES: CompletionValues = {
  serviceId: "SER-2026-0184",
  baseUpdatedAt: "2026-09-02T18:14:00Z",
  recordedAt: "",
  overallNote: "",
  zoneResults: [
    {
      zoneId: "ZN-04-A",
      zoneName: "Barrio Norte",
      status: "SERVICED",
      reason: "",
      note: "",
      evidenceIds: [],
      photoUnavailable: false,
      photoUnavailableReason: "",
    },
    {
      zoneId: "ZN-04-B",
      zoneName: "Parque Industrial",
      status: "PARTIAL",
      reason: "Acceso bloqueado",
      note: "Dos cuadras quedaron bloqueadas por una obra vial.",
      evidenceIds: [],
      photoUnavailable: false,
      photoUnavailableReason: "",
    },
    {
      zoneId: "ZN-04-C",
      zoneName: "Ribera Este",
      status: "SERVICED",
      reason: "",
      note: "",
      evidenceIds: [],
      photoUnavailable: false,
      photoUnavailableReason: "",
    },
    {
      zoneId: "ZN-04-D",
      zoneName: "Centro Cívico",
      status: "SERVICED",
      reason: "",
      note: "",
      evidenceIds: [],
      photoUnavailable: false,
      photoUnavailableReason: "",
    },
  ],
};

export type UploadState = "queued" | "uploading" | "uploaded" | "failed";

export type EvidenceUpload = {
  id: string;
  zoneId: string;
  fileName: string;
  size: number;
  state: UploadState;
  idempotencyKey: string;
};
