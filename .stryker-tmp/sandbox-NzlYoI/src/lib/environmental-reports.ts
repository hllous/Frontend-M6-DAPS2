// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { z } from "zod";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { attachmentSchema } from "./services";
import { recordTelemetryEvent } from "./telemetry";
import { MAX_NOTES_LENGTH, latitudeInput, longitudeInput, reasonInput } from "@/lib/input-limits";
import { droppedRecords, tolerantRecords } from "./tolerant-records";
export const environmentalReportTypeSchema = z.enum(stryMutAct_9fa48("8407") ? [] : (stryCov_9fa48("8407"), [stryMutAct_9fa48("8408") ? "" : (stryCov_9fa48("8408"), "NOISE"), stryMutAct_9fa48("8409") ? "" : (stryCov_9fa48("8409"), "DUMPING"), stryMutAct_9fa48("8410") ? "" : (stryCov_9fa48("8410"), "ILLEGAL_DUMPSITE"), stryMutAct_9fa48("8411") ? "" : (stryCov_9fa48("8411"), "WATER_DISCHARGE"), stryMutAct_9fa48("8412") ? "" : (stryCov_9fa48("8412"), "AIR_EMISSION"), stryMutAct_9fa48("8413") ? "" : (stryCov_9fa48("8413"), "ODOR"), stryMutAct_9fa48("8414") ? "" : (stryCov_9fa48("8414"), "PEST_INFESTATION"), stryMutAct_9fa48("8415") ? "" : (stryCov_9fa48("8415"), "OTHER")]));
export type EnvironmentalReportType = z.infer<typeof environmentalReportTypeSchema>;
export const environmentalReportStatusSchema = z.enum(stryMutAct_9fa48("8416") ? [] : (stryCov_9fa48("8416"), [stryMutAct_9fa48("8417") ? "" : (stryCov_9fa48("8417"), "RECEIVED"), stryMutAct_9fa48("8418") ? "" : (stryCov_9fa48("8418"), "UNDER_REVIEW"), stryMutAct_9fa48("8419") ? "" : (stryCov_9fa48("8419"), "FORWARDED"), stryMutAct_9fa48("8420") ? "" : (stryCov_9fa48("8420"), "DISMISSED"), stryMutAct_9fa48("8421") ? "" : (stryCov_9fa48("8421"), "INSPECTION_SCHEDULED"), stryMutAct_9fa48("8422") ? "" : (stryCov_9fa48("8422"), "INSPECTED"), stryMutAct_9fa48("8423") ? "" : (stryCov_9fa48("8423"), "NO_VIOLATION"), stryMutAct_9fa48("8424") ? "" : (stryCov_9fa48("8424"), "VIOLATION_FOUND"), stryMutAct_9fa48("8425") ? "" : (stryCov_9fa48("8425"), "NOTICE_ISSUED"), stryMutAct_9fa48("8426") ? "" : (stryCov_9fa48("8426"), "SANCTIONED"), stryMutAct_9fa48("8427") ? "" : (stryCov_9fa48("8427"), "CLOSED")]));
export type EnvironmentalReportStatus = z.infer<typeof environmentalReportStatusSchema>;
export const environmentalReportPrioritySchema = z.enum(stryMutAct_9fa48("8428") ? [] : (stryCov_9fa48("8428"), [stryMutAct_9fa48("8429") ? "" : (stryCov_9fa48("8429"), "LOW"), stryMutAct_9fa48("8430") ? "" : (stryCov_9fa48("8430"), "MEDIUM"), stryMutAct_9fa48("8431") ? "" : (stryCov_9fa48("8431"), "HIGH"), stryMutAct_9fa48("8432") ? "" : (stryCov_9fa48("8432"), "CRITICAL")]));
export type EnvironmentalReportPriority = z.infer<typeof environmentalReportPrioritySchema>;
export const sanctionDecisionSchema = z.enum(stryMutAct_9fa48("8433") ? [] : (stryCov_9fa48("8433"), [stryMutAct_9fa48("8434") ? "" : (stryCov_9fa48("8434"), "FINE_ISSUED"), stryMutAct_9fa48("8435") ? "" : (stryCov_9fa48("8435"), "CLOSURE_ORDERED"), stryMutAct_9fa48("8436") ? "" : (stryCov_9fa48("8436"), "FORMAL_NOTICE_ISSUED"), stryMutAct_9fa48("8437") ? "" : (stryCov_9fa48("8437"), "DISMISSED")]));
export type SanctionDecision = z.infer<typeof sanctionDecisionSchema>;
export const sanctionOutcomeSchema = z.object(stryMutAct_9fa48("8438") ? {} : (stryCov_9fa48("8438"), {
  violationNoticeId: stryMutAct_9fa48("8440") ? z.string().min(1) : stryMutAct_9fa48("8439") ? z.string().trim().max(1) : (stryCov_9fa48("8439", "8440"), z.string().trim().min(1)),
  decision: sanctionDecisionSchema,
  decidedAt: z.string(),
  externalRef: stryMutAct_9fa48("8442") ? z.string().min(1) : stryMutAct_9fa48("8441") ? z.string().trim().max(1) : (stryCov_9fa48("8441", "8442"), z.string().trim().min(1)),
  dismissalReason: z.string().nullable().optional()
}));
export type SanctionOutcome = z.infer<typeof sanctionOutcomeSchema>;
export const sanctionOutcomeIntegrationExceptionSchema = z.object(stryMutAct_9fa48("8443") ? {} : (stryCov_9fa48("8443"), {
  type: z.literal(stryMutAct_9fa48("8444") ? "" : (stryCov_9fa48("8444"), "UNCORRELATED_SANCTION_OUTCOME")),
  violationNoticeId: z.string(),
  externalRef: z.string(),
  receivedAt: z.string(),
  message: z.string()
}));
export type SanctionOutcomeIntegrationException = z.infer<typeof sanctionOutcomeIntegrationExceptionSchema>;
export const createEnvironmentalReportInputSchema = z.object(stryMutAct_9fa48("8445") ? {} : (stryCov_9fa48("8445"), {
  reportType: environmentalReportTypeSchema,
  address: stryMutAct_9fa48("8447") ? z.string().min(1, "Debe indicar la ubicación del hallazgo.") : stryMutAct_9fa48("8446") ? z.string().trim().max(1, "Debe indicar la ubicación del hallazgo.") : (stryCov_9fa48("8446", "8447"), z.string().trim().min(1, stryMutAct_9fa48("8448") ? "" : (stryCov_9fa48("8448"), "Debe indicar la ubicación del hallazgo."))),
  lat: latitudeInput(),
  lng: longitudeInput(),
  description: stryMutAct_9fa48("8451") ? z.string().min(1, "Debe describir el hallazgo.").max(MAX_NOTES_LENGTH, `La descripción no puede superar los ${MAX_NOTES_LENGTH} caracteres.`) : stryMutAct_9fa48("8450") ? z.string().trim().max(1, "Debe describir el hallazgo.").max(MAX_NOTES_LENGTH, `La descripción no puede superar los ${MAX_NOTES_LENGTH} caracteres.`) : stryMutAct_9fa48("8449") ? z.string().trim().min(1, "Debe describir el hallazgo.").min(MAX_NOTES_LENGTH, `La descripción no puede superar los ${MAX_NOTES_LENGTH} caracteres.`) : (stryCov_9fa48("8449", "8450", "8451"), z.string().trim().min(1, stryMutAct_9fa48("8452") ? "" : (stryCov_9fa48("8452"), "Debe describir el hallazgo.")).max(MAX_NOTES_LENGTH, stryMutAct_9fa48("8453") ? `` : (stryCov_9fa48("8453"), `La descripción no puede superar los ${MAX_NOTES_LENGTH} caracteres.`)))
}));
export type CreateEnvironmentalReportInput = z.infer<typeof createEnvironmentalReportInputSchema>;

// Backend ReportStatusChangeDto: forward and dismiss require a reason (max 500).
export const reportDecisionInputSchema = z.object(stryMutAct_9fa48("8454") ? {} : (stryCov_9fa48("8454"), {
  reason: reasonInput(stryMutAct_9fa48("8455") ? "" : (stryCov_9fa48("8455"), "Debe indicar el motivo."))
}));
export type ReportDecisionInput = z.infer<typeof reportDecisionInputSchema>;

// Backend RequestInformationDto: message (required, max 500) is what the citizen sees in M2;
// requiredBy is a SUGGESTED deadline (YYYY-MM-DD; M2 sets the effective one); internalNote is
// team-only (max 500); a blank one is dropped instead of sent as "".
export const requestInformationInputSchema = z.object(stryMutAct_9fa48("8456") ? {} : (stryCov_9fa48("8456"), {
  message: reasonInput(stryMutAct_9fa48("8457") ? "" : (stryCov_9fa48("8457"), "Debe indicar qué información se le pide al vecino.")),
  requiredBy: z.string().regex(stryMutAct_9fa48("8465") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("8464") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("8463") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("8462") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("8461") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("8460") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("8459") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("8458") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("8458", "8459", "8460", "8461", "8462", "8463", "8464", "8465"), /^\d{4}-\d{2}-\d{2}$/), stryMutAct_9fa48("8466") ? "" : (stryCov_9fa48("8466"), "La fecha sugerida es inválida.")).optional(),
  internalNote: stryMutAct_9fa48("8468") ? z.string().max(500, "La nota interna no puede superar los 500 caracteres.").optional().transform(value => value || undefined) : stryMutAct_9fa48("8467") ? z.string().trim().min(500, "La nota interna no puede superar los 500 caracteres.").optional().transform(value => value || undefined) : (stryCov_9fa48("8467", "8468"), z.string().trim().max(500, stryMutAct_9fa48("8469") ? "" : (stryCov_9fa48("8469"), "La nota interna no puede superar los 500 caracteres.")).optional().transform(stryMutAct_9fa48("8470") ? () => undefined : (stryCov_9fa48("8470"), value => stryMutAct_9fa48("8473") ? value && undefined : stryMutAct_9fa48("8472") ? false : stryMutAct_9fa48("8471") ? true : (stryCov_9fa48("8471", "8472", "8473"), value || undefined))))
}));
export type RequestInformationInput = z.input<typeof requestInformationInputSchema>;
const reportLocationSchema = z.object(stryMutAct_9fa48("8474") ? {} : (stryCov_9fa48("8474"), {
  address: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional()
})).passthrough();
export const environmentalReportSchema = z.object(stryMutAct_9fa48("8475") ? {} : (stryCov_9fa48("8475"), {
  id: z.string(),
  reportType: environmentalReportTypeSchema,
  address: z.string().nullable().optional(),
  // M2 contract v1.6 dropped lat/lng from its location payload, so the backend
  // always sends these as explicit `null` (not omitted) for ticket-originated
  // reports (ticketId present) — see issue #191. `.nullable()` is required
  // because Zod's `.optional()` alone rejects an explicit `null`.
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  location: reportLocationSchema.optional(),
  // El backend siempre manda la clave y vale null en los expedientes que abre M2 y en
  // los creados sin descripción (#289): un solo null tumbaba el listado entero.
  description: z.string().nullable().optional(),
  details: z.string().optional(),
  publicId: z.string().nullable().optional(),
  // EXP-AAAA-NNNNNN (Backend #509): número de expediente de M6, lo tienen todos. Solo para mostrar.
  caseNumber: z.string().optional(),
  ticketId: z.string().nullable().optional(),
  reporterSnapshot: z.unknown().optional(),
  status: environmentalReportStatusSchema,
  priority: environmentalReportPrioritySchema.nullable(),
  deadlineAt: z.string().nullable().optional(),
  escalated: z.boolean().optional(),
  citizenResponse: z.string().nullable().optional(),
  informationRequestPending: z.boolean().optional(),
  informationRequestedAt: z.string().nullable().optional(),
  informationRequestMessage: z.string().nullable().optional(),
  informationRequestRequiredBy: z.string().nullable().optional(),
  sanctionOutcome: sanctionOutcomeSchema.nullable().optional(),
  assignedCrewId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})).passthrough();
