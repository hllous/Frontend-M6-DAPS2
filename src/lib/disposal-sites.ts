import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";

export const disposalSiteTypeSchema = z.enum(["LANDFILL", "TRANSFER_STATION", "RECYCLING_PLANT", "COMPOSTING_PLANT"]);
export type DisposalSiteType = z.infer<typeof disposalSiteTypeSchema>;

export const disposalSiteSchema = z.object({ id: z.string(), code: z.string(), siteType: disposalSiteTypeSchema, name: z.string(), active: z.boolean() });
export type DisposalSite = z.infer<typeof disposalSiteSchema>;

export const disposalSiteCreateInputSchema = z.object({ code: z.string().trim().min(1, "El código es obligatorio"), siteType: disposalSiteTypeSchema, name: z.string().trim().min(1, "El nombre es obligatorio") });
export type DisposalSiteCreateInput = z.infer<typeof disposalSiteCreateInputSchema>;

export const disposalSiteUpdateInputSchema = z.object({ name: z.string().trim().min(1, "El nombre es obligatorio"), siteType: disposalSiteTypeSchema, active: z.boolean() }).strict();
export type DisposalSiteUpdateInput = z.infer<typeof disposalSiteUpdateInputSchema>;

export type DisposalSiteQuery = { active?: boolean; siteType?: DisposalSiteType; search?: string; page?: number; pageSize?: number };
export type DisposalSitesPage = { disposalSites: DisposalSite[]; page: number; pageSize: number; total: number; totalPages: number };

export class DisposalSiteContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) { super(message, options); this.name = "DisposalSiteContractError"; }
}
export class DisposalSiteRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: { cause?: unknown }) { super(message, options); this.name = "DisposalSiteRequestError"; this.status = status; }
}

const pageSchema = z.object({ data: z.array(disposalSiteSchema), meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }) });
const errorResponseSchema = z.object({ statusCode: z.number(), message: z.union([z.string(), z.array(z.string())]), error: z.string(), timestamp: z.string(), path: z.string() });

function queryString(query: DisposalSiteQuery) {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.siteType) params.set("siteType", query.siteType);
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try { response = await authenticatedFetch(path, init); } catch (cause) { if (cause instanceof NetworkFailureError) throw cause; throw cause; }
  let payload: unknown;
  try { payload = await response.json(); } catch (cause) { throw new DisposalSiteContractError("La respuesta de sitios de disposición no es JSON válido.", { cause }); }
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(payload);
    if (!parsed.success) throw new DisposalSiteContractError("La respuesta de error no respeta el contrato documentado.", { cause: parsed.error });
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
    throw new DisposalSiteRequestError(message, parsed.data.statusCode);
  }
  return payload;
}

function parseResource(payload: unknown): DisposalSite {
  const raw = payload && typeof payload === "object" && "data" in payload && !("id" in payload) ? (payload as { data: unknown }).data : payload;
  const parsed = disposalSiteSchema.safeParse(raw);
  if (!parsed.success) throw new DisposalSiteContractError("El sitio de disposición no respeta el contrato esperado.", { cause: parsed.error });
  return parsed.data;
}

export const disposalSitesAdapter = {
  async list(query: DisposalSiteQuery = {}): Promise<DisposalSitesPage> {
    const parsed = pageSchema.safeParse(await requestJson(`/api/disposal-sites${queryString(query)}`));
    if (!parsed.success) throw new DisposalSiteContractError("La lista de sitios de disposición no respeta el contrato esperado.", { cause: parsed.error });
    return { disposalSites: parsed.data.data, page: parsed.data.meta.page, pageSize: parsed.data.meta.pageSize, total: parsed.data.meta.total, totalPages: parsed.data.meta.totalPages };
  },
  async get(id: string) { return parseResource(await requestJson(`/api/disposal-sites/${id}`)); },
  async create(input: DisposalSiteCreateInput) {
    const parsed = disposalSiteCreateInputSchema.safeParse(input);
    if (!parsed.success) throw new DisposalSiteContractError("Los datos del sitio de disposición son inválidos.", { cause: parsed.error });
    return parseResource(await requestJson("/api/disposal-sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
  },
  async update(id: string, input: DisposalSiteUpdateInput) {
    const parsed = disposalSiteUpdateInputSchema.safeParse(input);
    if (!parsed.success) throw new DisposalSiteContractError("Los datos editables del sitio de disposición son inválidos.", { cause: parsed.error });
    return parseResource(await requestJson(`/api/disposal-sites/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
  },
  async remove(id: string) { return parseResource(await requestJson(`/api/disposal-sites/${id}`, { method: "DELETE" })); },
};
