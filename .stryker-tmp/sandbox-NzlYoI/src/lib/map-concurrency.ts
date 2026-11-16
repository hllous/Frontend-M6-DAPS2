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
export async function mapWithConcurrency<T, R>(values: readonly T[], limit: number, work: (value: T) => Promise<R>): Promise<R[]> {
  if (stryMutAct_9fa48("11499")) {
    {}
  } else {
    stryCov_9fa48("11499");
    const results: R[] = stryMutAct_9fa48("11500") ? new Array() : (stryCov_9fa48("11500"), new Array(values.length));
    let next = 0;
    await Promise.all(Array.from(stryMutAct_9fa48("11501") ? {} : (stryCov_9fa48("11501"), {
      length: stryMutAct_9fa48("11502") ? Math.max(limit, values.length) : (stryCov_9fa48("11502"), Math.min(limit, values.length))
    }), async () => {
      if (stryMutAct_9fa48("11503")) {
        {}
      } else {
        stryCov_9fa48("11503");
        while (stryMutAct_9fa48("11506") ? next >= values.length : stryMutAct_9fa48("11505") ? next <= values.length : stryMutAct_9fa48("11504") ? false : (stryCov_9fa48("11504", "11505", "11506"), next < values.length)) {
          if (stryMutAct_9fa48("11507")) {
            {}
          } else {
            stryCov_9fa48("11507");
            const index = stryMutAct_9fa48("11508") ? next-- : (stryCov_9fa48("11508"), next++);
            results[index] = await work(values[index]!);
          }
        }
      }
    }));
    return results;
  }
}