export type EnvironmentalReport = z.infer<typeof environmentalReportSchema>;
export function mergeEnvironmentalReportRead(current: EnvironmentalReport, incoming: EnvironmentalReport): EnvironmentalReport {
  if (stryMutAct_9fa48("8476")) {
    {}
  } else {
    stryCov_9fa48("8476");
    const currentUpdatedAt = Date.parse(current.updatedAt);
    const incomingUpdatedAt = Date.parse(incoming.updatedAt);
    if (stryMutAct_9fa48("8479") ? !Number.isNaN(currentUpdatedAt) && !Number.isNaN(incomingUpdatedAt) || incomingUpdatedAt < currentUpdatedAt : stryMutAct_9fa48("8478") ? false : stryMutAct_9fa48("8477") ? true : (stryCov_9fa48("8477", "8478", "8479"), (stryMutAct_9fa48("8481") ? !Number.isNaN(currentUpdatedAt) || !Number.isNaN(incomingUpdatedAt) : stryMutAct_9fa48("8480") ? true : (stryCov_9fa48("8480", "8481"), (stryMutAct_9fa48("8482") ? Number.isNaN(currentUpdatedAt) : (stryCov_9fa48("8482"), !Number.isNaN(currentUpdatedAt))) && (stryMutAct_9fa48("8483") ? Number.isNaN(incomingUpdatedAt) : (stryCov_9fa48("8483"), !Number.isNaN(incomingUpdatedAt))))) && (stryMutAct_9fa48("8486") ? incomingUpdatedAt >= currentUpdatedAt : stryMutAct_9fa48("8485") ? incomingUpdatedAt <= currentUpdatedAt : stryMutAct_9fa48("8484") ? true : (stryCov_9fa48("8484", "8485", "8486"), incomingUpdatedAt < currentUpdatedAt)))) {
      if (stryMutAct_9fa48("8487")) {
        {}
      } else {
        stryCov_9fa48("8487");
        return current;
      }
    }
    if (stryMutAct_9fa48("8490") ? current.sanctionOutcome || !incoming.sanctionOutcome : stryMutAct_9fa48("8489") ? false : stryMutAct_9fa48("8488") ? true : (stryCov_9fa48("8488", "8489", "8490"), current.sanctionOutcome && (stryMutAct_9fa48("8491") ? incoming.sanctionOutcome : (stryCov_9fa48("8491"), !incoming.sanctionOutcome)))) {
      if (stryMutAct_9fa48("8492")) {
        {}
      } else {
        stryCov_9fa48("8492");
        return stryMutAct_9fa48("8493") ? {} : (stryCov_9fa48("8493"), {
          ...incoming,
          sanctionOutcome: current.sanctionOutcome
        });
      }
    }
    return incoming;
  }
}
export const environmentalInspectionOutcomeSchema = z.enum(stryMutAct_9fa48("8494") ? [] : (stryCov_9fa48("8494"), [stryMutAct_9fa48("8495") ? "" : (stryCov_9fa48("8495"), "NO_VIOLATION"), stryMutAct_9fa48("8496") ? "" : (stryCov_9fa48("8496"), "VIOLATION_FOUND"), stryMutAct_9fa48("8497") ? "" : (stryCov_9fa48("8497"), "INCONCLUSIVE")]));
export type EnvironmentalInspectionOutcome = z.infer<typeof environmentalInspectionOutcomeSchema>;
export const ENVIRONMENTAL_INSPECTION_OUTCOME_LABELS: Record<EnvironmentalInspectionOutcome, string> = stryMutAct_9fa48("8498") ? {} : (stryCov_9fa48("8498"), {
  NO_VIOLATION: stryMutAct_9fa48("8499") ? "" : (stryCov_9fa48("8499"), "Sin infracción"),
  VIOLATION_FOUND: stryMutAct_9fa48("8500") ? "" : (stryCov_9fa48("8500"), "Infracción constatada"),
  INCONCLUSIVE: stryMutAct_9fa48("8501") ? "" : (stryCov_9fa48("8501"), "Inconclusa")
});
export const environmentalInspectionNextStepSchema = z.enum(stryMutAct_9fa48("8502") ? [] : (stryCov_9fa48("8502"), [stryMutAct_9fa48("8503") ? "" : (stryCov_9fa48("8503"), "NOTICE_TO_BE_ISSUED"), stryMutAct_9fa48("8504") ? "" : (stryCov_9fa48("8504"), "REINSPECTION"), stryMutAct_9fa48("8505") ? "" : (stryCov_9fa48("8505"), "CASE_CLOSED")]));
export type EnvironmentalInspectionNextStep = z.infer<typeof environmentalInspectionNextStepSchema>;
export const environmentalInspectionViolationTypeSchema = z.enum(stryMutAct_9fa48("8506") ? [] : (stryCov_9fa48("8506"), [stryMutAct_9fa48("8507") ? "" : (stryCov_9fa48("8507"), "NOISE_LIMIT"), stryMutAct_9fa48("8508") ? "" : (stryCov_9fa48("8508"), "ILLEGAL_DUMPING"), stryMutAct_9fa48("8509") ? "" : (stryCov_9fa48("8509"), "UNTREATED_DISCHARGE"), stryMutAct_9fa48("8510") ? "" : (stryCov_9fa48("8510"), "HAZARDOUS_WASTE"), stryMutAct_9fa48("8511") ? "" : (stryCov_9fa48("8511"), "AIR_EMISSION"), stryMutAct_9fa48("8512") ? "" : (stryCov_9fa48("8512"), "NO_WASTE_MANAGEMENT"), stryMutAct_9fa48("8513") ? "" : (stryCov_9fa48("8513"), "INSPECTION_OBSTRUCTION")]));
export type EnvironmentalInspectionViolationType = z.infer<typeof environmentalInspectionViolationTypeSchema>;
export const environmentalInspectionSeveritySchema = z.enum(stryMutAct_9fa48("8514") ? [] : (stryCov_9fa48("8514"), [stryMutAct_9fa48("8515") ? "" : (stryCov_9fa48("8515"), "LOW"), stryMutAct_9fa48("8516") ? "" : (stryCov_9fa48("8516"), "MEDIUM"), stryMutAct_9fa48("8517") ? "" : (stryCov_9fa48("8517"), "HIGH"), stryMutAct_9fa48("8518") ? "" : (stryCov_9fa48("8518"), "CRITICAL")]));
export type EnvironmentalInspectionSeverity = z.infer<typeof environmentalInspectionSeveritySchema>;
export const environmentalInspectionSuggestedActionSchema = z.enum(stryMutAct_9fa48("8519") ? [] : (stryCov_9fa48("8519"), [stryMutAct_9fa48("8520") ? "" : (stryCov_9fa48("8520"), "WARNING"), stryMutAct_9fa48("8521") ? "" : (stryCov_9fa48("8521"), "FORMAL_NOTICE"), stryMutAct_9fa48("8522") ? "" : (stryCov_9fa48("8522"), "FINE"), stryMutAct_9fa48("8523") ? "" : (stryCov_9fa48("8523"), "CLOSURE")]));
export type EnvironmentalInspectionSuggestedAction = z.infer<typeof environmentalInspectionSuggestedActionSchema>;

// Una sola fuente de etiquetas: la inspección y el acta muestran los mismos valores.
export const ENVIRONMENTAL_VIOLATION_TYPE_LABELS: Record<EnvironmentalInspectionViolationType, string> = stryMutAct_9fa48("8524") ? {} : (stryCov_9fa48("8524"), {
  NOISE_LIMIT: stryMutAct_9fa48("8525") ? "" : (stryCov_9fa48("8525"), "Exceso de ruido"),
  ILLEGAL_DUMPING: stryMutAct_9fa48("8526") ? "" : (stryCov_9fa48("8526"), "Vertido ilegal"),
  UNTREATED_DISCHARGE: stryMutAct_9fa48("8527") ? "" : (stryCov_9fa48("8527"), "Descarga sin tratamiento"),
  HAZARDOUS_WASTE: stryMutAct_9fa48("8528") ? "" : (stryCov_9fa48("8528"), "Residuos peligrosos"),
  AIR_EMISSION: stryMutAct_9fa48("8529") ? "" : (stryCov_9fa48("8529"), "Emisión al aire"),
  NO_WASTE_MANAGEMENT: stryMutAct_9fa48("8530") ? "" : (stryCov_9fa48("8530"), "Falta de gestión de residuos"),
  INSPECTION_OBSTRUCTION: stryMutAct_9fa48("8531") ? "" : (stryCov_9fa48("8531"), "Obstrucción de la inspección")
});
export const ENVIRONMENTAL_SEVERITY_LABELS: Record<EnvironmentalInspectionSeverity, string> = stryMutAct_9fa48("8532") ? {} : (stryCov_9fa48("8532"), {
  LOW: stryMutAct_9fa48("8533") ? "" : (stryCov_9fa48("8533"), "Baja"),
  MEDIUM: stryMutAct_9fa48("8534") ? "" : (stryCov_9fa48("8534"), "Media"),
  HIGH: stryMutAct_9fa48("8535") ? "" : (stryCov_9fa48("8535"), "Alta"),
  CRITICAL: stryMutAct_9fa48("8536") ? "" : (stryCov_9fa48("8536"), "Crítica")
});
export const ENVIRONMENTAL_SUGGESTED_ACTION_LABELS: Record<EnvironmentalInspectionSuggestedAction, string> = stryMutAct_9fa48("8537") ? {} : (stryCov_9fa48("8537"), {
  WARNING: stryMutAct_9fa48("8538") ? "" : (stryCov_9fa48("8538"), "Advertencia"),
  FORMAL_NOTICE: stryMutAct_9fa48("8539") ? "" : (stryCov_9fa48("8539"), "Aviso formal"),
  FINE: stryMutAct_9fa48("8540") ? "" : (stryCov_9fa48("8540"), "Multa"),
  CLOSURE: stryMutAct_9fa48("8541") ? "" : (stryCov_9fa48("8541"), "Clausura")
});

