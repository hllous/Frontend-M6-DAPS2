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
import { containersAdapter, type Container } from "./containers";
import { greenPointsAdapter, type GreenPoint } from "./green-points";
import { greenSpacesAdapter, type GreenSpace } from "./green-spaces";
import { treesAdapter, type Tree } from "./trees";
import { onMapInventoryChanged } from "./map-inventory-events";
const MAP_PAGE_SIZE = 100;
const MAX_CONCURRENT_PAGES = 6;
let activePages = 0;
const waitingPages: Array<() => void> = stryMutAct_9fa48("11849") ? ["Stryker was here"] : (stryCov_9fa48("11849"), []);
async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (stryMutAct_9fa48("11850")) {
    {}
  } else {
    stryCov_9fa48("11850");
    if (stryMutAct_9fa48("11854") ? activePages < MAX_CONCURRENT_PAGES : stryMutAct_9fa48("11853") ? activePages > MAX_CONCURRENT_PAGES : stryMutAct_9fa48("11852") ? false : stryMutAct_9fa48("11851") ? true : (stryCov_9fa48("11851", "11852", "11853", "11854"), activePages >= MAX_CONCURRENT_PAGES)) await new Promise<void>(stryMutAct_9fa48("11855") ? () => undefined : (stryCov_9fa48("11855"), resolve => waitingPages.push(resolve)));else stryMutAct_9fa48("11856") ? activePages-- : (stryCov_9fa48("11856"), activePages++);
    try {
      if (stryMutAct_9fa48("11857")) {
        {}
      } else {
        stryCov_9fa48("11857");
        return await work();
      }
    } finally {
      if (stryMutAct_9fa48("11858")) {
        {}
      } else {
        stryCov_9fa48("11858");
        const next = waitingPages.shift();
        if (stryMutAct_9fa48("11860") ? false : stryMutAct_9fa48("11859") ? true : (stryCov_9fa48("11859", "11860"), next)) {
          if (stryMutAct_9fa48("11861")) {
            ;
          } else {
            stryCov_9fa48("11861");
            next();
          }
        } else stryMutAct_9fa48("11862") ? activePages++ : (stryCov_9fa48("11862"), activePages--);
      }
    }
  }
}
type Page<T> = {
  items: T[];
  page: number;
  totalPages: number;
};
async function loadEveryPage<T>(readPage: (page: number) => Promise<Page<T>>, previous: T[][], onPage: (pages: T[][]) => void): Promise<T[]> {
  if (stryMutAct_9fa48("11863")) {
    {}
  } else {
    stryCov_9fa48("11863");
    const pages = stryMutAct_9fa48("11864") ? previous : (stryCov_9fa48("11864"), previous.slice());
    const first = await limited(stryMutAct_9fa48("11865") ? () => undefined : (stryCov_9fa48("11865"), () => readPage(1)));
    pages[0] = first.items;
    onPage(stryMutAct_9fa48("11867") ? pages : (stryCov_9fa48("11867"), pages.slice()));
    let next = 2;
    const results = await Promise.allSettled(Array.from(stryMutAct_9fa48("11868") ? {} : (stryCov_9fa48("11868"), {
      length: stryMutAct_9fa48("11869") ? Math.max(4, Math.max(0, first.totalPages - 1)) : (stryCov_9fa48("11869"), Math.min(4, stryMutAct_9fa48("11870") ? Math.min(0, first.totalPages - 1) : (stryCov_9fa48("11870"), Math.max(0, stryMutAct_9fa48("11871") ? first.totalPages + 1 : (stryCov_9fa48("11871"), first.totalPages - 1)))))
    }), async () => {
      if (stryMutAct_9fa48("11872")) {
        {}
      } else {
        stryCov_9fa48("11872");
        while (stryMutAct_9fa48("11875") ? next > first.totalPages : stryMutAct_9fa48("11874") ? next < first.totalPages : stryMutAct_9fa48("11873") ? false : (stryCov_9fa48("11873", "11874", "11875"), next <= first.totalPages)) {
          if (stryMutAct_9fa48("11876")) {
            {}
          } else {
            stryCov_9fa48("11876");
            const pageNumber = stryMutAct_9fa48("11877") ? next-- : (stryCov_9fa48("11877"), next++);
            pages[stryMutAct_9fa48("11878") ? pageNumber + 1 : (stryCov_9fa48("11878"), pageNumber - 1)] = (await limited(stryMutAct_9fa48("11879") ? () => undefined : (stryCov_9fa48("11879"), () => readPage(pageNumber)))).items;
            onPage(stryMutAct_9fa48("11881") ? pages : (stryCov_9fa48("11881"), pages.slice()));
          }
        }
      }
    }));
    const failure = results.find(stryMutAct_9fa48("11882") ? () => undefined : (stryCov_9fa48("11882"), result => stryMutAct_9fa48("11885") ? result.status !== "rejected" : stryMutAct_9fa48("11884") ? false : stryMutAct_9fa48("11883") ? true : (stryCov_9fa48("11883", "11884", "11885"), result.status === (stryMutAct_9fa48("11886") ? "" : (stryCov_9fa48("11886"), "rejected")))));
    if (stryMutAct_9fa48("11889") ? failure?.status !== "rejected" : stryMutAct_9fa48("11888") ? false : stryMutAct_9fa48("11887") ? true : (stryCov_9fa48("11887", "11888", "11889"), (stryMutAct_9fa48("11890") ? failure.status : (stryCov_9fa48("11890"), failure?.status)) === (stryMutAct_9fa48("11891") ? "" : (stryCov_9fa48("11891"), "rejected")))) throw failure.reason;
    pages.length = stryMutAct_9fa48("11892") ? Math.min(0, first.totalPages) : (stryCov_9fa48("11892"), Math.max(0, first.totalPages));
    onPage(stryMutAct_9fa48("11894") ? pages : (stryCov_9fa48("11894"), pages.slice()));
    return pages.flat();
  }
}
export type OperationalMapData = {
  containers: Container[];
  greenPoints: GreenPoint[];
  greenSpaces: GreenSpace[];
  trees: Tree[];
};
let pending: Promise<OperationalMapData> | undefined;
let generation = 0;
let snapshot: OperationalMapData | undefined;
let cachedPages: { [K in keyof OperationalMapData]: OperationalMapData[K][] } = stryMutAct_9fa48("11895") ? {} : (stryCov_9fa48("11895"), {
  containers: stryMutAct_9fa48("11896") ? ["Stryker was here"] : (stryCov_9fa48("11896"), []),
  greenPoints: stryMutAct_9fa48("11897") ? ["Stryker was here"] : (stryCov_9fa48("11897"), []),
  greenSpaces: stryMutAct_9fa48("11898") ? ["Stryker was here"] : (stryCov_9fa48("11898"), []),
  trees: stryMutAct_9fa48("11899") ? ["Stryker was here"] : (stryCov_9fa48("11899"), [])
});
const subscribers = new Set<(data: OperationalMapData) => void>();
export const operationalMapAdapter = stryMutAct_9fa48("11900") ? {} : (stryCov_9fa48("11900"), {
  invalidate(preserve = stryMutAct_9fa48("11901") ? true : (stryCov_9fa48("11901"), false)) {
    if (stryMutAct_9fa48("11902")) {
      {}
    } else {
      stryCov_9fa48("11902");
      stryMutAct_9fa48("11903") ? generation-- : (stryCov_9fa48("11903"), generation++);
      pending = undefined;
      if (stryMutAct_9fa48("11906") ? false : stryMutAct_9fa48("11905") ? true : stryMutAct_9fa48("11904") ? preserve : (stryCov_9fa48("11904", "11905", "11906"), !preserve)) {
        if (stryMutAct_9fa48("11907")) {
          {}
        } else {
          stryCov_9fa48("11907");
          snapshot = undefined;
          cachedPages = stryMutAct_9fa48("11908") ? {} : (stryCov_9fa48("11908"), {
            containers: stryMutAct_9fa48("11909") ? ["Stryker was here"] : (stryCov_9fa48("11909"), []),
            greenPoints: stryMutAct_9fa48("11910") ? ["Stryker was here"] : (stryCov_9fa48("11910"), []),
            greenSpaces: stryMutAct_9fa48("11911") ? ["Stryker was here"] : (stryCov_9fa48("11911"), []),
            trees: stryMutAct_9fa48("11912") ? ["Stryker was here"] : (stryCov_9fa48("11912"), [])
          });
        }
      }
    }
  },
  subscribe(listener: (data: OperationalMapData) => void) {
    if (stryMutAct_9fa48("11913")) {
      {}
    } else {
      stryCov_9fa48("11913");
      if (stryMutAct_9fa48("11914")) {
        ;
      } else {
        stryCov_9fa48("11914");
        subscribers.add(listener);
      }
      if (stryMutAct_9fa48("11916") ? false : stryMutAct_9fa48("11915") ? true : (stryCov_9fa48("11915", "11916"), snapshot)) if (stryMutAct_9fa48("11917")) {
        ;
      } else {
        stryCov_9fa48("11917");
        listener(snapshot);
      }
      return () => {
        if (stryMutAct_9fa48("11918")) {
          {}
        } else {
          stryCov_9fa48("11918");
          if (stryMutAct_9fa48("11919")) {
            ;
          } else {
            stryCov_9fa48("11919");
            subscribers.delete(listener);
          }
        }
      };
    }
  },
  load(): Promise<OperationalMapData> {
    if (stryMutAct_9fa48("11920")) {
      {}
    } else {
      stryCov_9fa48("11920");
      if (stryMutAct_9fa48("11922") ? false : stryMutAct_9fa48("11921") ? true : (stryCov_9fa48("11921", "11922"), pending)) return pending;
      const current = this.fetch();
      pending = current;
      current.catch(() => {
        if (stryMutAct_9fa48("11924")) {
          {}
        } else {
          stryCov_9fa48("11924");
          if (stryMutAct_9fa48("11927") ? pending !== current : stryMutAct_9fa48("11926") ? false : stryMutAct_9fa48("11925") ? true : (stryCov_9fa48("11925", "11926", "11927"), pending === current)) {
            if (stryMutAct_9fa48("11928")) {
              {}
            } else {
              stryCov_9fa48("11928");
              stryMutAct_9fa48("11929") ? generation-- : (stryCov_9fa48("11929"), generation++);
              pending = undefined;
            }
          }
        }
      });
      return current;
    }
  },
  async fetch(): Promise<OperationalMapData> {
    if (stryMutAct_9fa48("11930")) {
      {}
    } else {
      stryCov_9fa48("11930");
      const currentGeneration = generation;
      let partial: OperationalMapData = stryMutAct_9fa48("11931") ? snapshot && {
        containers: [],
        greenPoints: [],
        greenSpaces: [],
        trees: []
      } : (stryCov_9fa48("11931"), snapshot ?? (stryMutAct_9fa48("11932") ? {} : (stryCov_9fa48("11932"), {
        containers: stryMutAct_9fa48("11933") ? ["Stryker was here"] : (stryCov_9fa48("11933"), []),
        greenPoints: stryMutAct_9fa48("11934") ? ["Stryker was here"] : (stryCov_9fa48("11934"), []),
        greenSpaces: stryMutAct_9fa48("11935") ? ["Stryker was here"] : (stryCov_9fa48("11935"), []),
        trees: stryMutAct_9fa48("11936") ? ["Stryker was here"] : (stryCov_9fa48("11936"), [])
      })));
      const update = <K extends keyof OperationalMapData,>(key: K, pages: OperationalMapData[K][]) => {
        if (stryMutAct_9fa48("11937")) {
          {}
        } else {
          stryCov_9fa48("11937");
          if (stryMutAct_9fa48("11940") ? generation === currentGeneration : stryMutAct_9fa48("11939") ? false : stryMutAct_9fa48("11938") ? true : (stryCov_9fa48("11938", "11939", "11940"), generation !== currentGeneration)) return;
          cachedPages = stryMutAct_9fa48("11941") ? {} : (stryCov_9fa48("11941"), {
            ...cachedPages,
            [key]: pages
          });
          partial = stryMutAct_9fa48("11942") ? {} : (stryCov_9fa48("11942"), {
            ...partial,
            [key]: pages.flat()
          });
          snapshot = partial;
          subscribers.forEach(stryMutAct_9fa48("11944") ? () => undefined : (stryCov_9fa48("11944"), listener => listener(partial)));
        }
      };
      const results = await Promise.allSettled(stryMutAct_9fa48("11945") ? [] : (stryCov_9fa48("11945"), [loadEveryPage(async page => {
        if (stryMutAct_9fa48("11946")) {
          {}
        } else {
          stryCov_9fa48("11946");
          const result = await containersAdapter.list(stryMutAct_9fa48("11947") ? {} : (stryCov_9fa48("11947"), {
            page,
            pageSize: MAP_PAGE_SIZE
          }));
          return stryMutAct_9fa48("11948") ? {} : (stryCov_9fa48("11948"), {
            items: result.containers,
            page: result.page,
            totalPages: result.totalPages
          });
        }
      }, cachedPages.containers, stryMutAct_9fa48("11949") ? () => undefined : (stryCov_9fa48("11949"), pages => update(stryMutAct_9fa48("11950") ? "" : (stryCov_9fa48("11950"), "containers"), pages))), loadEveryPage(async page => {
        if (stryMutAct_9fa48("11951")) {
          {}
        } else {
          stryCov_9fa48("11951");
          const result = await greenPointsAdapter.list(stryMutAct_9fa48("11952") ? {} : (stryCov_9fa48("11952"), {
            page,
            pageSize: MAP_PAGE_SIZE
          }));
          return stryMutAct_9fa48("11953") ? {} : (stryCov_9fa48("11953"), {
            items: result.greenPoints,
            page: result.page,
            totalPages: result.totalPages
          });
        }
      }, cachedPages.greenPoints, stryMutAct_9fa48("11954") ? () => undefined : (stryCov_9fa48("11954"), pages => update(stryMutAct_9fa48("11955") ? "" : (stryCov_9fa48("11955"), "greenPoints"), pages))), loadEveryPage(async page => {
        if (stryMutAct_9fa48("11956")) {
          {}
        } else {
          stryCov_9fa48("11956");
          const result = await greenSpacesAdapter.list(stryMutAct_9fa48("11957") ? {} : (stryCov_9fa48("11957"), {
            page,
            pageSize: MAP_PAGE_SIZE
          }));
          return stryMutAct_9fa48("11958") ? {} : (stryCov_9fa48("11958"), {
            items: result.greenSpaces,
            page: result.page,
            totalPages: result.totalPages
          });
        }
      }, cachedPages.greenSpaces, stryMutAct_9fa48("11959") ? () => undefined : (stryCov_9fa48("11959"), pages => update(stryMutAct_9fa48("11960") ? "" : (stryCov_9fa48("11960"), "greenSpaces"), pages))), loadEveryPage(async page => {
        if (stryMutAct_9fa48("11961")) {
          {}
        } else {
          stryCov_9fa48("11961");
          const result = await treesAdapter.list(stryMutAct_9fa48("11962") ? {} : (stryCov_9fa48("11962"), {
            page,
            pageSize: MAP_PAGE_SIZE
          }));
          return stryMutAct_9fa48("11963") ? {} : (stryCov_9fa48("11963"), {
            items: result.trees,
            page: result.page,
            totalPages: result.totalPages
          });
        }
      }, cachedPages.trees, stryMutAct_9fa48("11964") ? () => undefined : (stryCov_9fa48("11964"), pages => update(stryMutAct_9fa48("11965") ? "" : (stryCov_9fa48("11965"), "trees"), pages)))]));
      if (stryMutAct_9fa48("11968") ? generation === currentGeneration : stryMutAct_9fa48("11967") ? false : stryMutAct_9fa48("11966") ? true : (stryCov_9fa48("11966", "11967", "11968"), generation !== currentGeneration)) return this.load();
      const failure = results.find(stryMutAct_9fa48("11969") ? () => undefined : (stryCov_9fa48("11969"), result => stryMutAct_9fa48("11972") ? result.status !== "rejected" : stryMutAct_9fa48("11971") ? false : stryMutAct_9fa48("11970") ? true : (stryCov_9fa48("11970", "11971", "11972"), result.status === (stryMutAct_9fa48("11973") ? "" : (stryCov_9fa48("11973"), "rejected")))));
      if (stryMutAct_9fa48("11976") ? failure?.status !== "rejected" : stryMutAct_9fa48("11975") ? false : stryMutAct_9fa48("11974") ? true : (stryCov_9fa48("11974", "11975", "11976"), (stryMutAct_9fa48("11977") ? failure.status : (stryCov_9fa48("11977"), failure?.status)) === (stryMutAct_9fa48("11978") ? "" : (stryCov_9fa48("11978"), "rejected")))) throw failure.reason;
      const [containers, greenPoints, greenSpaces, trees] = results.map(result => {
        if (result.status === "rejected") throw result.reason;
        return result.value;
      }) as [Container[], GreenPoint[], GreenSpace[], Tree[]];
      return stryMutAct_9fa48("11979") ? {} : (stryCov_9fa48("11979"), {
        containers,
        greenPoints,
        greenSpaces,
        trees
      });
    }
  }
});
onMapInventoryChanged(stryMutAct_9fa48("11981") ? () => undefined : (stryCov_9fa48("11981"), () => operationalMapAdapter.invalidate()));