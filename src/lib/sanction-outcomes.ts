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
  DISMISSED: "Desestimada por Faltas",
};

export type EnvironmentalReportClosure =
  | {
      kind: "sanctioned";
      label: "Cierre por resolución de Faltas";
      description: string;
      outcome: SanctionOutcome;
    }
  | {
      kind: "waiting";
      label: "Esperando resolución de Faltas";
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
        message: "La resolución de Faltas no coincide con ningún acta.",
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
      label: "Cierre por resolución de Faltas",
      description: `Faltas resolvió el acta: ${SANCTION_DECISION_LABELS[report.sanctionOutcome.decision]}.`,
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
        description: "El expediente se cerrará automáticamente.",
        deadlineAt,
      };
    }
    return {
      kind: "waiting",
      label: "Esperando resolución de Faltas",
      description: deadlineAt
        ? `Faltas debe resolver antes del ${deadlineAt}.`
        : "Esperando la respuesta de Faltas.",
      deadlineAt: deadlineAt ?? null,
    };
  }

  if (report.status !== "CLOSED") return null;
  if (deadlineElapsed && deadlineAt) {
    return {
      kind: "deadline",
      label: "Cierre automático por vencimiento",
      description: "Se cerró sin resolución de Faltas.",
      deadlineAt,
    };
  }
  return {
    kind: "local",
    label: "Cierre local",
    description: "Se cerró sin resolución de Faltas.",
  };
}

export {
  sanctionOutcomeIntegrationExceptionSchema,
  sanctionOutcomeSchema,
  type SanctionOutcome,
  type SanctionOutcomeIntegrationException,
} from "./environmental-reports";
