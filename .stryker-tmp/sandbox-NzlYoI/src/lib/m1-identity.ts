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
export type M1IdentityKind = "USER" | "ORGANIZATION";
export type M1IdentityReference = {
  id: string;
  displayName: string;
  kind: M1IdentityKind;
};
const users: M1IdentityReference[] = stryMutAct_9fa48("10860") ? [] : (stryCov_9fa48("10860"), [stryMutAct_9fa48("10861") ? {} : (stryCov_9fa48("10861"), {
  id: stryMutAct_9fa48("10862") ? "" : (stryCov_9fa48("10862"), "user-maria"),
  displayName: stryMutAct_9fa48("10863") ? "" : (stryCov_9fa48("10863"), "María Fernández"),
  kind: stryMutAct_9fa48("10864") ? "" : (stryCov_9fa48("10864"), "USER")
}), stryMutAct_9fa48("10865") ? {} : (stryCov_9fa48("10865"), {
  id: stryMutAct_9fa48("10866") ? "" : (stryCov_9fa48("10866"), "user-carlos"),
  displayName: stryMutAct_9fa48("10867") ? "" : (stryCov_9fa48("10867"), "Carlos López"),
  kind: stryMutAct_9fa48("10868") ? "" : (stryCov_9fa48("10868"), "USER")
}), stryMutAct_9fa48("10869") ? {} : (stryCov_9fa48("10869"), {
  id: stryMutAct_9fa48("10870") ? "" : (stryCov_9fa48("10870"), "user-jorge"),
  displayName: stryMutAct_9fa48("10871") ? "" : (stryCov_9fa48("10871"), "Jorge Ibáñez"),
  kind: stryMutAct_9fa48("10872") ? "" : (stryCov_9fa48("10872"), "USER")
}), stryMutAct_9fa48("10873") ? {} : (stryCov_9fa48("10873"), {
  id: stryMutAct_9fa48("10874") ? "" : (stryCov_9fa48("10874"), "user-lucia"),
  displayName: stryMutAct_9fa48("10875") ? "" : (stryCov_9fa48("10875"), "Lucía Gómez"),
  kind: stryMutAct_9fa48("10876") ? "" : (stryCov_9fa48("10876"), "USER")
}), stryMutAct_9fa48("10877") ? {} : (stryCov_9fa48("10877"), {
  id: stryMutAct_9fa48("10878") ? "" : (stryCov_9fa48("10878"), "user-ana"),
  displayName: stryMutAct_9fa48("10879") ? "" : (stryCov_9fa48("10879"), "Ana Morales"),
  kind: stryMutAct_9fa48("10880") ? "" : (stryCov_9fa48("10880"), "USER")
}), stryMutAct_9fa48("10881") ? {} : (stryCov_9fa48("10881"), {
  id: stryMutAct_9fa48("10882") ? "" : (stryCov_9fa48("10882"), "user-pedro"),
  displayName: stryMutAct_9fa48("10883") ? "" : (stryCov_9fa48("10883"), "Pedro Ruiz"),
  kind: stryMutAct_9fa48("10884") ? "" : (stryCov_9fa48("10884"), "USER")
})]);
const organizations: M1IdentityReference[] = stryMutAct_9fa48("10885") ? [] : (stryCov_9fa48("10885"), [stryMutAct_9fa48("10886") ? {} : (stryCov_9fa48("10886"), {
  id: stryMutAct_9fa48("10887") ? "" : (stryCov_9fa48("10887"), "org-municipal"),
  displayName: stryMutAct_9fa48("10888") ? "" : (stryCov_9fa48("10888"), "Municipalidad"),
  kind: stryMutAct_9fa48("10889") ? "" : (stryCov_9fa48("10889"), "ORGANIZATION")
}), stryMutAct_9fa48("10890") ? {} : (stryCov_9fa48("10890"), {
  id: stryMutAct_9fa48("10891") ? "" : (stryCov_9fa48("10891"), "org-cooperativa"),
  displayName: stryMutAct_9fa48("10892") ? "" : (stryCov_9fa48("10892"), "Cooperativa del Sur"),
  kind: stryMutAct_9fa48("10893") ? "" : (stryCov_9fa48("10893"), "ORGANIZATION")
}), stryMutAct_9fa48("10894") ? {} : (stryCov_9fa48("10894"), {
  id: stryMutAct_9fa48("10895") ? "" : (stryCov_9fa48("10895"), "org-contratista"),
  displayName: stryMutAct_9fa48("10896") ? "" : (stryCov_9fa48("10896"), "Servicios Urbanos S.A."),
  kind: stryMutAct_9fa48("10897") ? "" : (stryCov_9fa48("10897"), "ORGANIZATION")
})]);

