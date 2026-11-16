/**
 * Cabeceras de seguridad del Frontend (#956, spec #922/#925).
 *
 * - Las cabeceras que no dependen del pedido viven en `next.config.mjs` (`securityHeaders`, `API_CSP`).
 * - La CSP de las páginas lleva un nonce por pedido: la genera `src/proxy.ts` y Next lo copia a sus scripts.
 *   Por eso el layout raíz fuerza el renderizado dinámico (`connection()`).
 */
// @ts-nocheck


/** Teselas de OpenStreetMap que cargan los mapas de Leaflet (`{s}` = a|b|c). */function stryNS_9fa48() {
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
export const TILE_ORIGIN = stryMutAct_9fa48("13808") ? "" : (stryCov_9fa48("13808"), "https://*.tile.openstreetmap.org");
export function newNonce(): string {
  if (stryMutAct_9fa48("13809")) {
    {}
  } else {
    stryCov_9fa48("13809");
    return btoa(crypto.randomUUID());
  }
}
export function buildContentSecurityPolicy({
  nonce,
  isDev
}: {
  nonce: string;
  isDev: boolean;
}): string {
  if (stryMutAct_9fa48("13810")) {
    {}
  } else {
    stryCov_9fa48("13810");
    const directives = stryMutAct_9fa48("13811") ? [] : (stryCov_9fa48("13811"), [stryMutAct_9fa48("13812") ? "" : (stryCov_9fa48("13812"), "default-src 'self'"), // 'strict-dynamic' deja cargar los chunks que Next pide desde un script con nonce. 'unsafe-eval' solo en desarrollo
    // (React lo usa para reconstruir stacks del servidor); en producción no hace falta.
    stryMutAct_9fa48("13813") ? `` : (stryCov_9fa48("13813"), `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? stryMutAct_9fa48("13814") ? "" : (stryCov_9fa48("13814"), " 'unsafe-eval'") : stryMutAct_9fa48("13815") ? "Stryker was here!" : (stryCov_9fa48("13815"), "")}`), // 'unsafe-inline' es inevitable: Leaflet, Recharts y los componentes de shadcn/Base UI posicionan con atributos
    // `style=""`, y sonner inyecta un <style> en runtime; ninguno admite nonce. Los scripts siguen con nonce.
    stryMutAct_9fa48("13816") ? "" : (stryCov_9fa48("13816"), "style-src 'self' 'unsafe-inline'"), // Teselas del mapa y los íconos de Leaflet (data:) más vistas previas locales (blob:).
    stryMutAct_9fa48("13817") ? `` : (stryCov_9fa48("13817"), `img-src 'self' data: blob: ${TILE_ORIGIN}`), stryMutAct_9fa48("13818") ? "" : (stryCov_9fa48("13818"), "font-src 'self'"), // El navegador solo habla con el propio origen (el BFF); en desarrollo, también el websocket de HMR.
    stryMutAct_9fa48("13819") ? `` : (stryCov_9fa48("13819"), `connect-src 'self'${isDev ? stryMutAct_9fa48("13820") ? "" : (stryCov_9fa48("13820"), " ws: wss:") : stryMutAct_9fa48("13821") ? "Stryker was here!" : (stryCov_9fa48("13821"), "")}`), // Service worker de MSW (solo modo mock en desarrollo).
    stryMutAct_9fa48("13822") ? "" : (stryCov_9fa48("13822"), "worker-src 'self' blob:"), stryMutAct_9fa48("13823") ? "" : (stryCov_9fa48("13823"), "manifest-src 'self'"), stryMutAct_9fa48("13824") ? "" : (stryCov_9fa48("13824"), "object-src 'none'"), stryMutAct_9fa48("13825") ? "" : (stryCov_9fa48("13825"), "base-uri 'self'"), stryMutAct_9fa48("13826") ? "" : (stryCov_9fa48("13826"), "form-action 'self'"), stryMutAct_9fa48("13827") ? "" : (stryCov_9fa48("13827"), "frame-ancestors 'none'")]);
    return directives.join(stryMutAct_9fa48("13828") ? "" : (stryCov_9fa48("13828"), "; "));
  }
}