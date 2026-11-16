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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { EVIDENCE_FILE_SIZE_LABEL, MAX_EVIDENCE_FILE_SIZE_BYTES } from "@/lib/evidence-limits";
import { fetchBackend } from "@/lib/bff-backend";
import { addAttachmentToService, addAttachmentToZoneResult, evidenceCache, sanitizeFilename, serviceFixtures, zoneResultFixtures } from "@/lib/services-fixtures";
import { addAttachmentToContainer, getContainerAttachments, getContainerFixture } from "@/lib/containers-fixtures";
import { addAttachmentToInspection, getEnvironmentalInspectionFixture, getInspectionAttachments } from "@/lib/environmental-report-fixtures";
import { evidenceOwnerTypeSchema, type Attachment, type EvidenceOwnerType } from "@/lib/services";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { randomInt } from "@/lib/random-id";
const ALLOWED_MIME_TYPES = new Set(stryMutAct_9fa48("2129") ? [] : (stryCov_9fa48("2129"), [stryMutAct_9fa48("2130") ? "" : (stryCov_9fa48("2130"), "image/jpeg"), stryMutAct_9fa48("2131") ? "" : (stryCov_9fa48("2131"), "image/png"), stryMutAct_9fa48("2132") ? "" : (stryCov_9fa48("2132"), "image/webp"), stryMutAct_9fa48("2133") ? "" : (stryCov_9fa48("2133"), "application/pdf")]));

// Allow room for multipart boundaries and the owner metadata.
const MULTIPART_MARGIN_BYTES = stryMutAct_9fa48("2134") ? 64 / 1024 : (stryCov_9fa48("2134"), 64 * 1024);
const scopeIdSchema = z.string().regex(stryMutAct_9fa48("2138") ? /^[^A-Za-z0-9_-]{1,100}$/ : stryMutAct_9fa48("2137") ? /^[A-Za-z0-9_-]$/ : stryMutAct_9fa48("2136") ? /^[A-Za-z0-9_-]{1,100}/ : stryMutAct_9fa48("2135") ? /[A-Za-z0-9_-]{1,100}$/ : (stryCov_9fa48("2135", "2136", "2137", "2138"), /^[A-Za-z0-9_-]{1,100}$/));
const serviceScopeSchema = z.object(stryMutAct_9fa48("2139") ? {} : (stryCov_9fa48("2139"), {
  id: scopeIdSchema,
  crewId: scopeIdSchema.nullable()
}));
const zoneScopeSchema = z.array(z.object(stryMutAct_9fa48("2140") ? {} : (stryCov_9fa48("2140"), {
  id: scopeIdSchema
})));
async function readEvidenceScope<T>(request: Request, resource: string, schema: z.ZodType<T>, path: string): Promise<{
  data: T;
  response?: never;
} | {
  data?: never;
  response: NextResponse;
}> {
  if (stryMutAct_9fa48("2141")) {
    {}
  } else {
    stryCov_9fa48("2141");
    const response = await fetchBackend(request, resource);
    if (stryMutAct_9fa48("2144") ? false : stryMutAct_9fa48("2143") ? true : stryMutAct_9fa48("2142") ? response.ok : (stryCov_9fa48("2142", "2143", "2144"), !response.ok)) return stryMutAct_9fa48("2145") ? {} : (stryCov_9fa48("2145"), {
      response: forwardResponse(response)
    });
    const parsed = schema.safeParse(await response.json().catch(stryMutAct_9fa48("2146") ? () => undefined : (stryCov_9fa48("2146"), () => null)));
    if (stryMutAct_9fa48("2149") ? false : stryMutAct_9fa48("2148") ? true : stryMutAct_9fa48("2147") ? parsed.success : (stryCov_9fa48("2147", "2148", "2149"), !parsed.success)) {
      if (stryMutAct_9fa48("2150")) {
        {}
      } else {
        stryCov_9fa48("2150");
        return stryMutAct_9fa48("2151") ? {} : (stryCov_9fa48("2151"), {
          response: errorResponse(502, stryMutAct_9fa48("2152") ? "" : (stryCov_9fa48("2152"), "La respuesta del propietario de evidencia es inválida."), path)
        });
      }
    }
    return stryMutAct_9fa48("2153") ? {} : (stryCov_9fa48("2153"), {
      data: parsed.data
    });
  }
}