// Hypothesis: the backend has not published the exact checklist DTO yet.
export const environmentalInspectionChecklistItemSchema = z.object(stryMutAct_9fa48("8542") ? {} : (stryCov_9fa48("8542"), {
  id: stryMutAct_9fa48("8543") ? z.string().max(1) : (stryCov_9fa48("8543"), z.string().min(1)),
  label: stryMutAct_9fa48("8544") ? z.string().max(1) : (stryCov_9fa48("8544"), z.string().min(1)),
  required: z.boolean().default(stryMutAct_9fa48("8545") ? false : (stryCov_9fa48("8545"), true))
})).passthrough();
export type EnvironmentalInspectionChecklistItem = z.infer<typeof environmentalInspectionChecklistItemSchema>;

// Forma real del backend (InspectionResponseDto.checklistItems): cada ítem tiene un
// `id` UUID, un `itemCode` (el código), `label`, `result` y `observations`.
export const environmentalInspectionChecklistItemResponseSchema = z.object(stryMutAct_9fa48("8546") ? {} : (stryCov_9fa48("8546"), {
  id: z.string(),
  itemCode: z.string(),
  label: z.string(),
  result: z.boolean(),
  observations: z.string().nullable().optional()
})).passthrough();
export const environmentalInspectionChecklistResultSchema = z.object(stryMutAct_9fa48("8547") ? {} : (stryCov_9fa48("8547"), {
  id: stryMutAct_9fa48("8549") ? z.string().min(1) : stryMutAct_9fa48("8548") ? z.string().trim().max(1) : (stryCov_9fa48("8548", "8549"), z.string().trim().min(1)),
  label: stryMutAct_9fa48("8551") ? z.string().min(1) : stryMutAct_9fa48("8550") ? z.string().trim().max(1) : (stryCov_9fa48("8550", "8551"), z.string().trim().min(1)),
  completed: z.boolean()
}));
export type EnvironmentalInspectionChecklistResult = z.infer<typeof environmentalInspectionChecklistResultSchema>;
export const environmentalInspectionCompleteInputSchema = z.object(stryMutAct_9fa48("8552") ? {} : (stryCov_9fa48("8552"), {
  inspectedAt: z.string().datetime(stryMutAct_9fa48("8553") ? {} : (stryCov_9fa48("8553"), {
    offset: stryMutAct_9fa48("8554") ? false : (stryCov_9fa48("8554"), true)
  })).refine(stryMutAct_9fa48("8555") ? () => undefined : (stryCov_9fa48("8555"), value => stryMutAct_9fa48("8559") ? Date.parse(value) > Date.now() + 5 * 60 * 1000 : stryMutAct_9fa48("8558") ? Date.parse(value) < Date.now() + 5 * 60 * 1000 : stryMutAct_9fa48("8557") ? false : stryMutAct_9fa48("8556") ? true : (stryCov_9fa48("8556", "8557", "8558", "8559"), Date.parse(value) <= (stryMutAct_9fa48("8560") ? Date.now() - 5 * 60 * 1000 : (stryCov_9fa48("8560"), Date.now() + (stryMutAct_9fa48("8561") ? 5 * 60 / 1000 : (stryCov_9fa48("8561"), (stryMutAct_9fa48("8562") ? 5 / 60 : (stryCov_9fa48("8562"), 5 * 60)) * 1000)))))), stryMutAct_9fa48("8563") ? "" : (stryCov_9fa48("8563"), "La fecha de inspección no puede ser futura.")),
  outcome: environmentalInspectionOutcomeSchema,
  nextStep: environmentalInspectionNextStepSchema.optional(),
  checklist: stryMutAct_9fa48("8564") ? z.array(environmentalInspectionChecklistResultSchema).max(1, "Debe completar el checklist de inspección.") : (stryCov_9fa48("8564"), z.array(environmentalInspectionChecklistResultSchema).min(1, stryMutAct_9fa48("8565") ? "" : (stryCov_9fa48("8565"), "Debe completar el checklist de inspección."))),
  conclusion: stryMutAct_9fa48("8567") ? z.string().max(MAX_NOTES_LENGTH, `La conclusión no puede superar los ${MAX_NOTES_LENGTH} caracteres.`).optional() : stryMutAct_9fa48("8566") ? z.string().trim().min(MAX_NOTES_LENGTH, `La conclusión no puede superar los ${MAX_NOTES_LENGTH} caracteres.`).optional() : (stryCov_9fa48("8566", "8567"), z.string().trim().max(MAX_NOTES_LENGTH, stryMutAct_9fa48("8568") ? `` : (stryCov_9fa48("8568"), `La conclusión no puede superar los ${MAX_NOTES_LENGTH} caracteres.`)).optional()),
  findings: stryMutAct_9fa48("8570") ? z.string().max(MAX_NOTES_LENGTH, `Los hallazgos no pueden superar los ${MAX_NOTES_LENGTH} caracteres.`).optional() : stryMutAct_9fa48("8569") ? z.string().trim().min(MAX_NOTES_LENGTH, `Los hallazgos no pueden superar los ${MAX_NOTES_LENGTH} caracteres.`).optional() : (stryCov_9fa48("8569", "8570"), z.string().trim().max(MAX_NOTES_LENGTH, stryMutAct_9fa48("8571") ? `` : (stryCov_9fa48("8571"), `Los hallazgos no pueden superar los ${MAX_NOTES_LENGTH} caracteres.`)).optional()),
  violationType: environmentalInspectionViolationTypeSchema.optional(),
  severity: environmentalInspectionSeveritySchema.optional(),
  suggestedAction: environmentalInspectionSuggestedActionSchema.optional()
})).superRefine((data, ctx) => {
  if (stryMutAct_9fa48("8572")) {
    {}
  } else {
    stryCov_9fa48("8572");
    if (stryMutAct_9fa48("8575") ? data.checklist.every(item => !item.completed) : stryMutAct_9fa48("8574") ? false : stryMutAct_9fa48("8573") ? true : (stryCov_9fa48("8573", "8574", "8575"), data.checklist.some(stryMutAct_9fa48("8576") ? () => undefined : (stryCov_9fa48("8576"), item => stryMutAct_9fa48("8577") ? item.completed : (stryCov_9fa48("8577"), !item.completed))))) {
      if (stryMutAct_9fa48("8578")) {
        {}
      } else {
        stryCov_9fa48("8578");
        ctx.addIssue(stryMutAct_9fa48("8580") ? {} : (stryCov_9fa48("8580"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8581") ? [] : (stryCov_9fa48("8581"), [stryMutAct_9fa48("8582") ? "" : (stryCov_9fa48("8582"), "checklist")]),
          message: stryMutAct_9fa48("8583") ? "" : (stryCov_9fa48("8583"), "Debe completar todos los controles del checklist.")
        }));
      }
    }
    if (stryMutAct_9fa48("8586") ? data.outcome === "NO_VIOLATION" || !data.conclusion : stryMutAct_9fa48("8585") ? false : stryMutAct_9fa48("8584") ? true : (stryCov_9fa48("8584", "8585", "8586"), (stryMutAct_9fa48("8588") ? data.outcome !== "NO_VIOLATION" : stryMutAct_9fa48("8587") ? true : (stryCov_9fa48("8587", "8588"), data.outcome === (stryMutAct_9fa48("8589") ? "" : (stryCov_9fa48("8589"), "NO_VIOLATION")))) && (stryMutAct_9fa48("8590") ? data.conclusion : (stryCov_9fa48("8590"), !data.conclusion)))) {
      if (stryMutAct_9fa48("8591")) {
        {}
      } else {
        stryCov_9fa48("8591");
        ctx.addIssue(stryMutAct_9fa48("8593") ? {} : (stryCov_9fa48("8593"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8594") ? [] : (stryCov_9fa48("8594"), [stryMutAct_9fa48("8595") ? "" : (stryCov_9fa48("8595"), "conclusion")]),
          message: stryMutAct_9fa48("8596") ? "" : (stryCov_9fa48("8596"), "La conclusión es obligatoria para un resultado sin infracción.")
        }));
      }
    }
    if (stryMutAct_9fa48("8599") ? data.outcome !== "VIOLATION_FOUND" : stryMutAct_9fa48("8598") ? false : stryMutAct_9fa48("8597") ? true : (stryCov_9fa48("8597", "8598", "8599"), data.outcome === (stryMutAct_9fa48("8600") ? "" : (stryCov_9fa48("8600"), "VIOLATION_FOUND")))) {
      if (stryMutAct_9fa48("8601")) {
        {}
      } else {
        stryCov_9fa48("8601");
        if (stryMutAct_9fa48("8604") ? data.nextStep === "NOTICE_TO_BE_ISSUED" : stryMutAct_9fa48("8603") ? false : stryMutAct_9fa48("8602") ? true : (stryCov_9fa48("8602", "8603", "8604"), data.nextStep !== (stryMutAct_9fa48("8605") ? "" : (stryCov_9fa48("8605"), "NOTICE_TO_BE_ISSUED")))) ctx.addIssue(stryMutAct_9fa48("8607") ? {} : (stryCov_9fa48("8607"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8608") ? [] : (stryCov_9fa48("8608"), [stryMutAct_9fa48("8609") ? "" : (stryCov_9fa48("8609"), "nextStep")]),
          message: stryMutAct_9fa48("8610") ? "" : (stryCov_9fa48("8610"), "Una infracción constatada debe continuar con la emisión del aviso.")
        }));
        if (stryMutAct_9fa48("8613") ? false : stryMutAct_9fa48("8612") ? true : stryMutAct_9fa48("8611") ? data.findings : (stryCov_9fa48("8611", "8612", "8613"), !data.findings)) ctx.addIssue(stryMutAct_9fa48("8615") ? {} : (stryCov_9fa48("8615"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8616") ? [] : (stryCov_9fa48("8616"), [stryMutAct_9fa48("8617") ? "" : (stryCov_9fa48("8617"), "findings")]),
          message: stryMutAct_9fa48("8618") ? "" : (stryCov_9fa48("8618"), "Los hallazgos son obligatorios cuando se constata una infracción.")
        }));
        if (stryMutAct_9fa48("8621") ? false : stryMutAct_9fa48("8620") ? true : stryMutAct_9fa48("8619") ? data.violationType : (stryCov_9fa48("8619", "8620", "8621"), !data.violationType)) ctx.addIssue(stryMutAct_9fa48("8623") ? {} : (stryCov_9fa48("8623"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8624") ? [] : (stryCov_9fa48("8624"), [stryMutAct_9fa48("8625") ? "" : (stryCov_9fa48("8625"), "violationType")]),
          message: stryMutAct_9fa48("8626") ? "" : (stryCov_9fa48("8626"), "Debe indicar el tipo de infracción constatada.")
        }));
        if (stryMutAct_9fa48("8629") ? false : stryMutAct_9fa48("8628") ? true : stryMutAct_9fa48("8627") ? data.severity : (stryCov_9fa48("8627", "8628", "8629"), !data.severity)) ctx.addIssue(stryMutAct_9fa48("8631") ? {} : (stryCov_9fa48("8631"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8632") ? [] : (stryCov_9fa48("8632"), [stryMutAct_9fa48("8633") ? "" : (stryCov_9fa48("8633"), "severity")]),
          message: stryMutAct_9fa48("8634") ? "" : (stryCov_9fa48("8634"), "Debe indicar la gravedad de la infracción constatada.")
        }));
        if (stryMutAct_9fa48("8637") ? false : stryMutAct_9fa48("8636") ? true : stryMutAct_9fa48("8635") ? data.suggestedAction : (stryCov_9fa48("8635", "8636", "8637"), !data.suggestedAction)) ctx.addIssue(stryMutAct_9fa48("8639") ? {} : (stryCov_9fa48("8639"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8640") ? [] : (stryCov_9fa48("8640"), [stryMutAct_9fa48("8641") ? "" : (stryCov_9fa48("8641"), "suggestedAction")]),
          message: stryMutAct_9fa48("8642") ? "" : (stryCov_9fa48("8642"), "Debe indicar la acción sugerida.")
        }));
      }
    }
    if (stryMutAct_9fa48("8645") ? data.outcome === "INCONCLUSIVE" || !data.conclusion : stryMutAct_9fa48("8644") ? false : stryMutAct_9fa48("8643") ? true : (stryCov_9fa48("8643", "8644", "8645"), (stryMutAct_9fa48("8647") ? data.outcome !== "INCONCLUSIVE" : stryMutAct_9fa48("8646") ? true : (stryCov_9fa48("8646", "8647"), data.outcome === (stryMutAct_9fa48("8648") ? "" : (stryCov_9fa48("8648"), "INCONCLUSIVE")))) && (stryMutAct_9fa48("8649") ? data.conclusion : (stryCov_9fa48("8649"), !data.conclusion)))) {
      if (stryMutAct_9fa48("8650")) {
        {}
      } else {
        stryCov_9fa48("8650");
        ctx.addIssue(stryMutAct_9fa48("8652") ? {} : (stryCov_9fa48("8652"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("8653") ? [] : (stryCov_9fa48("8653"), [stryMutAct_9fa48("8654") ? "" : (stryCov_9fa48("8654"), "conclusion")]),
          message: stryMutAct_9fa48("8655") ? "" : (stryCov_9fa48("8655"), "Debe explicar por qué la inspección resulta inconclusa.")
        }));
      }
    }
  }
});
export type EnvironmentalInspectionCompleteInput = z.infer<typeof environmentalInspectionCompleteInputSchema>;

