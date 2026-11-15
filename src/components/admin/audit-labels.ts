import { CONTAINER_STATUS_LABELS } from "@/lib/containers";
import { ENVIRONMENTAL_REPORT_STATUS_LABELS } from "@/lib/environmental-reports";
import { SANCTION_DECISION_LABELS } from "@/lib/sanction-outcomes";
import type { AuditEntry } from "@/lib/integration-monitor";
import { REPAIR_REQUEST_STATUS_LABEL } from "@/lib/repair-requests";
import { STATUS_LABEL as SERVICE_STATUS_LABELS } from "@/lib/services";

type AuditEntityType = AuditEntry["entityType"];

export const UNKNOWN_ACTION_LABEL = "Otra acción";
export const UNKNOWN_STATUS_LABEL = "Otro estado";

/** Valores de `action` que escribe hoy el Backend en el registro de auditoría. */
const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creó el registro",
  READ: "Consultó el dato",
  UPDATE: "Modificó el registro",
  ACTIVATE: "Activó el registro",
  DEACTIVATE: "Desactivó el registro",
  STATUS_CHANGE: "Cambió el estado",
  ADD_MEMBERS: "Agregó integrantes",
  REMOVE_MEMBER: "Quitó a un integrante",
  REASSIGN_ZONE: "Reasignó la zona",
  ASSIGN_CREW: "Asignó una cuadrilla",
  ASSIGN_SERVICE: "Asignó un servicio",
  START: "Inició la tarea",
  START_REPAIR: "Inició una reparación",
  COMPLETE: "Completó la tarea",
  COMPLETE_REPAIR: "Completó una reparación",
  COMPLETE_SERVICE: "Completó un servicio",
  CLOSE: "Cerró el registro",
  CANCEL: "Canceló",
  SUSPEND: "Suspendió",
  RESUME: "Reanudó",
  RESCHEDULE: "Reprogramó",
  CONFIRM_RESCHEDULE: "Confirmó la reprogramación",
  END: "Finalizó",
  APPROVE: "Aprobó",
  REJECT: "Rechazó",
  AUTHORIZE: "Autorizó",
  SUBMIT_FOR_AUTHORIZATION: "Envió a autorizar",
  REQUEST_INFORMATION: "Solicitó información",
  START_REVIEW: "Inició una revisión",
  FORWARD: "Derivó",
  DISMISS: "Desestimó",
  REPORT_DAMAGE: "Informó un daño",
  REPORT_OVERFLOW: "Informó un desborde",
  EMPTY: "Vació el contenedor",
  RELOCATE: "Reubicó",
  CONFIRM_RELOCATION: "Confirmó la reubicación",
  REMOVE: "Retiró",
  REACTIVATE: "Reactivó",
  REOPEN: "Reabrió",
  PRIORITY_CHANGE: "Cambió la prioridad",
  INFORMATION_PROVIDED: "Recibió información",
  ESCALATION_CHANGE: "Cambió la escalación",
  CANCEL_INFORMATION_REQUEST: "Canceló la solicitud de información",
  RECORD_OUTCOME: "Registró la resolución",
};

const CATALOG_STATUS_LABELS: Record<string, string> = { ACTIVE: "Activo", INACTIVE: "Inactivo" };

// Sin mapa en las libs de dominio: se definen acá, con el vocabulario del Backend.
const STREET_CLOSURE_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Solicitado",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  ENDED: "Finalizado",
  EXPIRED: "Vencido",
};

const TREE_INTERVENTION_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Solicitada",
  PENDING_AUTHORIZATION: "Pendiente de autorización",
  AUTHORIZED: "Autorizada",
  REJECTED: "Rechazada",
};

const STATUS_LABELS_BY_ENTITY: Partial<Record<AuditEntityType, Record<string, string>>> = {
  CONTAINER: CONTAINER_STATUS_LABELS,
  ENVIRONMENTAL_REPORT: ENVIRONMENTAL_REPORT_STATUS_LABELS,
  REPAIR_REQUEST: REPAIR_REQUEST_STATUS_LABEL,
  STREET_CLOSURE_REQUEST: STREET_CLOSURE_STATUS_LABELS,
  TREE_INTERVENTION: TREE_INTERVENTION_STATUS_LABELS,
  SERVICE: SERVICE_STATUS_LABELS,
  CREW: CATALOG_STATUS_LABELS,
  ZONE: CATALOG_STATUS_LABELS,
  VEHICLE: CATALOG_STATUS_LABELS,
  ROUTE: CATALOG_STATUS_LABELS,
  SANCTION_OUTCOME: SANCTION_DECISION_LABELS,
  INBOX_EVENT: {},
};

function lookup(labels: Record<string, string> | undefined, key: string): string | undefined {
  return labels && Object.hasOwn(labels, key) ? labels[key] : undefined;
}

export function auditActionLabel(action: string): { label: string; rawCode: string | null } {
  const label = lookup(ACTION_LABELS, action);
  return label ? { label, rawCode: null } : { label: UNKNOWN_ACTION_LABEL, rawCode: action };
}

export function auditStatusLabel(
  entityType: AuditEntityType,
  status: string | null,
): { label: string; rawCode: string | null } {
  if (!status) return { label: "—", rawCode: null };
  const label = lookup(STATUS_LABELS_BY_ENTITY[entityType], status);
  return label ? { label, rawCode: null } : { label: UNKNOWN_STATUS_LABEL, rawCode: status };
}
