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
import { findServiceFixture } from "@/lib/bff-service-mock";
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, requireCrewScope } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getZoneResultsByServiceId, serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { MAX_NOTES_LENGTH } from "@/lib/input-limits";
import { completeServiceInputSchema, type CompleteServiceInput, type ServiceStatus } from "@/lib/services";
import { completeRepairFixture, confirmRelocationFixture, containerFixtures, emptyContainerFixture, getContainerFixture } from "@/lib/containers-fixtures";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
function findTargetContainer(service: typeof serviceFixtures[number]) {
  if (stryMutAct_9fa48("4812")) {
    {}
  } else {
    stryCov_9fa48("4812");
    if (stryMutAct_9fa48("4815") ? service.mode !== "POINT" && service.targetType !== "CONTAINER" : stryMutAct_9fa48("4814") ? false : stryMutAct_9fa48("4813") ? true : (stryCov_9fa48("4813", "4814", "4815"), (stryMutAct_9fa48("4817") ? service.mode === "POINT" : stryMutAct_9fa48("4816") ? false : (stryCov_9fa48("4816", "4817"), service.mode !== (stryMutAct_9fa48("4818") ? "" : (stryCov_9fa48("4818"), "POINT")))) || (stryMutAct_9fa48("4820") ? service.targetType === "CONTAINER" : stryMutAct_9fa48("4819") ? false : (stryCov_9fa48("4819", "4820"), service.targetType !== (stryMutAct_9fa48("4821") ? "" : (stryCov_9fa48("4821"), "CONTAINER")))))) return null;
    return stryMutAct_9fa48("4822") ? (service.targetId ? getContainerFixture(service.targetId) : null) && (service.targetRef ? containerFixtures.find(container => container.code === service.targetRef) ?? null : null) : (stryCov_9fa48("4822"), (service.targetId ? getContainerFixture(service.targetId) : null) ?? (service.targetRef ? stryMutAct_9fa48("4823") ? containerFixtures.find(container => container.code === service.targetRef) && null : (stryCov_9fa48("4823"), containerFixtures.find(stryMutAct_9fa48("4824") ? () => undefined : (stryCov_9fa48("4824"), container => stryMutAct_9fa48("4827") ? container.code !== service.targetRef : stryMutAct_9fa48("4826") ? false : stryMutAct_9fa48("4825") ? true : (stryCov_9fa48("4825", "4826", "4827"), container.code === service.targetRef))) ?? null) : null));
  }
}
function transitionTargetContainer(service: typeof serviceFixtures[number], input: CompleteServiceInput) {
  if (stryMutAct_9fa48("4828")) {
    {}
  } else {
    stryCov_9fa48("4828");
    const container = findTargetContainer(service);
    if (stryMutAct_9fa48("4831") ? false : stryMutAct_9fa48("4830") ? true : stryMutAct_9fa48("4829") ? container : (stryCov_9fa48("4829", "4830", "4831"), !container)) return;
    switch (container.status) {
      case stryMutAct_9fa48("4833") ? "" : (stryCov_9fa48("4833"), "OVERFLOWED"):
        if (stryMutAct_9fa48("4832")) {} else {
          stryCov_9fa48("4832");
          if (stryMutAct_9fa48("4834")) {
            ;
          } else {
            stryCov_9fa48("4834");
            emptyContainerFixture(container.id);
          }
          break;
        }
      case stryMutAct_9fa48("4836") ? "" : (stryCov_9fa48("4836"), "UNDER_REPAIR"):
        if (stryMutAct_9fa48("4835")) {} else {
          stryCov_9fa48("4835");
          if (stryMutAct_9fa48("4837")) {
            ;
          } else {
            stryCov_9fa48("4837");
            completeRepairFixture(container.id);
          }
          break;
        }
      case stryMutAct_9fa48("4839") ? "" : (stryCov_9fa48("4839"), "RELOCATING"):
        if (stryMutAct_9fa48("4838")) {} else {
          stryCov_9fa48("4838");
          if (stryMutAct_9fa48("4842") ? false : stryMutAct_9fa48("4841") ? true : stryMutAct_9fa48("4840") ? input.containerLocation : (stryCov_9fa48("4840", "4841", "4842"), !input.containerLocation)) {
            if (stryMutAct_9fa48("4843")) {
              {}
            } else {
              stryCov_9fa48("4843");
              throw new Error(stryMutAct_9fa48("4845") ? "" : (stryCov_9fa48("4845"), "CONTAINER_LOCATION_REQUIRED"));
            }
          }
          if (stryMutAct_9fa48("4846")) {
            ;
          } else {
            stryCov_9fa48("4846");
            confirmRelocationFixture(container.id, input.containerLocation);
          }
          break;
        }
      default:
        if (stryMutAct_9fa48("4847")) {} else {
          stryCov_9fa48("4847");
          break;
        }
    }
  }
}

