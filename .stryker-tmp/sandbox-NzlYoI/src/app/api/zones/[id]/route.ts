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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { getZoneFixture, updateZoneFixture, findCommuneFixture, zoneFixtures } from "@/lib/zones-fixtures";
import { updateZoneInputSchema, type Zone } from "@/lib/zones";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6603")) {
    {}
  } else {
    stryCov_9fa48("6603");
    const resolved = await context.params;
    return resolved.id;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6604")) {
    {}
  } else {
    stryCov_9fa48("6604");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6605")) {
        {}
      } else {
        stryCov_9fa48("6605");
        const session = getRequiredSession(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("6607") ? false : stryMutAct_9fa48("6606") ? true : (stryCov_9fa48("6606", "6607"), backendMode(session))) {
          if (stryMutAct_9fa48("6608")) {
            {}
          } else {
            stryCov_9fa48("6608");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("6609") ? `` : (stryCov_9fa48("6609"), `/zones/${pathId(id)}`));
            return forwardResponse(backendResponse);
          }
        }
        const zone = getZoneFixture(id);
        if (stryMutAct_9fa48("6612") ? false : stryMutAct_9fa48("6611") ? true : stryMutAct_9fa48("6610") ? zone : (stryCov_9fa48("6610", "6611", "6612"), !zone)) {
          if (stryMutAct_9fa48("6613")) {
            {}
          } else {
            stryCov_9fa48("6613");
            return errorResponse(404, stryMutAct_9fa48("6614") ? `` : (stryCov_9fa48("6614"), `Zona operativa ${id} no encontrada.`), path);
          }
        }
        return NextResponse.json(zone);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6615")) {
        {}
      } else {
        stryCov_9fa48("6615");
        return handleRouteError(error, path, stryMutAct_9fa48("6616") ? "" : (stryCov_9fa48("6616"), "No se pudo cargar la zona operativa."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6617")) {
    {}
  } else {
    stryCov_9fa48("6617");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6618")) {
        {}
      } else {
        stryCov_9fa48("6618");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("6620") ? {} : (stryCov_9fa48("6620"), {
          office: stryMutAct_9fa48("6621") ? false : (stryCov_9fa48("6621"), true),
          officeMessage: stryMutAct_9fa48("6622") ? "" : (stryCov_9fa48("6622"), "Solo el rol de Oficina puede editar zonas operativas."),
          capability: stryMutAct_9fa48("6623") ? "" : (stryCov_9fa48("6623"), "zone:manage"),
          throwOnError: stryMutAct_9fa48("6624") ? false : (stryCov_9fa48("6624"), true)
        }));
        const id = await targetId(context);
        const parsed = await parseJsonBody(request, updateZoneInputSchema, path);
        if (stryMutAct_9fa48("6626") ? false : stryMutAct_9fa48("6625") ? true : (stryCov_9fa48("6625", "6626"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("6628") ? false : stryMutAct_9fa48("6627") ? true : (stryCov_9fa48("6627", "6628"), backendMode(session))) {
          if (stryMutAct_9fa48("6629")) {
            {}
          } else {
            stryCov_9fa48("6629");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("6630") ? `` : (stryCov_9fa48("6630"), `/zones/${pathId(id)}`), stryMutAct_9fa48("6631") ? "" : (stryCov_9fa48("6631"), "zone:manage"), stryMutAct_9fa48("6632") ? {} : (stryCov_9fa48("6632"), {
              method: stryMutAct_9fa48("6633") ? "" : (stryCov_9fa48("6633"), "PATCH"),
              headers: stryMutAct_9fa48("6634") ? {} : (stryCov_9fa48("6634"), {
                "content-type": stryMutAct_9fa48("6635") ? "" : (stryCov_9fa48("6635"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const existing = zoneFixtures.find(stryMutAct_9fa48("6636") ? () => undefined : (stryCov_9fa48("6636"), candidate => stryMutAct_9fa48("6639") ? candidate.id !== id : stryMutAct_9fa48("6638") ? false : stryMutAct_9fa48("6637") ? true : (stryCov_9fa48("6637", "6638", "6639"), candidate.id === id)));
        if (stryMutAct_9fa48("6642") ? false : stryMutAct_9fa48("6641") ? true : stryMutAct_9fa48("6640") ? existing : (stryCov_9fa48("6640", "6641", "6642"), !existing)) {
          if (stryMutAct_9fa48("6643")) {
            {}
          } else {
            stryCov_9fa48("6643");
            return errorResponse(404, stryMutAct_9fa48("6644") ? `` : (stryCov_9fa48("6644"), `Zona operativa ${id} no encontrada.`), path);
          }
        }

        // Code is strictly immutable: updateZoneFixture only patches allowed properties (name, active)
        const {
          communeId,
          ...fields
        } = parsed.data;
        const patch: Partial<Zone> = fields;
        if (stryMutAct_9fa48("6647") ? communeId === undefined : stryMutAct_9fa48("6646") ? false : stryMutAct_9fa48("6645") ? true : (stryCov_9fa48("6645", "6646", "6647"), communeId !== undefined)) {
          if (stryMutAct_9fa48("6648")) {
            {}
          } else {
            stryCov_9fa48("6648");
            const commune = (stryMutAct_9fa48("6651") ? communeId !== null : stryMutAct_9fa48("6650") ? false : stryMutAct_9fa48("6649") ? true : (stryCov_9fa48("6649", "6650", "6651"), communeId === null)) ? null : findCommuneFixture(communeId);
            if (stryMutAct_9fa48("6654") ? communeId !== null || !commune : stryMutAct_9fa48("6653") ? false : stryMutAct_9fa48("6652") ? true : (stryCov_9fa48("6652", "6653", "6654"), (stryMutAct_9fa48("6656") ? communeId === null : stryMutAct_9fa48("6655") ? true : (stryCov_9fa48("6655", "6656"), communeId !== null)) && (stryMutAct_9fa48("6657") ? commune : (stryCov_9fa48("6657"), !commune)))) return errorResponse(400, stryMutAct_9fa48("6658") ? "" : (stryCov_9fa48("6658"), "La comuna indicada no existe."), path);
            patch.commune = commune;
          }
        }
        const updated = updateZoneFixture(id, patch);
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6659")) {
        {}
      } else {
        stryCov_9fa48("6659");
        if (stryMutAct_9fa48("6661") ? false : stryMutAct_9fa48("6660") ? true : (stryCov_9fa48("6660", "6661"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("6662")) {
            {}
          } else {
            stryCov_9fa48("6662");
            recordTelemetryEvent(stryMutAct_9fa48("6664") ? {} : (stryCov_9fa48("6664"), {
              name: stryMutAct_9fa48("6665") ? "" : (stryCov_9fa48("6665"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("6666") ? "" : (stryCov_9fa48("6666"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("6668") ? false : stryMutAct_9fa48("6667") ? true : (stryCov_9fa48("6667", "6668"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("6669")) {
            {}
          } else {
            stryCov_9fa48("6669");
            recordTelemetryEvent(stryMutAct_9fa48("6671") ? {} : (stryCov_9fa48("6671"), {
              name: stryMutAct_9fa48("6672") ? "" : (stryCov_9fa48("6672"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("6674") ? false : stryMutAct_9fa48("6673") ? true : (stryCov_9fa48("6673", "6674"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("6675")) {
            {}
          } else {
            stryCov_9fa48("6675");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("6676") ? "" : (stryCov_9fa48("6676"), "No se pudo actualizar la zona operativa."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6677")) {
    {}
  } else {
    stryCov_9fa48("6677");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6678")) {
        {}
      } else {
        stryCov_9fa48("6678");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("6680") ? {} : (stryCov_9fa48("6680"), {
          office: stryMutAct_9fa48("6681") ? false : (stryCov_9fa48("6681"), true),
          officeMessage: stryMutAct_9fa48("6682") ? "" : (stryCov_9fa48("6682"), "Solo el rol de Oficina puede dar de baja zonas operativas."),
          capability: stryMutAct_9fa48("6683") ? "" : (stryCov_9fa48("6683"), "zone:manage"),
          throwOnError: stryMutAct_9fa48("6684") ? false : (stryCov_9fa48("6684"), true)
        }));
        const id = await targetId(context);
        if (stryMutAct_9fa48("6686") ? false : stryMutAct_9fa48("6685") ? true : (stryCov_9fa48("6685", "6686"), backendMode(session))) {
          if (stryMutAct_9fa48("6687")) {
            {}
          } else {
            stryCov_9fa48("6687");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("6688") ? `` : (stryCov_9fa48("6688"), `/zones/${pathId(id)}`), stryMutAct_9fa48("6689") ? "" : (stryCov_9fa48("6689"), "zone:manage"), stryMutAct_9fa48("6690") ? {} : (stryCov_9fa48("6690"), {
              method: stryMutAct_9fa48("6691") ? "" : (stryCov_9fa48("6691"), "DELETE")
            }));
            return forwardResponse(backendResponse);
          }
        }
        const existing = zoneFixtures.find(stryMutAct_9fa48("6692") ? () => undefined : (stryCov_9fa48("6692"), candidate => stryMutAct_9fa48("6695") ? candidate.id !== id : stryMutAct_9fa48("6694") ? false : stryMutAct_9fa48("6693") ? true : (stryCov_9fa48("6693", "6694", "6695"), candidate.id === id)));
        if (stryMutAct_9fa48("6698") ? false : stryMutAct_9fa48("6697") ? true : stryMutAct_9fa48("6696") ? existing : (stryCov_9fa48("6696", "6697", "6698"), !existing)) {
          if (stryMutAct_9fa48("6699")) {
            {}
          } else {
            stryCov_9fa48("6699");
            return errorResponse(404, stryMutAct_9fa48("6700") ? `` : (stryCov_9fa48("6700"), `Zona operativa ${id} no encontrada.`), path);
          }
        }

        // Logical delete per standard: active = false
        const updated = updateZoneFixture(id, stryMutAct_9fa48("6701") ? {} : (stryCov_9fa48("6701"), {
          active: stryMutAct_9fa48("6702") ? true : (stryCov_9fa48("6702"), false)
        }));
        return NextResponse.json(updated);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6703")) {
        {}
      } else {
        stryCov_9fa48("6703");
        if (stryMutAct_9fa48("6705") ? false : stryMutAct_9fa48("6704") ? true : (stryCov_9fa48("6704", "6705"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("6706")) {
            {}
          } else {
            stryCov_9fa48("6706");
            recordTelemetryEvent(stryMutAct_9fa48("6708") ? {} : (stryCov_9fa48("6708"), {
              name: stryMutAct_9fa48("6709") ? "" : (stryCov_9fa48("6709"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("6710") ? "" : (stryCov_9fa48("6710"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("6712") ? false : stryMutAct_9fa48("6711") ? true : (stryCov_9fa48("6711", "6712"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("6713")) {
            {}
          } else {
            stryCov_9fa48("6713");
            recordTelemetryEvent(stryMutAct_9fa48("6715") ? {} : (stryCov_9fa48("6715"), {
              name: stryMutAct_9fa48("6716") ? "" : (stryCov_9fa48("6716"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("6718") ? false : stryMutAct_9fa48("6717") ? true : (stryCov_9fa48("6717", "6718"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("6719")) {
            {}
          } else {
            stryCov_9fa48("6719");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("6720") ? "" : (stryCov_9fa48("6720"), "No se pudo dar de baja la zona operativa."));
      }
    }
  }
}