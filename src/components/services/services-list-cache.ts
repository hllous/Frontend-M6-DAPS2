import type { Service } from "@/lib/services";

export type ServicesListPeriod = "semana" | "mes" | "todo";

type Content = { services: Service[]; dropped: number; period: ServicesListPeriod };
type Entry = Content & { key: string; choice: ServicesListPeriod | null; storedAt: number };

// Dos minutos: alcanza para ir y volver entre pestañas; lo que cambie desde otra pantalla se ve en la próxima carga.
const MAX_AGE_MS = 2 * 60 * 1000;

let entry: Entry | null = null;

/** Quién pide la lista: usuario y alcance (oficina o cuadrilla). */
export function servicesListCacheKey(userId: string, scope: string): string {
  return `${userId}|${scope}`;
}

/**
 * Lista de servicios de esta sesión, para no volver a pedirla al volver a la pantalla. Sin período elegido
 * (`choice` nulo, como al entrar desde el menú) sirve la última lista, sea cual sea su período.
 */
export function readServicesListCache(key: string, choice: ServicesListPeriod | null): Content | null {
  if (!entry || entry.key !== key || Date.now() - entry.storedAt > MAX_AGE_MS) return null;
  if (choice !== null && entry.choice !== choice) return null;
  return { services: entry.services, dropped: entry.dropped, period: entry.period };
}

/** Se llama con cada cambio de la lista cargada (crear, editar, asignar): la copia nunca queda atrás. */
export function writeServicesListCache(key: string, choice: ServicesListPeriod | null, value: Content): void {
  const sameLoad = entry?.key === key && entry.choice === choice && entry.period === value.period;
  entry = { key, choice, ...value, storedAt: sameLoad ? entry!.storedAt : Date.now() };
}

export function invalidateServicesListCache(): void {
  entry = null;
}
