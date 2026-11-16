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
import type { EnvironmentalInspection, EnvironmentalReport, SanctionOutcome, SanctionOutcomeIntegrationException, ViolationNotice } from "./environmental-reports";
export const SANCTION_DECISION_LABELS: Record<SanctionOutcome["decision"], string> = stryMutAct_9fa48("13543") ? {} : (stryCov_9fa48("13543"), {
  FINE_ISSUED: stryMutAct_9fa48("13544") ? "" : (stryCov_9fa48("13544"), "Multa emitida"),
  CLOSURE_ORDERED: stryMutAct_9fa48("13545") ? "" : (stryCov_9fa48("13545"), "Clausura ordenada"),
  FORMAL_NOTICE_ISSUED: stryMutAct_9fa48("13546") ? "" : (stryCov_9fa48("13546"), "Aviso formal emitido"),
  DISMISSED: stryMutAct_9fa48("13547") ? "" : (stryCov_9fa48("13547"), "Desestimada por Faltas")
});
export type EnvironmentalReportClosure = {
  kind: "sanctioned";
  label: "Cierre por resolución de Faltas";
  description: string;
  outcome: SanctionOutcome;
} | {
  kind: "waiting";
  label: "Esperando resolución de Faltas";
  description: string;
  deadlineAt: string | null;
} | {
  kind: "deadline-pending";
  label: "Plazo de resolución vencido";
  description: string;
  deadlineAt: string;
} | {
  kind: "deadline";
  label: "Cierre automático por vencimiento";
  description: string;
  deadlineAt: string;
} | {
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
export type SanctionOutcomeIngestionResult = {
  disposition: "accepted";
  report: EnvironmentalReport;
  outcome: SanctionOutcome;
} | {
  disposition: "ignored";
  reason: "duplicate";
  report?: EnvironmentalReport;
} | {
  disposition: "integration-exception";
  exception: SanctionOutcomeIntegrationException;
};
function correlatedReport(outcome: SanctionOutcome, context: SanctionOutcomeIngestionContext): EnvironmentalReport | null {
  if (stryMutAct_9fa48("13548")) {
    {}
  } else {
    stryCov_9fa48("13548");
    const notice = context.notices.find(stryMutAct_9fa48("13549") ? () => undefined : (stryCov_9fa48("13549"), candidate => stryMutAct_9fa48("13552") ? candidate.id !== outcome.violationNoticeId : stryMutAct_9fa48("13551") ? false : stryMutAct_9fa48("13550") ? true : (stryCov_9fa48("13550", "13551", "13552"), candidate.id === outcome.violationNoticeId)));
    if (stryMutAct_9fa48("13555") ? false : stryMutAct_9fa48("13554") ? true : stryMutAct_9fa48("13553") ? notice : (stryCov_9fa48("13553", "13554", "13555"), !notice)) return null;
    const inspection = context.inspections.find(stryMutAct_9fa48("13556") ? () => undefined : (stryCov_9fa48("13556"), candidate => stryMutAct_9fa48("13559") ? candidate.id !== notice.inspectionId : stryMutAct_9fa48("13558") ? false : stryMutAct_9fa48("13557") ? true : (stryCov_9fa48("13557", "13558", "13559"), candidate.id === notice.inspectionId)));
    if (stryMutAct_9fa48("13562") ? false : stryMutAct_9fa48("13561") ? true : stryMutAct_9fa48("13560") ? inspection : (stryCov_9fa48("13560", "13561", "13562"), !inspection)) return null;
    return stryMutAct_9fa48("13563") ? context.reports.find(candidate => candidate.id === inspection.reportId) && null : (stryCov_9fa48("13563"), context.reports.find(stryMutAct_9fa48("13564") ? () => undefined : (stryCov_9fa48("13564"), candidate => stryMutAct_9fa48("13567") ? candidate.id !== inspection.reportId : stryMutAct_9fa48("13566") ? false : stryMutAct_9fa48("13565") ? true : (stryCov_9fa48("13565", "13566", "13567"), candidate.id === inspection.reportId))) ?? null);
  }
}
export function ingestSanctionOutcome(outcome: SanctionOutcome, context: SanctionOutcomeIngestionContext, now = new Date()): SanctionOutcomeIngestionResult {
  if (stryMutAct_9fa48("13568")) {
    {}
  } else {
    stryCov_9fa48("13568");
    const report = correlatedReport(outcome, context);
    if (stryMutAct_9fa48("13571") ? false : stryMutAct_9fa48("13570") ? true : stryMutAct_9fa48("13569") ? report : (stryCov_9fa48("13569", "13570", "13571"), !report)) {
      if (stryMutAct_9fa48("13572")) {
        {}
      } else {
        stryCov_9fa48("13572");
        return stryMutAct_9fa48("13573") ? {} : (stryCov_9fa48("13573"), {
          disposition: stryMutAct_9fa48("13574") ? "" : (stryCov_9fa48("13574"), "integration-exception"),
          exception: stryMutAct_9fa48("13575") ? {} : (stryCov_9fa48("13575"), {
            type: stryMutAct_9fa48("13576") ? "" : (stryCov_9fa48("13576"), "UNCORRELATED_SANCTION_OUTCOME"),
            violationNoticeId: outcome.violationNoticeId,
            externalRef: outcome.externalRef,
            receivedAt: now.toISOString(),
            message: stryMutAct_9fa48("13577") ? "" : (stryCov_9fa48("13577"), "La resolución de Faltas no coincide con ningún acta.")
          })
        });
      }
    }
    const duplicate = stryMutAct_9fa48("13578") ? context.outcomes.every(candidate => candidate.violationNoticeId === outcome.violationNoticeId || candidate.externalRef === outcome.externalRef) : (stryCov_9fa48("13578"), context.outcomes.some(stryMutAct_9fa48("13579") ? () => undefined : (stryCov_9fa48("13579"), candidate => stryMutAct_9fa48("13582") ? candidate.violationNoticeId === outcome.violationNoticeId && candidate.externalRef === outcome.externalRef : stryMutAct_9fa48("13581") ? false : stryMutAct_9fa48("13580") ? true : (stryCov_9fa48("13580", "13581", "13582"), (stryMutAct_9fa48("13584") ? candidate.violationNoticeId !== outcome.violationNoticeId : stryMutAct_9fa48("13583") ? false : (stryCov_9fa48("13583", "13584"), candidate.violationNoticeId === outcome.violationNoticeId)) || (stryMutAct_9fa48("13586") ? candidate.externalRef !== outcome.externalRef : stryMutAct_9fa48("13585") ? false : (stryCov_9fa48("13585", "13586"), candidate.externalRef === outcome.externalRef))))));
    if (stryMutAct_9fa48("13588") ? false : stryMutAct_9fa48("13587") ? true : (stryCov_9fa48("13587", "13588"), duplicate)) return stryMutAct_9fa48("13589") ? {} : (stryCov_9fa48("13589"), {
      disposition: stryMutAct_9fa48("13590") ? "" : (stryCov_9fa48("13590"), "ignored"),
      reason: stryMutAct_9fa48("13591") ? "" : (stryCov_9fa48("13591"), "duplicate"),
      report
    });
    return stryMutAct_9fa48("13592") ? {} : (stryCov_9fa48("13592"), {
      disposition: stryMutAct_9fa48("13593") ? "" : (stryCov_9fa48("13593"), "accepted"),
      outcome,
      report: stryMutAct_9fa48("13594") ? {} : (stryCov_9fa48("13594"), {
        ...report,
        status: (stryMutAct_9fa48("13597") ? report.status !== "CLOSED" : stryMutAct_9fa48("13596") ? false : stryMutAct_9fa48("13595") ? true : (stryCov_9fa48("13595", "13596", "13597"), report.status === (stryMutAct_9fa48("13598") ? "" : (stryCov_9fa48("13598"), "CLOSED")))) ? stryMutAct_9fa48("13599") ? "" : (stryCov_9fa48("13599"), "CLOSED") : stryMutAct_9fa48("13600") ? "" : (stryCov_9fa48("13600"), "SANCTIONED"),
        sanctionOutcome: outcome,
        updatedAt: now.toISOString()
      })
    });
  }
}
export function getEnvironmentalReportClosure(report: EnvironmentalReport, now = new Date()): EnvironmentalReportClosure | null {
  if (stryMutAct_9fa48("13601")) {
    {}
  } else {
    stryCov_9fa48("13601");
    if (stryMutAct_9fa48("13603") ? false : stryMutAct_9fa48("13602") ? true : (stryCov_9fa48("13602", "13603"), report.sanctionOutcome)) {
      if (stryMutAct_9fa48("13604")) {
        {}
      } else {
        stryCov_9fa48("13604");
        return stryMutAct_9fa48("13605") ? {} : (stryCov_9fa48("13605"), {
          kind: stryMutAct_9fa48("13606") ? "" : (stryCov_9fa48("13606"), "sanctioned"),
          label: stryMutAct_9fa48("13607") ? "" : (stryCov_9fa48("13607"), "Cierre por resolución de Faltas"),
          description: stryMutAct_9fa48("13608") ? `` : (stryCov_9fa48("13608"), `Faltas resolvió el acta: ${SANCTION_DECISION_LABELS[report.sanctionOutcome.decision]}.`),
          outcome: report.sanctionOutcome
        });
      }
    }
    const deadlineAt = report.deadlineAt;
    const deadline = deadlineAt ? Date.parse(deadlineAt) : Number.NaN;
    const deadlineElapsed = stryMutAct_9fa48("13611") ? !Number.isNaN(deadline) || deadline <= now.getTime() : stryMutAct_9fa48("13610") ? false : stryMutAct_9fa48("13609") ? true : (stryCov_9fa48("13609", "13610", "13611"), (stryMutAct_9fa48("13612") ? Number.isNaN(deadline) : (stryCov_9fa48("13612"), !Number.isNaN(deadline))) && (stryMutAct_9fa48("13615") ? deadline > now.getTime() : stryMutAct_9fa48("13614") ? deadline < now.getTime() : stryMutAct_9fa48("13613") ? true : (stryCov_9fa48("13613", "13614", "13615"), deadline <= now.getTime())));
    if (stryMutAct_9fa48("13618") ? report.status !== "NOTICE_ISSUED" : stryMutAct_9fa48("13617") ? false : stryMutAct_9fa48("13616") ? true : (stryCov_9fa48("13616", "13617", "13618"), report.status === (stryMutAct_9fa48("13619") ? "" : (stryCov_9fa48("13619"), "NOTICE_ISSUED")))) {
      if (stryMutAct_9fa48("13620")) {
        {}
      } else {
        stryCov_9fa48("13620");
        if (stryMutAct_9fa48("13623") ? deadlineElapsed || deadlineAt : stryMutAct_9fa48("13622") ? false : stryMutAct_9fa48("13621") ? true : (stryCov_9fa48("13621", "13622", "13623"), deadlineElapsed && deadlineAt)) {
          if (stryMutAct_9fa48("13624")) {
            {}
          } else {
            stryCov_9fa48("13624");
            return stryMutAct_9fa48("13625") ? {} : (stryCov_9fa48("13625"), {
              kind: stryMutAct_9fa48("13626") ? "" : (stryCov_9fa48("13626"), "deadline-pending"),
              label: stryMutAct_9fa48("13627") ? "" : (stryCov_9fa48("13627"), "Plazo de resolución vencido"),
              description: stryMutAct_9fa48("13628") ? "" : (stryCov_9fa48("13628"), "El expediente se cerrará automáticamente."),
              deadlineAt
            });
          }
        }
        return stryMutAct_9fa48("13629") ? {} : (stryCov_9fa48("13629"), {
          kind: stryMutAct_9fa48("13630") ? "" : (stryCov_9fa48("13630"), "waiting"),
          label: stryMutAct_9fa48("13631") ? "" : (stryCov_9fa48("13631"), "Esperando resolución de Faltas"),
          description: deadlineAt ? stryMutAct_9fa48("13632") ? `` : (stryCov_9fa48("13632"), `Faltas debe resolver antes del ${deadlineAt}.`) : stryMutAct_9fa48("13633") ? "" : (stryCov_9fa48("13633"), "Esperando la respuesta de Faltas."),
          deadlineAt: stryMutAct_9fa48("13634") ? deadlineAt && null : (stryCov_9fa48("13634"), deadlineAt ?? null)
        });
      }
    }
    if (stryMutAct_9fa48("13637") ? report.status === "CLOSED" : stryMutAct_9fa48("13636") ? false : stryMutAct_9fa48("13635") ? true : (stryCov_9fa48("13635", "13636", "13637"), report.status !== (stryMutAct_9fa48("13638") ? "" : (stryCov_9fa48("13638"), "CLOSED")))) return null;
    if (stryMutAct_9fa48("13641") ? deadlineElapsed || deadlineAt : stryMutAct_9fa48("13640") ? false : stryMutAct_9fa48("13639") ? true : (stryCov_9fa48("13639", "13640", "13641"), deadlineElapsed && deadlineAt)) {
      if (stryMutAct_9fa48("13642")) {
        {}
      } else {
        stryCov_9fa48("13642");
        return stryMutAct_9fa48("13643") ? {} : (stryCov_9fa48("13643"), {
          kind: stryMutAct_9fa48("13644") ? "" : (stryCov_9fa48("13644"), "deadline"),
          label: stryMutAct_9fa48("13645") ? "" : (stryCov_9fa48("13645"), "Cierre automático por vencimiento"),
          description: stryMutAct_9fa48("13646") ? "" : (stryCov_9fa48("13646"), "Se cerró sin resolución de Faltas."),
          deadlineAt
        });
      }
    }
    return stryMutAct_9fa48("13647") ? {} : (stryCov_9fa48("13647"), {
      kind: stryMutAct_9fa48("13648") ? "" : (stryCov_9fa48("13648"), "local"),
      label: stryMutAct_9fa48("13649") ? "" : (stryCov_9fa48("13649"), "Cierre local"),
      description: stryMutAct_9fa48("13650") ? "" : (stryCov_9fa48("13650"), "Se cerró sin resolución de Faltas.")
    });
  }
}
export { sanctionOutcomeIntegrationExceptionSchema, sanctionOutcomeSchema, type SanctionOutcome, type SanctionOutcomeIntegrationException } from "./environmental-reports";