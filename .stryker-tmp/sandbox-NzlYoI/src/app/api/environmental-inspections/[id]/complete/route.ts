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
import { authorize, backendMode, errorResponse, forwardResponse, requireCrewScope, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getEnvironmentalInspectionFixture, getEnvironmentalReportFixture, mockAllowedActionsForCompletedInspection, transitionEnvironmentalReportFixture, updateEnvironmentalInspectionFixture } from "@/lib/environmental-report-fixtures";
import { environmentalInspectionCompleteInputSchema, environmentalInspectionSchema, inspectionChecklist } from "@/lib/environmental-reports";
import { serviceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { getScenario } from "@/lib/scenarios";
import { getRequiredSession } from "@/lib/session";
import { withInspectionAttachments } from "../../_attachments";
function nextStepForOutcome(outcome: "NO_VIOLATION" | "VIOLATION_FOUND" | "INCONCLUSIVE") {
  if (stryMutAct_9fa48("1160")) {
    {}
  } else {
    stryCov_9fa48("1160");
    if (stryMutAct_9fa48("1163") ? outcome !== "NO_VIOLATION" : stryMutAct_9fa48("1162") ? false : stryMutAct_9fa48("1161") ? true : (stryCov_9fa48("1161", "1162", "1163"), outcome === (stryMutAct_9fa48("1164") ? "" : (stryCov_9fa48("1164"), "NO_VIOLATION")))) return "CASE_CLOSED" as const;
    if (stryMutAct_9fa48("1167") ? outcome !== "VIOLATION_FOUND" : stryMutAct_9fa48("1166") ? false : stryMutAct_9fa48("1165") ? true : (stryCov_9fa48("1165", "1166", "1167"), outcome === (stryMutAct_9fa48("1168") ? "" : (stryCov_9fa48("1168"), "VIOLATION_FOUND")))) return "NOTICE_TO_BE_ISSUED" as const;
    return "REINSPECTION" as const;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1169")) {
    {}
  } else {
    stryCov_9fa48("1169");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1170")) {
        {}
      } else {
        stryCov_9fa48("1170");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        authorize(session, stryMutAct_9fa48("1172") ? {} : (stryCov_9fa48("1172"), {
          capability: stryMutAct_9fa48("1173") ? "" : (stryCov_9fa48("1173"), "environmentalInspection:execute"),
          capabilityMessage: stryMutAct_9fa48("1174") ? "" : (stryCov_9fa48("1174"), "Solo la persona responsable de la cuadrilla puede completar la inspección."),
          throwOnError: stryMutAct_9fa48("1175") ? false : (stryCov_9fa48("1175"), true)
        }));
        const requestBody = await request.text();
        let parsedBody: unknown;
        try {
          if (stryMutAct_9fa48("1176")) {
            {}
          } else {
            stryCov_9fa48("1176");
            parsedBody = JSON.parse(requestBody);
          }
        } catch {
          if (stryMutAct_9fa48("1177")) {
            {}
          } else {
            stryCov_9fa48("1177");
            return errorResponse(400, stryMutAct_9fa48("1178") ? "" : (stryCov_9fa48("1178"), "El cuerpo de la solicitud debe ser un JSON válido."), path);
          }
        }
        const parsedInput = environmentalInspectionCompleteInputSchema.safeParse(parsedBody);
        if (stryMutAct_9fa48("1181") ? false : stryMutAct_9fa48("1180") ? true : stryMutAct_9fa48("1179") ? parsedInput.success : (stryCov_9fa48("1179", "1180", "1181"), !parsedInput.success)) {
          if (stryMutAct_9fa48("1182")) {
            {}
          } else {
            stryCov_9fa48("1182");
            return errorResponse(400, parsedInput.error.issues.map(stryMutAct_9fa48("1183") ? () => undefined : (stryCov_9fa48("1183"), issue => issue.message)).join(stryMutAct_9fa48("1184") ? "" : (stryCov_9fa48("1184"), " ")), path);
          }
        }
        if (stryMutAct_9fa48("1186") ? false : stryMutAct_9fa48("1185") ? true : (stryCov_9fa48("1185", "1186"), backendMode(session))) {
          if (stryMutAct_9fa48("1187")) {
            {}
          } else {
            stryCov_9fa48("1187");
            if (stryMutAct_9fa48("1190") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1189") ? false : stryMutAct_9fa48("1188") ? true : (stryCov_9fa48("1188", "1189", "1190"), scenario.actor.kind === (stryMutAct_9fa48("1191") ? "" : (stryCov_9fa48("1191"), "FIELD")))) {
              if (stryMutAct_9fa48("1192")) {
                {}
              } else {
                stryCov_9fa48("1192");
                const inspectionResponse = await fetchBackend(request, stryMutAct_9fa48("1193") ? `` : (stryCov_9fa48("1193"), `/environmental-inspections/${pathId(id)}`));
                if (stryMutAct_9fa48("1196") ? false : stryMutAct_9fa48("1195") ? true : stryMutAct_9fa48("1194") ? inspectionResponse.ok : (stryCov_9fa48("1194", "1195", "1196"), !inspectionResponse.ok)) return forwardResponse(inspectionResponse);
                let inspectionPayload: unknown;
                try {
                  if (stryMutAct_9fa48("1197")) {
                    {}
                  } else {
                    stryCov_9fa48("1197");
                    inspectionPayload = await inspectionResponse.json();
                  }
                } catch {
                  if (stryMutAct_9fa48("1198")) {
                    {}
                  } else {
                    stryCov_9fa48("1198");
                    return errorResponse(502, stryMutAct_9fa48("1199") ? "" : (stryCov_9fa48("1199"), "La respuesta de la inspección no contiene JSON válido."), path);
                  }
                }
                const rawInspection = (stryMutAct_9fa48("1202") ? inspectionPayload && typeof inspectionPayload === "object" && "data" in inspectionPayload || !("id" in inspectionPayload) : stryMutAct_9fa48("1201") ? false : stryMutAct_9fa48("1200") ? true : (stryCov_9fa48("1200", "1201", "1202"), (stryMutAct_9fa48("1204") ? inspectionPayload && typeof inspectionPayload === "object" || "data" in inspectionPayload : stryMutAct_9fa48("1203") ? true : (stryCov_9fa48("1203", "1204"), (stryMutAct_9fa48("1206") ? inspectionPayload || typeof inspectionPayload === "object" : stryMutAct_9fa48("1205") ? true : (stryCov_9fa48("1205", "1206"), inspectionPayload && (stryMutAct_9fa48("1208") ? typeof inspectionPayload !== "object" : stryMutAct_9fa48("1207") ? true : (stryCov_9fa48("1207", "1208"), typeof inspectionPayload === (stryMutAct_9fa48("1209") ? "" : (stryCov_9fa48("1209"), "object")))))) && (stryMutAct_9fa48("1210") ? "" : (stryCov_9fa48("1210"), "data")) in inspectionPayload)) && (stryMutAct_9fa48("1211") ? "id" in inspectionPayload : (stryCov_9fa48("1211"), !((stryMutAct_9fa48("1212") ? "" : (stryCov_9fa48("1212"), "id")) in inspectionPayload))))) ? (inspectionPayload as {
                  data: unknown;
                }).data : inspectionPayload;
                const inspection = environmentalInspectionSchema.safeParse(rawInspection);
                if (stryMutAct_9fa48("1215") ? false : stryMutAct_9fa48("1214") ? true : stryMutAct_9fa48("1213") ? inspection.success : (stryCov_9fa48("1213", "1214", "1215"), !inspection.success)) return errorResponse(502, stryMutAct_9fa48("1216") ? "" : (stryCov_9fa48("1216"), "No se pudo obtener información válida de la inspección. Reintente en unos segundos."), path);
                if (stryMutAct_9fa48("1219") ? false : stryMutAct_9fa48("1218") ? true : stryMutAct_9fa48("1217") ? inspection.data.serviceId : (stryCov_9fa48("1217", "1218", "1219"), !inspection.data.serviceId)) return errorResponse(409, stryMutAct_9fa48("1220") ? "" : (stryCov_9fa48("1220"), "La inspección no tiene un servicio operativo vinculado."), path);
                const scopedService = await requireCrewScope(request, session, stryMutAct_9fa48("1221") ? {} : (stryCov_9fa48("1221"), {
                  serviceId: inspection.data.serviceId
                }));
                if (stryMutAct_9fa48("1223") ? false : stryMutAct_9fa48("1222") ? true : (stryCov_9fa48("1222", "1223"), scopedService instanceof Response)) return scopedService;
              }
            }
            const backendInput = stryMutAct_9fa48("1224") ? {} : (stryCov_9fa48("1224"), {
              inspectedAt: parsedInput.data.inspectedAt,
              outcome: parsedInput.data.outcome,
              ...(parsedInput.data.nextStep ? stryMutAct_9fa48("1225") ? {} : (stryCov_9fa48("1225"), {
                nextStep: parsedInput.data.nextStep
              }) : {}),
              ...(parsedInput.data.findings ? stryMutAct_9fa48("1226") ? {} : (stryCov_9fa48("1226"), {
                findings: parsedInput.data.findings
              }) : {}),
              ...(parsedInput.data.conclusion ? stryMutAct_9fa48("1227") ? {} : (stryCov_9fa48("1227"), {
                conclusion: parsedInput.data.conclusion
              }) : {}),
              ...(parsedInput.data.violationType ? stryMutAct_9fa48("1228") ? {} : (stryCov_9fa48("1228"), {
                violationType: parsedInput.data.violationType
              }) : {}),
              ...(parsedInput.data.severity ? stryMutAct_9fa48("1229") ? {} : (stryCov_9fa48("1229"), {
                severity: parsedInput.data.severity
              }) : {}),
              ...(parsedInput.data.suggestedAction ? stryMutAct_9fa48("1230") ? {} : (stryCov_9fa48("1230"), {
                suggestedAction: parsedInput.data.suggestedAction
              }) : {}),
              checklist: parsedInput.data.checklist.map(stryMutAct_9fa48("1231") ? () => undefined : (stryCov_9fa48("1231"), item => stryMutAct_9fa48("1232") ? {} : (stryCov_9fa48("1232"), {
                itemCode: item.id,
                label: item.label,
                result: item.completed
              })))
            });
            return withInspectionAttachments(request, await fetchBackend(request, stryMutAct_9fa48("1233") ? `` : (stryCov_9fa48("1233"), `/environmental-inspections/${pathId(id)}/complete`), stryMutAct_9fa48("1234") ? "" : (stryCov_9fa48("1234"), "environmentalInspection:execute"), stryMutAct_9fa48("1235") ? {} : (stryCov_9fa48("1235"), {
              method: stryMutAct_9fa48("1236") ? "" : (stryCov_9fa48("1236"), "POST"),
              headers: stryMutAct_9fa48("1237") ? {} : (stryCov_9fa48("1237"), {
                "content-type": stryMutAct_9fa48("1238") ? "" : (stryCov_9fa48("1238"), "application/json")
              }),
              body: JSON.stringify(backendInput)
            })));
          }
        }
        const inspection = getEnvironmentalInspectionFixture(id);
        if (stryMutAct_9fa48("1241") ? false : stryMutAct_9fa48("1240") ? true : stryMutAct_9fa48("1239") ? inspection : (stryCov_9fa48("1239", "1240", "1241"), !inspection)) return errorResponse(404, stryMutAct_9fa48("1242") ? "" : (stryCov_9fa48("1242"), "Inspección no encontrada."), path);
        const service = inspection.serviceId ? serviceFixtures.find(stryMutAct_9fa48("1243") ? () => undefined : (stryCov_9fa48("1243"), candidate => stryMutAct_9fa48("1246") ? candidate.id !== inspection.serviceId : stryMutAct_9fa48("1245") ? false : stryMutAct_9fa48("1244") ? true : (stryCov_9fa48("1244", "1245", "1246"), candidate.id === inspection.serviceId))) : null;
        if (stryMutAct_9fa48("1249") ? false : stryMutAct_9fa48("1248") ? true : stryMutAct_9fa48("1247") ? service : (stryCov_9fa48("1247", "1248", "1249"), !service)) return errorResponse(409, stryMutAct_9fa48("1250") ? "" : (stryCov_9fa48("1250"), "La inspección no tiene un servicio operativo vinculado."), path);
        if (stryMutAct_9fa48("1253") ? scenario.actor.kind === "FIELD" && scenario.actor.crewId || service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("1252") ? false : stryMutAct_9fa48("1251") ? true : (stryCov_9fa48("1251", "1252", "1253"), (stryMutAct_9fa48("1255") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("1254") ? true : (stryCov_9fa48("1254", "1255"), (stryMutAct_9fa48("1257") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1256") ? true : (stryCov_9fa48("1256", "1257"), scenario.actor.kind === (stryMutAct_9fa48("1258") ? "" : (stryCov_9fa48("1258"), "FIELD")))) && scenario.actor.crewId)) && (stryMutAct_9fa48("1260") ? service.crewId === scenario.actor.crewId : stryMutAct_9fa48("1259") ? true : (stryCov_9fa48("1259", "1260"), service.crewId !== scenario.actor.crewId)))) {
          if (stryMutAct_9fa48("1261")) {
            {}
          } else {
            stryCov_9fa48("1261");
            return errorResponse(403, stryMutAct_9fa48("1262") ? "" : (stryCov_9fa48("1262"), "Solo la cuadrilla asignada puede completar esta inspección."), path);
          }
        }
        if (stryMutAct_9fa48("1265") ? service.status === "IN_PROGRESS" : stryMutAct_9fa48("1264") ? false : stryMutAct_9fa48("1263") ? true : (stryCov_9fa48("1263", "1264", "1265"), service.status !== (stryMutAct_9fa48("1266") ? "" : (stryCov_9fa48("1266"), "IN_PROGRESS")))) {
          if (stryMutAct_9fa48("1267")) {
            {}
          } else {
            stryCov_9fa48("1267");
            return errorResponse(409, stryMutAct_9fa48("1268") ? `` : (stryCov_9fa48("1268"), `La inspección solo puede completarse con el servicio en curso (estado actual: ${service.status}).`), path);
          }
        }
        if (stryMutAct_9fa48("1271") ? parsedInput.data.outcome !== "NO_VIOLATION" || !(inspection.attachments?.length ?? 0) : stryMutAct_9fa48("1270") ? false : stryMutAct_9fa48("1269") ? true : (stryCov_9fa48("1269", "1270", "1271"), (stryMutAct_9fa48("1273") ? parsedInput.data.outcome === "NO_VIOLATION" : stryMutAct_9fa48("1272") ? true : (stryCov_9fa48("1272", "1273"), parsedInput.data.outcome !== (stryMutAct_9fa48("1274") ? "" : (stryCov_9fa48("1274"), "NO_VIOLATION")))) && (stryMutAct_9fa48("1275") ? inspection.attachments?.length ?? 0 : (stryCov_9fa48("1275"), !(stryMutAct_9fa48("1276") ? inspection.attachments?.length && 0 : (stryCov_9fa48("1276"), (stryMutAct_9fa48("1277") ? inspection.attachments.length : (stryCov_9fa48("1277"), inspection.attachments?.length)) ?? 0)))))) {
          if (stryMutAct_9fa48("1278")) {
            {}
          } else {
            stryCov_9fa48("1278");
            return errorResponse(400, stryMutAct_9fa48("1279") ? "" : (stryCov_9fa48("1279"), "Debe adjuntar al menos una evidencia para este resultado."), path);
          }
        }
        const expectedChecklistIds = new Set(inspectionChecklist(inspection).map(stryMutAct_9fa48("1280") ? () => undefined : (stryCov_9fa48("1280"), item => item.id)));
        if (stryMutAct_9fa48("1283") ? parsedInput.data.checklist.length !== expectedChecklistIds.size && parsedInput.data.checklist.some(item => !expectedChecklistIds.has(item.id)) : stryMutAct_9fa48("1282") ? false : stryMutAct_9fa48("1281") ? true : (stryCov_9fa48("1281", "1282", "1283"), (stryMutAct_9fa48("1285") ? parsedInput.data.checklist.length === expectedChecklistIds.size : stryMutAct_9fa48("1284") ? false : (stryCov_9fa48("1284", "1285"), parsedInput.data.checklist.length !== expectedChecklistIds.size)) || (stryMutAct_9fa48("1286") ? parsedInput.data.checklist.every(item => !expectedChecklistIds.has(item.id)) : (stryCov_9fa48("1286"), parsedInput.data.checklist.some(stryMutAct_9fa48("1287") ? () => undefined : (stryCov_9fa48("1287"), item => stryMutAct_9fa48("1288") ? expectedChecklistIds.has(item.id) : (stryCov_9fa48("1288"), !expectedChecklistIds.has(item.id)))))))) {
          if (stryMutAct_9fa48("1289")) {
            {}
          } else {
            stryCov_9fa48("1289");
            return errorResponse(400, stryMutAct_9fa48("1290") ? "" : (stryCov_9fa48("1290"), "El checklist enviado no coincide con el checklist asignado."), path);
          }
        }
        const updatedInspection = updateEnvironmentalInspectionFixture(id, stryMutAct_9fa48("1291") ? {} : (stryCov_9fa48("1291"), {
          inspectedAt: parsedInput.data.inspectedAt,
          checklist: inspectionChecklist(inspection),
          findings: stryMutAct_9fa48("1292") ? parsedInput.data.findings && null : (stryCov_9fa48("1292"), parsedInput.data.findings ?? null),
          violationType: stryMutAct_9fa48("1293") ? parsedInput.data.violationType && null : (stryCov_9fa48("1293"), parsedInput.data.violationType ?? null),
          severity: stryMutAct_9fa48("1294") ? parsedInput.data.severity && null : (stryCov_9fa48("1294"), parsedInput.data.severity ?? null),
          suggestedAction: stryMutAct_9fa48("1295") ? parsedInput.data.suggestedAction && null : (stryCov_9fa48("1295"), parsedInput.data.suggestedAction ?? null),
          conclusion: stryMutAct_9fa48("1296") ? parsedInput.data.conclusion && inspection.conclusion : (stryCov_9fa48("1296"), parsedInput.data.conclusion ?? inspection.conclusion),
          outcome: parsedInput.data.outcome,
          allowedActions: mockAllowedActionsForCompletedInspection(stryMutAct_9fa48("1297") ? getEnvironmentalReportFixture(inspection.reportId)?.reportType && "OTHER" : (stryCov_9fa48("1297"), (stryMutAct_9fa48("1298") ? getEnvironmentalReportFixture(inspection.reportId).reportType : (stryCov_9fa48("1298"), getEnvironmentalReportFixture(inspection.reportId)?.reportType)) ?? (stryMutAct_9fa48("1299") ? "" : (stryCov_9fa48("1299"), "OTHER"))), parsedInput.data.outcome),
          nextStep: stryMutAct_9fa48("1300") ? parsedInput.data.nextStep && nextStepForOutcome(parsedInput.data.outcome) : (stryCov_9fa48("1300"), parsedInput.data.nextStep ?? nextStepForOutcome(parsedInput.data.outcome))
        }));
        if (stryMutAct_9fa48("1303") ? false : stryMutAct_9fa48("1302") ? true : stryMutAct_9fa48("1301") ? updatedInspection : (stryCov_9fa48("1301", "1302", "1303"), !updatedInspection)) return errorResponse(404, stryMutAct_9fa48("1304") ? "" : (stryCov_9fa48("1304"), "Inspección no encontrada."), path);
        transitionEnvironmentalReportFixture(inspection.reportId, (stryMutAct_9fa48("1308") ? parsedInput.data.outcome !== "NO_VIOLATION" : stryMutAct_9fa48("1307") ? false : stryMutAct_9fa48("1306") ? true : (stryCov_9fa48("1306", "1307", "1308"), parsedInput.data.outcome === (stryMutAct_9fa48("1309") ? "" : (stryCov_9fa48("1309"), "NO_VIOLATION")))) ? stryMutAct_9fa48("1310") ? "" : (stryCov_9fa48("1310"), "NO_VIOLATION") : (stryMutAct_9fa48("1313") ? parsedInput.data.outcome !== "VIOLATION_FOUND" : stryMutAct_9fa48("1312") ? false : stryMutAct_9fa48("1311") ? true : (stryCov_9fa48("1311", "1312", "1313"), parsedInput.data.outcome === (stryMutAct_9fa48("1314") ? "" : (stryCov_9fa48("1314"), "VIOLATION_FOUND")))) ? stryMutAct_9fa48("1315") ? "" : (stryCov_9fa48("1315"), "VIOLATION_FOUND") : stryMutAct_9fa48("1316") ? "" : (stryCov_9fa48("1316"), "INSPECTED"));
        updateServiceFixture(service.id, stryMutAct_9fa48("1318") ? {} : (stryCov_9fa48("1318"), {
          status: stryMutAct_9fa48("1319") ? "" : (stryCov_9fa48("1319"), "COMPLETED"),
          statusReason: null,
          history: stryMutAct_9fa48("1320") ? [] : (stryCov_9fa48("1320"), [...service.history, stryMutAct_9fa48("1321") ? {} : (stryCov_9fa48("1321"), {
            label: stryMutAct_9fa48("1322") ? "" : (stryCov_9fa48("1322"), "Completado"),
            at: stryMutAct_9fa48("1323") ? new Date().toISOString().replace("T", " ") : (stryCov_9fa48("1323"), new Date().toISOString().slice(0, 16).replace(stryMutAct_9fa48("1324") ? "" : (stryCov_9fa48("1324"), "T"), stryMutAct_9fa48("1325") ? "" : (stryCov_9fa48("1325"), " "))),
            done: stryMutAct_9fa48("1326") ? false : (stryCov_9fa48("1326"), true)
          })])
        }));
        return NextResponse.json(updatedInspection, stryMutAct_9fa48("1327") ? {} : (stryCov_9fa48("1327"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1328")) {
        {}
      } else {
        stryCov_9fa48("1328");
        return handleRouteError(error, path, stryMutAct_9fa48("1329") ? "" : (stryCov_9fa48("1329"), "No se pudo completar la inspección."));
      }
    }
  }
}