// Replace this fixture implementation with the confirmed M1 lookup adapter when its contract exists.
export const m1IdentityAdapter = stryMutAct_9fa48("10898") ? {} : (stryCov_9fa48("10898"), {
  async getUser(id: string) {
    if (stryMutAct_9fa48("10899")) {
      {}
    } else {
      stryCov_9fa48("10899");
      return stryMutAct_9fa48("10900") ? users.find(item => item.id === id) && {
        id,
        displayName: "Persona sin nombre registrado",
        kind: "USER" as const
      } : (stryCov_9fa48("10900"), users.find(stryMutAct_9fa48("10901") ? () => undefined : (stryCov_9fa48("10901"), item => stryMutAct_9fa48("10904") ? item.id !== id : stryMutAct_9fa48("10903") ? false : stryMutAct_9fa48("10902") ? true : (stryCov_9fa48("10902", "10903", "10904"), item.id === id))) ?? (stryMutAct_9fa48("10905") ? {} : (stryCov_9fa48("10905"), {
        id,
        displayName: stryMutAct_9fa48("10906") ? "" : (stryCov_9fa48("10906"), "Persona sin nombre registrado"),
        kind: "USER" as const
      })));
    }
  },
  async getOrganization(id: string) {
    if (stryMutAct_9fa48("10907")) {
      {}
    } else {
      stryCov_9fa48("10907");
      return stryMutAct_9fa48("10908") ? organizations.find(item => item.id === id) && {
        id,
        displayName: "Organización sin nombre registrado",
        kind: "ORGANIZATION" as const
      } : (stryCov_9fa48("10908"), organizations.find(stryMutAct_9fa48("10909") ? () => undefined : (stryCov_9fa48("10909"), item => stryMutAct_9fa48("10912") ? item.id !== id : stryMutAct_9fa48("10911") ? false : stryMutAct_9fa48("10910") ? true : (stryCov_9fa48("10910", "10911", "10912"), item.id === id))) ?? (stryMutAct_9fa48("10913") ? {} : (stryCov_9fa48("10913"), {
        id,
        displayName: stryMutAct_9fa48("10914") ? "" : (stryCov_9fa48("10914"), "Organización sin nombre registrado"),
        kind: "ORGANIZATION" as const
      })));
    }
  },
  async listUsers() {
    if (stryMutAct_9fa48("10915")) {
      {}
    } else {
      stryCov_9fa48("10915");
      return users;
    }
  },
  async listOrganizations() {
    if (stryMutAct_9fa48("10916")) {
      {}
    } else {
      stryCov_9fa48("10916");
      return organizations;
    }
  }
});
export async function personNameOrLegajo(id: string): Promise<string> {
  if (stryMutAct_9fa48("10917")) {
    {}
  } else {
    stryCov_9fa48("10917");
    const person = await m1IdentityAdapter.getUser(id);
    return (stryMutAct_9fa48("10920") ? person.displayName !== "Persona sin nombre registrado" : stryMutAct_9fa48("10919") ? false : stryMutAct_9fa48("10918") ? true : (stryCov_9fa48("10918", "10919", "10920"), person.displayName === (stryMutAct_9fa48("10921") ? "" : (stryCov_9fa48("10921"), "Persona sin nombre registrado")))) ? stryMutAct_9fa48("10922") ? `` : (stryCov_9fa48("10922"), `Legajo ${id}`) : person.displayName;
  }
}