// TODO #431: migrate this preflight to requireCrewScope when the shared helper lands.
async function checkBackendEvidenceCrew(request: Request, ownerType: EvidenceOwnerType, ownerId: string, serviceId: string | null, crewId: string | undefined, path: string): Promise<NextResponse | null> {
  if (stryMutAct_9fa48("2154")) {
    {}
  } else {
    stryCov_9fa48("2154");
    const denied = stryMutAct_9fa48("2155") ? () => undefined : (stryCov_9fa48("2155"), (() => {
      const denied = () => errorResponse(403, stryMutAct_9fa48("2156") ? "" : (stryCov_9fa48("2156"), "Solo la cuadrilla asignada puede subir evidencia de este registro."), path);
      return denied;
    })());
    if (stryMutAct_9fa48("2159") ? false : stryMutAct_9fa48("2158") ? true : stryMutAct_9fa48("2157") ? crewId : (stryCov_9fa48("2157", "2158", "2159"), !crewId)) return denied();
    if (stryMutAct_9fa48("2162") ? ownerType === "SERVICE" && ownerType === "INSPECTION" : stryMutAct_9fa48("2161") ? false : stryMutAct_9fa48("2160") ? true : (stryCov_9fa48("2160", "2161", "2162"), (stryMutAct_9fa48("2164") ? ownerType !== "SERVICE" : stryMutAct_9fa48("2163") ? false : (stryCov_9fa48("2163", "2164"), ownerType === (stryMutAct_9fa48("2165") ? "" : (stryCov_9fa48("2165"), "SERVICE")))) || (stryMutAct_9fa48("2167") ? ownerType !== "INSPECTION" : stryMutAct_9fa48("2166") ? false : (stryCov_9fa48("2166", "2167"), ownerType === (stryMutAct_9fa48("2168") ? "" : (stryCov_9fa48("2168"), "INSPECTION")))))) {
      if (stryMutAct_9fa48("2169")) {
        {}
      } else {
        stryCov_9fa48("2169");
        let owningServiceId = ownerId;
        if (stryMutAct_9fa48("2172") ? ownerType !== "INSPECTION" : stryMutAct_9fa48("2171") ? false : stryMutAct_9fa48("2170") ? true : (stryCov_9fa48("2170", "2171", "2172"), ownerType === (stryMutAct_9fa48("2173") ? "" : (stryCov_9fa48("2173"), "INSPECTION")))) {
          if (stryMutAct_9fa48("2174")) {
            {}
          } else {
            stryCov_9fa48("2174");
            const inspection = await readEvidenceScope(request, stryMutAct_9fa48("2175") ? `` : (stryCov_9fa48("2175"), `/environmental-inspections/${encodeURIComponent(ownerId)}`), z.object(stryMutAct_9fa48("2176") ? {} : (stryCov_9fa48("2176"), {
              id: scopeIdSchema,
              serviceId: scopeIdSchema.nullable()
            })), path);
            if (stryMutAct_9fa48("2178") ? false : stryMutAct_9fa48("2177") ? true : (stryCov_9fa48("2177", "2178"), inspection.response)) return inspection.response;
            if (stryMutAct_9fa48("2181") ? inspection.data.id !== ownerId && !inspection.data.serviceId : stryMutAct_9fa48("2180") ? false : stryMutAct_9fa48("2179") ? true : (stryCov_9fa48("2179", "2180", "2181"), (stryMutAct_9fa48("2183") ? inspection.data.id === ownerId : stryMutAct_9fa48("2182") ? false : (stryCov_9fa48("2182", "2183"), inspection.data.id !== ownerId)) || (stryMutAct_9fa48("2184") ? inspection.data.serviceId : (stryCov_9fa48("2184"), !inspection.data.serviceId)))) return denied();
            owningServiceId = inspection.data.serviceId;
          }
        }
        const service = await readEvidenceScope(request, stryMutAct_9fa48("2185") ? `` : (stryCov_9fa48("2185"), `/services/${encodeURIComponent(owningServiceId)}`), serviceScopeSchema, path);
        if (stryMutAct_9fa48("2187") ? false : stryMutAct_9fa48("2186") ? true : (stryCov_9fa48("2186", "2187"), service.response)) return service.response;
        return (stryMutAct_9fa48("2190") ? service.data.id === owningServiceId || service.data.crewId === crewId : stryMutAct_9fa48("2189") ? false : stryMutAct_9fa48("2188") ? true : (stryCov_9fa48("2188", "2189", "2190"), (stryMutAct_9fa48("2192") ? service.data.id !== owningServiceId : stryMutAct_9fa48("2191") ? true : (stryCov_9fa48("2191", "2192"), service.data.id === owningServiceId)) && (stryMutAct_9fa48("2194") ? service.data.crewId !== crewId : stryMutAct_9fa48("2193") ? true : (stryCov_9fa48("2193", "2194"), service.data.crewId === crewId)))) ? null : denied();
      }
    }
    if (stryMutAct_9fa48("2197") ? ownerType !== "ZONE_RESULT" : stryMutAct_9fa48("2196") ? false : stryMutAct_9fa48("2195") ? true : (stryCov_9fa48("2195", "2196", "2197"), ownerType === (stryMutAct_9fa48("2198") ? "" : (stryCov_9fa48("2198"), "ZONE_RESULT")))) {
      if (stryMutAct_9fa48("2199")) {
        {}
      } else {
        stryCov_9fa48("2199");
        if (stryMutAct_9fa48("2201") ? false : stryMutAct_9fa48("2200") ? true : (stryCov_9fa48("2200", "2201"), serviceId)) {
          if (stryMutAct_9fa48("2202")) {
            {}
          } else {
            stryCov_9fa48("2202");
            const service = await readEvidenceScope(request, stryMutAct_9fa48("2203") ? `` : (stryCov_9fa48("2203"), `/services/${encodeURIComponent(serviceId)}`), serviceScopeSchema, path);
            if (stryMutAct_9fa48("2205") ? false : stryMutAct_9fa48("2204") ? true : (stryCov_9fa48("2204", "2205"), service.response)) return service.response;
            if (stryMutAct_9fa48("2208") ? service.data.id !== serviceId && service.data.crewId !== crewId : stryMutAct_9fa48("2207") ? false : stryMutAct_9fa48("2206") ? true : (stryCov_9fa48("2206", "2207", "2208"), (stryMutAct_9fa48("2210") ? service.data.id === serviceId : stryMutAct_9fa48("2209") ? false : (stryCov_9fa48("2209", "2210"), service.data.id !== serviceId)) || (stryMutAct_9fa48("2212") ? service.data.crewId === crewId : stryMutAct_9fa48("2211") ? false : (stryCov_9fa48("2211", "2212"), service.data.crewId !== crewId)))) return denied();
            const zones = await readEvidenceScope(request, stryMutAct_9fa48("2213") ? `` : (stryCov_9fa48("2213"), `/services/${encodeURIComponent(serviceId)}/zone-results`), zoneScopeSchema, path);
            if (stryMutAct_9fa48("2215") ? false : stryMutAct_9fa48("2214") ? true : (stryCov_9fa48("2214", "2215"), zones.response)) return zones.response;
            return (stryMutAct_9fa48("2216") ? zones.data.every(zone => zone.id === ownerId) : (stryCov_9fa48("2216"), zones.data.some(stryMutAct_9fa48("2217") ? () => undefined : (stryCov_9fa48("2217"), zone => stryMutAct_9fa48("2220") ? zone.id !== ownerId : stryMutAct_9fa48("2219") ? false : stryMutAct_9fa48("2218") ? true : (stryCov_9fa48("2218", "2219", "2220"), zone.id === ownerId))))) ? null : denied();
          }
        }

        // The API has no ZoneResult-to-Service lookup. Bound the legacy-client fallback.
        const pageSchema = z.object(stryMutAct_9fa48("2221") ? {} : (stryCov_9fa48("2221"), {
          data: stryMutAct_9fa48("2222") ? z.array(serviceScopeSchema).min(100) : (stryCov_9fa48("2222"), z.array(serviceScopeSchema).max(100)),
          meta: z.object(stryMutAct_9fa48("2223") ? {} : (stryCov_9fa48("2223"), {
            totalPages: z.number().int().nonnegative()
          }))
        }));
        for (let page = 1; stryMutAct_9fa48("2226") ? page > 10 : stryMutAct_9fa48("2225") ? page < 10 : stryMutAct_9fa48("2224") ? false : (stryCov_9fa48("2224", "2225", "2226"), page <= 10); stryMutAct_9fa48("2227") ? page-- : (stryCov_9fa48("2227"), page++)) {
          if (stryMutAct_9fa48("2228")) {
            {}
          } else {
            stryCov_9fa48("2228");
            type ServicesPage = z.infer<typeof pageSchema>;
            const services: {
              data: ServicesPage;
              response?: never;
            } | {
              data?: never;
              response: NextResponse;
            } = await readEvidenceScope<ServicesPage>(request, stryMutAct_9fa48("2229") ? `` : (stryCov_9fa48("2229"), `/services?crewId=${encodeURIComponent(crewId)}&pageSize=100&page=${page}`), pageSchema, path);
            if (stryMutAct_9fa48("2231") ? false : stryMutAct_9fa48("2230") ? true : (stryCov_9fa48("2230", "2231"), services.response)) return services.response;
            for (const listedService of services.data.data) {
              if (stryMutAct_9fa48("2232")) {
                {}
              } else {
                stryCov_9fa48("2232");
                if (stryMutAct_9fa48("2235") ? listedService.crewId === crewId : stryMutAct_9fa48("2234") ? false : stryMutAct_9fa48("2233") ? true : (stryCov_9fa48("2233", "2234", "2235"), listedService.crewId !== crewId)) continue;
                const zones = await readEvidenceScope(request, stryMutAct_9fa48("2236") ? `` : (stryCov_9fa48("2236"), `/services/${encodeURIComponent(listedService.id)}/zone-results`), zoneScopeSchema, path);
                if (stryMutAct_9fa48("2238") ? false : stryMutAct_9fa48("2237") ? true : (stryCov_9fa48("2237", "2238"), zones.response)) return zones.response;
                if (stryMutAct_9fa48("2241") ? zones.data.every(zone => zone.id === ownerId) : stryMutAct_9fa48("2240") ? false : stryMutAct_9fa48("2239") ? true : (stryCov_9fa48("2239", "2240", "2241"), zones.data.some(stryMutAct_9fa48("2242") ? () => undefined : (stryCov_9fa48("2242"), zone => stryMutAct_9fa48("2245") ? zone.id !== ownerId : stryMutAct_9fa48("2244") ? false : stryMutAct_9fa48("2243") ? true : (stryCov_9fa48("2243", "2244", "2245"), zone.id === ownerId))))) return null;
              }
            }
            if (stryMutAct_9fa48("2249") ? page < services.data.meta.totalPages : stryMutAct_9fa48("2248") ? page > services.data.meta.totalPages : stryMutAct_9fa48("2247") ? false : stryMutAct_9fa48("2246") ? true : (stryCov_9fa48("2246", "2247", "2248", "2249"), page >= services.data.meta.totalPages)) break;
          }
        }
        return denied();
      }
    }
    return null;
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("2250")) {
    {}
  } else {
    stryCov_9fa48("2250");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("2251")) {
        {}
      } else {
        stryCov_9fa48("2251");
        const session = getRequiredSession(request);
        const scenario = getScenario(session);
        const idempotencyKey = stryMutAct_9fa48("2254") ? request.headers.get("Idempotency-Key") && request.headers.get("idempotency-key") : stryMutAct_9fa48("2253") ? false : stryMutAct_9fa48("2252") ? true : (stryCov_9fa48("2252", "2253", "2254"), request.headers.get(stryMutAct_9fa48("2255") ? "" : (stryCov_9fa48("2255"), "Idempotency-Key")) || request.headers.get(stryMutAct_9fa48("2256") ? "" : (stryCov_9fa48("2256"), "idempotency-key")));
        if (stryMutAct_9fa48("2259") ? !idempotencyKey && !idempotencyKey.trim() : stryMutAct_9fa48("2258") ? false : stryMutAct_9fa48("2257") ? true : (stryCov_9fa48("2257", "2258", "2259"), (stryMutAct_9fa48("2260") ? idempotencyKey : (stryCov_9fa48("2260"), !idempotencyKey)) || (stryMutAct_9fa48("2261") ? idempotencyKey.trim() : (stryCov_9fa48("2261"), !(stryMutAct_9fa48("2262") ? idempotencyKey : (stryCov_9fa48("2262"), idempotencyKey.trim())))))) {
          if (stryMutAct_9fa48("2263")) {
            {}
          } else {
            stryCov_9fa48("2263");
            return errorResponse(400, stryMutAct_9fa48("2264") ? "" : (stryCov_9fa48("2264"), "La cabecera Idempotency-Key es obligatoria para la carga de evidencia."), path);
          }
        }
        if (stryMutAct_9fa48("2267") ? false : stryMutAct_9fa48("2266") ? true : stryMutAct_9fa48("2265") ? /^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey) : (stryCov_9fa48("2265", "2266", "2267"), !(stryMutAct_9fa48("2271") ? /^[^A-Za-z0-9_-]{1,128}$/ : stryMutAct_9fa48("2270") ? /^[A-Za-z0-9_-]$/ : stryMutAct_9fa48("2269") ? /^[A-Za-z0-9_-]{1,128}/ : stryMutAct_9fa48("2268") ? /[A-Za-z0-9_-]{1,128}$/ : (stryCov_9fa48("2268", "2269", "2270", "2271"), /^[A-Za-z0-9_-]{1,128}$/)).test(idempotencyKey))) {
          if (stryMutAct_9fa48("2272")) {
            {}
          } else {
            stryCov_9fa48("2272");
            return errorResponse(400, stryMutAct_9fa48("2273") ? "" : (stryCov_9fa48("2273"), "La cabecera Idempotency-Key debe contener entre 1 y 128 letras, números, guiones o guiones bajos."), path);
          }
        }
        const contentLength = Number(request.headers.get(stryMutAct_9fa48("2274") ? "" : (stryCov_9fa48("2274"), "content-length")));
        if (stryMutAct_9fa48("2277") ? Number.isFinite(contentLength) || contentLength > MAX_EVIDENCE_FILE_SIZE_BYTES + MULTIPART_MARGIN_BYTES : stryMutAct_9fa48("2276") ? false : stryMutAct_9fa48("2275") ? true : (stryCov_9fa48("2275", "2276", "2277"), Number.isFinite(contentLength) && (stryMutAct_9fa48("2280") ? contentLength <= MAX_EVIDENCE_FILE_SIZE_BYTES + MULTIPART_MARGIN_BYTES : stryMutAct_9fa48("2279") ? contentLength >= MAX_EVIDENCE_FILE_SIZE_BYTES + MULTIPART_MARGIN_BYTES : stryMutAct_9fa48("2278") ? true : (stryCov_9fa48("2278", "2279", "2280"), contentLength > (stryMutAct_9fa48("2281") ? MAX_EVIDENCE_FILE_SIZE_BYTES - MULTIPART_MARGIN_BYTES : (stryCov_9fa48("2281"), MAX_EVIDENCE_FILE_SIZE_BYTES + MULTIPART_MARGIN_BYTES)))))) {
          if (stryMutAct_9fa48("2282")) {
            {}
          } else {
            stryCov_9fa48("2282");
            return errorResponse(413, stryMutAct_9fa48("2283") ? `` : (stryCov_9fa48("2283"), `El archivo supera el tamaño máximo permitido de ${EVIDENCE_FILE_SIZE_LABEL}.`), path);
          }
        }
        let formData: FormData;
        try {
          if (stryMutAct_9fa48("2284")) {
            {}
          } else {
            stryCov_9fa48("2284");
            formData = await request.formData();
          }
        } catch {
          if (stryMutAct_9fa48("2285")) {
            {}
          } else {
            stryCov_9fa48("2285");
            return errorResponse(400, stryMutAct_9fa48("2286") ? "" : (stryCov_9fa48("2286"), "El cuerpo de la solicitud debe ser multipart/form-data válido."), path);
          }
        }
        const files = formData.getAll(stryMutAct_9fa48("2287") ? "" : (stryCov_9fa48("2287"), "file"));
        if (stryMutAct_9fa48("2291") ? files.length <= 1 : stryMutAct_9fa48("2290") ? files.length >= 1 : stryMutAct_9fa48("2289") ? false : stryMutAct_9fa48("2288") ? true : (stryCov_9fa48("2288", "2289", "2290", "2291"), files.length > 1)) {
          if (stryMutAct_9fa48("2292")) {
            {}
          } else {
            stryCov_9fa48("2292");
            return errorResponse(400, stryMutAct_9fa48("2293") ? "" : (stryCov_9fa48("2293"), "Solo se permite un archivo por solicitud de evidencia."), path);
          }
        }
        const file = stryMutAct_9fa48("2294") ? files[0] && null : (stryCov_9fa48("2294"), files[0] ?? null);
        const rawOwnerType = formData.get(stryMutAct_9fa48("2295") ? "" : (stryCov_9fa48("2295"), "ownerType"));
        const ownerId = formData.get(stryMutAct_9fa48("2296") ? "" : (stryCov_9fa48("2296"), "ownerId"));
        if (stryMutAct_9fa48("2299") ? (!file || typeof file === "string") && typeof (file as {
          size?: unknown;
        }).size !== "number" : stryMutAct_9fa48("2298") ? false : stryMutAct_9fa48("2297") ? true : (stryCov_9fa48("2297", "2298", "2299"), (stryMutAct_9fa48("2301") ? !file && typeof file === "string" : stryMutAct_9fa48("2300") ? false : (stryCov_9fa48("2300", "2301"), (stryMutAct_9fa48("2302") ? file : (stryCov_9fa48("2302"), !file)) || (stryMutAct_9fa48("2304") ? typeof file !== "string" : stryMutAct_9fa48("2303") ? false : (stryCov_9fa48("2303", "2304"), typeof file === (stryMutAct_9fa48("2305") ? "" : (stryCov_9fa48("2305"), "string")))))) || (stryMutAct_9fa48("2307") ? typeof (file as {
          size?: unknown;
        }).size === "number" : stryMutAct_9fa48("2306") ? false : (stryCov_9fa48("2306", "2307"), typeof (file as {
          size?: unknown;
        }).size !== (stryMutAct_9fa48("2308") ? "" : (stryCov_9fa48("2308"), "number")))))) {
          if (stryMutAct_9fa48("2309")) {
            {}
          } else {
            stryCov_9fa48("2309");
            return errorResponse(400, stryMutAct_9fa48("2310") ? "" : (stryCov_9fa48("2310"), "Debe incluir un archivo válido en el campo 'file'."), path);
          }
        }
        if (stryMutAct_9fa48("2313") ? !rawOwnerType && typeof rawOwnerType !== "string" : stryMutAct_9fa48("2312") ? false : stryMutAct_9fa48("2311") ? true : (stryCov_9fa48("2311", "2312", "2313"), (stryMutAct_9fa48("2314") ? rawOwnerType : (stryCov_9fa48("2314"), !rawOwnerType)) || (stryMutAct_9fa48("2316") ? typeof rawOwnerType === "string" : stryMutAct_9fa48("2315") ? false : (stryCov_9fa48("2315", "2316"), typeof rawOwnerType !== (stryMutAct_9fa48("2317") ? "" : (stryCov_9fa48("2317"), "string")))))) {
          if (stryMutAct_9fa48("2318")) {
            {}
          } else {
            stryCov_9fa48("2318");
            return errorResponse(400, stryMutAct_9fa48("2319") ? "" : (stryCov_9fa48("2319"), "El campo 'ownerType' es obligatorio."), path);
          }
        }
        const parsedOwnerType = evidenceOwnerTypeSchema.safeParse(rawOwnerType);
        if (stryMutAct_9fa48("2322") ? false : stryMutAct_9fa48("2321") ? true : stryMutAct_9fa48("2320") ? parsedOwnerType.success : (stryCov_9fa48("2320", "2321", "2322"), !parsedOwnerType.success)) {
          if (stryMutAct_9fa48("2323")) {
            {}
          } else {
            stryCov_9fa48("2323");
            return errorResponse(400, stryMutAct_9fa48("2324") ? "" : (stryCov_9fa48("2324"), "Tipo de propietario de evidencia inválido."), path);
          }
        }
        const ownerType = parsedOwnerType.data;

        // Permission check by ownerType
        if (stryMutAct_9fa48("2327") ? ownerType !== "CONTAINER" : stryMutAct_9fa48("2326") ? false : stryMutAct_9fa48("2325") ? true : (stryCov_9fa48("2325", "2326", "2327"), ownerType === (stryMutAct_9fa48("2328") ? "" : (stryCov_9fa48("2328"), "CONTAINER")))) {
          if (stryMutAct_9fa48("2329")) {
            {}
          } else {
            stryCov_9fa48("2329");
            authorize(session, stryMutAct_9fa48("2331") ? {} : (stryCov_9fa48("2331"), {
              capability: stryMutAct_9fa48("2332") ? "" : (stryCov_9fa48("2332"), "container:report"),
              capabilityMessage: stryMutAct_9fa48("2333") ? "" : (stryCov_9fa48("2333"), "No tiene permisos para subir evidencia de contenedores."),
              throwOnError: stryMutAct_9fa48("2334") ? false : (stryCov_9fa48("2334"), true)
            }));
          }
        } else if (stryMutAct_9fa48("2337") ? ownerType !== "INSPECTION" : stryMutAct_9fa48("2336") ? false : stryMutAct_9fa48("2335") ? true : (stryCov_9fa48("2335", "2336", "2337"), ownerType === (stryMutAct_9fa48("2338") ? "" : (stryCov_9fa48("2338"), "INSPECTION")))) {
          if (stryMutAct_9fa48("2339")) {
            {}
          } else {
            stryCov_9fa48("2339");
            authorize(session, stryMutAct_9fa48("2341") ? {} : (stryCov_9fa48("2341"), {
              capability: stryMutAct_9fa48("2342") ? "" : (stryCov_9fa48("2342"), "environmentalInspection:execute"),
              capabilityMessage: stryMutAct_9fa48("2343") ? "" : (stryCov_9fa48("2343"), "No tiene permisos para subir evidencia de inspección."),
              throwOnError: stryMutAct_9fa48("2344") ? false : (stryCov_9fa48("2344"), true)
            }));
          }
        } else {
          if (stryMutAct_9fa48("2345")) {
            {}
          } else {
            stryCov_9fa48("2345");
            // SERVICE or ZONE_RESULT
            authorize(session, stryMutAct_9fa48("2347") ? {} : (stryCov_9fa48("2347"), {
              capability: stryMutAct_9fa48("2348") ? "" : (stryCov_9fa48("2348"), "service:execute"),
              capabilityMessage: stryMutAct_9fa48("2349") ? "" : (stryCov_9fa48("2349"), "No tiene permisos para subir evidencia. Solo la persona responsable de la cuadrilla puede hacerlo."),
              throwOnError: stryMutAct_9fa48("2350") ? false : (stryCov_9fa48("2350"), true)
            }));
          }
        }
        if (stryMutAct_9fa48("2353") ? (!ownerId || typeof ownerId !== "string") && !ownerId.trim() : stryMutAct_9fa48("2352") ? false : stryMutAct_9fa48("2351") ? true : (stryCov_9fa48("2351", "2352", "2353"), (stryMutAct_9fa48("2355") ? !ownerId && typeof ownerId !== "string" : stryMutAct_9fa48("2354") ? false : (stryCov_9fa48("2354", "2355"), (stryMutAct_9fa48("2356") ? ownerId : (stryCov_9fa48("2356"), !ownerId)) || (stryMutAct_9fa48("2358") ? typeof ownerId === "string" : stryMutAct_9fa48("2357") ? false : (stryCov_9fa48("2357", "2358"), typeof ownerId !== (stryMutAct_9fa48("2359") ? "" : (stryCov_9fa48("2359"), "string")))))) || (stryMutAct_9fa48("2360") ? ownerId.trim() : (stryCov_9fa48("2360"), !(stryMutAct_9fa48("2361") ? ownerId : (stryCov_9fa48("2361"), ownerId.trim())))))) {
          if (stryMutAct_9fa48("2362")) {
            {}
          } else {
            stryCov_9fa48("2362");
            return errorResponse(400, stryMutAct_9fa48("2363") ? "" : (stryCov_9fa48("2363"), "El campo 'ownerId' es obligatorio."), path);
          }
        }
        if (stryMutAct_9fa48("2366") ? false : stryMutAct_9fa48("2365") ? true : stryMutAct_9fa48("2364") ? /^[A-Za-z0-9_-]{1,100}$/.test(ownerId) : (stryCov_9fa48("2364", "2365", "2366"), !(stryMutAct_9fa48("2370") ? /^[^A-Za-z0-9_-]{1,100}$/ : stryMutAct_9fa48("2369") ? /^[A-Za-z0-9_-]$/ : stryMutAct_9fa48("2368") ? /^[A-Za-z0-9_-]{1,100}/ : stryMutAct_9fa48("2367") ? /[A-Za-z0-9_-]{1,100}$/ : (stryCov_9fa48("2367", "2368", "2369", "2370"), /^[A-Za-z0-9_-]{1,100}$/)).test(ownerId))) {
          if (stryMutAct_9fa48("2371")) {
            {}
          } else {
            stryCov_9fa48("2371");
            return errorResponse(400, stryMutAct_9fa48("2372") ? "" : (stryCov_9fa48("2372"), "El campo 'ownerId' debe ser un identificador válido de hasta 100 caracteres."), path);
          }
        }

        // File validation: Size & MIME
        if (stryMutAct_9fa48("2376") ? file.size <= MAX_EVIDENCE_FILE_SIZE_BYTES : stryMutAct_9fa48("2375") ? file.size >= MAX_EVIDENCE_FILE_SIZE_BYTES : stryMutAct_9fa48("2374") ? false : stryMutAct_9fa48("2373") ? true : (stryCov_9fa48("2373", "2374", "2375", "2376"), file.size > MAX_EVIDENCE_FILE_SIZE_BYTES)) {
          if (stryMutAct_9fa48("2377")) {
            {}
          } else {
            stryCov_9fa48("2377");
            return errorResponse(413, stryMutAct_9fa48("2378") ? `` : (stryCov_9fa48("2378"), `El archivo supera el tamaño máximo permitido de ${EVIDENCE_FILE_SIZE_LABEL}.`), path);
          }
        }
        const mimeType = stryMutAct_9fa48("2381") ? file.type && "application/octet-stream" : stryMutAct_9fa48("2380") ? false : stryMutAct_9fa48("2379") ? true : (stryCov_9fa48("2379", "2380", "2381"), file.type || (stryMutAct_9fa48("2382") ? "" : (stryCov_9fa48("2382"), "application/octet-stream")));
        if (stryMutAct_9fa48("2385") ? false : stryMutAct_9fa48("2384") ? true : stryMutAct_9fa48("2383") ? ALLOWED_MIME_TYPES.has(mimeType) : (stryCov_9fa48("2383", "2384", "2385"), !ALLOWED_MIME_TYPES.has(mimeType))) {
          if (stryMutAct_9fa48("2386")) {
            {}
          } else {
            stryCov_9fa48("2386");
            return errorResponse(400, stryMutAct_9fa48("2387") ? "" : (stryCov_9fa48("2387"), "Tipo de archivo no permitido. Solo se aceptan JPEG, PNG, WebP o PDF."), path);
          }
        }
        if (stryMutAct_9fa48("2389") ? false : stryMutAct_9fa48("2388") ? true : (stryCov_9fa48("2388", "2389"), backendMode(session))) {
          if (stryMutAct_9fa48("2390")) {
            {}
          } else {
            stryCov_9fa48("2390");
            if (stryMutAct_9fa48("2393") ? scenario.actor.kind === "FIELD" || ownerType !== "CONTAINER" : stryMutAct_9fa48("2392") ? false : stryMutAct_9fa48("2391") ? true : (stryCov_9fa48("2391", "2392", "2393"), (stryMutAct_9fa48("2395") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("2394") ? true : (stryCov_9fa48("2394", "2395"), scenario.actor.kind === (stryMutAct_9fa48("2396") ? "" : (stryCov_9fa48("2396"), "FIELD")))) && (stryMutAct_9fa48("2398") ? ownerType === "CONTAINER" : stryMutAct_9fa48("2397") ? true : (stryCov_9fa48("2397", "2398"), ownerType !== (stryMutAct_9fa48("2399") ? "" : (stryCov_9fa48("2399"), "CONTAINER")))))) {
              if (stryMutAct_9fa48("2400")) {
                {}
              } else {
                stryCov_9fa48("2400");
                const rawServiceId = (stryMutAct_9fa48("2403") ? ownerType !== "ZONE_RESULT" : stryMutAct_9fa48("2402") ? false : stryMutAct_9fa48("2401") ? true : (stryCov_9fa48("2401", "2402", "2403"), ownerType === (stryMutAct_9fa48("2404") ? "" : (stryCov_9fa48("2404"), "ZONE_RESULT")))) ? formData.get(stryMutAct_9fa48("2405") ? "" : (stryCov_9fa48("2405"), "serviceId")) : null;
                if (stryMutAct_9fa48("2408") ? rawServiceId !== null || typeof rawServiceId !== "string" || !scopeIdSchema.safeParse(rawServiceId).success : stryMutAct_9fa48("2407") ? false : stryMutAct_9fa48("2406") ? true : (stryCov_9fa48("2406", "2407", "2408"), (stryMutAct_9fa48("2410") ? rawServiceId === null : stryMutAct_9fa48("2409") ? true : (stryCov_9fa48("2409", "2410"), rawServiceId !== null)) && (stryMutAct_9fa48("2412") ? typeof rawServiceId !== "string" && !scopeIdSchema.safeParse(rawServiceId).success : stryMutAct_9fa48("2411") ? true : (stryCov_9fa48("2411", "2412"), (stryMutAct_9fa48("2414") ? typeof rawServiceId === "string" : stryMutAct_9fa48("2413") ? false : (stryCov_9fa48("2413", "2414"), typeof rawServiceId !== (stryMutAct_9fa48("2415") ? "" : (stryCov_9fa48("2415"), "string")))) || (stryMutAct_9fa48("2416") ? scopeIdSchema.safeParse(rawServiceId).success : (stryCov_9fa48("2416"), !scopeIdSchema.safeParse(rawServiceId).success)))))) {
                  if (stryMutAct_9fa48("2417")) {
                    {}
                  } else {
                    stryCov_9fa48("2417");
                    return errorResponse(400, stryMutAct_9fa48("2418") ? "" : (stryCov_9fa48("2418"), "El campo 'serviceId' debe ser un identificador válido de hasta 100 caracteres."), path);
                  }
                }
                const denied = await checkBackendEvidenceCrew(request, ownerType, ownerId, rawServiceId as string | null, stryMutAct_9fa48("2419") ? session.crew.id : (stryCov_9fa48("2419"), session.crew?.id), path);
                if (stryMutAct_9fa48("2421") ? false : stryMutAct_9fa48("2420") ? true : (stryCov_9fa48("2420", "2421"), denied)) return denied;
              }
            }
            // UploadEvidenceDto (forbidNonWhitelisted) sólo acepta file, ownerType y ownerId:
            // fileName es metadato local y daría 400.
            const backendForm = new FormData();
            backendForm.append(stryMutAct_9fa48("2423") ? "" : (stryCov_9fa48("2423"), "file"), file);
            backendForm.append(stryMutAct_9fa48("2425") ? "" : (stryCov_9fa48("2425"), "ownerType"), ownerType);
            backendForm.append(stryMutAct_9fa48("2427") ? "" : (stryCov_9fa48("2427"), "ownerId"), ownerId);
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("2428") ? "" : (stryCov_9fa48("2428"), "/evidence"), undefined, stryMutAct_9fa48("2429") ? {} : (stryCov_9fa48("2429"), {
              method: stryMutAct_9fa48("2430") ? "" : (stryCov_9fa48("2430"), "POST"),
              headers: stryMutAct_9fa48("2431") ? {} : (stryCov_9fa48("2431"), {
                "Idempotency-Key": idempotencyKey
              }),
              body: backendForm
            }), stryMutAct_9fa48("2432") ? {} : (stryCov_9fa48("2432"), {
              timeoutMs: 60_000
            }));
            return forwardResponse(backendResponse);
          }
        }

        // Validate owner exists and resolve the Service it belongs to, for the crew-ownership check below
        let owningService = null;
        if (stryMutAct_9fa48("2435") ? ownerType !== "ZONE_RESULT" : stryMutAct_9fa48("2434") ? false : stryMutAct_9fa48("2433") ? true : (stryCov_9fa48("2433", "2434", "2435"), ownerType === (stryMutAct_9fa48("2436") ? "" : (stryCov_9fa48("2436"), "ZONE_RESULT")))) {
          if (stryMutAct_9fa48("2437")) {
            {}
          } else {
            stryCov_9fa48("2437");
            const zoneResult = zoneResultFixtures.find(stryMutAct_9fa48("2438") ? () => undefined : (stryCov_9fa48("2438"), zr => stryMutAct_9fa48("2441") ? zr.id !== ownerId : stryMutAct_9fa48("2440") ? false : stryMutAct_9fa48("2439") ? true : (stryCov_9fa48("2439", "2440", "2441"), zr.id === ownerId)));
            if (stryMutAct_9fa48("2444") ? false : stryMutAct_9fa48("2443") ? true : stryMutAct_9fa48("2442") ? zoneResult : (stryCov_9fa48("2442", "2443", "2444"), !zoneResult)) {
              if (stryMutAct_9fa48("2445")) {
                {}
              } else {
                stryCov_9fa48("2445");
                return errorResponse(404, stryMutAct_9fa48("2446") ? `` : (stryCov_9fa48("2446"), `El resultado de zona ${ownerId} no existe.`), path);
              }
            }
            owningService = stryMutAct_9fa48("2447") ? serviceFixtures.find(s => s.id === zoneResult.serviceId) && null : (stryCov_9fa48("2447"), serviceFixtures.find(stryMutAct_9fa48("2448") ? () => undefined : (stryCov_9fa48("2448"), s => stryMutAct_9fa48("2451") ? s.id !== zoneResult.serviceId : stryMutAct_9fa48("2450") ? false : stryMutAct_9fa48("2449") ? true : (stryCov_9fa48("2449", "2450", "2451"), s.id === zoneResult.serviceId))) ?? null);
          }
        }
        if (stryMutAct_9fa48("2454") ? ownerType !== "SERVICE" : stryMutAct_9fa48("2453") ? false : stryMutAct_9fa48("2452") ? true : (stryCov_9fa48("2452", "2453", "2454"), ownerType === (stryMutAct_9fa48("2455") ? "" : (stryCov_9fa48("2455"), "SERVICE")))) {
          if (stryMutAct_9fa48("2456")) {
            {}
          } else {
            stryCov_9fa48("2456");
            owningService = stryMutAct_9fa48("2457") ? serviceFixtures.find(s => s.id === ownerId) && null : (stryCov_9fa48("2457"), serviceFixtures.find(stryMutAct_9fa48("2458") ? () => undefined : (stryCov_9fa48("2458"), s => stryMutAct_9fa48("2461") ? s.id !== ownerId : stryMutAct_9fa48("2460") ? false : stryMutAct_9fa48("2459") ? true : (stryCov_9fa48("2459", "2460", "2461"), s.id === ownerId))) ?? null);
            if (stryMutAct_9fa48("2464") ? false : stryMutAct_9fa48("2463") ? true : stryMutAct_9fa48("2462") ? owningService : (stryCov_9fa48("2462", "2463", "2464"), !owningService)) {
              if (stryMutAct_9fa48("2465")) {
                {}
              } else {
                stryCov_9fa48("2465");
                return errorResponse(404, stryMutAct_9fa48("2466") ? `` : (stryCov_9fa48("2466"), `El servicio ${ownerId} no existe.`), path);
              }
            }
          }
        }
        if (stryMutAct_9fa48("2469") ? ownerType !== "CONTAINER" : stryMutAct_9fa48("2468") ? false : stryMutAct_9fa48("2467") ? true : (stryCov_9fa48("2467", "2468", "2469"), ownerType === (stryMutAct_9fa48("2470") ? "" : (stryCov_9fa48("2470"), "CONTAINER")))) {
          if (stryMutAct_9fa48("2471")) {
            {}
          } else {
            stryCov_9fa48("2471");
            const container = getContainerFixture(ownerId);
            if (stryMutAct_9fa48("2474") ? false : stryMutAct_9fa48("2473") ? true : stryMutAct_9fa48("2472") ? container : (stryCov_9fa48("2472", "2473", "2474"), !container)) {
              if (stryMutAct_9fa48("2475")) {
                {}
              } else {
                stryCov_9fa48("2475");
                return errorResponse(404, stryMutAct_9fa48("2476") ? `` : (stryCov_9fa48("2476"), `El contenedor ${ownerId} no existe.`), path);
              }
            }
          }
        }
        if (stryMutAct_9fa48("2479") ? ownerType !== "INSPECTION" : stryMutAct_9fa48("2478") ? false : stryMutAct_9fa48("2477") ? true : (stryCov_9fa48("2477", "2478", "2479"), ownerType === (stryMutAct_9fa48("2480") ? "" : (stryCov_9fa48("2480"), "INSPECTION")))) {
          if (stryMutAct_9fa48("2481")) {
            {}
          } else {
            stryCov_9fa48("2481");
            const inspection = getEnvironmentalInspectionFixture(ownerId);
            const owningInspectionService = (stryMutAct_9fa48("2482") ? inspection.serviceId : (stryCov_9fa48("2482"), inspection?.serviceId)) ? stryMutAct_9fa48("2483") ? serviceFixtures.find(candidate => candidate.id === inspection.serviceId) && null : (stryCov_9fa48("2483"), serviceFixtures.find(stryMutAct_9fa48("2484") ? () => undefined : (stryCov_9fa48("2484"), candidate => stryMutAct_9fa48("2487") ? candidate.id !== inspection.serviceId : stryMutAct_9fa48("2486") ? false : stryMutAct_9fa48("2485") ? true : (stryCov_9fa48("2485", "2486", "2487"), candidate.id === inspection.serviceId))) ?? null) : null;
            if (stryMutAct_9fa48("2490") ? false : stryMutAct_9fa48("2489") ? true : stryMutAct_9fa48("2488") ? inspection : (stryCov_9fa48("2488", "2489", "2490"), !inspection)) return errorResponse(404, stryMutAct_9fa48("2491") ? `` : (stryCov_9fa48("2491"), `La inspección ${ownerId} no existe.`), path);
            if (stryMutAct_9fa48("2494") ? scenario.actor.kind === "FIELD" || !owningInspectionService || owningInspectionService.crewId !== scenario.actor.crewId : stryMutAct_9fa48("2493") ? false : stryMutAct_9fa48("2492") ? true : (stryCov_9fa48("2492", "2493", "2494"), (stryMutAct_9fa48("2496") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("2495") ? true : (stryCov_9fa48("2495", "2496"), scenario.actor.kind === (stryMutAct_9fa48("2497") ? "" : (stryCov_9fa48("2497"), "FIELD")))) && (stryMutAct_9fa48("2499") ? !owningInspectionService && owningInspectionService.crewId !== scenario.actor.crewId : stryMutAct_9fa48("2498") ? true : (stryCov_9fa48("2498", "2499"), (stryMutAct_9fa48("2500") ? owningInspectionService : (stryCov_9fa48("2500"), !owningInspectionService)) || (stryMutAct_9fa48("2502") ? owningInspectionService.crewId === scenario.actor.crewId : stryMutAct_9fa48("2501") ? false : (stryCov_9fa48("2501", "2502"), owningInspectionService.crewId !== scenario.actor.crewId)))))) {
              if (stryMutAct_9fa48("2503")) {
                {}
              } else {
                stryCov_9fa48("2503");
                return errorResponse(403, stryMutAct_9fa48("2504") ? "" : (stryCov_9fa48("2504"), "Solo la cuadrilla asignada puede subir evidencia de esta inspección."), path);
              }
            }
          }
        }
        if (stryMutAct_9fa48("2507") ? (ownerType === "SERVICE" || ownerType === "ZONE_RESULT") && scenario.actor.kind === "FIELD" || !owningService || !scenario.actor.crewId || owningService.crewId !== scenario.actor.crewId : stryMutAct_9fa48("2506") ? false : stryMutAct_9fa48("2505") ? true : (stryCov_9fa48("2505", "2506", "2507"), (stryMutAct_9fa48("2509") ? ownerType === "SERVICE" || ownerType === "ZONE_RESULT" || scenario.actor.kind === "FIELD" : stryMutAct_9fa48("2508") ? true : (stryCov_9fa48("2508", "2509"), (stryMutAct_9fa48("2511") ? ownerType === "SERVICE" && ownerType === "ZONE_RESULT" : stryMutAct_9fa48("2510") ? true : (stryCov_9fa48("2510", "2511"), (stryMutAct_9fa48("2513") ? ownerType !== "SERVICE" : stryMutAct_9fa48("2512") ? false : (stryCov_9fa48("2512", "2513"), ownerType === (stryMutAct_9fa48("2514") ? "" : (stryCov_9fa48("2514"), "SERVICE")))) || (stryMutAct_9fa48("2516") ? ownerType !== "ZONE_RESULT" : stryMutAct_9fa48("2515") ? false : (stryCov_9fa48("2515", "2516"), ownerType === (stryMutAct_9fa48("2517") ? "" : (stryCov_9fa48("2517"), "ZONE_RESULT")))))) && (stryMutAct_9fa48("2519") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("2518") ? true : (stryCov_9fa48("2518", "2519"), scenario.actor.kind === (stryMutAct_9fa48("2520") ? "" : (stryCov_9fa48("2520"), "FIELD")))))) && (stryMutAct_9fa48("2522") ? (!owningService || !scenario.actor.crewId) && owningService.crewId !== scenario.actor.crewId : stryMutAct_9fa48("2521") ? true : (stryCov_9fa48("2521", "2522"), (stryMutAct_9fa48("2524") ? !owningService && !scenario.actor.crewId : stryMutAct_9fa48("2523") ? false : (stryCov_9fa48("2523", "2524"), (stryMutAct_9fa48("2525") ? owningService : (stryCov_9fa48("2525"), !owningService)) || (stryMutAct_9fa48("2526") ? scenario.actor.crewId : (stryCov_9fa48("2526"), !scenario.actor.crewId)))) || (stryMutAct_9fa48("2528") ? owningService.crewId === scenario.actor.crewId : stryMutAct_9fa48("2527") ? false : (stryCov_9fa48("2527", "2528"), owningService.crewId !== scenario.actor.crewId)))))) {
          if (stryMutAct_9fa48("2529")) {
            {}
          } else {
            stryCov_9fa48("2529");
            return errorResponse(403, stryMutAct_9fa48("2530") ? "" : (stryCov_9fa48("2530"), "Solo la cuadrilla asignada al servicio puede subir evidencia."), path);
          }
        }

        // Authorization always precedes a mock replay. Backend idempotency stays upstream.
        const cacheKey = stryMutAct_9fa48("2531") ? `` : (stryCov_9fa48("2531"), `${session.scenarioId}:${stryMutAct_9fa48("2532") ? scenario.actor.crewId && scenario.actor.kind : (stryCov_9fa48("2532"), scenario.actor.crewId ?? scenario.actor.kind)}:${ownerType}:${ownerId}:${idempotencyKey}`);
        const cachedAttachment = evidenceCache.get(cacheKey);
        if (stryMutAct_9fa48("2534") ? false : stryMutAct_9fa48("2533") ? true : (stryCov_9fa48("2533", "2534"), cachedAttachment)) {
          if (stryMutAct_9fa48("2535")) {
            {}
          } else {
            stryCov_9fa48("2535");
            return NextResponse.json(cachedAttachment, stryMutAct_9fa48("2536") ? {} : (stryCov_9fa48("2536"), {
              status: 200
            }));
          }
        }
        const rawNameFromForm = formData.get(stryMutAct_9fa48("2537") ? "" : (stryCov_9fa48("2537"), "fileName"));
        const fileObjName = (file as {
          name?: string;
        }).name;
        const fileName = stryMutAct_9fa48("2540") ? ((typeof rawNameFromForm === "string" && rawNameFromForm.trim() ? rawNameFromForm : null) || (fileObjName && fileObjName !== "blob" ? fileObjName : null)) && "archivo" : stryMutAct_9fa48("2539") ? false : stryMutAct_9fa48("2538") ? true : (stryCov_9fa48("2538", "2539", "2540"), (stryMutAct_9fa48("2542") ? (typeof rawNameFromForm === "string" && rawNameFromForm.trim() ? rawNameFromForm : null) && (fileObjName && fileObjName !== "blob" ? fileObjName : null) : stryMutAct_9fa48("2541") ? false : (stryCov_9fa48("2541", "2542"), ((stryMutAct_9fa48("2545") ? typeof rawNameFromForm === "string" || rawNameFromForm.trim() : stryMutAct_9fa48("2544") ? false : stryMutAct_9fa48("2543") ? true : (stryCov_9fa48("2543", "2544", "2545"), (stryMutAct_9fa48("2547") ? typeof rawNameFromForm !== "string" : stryMutAct_9fa48("2546") ? true : (stryCov_9fa48("2546", "2547"), typeof rawNameFromForm === (stryMutAct_9fa48("2548") ? "" : (stryCov_9fa48("2548"), "string")))) && (stryMutAct_9fa48("2549") ? rawNameFromForm : (stryCov_9fa48("2549"), rawNameFromForm.trim())))) ? rawNameFromForm : null) || ((stryMutAct_9fa48("2552") ? fileObjName || fileObjName !== "blob" : stryMutAct_9fa48("2551") ? false : stryMutAct_9fa48("2550") ? true : (stryCov_9fa48("2550", "2551", "2552"), fileObjName && (stryMutAct_9fa48("2554") ? fileObjName === "blob" : stryMutAct_9fa48("2553") ? true : (stryCov_9fa48("2553", "2554"), fileObjName !== (stryMutAct_9fa48("2555") ? "" : (stryCov_9fa48("2555"), "blob")))))) ? fileObjName : null))) || (stryMutAct_9fa48("2556") ? "" : (stryCov_9fa48("2556"), "archivo")));
        const sanitizedFilename = sanitizeFilename(fileName, mimeType);
        const attachment: Attachment = stryMutAct_9fa48("2557") ? {} : (stryCov_9fa48("2557"), {
          id: stryMutAct_9fa48("2558") ? `` : (stryCov_9fa48("2558"), `att-${randomInt(1000, 9999)}`),
          url: stryMutAct_9fa48("2559") ? `` : (stryCov_9fa48("2559"), `/mock/evidence/${sanitizedFilename}`),
          filename: sanitizedFilename,
          contentType: mimeType,
          uploadedAt: new Date().toISOString()
        });
        if (stryMutAct_9fa48("2562") ? ownerType !== "ZONE_RESULT" : stryMutAct_9fa48("2561") ? false : stryMutAct_9fa48("2560") ? true : (stryCov_9fa48("2560", "2561", "2562"), ownerType === (stryMutAct_9fa48("2563") ? "" : (stryCov_9fa48("2563"), "ZONE_RESULT")))) {
          if (stryMutAct_9fa48("2564")) {
            {}
          } else {
            stryCov_9fa48("2564");
            if (stryMutAct_9fa48("2565")) {
              ;
            } else {
              stryCov_9fa48("2565");
              addAttachmentToZoneResult(ownerId, attachment);
            }
          }
        }
        if (stryMutAct_9fa48("2568") ? ownerType !== "SERVICE" : stryMutAct_9fa48("2567") ? false : stryMutAct_9fa48("2566") ? true : (stryCov_9fa48("2566", "2567", "2568"), ownerType === (stryMutAct_9fa48("2569") ? "" : (stryCov_9fa48("2569"), "SERVICE")))) {
          if (stryMutAct_9fa48("2570")) {
            {}
          } else {
            stryCov_9fa48("2570");
            if (stryMutAct_9fa48("2571")) {
              ;
            } else {
              stryCov_9fa48("2571");
              addAttachmentToService(ownerId, attachment);
            }
          }
        }
        if (stryMutAct_9fa48("2574") ? ownerType !== "CONTAINER" : stryMutAct_9fa48("2573") ? false : stryMutAct_9fa48("2572") ? true : (stryCov_9fa48("2572", "2573", "2574"), ownerType === (stryMutAct_9fa48("2575") ? "" : (stryCov_9fa48("2575"), "CONTAINER")))) {
          if (stryMutAct_9fa48("2576")) {
            {}
          } else {
            stryCov_9fa48("2576");
            if (stryMutAct_9fa48("2577")) {
              ;
            } else {
              stryCov_9fa48("2577");
              addAttachmentToContainer(ownerId, attachment);
            }
          }
        }
        if (stryMutAct_9fa48("2580") ? ownerType !== "INSPECTION" : stryMutAct_9fa48("2579") ? false : stryMutAct_9fa48("2578") ? true : (stryCov_9fa48("2578", "2579", "2580"), ownerType === (stryMutAct_9fa48("2581") ? "" : (stryCov_9fa48("2581"), "INSPECTION")))) {
          if (stryMutAct_9fa48("2582")) {
            {}
          } else {
            stryCov_9fa48("2582");
            if (stryMutAct_9fa48("2583")) {
              ;
            } else {
              stryCov_9fa48("2583");
              addAttachmentToInspection(ownerId, attachment);
            }
          }
        }
        if (stryMutAct_9fa48("2584")) {
          ;
        } else {
          stryCov_9fa48("2584");
          evidenceCache.set(cacheKey, attachment);
        }
        return NextResponse.json(attachment, stryMutAct_9fa48("2585") ? {} : (stryCov_9fa48("2585"), {
          status: 201
        }));
      }
    } catch (caught: unknown) {
      if (stryMutAct_9fa48("2586")) {
        {}
      } else {
        stryCov_9fa48("2586");
        if (stryMutAct_9fa48("2588") ? false : stryMutAct_9fa48("2587") ? true : (stryCov_9fa48("2587", "2588"), caught instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("2589")) {
            {}
          } else {
            stryCov_9fa48("2589");
            return errorResponse(503, caught.message, path);
          }
        }
        if (stryMutAct_9fa48("2591") ? false : stryMutAct_9fa48("2590") ? true : (stryCov_9fa48("2590", "2591"), caught instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("2592")) {
            {}
          } else {
            stryCov_9fa48("2592");
            recordTelemetryEvent(stryMutAct_9fa48("2594") ? {} : (stryCov_9fa48("2594"), {
              name: stryMutAct_9fa48("2595") ? "" : (stryCov_9fa48("2595"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("2596") ? "" : (stryCov_9fa48("2596"), "La sesión no está activa o es inválida."), path);
          }
        }
        return mapSessionError(caught, path, stryMutAct_9fa48("2597") ? "" : (stryCov_9fa48("2597"), "Error interno del servidor."));
      }
    }
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("2598")) {
    {}
  } else {
    stryCov_9fa48("2598");
    const path = new URL(request.url).pathname;
    const url = new URL(request.url);
    const ownerType = url.searchParams.get(stryMutAct_9fa48("2599") ? "" : (stryCov_9fa48("2599"), "ownerType"));
    const ownerId = url.searchParams.get(stryMutAct_9fa48("2600") ? "" : (stryCov_9fa48("2600"), "ownerId"));
    try {
      if (stryMutAct_9fa48("2601")) {
        {}
      } else {
        stryCov_9fa48("2601");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("2604") ? !ownerType && !ownerId : stryMutAct_9fa48("2603") ? false : stryMutAct_9fa48("2602") ? true : (stryCov_9fa48("2602", "2603", "2604"), (stryMutAct_9fa48("2605") ? ownerType : (stryCov_9fa48("2605"), !ownerType)) || (stryMutAct_9fa48("2606") ? ownerId : (stryCov_9fa48("2606"), !ownerId)))) {
          if (stryMutAct_9fa48("2607")) {
            {}
          } else {
            stryCov_9fa48("2607");
            return errorResponse(400, stryMutAct_9fa48("2608") ? "" : (stryCov_9fa48("2608"), "Los parámetros ownerType y ownerId son obligatorios."), path);
          }
        }
        const parsedOwnerType = evidenceOwnerTypeSchema.safeParse(ownerType);
        if (stryMutAct_9fa48("2611") ? false : stryMutAct_9fa48("2610") ? true : stryMutAct_9fa48("2609") ? parsedOwnerType.success : (stryCov_9fa48("2609", "2610", "2611"), !parsedOwnerType.success)) {
          if (stryMutAct_9fa48("2612")) {
            {}
          } else {
            stryCov_9fa48("2612");
            return errorResponse(400, stryMutAct_9fa48("2613") ? "" : (stryCov_9fa48("2613"), "Tipo de propietario de evidencia inválido."), path);
          }
        }

        // Con backend real el dueño no vive en los fixtures: sin este proxy, el GET devolvía 404 para todo id real (#732).
        if (stryMutAct_9fa48("2615") ? false : stryMutAct_9fa48("2614") ? true : (stryCov_9fa48("2614", "2615"), backendMode(session))) {
          if (stryMutAct_9fa48("2616")) {
            {}
          } else {
            stryCov_9fa48("2616");
            if (stryMutAct_9fa48("2619") ? false : stryMutAct_9fa48("2618") ? true : stryMutAct_9fa48("2617") ? /^[A-Za-z0-9_-]{1,100}$/.test(ownerId) : (stryCov_9fa48("2617", "2618", "2619"), !(stryMutAct_9fa48("2623") ? /^[^A-Za-z0-9_-]{1,100}$/ : stryMutAct_9fa48("2622") ? /^[A-Za-z0-9_-]$/ : stryMutAct_9fa48("2621") ? /^[A-Za-z0-9_-]{1,100}/ : stryMutAct_9fa48("2620") ? /[A-Za-z0-9_-]{1,100}$/ : (stryCov_9fa48("2620", "2621", "2622", "2623"), /^[A-Za-z0-9_-]{1,100}$/)).test(ownerId))) {
              if (stryMutAct_9fa48("2624")) {
                {}
              } else {
                stryCov_9fa48("2624");
                return errorResponse(400, stryMutAct_9fa48("2625") ? "" : (stryCov_9fa48("2625"), "El parámetro ownerId debe ser un identificador válido de hasta 100 caracteres."), path);
              }
            }
            // El backend no filtra el GET por cuadrilla ni dueño (cualquier rol de M6): Campo pasa por el mismo chequeo que el POST.
            if (stryMutAct_9fa48("2628") ? getScenario(session).actor.kind === "FIELD" || parsedOwnerType.data !== "CONTAINER" : stryMutAct_9fa48("2627") ? false : stryMutAct_9fa48("2626") ? true : (stryCov_9fa48("2626", "2627", "2628"), (stryMutAct_9fa48("2630") ? getScenario(session).actor.kind !== "FIELD" : stryMutAct_9fa48("2629") ? true : (stryCov_9fa48("2629", "2630"), getScenario(session).actor.kind === (stryMutAct_9fa48("2631") ? "" : (stryCov_9fa48("2631"), "FIELD")))) && (stryMutAct_9fa48("2633") ? parsedOwnerType.data === "CONTAINER" : stryMutAct_9fa48("2632") ? true : (stryCov_9fa48("2632", "2633"), parsedOwnerType.data !== (stryMutAct_9fa48("2634") ? "" : (stryCov_9fa48("2634"), "CONTAINER")))))) {
              if (stryMutAct_9fa48("2635")) {
                {}
              } else {
                stryCov_9fa48("2635");
                const rawServiceId = url.searchParams.get(stryMutAct_9fa48("2636") ? "" : (stryCov_9fa48("2636"), "serviceId"));
                if (stryMutAct_9fa48("2639") ? rawServiceId !== null || !scopeIdSchema.safeParse(rawServiceId).success : stryMutAct_9fa48("2638") ? false : stryMutAct_9fa48("2637") ? true : (stryCov_9fa48("2637", "2638", "2639"), (stryMutAct_9fa48("2641") ? rawServiceId === null : stryMutAct_9fa48("2640") ? true : (stryCov_9fa48("2640", "2641"), rawServiceId !== null)) && (stryMutAct_9fa48("2642") ? scopeIdSchema.safeParse(rawServiceId).success : (stryCov_9fa48("2642"), !scopeIdSchema.safeParse(rawServiceId).success)))) {
                  if (stryMutAct_9fa48("2643")) {
                    {}
                  } else {
                    stryCov_9fa48("2643");
                    return errorResponse(400, stryMutAct_9fa48("2644") ? "" : (stryCov_9fa48("2644"), "El parámetro serviceId debe ser un identificador válido de hasta 100 caracteres."), path);
                  }
                }
                const denied = await checkBackendEvidenceCrew(request, parsedOwnerType.data, ownerId, rawServiceId, stryMutAct_9fa48("2645") ? session.crew.id : (stryCov_9fa48("2645"), session.crew?.id), path);
                if (stryMutAct_9fa48("2647") ? false : stryMutAct_9fa48("2646") ? true : (stryCov_9fa48("2646", "2647"), denied)) return denied;
              }
            }
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("2648") ? `` : (stryCov_9fa48("2648"), `/evidence?ownerType=${parsedOwnerType.data}&ownerId=${encodeURIComponent(ownerId)}`));
            return forwardResponse(backendResponse);
          }
        }
        if (stryMutAct_9fa48("2651") ? parsedOwnerType.data !== "CONTAINER" : stryMutAct_9fa48("2650") ? false : stryMutAct_9fa48("2649") ? true : (stryCov_9fa48("2649", "2650", "2651"), parsedOwnerType.data === (stryMutAct_9fa48("2652") ? "" : (stryCov_9fa48("2652"), "CONTAINER")))) {
          if (stryMutAct_9fa48("2653")) {
            {}
          } else {
            stryCov_9fa48("2653");
            const container = getContainerFixture(ownerId);
            if (stryMutAct_9fa48("2656") ? false : stryMutAct_9fa48("2655") ? true : stryMutAct_9fa48("2654") ? container : (stryCov_9fa48("2654", "2655", "2656"), !container)) {
              if (stryMutAct_9fa48("2657")) {
                {}
              } else {
                stryCov_9fa48("2657");
                return errorResponse(404, stryMutAct_9fa48("2658") ? `` : (stryCov_9fa48("2658"), `El contenedor ${ownerId} no existe.`), path);
              }
            }
            return NextResponse.json(getContainerAttachments(ownerId));
          }
        }
        if (stryMutAct_9fa48("2661") ? parsedOwnerType.data !== "SERVICE" : stryMutAct_9fa48("2660") ? false : stryMutAct_9fa48("2659") ? true : (stryCov_9fa48("2659", "2660", "2661"), parsedOwnerType.data === (stryMutAct_9fa48("2662") ? "" : (stryCov_9fa48("2662"), "SERVICE")))) {
          if (stryMutAct_9fa48("2663")) {
            {}
          } else {
            stryCov_9fa48("2663");
            const service = serviceFixtures.find(stryMutAct_9fa48("2664") ? () => undefined : (stryCov_9fa48("2664"), s => stryMutAct_9fa48("2667") ? s.id !== ownerId : stryMutAct_9fa48("2666") ? false : stryMutAct_9fa48("2665") ? true : (stryCov_9fa48("2665", "2666", "2667"), s.id === ownerId)));
            if (stryMutAct_9fa48("2670") ? false : stryMutAct_9fa48("2669") ? true : stryMutAct_9fa48("2668") ? service : (stryCov_9fa48("2668", "2669", "2670"), !service)) {
              if (stryMutAct_9fa48("2671")) {
                {}
              } else {
                stryCov_9fa48("2671");
                return errorResponse(404, stryMutAct_9fa48("2672") ? `` : (stryCov_9fa48("2672"), `El servicio ${ownerId} no existe.`), path);
              }
            }
            return NextResponse.json(stryMutAct_9fa48("2673") ? service.attachments && [] : (stryCov_9fa48("2673"), service.attachments ?? (stryMutAct_9fa48("2674") ? ["Stryker was here"] : (stryCov_9fa48("2674"), []))));
          }
        }
        if (stryMutAct_9fa48("2677") ? parsedOwnerType.data !== "ZONE_RESULT" : stryMutAct_9fa48("2676") ? false : stryMutAct_9fa48("2675") ? true : (stryCov_9fa48("2675", "2676", "2677"), parsedOwnerType.data === (stryMutAct_9fa48("2678") ? "" : (stryCov_9fa48("2678"), "ZONE_RESULT")))) {
          if (stryMutAct_9fa48("2679")) {
            {}
          } else {
            stryCov_9fa48("2679");
            const zr = zoneResultFixtures.find(stryMutAct_9fa48("2680") ? () => undefined : (stryCov_9fa48("2680"), r => stryMutAct_9fa48("2683") ? r.id !== ownerId : stryMutAct_9fa48("2682") ? false : stryMutAct_9fa48("2681") ? true : (stryCov_9fa48("2681", "2682", "2683"), r.id === ownerId)));
            if (stryMutAct_9fa48("2686") ? false : stryMutAct_9fa48("2685") ? true : stryMutAct_9fa48("2684") ? zr : (stryCov_9fa48("2684", "2685", "2686"), !zr)) {
              if (stryMutAct_9fa48("2687")) {
                {}
              } else {
                stryCov_9fa48("2687");
                return errorResponse(404, stryMutAct_9fa48("2688") ? `` : (stryCov_9fa48("2688"), `El resultado de zona ${ownerId} no existe.`), path);
              }
            }
            return NextResponse.json(stryMutAct_9fa48("2689") ? zr.attachments && [] : (stryCov_9fa48("2689"), zr.attachments ?? (stryMutAct_9fa48("2690") ? ["Stryker was here"] : (stryCov_9fa48("2690"), []))));
          }
        }
        if (stryMutAct_9fa48("2693") ? parsedOwnerType.data !== "INSPECTION" : stryMutAct_9fa48("2692") ? false : stryMutAct_9fa48("2691") ? true : (stryCov_9fa48("2691", "2692", "2693"), parsedOwnerType.data === (stryMutAct_9fa48("2694") ? "" : (stryCov_9fa48("2694"), "INSPECTION")))) {
          if (stryMutAct_9fa48("2695")) {
            {}
          } else {
            stryCov_9fa48("2695");
            const inspection = getEnvironmentalInspectionFixture(ownerId);
            if (stryMutAct_9fa48("2698") ? false : stryMutAct_9fa48("2697") ? true : stryMutAct_9fa48("2696") ? inspection : (stryCov_9fa48("2696", "2697", "2698"), !inspection)) return errorResponse(404, stryMutAct_9fa48("2699") ? `` : (stryCov_9fa48("2699"), `La inspección ${ownerId} no existe.`), path);
            return NextResponse.json(stryMutAct_9fa48("2700") ? getInspectionAttachments(ownerId) && [] : (stryCov_9fa48("2700"), getInspectionAttachments(ownerId) ?? (stryMutAct_9fa48("2701") ? ["Stryker was here"] : (stryCov_9fa48("2701"), []))));
          }
        }
        return NextResponse.json(stryMutAct_9fa48("2702") ? ["Stryker was here"] : (stryCov_9fa48("2702"), []));
      }
    } catch (caught: unknown) {
      if (stryMutAct_9fa48("2703")) {
        {}
      } else {
        stryCov_9fa48("2703");
        if (stryMutAct_9fa48("2706") ? caught instanceof AuthUnavailableError && caught instanceof InvalidSessionError : stryMutAct_9fa48("2705") ? false : stryMutAct_9fa48("2704") ? true : (stryCov_9fa48("2704", "2705", "2706"), caught instanceof AuthUnavailableError || caught instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("2707")) {
            {}
          } else {
            stryCov_9fa48("2707");
            recordTelemetryEvent(stryMutAct_9fa48("2709") ? {} : (stryCov_9fa48("2709"), {
              name: stryMutAct_9fa48("2710") ? "" : (stryCov_9fa48("2710"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("2711") ? "" : (stryCov_9fa48("2711"), "La sesión no está activa o es inválida."), path);
          }
        }
        return mapSessionError(caught, path, stryMutAct_9fa48("2712") ? "" : (stryCov_9fa48("2712"), "Error interno del servidor."));
      }
    }
  }
}