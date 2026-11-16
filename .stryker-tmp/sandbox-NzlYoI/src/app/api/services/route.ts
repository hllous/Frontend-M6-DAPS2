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
import { serviceHistoryEntry } from "@/lib/bff-service-mock";
import { crewFit } from "@/lib/crew-fit";
import { serviceTypeFixtures } from "@/lib/service-type-fixtures";
import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBackend } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { vehicleFixtures } from "@/lib/vehicles-fixtures";
import { linkEnvironmentalInspectionService } from "@/lib/environmental-report-fixtures";
import { addServiceFixture, filterServiceFixtures, paginateServiceFixtures } from "@/lib/services-fixtures";
import { BackendServiceZoneSelectionError, createServiceInputSchema, ROUTE_CATALOG, SERVICE_TYPE_CATALOG, type Service, type ServiceQuery, serviceQuerySchema, servicesEnvelopeSchema, toCreateServiceBackendInput } from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { droppedRecords } from "@/lib/tolerant-records";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { zoneFixtures } from "@/lib/zones-fixtures";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
import { randomInt } from "@/lib/random-id";
function parseServiceQuery(url: URL): ServiceQuery {
  if (stryMutAct_9fa48("4522")) {
    {}
  } else {
    stryCov_9fa48("4522");
    const statuses = url.searchParams.getAll(stryMutAct_9fa48("4523") ? "" : (stryCov_9fa48("4523"), "status"));
    return serviceQuerySchema.parse(stryMutAct_9fa48("4524") ? {} : (stryCov_9fa48("4524"), {
      status: (stryMutAct_9fa48("4528") ? statuses.length <= 1 : stryMutAct_9fa48("4527") ? statuses.length >= 1 : stryMutAct_9fa48("4526") ? false : stryMutAct_9fa48("4525") ? true : (stryCov_9fa48("4525", "4526", "4527", "4528"), statuses.length > 1)) ? statuses : (stryMutAct_9fa48("4531") ? statuses.length !== 1 : stryMutAct_9fa48("4530") ? false : stryMutAct_9fa48("4529") ? true : (stryCov_9fa48("4529", "4530", "4531"), statuses.length === 1)) ? statuses[0] : undefined,
      mode: stryMutAct_9fa48("4532") ? url.searchParams.get("mode") && undefined : (stryCov_9fa48("4532"), url.searchParams.get(stryMutAct_9fa48("4533") ? "" : (stryCov_9fa48("4533"), "mode")) ?? undefined),
      origin: stryMutAct_9fa48("4534") ? url.searchParams.get("origin") && undefined : (stryCov_9fa48("4534"), url.searchParams.get(stryMutAct_9fa48("4535") ? "" : (stryCov_9fa48("4535"), "origin")) ?? undefined),
      serviceTypeId: stryMutAct_9fa48("4536") ? url.searchParams.get("serviceTypeId") && undefined : (stryCov_9fa48("4536"), url.searchParams.get(stryMutAct_9fa48("4537") ? "" : (stryCov_9fa48("4537"), "serviceTypeId")) ?? undefined),
      vehicleId: stryMutAct_9fa48("4538") ? url.searchParams.get("vehicleId") && undefined : (stryCov_9fa48("4538"), url.searchParams.get(stryMutAct_9fa48("4539") ? "" : (stryCov_9fa48("4539"), "vehicleId")) ?? undefined),
      ticketId: stryMutAct_9fa48("4540") ? url.searchParams.get("ticketId") && undefined : (stryCov_9fa48("4540"), url.searchParams.get(stryMutAct_9fa48("4541") ? "" : (stryCov_9fa48("4541"), "ticketId")) ?? undefined),
      zoneId: stryMutAct_9fa48("4542") ? url.searchParams.get("zoneId") && undefined : (stryCov_9fa48("4542"), url.searchParams.get(stryMutAct_9fa48("4543") ? "" : (stryCov_9fa48("4543"), "zoneId")) ?? undefined),
      crewId: stryMutAct_9fa48("4544") ? url.searchParams.get("crewId") && undefined : (stryCov_9fa48("4544"), url.searchParams.get(stryMutAct_9fa48("4545") ? "" : (stryCov_9fa48("4545"), "crewId")) ?? undefined),
      search: searchParam(url.searchParams),
      timeFrom: stryMutAct_9fa48("4546") ? url.searchParams.get("timeFrom") && undefined : (stryCov_9fa48("4546"), url.searchParams.get(stryMutAct_9fa48("4547") ? "" : (stryCov_9fa48("4547"), "timeFrom")) ?? undefined),
      timeTo: stryMutAct_9fa48("4548") ? url.searchParams.get("timeTo") && undefined : (stryCov_9fa48("4548"), url.searchParams.get(stryMutAct_9fa48("4549") ? "" : (stryCov_9fa48("4549"), "timeTo")) ?? undefined),
      scheduledFrom: stryMutAct_9fa48("4550") ? url.searchParams.get("scheduledFrom") && undefined : (stryCov_9fa48("4550"), url.searchParams.get(stryMutAct_9fa48("4551") ? "" : (stryCov_9fa48("4551"), "scheduledFrom")) ?? undefined),
      scheduledTo: stryMutAct_9fa48("4552") ? url.searchParams.get("scheduledTo") && undefined : (stryCov_9fa48("4552"), url.searchParams.get(stryMutAct_9fa48("4553") ? "" : (stryCov_9fa48("4553"), "scheduledTo")) ?? undefined),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    }));
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("4554")) {
    {}
  } else {
    stryCov_9fa48("4554");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4555")) {
        {}
      } else {
        stryCov_9fa48("4555");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        const query = parseServiceQuery(new URL(request.url));

        // Field actors can only see services assigned to their own crew
        if (stryMutAct_9fa48("4558") ? scenario.actor.kind === "FIELD" || scenario.actor.crewId : stryMutAct_9fa48("4557") ? false : stryMutAct_9fa48("4556") ? true : (stryCov_9fa48("4556", "4557", "4558"), (stryMutAct_9fa48("4560") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("4559") ? true : (stryCov_9fa48("4559", "4560"), scenario.actor.kind === (stryMutAct_9fa48("4561") ? "" : (stryCov_9fa48("4561"), "FIELD")))) && scenario.actor.crewId)) {
          if (stryMutAct_9fa48("4562")) {
            {}
          } else {
            stryCov_9fa48("4562");
            query.crewId = scenario.actor.crewId;
          }
        }
        if (stryMutAct_9fa48("4564") ? false : stryMutAct_9fa48("4563") ? true : (stryCov_9fa48("4563", "4564"), backendMode(session))) {
          if (stryMutAct_9fa48("4565")) {
            {}
          } else {
            stryCov_9fa48("4565");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4566") ? `` : (stryCov_9fa48("4566"), `/services${backendQuery(query, stryMutAct_9fa48("4567") ? [] : (stryCov_9fa48("4567"), [stryMutAct_9fa48("4568") ? "" : (stryCov_9fa48("4568"), "status"), stryMutAct_9fa48("4569") ? "" : (stryCov_9fa48("4569"), "mode"), stryMutAct_9fa48("4570") ? "" : (stryCov_9fa48("4570"), "origin"), stryMutAct_9fa48("4571") ? "" : (stryCov_9fa48("4571"), "zoneId"), stryMutAct_9fa48("4572") ? "" : (stryCov_9fa48("4572"), "crewId"), stryMutAct_9fa48("4573") ? "" : (stryCov_9fa48("4573"), "serviceTypeId"), stryMutAct_9fa48("4574") ? "" : (stryCov_9fa48("4574"), "vehicleId"), stryMutAct_9fa48("4575") ? "" : (stryCov_9fa48("4575"), "ticketId"), stryMutAct_9fa48("4576") ? "" : (stryCov_9fa48("4576"), "scheduledFrom"), stryMutAct_9fa48("4577") ? "" : (stryCov_9fa48("4577"), "scheduledTo"), stryMutAct_9fa48("4578") ? "" : (stryCov_9fa48("4578"), "page"), stryMutAct_9fa48("4579") ? "" : (stryCov_9fa48("4579"), "pageSize")]))}`));
            if (stryMutAct_9fa48("4582") ? false : stryMutAct_9fa48("4581") ? true : stryMutAct_9fa48("4580") ? backendResponse.ok : (stryCov_9fa48("4580", "4581", "4582"), !backendResponse.ok)) return forwardResponse(backendResponse);
            const parsed = servicesEnvelopeSchema.safeParse(await backendResponse.json().catch(() => undefined));
            if (stryMutAct_9fa48("4585") ? false : stryMutAct_9fa48("4584") ? true : stryMutAct_9fa48("4583") ? parsed.success : (stryCov_9fa48("4583", "4584", "4585"), !parsed.success)) {
              if (stryMutAct_9fa48("4586")) {
                {}
              } else {
                stryCov_9fa48("4586");
                return errorResponse(502, stryMutAct_9fa48("4587") ? "" : (stryCov_9fa48("4587"), "No se pudo obtener información válida de servicios. Reintente en unos segundos."), path);
              }
            }
            const dropped = droppedRecords(parsed.data.data);
            return NextResponse.json(dropped ? stryMutAct_9fa48("4588") ? {} : (stryCov_9fa48("4588"), {
              ...parsed.data,
              meta: stryMutAct_9fa48("4589") ? {} : (stryCov_9fa48("4589"), {
                ...parsed.data.meta,
                dropped
              })
            }) : parsed.data);
          }
        }
        return NextResponse.json(paginateServiceFixtures(filterServiceFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4590")) {
        {}
      } else {
        stryCov_9fa48("4590");
        if (stryMutAct_9fa48("4592") ? false : stryMutAct_9fa48("4591") ? true : (stryCov_9fa48("4591", "4592"), error instanceof z.ZodError)) return errorResponse(400, stryMutAct_9fa48("4593") ? "" : (stryCov_9fa48("4593"), "Los filtros de servicios son inválidos."), path);
        return handleRouteError(error, path, stryMutAct_9fa48("4594") ? "" : (stryCov_9fa48("4594"), "No se pudieron cargar los servicios."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("4595")) {
    {}
  } else {
    stryCov_9fa48("4595");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("4596")) {
        {}
      } else {
        stryCov_9fa48("4596");
        const session = getRequiredSession(request);

        // Permission check: scheduling is an Office decision, not a Field action.
        authorize(session, stryMutAct_9fa48("4598") ? {} : (stryCov_9fa48("4598"), {
          office: stryMutAct_9fa48("4599") ? false : (stryCov_9fa48("4599"), true),
          officeMessage: stryMutAct_9fa48("4600") ? "" : (stryCov_9fa48("4600"), "Solo Oficina puede programar un servicio."),
          capability: stryMutAct_9fa48("4601") ? "" : (stryCov_9fa48("4601"), "service:schedule"),
          throwOnError: stryMutAct_9fa48("4602") ? false : (stryCov_9fa48("4602"), true)
        }));
        let body: unknown;
        try {
          if (stryMutAct_9fa48("4603")) {
            {}
          } else {
            stryCov_9fa48("4603");
            body = await request.json();
          }
        } catch {
          if (stryMutAct_9fa48("4604")) {
            {}
          } else {
            stryCov_9fa48("4604");
            return errorResponse(400, stryMutAct_9fa48("4605") ? "" : (stryCov_9fa48("4605"), "El cuerpo de la solicitud no es un JSON válido."), path);
          }
        }
        const parsed = createServiceInputSchema.safeParse(body);
        if (stryMutAct_9fa48("4608") ? false : stryMutAct_9fa48("4607") ? true : stryMutAct_9fa48("4606") ? parsed.success : (stryCov_9fa48("4606", "4607", "4608"), !parsed.success)) {
          if (stryMutAct_9fa48("4609")) {
            {}
          } else {
            stryCov_9fa48("4609");
            const message = parsed.error.issues.map(stryMutAct_9fa48("4610") ? () => undefined : (stryCov_9fa48("4610"), issue => issue.message)).join(stryMutAct_9fa48("4611") ? "" : (stryCov_9fa48("4611"), " "));
            return errorResponse(400, message, path);
          }
        }
        const input = parsed.data;
        if (stryMutAct_9fa48("4613") ? false : stryMutAct_9fa48("4612") ? true : (stryCov_9fa48("4612", "4613"), backendMode(session))) {
          if (stryMutAct_9fa48("4614")) {
            {}
          } else {
            stryCov_9fa48("4614");
            let backendInput;
            try {
              if (stryMutAct_9fa48("4615")) {
                {}
              } else {
                stryCov_9fa48("4615");
                backendInput = toCreateServiceBackendInput(input);
              }
            } catch (error) {
              if (stryMutAct_9fa48("4616")) {
                {}
              } else {
                stryCov_9fa48("4616");
                if (stryMutAct_9fa48("4618") ? false : stryMutAct_9fa48("4617") ? true : (stryCov_9fa48("4617", "4618"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
                if (stryMutAct_9fa48("4620") ? false : stryMutAct_9fa48("4619") ? true : (stryCov_9fa48("4619", "4620"), error instanceof BackendServiceZoneSelectionError)) {
                  if (stryMutAct_9fa48("4621")) {
                    {}
                  } else {
                    stryCov_9fa48("4621");
                    return errorResponse(400, error.message, path);
                  }
                }
                throw error;
              }
            }
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("4622") ? "" : (stryCov_9fa48("4622"), "/services"), undefined, stryMutAct_9fa48("4623") ? {} : (stryCov_9fa48("4623"), {
              method: stryMutAct_9fa48("4624") ? "" : (stryCov_9fa48("4624"), "POST"),
              headers: stryMutAct_9fa48("4625") ? {} : (stryCov_9fa48("4625"), {
                "content-type": stryMutAct_9fa48("4626") ? "" : (stryCov_9fa48("4626"), "application/json")
              }),
              body: JSON.stringify(backendInput)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const serviceType = SERVICE_TYPE_CATALOG.find(stryMutAct_9fa48("4627") ? () => undefined : (stryCov_9fa48("4627"), t => stryMutAct_9fa48("4630") ? t.id !== input.serviceTypeId : stryMutAct_9fa48("4629") ? false : stryMutAct_9fa48("4628") ? true : (stryCov_9fa48("4628", "4629", "4630"), t.id === input.serviceTypeId)));
        const mode = serviceType ? serviceType.mode : input.routeId ? stryMutAct_9fa48("4631") ? "" : (stryCov_9fa48("4631"), "ROUTE") : stryMutAct_9fa48("4632") ? "" : (stryCov_9fa48("4632"), "POINT");
        const route = input.routeId ? ROUTE_CATALOG.find(stryMutAct_9fa48("4633") ? () => undefined : (stryCov_9fa48("4633"), r => stryMutAct_9fa48("4636") ? r.id !== input.routeId : stryMutAct_9fa48("4635") ? false : stryMutAct_9fa48("4634") ? true : (stryCov_9fa48("4634", "4635", "4636"), r.id === input.routeId))) : null;
        const zoneNames = input.zoneIds.map(zid => {
          if (stryMutAct_9fa48("4637")) {
            {}
          } else {
            stryCov_9fa48("4637");
            const z = zoneFixtures.find(stryMutAct_9fa48("4638") ? () => undefined : (stryCov_9fa48("4638"), zone => stryMutAct_9fa48("4641") ? zone.id !== zid : stryMutAct_9fa48("4640") ? false : stryMutAct_9fa48("4639") ? true : (stryCov_9fa48("4639", "4640", "4641"), zone.id === zid)));
            return z ? z.name : zid;
          }
        });
        const fit = crewFit(crewFixtures.find(stryMutAct_9fa48("4642") ? () => undefined : (stryCov_9fa48("4642"), crew => stryMutAct_9fa48("4645") ? crew.id !== input.crewId : stryMutAct_9fa48("4644") ? false : stryMutAct_9fa48("4643") ? true : (stryCov_9fa48("4643", "4644", "4645"), crew.id === input.crewId))), input.zoneIds, stryMutAct_9fa48("4646") ? serviceTypeFixtures.find(type => type.id === input.serviceTypeId).code : (stryCov_9fa48("4646"), serviceTypeFixtures.find(stryMutAct_9fa48("4647") ? () => undefined : (stryCov_9fa48("4647"), type => stryMutAct_9fa48("4650") ? type.id !== input.serviceTypeId : stryMutAct_9fa48("4649") ? false : stryMutAct_9fa48("4648") ? true : (stryCov_9fa48("4648", "4649", "4650"), type.id === input.serviceTypeId)))?.code));
        if (stryMutAct_9fa48("4653") ? fit.zone || fit.specialty || !input.overrideNote : stryMutAct_9fa48("4652") ? false : stryMutAct_9fa48("4651") ? true : (stryCov_9fa48("4651", "4652", "4653"), (stryMutAct_9fa48("4655") ? fit.zone && fit.specialty : stryMutAct_9fa48("4654") ? true : (stryCov_9fa48("4654", "4655"), fit.zone || fit.specialty)) && (stryMutAct_9fa48("4656") ? input.overrideNote : (stryCov_9fa48("4656"), !input.overrideNote)))) return errorResponse(409, stryMutAct_9fa48("4657") ? "" : (stryCov_9fa48("4657"), "La asignacion tiene reparos: la zona o especialidad de la cuadrilla no coincide; hace falta 'overrideNote' explicando por que."), path);
        const newService: Service = stryMutAct_9fa48("4658") ? {} : (stryCov_9fa48("4658"), {
          id: stryMutAct_9fa48("4659") ? `` : (stryCov_9fa48("4659"), `SVC-${randomInt(1000, 9999)}`),
          serviceTypeId: input.serviceTypeId,
          serviceTypeName: stryMutAct_9fa48("4660") ? serviceType?.name && "Servicio urbano" : (stryCov_9fa48("4660"), (stryMutAct_9fa48("4661") ? serviceType.name : (stryCov_9fa48("4661"), serviceType?.name)) ?? (stryMutAct_9fa48("4662") ? "" : (stryCov_9fa48("4662"), "Servicio urbano"))),
          title: stryMutAct_9fa48("4665") ? input.title && `${serviceType?.name ?? "Servicio"} — ${route?.name ?? input.targetRef ?? "Programado"}` : stryMutAct_9fa48("4664") ? false : stryMutAct_9fa48("4663") ? true : (stryCov_9fa48("4663", "4664", "4665"), input.title || (stryMutAct_9fa48("4666") ? `` : (stryCov_9fa48("4666"), `${stryMutAct_9fa48("4667") ? serviceType?.name && "Servicio" : (stryCov_9fa48("4667"), (stryMutAct_9fa48("4668") ? serviceType.name : (stryCov_9fa48("4668"), serviceType?.name)) ?? (stryMutAct_9fa48("4669") ? "" : (stryCov_9fa48("4669"), "Servicio")))} — ${stryMutAct_9fa48("4670") ? (route?.name ?? input.targetRef) && "Programado" : (stryCov_9fa48("4670"), (stryMutAct_9fa48("4671") ? route?.name && input.targetRef : (stryCov_9fa48("4671"), (stryMutAct_9fa48("4672") ? route.name : (stryCov_9fa48("4672"), route?.name)) ?? input.targetRef)) ?? (stryMutAct_9fa48("4673") ? "" : (stryCov_9fa48("4673"), "Programado")))}`))),
          mode,
          status: stryMutAct_9fa48("4674") ? "" : (stryCov_9fa48("4674"), "SCHEDULED"),
          statusReason: null,
          origin: input.origin,
          zoneIds: stryMutAct_9fa48("4675") ? [] : (stryCov_9fa48("4675"), [...input.zoneIds]),
          zoneNames,
          routeId: stryMutAct_9fa48("4676") ? input.routeId && null : (stryCov_9fa48("4676"), input.routeId ?? null),
          routeName: stryMutAct_9fa48("4677") ? route?.name && null : (stryCov_9fa48("4677"), (stryMutAct_9fa48("4678") ? route.name : (stryCov_9fa48("4678"), route?.name)) ?? null),
          targetType: stryMutAct_9fa48("4679") ? input.targetType && null : (stryCov_9fa48("4679"), input.targetType ?? null),
          targetId: stryMutAct_9fa48("4680") ? input.targetId && null : (stryCov_9fa48("4680"), input.targetId ?? null),
          targetRef: stryMutAct_9fa48("4681") ? input.targetRef && null : (stryCov_9fa48("4681"), input.targetRef ?? null),
          scheduledDate: input.scheduledDate,
          windowFrom: input.timeWindow.start,
          windowTo: input.timeWindow.end,
          // Como el backend: la cuadrilla y el vehículo se pueden asignar en el mismo alta.
          crewId: stryMutAct_9fa48("4682") ? input.crewId && null : (stryCov_9fa48("4682"), input.crewId ?? null),
          crewName: stryMutAct_9fa48("4683") ? crewFixtures.find(crew => crew.id === input.crewId)?.name && null : (stryCov_9fa48("4683"), (stryMutAct_9fa48("4684") ? crewFixtures.find(crew => crew.id === input.crewId).name : (stryCov_9fa48("4684"), crewFixtures.find(stryMutAct_9fa48("4685") ? () => undefined : (stryCov_9fa48("4685"), crew => stryMutAct_9fa48("4688") ? crew.id !== input.crewId : stryMutAct_9fa48("4687") ? false : stryMutAct_9fa48("4686") ? true : (stryCov_9fa48("4686", "4687", "4688"), crew.id === input.crewId)))?.name)) ?? null),
          vehicleId: stryMutAct_9fa48("4689") ? input.vehicleId && null : (stryCov_9fa48("4689"), input.vehicleId ?? null),
          vehiclePlate: stryMutAct_9fa48("4690") ? vehicleFixtures.find(vehicle => vehicle.id === input.vehicleId)?.plate && null : (stryCov_9fa48("4690"), (stryMutAct_9fa48("4691") ? vehicleFixtures.find(vehicle => vehicle.id === input.vehicleId).plate : (stryCov_9fa48("4691"), vehicleFixtures.find(stryMutAct_9fa48("4692") ? () => undefined : (stryCov_9fa48("4692"), vehicle => stryMutAct_9fa48("4695") ? vehicle.id !== input.vehicleId : stryMutAct_9fa48("4694") ? false : stryMutAct_9fa48("4693") ? true : (stryCov_9fa48("4693", "4694", "4695"), vehicle.id === input.vehicleId)))?.plate)) ?? null),
          ticketId: (stryMutAct_9fa48("4698") ? input.origin !== "TICKET" : stryMutAct_9fa48("4697") ? false : stryMutAct_9fa48("4696") ? true : (stryCov_9fa48("4696", "4697", "4698"), input.origin === (stryMutAct_9fa48("4699") ? "" : (stryCov_9fa48("4699"), "TICKET")))) ? stryMutAct_9fa48("4700") ? input.ticketId && null : (stryCov_9fa48("4700"), input.ticketId ?? null) : null,
          inspectionId: (stryMutAct_9fa48("4703") ? input.origin !== "INSPECTION" : stryMutAct_9fa48("4702") ? false : stryMutAct_9fa48("4701") ? true : (stryCov_9fa48("4701", "4702", "4703"), input.origin === (stryMutAct_9fa48("4704") ? "" : (stryCov_9fa48("4704"), "INSPECTION")))) ? stryMutAct_9fa48("4705") ? input.inspectionId && null : (stryCov_9fa48("4705"), input.inspectionId ?? null) : null,
          weatherAlertId: (stryMutAct_9fa48("4708") ? input.origin !== "WEATHER_ALERT" : stryMutAct_9fa48("4707") ? false : stryMutAct_9fa48("4706") ? true : (stryCov_9fa48("4706", "4707", "4708"), input.origin === (stryMutAct_9fa48("4709") ? "" : (stryCov_9fa48("4709"), "WEATHER_ALERT")))) ? stryMutAct_9fa48("4710") ? input.weatherAlertId && null : (stryCov_9fa48("4710"), input.weatherAlertId ?? null) : null,
          notes: stryMutAct_9fa48("4711") ? input.notes && null : (stryCov_9fa48("4711"), input.notes ?? null),
          coordinates: stryMutAct_9fa48("4712") ? {} : (stryCov_9fa48("4712"), {
            x: 50,
            y: 50
          }),
          attachments: stryMutAct_9fa48("4713") ? ["Stryker was here"] : (stryCov_9fa48("4713"), []),
          history: stryMutAct_9fa48("4714") ? [] : (stryCov_9fa48("4714"), [serviceHistoryEntry(stryMutAct_9fa48("4715") ? "" : (stryCov_9fa48("4715"), "Programado"))]),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        if (stryMutAct_9fa48("4716")) {
          ;
        } else {
          stryCov_9fa48("4716");
          addServiceFixture(newService);
        }
        if (stryMutAct_9fa48("4719") ? input.origin === "INSPECTION" || input.inspectionId : stryMutAct_9fa48("4718") ? false : stryMutAct_9fa48("4717") ? true : (stryCov_9fa48("4717", "4718", "4719"), (stryMutAct_9fa48("4721") ? input.origin !== "INSPECTION" : stryMutAct_9fa48("4720") ? true : (stryCov_9fa48("4720", "4721"), input.origin === (stryMutAct_9fa48("4722") ? "" : (stryCov_9fa48("4722"), "INSPECTION")))) && input.inspectionId)) {
          if (stryMutAct_9fa48("4723")) {
            {}
          } else {
            stryCov_9fa48("4723");
            if (stryMutAct_9fa48("4724")) {
              ;
            } else {
              stryCov_9fa48("4724");
              linkEnvironmentalInspectionService(input.inspectionId, newService.id);
            }
          }
        }
        return NextResponse.json(newService, stryMutAct_9fa48("4725") ? {} : (stryCov_9fa48("4725"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("4726")) {
        {}
      } else {
        stryCov_9fa48("4726");
        if (stryMutAct_9fa48("4728") ? false : stryMutAct_9fa48("4727") ? true : (stryCov_9fa48("4727", "4728"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("4729")) {
            {}
          } else {
            stryCov_9fa48("4729");
            recordTelemetryEvent(stryMutAct_9fa48("4731") ? {} : (stryCov_9fa48("4731"), {
              name: stryMutAct_9fa48("4732") ? "" : (stryCov_9fa48("4732"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("4733") ? "" : (stryCov_9fa48("4733"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("4735") ? false : stryMutAct_9fa48("4734") ? true : (stryCov_9fa48("4734", "4735"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("4736")) {
            {}
          } else {
            stryCov_9fa48("4736");
            return errorResponse(503, error.message, path);
          }
        }
        if (stryMutAct_9fa48("4738") ? false : stryMutAct_9fa48("4737") ? true : (stryCov_9fa48("4737", "4738"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        return mapSessionError(error, path, stryMutAct_9fa48("4739") ? "" : (stryCov_9fa48("4739"), "No se pudo programar el servicio."));
      }
    }
  }
}