// Hypothesis: schedule fields are kept explicit at this adapter seam until OpenAPI
// exposes the authoritative request and response nesting.
export const environmentalInspectionScheduleInputSchema = z.object(stryMutAct_9fa48("8656") ? {} : (stryCov_9fa48("8656"), {
  inspectorId: stryMutAct_9fa48("8657") ? z.string().regex(/^\d{1,19}$/, "El legajo debe ser numérico.").optional() : (stryCov_9fa48("8657"), z.string().trim().regex(stryMutAct_9fa48("8661") ? /^\D{1,19}$/ : stryMutAct_9fa48("8660") ? /^\d$/ : stryMutAct_9fa48("8659") ? /^\d{1,19}/ : stryMutAct_9fa48("8658") ? /\d{1,19}$/ : (stryCov_9fa48("8658", "8659", "8660", "8661"), /^\d{1,19}$/), stryMutAct_9fa48("8662") ? "" : (stryCov_9fa48("8662"), "El legajo debe ser numérico.")).optional()),
  scheduledDate: z.string().regex(stryMutAct_9fa48("8670") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("8669") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("8668") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("8667") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("8666") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("8665") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("8664") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("8663") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("8663", "8664", "8665", "8666", "8667", "8668", "8669", "8670"), /^\d{4}-\d{2}-\d{2}$/), stryMutAct_9fa48("8671") ? "" : (stryCov_9fa48("8671"), "La fecha debe tener formato YYYY-MM-DD")),
  timeWindow: z.object(stryMutAct_9fa48("8672") ? {} : (stryCov_9fa48("8672"), {
    start: z.string().regex(stryMutAct_9fa48("8678") ? /^\d{2}:\D{2}$/ : stryMutAct_9fa48("8677") ? /^\d{2}:\d$/ : stryMutAct_9fa48("8676") ? /^\D{2}:\d{2}$/ : stryMutAct_9fa48("8675") ? /^\d:\d{2}$/ : stryMutAct_9fa48("8674") ? /^\d{2}:\d{2}/ : stryMutAct_9fa48("8673") ? /\d{2}:\d{2}$/ : (stryCov_9fa48("8673", "8674", "8675", "8676", "8677", "8678"), /^\d{2}:\d{2}$/), stryMutAct_9fa48("8679") ? "" : (stryCov_9fa48("8679"), "Hora de inicio inválida (HH:MM)")),
    end: z.string().regex(stryMutAct_9fa48("8685") ? /^\d{2}:\D{2}$/ : stryMutAct_9fa48("8684") ? /^\d{2}:\d$/ : stryMutAct_9fa48("8683") ? /^\D{2}:\d{2}$/ : stryMutAct_9fa48("8682") ? /^\d:\d{2}$/ : stryMutAct_9fa48("8681") ? /^\d{2}:\d{2}/ : stryMutAct_9fa48("8680") ? /\d{2}:\d{2}$/ : (stryCov_9fa48("8680", "8681", "8682", "8683", "8684", "8685"), /^\d{2}:\d{2}$/), stryMutAct_9fa48("8686") ? "" : (stryCov_9fa48("8686"), "Hora de fin inválida (HH:MM)"))
  })),
  checklistVersion: stryMutAct_9fa48("8688") ? z.string().min(1, "Debe seleccionar una versión de checklist") : stryMutAct_9fa48("8687") ? z.string().trim().max(1, "Debe seleccionar una versión de checklist") : (stryCov_9fa48("8687", "8688"), z.string().trim().min(1, stryMutAct_9fa48("8689") ? "" : (stryCov_9fa48("8689"), "Debe seleccionar una versión de checklist"))),
  checklist: stryMutAct_9fa48("8690") ? z.array(environmentalInspectionChecklistItemSchema).max(1, "El checklist debe tener al menos un control") : (stryCov_9fa48("8690"), z.array(environmentalInspectionChecklistItemSchema).min(1, stryMutAct_9fa48("8691") ? "" : (stryCov_9fa48("8691"), "El checklist debe tener al menos un control"))),
  zoneId: stryMutAct_9fa48("8693") ? z.string().min(1).optional() : stryMutAct_9fa48("8692") ? z.string().trim().max(1).optional() : (stryCov_9fa48("8692", "8693"), z.string().trim().min(1).optional()),
  notes: stryMutAct_9fa48("8694") ? z.string().optional() : (stryCov_9fa48("8694"), z.string().trim().optional())
}));
export type EnvironmentalInspectionScheduleInput = z.infer<typeof environmentalInspectionScheduleInputSchema>;

