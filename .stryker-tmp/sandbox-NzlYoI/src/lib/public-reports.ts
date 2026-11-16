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
import { environmentalReportTypeSchema } from "./environmental-reports";

/** Contrato del seguimiento público (`GET /public/reports/:ticketId`). Solo lo que el backend publica para el vecino. */
export const publicReportStageSchema = z.enum(stryMutAct_9fa48("12452") ? [] : (stryCov_9fa48("12452"), [stryMutAct_9fa48("12453") ? "" : (stryCov_9fa48("12453"), "RECIBIDA"), stryMutAct_9fa48("12454") ? "" : (stryCov_9fa48("12454"), "EN_ANALISIS"), stryMutAct_9fa48("12455") ? "" : (stryCov_9fa48("12455"), "INSPECCION_PROGRAMADA"), stryMutAct_9fa48("12456") ? "" : (stryCov_9fa48("12456"), "INSPECCIONADA"), stryMutAct_9fa48("12457") ? "" : (stryCov_9fa48("12457"), "EN_TRAMITE_SANCIONATORIO"), stryMutAct_9fa48("12458") ? "" : (stryCov_9fa48("12458"), "DERIVADA"), stryMutAct_9fa48("12459") ? "" : (stryCov_9fa48("12459"), "CERRADA")]));
export type PublicReportStage = z.infer<typeof publicReportStageSchema>;
export const publicReportSchema = z.object(stryMutAct_9fa48("12460") ? {} : (stryCov_9fa48("12460"), {
  ticketId: z.string(),
  publicId: z.string().nullish(),
  reportType: environmentalReportTypeSchema,
  stage: publicReportStageSchema,
  stageLabel: z.string(),
  address: z.string().nullish(),
  openedAt: z.string(),
  lastUpdateAt: z.string(),
  inspectedAt: z.string().nullish(),
  closed: z.boolean()
}));
export type PublicReport = z.infer<typeof publicReportSchema>;
const UUID_PATTERN = stryMutAct_9fa48("12472") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[^0-9a-f]{12}$/i : stryMutAct_9fa48("12471") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]$/i : stryMutAct_9fa48("12470") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[^0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("12469") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]-[0-9a-f]{12}$/i : stryMutAct_9fa48("12468") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[^0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("12467") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("12466") ? /^[0-9a-f]{8}-[^0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("12465") ? /^[0-9a-f]{8}-[0-9a-f]-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("12464") ? /^[^0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("12463") ? /^[0-9a-f]-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("12462") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i : stryMutAct_9fa48("12461") ? /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : (stryCov_9fa48("12461", "12462", "12463", "12464", "12465", "12466", "12467", "12468", "12469", "12470", "12471", "12472"), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
export function isTicketId(value: string): boolean {
  if (stryMutAct_9fa48("12473")) {
    {}
  } else {
    stryCov_9fa48("12473");
    return UUID_PATTERN.test(value);
  }
}
export const PUBLIC_REPORT_MESSAGES = {
  malformed: "Ese código no tiene el formato correcto. Copialo tal cual figura en tu comprobante.",
  readableReference: "Ese es el número de referencia de tu denuncia, pero para consultar necesitás el código de seguimiento, que es otro. Buscalo en tu comprobante.",
  notFound: "No encontramos una denuncia con ese código. Revisá que sea el código de seguimiento de tu comprobante.",
  rateLimited: "Hiciste muchas consultas seguidas. Probá de nuevo en un minuto.",
  unavailable: "El servicio no responde en este momento."
} as const;
export type PublicReportLookupFailure = keyof typeof PUBLIC_REPORT_MESSAGES;

/** Valida lo que escribió la persona antes de gastar una consulta. */
export function checkTicketInput(raw: string): {
  ticketId: string;
} | {
  failure: "malformed" | "readableReference";
} {
  if (stryMutAct_9fa48("12474")) {
    {}
  } else {
    stryCov_9fa48("12474");
    const value = stryMutAct_9fa48("12475") ? raw : (stryCov_9fa48("12475"), raw.trim());
    if (stryMutAct_9fa48("12477") ? false : stryMutAct_9fa48("12476") ? true : (stryCov_9fa48("12476", "12477"), (stryMutAct_9fa48("12478") ? /TK-/i : (stryCov_9fa48("12478"), /^TK-/i)).test(value))) return stryMutAct_9fa48("12479") ? {} : (stryCov_9fa48("12479"), {
      failure: stryMutAct_9fa48("12480") ? "" : (stryCov_9fa48("12480"), "readableReference")
    });
    if (stryMutAct_9fa48("12483") ? false : stryMutAct_9fa48("12482") ? true : stryMutAct_9fa48("12481") ? isTicketId(value) : (stryCov_9fa48("12481", "12482", "12483"), !isTicketId(value))) return stryMutAct_9fa48("12484") ? {} : (stryCov_9fa48("12484"), {
      failure: stryMutAct_9fa48("12485") ? "" : (stryCov_9fa48("12485"), "malformed")
    });
    return stryMutAct_9fa48("12486") ? {} : (stryCov_9fa48("12486"), {
      ticketId: stryMutAct_9fa48("12487") ? value.toUpperCase() : (stryCov_9fa48("12487"), value.toLowerCase())
    });
  }
}
export type PublicReportLookup = {
  ok: true;
  report: PublicReport;
} | {
  ok: false;
  failure: PublicReportLookupFailure;
};

/** Consulta el BFF público. Nunca devuelve el cuerpo crudo: una respuesta fuera de contrato es "no responde". */
export async function fetchPublicReport(ticketId: string, signal?: AbortSignal): Promise<PublicReportLookup> {
  if (stryMutAct_9fa48("12488")) {
    {}
  } else {
    stryCov_9fa48("12488");
    let response: Response;
    try {
      if (stryMutAct_9fa48("12489")) {
        {}
      } else {
        stryCov_9fa48("12489");
        response = await fetch(stryMutAct_9fa48("12490") ? `` : (stryCov_9fa48("12490"), `/api/public/reports/${encodeURIComponent(ticketId)}`), stryMutAct_9fa48("12491") ? {} : (stryCov_9fa48("12491"), {
          signal,
          cache: stryMutAct_9fa48("12492") ? "" : (stryCov_9fa48("12492"), "no-store")
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("12493")) {
        {}
      } else {
        stryCov_9fa48("12493");
        if (stryMutAct_9fa48("12496") ? signal.aborted : stryMutAct_9fa48("12495") ? false : stryMutAct_9fa48("12494") ? true : (stryCov_9fa48("12494", "12495", "12496"), signal?.aborted)) throw error;
        return stryMutAct_9fa48("12497") ? {} : (stryCov_9fa48("12497"), {
          ok: stryMutAct_9fa48("12498") ? true : (stryCov_9fa48("12498"), false),
          failure: stryMutAct_9fa48("12499") ? "" : (stryCov_9fa48("12499"), "unavailable")
        });
      }
    }
    if (stryMutAct_9fa48("12502") ? response.status !== 404 : stryMutAct_9fa48("12501") ? false : stryMutAct_9fa48("12500") ? true : (stryCov_9fa48("12500", "12501", "12502"), response.status === 404)) return stryMutAct_9fa48("12503") ? {} : (stryCov_9fa48("12503"), {
      ok: stryMutAct_9fa48("12504") ? true : (stryCov_9fa48("12504"), false),
      failure: stryMutAct_9fa48("12505") ? "" : (stryCov_9fa48("12505"), "notFound")
    });
    if (stryMutAct_9fa48("12508") ? response.status !== 429 : stryMutAct_9fa48("12507") ? false : stryMutAct_9fa48("12506") ? true : (stryCov_9fa48("12506", "12507", "12508"), response.status === 429)) return stryMutAct_9fa48("12509") ? {} : (stryCov_9fa48("12509"), {
      ok: stryMutAct_9fa48("12510") ? true : (stryCov_9fa48("12510"), false),
      failure: stryMutAct_9fa48("12511") ? "" : (stryCov_9fa48("12511"), "rateLimited")
    });
    if (stryMutAct_9fa48("12514") ? response.status !== 400 : stryMutAct_9fa48("12513") ? false : stryMutAct_9fa48("12512") ? true : (stryCov_9fa48("12512", "12513", "12514"), response.status === 400)) return stryMutAct_9fa48("12515") ? {} : (stryCov_9fa48("12515"), {
      ok: stryMutAct_9fa48("12516") ? true : (stryCov_9fa48("12516"), false),
      failure: stryMutAct_9fa48("12517") ? "" : (stryCov_9fa48("12517"), "malformed")
    });
    if (stryMutAct_9fa48("12520") ? false : stryMutAct_9fa48("12519") ? true : stryMutAct_9fa48("12518") ? response.ok : (stryCov_9fa48("12518", "12519", "12520"), !response.ok)) return stryMutAct_9fa48("12521") ? {} : (stryCov_9fa48("12521"), {
      ok: stryMutAct_9fa48("12522") ? true : (stryCov_9fa48("12522"), false),
      failure: stryMutAct_9fa48("12523") ? "" : (stryCov_9fa48("12523"), "unavailable")
    });
    const parsed = publicReportSchema.safeParse(await response.json().catch(() => undefined));
    return parsed.success ? stryMutAct_9fa48("12524") ? {} : (stryCov_9fa48("12524"), {
      ok: stryMutAct_9fa48("12525") ? false : (stryCov_9fa48("12525"), true),
      report: parsed.data
    }) : stryMutAct_9fa48("12526") ? {} : (stryCov_9fa48("12526"), {
      ok: stryMutAct_9fa48("12527") ? true : (stryCov_9fa48("12527"), false),
      failure: stryMutAct_9fa48("12528") ? "" : (stryCov_9fa48("12528"), "unavailable")
    });
  }
}