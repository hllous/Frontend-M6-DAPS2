/**
 * El backend expone las relaciones como arrays de objetos y, en varios recursos,
 * sólo en el detalle:
 *
 *   GET /crews        → sin miembros          GET /crews/{id} → members: [{ userId }]
 *   GET /zones        → sin barrios           GET /zones/{id} → neighborhoods: [{ neighborhoodId }]
 *   GET /tree-interventions → trees: [{ treeId }]
 *
 * El frontend los consume como ids planos (`memberUserIds`, `neighborhoodIds`,
 * `treeIds`). `withFlatIds` copia la lista plana a partir de la anidada antes de
 * validar, para que un mismo schema acepte el listado y el detalle del backend y
 * las fixtures del modo mock, que ya vienen planas.
 *
 * Se aplana en el frontend y no se pide el campo al backend porque la forma
 * anidada es la que puede crecer (el `zones` de un servicio lleva `sequence`
 * además del id) y porque estos ids sólo se usan en los diálogos de detalle.
 *
 * La clave anidada se descarta al traducirla: en intervenciones, `trees` es
 * además el nombre que el frontend usa para los árboles completos que resuelve
 * por su cuenta, y dejar pasar los `[{ treeId }]` del backend rompería ese campo.
 */
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
export function withFlatIds(from: string, idKey: string, to: string) {
  if (stryMutAct_9fa48("6961")) {
    {}
  } else {
    stryCov_9fa48("6961");
    return (value: unknown) => {
      if (stryMutAct_9fa48("6962")) {
        {}
      } else {
        stryCov_9fa48("6962");
        if (stryMutAct_9fa48("6965") ? (!value || typeof value !== "object") && Array.isArray(value) : stryMutAct_9fa48("6964") ? false : stryMutAct_9fa48("6963") ? true : (stryCov_9fa48("6963", "6964", "6965"), (stryMutAct_9fa48("6967") ? !value && typeof value !== "object" : stryMutAct_9fa48("6966") ? false : (stryCov_9fa48("6966", "6967"), (stryMutAct_9fa48("6968") ? value : (stryCov_9fa48("6968"), !value)) || (stryMutAct_9fa48("6970") ? typeof value === "object" : stryMutAct_9fa48("6969") ? false : (stryCov_9fa48("6969", "6970"), typeof value !== (stryMutAct_9fa48("6971") ? "" : (stryCov_9fa48("6971"), "object")))))) || Array.isArray(value))) return value;
        const record = value as Record<string, unknown>;
        // Lo que ya viene plano gana: el modo mock no pasa por el backend.
        if (stryMutAct_9fa48("6974") ? to in record && !Array.isArray(record[from]) : stryMutAct_9fa48("6973") ? false : stryMutAct_9fa48("6972") ? true : (stryCov_9fa48("6972", "6973", "6974"), to in record || (stryMutAct_9fa48("6975") ? Array.isArray(record[from]) : (stryCov_9fa48("6975"), !Array.isArray(record[from]))))) return value;
        const {
          [from]: nested,
          ...rest
        } = record;
        return stryMutAct_9fa48("6976") ? {} : (stryCov_9fa48("6976"), {
          ...rest,
          [to]: (nested as unknown[]).map(stryMutAct_9fa48("6977") ? () => undefined : (stryCov_9fa48("6977"), item => (stryMutAct_9fa48("6980") ? item || typeof item === "object" : stryMutAct_9fa48("6979") ? false : stryMutAct_9fa48("6978") ? true : (stryCov_9fa48("6978", "6979", "6980"), item && (stryMutAct_9fa48("6982") ? typeof item !== "object" : stryMutAct_9fa48("6981") ? true : (stryCov_9fa48("6981", "6982"), typeof item === (stryMutAct_9fa48("6983") ? "" : (stryCov_9fa48("6983"), "object")))))) ? (item as Record<string, unknown>)[idKey] : item))
        });
      }
    };
  }
}