// Backend `AllowedActionsDto` (#451): what can be derived from this inspection now, by report type,
// outcome and existing notice. The client does not replicate that matrix; it only reads the flags.
// `suggestedViolationType` is a plain string: the client does not branch on it.
export const environmentalInspectionAllowedActionsSchema = z.object(stryMutAct_9fa48("8695") ? {} : (stryCov_9fa48("8695"), {
  repair: z.boolean(),
  notice: z.boolean(),
  suggestedViolationType: z.string().nullable().optional()
}));
export type EnvironmentalInspectionAllowedActions = z.infer<typeof environmentalInspectionAllowedActionsSchema>;
export const environmentalInspectionSchema = z.object(stryMutAct_9fa48("8696") ? {} : (stryCov_9fa48("8696"), {
  // Required by the contract; kept optional only so one inspection without it is not discarded. Defensive: absent means no follow-up is offered.
  allowedActions: environmentalInspectionAllowedActionsSchema.optional(),
  inspectorId: z.string().nullable().optional(),
  completedByUserId: z.string().nullable().optional(),
  id: z.string(),
  reportId: z.string(),
  serviceId: z.string().nullable().optional(),
  inspectedAt: z.string().nullable().optional(),
  // Campos de agenda: son del frontend (el backend no los devuelve); se mantienen
  // opcionales para que la respuesta real del backend siga parseando.
  scheduledDate: z.string().optional(),
  timeWindow: z.object(stryMutAct_9fa48("8697") ? {} : (stryCov_9fa48("8697"), {
    start: z.string(),
    end: z.string()
  })).optional(),
  checklistVersion: z.string().optional(),
  checklist: z.array(environmentalInspectionChecklistItemSchema).optional(),
  checklistItems: z.array(environmentalInspectionChecklistItemResponseSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  findings: z.string().nullable().optional(),
  conclusion: z.string().nullable().optional(),
  violationType: environmentalInspectionViolationTypeSchema.nullable().optional(),
  severity: environmentalInspectionSeveritySchema.nullable().optional(),
  suggestedAction: environmentalInspectionSuggestedActionSchema.nullable().optional(),
  outcome: environmentalInspectionOutcomeSchema.nullable().optional(),
  nextStep: environmentalInspectionNextStepSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})).passthrough();
export type EnvironmentalInspection = z.infer<typeof environmentalInspectionSchema>;

// Plantilla del frontend: el backend no guarda checklist al programar, así que una
// inspección recién creada llega con `checklistItems: []`.
export const INSPECTION_CHECKLIST_TEMPLATE: readonly EnvironmentalInspectionChecklistItem[] = stryMutAct_9fa48("8698") ? [] : (stryCov_9fa48("8698"), [stryMutAct_9fa48("8699") ? {} : (stryCov_9fa48("8699"), {
  id: stryMutAct_9fa48("8700") ? "" : (stryCov_9fa48("8700"), "location"),
  label: stryMutAct_9fa48("8701") ? "" : (stryCov_9fa48("8701"), "Verificar ubicación y contexto del hallazgo"),
  required: stryMutAct_9fa48("8702") ? false : (stryCov_9fa48("8702"), true)
}), stryMutAct_9fa48("8703") ? {} : (stryCov_9fa48("8703"), {
  id: stryMutAct_9fa48("8704") ? "" : (stryCov_9fa48("8704"), "source"),
  label: stryMutAct_9fa48("8705") ? "" : (stryCov_9fa48("8705"), "Identificar la fuente del impacto"),
  required: stryMutAct_9fa48("8706") ? false : (stryCov_9fa48("8706"), true)
}), stryMutAct_9fa48("8707") ? {} : (stryCov_9fa48("8707"), {
  id: stryMutAct_9fa48("8708") ? "" : (stryCov_9fa48("8708"), "evidence"),
  label: stryMutAct_9fa48("8709") ? "" : (stryCov_9fa48("8709"), "Registrar observaciones para el acta"),
  required: stryMutAct_9fa48("8710") ? false : (stryCov_9fa48("8710"), true)
})]);

/**
 * El checklist que muestra la UI. En modo mock viene como `checklist`
 * (items con `id`=código y `required`); contra el backend real viene como
 * `checklistItems` (`itemCode`). Se normaliza a la forma interna. Si todavía no
 * hay nada relevado, se usa la plantilla.
 */
export function inspectionChecklist(inspection: EnvironmentalInspection): EnvironmentalInspectionChecklistItem[] {
  if (stryMutAct_9fa48("8711")) {
    {}
  } else {
    stryCov_9fa48("8711");
    if (stryMutAct_9fa48("8714") ? inspection.checklist.length : stryMutAct_9fa48("8713") ? false : stryMutAct_9fa48("8712") ? true : (stryCov_9fa48("8712", "8713", "8714"), inspection.checklist?.length)) return inspection.checklist;
    if (stryMutAct_9fa48("8717") ? false : stryMutAct_9fa48("8716") ? true : stryMutAct_9fa48("8715") ? inspection.checklistItems?.length : (stryCov_9fa48("8715", "8716", "8717"), !(stryMutAct_9fa48("8718") ? inspection.checklistItems.length : (stryCov_9fa48("8718"), inspection.checklistItems?.length)))) return INSPECTION_CHECKLIST_TEMPLATE.map(stryMutAct_9fa48("8719") ? () => undefined : (stryCov_9fa48("8719"), item => stryMutAct_9fa48("8720") ? {} : (stryCov_9fa48("8720"), {
      ...item
    })));
    return inspection.checklistItems.map(stryMutAct_9fa48("8721") ? () => undefined : (stryCov_9fa48("8721"), item => stryMutAct_9fa48("8722") ? {} : (stryCov_9fa48("8722"), {
      id: item.itemCode,
      label: item.label,
      required: stryMutAct_9fa48("8723") ? false : (stryCov_9fa48("8723"), true)
    })));
  }
}
export const issueViolationNoticeInputSchema = z.object(stryMutAct_9fa48("8724") ? {} : (stryCov_9fa48("8724"), {
  // null is reserved for the explicit non-forwarded path. A resolved notice
  // must always carry an establishment identifier for M4 projection.
  establishmentId: stryMutAct_9fa48("8726") ? z.string().min(1, "Debe indicar un establecimiento válido.").nullable() : stryMutAct_9fa48("8725") ? z.string().trim().max(1, "Debe indicar un establecimiento válido.").nullable() : (stryCov_9fa48("8725", "8726"), z.string().trim().min(1, stryMutAct_9fa48("8727") ? "" : (stryCov_9fa48("8727"), "Debe indicar un establecimiento válido.")).nullable()),
  violationType: environmentalInspectionViolationTypeSchema,
  severity: environmentalInspectionSeveritySchema,
  suggestedAction: environmentalInspectionSuggestedActionSchema
}));
export type IssueViolationNoticeInput = z.infer<typeof issueViolationNoticeInputSchema>;
export const violationNoticeSchema = z.object(stryMutAct_9fa48("8728") ? {} : (stryCov_9fa48("8728"), {
  id: z.string(),
  noticeNumber: z.string(),
  inspectionId: z.string(),
  issuedAt: z.string(),
  establishmentId: z.string().nullable(),
  violationType: environmentalInspectionViolationTypeSchema,
  severity: environmentalInspectionSeveritySchema,
  suggestedAction: environmentalInspectionSuggestedActionSchema,
  priorNoticeCount: z.number().int().nonnegative()
})).passthrough();
export type ViolationNotice = z.infer<typeof violationNoticeSchema>;
export const environmentalReportDateRangeSchema = z.object(stryMutAct_9fa48("8729") ? {} : (stryCov_9fa48("8729"), {
  from: z.iso.date(stryMutAct_9fa48("8730") ? "" : (stryCov_9fa48("8730"), "Use una fecha válida con formato AAAA-MM-DD.")).optional(),
  to: z.iso.date(stryMutAct_9fa48("8731") ? "" : (stryCov_9fa48("8731"), "Use una fecha válida con formato AAAA-MM-DD.")).optional()
})).refine(stryMutAct_9fa48("8732") ? () => undefined : (stryCov_9fa48("8732"), range => stryMutAct_9fa48("8735") ? (!range.from || !range.to) && range.from <= range.to : stryMutAct_9fa48("8734") ? false : stryMutAct_9fa48("8733") ? true : (stryCov_9fa48("8733", "8734", "8735"), (stryMutAct_9fa48("8737") ? !range.from && !range.to : stryMutAct_9fa48("8736") ? false : (stryCov_9fa48("8736", "8737"), (stryMutAct_9fa48("8738") ? range.from : (stryCov_9fa48("8738"), !range.from)) || (stryMutAct_9fa48("8739") ? range.to : (stryCov_9fa48("8739"), !range.to)))) || (stryMutAct_9fa48("8742") ? range.from > range.to : stryMutAct_9fa48("8741") ? range.from < range.to : stryMutAct_9fa48("8740") ? false : (stryCov_9fa48("8740", "8741", "8742"), range.from <= range.to)))), stryMutAct_9fa48("8743") ? {} : (stryCov_9fa48("8743"), {
  path: stryMutAct_9fa48("8744") ? [] : (stryCov_9fa48("8744"), [stryMutAct_9fa48("8745") ? "" : (stryCov_9fa48("8745"), "to")]),
  message: stryMutAct_9fa48("8746") ? "" : (stryCov_9fa48("8746"), "La fecha «Desde» no puede ser posterior a «Hasta».")
}));
export type EnvironmentalReportQuery = {
  from?: string;
  to?: string;
  status?: EnvironmentalReportStatus | EnvironmentalReportStatus[];
  reportType?: EnvironmentalReportType;
  priority?: EnvironmentalReportPriority;
  publicId?: string;
  ticketId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
export type EnvironmentalReportsPage = {
  environmentalReports: EnvironmentalReport[];
  /** Records of this page dropped for an unknown enum value (not the same as `total` exceeding the rows shown). */
  dropped?: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sanctionOutcomeIntegrationExceptions: SanctionOutcomeIntegrationException[];
};
export class EnvironmentalReportContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("8747")) {
      {}
    } else {
      stryCov_9fa48("8747");
      super(message, options);
      this.name = stryMutAct_9fa48("8748") ? "" : (stryCov_9fa48("8748"), "EnvironmentalReportContractError");
    }
  }
}
export class EnvironmentalReportRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("8749")) {
      {}
    } else {
      stryCov_9fa48("8749");
      super(message, options);
      this.name = stryMutAct_9fa48("8750") ? "" : (stryCov_9fa48("8750"), "EnvironmentalReportRequestError");
      this.status = status;
    }
  }
}
export const ENVIRONMENTAL_REPORT_TYPE_LABELS: Record<EnvironmentalReportType, string> = stryMutAct_9fa48("8751") ? {} : (stryCov_9fa48("8751"), {
  NOISE: stryMutAct_9fa48("8752") ? "" : (stryCov_9fa48("8752"), "Ruidos molestos"),
  DUMPING: stryMutAct_9fa48("8753") ? "" : (stryCov_9fa48("8753"), "Vertido de residuos"),
  ILLEGAL_DUMPSITE: stryMutAct_9fa48("8754") ? "" : (stryCov_9fa48("8754"), "Microbasural"),
  WATER_DISCHARGE: stryMutAct_9fa48("8755") ? "" : (stryCov_9fa48("8755"), "Descarga de efluentes"),
  AIR_EMISSION: stryMutAct_9fa48("8756") ? "" : (stryCov_9fa48("8756"), "Emisión al aire"),
  ODOR: stryMutAct_9fa48("8757") ? "" : (stryCov_9fa48("8757"), "Olores"),
  PEST_INFESTATION: stryMutAct_9fa48("8758") ? "" : (stryCov_9fa48("8758"), "Plaga o infestación"),
  OTHER: stryMutAct_9fa48("8759") ? "" : (stryCov_9fa48("8759"), "Otro hallazgo ambiental")
});
export const ENVIRONMENTAL_REPORT_STATUS_LABELS: Record<EnvironmentalReportStatus, string> = stryMutAct_9fa48("8760") ? {} : (stryCov_9fa48("8760"), {
  RECEIVED: stryMutAct_9fa48("8761") ? "" : (stryCov_9fa48("8761"), "Recibido"),
  UNDER_REVIEW: stryMutAct_9fa48("8762") ? "" : (stryCov_9fa48("8762"), "En revisión"),
  FORWARDED: stryMutAct_9fa48("8763") ? "" : (stryCov_9fa48("8763"), "Derivado"),
  DISMISSED: stryMutAct_9fa48("8764") ? "" : (stryCov_9fa48("8764"), "Desestimado"),
  INSPECTION_SCHEDULED: stryMutAct_9fa48("8765") ? "" : (stryCov_9fa48("8765"), "Inspección programada"),
  INSPECTED: stryMutAct_9fa48("8766") ? "" : (stryCov_9fa48("8766"), "Inspeccionado"),
  NO_VIOLATION: stryMutAct_9fa48("8767") ? "" : (stryCov_9fa48("8767"), "Sin infracción"),
  VIOLATION_FOUND: stryMutAct_9fa48("8768") ? "" : (stryCov_9fa48("8768"), "Infracción constatada"),
  NOTICE_ISSUED: stryMutAct_9fa48("8769") ? "" : (stryCov_9fa48("8769"), "Acta emitida"),
  SANCTIONED: stryMutAct_9fa48("8770") ? "" : (stryCov_9fa48("8770"), "Sancionado"),
  CLOSED: stryMutAct_9fa48("8771") ? "" : (stryCov_9fa48("8771"), "Cerrado")
});
export const ENVIRONMENTAL_REPORT_PRIORITY_LABELS: Record<EnvironmentalReportPriority, string> = stryMutAct_9fa48("8772") ? {} : (stryCov_9fa48("8772"), {
  LOW: stryMutAct_9fa48("8773") ? "" : (stryCov_9fa48("8773"), "Baja"),
  MEDIUM: stryMutAct_9fa48("8774") ? "" : (stryCov_9fa48("8774"), "Media"),
  HIGH: stryMutAct_9fa48("8775") ? "" : (stryCov_9fa48("8775"), "Alta"),
  CRITICAL: stryMutAct_9fa48("8776") ? "" : (stryCov_9fa48("8776"), "Crítica")
});
const errorResponseSchema = z.object(stryMutAct_9fa48("8777") ? {} : (stryCov_9fa48("8777"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("8778") ? [] : (stryCov_9fa48("8778"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: EnvironmentalReportQuery): string {
  if (stryMutAct_9fa48("8779")) {
    {}
  } else {
    stryCov_9fa48("8779");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("8781") ? false : stryMutAct_9fa48("8780") ? true : (stryCov_9fa48("8780", "8781"), query.from)) params.set(stryMutAct_9fa48("8783") ? "" : (stryCov_9fa48("8783"), "from"), query.from);
    if (stryMutAct_9fa48("8785") ? false : stryMutAct_9fa48("8784") ? true : (stryCov_9fa48("8784", "8785"), query.to)) params.set(stryMutAct_9fa48("8787") ? "" : (stryCov_9fa48("8787"), "to"), query.to);
    const statuses = Array.isArray(query.status) ? query.status : query.status ? stryMutAct_9fa48("8788") ? [] : (stryCov_9fa48("8788"), [query.status]) : stryMutAct_9fa48("8789") ? ["Stryker was here"] : (stryCov_9fa48("8789"), []);
    for (const status of statuses) params.append(stryMutAct_9fa48("8791") ? "" : (stryCov_9fa48("8791"), "status"), status);
    if (stryMutAct_9fa48("8793") ? false : stryMutAct_9fa48("8792") ? true : (stryCov_9fa48("8792", "8793"), query.reportType)) params.set(stryMutAct_9fa48("8795") ? "" : (stryCov_9fa48("8795"), "reportType"), query.reportType);
    if (stryMutAct_9fa48("8797") ? false : stryMutAct_9fa48("8796") ? true : (stryCov_9fa48("8796", "8797"), query.priority)) params.set(stryMutAct_9fa48("8799") ? "" : (stryCov_9fa48("8799"), "priority"), query.priority);
    if (stryMutAct_9fa48("8801") ? false : stryMutAct_9fa48("8800") ? true : (stryCov_9fa48("8800", "8801"), query.publicId)) params.set(stryMutAct_9fa48("8803") ? "" : (stryCov_9fa48("8803"), "publicId"), query.publicId);
    if (stryMutAct_9fa48("8805") ? false : stryMutAct_9fa48("8804") ? true : (stryCov_9fa48("8804", "8805"), query.ticketId)) params.set(stryMutAct_9fa48("8807") ? "" : (stryCov_9fa48("8807"), "ticketId"), query.ticketId);
    if (stryMutAct_9fa48("8809") ? false : stryMutAct_9fa48("8808") ? true : (stryCov_9fa48("8808", "8809"), query.search)) params.set(stryMutAct_9fa48("8811") ? "" : (stryCov_9fa48("8811"), "search"), query.search);
    if (stryMutAct_9fa48("8814") ? query.page === undefined : stryMutAct_9fa48("8813") ? false : stryMutAct_9fa48("8812") ? true : (stryCov_9fa48("8812", "8813", "8814"), query.page !== undefined)) params.set(stryMutAct_9fa48("8816") ? "" : (stryCov_9fa48("8816"), "page"), String(query.page));
    if (stryMutAct_9fa48("8819") ? query.pageSize === undefined : stryMutAct_9fa48("8818") ? false : stryMutAct_9fa48("8817") ? true : (stryCov_9fa48("8817", "8818", "8819"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("8821") ? "" : (stryCov_9fa48("8821"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("8822") ? `` : (stryCov_9fa48("8822"), `?${value}`) : stryMutAct_9fa48("8823") ? "Stryker was here!" : (stryCov_9fa48("8823"), "");
  }
}
async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("8824")) {
    {}
  } else {
    stryCov_9fa48("8824");
    let response: Response;
    try {
      if (stryMutAct_9fa48("8825")) {
        {}
      } else {
        stryCov_9fa48("8825");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("8826")) {
        {}
      } else {
        stryCov_9fa48("8826");
        if (stryMutAct_9fa48("8828") ? false : stryMutAct_9fa48("8827") ? true : (stryCov_9fa48("8827", "8828"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("8829")) {
            {}
          } else {
            stryCov_9fa48("8829");
            recordTelemetryEvent(stryMutAct_9fa48("8831") ? {} : (stryCov_9fa48("8831"), {
              name: stryMutAct_9fa48("8832") ? "" : (stryCov_9fa48("8832"), "request_network_failure"),
              resource: stryMutAct_9fa48("8833") ? "" : (stryCov_9fa48("8833"), "environmental-reports")
            }));
          }
        }
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("8834")) {
        {}
      } else {
        stryCov_9fa48("8834");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("8835")) {
        {}
      } else {
        stryCov_9fa48("8835");
        recordTelemetryEvent(stryMutAct_9fa48("8837") ? {} : (stryCov_9fa48("8837"), {
          name: stryMutAct_9fa48("8838") ? "" : (stryCov_9fa48("8838"), "request_malformed_response"),
          resource: stryMutAct_9fa48("8839") ? "" : (stryCov_9fa48("8839"), "environmental-reports")
        }));
        throw new EnvironmentalReportContractError(stryMutAct_9fa48("8841") ? "" : (stryCov_9fa48("8841"), "No se pudo obtener información válida del control ambiental. Reintente en unos segundos."), stryMutAct_9fa48("8842") ? {} : (stryCov_9fa48("8842"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("8845") ? false : stryMutAct_9fa48("8844") ? true : stryMutAct_9fa48("8843") ? response.ok : (stryCov_9fa48("8843", "8844", "8845"), !response.ok)) {
      if (stryMutAct_9fa48("8846")) {
        {}
      } else {
        stryCov_9fa48("8846");
        const parsedError = errorResponseSchema.safeParse(payload);
        const message = parsedError.success ? Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("8847") ? "" : (stryCov_9fa48("8847"), " ")) : parsedError.data.message : stryMutAct_9fa48("8848") ? "" : (stryCov_9fa48("8848"), "No se pudo completar la operación ambiental.");
        if (stryMutAct_9fa48("8849")) {
          ;
        } else {
          stryCov_9fa48("8849");
          throw new EnvironmentalReportRequestError(message, response.status);
        }
      }
    }
    return payload;
  }
}
function resourcePayload(payload: unknown): unknown {
  if (stryMutAct_9fa48("8850")) {
    {}
  } else {
    stryCov_9fa48("8850");
    return (stryMutAct_9fa48("8853") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("8852") ? false : stryMutAct_9fa48("8851") ? true : (stryCov_9fa48("8851", "8852", "8853"), (stryMutAct_9fa48("8855") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("8854") ? true : (stryCov_9fa48("8854", "8855"), (stryMutAct_9fa48("8857") ? payload || typeof payload === "object" : stryMutAct_9fa48("8856") ? true : (stryCov_9fa48("8856", "8857"), payload && (stryMutAct_9fa48("8859") ? typeof payload !== "object" : stryMutAct_9fa48("8858") ? true : (stryCov_9fa48("8858", "8859"), typeof payload === (stryMutAct_9fa48("8860") ? "" : (stryCov_9fa48("8860"), "object")))))) && (stryMutAct_9fa48("8861") ? "" : (stryCov_9fa48("8861"), "data")) in payload)) && (stryMutAct_9fa48("8862") ? "id" in payload : (stryCov_9fa48("8862"), !((stryMutAct_9fa48("8863") ? "" : (stryCov_9fa48("8863"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
  }
}
function parseResource(payload: unknown, message: string): EnvironmentalReport {
  if (stryMutAct_9fa48("8864")) {
    {}
  } else {
    stryCov_9fa48("8864");
    const parsed = environmentalReportSchema.safeParse(resourcePayload(payload));
    if (stryMutAct_9fa48("8867") ? false : stryMutAct_9fa48("8866") ? true : stryMutAct_9fa48("8865") ? parsed.success : (stryCov_9fa48("8865", "8866", "8867"), !parsed.success)) {
      if (stryMutAct_9fa48("8868")) {
        {}
      } else {
        stryCov_9fa48("8868");
        recordTelemetryEvent(stryMutAct_9fa48("8870") ? {} : (stryCov_9fa48("8870"), {
          name: stryMutAct_9fa48("8871") ? "" : (stryCov_9fa48("8871"), "request_malformed_response"),
          resource: stryMutAct_9fa48("8872") ? "" : (stryCov_9fa48("8872"), "environmental-reports")
        }));
        throw new EnvironmentalReportContractError(message, stryMutAct_9fa48("8874") ? {} : (stryCov_9fa48("8874"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
function parseInspection(payload: unknown, message: string): EnvironmentalInspection {
  if (stryMutAct_9fa48("8875")) {
    {}
  } else {
    stryCov_9fa48("8875");
    const parsed = environmentalInspectionSchema.safeParse(resourcePayload(payload));
    if (stryMutAct_9fa48("8878") ? false : stryMutAct_9fa48("8877") ? true : stryMutAct_9fa48("8876") ? parsed.success : (stryCov_9fa48("8876", "8877", "8878"), !parsed.success)) {
      if (stryMutAct_9fa48("8879")) {
        {}
      } else {
        stryCov_9fa48("8879");
        recordTelemetryEvent(stryMutAct_9fa48("8881") ? {} : (stryCov_9fa48("8881"), {
          name: stryMutAct_9fa48("8882") ? "" : (stryCov_9fa48("8882"), "request_malformed_response"),
          resource: stryMutAct_9fa48("8883") ? "" : (stryCov_9fa48("8883"), "environmental-reports")
        }));
        throw new EnvironmentalReportContractError(message, stryMutAct_9fa48("8885") ? {} : (stryCov_9fa48("8885"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const environmentalReportsAdapter = stryMutAct_9fa48("8886") ? {} : (stryCov_9fa48("8886"), {
  async issueViolationNotice(id: string, input: IssueViolationNoticeInput): Promise<ViolationNotice> {
    if (stryMutAct_9fa48("8887")) {
      {}
    } else {
      stryCov_9fa48("8887");
      const parsedInput = issueViolationNoticeInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8890") ? false : stryMutAct_9fa48("8889") ? true : stryMutAct_9fa48("8888") ? parsedInput.success : (stryCov_9fa48("8888", "8889", "8890"), !parsedInput.success)) {
        if (stryMutAct_9fa48("8891")) {
          {}
        } else {
          stryCov_9fa48("8891");
          throw new EnvironmentalReportContractError(stryMutAct_9fa48("8893") ? "" : (stryCov_9fa48("8893"), "Los datos para emitir el acta son inválidos."), stryMutAct_9fa48("8894") ? {} : (stryCov_9fa48("8894"), {
            cause: parsedInput.error
          }));
        }
      }
      const payload = await requestJson(stryMutAct_9fa48("8895") ? `` : (stryCov_9fa48("8895"), `/api/environmental-inspections/${encodeURIComponent(id)}/violation-notice`), stryMutAct_9fa48("8896") ? {} : (stryCov_9fa48("8896"), {
        method: stryMutAct_9fa48("8897") ? "" : (stryCov_9fa48("8897"), "POST"),
        headers: stryMutAct_9fa48("8898") ? {} : (stryCov_9fa48("8898"), {
          "content-type": stryMutAct_9fa48("8899") ? "" : (stryCov_9fa48("8899"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const parsed = violationNoticeSchema.safeParse(resourcePayload(payload));
      if (stryMutAct_9fa48("8902") ? false : stryMutAct_9fa48("8901") ? true : stryMutAct_9fa48("8900") ? parsed.success : (stryCov_9fa48("8900", "8901", "8902"), !parsed.success)) {
        if (stryMutAct_9fa48("8903")) {
          {}
        } else {
          stryCov_9fa48("8903");
          recordTelemetryEvent(stryMutAct_9fa48("8905") ? {} : (stryCov_9fa48("8905"), {
            name: stryMutAct_9fa48("8906") ? "" : (stryCov_9fa48("8906"), "request_malformed_response"),
            resource: stryMutAct_9fa48("8907") ? "" : (stryCov_9fa48("8907"), "environmental-reports")
          }));
          throw new EnvironmentalReportContractError(stryMutAct_9fa48("8909") ? "" : (stryCov_9fa48("8909"), "No se pudo obtener información válida de la emisión del acta. Reintente en unos segundos."), stryMutAct_9fa48("8910") ? {} : (stryCov_9fa48("8910"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  /** `null` = la inspección todavía no tiene acta (el backend responde 200 con `null`). */
  async getViolationNotice(id: string): Promise<ViolationNotice | null> {
    if (stryMutAct_9fa48("8911")) {
      {}
    } else {
      stryCov_9fa48("8911");
      const payload = await requestJson(stryMutAct_9fa48("8912") ? `` : (stryCov_9fa48("8912"), `/api/environmental-inspections/${encodeURIComponent(id)}/violation-notice`));
      if (stryMutAct_9fa48("8915") ? payload !== null : stryMutAct_9fa48("8914") ? false : stryMutAct_9fa48("8913") ? true : (stryCov_9fa48("8913", "8914", "8915"), payload === null)) return null;
      const parsed = violationNoticeSchema.safeParse(resourcePayload(payload));
      if (stryMutAct_9fa48("8918") ? false : stryMutAct_9fa48("8917") ? true : stryMutAct_9fa48("8916") ? parsed.success : (stryCov_9fa48("8916", "8917", "8918"), !parsed.success)) {
        if (stryMutAct_9fa48("8919")) {
          {}
        } else {
          stryCov_9fa48("8919");
          recordTelemetryEvent(stryMutAct_9fa48("8921") ? {} : (stryCov_9fa48("8921"), {
            name: stryMutAct_9fa48("8922") ? "" : (stryCov_9fa48("8922"), "request_malformed_response"),
            resource: stryMutAct_9fa48("8923") ? "" : (stryCov_9fa48("8923"), "environmental-reports")
          }));
          throw new EnvironmentalReportContractError(stryMutAct_9fa48("8925") ? "" : (stryCov_9fa48("8925"), "No se pudo obtener información válida del acta. Reintente en unos segundos."), stryMutAct_9fa48("8926") ? {} : (stryCov_9fa48("8926"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async list(query: EnvironmentalReportQuery = {}): Promise<EnvironmentalReportsPage> {
    if (stryMutAct_9fa48("8927")) {
      {}
    } else {
      stryCov_9fa48("8927");
      const payload = await requestJson(stryMutAct_9fa48("8928") ? `` : (stryCov_9fa48("8928"), `/api/environmental-reports${queryString(query)}`));
      const parsed = z.object(stryMutAct_9fa48("8929") ? {} : (stryCov_9fa48("8929"), {
        data: tolerantRecords(environmentalReportSchema, stryMutAct_9fa48("8930") ? "" : (stryCov_9fa48("8930"), "environmental-reports")),
        // `meta.dropped`: what the Field BFF already dropped while scoping to the crew.
        meta: z.object(stryMutAct_9fa48("8931") ? {} : (stryCov_9fa48("8931"), {
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
          totalPages: z.number(),
          dropped: z.number().int().nonnegative().optional()
        })),
        sanctionOutcomeIntegrationExceptions: z.array(sanctionOutcomeIntegrationExceptionSchema).optional()
      })).safeParse(payload);
      if (stryMutAct_9fa48("8934") ? false : stryMutAct_9fa48("8933") ? true : stryMutAct_9fa48("8932") ? parsed.success : (stryCov_9fa48("8932", "8933", "8934"), !parsed.success)) throw new EnvironmentalReportContractError(stryMutAct_9fa48("8936") ? "" : (stryCov_9fa48("8936"), "No se pudo obtener información válida de la lista de expedientes. Reintente en unos segundos."), stryMutAct_9fa48("8937") ? {} : (stryCov_9fa48("8937"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("8938") ? {} : (stryCov_9fa48("8938"), {
        environmentalReports: parsed.data.data,
        dropped: stryMutAct_9fa48("8939") ? droppedRecords(parsed.data.data) - (parsed.data.meta.dropped ?? 0) : (stryCov_9fa48("8939"), droppedRecords(parsed.data.data) + (stryMutAct_9fa48("8940") ? parsed.data.meta.dropped && 0 : (stryCov_9fa48("8940"), parsed.data.meta.dropped ?? 0))),
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages,
        sanctionOutcomeIntegrationExceptions: stryMutAct_9fa48("8941") ? parsed.data.sanctionOutcomeIntegrationExceptions && [] : (stryCov_9fa48("8941"), parsed.data.sanctionOutcomeIntegrationExceptions ?? (stryMutAct_9fa48("8942") ? ["Stryker was here"] : (stryCov_9fa48("8942"), [])))
      });
    }
  },
  async get(id: string): Promise<EnvironmentalReport> {
    if (stryMutAct_9fa48("8943")) {
      {}
    } else {
      stryCov_9fa48("8943");
      return parseResource(await requestJson(stryMutAct_9fa48("8944") ? `` : (stryCov_9fa48("8944"), `/api/environmental-reports/${encodeURIComponent(id)}`)), stryMutAct_9fa48("8945") ? "" : (stryCov_9fa48("8945"), "No se pudo obtener información válida del detalle del expediente. Reintente en unos segundos."));
    }
  },
  async create(input: CreateEnvironmentalReportInput): Promise<EnvironmentalReport> {
    if (stryMutAct_9fa48("8946")) {
      {}
    } else {
      stryCov_9fa48("8946");
      const parsedInput = createEnvironmentalReportInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8949") ? false : stryMutAct_9fa48("8948") ? true : stryMutAct_9fa48("8947") ? parsedInput.success : (stryCov_9fa48("8947", "8948", "8949"), !parsedInput.success)) throw new EnvironmentalReportContractError(stryMutAct_9fa48("8951") ? "" : (stryCov_9fa48("8951"), "Los datos del hallazgo son inválidos."), stryMutAct_9fa48("8952") ? {} : (stryCov_9fa48("8952"), {
        cause: parsedInput.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("8953") ? "" : (stryCov_9fa48("8953"), "/api/environmental-reports"), stryMutAct_9fa48("8954") ? {} : (stryCov_9fa48("8954"), {
        method: stryMutAct_9fa48("8955") ? "" : (stryCov_9fa48("8955"), "POST"),
        headers: stryMutAct_9fa48("8956") ? {} : (stryCov_9fa48("8956"), {
          "content-type": stryMutAct_9fa48("8957") ? "" : (stryCov_9fa48("8957"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("8958") ? "" : (stryCov_9fa48("8958"), "No se pudo obtener información válida de la creación del expediente. Reintente en unos segundos."));
    }
  },
  async startReview(id: string): Promise<EnvironmentalReport> {
    if (stryMutAct_9fa48("8959")) {
      {}
    } else {
      stryCov_9fa48("8959");
      return transition(id, stryMutAct_9fa48("8960") ? "" : (stryCov_9fa48("8960"), "start-review"), stryMutAct_9fa48("8961") ? "" : (stryCov_9fa48("8961"), "No se pudo obtener información válida del inicio de revisión. Reintente en unos segundos."));
    }
  },
  async forward(id: string, input: ReportDecisionInput): Promise<EnvironmentalReport> {
    if (stryMutAct_9fa48("8962")) {
      {}
    } else {
      stryCov_9fa48("8962");
      return transition(id, stryMutAct_9fa48("8963") ? "" : (stryCov_9fa48("8963"), "forward"), stryMutAct_9fa48("8964") ? "" : (stryCov_9fa48("8964"), "No se pudo obtener información válida de derivación. Reintente en unos segundos."), decisionBody(input));
    }
  },
  async dismiss(id: string, input: ReportDecisionInput): Promise<EnvironmentalReport> {
    if (stryMutAct_9fa48("8965")) {
      {}
    } else {
      stryCov_9fa48("8965");
      return transition(id, stryMutAct_9fa48("8966") ? "" : (stryCov_9fa48("8966"), "dismiss"), stryMutAct_9fa48("8967") ? "" : (stryCov_9fa48("8967"), "No se pudo obtener información válida de desestimación. Reintente en unos segundos."), decisionBody(input));
    }
  },
  async requestInformation(id: string, input: RequestInformationInput): Promise<EnvironmentalReport> {
    if (stryMutAct_9fa48("8968")) {
      {}
    } else {
      stryCov_9fa48("8968");
      const parsed = requestInformationInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8971") ? false : stryMutAct_9fa48("8970") ? true : stryMutAct_9fa48("8969") ? parsed.success : (stryCov_9fa48("8969", "8970", "8971"), !parsed.success)) throw new EnvironmentalReportContractError(stryMutAct_9fa48("8973") ? parsed.error.issues[0]?.message && "El pedido de información es inválido." : (stryCov_9fa48("8973"), (stryMutAct_9fa48("8974") ? parsed.error.issues[0].message : (stryCov_9fa48("8974"), parsed.error.issues[0]?.message)) ?? (stryMutAct_9fa48("8975") ? "" : (stryCov_9fa48("8975"), "El pedido de información es inválido."))), stryMutAct_9fa48("8976") ? {} : (stryCov_9fa48("8976"), {
        cause: parsed.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("8977") ? `` : (stryCov_9fa48("8977"), `/api/environmental-reports/${encodeURIComponent(id)}/request-information`), stryMutAct_9fa48("8978") ? {} : (stryCov_9fa48("8978"), {
        method: stryMutAct_9fa48("8979") ? "" : (stryCov_9fa48("8979"), "POST"),
        headers: stryMutAct_9fa48("8980") ? {} : (stryCov_9fa48("8980"), {
          "content-type": stryMutAct_9fa48("8981") ? "" : (stryCov_9fa48("8981"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })), stryMutAct_9fa48("8982") ? "" : (stryCov_9fa48("8982"), "No se pudo obtener información válida del pedido de información. Reintente en unos segundos."));
    }
  },
  async close(id: string): Promise<EnvironmentalReport> {
    if (stryMutAct_9fa48("8983")) {
      {}
    } else {
      stryCov_9fa48("8983");
      return transition(id, stryMutAct_9fa48("8984") ? "" : (stryCov_9fa48("8984"), "close"), stryMutAct_9fa48("8985") ? "" : (stryCov_9fa48("8985"), "No se pudo obtener información válida de cierre. Reintente en unos segundos."));
    }
  },
  async schedule(reportId: string, input: EnvironmentalInspectionScheduleInput): Promise<EnvironmentalInspection> {
    if (stryMutAct_9fa48("8986")) {
      {}
    } else {
      stryCov_9fa48("8986");
      const parsedInput = environmentalInspectionScheduleInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8989") ? false : stryMutAct_9fa48("8988") ? true : stryMutAct_9fa48("8987") ? parsedInput.success : (stryCov_9fa48("8987", "8988", "8989"), !parsedInput.success)) {
        if (stryMutAct_9fa48("8990")) {
          {}
        } else {
          stryCov_9fa48("8990");
          throw new EnvironmentalReportContractError(stryMutAct_9fa48("8992") ? "" : (stryCov_9fa48("8992"), "Los datos para programar la inspección son inválidos."), stryMutAct_9fa48("8993") ? {} : (stryCov_9fa48("8993"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseInspection(await requestJson(stryMutAct_9fa48("8994") ? `` : (stryCov_9fa48("8994"), `/api/environmental-reports/${encodeURIComponent(reportId)}/inspections`), stryMutAct_9fa48("8995") ? {} : (stryCov_9fa48("8995"), {
        method: stryMutAct_9fa48("8996") ? "" : (stryCov_9fa48("8996"), "POST"),
        headers: stryMutAct_9fa48("8997") ? {} : (stryCov_9fa48("8997"), {
          "content-type": stryMutAct_9fa48("8998") ? "" : (stryCov_9fa48("8998"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("8999") ? "" : (stryCov_9fa48("8999"), "No se pudo obtener información válida de la programación de inspección. Reintente en unos segundos."));
    }
  },
  async listInspections(reportId: string): Promise<EnvironmentalInspection[]> {
    if (stryMutAct_9fa48("9000")) {
      {}
    } else {
      stryCov_9fa48("9000");
      const payload = await requestJson(stryMutAct_9fa48("9001") ? `` : (stryCov_9fa48("9001"), `/api/environmental-reports/${encodeURIComponent(reportId)}/inspections`));
      const raw = (stryMutAct_9fa48("9004") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("9003") ? false : stryMutAct_9fa48("9002") ? true : (stryCov_9fa48("9002", "9003", "9004"), (stryMutAct_9fa48("9006") ? payload || typeof payload === "object" : stryMutAct_9fa48("9005") ? true : (stryCov_9fa48("9005", "9006"), payload && (stryMutAct_9fa48("9008") ? typeof payload !== "object" : stryMutAct_9fa48("9007") ? true : (stryCov_9fa48("9007", "9008"), typeof payload === (stryMutAct_9fa48("9009") ? "" : (stryCov_9fa48("9009"), "object")))))) && (stryMutAct_9fa48("9010") ? "" : (stryCov_9fa48("9010"), "data")) in payload)) ? (payload as {
        data: unknown;
      }).data : payload;
      const parsed = z.array(environmentalInspectionSchema).safeParse(raw);
      if (stryMutAct_9fa48("9013") ? false : stryMutAct_9fa48("9012") ? true : stryMutAct_9fa48("9011") ? parsed.success : (stryCov_9fa48("9011", "9012", "9013"), !parsed.success)) {
        if (stryMutAct_9fa48("9014")) {
          {}
        } else {
          stryCov_9fa48("9014");
          recordTelemetryEvent(stryMutAct_9fa48("9016") ? {} : (stryCov_9fa48("9016"), {
            name: stryMutAct_9fa48("9017") ? "" : (stryCov_9fa48("9017"), "request_malformed_response"),
            resource: stryMutAct_9fa48("9018") ? "" : (stryCov_9fa48("9018"), "environmental-reports")
          }));
          throw new EnvironmentalReportContractError(stryMutAct_9fa48("9020") ? "" : (stryCov_9fa48("9020"), "No se pudo obtener información válida de la historia de inspecciones. Reintente en unos segundos."), stryMutAct_9fa48("9021") ? {} : (stryCov_9fa48("9021"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async completeInspection(id: string, input: EnvironmentalInspectionCompleteInput): Promise<EnvironmentalInspection> {
    if (stryMutAct_9fa48("9022")) {
      {}
    } else {
      stryCov_9fa48("9022");
      const parsedInput = environmentalInspectionCompleteInputSchema.safeParse(input);
      if (stryMutAct_9fa48("9025") ? false : stryMutAct_9fa48("9024") ? true : stryMutAct_9fa48("9023") ? parsedInput.success : (stryCov_9fa48("9023", "9024", "9025"), !parsedInput.success)) {
        if (stryMutAct_9fa48("9026")) {
          {}
        } else {
          stryCov_9fa48("9026");
          throw new EnvironmentalReportContractError(stryMutAct_9fa48("9028") ? "" : (stryCov_9fa48("9028"), "Los datos para completar la inspecci\u00f3n son inv\u00e1lidos."), stryMutAct_9fa48("9029") ? {} : (stryCov_9fa48("9029"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseInspection(await requestJson(stryMutAct_9fa48("9030") ? `` : (stryCov_9fa48("9030"), `/api/environmental-inspections/${encodeURIComponent(id)}/complete`), stryMutAct_9fa48("9031") ? {} : (stryCov_9fa48("9031"), {
        method: stryMutAct_9fa48("9032") ? "" : (stryCov_9fa48("9032"), "POST"),
        headers: stryMutAct_9fa48("9033") ? {} : (stryCov_9fa48("9033"), {
          "content-type": stryMutAct_9fa48("9034") ? "" : (stryCov_9fa48("9034"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("9035") ? "" : (stryCov_9fa48("9035"), "No se pudo obtener información válida de la finalizaci\u00f3n de inspecci\u00f3n. Reintente en unos segundos."));
    }
  },
  async getInspection(id: string): Promise<EnvironmentalInspection> {
    if (stryMutAct_9fa48("9036")) {
      {}
    } else {
      stryCov_9fa48("9036");
      return parseInspection(await requestJson(stryMutAct_9fa48("9037") ? `` : (stryCov_9fa48("9037"), `/api/environmental-inspections/${encodeURIComponent(id)}`)), stryMutAct_9fa48("9038") ? "" : (stryCov_9fa48("9038"), "No se pudo obtener información válida del detalle de inspección. Reintente en unos segundos."));
    }
  }
});
function decisionBody(input: ReportDecisionInput) {
  if (stryMutAct_9fa48("9039")) {
    {}
  } else {
    stryCov_9fa48("9039");
    const parsed = reportDecisionInputSchema.safeParse(input);
    if (stryMutAct_9fa48("9042") ? false : stryMutAct_9fa48("9041") ? true : stryMutAct_9fa48("9040") ? parsed.success : (stryCov_9fa48("9040", "9041", "9042"), !parsed.success)) throw new EnvironmentalReportContractError(stryMutAct_9fa48("9044") ? parsed.error.issues[0]?.message && "El motivo es inválido." : (stryCov_9fa48("9044"), (stryMutAct_9fa48("9045") ? parsed.error.issues[0].message : (stryCov_9fa48("9045"), parsed.error.issues[0]?.message)) ?? (stryMutAct_9fa48("9046") ? "" : (stryCov_9fa48("9046"), "El motivo es inválido."))), stryMutAct_9fa48("9047") ? {} : (stryCov_9fa48("9047"), {
      cause: parsed.error
    }));
    return parsed.data;
  }
}
async function transition(id: string, action: string, message: string, body?: ReportDecisionInput): Promise<EnvironmentalReport> {
  if (stryMutAct_9fa48("9048")) {
    {}
  } else {
    stryCov_9fa48("9048");
    const init: RequestInit = body ? stryMutAct_9fa48("9049") ? {} : (stryCov_9fa48("9049"), {
      method: stryMutAct_9fa48("9050") ? "" : (stryCov_9fa48("9050"), "POST"),
      headers: stryMutAct_9fa48("9051") ? {} : (stryCov_9fa48("9051"), {
        "content-type": stryMutAct_9fa48("9052") ? "" : (stryCov_9fa48("9052"), "application/json")
      }),
      body: JSON.stringify(body)
    }) : stryMutAct_9fa48("9053") ? {} : (stryCov_9fa48("9053"), {
      method: stryMutAct_9fa48("9054") ? "" : (stryCov_9fa48("9054"), "POST")
    });
    return parseResource(await requestJson(stryMutAct_9fa48("9055") ? `` : (stryCov_9fa48("9055"), `/api/environmental-reports/${encodeURIComponent(id)}/${action}`), init), message);
  }
}