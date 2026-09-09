import type {
  EnvironmentalInspection,
  EnvironmentalReport,
  SanctionOutcome,
  SanctionOutcomeIntegrationException,
  ViolationNotice,
} from "./environmental-reports";

export const SANCTION_DECISION_LABELS: Record<SanctionOutcome["decision"], string> = {
  FINE_ISSUED: "Multa emitida",
  CLOSURE_ORDERED: "Clausura ordenada",
  FORMAL_NOTICE_ISSUED: "Aviso formal emitido",
  DISMISSED: "Desestimada por M4",
};

export type EnvironmentalReportClosure =
  | {
      kind: "sanctioned";
      label: "Cierre por resolución de M4";
      description: string;
      outcome: SanctionOutcome;
    }
  | {
      kind: "waiting";
      label: "Esperando resolución de M4";
      description: string;
      deadlineAt: string | null;
    }
  | {
      kind: "deadline-pending";
      label: "Plazo de resolución vencido";
      description: string;
      deadlineAt: string;
    }
  | {
      kind: "deadline";
      label: "Cierre automático por vencimiento";
      description: string;
      deadlineAt: string;
    }
  | {
      kind: "local";
      label: "Cierre local";
      description: string;
    };

export type SanctionOutcomeIngestionContext = {
  reports: readonly EnvironmentalReport[];
  inspections: readonly EnvironmentalInspection[];
  notices: readonly ViolationNotice[];
  outcomes: readonly SanctionOutcome[];
};

export type SanctionOutcomeIngestionResult =
  | {
      disposition: "accepted";
      report: EnvironmentalReport;
      outcome: SanctionOutcome;
    }
  | {
      disposition: "ignored";
      reason: "duplicate";
      report?: EnvironmentalReport;
    }
  | {
      disposition: "integration-exception";
      exception: SanctionOutcomeIntegrationException;
    };

function correlatedReport(
  outcome: SanctionOutcome,
  context: SanctionOutcomeIngestionContext,
): EnvironmentalReport | null {
  const notice = context.notices.find((candidate) => candidate.id === outcome.violationNoticeId);
  if (!notice) return null;

  const inspection = context.inspections.find((candidate) => candidate.id === notice.inspectionId);
  if (!inspection) return null;

  return context.reports.find((candidate) => candidate.id === inspection.reportId) ?? null;
}

export function ingestSanctionOutcome(
  outcome: SanctionOutcome,
  context: SanctionOutcomeIngestionContext,
  now = new Date(),
): SanctionOutcomeIngestionResult {
  const report = correlatedReport(outcome, context);
  if (!report) {
    return {
      disposition: "integration-exception",
      exception: {
        type: "UNCORRELATED_SANCTION_OUTCOME",
        violationNoticeId: outcome.violationNoticeId,
        externalRef: outcome.externalRef,
        receivedAt: now.toISOString(),
        message: "La resolución de M4 no pudo correlacionarse con un acta conocida.",
      },
    };
  }

  const duplicate = context.outcomes.some((candidate) =>
    candidate.violationNoticeId === outcome.violationNoticeId || candidate.externalRef === outcome.externalRef,
  );
  if (duplicate) return { disposition: "ignored", reason: "duplicate", report };

  return {
    disposition: "accepted",
    outcome,
    report: {
      ...report,
      status: report.status === "CLOSED" ? "CLOSED" : "SANCTIONED",
      sanctionOutcome: outcome,
      updatedAt: now.toISOString(),
    },
  };
}

export function getEnvironmentalReportClosure(
  report: EnvironmentalReport,
  now = new Date(),
): EnvironmentalReportClosure | null {
  if (report.sanctionOutcome) {
    return {
      kind: "sanctioned",
      label: "Cierre por resolución de M4",
      description: `M4 resolvió el acta: ${SANCTION_DECISION_LABELS[report.sanctionOutcome.decision]}.`,
      outcome: report.sanctionOutcome,
    };
  }

  const deadlineAt = report.deadlineAt;
  const deadline = deadlineAt ? Date.parse(deadlineAt) : Number.NaN;
  const deadlineElapsed = !Number.isNaN(deadline) && deadline <= now.getTime();

  if (report.status === "NOTICE_ISSUED") {
    if (deadlineElapsed && deadlineAt) {
      return {
        kind: "deadline-pending",
        label: "Plazo de resolución vencido",
        description: "El cierre automático quedará reflejado cuando el Backend actualice el expediente.",
        deadlineAt,
      };
    }
    return {
      kind: "waiting",
      label: "Esperando resolución de M4",
      description: deadlineAt
        ? `M4 debe resolver antes del ${deadlineAt}. El expediente permanece abierto mientras espera esa respuesta.`
        : "El expediente permanece abierto mientras espera la respuesta de M4.",
      deadlineAt: deadlineAt ?? null,
    };
  }

  if (report.status !== "CLOSED") return null;
  if (deadlineElapsed && deadlineAt) {
    return {
      kind: "deadline",
      label: "Cierre automático por vencimiento",
      description: "El expediente se cerró automáticamente sin una resolución de M4.",
      deadlineAt,
    };
  }
  return {
    kind: "local",
    label: "Cierre local",
    description: "El expediente se cerró en M6 sin una resolución sancionatoria de M4.",
  };
}

export {
  sanctionOutcomeIntegrationExceptionSchema,
  sanctionOutcomeSchema,
  type SanctionOutcome,
  type SanctionOutcomeIntegrationException,
} from "./environmental-reports";
