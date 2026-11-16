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
import type { ScenarioId } from "./scenarios";

// Datos puros (sin node:crypto): los lee también el navegador. 

/** Persona del seed del backend (prisma/seed.ts): `sub` numérico de M1 y el rol de M1 que le permite sus roles de M6. */
export type DemoIdentity = {
  sub: string;
  m1Role: "RESPONSABLE_AREA" | "ADMINISTRATIVO" | "AUDITOR" | "CIUDADANO";
  name: string;
};

/**
 * Perfil del login -> persona. Las 12 cuentas de M1 (10000 a 10011) existen en el seed del backend; 900 y 901 no tienen filas de roles:
 * el empleado sin rol recibe `roles: []` de GET /me y el ciudadano un 403 por `sub_type`.
 */
export const DEMO_IDENTITIES: Record<ScenarioId, DemoIdentity> = stryMutAct_9fa48("8189") ? {} : (stryCov_9fa48("8189"), {
  "office-duty-queue": stryMutAct_9fa48("8190") ? {} : (stryCov_9fa48("8190"), {
    sub: stryMutAct_9fa48("8191") ? "" : (stryCov_9fa48("8191"), "10000"),
    m1Role: stryMutAct_9fa48("8192") ? "" : (stryCov_9fa48("8192"), "RESPONSABLE_AREA"),
    name: stryMutAct_9fa48("8193") ? "" : (stryCov_9fa48("8193"), "Carlos Rodríguez")
  }),
  "office-operations": stryMutAct_9fa48("8194") ? {} : (stryCov_9fa48("8194"), {
    sub: stryMutAct_9fa48("8195") ? "" : (stryCov_9fa48("8195"), "10002"),
    m1Role: stryMutAct_9fa48("8196") ? "" : (stryCov_9fa48("8196"), "ADMINISTRATIVO"),
    name: stryMutAct_9fa48("8197") ? "" : (stryCov_9fa48("8197"), "Julián López")
  }),
  "office-environmental": stryMutAct_9fa48("8198") ? {} : (stryCov_9fa48("8198"), {
    sub: stryMutAct_9fa48("8199") ? "" : (stryCov_9fa48("8199"), "10004"),
    m1Role: stryMutAct_9fa48("8200") ? "" : (stryCov_9fa48("8200"), "ADMINISTRATIVO"),
    name: stryMutAct_9fa48("8201") ? "" : (stryCov_9fa48("8201"), "Diego Sosa")
  }),
  "office-limited-intake": stryMutAct_9fa48("8202") ? {} : (stryCov_9fa48("8202"), {
    sub: stryMutAct_9fa48("8203") ? "" : (stryCov_9fa48("8203"), "10007"),
    m1Role: stryMutAct_9fa48("8204") ? "" : (stryCov_9fa48("8204"), "AUDITOR"),
    name: stryMutAct_9fa48("8205") ? "" : (stryCov_9fa48("8205"), "Camila Medina")
  }),
  "field-crew-leader-route": stryMutAct_9fa48("8206") ? {} : (stryCov_9fa48("8206"), {
    sub: stryMutAct_9fa48("8207") ? "" : (stryCov_9fa48("8207"), "10009"),
    m1Role: stryMutAct_9fa48("8208") ? "" : (stryCov_9fa48("8208"), "ADMINISTRATIVO"),
    name: stryMutAct_9fa48("8209") ? "" : (stryCov_9fa48("8209"), "Sofía López")
  }),
  "field-crew-member-route": stryMutAct_9fa48("8210") ? {} : (stryCov_9fa48("8210"), {
    sub: stryMutAct_9fa48("8211") ? "" : (stryCov_9fa48("8211"), "10010"),
    m1Role: stryMutAct_9fa48("8212") ? "" : (stryCov_9fa48("8212"), "ADMINISTRATIVO"),
    name: stryMutAct_9fa48("8213") ? "" : (stryCov_9fa48("8213"), "Diego Martínez")
  }),
  "field-inspector": stryMutAct_9fa48("8214") ? {} : (stryCov_9fa48("8214"), {
    sub: stryMutAct_9fa48("8215") ? "" : (stryCov_9fa48("8215"), "10011"),
    m1Role: stryMutAct_9fa48("8216") ? "" : (stryCov_9fa48("8216"), "ADMINISTRATIVO"),
    name: stryMutAct_9fa48("8217") ? "" : (stryCov_9fa48("8217"), "Carlos Medina")
  }),
  "employee-no-role": stryMutAct_9fa48("8218") ? {} : (stryCov_9fa48("8218"), {
    sub: stryMutAct_9fa48("8219") ? "" : (stryCov_9fa48("8219"), "900"),
    m1Role: stryMutAct_9fa48("8220") ? "" : (stryCov_9fa48("8220"), "ADMINISTRATIVO"),
    name: stryMutAct_9fa48("8221") ? "" : (stryCov_9fa48("8221"), "Empleado sin rol")
  }),
  "citizen": stryMutAct_9fa48("8222") ? {} : (stryCov_9fa48("8222"), {
    sub: stryMutAct_9fa48("8223") ? "" : (stryCov_9fa48("8223"), "901"),
    m1Role: stryMutAct_9fa48("8224") ? "" : (stryCov_9fa48("8224"), "CIUDADANO"),
    name: stryMutAct_9fa48("8225") ? "" : (stryCov_9fa48("8225"), "Ciudadano")
  })
});