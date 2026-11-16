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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBackend } from "@/lib/bff-backend";
import { addEnvironmentalReportFixture, createEnvironmentalReportFixture, filterEnvironmentalReportFixtures, getSanctionOutcomeIntegrationExceptions, paginateEnvironmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { createEnvironmentalReportInputSchema, environmentalReportSchema, environmentalReportDateRangeSchema, environmentalReportPrioritySchema, environmentalReportStatusSchema, environmentalReportTypeSchema, type EnvironmentalReport, type EnvironmentalReportQuery, type EnvironmentalReportStatus } from "@/lib/environmental-reports";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
import { droppedRecords, tolerantRecords } from "@/lib/tolerant-records";
function parseStatuses(searchParams: URLSearchParams): {
  statuses?: EnvironmentalReportStatus[];
  error?: string;
} {
  if (stryMutAct_9fa48("1519")) {
    {}
  } else {
    stryCov_9fa48("1519");
    const parsed = z.array(environmentalReportStatusSchema).safeParse(searchParams.getAll(stryMutAct_9fa48("1520") ? "" : (stryCov_9fa48("1520"), "status")));
    if (stryMutAct_9fa48("1523") ? false : stryMutAct_9fa48("1522") ? true : stryMutAct_9fa48("1521") ? parsed.success : (stryCov_9fa48("1521", "1522", "1523"), !parsed.success)) return stryMutAct_9fa48("1524") ? {} : (stryCov_9fa48("1524"), {
      error: parsed.error.issues.map(stryMutAct_9fa48("1525") ? () => undefined : (stryCov_9fa48("1525"), issue => issue.message)).join(stryMutAct_9fa48("1526") ? "" : (stryCov_9fa48("1526"), " "))
    });
    const statuses = stryMutAct_9fa48("1527") ? [] : (stryCov_9fa48("1527"), [...new Set(parsed.data)]);
    return stryMutAct_9fa48("1528") ? {} : (stryCov_9fa48("1528"), {
      statuses: (stryMutAct_9fa48("1532") ? statuses.length <= 0 : stryMutAct_9fa48("1531") ? statuses.length >= 0 : stryMutAct_9fa48("1530") ? false : stryMutAct_9fa48("1529") ? true : (stryCov_9fa48("1529", "1530", "1531", "1532"), statuses.length > 0)) ? statuses : undefined
    });
  }
}
function queryFromUrl(url: URL, status?: EnvironmentalReportQuery["status"]): EnvironmentalReportQuery {
  if (stryMutAct_9fa48("1533")) {
    {}
  } else {
    stryCov_9fa48("1533");
    return stryMutAct_9fa48("1534") ? {} : (stryCov_9fa48("1534"), {
      status,
      reportType: environmentalReportTypeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("1535") ? "" : (stryCov_9fa48("1535"), "reportType"))).data,
      priority: environmentalReportPrioritySchema.safeParse(url.searchParams.get(stryMutAct_9fa48("1536") ? "" : (stryCov_9fa48("1536"), "priority"))).data,
      publicId: stryMutAct_9fa48("1537") ? url.searchParams.get("publicId") && undefined : (stryCov_9fa48("1537"), url.searchParams.get(stryMutAct_9fa48("1538") ? "" : (stryCov_9fa48("1538"), "publicId")) ?? undefined),
      ticketId: stryMutAct_9fa48("1539") ? url.searchParams.get("ticketId") && undefined : (stryCov_9fa48("1539"), url.searchParams.get(stryMutAct_9fa48("1540") ? "" : (stryCov_9fa48("1540"), "ticketId")) ?? undefined),
      from: stryMutAct_9fa48("1543") ? url.searchParams.get("from") && undefined : stryMutAct_9fa48("1542") ? false : stryMutAct_9fa48("1541") ? true : (stryCov_9fa48("1541", "1542", "1543"), url.searchParams.get(stryMutAct_9fa48("1544") ? "" : (stryCov_9fa48("1544"), "from")) || undefined),
      to: stryMutAct_9fa48("1547") ? url.searchParams.get("to") && undefined : stryMutAct_9fa48("1546") ? false : stryMutAct_9fa48("1545") ? true : (stryCov_9fa48("1545", "1546", "1547"), url.searchParams.get(stryMutAct_9fa48("1548") ? "" : (stryCov_9fa48("1548"), "to")) || undefined),
      search: searchParam(url.searchParams),
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function visibleToField(report: {
  assignedCrewId?: string | null;
}, scenario: ReturnType<typeof getScenario>) {
  if (stryMutAct_9fa48("1549")) {
    {}
  } else {
    stryCov_9fa48("1549");
    return stryMutAct_9fa48("1552") ? scenario.actor.kind !== "FIELD" && Boolean(scenario.actor.crewId && report.assignedCrewId === scenario.actor.crewId) : stryMutAct_9fa48("1551") ? false : stryMutAct_9fa48("1550") ? true : (stryCov_9fa48("1550", "1551", "1552"), (stryMutAct_9fa48("1554") ? scenario.actor.kind === "FIELD" : stryMutAct_9fa48("1553") ? false : (stryCov_9fa48("1553", "1554"), scenario.actor.kind !== (stryMutAct_9fa48("1555") ? "" : (stryCov_9fa48("1555"), "FIELD")))) || Boolean(stryMutAct_9fa48("1558") ? scenario.actor.crewId || report.assignedCrewId === scenario.actor.crewId : stryMutAct_9fa48("1557") ? false : stryMutAct_9fa48("1556") ? true : (stryCov_9fa48("1556", "1557", "1558"), scenario.actor.crewId && (stryMutAct_9fa48("1560") ? report.assignedCrewId !== scenario.actor.crewId : stryMutAct_9fa48("1559") ? true : (stryCov_9fa48("1559", "1560"), report.assignedCrewId === scenario.actor.crewId)))));
  }
}
function matchesQuery(report: EnvironmentalReport, query: EnvironmentalReportQuery) {
  if (stryMutAct_9fa48("1561")) {
    {}
  } else {
    stryCov_9fa48("1561");
    const statuses = Array.isArray(query.status) ? query.status : query.status ? stryMutAct_9fa48("1562") ? [] : (stryCov_9fa48("1562"), [query.status]) : stryMutAct_9fa48("1563") ? ["Stryker was here"] : (stryCov_9fa48("1563"), []);
    if (stryMutAct_9fa48("1566") ? statuses.length > 0 || !statuses.includes(report.status) : stryMutAct_9fa48("1565") ? false : stryMutAct_9fa48("1564") ? true : (stryCov_9fa48("1564", "1565", "1566"), (stryMutAct_9fa48("1569") ? statuses.length <= 0 : stryMutAct_9fa48("1568") ? statuses.length >= 0 : stryMutAct_9fa48("1567") ? true : (stryCov_9fa48("1567", "1568", "1569"), statuses.length > 0)) && (stryMutAct_9fa48("1570") ? statuses.includes(report.status) : (stryCov_9fa48("1570"), !statuses.includes(report.status))))) return stryMutAct_9fa48("1571") ? true : (stryCov_9fa48("1571"), false);
    if (stryMutAct_9fa48("1574") ? query.reportType || report.reportType !== query.reportType : stryMutAct_9fa48("1573") ? false : stryMutAct_9fa48("1572") ? true : (stryCov_9fa48("1572", "1573", "1574"), query.reportType && (stryMutAct_9fa48("1576") ? report.reportType === query.reportType : stryMutAct_9fa48("1575") ? true : (stryCov_9fa48("1575", "1576"), report.reportType !== query.reportType)))) return stryMutAct_9fa48("1577") ? true : (stryCov_9fa48("1577"), false);
    if (stryMutAct_9fa48("1580") ? query.priority || report.priority !== query.priority : stryMutAct_9fa48("1579") ? false : stryMutAct_9fa48("1578") ? true : (stryCov_9fa48("1578", "1579", "1580"), query.priority && (stryMutAct_9fa48("1582") ? report.priority === query.priority : stryMutAct_9fa48("1581") ? true : (stryCov_9fa48("1581", "1582"), report.priority !== query.priority)))) return stryMutAct_9fa48("1583") ? true : (stryCov_9fa48("1583"), false);
    if (stryMutAct_9fa48("1586") ? query.publicId || report.publicId !== query.publicId : stryMutAct_9fa48("1585") ? false : stryMutAct_9fa48("1584") ? true : (stryCov_9fa48("1584", "1585", "1586"), query.publicId && (stryMutAct_9fa48("1588") ? report.publicId === query.publicId : stryMutAct_9fa48("1587") ? true : (stryCov_9fa48("1587", "1588"), report.publicId !== query.publicId)))) return stryMutAct_9fa48("1589") ? true : (stryCov_9fa48("1589"), false);
    if (stryMutAct_9fa48("1592") ? query.ticketId || report.ticketId !== query.ticketId : stryMutAct_9fa48("1591") ? false : stryMutAct_9fa48("1590") ? true : (stryCov_9fa48("1590", "1591", "1592"), query.ticketId && (stryMutAct_9fa48("1594") ? report.ticketId === query.ticketId : stryMutAct_9fa48("1593") ? true : (stryCov_9fa48("1593", "1594"), report.ticketId !== query.ticketId)))) return stryMutAct_9fa48("1595") ? true : (stryCov_9fa48("1595"), false);
    // `search` ya lo resolvió el Backend (dirección, caseNumber, publicId); repetirlo acá descartaba lo encontrado por EXP-….
    return stryMutAct_9fa48("1596") ? false : (stryCov_9fa48("1596"), true);
  }
}
const environmentalReportPageSchema = z.object(stryMutAct_9fa48("1597") ? {} : (stryCov_9fa48("1597"), {
  data: tolerantRecords(environmentalReportSchema, stryMutAct_9fa48("1598") ? "" : (stryCov_9fa48("1598"), "environmental-reports")),
  meta: z.object(stryMutAct_9fa48("1599") ? {} : (stryCov_9fa48("1599"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
})).passthrough();
function backendListQuery(query: EnvironmentalReportQuery, page: number, pageSize: number) {
  if (stryMutAct_9fa48("1600")) {
    {}
  } else {
    stryCov_9fa48("1600");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("1602") ? false : stryMutAct_9fa48("1601") ? true : (stryCov_9fa48("1601", "1602"), query.from)) params.set(stryMutAct_9fa48("1604") ? "" : (stryCov_9fa48("1604"), "from"), query.from);
    if (stryMutAct_9fa48("1606") ? false : stryMutAct_9fa48("1605") ? true : (stryCov_9fa48("1605", "1606"), query.to)) params.set(stryMutAct_9fa48("1608") ? "" : (stryCov_9fa48("1608"), "to"), query.to);
    const statuses = Array.isArray(query.status) ? query.status : query.status ? stryMutAct_9fa48("1609") ? [] : (stryCov_9fa48("1609"), [query.status]) : stryMutAct_9fa48("1610") ? ["Stryker was here"] : (stryCov_9fa48("1610"), []);
    for (const status of statuses) params.append(stryMutAct_9fa48("1612") ? "" : (stryCov_9fa48("1612"), "status"), status);
    if (stryMutAct_9fa48("1614") ? false : stryMutAct_9fa48("1613") ? true : (stryCov_9fa48("1613", "1614"), query.reportType)) params.set(stryMutAct_9fa48("1616") ? "" : (stryCov_9fa48("1616"), "reportType"), query.reportType);
    if (stryMutAct_9fa48("1618") ? false : stryMutAct_9fa48("1617") ? true : (stryCov_9fa48("1617", "1618"), query.priority)) params.set(stryMutAct_9fa48("1620") ? "" : (stryCov_9fa48("1620"), "priority"), query.priority);
    if (stryMutAct_9fa48("1622") ? false : stryMutAct_9fa48("1621") ? true : (stryCov_9fa48("1621", "1622"), query.publicId)) params.set(stryMutAct_9fa48("1624") ? "" : (stryCov_9fa48("1624"), "publicId"), query.publicId);
    if (stryMutAct_9fa48("1626") ? false : stryMutAct_9fa48("1625") ? true : (stryCov_9fa48("1625", "1626"), query.ticketId)) params.set(stryMutAct_9fa48("1628") ? "" : (stryCov_9fa48("1628"), "ticketId"), query.ticketId);
    const search = stryMutAct_9fa48("1630") ? query.search.trim() : stryMutAct_9fa48("1629") ? query.search : (stryCov_9fa48("1629", "1630"), query.search?.trim());
    if (stryMutAct_9fa48("1632") ? false : stryMutAct_9fa48("1631") ? true : (stryCov_9fa48("1631", "1632"), search)) params.set(stryMutAct_9fa48("1634") ? "" : (stryCov_9fa48("1634"), "search"), search);
    params.set(stryMutAct_9fa48("1636") ? "" : (stryCov_9fa48("1636"), "page"), String(page));
    params.set(stryMutAct_9fa48("1638") ? "" : (stryCov_9fa48("1638"), "pageSize"), String(pageSize));
    return params.toString();
  }
}
async function listFieldReports(request: Request, query: EnvironmentalReportQuery, crewId: string | undefined, path: string) {
  if (stryMutAct_9fa48("1639")) {
    {}
  } else {
    stryCov_9fa48("1639");
    if (stryMutAct_9fa48("1642") ? false : stryMutAct_9fa48("1641") ? true : stryMutAct_9fa48("1640") ? crewId : (stryCov_9fa48("1640", "1641", "1642"), !crewId)) return errorResponse(403, stryMutAct_9fa48("1643") ? "" : (stryCov_9fa48("1643"), "La sesión no tiene una cuadrilla asignada."), path);
    const backendPageSize = 100;
    const visibleReports: EnvironmentalReport[] = stryMutAct_9fa48("1644") ? ["Stryker was here"] : (stryCov_9fa48("1644"), []);
    let totalPages = 1;
    // ponytail: counts every unreadable record of the scan, not just this crew's (its crew is unreadable); the notice may slightly overstate.
    let dropped = 0;
    for (let page = 1; stryMutAct_9fa48("1647") ? page > totalPages : stryMutAct_9fa48("1646") ? page < totalPages : stryMutAct_9fa48("1645") ? false : (stryCov_9fa48("1645", "1646", "1647"), page <= totalPages); stryMutAct_9fa48("1648") ? page -= 1 : (stryCov_9fa48("1648"), page += 1)) {
      if (stryMutAct_9fa48("1649")) {
        {}
      } else {
        stryCov_9fa48("1649");
        const backendResponse = await fetchBackend(request, stryMutAct_9fa48("1650") ? `` : (stryCov_9fa48("1650"), `/environmental-reports?${backendListQuery(query, page, backendPageSize)}`), stryMutAct_9fa48("1651") ? "" : (stryCov_9fa48("1651"), "environmentalReport:view"));
        if (stryMutAct_9fa48("1654") ? false : stryMutAct_9fa48("1653") ? true : stryMutAct_9fa48("1652") ? backendResponse.ok : (stryCov_9fa48("1652", "1653", "1654"), !backendResponse.ok)) return forwardResponse(backendResponse);
        let payload: unknown;
        try {
          if (stryMutAct_9fa48("1655")) {
            {}
          } else {
            stryCov_9fa48("1655");
            payload = await backendResponse.json();
          }
        } catch {
          if (stryMutAct_9fa48("1656")) {
            {}
          } else {
            stryCov_9fa48("1656");
            return errorResponse(502, stryMutAct_9fa48("1657") ? "" : (stryCov_9fa48("1657"), "La respuesta de expedientes ambientales no contiene JSON válido."), path);
          }
        }
        const parsed = environmentalReportPageSchema.safeParse(payload);
        if (stryMutAct_9fa48("1660") ? false : stryMutAct_9fa48("1659") ? true : stryMutAct_9fa48("1658") ? parsed.success : (stryCov_9fa48("1658", "1659", "1660"), !parsed.success)) return errorResponse(502, stryMutAct_9fa48("1661") ? "" : (stryCov_9fa48("1661"), "No se pudo obtener información válida de expedientes ambientales. Reintente en unos segundos."), path);
        if (stryMutAct_9fa48("1664") ? page !== 1 : stryMutAct_9fa48("1663") ? false : stryMutAct_9fa48("1662") ? true : (stryCov_9fa48("1662", "1663", "1664"), page === 1)) totalPages = stryMutAct_9fa48("1665") ? Math.min(1, parsed.data.meta.totalPages) : (stryCov_9fa48("1665"), Math.max(1, parsed.data.meta.totalPages));
        stryMutAct_9fa48("1666") ? dropped -= droppedRecords(parsed.data.data) : (stryCov_9fa48("1666"), dropped += droppedRecords(parsed.data.data));
        visibleReports.push(...(stryMutAct_9fa48("1668") ? parsed.data.data : (stryCov_9fa48("1668"), parsed.data.data.filter(stryMutAct_9fa48("1669") ? () => undefined : (stryCov_9fa48("1669"), report => stryMutAct_9fa48("1672") ? report.assignedCrewId === crewId || matchesQuery(report, query) : stryMutAct_9fa48("1671") ? false : stryMutAct_9fa48("1670") ? true : (stryCov_9fa48("1670", "1671", "1672"), (stryMutAct_9fa48("1674") ? report.assignedCrewId !== crewId : stryMutAct_9fa48("1673") ? true : (stryCov_9fa48("1673", "1674"), report.assignedCrewId === crewId)) && matchesQuery(report, query)))))));
      }
    }
    const page = stryMutAct_9fa48("1675") ? query.page && 1 : (stryCov_9fa48("1675"), query.page ?? 1);
    const pageSize = stryMutAct_9fa48("1676") ? query.pageSize && 100 : (stryCov_9fa48("1676"), query.pageSize ?? 100);
    return NextResponse.json(stryMutAct_9fa48("1677") ? {} : (stryCov_9fa48("1677"), {
      data: stryMutAct_9fa48("1678") ? visibleReports : (stryCov_9fa48("1678"), visibleReports.slice(stryMutAct_9fa48("1679") ? (page - 1) / pageSize : (stryCov_9fa48("1679"), (stryMutAct_9fa48("1680") ? page + 1 : (stryCov_9fa48("1680"), page - 1)) * pageSize), stryMutAct_9fa48("1681") ? page / pageSize : (stryCov_9fa48("1681"), page * pageSize))),
      meta: stryMutAct_9fa48("1682") ? {} : (stryCov_9fa48("1682"), {
        total: visibleReports.length,
        page,
        pageSize,
        totalPages: stryMutAct_9fa48("1683") ? Math.min(1, Math.ceil(visibleReports.length / pageSize)) : (stryCov_9fa48("1683"), Math.max(1, Math.ceil(stryMutAct_9fa48("1684") ? visibleReports.length * pageSize : (stryCov_9fa48("1684"), visibleReports.length / pageSize)))),
        ...(dropped ? stryMutAct_9fa48("1685") ? {} : (stryCov_9fa48("1685"), {
          dropped
        }) : {})
      }),
      sanctionOutcomeIntegrationExceptions: stryMutAct_9fa48("1686") ? ["Stryker was here"] : (stryCov_9fa48("1686"), [])
    }));
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("1687")) {
    {}
  } else {
    stryCov_9fa48("1687");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1688")) {
        {}
      } else {
        stryCov_9fa48("1688");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1690") ? {} : (stryCov_9fa48("1690"), {
          capability: stryMutAct_9fa48("1691") ? "" : (stryCov_9fa48("1691"), "environmentalReport:view"),
          throwOnError: stryMutAct_9fa48("1692") ? false : (stryCov_9fa48("1692"), true)
        }));
        const scenario = getScenario(session);
        const url = new URL(request.url);
        const parsedStatuses = parseStatuses(url.searchParams);
        if (stryMutAct_9fa48("1694") ? false : stryMutAct_9fa48("1693") ? true : (stryCov_9fa48("1693", "1694"), parsedStatuses.error)) return errorResponse(400, parsedStatuses.error, path);
        const query = queryFromUrl(url, parsedStatuses.statuses);
        const range = environmentalReportDateRangeSchema.safeParse(query);
        if (stryMutAct_9fa48("1697") ? false : stryMutAct_9fa48("1696") ? true : stryMutAct_9fa48("1695") ? range.success : (stryCov_9fa48("1695", "1696", "1697"), !range.success)) return errorResponse(400, range.error.issues.map(stryMutAct_9fa48("1698") ? () => undefined : (stryCov_9fa48("1698"), issue => issue.message)).join(stryMutAct_9fa48("1699") ? "" : (stryCov_9fa48("1699"), " ")), path);
        if (stryMutAct_9fa48("1701") ? false : stryMutAct_9fa48("1700") ? true : (stryCov_9fa48("1700", "1701"), backendMode(session))) {
          if (stryMutAct_9fa48("1702")) {
            {}
          } else {
            stryCov_9fa48("1702");
            if (stryMutAct_9fa48("1705") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1704") ? false : stryMutAct_9fa48("1703") ? true : (stryCov_9fa48("1703", "1704", "1705"), scenario.actor.kind === (stryMutAct_9fa48("1706") ? "" : (stryCov_9fa48("1706"), "FIELD")))) return listFieldReports(request, query, stryMutAct_9fa48("1707") ? session.crew.id : (stryCov_9fa48("1707"), session.crew?.id), path);
            const backendQuery = new URLSearchParams(url.searchParams);
            backendQuery.delete(stryMutAct_9fa48("1709") ? "" : (stryCov_9fa48("1709"), "status"));
            for (const status of stryMutAct_9fa48("1710") ? parsedStatuses.statuses && [] : (stryCov_9fa48("1710"), parsedStatuses.statuses ?? (stryMutAct_9fa48("1711") ? ["Stryker was here"] : (stryCov_9fa48("1711"), [])))) backendQuery.append(stryMutAct_9fa48("1713") ? "" : (stryCov_9fa48("1713"), "status"), status);
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("1714") ? `` : (stryCov_9fa48("1714"), `/environmental-reports?${backendQuery.toString()}`), stryMutAct_9fa48("1715") ? "" : (stryCov_9fa48("1715"), "environmentalReport:view"));
            return forwardResponse(backendResponse);
          }
        }
        const filtered = stryMutAct_9fa48("1716") ? filterEnvironmentalReportFixtures(query) : (stryCov_9fa48("1716"), filterEnvironmentalReportFixtures(query).filter(stryMutAct_9fa48("1717") ? () => undefined : (stryCov_9fa48("1717"), report => visibleToField(report, scenario))));
        const page = paginateEnvironmentalReportFixtures(filtered, query.page, query.pageSize);
        return NextResponse.json((stryMutAct_9fa48("1720") ? scenario.actor.kind !== "OFFICE" : stryMutAct_9fa48("1719") ? false : stryMutAct_9fa48("1718") ? true : (stryCov_9fa48("1718", "1719", "1720"), scenario.actor.kind === (stryMutAct_9fa48("1721") ? "" : (stryCov_9fa48("1721"), "OFFICE")))) ? stryMutAct_9fa48("1722") ? {} : (stryCov_9fa48("1722"), {
          ...page,
          sanctionOutcomeIntegrationExceptions: getSanctionOutcomeIntegrationExceptions()
        }) : page);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1723")) {
        {}
      } else {
        stryCov_9fa48("1723");
        if (stryMutAct_9fa48("1725") ? false : stryMutAct_9fa48("1724") ? true : (stryCov_9fa48("1724", "1725"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1726") ? "" : (stryCov_9fa48("1726"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1728") ? false : stryMutAct_9fa48("1727") ? true : (stryCov_9fa48("1727", "1728"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1730") ? false : stryMutAct_9fa48("1729") ? true : (stryCov_9fa48("1729", "1730"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1731") ? "" : (stryCov_9fa48("1731"), "La sesión no tiene acceso al control ambiental."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("1732") ? "" : (stryCov_9fa48("1732"), "No se pudieron cargar los expedientes ambientales."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("1733")) {
    {}
  } else {
    stryCov_9fa48("1733");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1734")) {
        {}
      } else {
        stryCov_9fa48("1734");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("1736") ? {} : (stryCov_9fa48("1736"), {
          capability: stryMutAct_9fa48("1737") ? "" : (stryCov_9fa48("1737"), "environmentalReport:create"),
          throwOnError: stryMutAct_9fa48("1738") ? false : (stryCov_9fa48("1738"), true)
        }));
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("1741") ? scenario.actor.kind !== "FIELD" || scenario.actor.kind !== "OFFICE" : stryMutAct_9fa48("1740") ? false : stryMutAct_9fa48("1739") ? true : (stryCov_9fa48("1739", "1740", "1741"), (stryMutAct_9fa48("1743") ? scenario.actor.kind === "FIELD" : stryMutAct_9fa48("1742") ? true : (stryCov_9fa48("1742", "1743"), scenario.actor.kind !== (stryMutAct_9fa48("1744") ? "" : (stryCov_9fa48("1744"), "FIELD")))) && (stryMutAct_9fa48("1746") ? scenario.actor.kind === "OFFICE" : stryMutAct_9fa48("1745") ? true : (stryCov_9fa48("1745", "1746"), scenario.actor.kind !== (stryMutAct_9fa48("1747") ? "" : (stryCov_9fa48("1747"), "OFFICE")))))) return errorResponse(403, stryMutAct_9fa48("1748") ? "" : (stryCov_9fa48("1748"), "Solo Oficina o Campo puede abrir expedientes."), path);
        const body = await request.json().catch(() => undefined);
        const parsed = createEnvironmentalReportInputSchema.safeParse(body);
        if (stryMutAct_9fa48("1751") ? false : stryMutAct_9fa48("1750") ? true : stryMutAct_9fa48("1749") ? parsed.success : (stryCov_9fa48("1749", "1750", "1751"), !parsed.success)) return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("1752") ? () => undefined : (stryCov_9fa48("1752"), issue => issue.message)).join(stryMutAct_9fa48("1753") ? "" : (stryCov_9fa48("1753"), " ")), path);
        if (stryMutAct_9fa48("1755") ? false : stryMutAct_9fa48("1754") ? true : (stryCov_9fa48("1754", "1755"), backendMode(session))) {
          if (stryMutAct_9fa48("1756")) {
            {}
          } else {
            stryCov_9fa48("1756");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("1757") ? "" : (stryCov_9fa48("1757"), "/environmental-reports"), stryMutAct_9fa48("1758") ? "" : (stryCov_9fa48("1758"), "environmentalReport:create"), stryMutAct_9fa48("1759") ? {} : (stryCov_9fa48("1759"), {
              method: stryMutAct_9fa48("1760") ? "" : (stryCov_9fa48("1760"), "POST"),
              headers: stryMutAct_9fa48("1761") ? {} : (stryCov_9fa48("1761"), {
                "content-type": stryMutAct_9fa48("1762") ? "" : (stryCov_9fa48("1762"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const created = createEnvironmentalReportFixture(parsed.data, (stryMutAct_9fa48("1765") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("1764") ? false : stryMutAct_9fa48("1763") ? true : (stryCov_9fa48("1763", "1764", "1765"), scenario.actor.kind === (stryMutAct_9fa48("1766") ? "" : (stryCov_9fa48("1766"), "FIELD")))) ? scenario.actor.crewId : undefined);
        if (stryMutAct_9fa48("1767")) {
          ;
        } else {
          stryCov_9fa48("1767");
          addEnvironmentalReportFixture(created);
        }
        return NextResponse.json(created, stryMutAct_9fa48("1768") ? {} : (stryCov_9fa48("1768"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("1769")) {
        {}
      } else {
        stryCov_9fa48("1769");
        if (stryMutAct_9fa48("1771") ? false : stryMutAct_9fa48("1770") ? true : (stryCov_9fa48("1770", "1771"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1772") ? "" : (stryCov_9fa48("1772"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1774") ? false : stryMutAct_9fa48("1773") ? true : (stryCov_9fa48("1773", "1774"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        if (stryMutAct_9fa48("1776") ? false : stryMutAct_9fa48("1775") ? true : (stryCov_9fa48("1775", "1776"), error instanceof ForbiddenSessionError)) return errorResponse(403, stryMutAct_9fa48("1777") ? "" : (stryCov_9fa48("1777"), "La sesión no tiene permiso para abrir expedientes."), path, FORBIDDEN_CODES.roleRequired);
        return mapSessionError(error, path, stryMutAct_9fa48("1778") ? "" : (stryCov_9fa48("1778"), "No se pudo abrir el expediente ambiental."));
      }
    }
  }
}