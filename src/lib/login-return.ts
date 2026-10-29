/** Pantallas del shell que se pueden retomar después de volver a ingresar (`/app?destination=<id>`). */
const APP_DESTINATIONS = ["work", "services", "referrals", "inventory", "environment", "map", "catalog", "dashboards"];

export function safeDestination(value: string | string[] | null | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && APP_DESTINATIONS.includes(candidate) ? candidate : undefined;
}

/** Adónde vuelve el login: la pantalla de origen si es una conocida, si no el inicio. */
export function returnPathFor(destination: string | string[] | null | undefined): string {
  const safe = safeDestination(destination);
  return safe ? `/app?destination=${safe}` : "/app";
}

/** Pantalla del shell que muestra una URL: `?destination=` o, en los alias /app/catalog y /app/dashboard, su destino. */
export function destinationOf(location: { pathname?: string; search?: string }): string | undefined {
  if (location.pathname?.startsWith("/app/catalog")) return "catalog";
  if (location.pathname?.startsWith("/app/dashboard")) return "dashboards";
  return safeDestination(new URLSearchParams(location.search ?? "").get("destination"));
}

/** Login al que se manda a una pestaña con la sesión caída, con aviso y la pantalla actual para retomarla. */
export function loginUrl({ expired = false, destination }: { expired?: boolean; destination?: string } = {}): string {
  const params = new URLSearchParams();
  if (expired) params.set("expired", "1");
  const safe = safeDestination(destination);
  if (safe) params.set("destination", safe);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function expiredLoginUrl(location: { pathname?: string; search?: string }): string {
  return loginUrl({ expired: true, destination: destinationOf(location) });
}

/** Cabecera con la que el proxy le pasa a los Server Components la pantalla pedida. */
export const DESTINATION_HEADER = "x-m6-destination";
