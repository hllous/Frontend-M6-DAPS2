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
import { argentinaDay, todayInArgentina } from "./argentina-date";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { tolerantRecords } from "./tolerant-records";
export const treeHealthStatusSchema = z.enum(stryMutAct_9fa48("16593") ? [] : (stryCov_9fa48("16593"), [stryMutAct_9fa48("16594") ? "" : (stryCov_9fa48("16594"), "HEALTHY"), stryMutAct_9fa48("16595") ? "" : (stryCov_9fa48("16595"), "WEAKENED"), stryMutAct_9fa48("16596") ? "" : (stryCov_9fa48("16596"), "DISEASED"), stryMutAct_9fa48("16597") ? "" : (stryCov_9fa48("16597"), "DEAD")]));
export type TreeHealthStatus = z.infer<typeof treeHealthStatusSchema>;
export const riskLevelSchema = z.enum(stryMutAct_9fa48("16598") ? [] : (stryCov_9fa48("16598"), [stryMutAct_9fa48("16599") ? "" : (stryCov_9fa48("16599"), "NONE"), stryMutAct_9fa48("16600") ? "" : (stryCov_9fa48("16600"), "LOW"), stryMutAct_9fa48("16601") ? "" : (stryCov_9fa48("16601"), "MEDIUM"), stryMutAct_9fa48("16602") ? "" : (stryCov_9fa48("16602"), "HIGH"), stryMutAct_9fa48("16603") ? "" : (stryCov_9fa48("16603"), "CRITICAL")]));
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = stryMutAct_9fa48("16604") ? {} : (stryCov_9fa48("16604"), {
  NONE: stryMutAct_9fa48("16605") ? "" : (stryCov_9fa48("16605"), "Sin riesgo"),
  LOW: stryMutAct_9fa48("16606") ? "" : (stryCov_9fa48("16606"), "Bajo"),
  MEDIUM: stryMutAct_9fa48("16607") ? "" : (stryCov_9fa48("16607"), "Medio"),
  HIGH: stryMutAct_9fa48("16608") ? "" : (stryCov_9fa48("16608"), "Alto"),
  CRITICAL: stryMutAct_9fa48("16609") ? "" : (stryCov_9fa48("16609"), "Crítico")
});
export const riskTypeSchema = z.enum(stryMutAct_9fa48("16610") ? [] : (stryCov_9fa48("16610"), [stryMutAct_9fa48("16611") ? "" : (stryCov_9fa48("16611"), "FALLING_BRANCH"), stryMutAct_9fa48("16612") ? "" : (stryCov_9fa48("16612"), "TRUNK_INSTABILITY"), stryMutAct_9fa48("16613") ? "" : (stryCov_9fa48("16613"), "ROOT_UPLIFT"), stryMutAct_9fa48("16614") ? "" : (stryCov_9fa48("16614"), "POWER_LINE_CONTACT"), stryMutAct_9fa48("16615") ? "" : (stryCov_9fa48("16615"), "SIGN_OBSTRUCTION"), stryMutAct_9fa48("16616") ? "" : (stryCov_9fa48("16616"), "PEST_INFESTATION")]));
export type RiskType = z.infer<typeof riskTypeSchema>;
export const treeInterventionTypeSchema = z.enum(stryMutAct_9fa48("16617") ? [] : (stryCov_9fa48("16617"), [stryMutAct_9fa48("16618") ? "" : (stryCov_9fa48("16618"), "FORMATION_PRUNING"), stryMutAct_9fa48("16619") ? "" : (stryCov_9fa48("16619"), "SAFETY_PRUNING"), stryMutAct_9fa48("16620") ? "" : (stryCov_9fa48("16620"), "REMOVAL"), stryMutAct_9fa48("16621") ? "" : (stryCov_9fa48("16621"), "PLANTING"), stryMutAct_9fa48("16622") ? "" : (stryCov_9fa48("16622"), "TREATMENT")]));
export type TreeInterventionType = z.infer<typeof treeInterventionTypeSchema>;
export const treeSurveySchema = z.object(stryMutAct_9fa48("16623") ? {} : (stryCov_9fa48("16623"), {
  id: z.string(),
  treeId: z.string(),
  surveyedAt: z.string(),
  inspectorId: z.string().nullable(),
  healthStatus: treeHealthStatusSchema,
  riskLevel: riskLevelSchema,
  riskType: riskTypeSchema.nullable(),
  suggestedIntervention: treeInterventionTypeSchema.nullable(),
  requiresStreetClosure: z.boolean(),
  requiresPublicWorks: z.boolean(),
  notes: z.string().nullable()
}));
export type TreeSurvey = z.infer<typeof treeSurveySchema>;
export const treeSurveyCreateInputSchema = z.object(stryMutAct_9fa48("16624") ? {} : (stryCov_9fa48("16624"), {
  surveyedAt: stryMutAct_9fa48("16626") ? z.string().min(1, "La fecha del relevamiento es obligatoria.").refine(value => {
    const day = argentinaDay(value);
    return day === null || day <= todayInArgentina();
  }, "La fecha del relevamiento no puede ser futura.") : stryMutAct_9fa48("16625") ? z.string().trim().max(1, "La fecha del relevamiento es obligatoria.").refine(value => {
    const day = argentinaDay(value);
    return day === null || day <= todayInArgentina();
  }, "La fecha del relevamiento no puede ser futura.") : (stryCov_9fa48("16625", "16626"), z.string().trim().min(1, stryMutAct_9fa48("16627") ? "" : (stryCov_9fa48("16627"), "La fecha del relevamiento es obligatoria.")).refine(value => {
    if (stryMutAct_9fa48("16628")) {
      {}
    } else {
      stryCov_9fa48("16628");
      const day = argentinaDay(value);
      return stryMutAct_9fa48("16631") ? day === null && day <= todayInArgentina() : stryMutAct_9fa48("16630") ? false : stryMutAct_9fa48("16629") ? true : (stryCov_9fa48("16629", "16630", "16631"), (stryMutAct_9fa48("16633") ? day !== null : stryMutAct_9fa48("16632") ? false : (stryCov_9fa48("16632", "16633"), day === null)) || (stryMutAct_9fa48("16636") ? day > todayInArgentina() : stryMutAct_9fa48("16635") ? day < todayInArgentina() : stryMutAct_9fa48("16634") ? false : (stryCov_9fa48("16634", "16635", "16636"), day <= todayInArgentina())));
    }
  }, stryMutAct_9fa48("16637") ? "" : (stryCov_9fa48("16637"), "La fecha del relevamiento no puede ser futura."))),
  healthStatus: treeHealthStatusSchema,
  riskLevel: riskLevelSchema,
  riskType: riskTypeSchema.optional(),
  suggestedIntervention: treeInterventionTypeSchema.optional(),
  requiresStreetClosure: z.boolean(),
  requiresPublicWorks: z.boolean(),
  notes: stryMutAct_9fa48("16639") ? z.string().max(2000, "Las observaciones no pueden superar los 2000 caracteres.").optional() : stryMutAct_9fa48("16638") ? z.string().trim().min(2000, "Las observaciones no pueden superar los 2000 caracteres.").optional() : (stryCov_9fa48("16638", "16639"), z.string().trim().max(2000, stryMutAct_9fa48("16640") ? "" : (stryCov_9fa48("16640"), "Las observaciones no pueden superar los 2000 caracteres.")).optional())
})).refine(stryMutAct_9fa48("16641") ? () => undefined : (stryCov_9fa48("16641"), input => stryMutAct_9fa48("16644") ? !["HIGH", "CRITICAL"].includes(input.riskLevel) && Boolean(input.riskType) : stryMutAct_9fa48("16643") ? false : stryMutAct_9fa48("16642") ? true : (stryCov_9fa48("16642", "16643", "16644"), (stryMutAct_9fa48("16645") ? ["HIGH", "CRITICAL"].includes(input.riskLevel) : (stryCov_9fa48("16645"), !(stryMutAct_9fa48("16646") ? [] : (stryCov_9fa48("16646"), [stryMutAct_9fa48("16647") ? "" : (stryCov_9fa48("16647"), "HIGH"), stryMutAct_9fa48("16648") ? "" : (stryCov_9fa48("16648"), "CRITICAL")])).includes(input.riskLevel))) || Boolean(input.riskType))), stryMutAct_9fa48("16649") ? {} : (stryCov_9fa48("16649"), {
  path: stryMutAct_9fa48("16650") ? [] : (stryCov_9fa48("16650"), [stryMutAct_9fa48("16651") ? "" : (stryCov_9fa48("16651"), "riskType")]),
  message: stryMutAct_9fa48("16652") ? "" : (stryCov_9fa48("16652"), "Indique el tipo de riesgo para niveles altos o críticos.")
}));
export type TreeSurveyCreateInput = z.infer<typeof treeSurveyCreateInputSchema>;
export type TreeSurveyQuery = {
  healthStatus?: TreeHealthStatus;
  riskLevel?: RiskLevel;
  page?: number;
  pageSize?: number;
};
export type TreeSurveysPage = {
  surveys: TreeSurvey[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class TreeSurveyContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16653")) {
      {}
    } else {
      stryCov_9fa48("16653");
      super(message, options);
      this.name = stryMutAct_9fa48("16654") ? "" : (stryCov_9fa48("16654"), "TreeSurveyContractError");
    }
  }
}
export class TreeSurveyRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16655")) {
      {}
    } else {
      stryCov_9fa48("16655");
      super(message, options);
      this.name = stryMutAct_9fa48("16656") ? "" : (stryCov_9fa48("16656"), "TreeSurveyRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("16657") ? {} : (stryCov_9fa48("16657"), {
  data: tolerantRecords(treeSurveySchema, stryMutAct_9fa48("16658") ? "" : (stryCov_9fa48("16658"), "tree-surveys")),
  meta: z.object(stryMutAct_9fa48("16659") ? {} : (stryCov_9fa48("16659"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("16660") ? {} : (stryCov_9fa48("16660"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("16661") ? [] : (stryCov_9fa48("16661"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
const labels = stryMutAct_9fa48("16662") ? {} : (stryCov_9fa48("16662"), {
  treeSurveys: stryMutAct_9fa48("16663") ? "" : (stryCov_9fa48("16663"), "relevamientos de arbolado"),
  treeSurvey: stryMutAct_9fa48("16664") ? "" : (stryCov_9fa48("16664"), "relevamiento de arbolado")
});
function queryString(query: TreeSurveyQuery) {
  if (stryMutAct_9fa48("16665")) {
    {}
  } else {
    stryCov_9fa48("16665");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("16667") ? false : stryMutAct_9fa48("16666") ? true : (stryCov_9fa48("16666", "16667"), query.healthStatus)) params.set(stryMutAct_9fa48("16669") ? "" : (stryCov_9fa48("16669"), "healthStatus"), query.healthStatus);
    if (stryMutAct_9fa48("16671") ? false : stryMutAct_9fa48("16670") ? true : (stryCov_9fa48("16670", "16671"), query.riskLevel)) params.set(stryMutAct_9fa48("16673") ? "" : (stryCov_9fa48("16673"), "riskLevel"), query.riskLevel);
    if (stryMutAct_9fa48("16676") ? query.page === undefined : stryMutAct_9fa48("16675") ? false : stryMutAct_9fa48("16674") ? true : (stryCov_9fa48("16674", "16675", "16676"), query.page !== undefined)) params.set(stryMutAct_9fa48("16678") ? "" : (stryCov_9fa48("16678"), "page"), String(query.page));
    if (stryMutAct_9fa48("16681") ? query.pageSize === undefined : stryMutAct_9fa48("16680") ? false : stryMutAct_9fa48("16679") ? true : (stryCov_9fa48("16679", "16680", "16681"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("16683") ? "" : (stryCov_9fa48("16683"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("16684") ? `` : (stryCov_9fa48("16684"), `?${value}`) : stryMutAct_9fa48("16685") ? "Stryker was here!" : (stryCov_9fa48("16685"), "");
  }
}
async function request(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("16686")) {
    {}
  } else {
    stryCov_9fa48("16686");
    let response: Response;
    try {
      if (stryMutAct_9fa48("16687")) {
        {}
      } else {
        stryCov_9fa48("16687");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16688")) {
        {}
      } else {
        stryCov_9fa48("16688");
        if (stryMutAct_9fa48("16690") ? false : stryMutAct_9fa48("16689") ? true : (stryCov_9fa48("16689", "16690"), cause instanceof NetworkFailureError)) recordTelemetryEvent(stryMutAct_9fa48("16692") ? {} : (stryCov_9fa48("16692"), {
          name: stryMutAct_9fa48("16693") ? "" : (stryCov_9fa48("16693"), "request_network_failure"),
          resource: stryMutAct_9fa48("16694") ? "" : (stryCov_9fa48("16694"), "tree-surveys")
        }));
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("16695")) {
        {}
      } else {
        stryCov_9fa48("16695");
        payload = (stryMutAct_9fa48("16698") ? response.status !== 204 : stryMutAct_9fa48("16697") ? false : stryMutAct_9fa48("16696") ? true : (stryCov_9fa48("16696", "16697", "16698"), response.status === 204)) ? undefined : await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16699")) {
        {}
      } else {
        stryCov_9fa48("16699");
        recordTelemetryEvent(stryMutAct_9fa48("16701") ? {} : (stryCov_9fa48("16701"), {
          name: stryMutAct_9fa48("16702") ? "" : (stryCov_9fa48("16702"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16703") ? "" : (stryCov_9fa48("16703"), "tree-surveys")
        }));
        throw new TreeSurveyContractError(stryMutAct_9fa48("16705") ? `` : (stryCov_9fa48("16705"), `No se pudo obtener información válida de ${labels.treeSurveys}. Reintente en unos segundos.`), stryMutAct_9fa48("16706") ? {} : (stryCov_9fa48("16706"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("16709") ? false : stryMutAct_9fa48("16708") ? true : stryMutAct_9fa48("16707") ? response.ok : (stryCov_9fa48("16707", "16708", "16709"), !response.ok)) {
      if (stryMutAct_9fa48("16710")) {
        {}
      } else {
        stryCov_9fa48("16710");
        const parsedError = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("16713") ? false : stryMutAct_9fa48("16712") ? true : stryMutAct_9fa48("16711") ? parsedError.success : (stryCov_9fa48("16711", "16712", "16713"), !parsedError.success)) throw new TreeSurveyContractError(stryMutAct_9fa48("16715") ? "" : (stryCov_9fa48("16715"), "No se pudo obtener información válida de relevamientos. Reintente en unos segundos."), stryMutAct_9fa48("16716") ? {} : (stryCov_9fa48("16716"), {
          cause: parsedError.error
        }));
        const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("16717") ? "" : (stryCov_9fa48("16717"), " ")) : parsedError.data.message;
        if (stryMutAct_9fa48("16718")) {
          ;
        } else {
          stryCov_9fa48("16718");
          throw new TreeSurveyRequestError(message, parsedError.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function parseSurvey(payload: unknown, message: string) {
  if (stryMutAct_9fa48("16719")) {
    {}
  } else {
    stryCov_9fa48("16719");
    const parsed = treeSurveySchema.safeParse(payload);
    if (stryMutAct_9fa48("16722") ? false : stryMutAct_9fa48("16721") ? true : stryMutAct_9fa48("16720") ? parsed.success : (stryCov_9fa48("16720", "16721", "16722"), !parsed.success)) {
      if (stryMutAct_9fa48("16723")) {
        {}
      } else {
        stryCov_9fa48("16723");
        recordTelemetryEvent(stryMutAct_9fa48("16725") ? {} : (stryCov_9fa48("16725"), {
          name: stryMutAct_9fa48("16726") ? "" : (stryCov_9fa48("16726"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16727") ? "" : (stryCov_9fa48("16727"), "tree-surveys")
        }));
        throw new TreeSurveyContractError(message, stryMutAct_9fa48("16729") ? {} : (stryCov_9fa48("16729"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const treeSurveysAdapter = stryMutAct_9fa48("16730") ? {} : (stryCov_9fa48("16730"), {
  async getTreeSurveys(treeId: string, query: TreeSurveyQuery = {}): Promise<TreeSurveysPage> {
    if (stryMutAct_9fa48("16731")) {
      {}
    } else {
      stryCov_9fa48("16731");
      const payload = await request(stryMutAct_9fa48("16732") ? `` : (stryCov_9fa48("16732"), `/api/trees/${encodeURIComponent(treeId)}/surveys${queryString(query)}`));
      const parsed = pageSchema.safeParse(payload);
      if (stryMutAct_9fa48("16735") ? false : stryMutAct_9fa48("16734") ? true : stryMutAct_9fa48("16733") ? parsed.success : (stryCov_9fa48("16733", "16734", "16735"), !parsed.success)) throw new TreeSurveyContractError(stryMutAct_9fa48("16737") ? "" : (stryCov_9fa48("16737"), "No se pudo obtener información válida del historial de relevamientos. Reintente en unos segundos."), stryMutAct_9fa48("16738") ? {} : (stryCov_9fa48("16738"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("16739") ? {} : (stryCov_9fa48("16739"), {
        surveys: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async createTreeSurvey(treeId: string, input: TreeSurveyCreateInput): Promise<TreeSurvey> {
    if (stryMutAct_9fa48("16740")) {
      {}
    } else {
      stryCov_9fa48("16740");
      const parsedInput = treeSurveyCreateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("16743") ? false : stryMutAct_9fa48("16742") ? true : stryMutAct_9fa48("16741") ? parsedInput.success : (stryCov_9fa48("16741", "16742", "16743"), !parsedInput.success)) throw new TreeSurveyContractError(stryMutAct_9fa48("16745") ? "" : (stryCov_9fa48("16745"), "Los datos del relevamiento son inválidos."), stryMutAct_9fa48("16746") ? {} : (stryCov_9fa48("16746"), {
        cause: parsedInput.error
      }));
      return parseSurvey(await request(stryMutAct_9fa48("16747") ? `` : (stryCov_9fa48("16747"), `/api/trees/${encodeURIComponent(treeId)}/surveys`), stryMutAct_9fa48("16748") ? {} : (stryCov_9fa48("16748"), {
        method: stryMutAct_9fa48("16749") ? "" : (stryCov_9fa48("16749"), "POST"),
        headers: stryMutAct_9fa48("16750") ? {} : (stryCov_9fa48("16750"), {
          "content-type": stryMutAct_9fa48("16751") ? "" : (stryCov_9fa48("16751"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("16752") ? "" : (stryCov_9fa48("16752"), "No se pudo obtener información válida de la creación del relevamiento. Reintente en unos segundos."));
    }
  },
  async getTreeSurvey(treeId: string, surveyId: string): Promise<TreeSurvey> {
    if (stryMutAct_9fa48("16753")) {
      {}
    } else {
      stryCov_9fa48("16753");
      return parseSurvey(await request(stryMutAct_9fa48("16754") ? `` : (stryCov_9fa48("16754"), `/api/trees/${encodeURIComponent(treeId)}/surveys/${encodeURIComponent(surveyId)}`)), stryMutAct_9fa48("16755") ? "" : (stryCov_9fa48("16755"), "No se pudo obtener información válida del detalle del relevamiento. Reintente en unos segundos."));
    }
  }
});