// Cada nota de zona ya es libre; unidas pueden superar el tope de notas del backend.
// Se corta con una elipsis en lugar de rechazar el cierre.
function capStatusReason(value: string): string {
  if (stryMutAct_9fa48("4848")) {
    {}
  } else {
    stryCov_9fa48("4848");
    return (stryMutAct_9fa48("4852") ? value.length <= MAX_NOTES_LENGTH : stryMutAct_9fa48("4851") ? value.length >= MAX_NOTES_LENGTH : stryMutAct_9fa48("4850") ? false : stryMutAct_9fa48("4849") ? true : (stryCov_9fa48("4849", "4850", "4851", "4852"), value.length > MAX_NOTES_LENGTH)) ? stryMutAct_9fa48("4853") ? `` : (stryCov_9fa48("4853"), `${stryMutAct_9fa48("4854") ? value : (stryCov_9fa48("4854"), value.slice(0, stryMutAct_9fa48("4855") ? MAX_NOTES_LENGTH + 1 : (stryCov_9fa48("4855"), MAX_NOTES_LENGTH - 1)))}…`) : value;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("4856")) {
    {}
  } else {
    stryCov_9fa48("4856");
    const params = await context.params;
    const serviceId = params.id;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4857")) {
        {}
      } else {
        stryCov_9fa48("4857");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        authorize(session, stryMutAct_9fa48("4859") ? {} : (stryCov_9fa48("4859"), {
          capability: stryMutAct_9fa48("4860") ? "" : (stryCov_9fa48("4860"), "service:execute"),
          capabilityMessage: stryMutAct_9fa48("4861") ? "" : (stryCov_9fa48("4861"), "No tiene permisos para completar el servicio. Solo la persona responsable de la cuadrilla puede hacerlo."),
          throwOnError: stryMutAct_9fa48("4862") ? false : (stryCov_9fa48("4862"), true)
        }));
        let completionInput: CompleteServiceInput = {};
        const requestBody = await request.text();
        if (stryMutAct_9fa48("4865") ? requestBody : stryMutAct_9fa48("4864") ? false : stryMutAct_9fa48("4863") ? true : (stryCov_9fa48("4863", "4864", "4865"), requestBody.trim())) {
          if (stryMutAct_9fa48("4866")) {
            {}
          } else {
            stryCov_9fa48("4866");
            let parsedBody: unknown;
            try {
              if (stryMutAct_9fa48("4867")) {
                {}
              } else {
                stryCov_9fa48("4867");
                parsedBody = JSON.parse(requestBody);
              }
            } catch {
              if (stryMutAct_9fa48("4868")) {
                {}
              } else {
                stryCov_9fa48("4868");
                return errorResponse(400, stryMutAct_9fa48("4869") ? "" : (stryCov_9fa48("4869"), "El cuerpo de la solicitud debe ser un JSON válido."), path);
              }
            }
            const parsedInput = completeServiceInputSchema.safeParse(parsedBody);
            if (stryMutAct_9fa48("4872") ? false : stryMutAct_9fa48("4871") ? true : stryMutAct_9fa48("4870") ? parsedInput.success : (stryCov_9fa48("4870", "4871", "4872"), !parsedInput.success)) {
              if (stryMutAct_9fa48("4873")) {
                {}
              } else {
                stryCov_9fa48("4873");
                return errorResponse(400, parsedInput.error.issues.map(stryMutAct_9fa48("4874") ? () => undefined : (stryCov_9fa48("4874"), issue => issue.message)).join(stryMutAct_9fa48("4875") ? "" : (stryCov_9fa48("4875"), " ")), path);
              }
            }
            completionInput = parsedInput.data;
          }
        }
        if (stryMutAct_9fa48("4877") ? false : stryMutAct_9fa48("4876") ? true : (stryCov_9fa48("4876", "4877"), backendMode(session))) {
          if (stryMutAct_9fa48("4878")) {
            {}
          } else {
            stryCov_9fa48("4878");
            const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("4879") ? {} : (stryCov_9fa48("4879"), {
              serviceId
            }));
            if (stryMutAct_9fa48("4881") ? false : stryMutAct_9fa48("4880") ? true : (stryCov_9fa48("4880", "4881"), scopedService instanceof Response)) return scopedService;
            const backendInit: RequestInit = stryMutAct_9fa48("4882") ? {} : (stryCov_9fa48("4882"), {
              method: stryMutAct_9fa48("4883") ? "" : (stryCov_9fa48("4883"), "POST")
            });
            if (stryMutAct_9fa48("4886") ? requestBody : stryMutAct_9fa48("4885") ? false : stryMutAct_9fa48("4884") ? true : (stryCov_9fa48("4884", "4885", "4886"), requestBody.trim())) {
              if (stryMutAct_9fa48("4887")) {
                {}
              } else {
                stryCov_9fa48("4887");
                backendInit.headers = stryMutAct_9fa48("4888") ? {} : (stryCov_9fa48("4888"), {
                  "content-type": stryMutAct_9fa48("4889") ? "" : (stryCov_9fa48("4889"), "application/json")
                });
                backendInit.body = JSON.stringify(completionInput);
              }
            }
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4890") ? `` : (stryCov_9fa48("4890"), `/services/${pathId(serviceId)}/complete`), undefined, backendInit);
            return forwardResponse(backendResponse);
          }
        }
        const service = findServiceFixture(serviceId, path);
        if (stryMutAct_9fa48("4892") ? false : stryMutAct_9fa48("4891") ? true : (stryCov_9fa48("4891", "4892"), service instanceof Response)) return service;
        if (stryMutAct_9fa48("4895") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("4894") ? false : stryMutAct_9fa48("4893") ? true : (stryCov_9fa48("4893", "4894", "4895"), (stryMutAct_9fa48("4897") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("4896") ? true : (stryCov_9fa48("4896", "4897"), scenario.actor.kind === (stryMutAct_9fa48("4898") ? "" : (stryCov_9fa48("4898"), "FIELD")))) && scenario.actor.crewId)) {
          if (stryMutAct_9fa48("4899")) {
            {}
          } else {
            stryCov_9fa48("4899");
            if (stryMutAct_9fa48("4902") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("4901") ? false : stryMutAct_9fa48("4900") ? true : (stryCov_9fa48("4900", "4901", "4902"), service.crewId !== scenario.actor.crewId)) {
              if (stryMutAct_9fa48("4903")) {
                {}
              } else {
                stryCov_9fa48("4903");
                return errorResponse(403, stryMutAct_9fa48("4904") ? "" : (stryCov_9fa48("4904"), "No tiene permisos para completar servicios de otra cuadrilla."), path);
              }
            }
          }
        }
        if (stryMutAct_9fa48("4907") ? service.status === "IN_PROGRESS" : stryMutAct_9fa48("4906") ? false : stryMutAct_9fa48("4905") ? true : (stryCov_9fa48("4905", "4906", "4907"), service.status !== (stryMutAct_9fa48("4908") ? "" : (stryCov_9fa48("4908"), "IN_PROGRESS")))) {
          if (stryMutAct_9fa48("4909")) {
            {}
          } else {
            stryCov_9fa48("4909");
            return errorResponse(409, stryMutAct_9fa48("4910") ? `` : (stryCov_9fa48("4910"), `Solo se pueden completar servicios en curso (IN_PROGRESS) (estado actual: ${service.status}).`), path);
          }
        }
        const results = getZoneResultsByServiceId(serviceId);
        const missingZones = stryMutAct_9fa48("4911") ? service.zoneIds : (stryCov_9fa48("4911"), service.zoneIds.filter(stryMutAct_9fa48("4912") ? () => undefined : (stryCov_9fa48("4912"), zid => stryMutAct_9fa48("4913") ? results.some(r => r.zoneId === zid) : (stryCov_9fa48("4913"), !(stryMutAct_9fa48("4914") ? results.every(r => r.zoneId === zid) : (stryCov_9fa48("4914"), results.some(stryMutAct_9fa48("4915") ? () => undefined : (stryCov_9fa48("4915"), r => stryMutAct_9fa48("4918") ? r.zoneId !== zid : stryMutAct_9fa48("4917") ? false : stryMutAct_9fa48("4916") ? true : (stryCov_9fa48("4916", "4917", "4918"), r.zoneId === zid)))))))));
        if (stryMutAct_9fa48("4922") ? missingZones.length <= 0 : stryMutAct_9fa48("4921") ? missingZones.length >= 0 : stryMutAct_9fa48("4920") ? false : stryMutAct_9fa48("4919") ? true : (stryCov_9fa48("4919", "4920", "4921", "4922"), missingZones.length > 0)) {
          if (stryMutAct_9fa48("4923")) {
            {}
          } else {
            stryCov_9fa48("4923");
            return errorResponse(409, stryMutAct_9fa48("4924") ? `` : (stryCov_9fa48("4924"), `Falta registrar el resultado de ${missingZones.length} zona(s) del servicio antes de completar.`), path);
          }
        }

        // Backend-computed completion rollup
        const allServiced = stryMutAct_9fa48("4925") ? results.some(r => r.status === "SERVICED") : (stryCov_9fa48("4925"), results.every(stryMutAct_9fa48("4926") ? () => undefined : (stryCov_9fa48("4926"), r => stryMutAct_9fa48("4929") ? r.status !== "SERVICED" : stryMutAct_9fa48("4928") ? false : stryMutAct_9fa48("4927") ? true : (stryCov_9fa48("4927", "4928", "4929"), r.status === (stryMutAct_9fa48("4930") ? "" : (stryCov_9fa48("4930"), "SERVICED"))))));
        const computedStatus: ServiceStatus = allServiced ? stryMutAct_9fa48("4931") ? "" : (stryCov_9fa48("4931"), "COMPLETED") : stryMutAct_9fa48("4932") ? "" : (stryCov_9fa48("4932"), "PARTIALLY_COMPLETED");
        const historyLabel = (stryMutAct_9fa48("4935") ? computedStatus !== "COMPLETED" : stryMutAct_9fa48("4934") ? false : stryMutAct_9fa48("4933") ? true : (stryCov_9fa48("4933", "4934", "4935"), computedStatus === (stryMutAct_9fa48("4936") ? "" : (stryCov_9fa48("4936"), "COMPLETED")))) ? stryMutAct_9fa48("4937") ? "" : (stryCov_9fa48("4937"), "Completado") : stryMutAct_9fa48("4938") ? "" : (stryCov_9fa48("4938"), "Parcial");
        const nonServicedNotes = capStatusReason(stryMutAct_9fa48("4939") ? results.map(r => r.notes).join(" · ") : (stryCov_9fa48("4939"), results.filter(stryMutAct_9fa48("4940") ? () => undefined : (stryCov_9fa48("4940"), r => stryMutAct_9fa48("4943") ? r.status !== "SERVICED" || r.notes : stryMutAct_9fa48("4942") ? false : stryMutAct_9fa48("4941") ? true : (stryCov_9fa48("4941", "4942", "4943"), (stryMutAct_9fa48("4945") ? r.status === "SERVICED" : stryMutAct_9fa48("4944") ? true : (stryCov_9fa48("4944", "4945"), r.status !== (stryMutAct_9fa48("4946") ? "" : (stryCov_9fa48("4946"), "SERVICED")))) && r.notes))).map(stryMutAct_9fa48("4947") ? () => undefined : (stryCov_9fa48("4947"), r => r.notes)).join(stryMutAct_9fa48("4948") ? "" : (stryCov_9fa48("4948"), " · "))));
        if (stryMutAct_9fa48("4951") ? computedStatus !== "COMPLETED" : stryMutAct_9fa48("4950") ? false : stryMutAct_9fa48("4949") ? true : (stryCov_9fa48("4949", "4950", "4951"), computedStatus === (stryMutAct_9fa48("4952") ? "" : (stryCov_9fa48("4952"), "COMPLETED")))) {
          if (stryMutAct_9fa48("4953")) {
            {}
          } else {
            stryCov_9fa48("4953");
            try {
              if (stryMutAct_9fa48("4954")) {
                {}
              } else {
                stryCov_9fa48("4954");
                if (stryMutAct_9fa48("4955")) {
                  ;
                } else {
                  stryCov_9fa48("4955");
                  transitionTargetContainer(service, completionInput);
                }
              }
            } catch (error) {
              if (stryMutAct_9fa48("4956")) {
                {}
              } else {
                stryCov_9fa48("4956");
                if (stryMutAct_9fa48("4958") ? false : stryMutAct_9fa48("4957") ? true : (stryCov_9fa48("4957", "4958"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
                if (stryMutAct_9fa48("4961") ? error instanceof Error || error.message === "CONTAINER_LOCATION_REQUIRED" : stryMutAct_9fa48("4960") ? false : stryMutAct_9fa48("4959") ? true : (stryCov_9fa48("4959", "4960", "4961"), error instanceof Error && (stryMutAct_9fa48("4963") ? error.message !== "CONTAINER_LOCATION_REQUIRED" : stryMutAct_9fa48("4962") ? true : (stryCov_9fa48("4962", "4963"), error.message === (stryMutAct_9fa48("4964") ? "" : (stryCov_9fa48("4964"), "CONTAINER_LOCATION_REQUIRED")))))) {
                  if (stryMutAct_9fa48("4965")) {
                    {}
                  } else {
                    stryCov_9fa48("4965");
                    return errorResponse(400, stryMutAct_9fa48("4966") ? "" : (stryCov_9fa48("4966"), "La nueva ubicación del contenedor es obligatoria para completar la reubicación."), path);
                  }
                }
                throw error;
              }
            }
          }
        }
        const updated = updateServiceFixture(service.id, stryMutAct_9fa48("4967") ? {} : (stryCov_9fa48("4967"), {
          status: computedStatus,
          statusReason: (stryMutAct_9fa48("4970") ? computedStatus !== "PARTIALLY_COMPLETED" : stryMutAct_9fa48("4969") ? false : stryMutAct_9fa48("4968") ? true : (stryCov_9fa48("4968", "4969", "4970"), computedStatus === (stryMutAct_9fa48("4971") ? "" : (stryCov_9fa48("4971"), "PARTIALLY_COMPLETED")))) ? stryMutAct_9fa48("4974") ? nonServicedNotes && "Cierre parcial con zonas no atendidas o parciales" : stryMutAct_9fa48("4973") ? false : stryMutAct_9fa48("4972") ? true : (stryCov_9fa48("4972", "4973", "4974"), nonServicedNotes || (stryMutAct_9fa48("4975") ? "" : (stryCov_9fa48("4975"), "Cierre parcial con zonas no atendidas o parciales"))) : null,
          history: stryMutAct_9fa48("4976") ? [] : (stryCov_9fa48("4976"), [...service.history, stryMutAct_9fa48("4977") ? {} : (stryCov_9fa48("4977"), {
            label: historyLabel,
            at: stryMutAct_9fa48("4978") ? new Date().toISOString().replace("T", " ") : (stryCov_9fa48("4978"), new Date().toISOString().slice(0, 16).replace(stryMutAct_9fa48("4979") ? "" : (stryCov_9fa48("4979"), "T"), stryMutAct_9fa48("4980") ? "" : (stryCov_9fa48("4980"), " "))),
            done: stryMutAct_9fa48("4981") ? false : (stryCov_9fa48("4981"), true)
          })])
        }));
        return NextResponse.json(updated, stryMutAct_9fa48("4982") ? {} : (stryCov_9fa48("4982"), {
          status: 200
        }));
      }
    } catch (caught: unknown) {
      if (stryMutAct_9fa48("4983")) {
        {}
      } else {
        stryCov_9fa48("4983");
        if (stryMutAct_9fa48("4986") ? caught instanceof AuthUnavailableError && caught instanceof InvalidSessionError : stryMutAct_9fa48("4985") ? false : stryMutAct_9fa48("4984") ? true : (stryCov_9fa48("4984", "4985", "4986"), caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("4987")) {
            {}
          } else {
            stryCov_9fa48("4987");
            recordTelemetryEvent(stryMutAct_9fa48("4989") ? {} : (stryCov_9fa48("4989"), {
              name: stryMutAct_9fa48("4990") ? "" : (stryCov_9fa48("4990"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("4991") ? "" : (stryCov_9fa48("4991"), "La sesión no está activa o es inválida."), path);
          }
        }
        return mapSessionError(caught, path, stryMutAct_9fa48("4992") ? "" : (stryCov_9fa48("4992"), "Error interno del servidor."));
      }
    }
  }
}