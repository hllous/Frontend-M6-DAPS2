import type { DisposalSite, DisposalSiteQuery } from "./disposal-sites";

const initialDisposalSites: DisposalSite[] = [
  { id: "ds-transfer-north", code: "RS-01", siteType: "TRANSFER_STATION", name: "Estación Norte", active: true },
  { id: "ds-landfill-west", code: "RS-02", siteType: "LANDFILL", name: "Relleno Oeste", active: true },
  { id: "ds-recycling-central", code: "RS-03", siteType: "RECYCLING_PLANT", name: "Planta de reciclaje Central", active: true },
];

export const disposalSiteFixtures: DisposalSite[] = structuredClone(initialDisposalSites);
export function resetDisposalSiteFixtures() { disposalSiteFixtures.splice(0, disposalSiteFixtures.length, ...structuredClone(initialDisposalSites)); }
export function filterDisposalSiteFixtures(query: DisposalSiteQuery) {
  return disposalSiteFixtures.filter((item) => {
    if (query.active !== undefined && item.active !== query.active) return false;
    if (query.siteType && item.siteType !== query.siteType) return false;
    if (query.search && !`${item.code} ${item.name}`.toLowerCase().includes(query.search.toLowerCase())) return false;
    return true;
  });
}
export function paginateDisposalSiteFixtures(items: DisposalSite[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), meta: { total: items.length, page, pageSize, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) } };
}
export function addDisposalSiteFixture(item: DisposalSite) { disposalSiteFixtures.push(item); }
export function updateDisposalSiteFixture(id: string, changes: Partial<DisposalSite>) { const item = disposalSiteFixtures.find((candidate) => candidate.id === id); if (!item) return undefined; Object.assign(item, changes); return item; }
