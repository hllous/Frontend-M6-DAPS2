/**
 * Cabeceras de seguridad del Frontend (#956, spec #922/#925).
 *
 * - Las cabeceras que no dependen del pedido viven en `next.config.mjs` (`securityHeaders`, `API_CSP`).
 * - La CSP de las páginas lleva un nonce por pedido: la genera `src/proxy.ts` y Next lo copia a sus scripts.
 *   Por eso el layout raíz fuerza el renderizado dinámico (`connection()`).
 */

/** Teselas de OpenStreetMap que cargan los mapas de Leaflet (`{s}` = a|b|c). */
export const TILE_ORIGIN = "https://*.tile.openstreetmap.org";

export function newNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildContentSecurityPolicy({ nonce, isDev }: { nonce: string; isDev: boolean }): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' deja cargar los chunks que Next pide desde un script con nonce. 'unsafe-eval' solo en desarrollo
    // (React lo usa para reconstruir stacks del servidor); en producción no hace falta.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // 'unsafe-inline' es inevitable: Leaflet, Recharts y los componentes de shadcn/Base UI posicionan con atributos
    // `style=""`, y sonner inyecta un <style> en runtime; ninguno admite nonce. Los scripts siguen con nonce.
    "style-src 'self' 'unsafe-inline'",
    // Teselas del mapa y los íconos de Leaflet (data:) más vistas previas locales (blob:).
    `img-src 'self' data: blob: ${TILE_ORIGIN}`,
    "font-src 'self'",
    // El navegador solo habla con el propio origen (el BFF); en desarrollo, también el websocket de HMR.
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    // Service worker de MSW (solo modo mock en desarrollo).
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}
