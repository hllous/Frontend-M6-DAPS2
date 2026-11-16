// @ts-nocheck
"use client";

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
import { compareStrings } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadReferenceCatalog, loadTreeReferences, REFERENCE_UNAVAILABLE, referenceName, type ReferenceItem, type ReferenceKind, type ReferenceQuery } from "./reference-catalog";
import type { Tree } from "./trees";
export type ReferenceCatalog<T> = {
  status: "loading" | "ready" | "error";
  /** Catálogo completo; vacío mientras carga o si falló. */
  items: T[];
  /** Nombre de la referencia; `null` mientras carga (la pantalla muestra su skeleton), texto legible si no existe. */
  lookup: (id: string) => string | null;
};
type CatalogState<T> = {
  key: string;
  status: "ready" | "error";
  items: T[];
} | null;

/**
 * Catálogo completo de referencias para una pantalla: se pide una vez por montaje (y por filtro) y se reusa en
 * cada celda, detalle y combo de esa pantalla.
 */
export function useReferenceCatalog<K extends ReferenceKind>(kind: K, query?: ReferenceQuery<K>): ReferenceCatalog<ReferenceItem<K>> {
  if (stryMutAct_9fa48("16926")) {
    {}
  } else {
    stryCov_9fa48("16926");
    const queryKey = JSON.stringify(stryMutAct_9fa48("16927") ? query && {} : (stryCov_9fa48("16927"), query ?? {}));
    const key = stryMutAct_9fa48("16928") ? `` : (stryCov_9fa48("16928"), `${kind}:${queryKey}`);
    const [state, setState] = useState<CatalogState<ReferenceItem<K>>>(null);
    if (stryMutAct_9fa48("16929")) {
      ;
    } else {
      stryCov_9fa48("16929");
      useEffect(() => {
        if (stryMutAct_9fa48("16930")) {
          {}
        } else {
          stryCov_9fa48("16930");
          let isCurrent = stryMutAct_9fa48("16931") ? false : (stryCov_9fa48("16931"), true);
          // La query llega como objeto literal en cada render: se compara por su forma serializada.
          if (stryMutAct_9fa48("16932")) {
            ;
          } else {
            stryCov_9fa48("16932");
            loadReferenceCatalog(kind, JSON.parse(queryKey) as ReferenceQuery<K>).then(items => {
              if (stryMutAct_9fa48("16933")) {
                {}
              } else {
                stryCov_9fa48("16933");
                if (stryMutAct_9fa48("16935") ? false : stryMutAct_9fa48("16934") ? true : (stryCov_9fa48("16934", "16935"), isCurrent)) setState(stryMutAct_9fa48("16937") ? {} : (stryCov_9fa48("16937"), {
                  key,
                  status: stryMutAct_9fa48("16938") ? "" : (stryCov_9fa48("16938"), "ready"),
                  items
                }));
              }
            }).catch(() => {
              if (stryMutAct_9fa48("16939")) {
                {}
              } else {
                stryCov_9fa48("16939");
                if (stryMutAct_9fa48("16941") ? false : stryMutAct_9fa48("16940") ? true : (stryCov_9fa48("16940", "16941"), isCurrent)) setState(stryMutAct_9fa48("16943") ? {} : (stryCov_9fa48("16943"), {
                  key,
                  status: stryMutAct_9fa48("16944") ? "" : (stryCov_9fa48("16944"), "error"),
                  items: stryMutAct_9fa48("16945") ? ["Stryker was here"] : (stryCov_9fa48("16945"), [])
                }));
              }
            });
          }
          return () => {
            if (stryMutAct_9fa48("16946")) {
              {}
            } else {
              stryCov_9fa48("16946");
              isCurrent = stryMutAct_9fa48("16947") ? true : (stryCov_9fa48("16947"), false);
            }
          };
        }
      }, stryMutAct_9fa48("16948") ? [] : (stryCov_9fa48("16948"), [key, kind, queryKey]));
    }
    const current = (stryMutAct_9fa48("16951") ? state?.key !== key : stryMutAct_9fa48("16950") ? false : stryMutAct_9fa48("16949") ? true : (stryCov_9fa48("16949", "16950", "16951"), (stryMutAct_9fa48("16952") ? state.key : (stryCov_9fa48("16952"), state?.key)) === key)) ? state : null;
    const items = useMemo(stryMutAct_9fa48("16953") ? () => undefined : (stryCov_9fa48("16953"), () => stryMutAct_9fa48("16954") ? current?.items && [] : (stryCov_9fa48("16954"), (stryMutAct_9fa48("16955") ? current.items : (stryCov_9fa48("16955"), current?.items)) ?? (stryMutAct_9fa48("16956") ? ["Stryker was here"] : (stryCov_9fa48("16956"), [])))), stryMutAct_9fa48("16957") ? [] : (stryCov_9fa48("16957"), [current]));
    const names = useMemo(stryMutAct_9fa48("16958") ? () => undefined : (stryCov_9fa48("16958"), () => new Map(items.map(stryMutAct_9fa48("16959") ? () => undefined : (stryCov_9fa48("16959"), item => stryMutAct_9fa48("16960") ? [] : (stryCov_9fa48("16960"), [item.id, referenceName(kind, item)]))))), stryMutAct_9fa48("16961") ? [] : (stryCov_9fa48("16961"), [items, kind]));
    const status = stryMutAct_9fa48("16962") ? current?.status && "loading" : (stryCov_9fa48("16962"), (stryMutAct_9fa48("16963") ? current.status : (stryCov_9fa48("16963"), current?.status)) ?? (stryMutAct_9fa48("16964") ? "" : (stryCov_9fa48("16964"), "loading")));
    const lookup = useCallback(stryMutAct_9fa48("16965") ? () => undefined : (stryCov_9fa48("16965"), (id: string) => stryMutAct_9fa48("16966") ? names.get(id) && (status === "loading" ? null : REFERENCE_UNAVAILABLE[kind]) : (stryCov_9fa48("16966"), names.get(id) ?? ((stryMutAct_9fa48("16969") ? status !== "loading" : stryMutAct_9fa48("16968") ? false : stryMutAct_9fa48("16967") ? true : (stryCov_9fa48("16967", "16968", "16969"), status === (stryMutAct_9fa48("16970") ? "" : (stryCov_9fa48("16970"), "loading")))) ? null : REFERENCE_UNAVAILABLE[kind]))), stryMutAct_9fa48("16971") ? [] : (stryCov_9fa48("16971"), [names, status, kind]));
    return stryMutAct_9fa48("16972") ? {} : (stryCov_9fa48("16972"), {
      status,
      items,
      lookup
    });
  }
}
export type TreeReferences = {
  /** Árbol resuelto, `null` mientras carga, `undefined` si no existe. */
  lookup: (id: string) => Tree | null | undefined;
};

/** Resuelve por id solo los árboles que la pantalla muestra; cada id se pide una sola vez por montaje. */
export function useTreeReferences(ids: readonly string[]): TreeReferences {
  if (stryMutAct_9fa48("16973")) {
    {}
  } else {
    stryCov_9fa48("16973");
    const [resolved, setResolved] = useState<ReadonlyMap<string, Tree | undefined>>(stryMutAct_9fa48("16974") ? () => undefined : (stryCov_9fa48("16974"), () => new Map()));
    const requested = useRef(new Set<string>());
    const mounted = useRef(stryMutAct_9fa48("16975") ? false : (stryCov_9fa48("16975"), true));
    const idsKey = JSON.stringify(stryMutAct_9fa48("16976") ? [...new Set(ids)] : (stryCov_9fa48("16976"), (stryMutAct_9fa48("16977") ? [] : (stryCov_9fa48("16977"), [...new Set(ids)])).sort(compareStrings)));
    useEffect(() => {
      if (stryMutAct_9fa48("16979")) {
        {}
      } else {
        stryCov_9fa48("16979");
        mounted.current = stryMutAct_9fa48("16980") ? false : (stryCov_9fa48("16980"), true);
        return () => {
          if (stryMutAct_9fa48("16981")) {
            {}
          } else {
            stryCov_9fa48("16981");
            mounted.current = stryMutAct_9fa48("16982") ? true : (stryCov_9fa48("16982"), false);
          }
        };
      }
    }, stryMutAct_9fa48("16983") ? ["Stryker was here"] : (stryCov_9fa48("16983"), []));
    if (stryMutAct_9fa48("16984")) {
      ;
    } else {
      stryCov_9fa48("16984");
      useEffect(() => {
        if (stryMutAct_9fa48("16985")) {
          {}
        } else {
          stryCov_9fa48("16985");
          const missing = stryMutAct_9fa48("16986") ? JSON.parse(idsKey) as string[] : (stryCov_9fa48("16986"), (JSON.parse(idsKey) as string[]).filter(stryMutAct_9fa48("16987") ? () => undefined : (stryCov_9fa48("16987"), id => stryMutAct_9fa48("16988") ? requested.current.has(id) : (stryCov_9fa48("16988"), !requested.current.has(id)))));
          if (stryMutAct_9fa48("16991") ? missing.length !== 0 : stryMutAct_9fa48("16990") ? false : stryMutAct_9fa48("16989") ? true : (stryCov_9fa48("16989", "16990", "16991"), missing.length === 0)) return;
          for (const id of missing) if (stryMutAct_9fa48("16992")) {
            ;
          } else {
            stryCov_9fa48("16992");
            requested.current.add(id);
          }
          void loadTreeReferences(missing).catch(stryMutAct_9fa48("16993") ? () => undefined : (stryCov_9fa48("16993"), () => new Map<string, Tree>())).then(found => {
            if (stryMutAct_9fa48("16994")) {
              {}
            } else {
              stryCov_9fa48("16994");
              if (stryMutAct_9fa48("16997") ? false : stryMutAct_9fa48("16996") ? true : stryMutAct_9fa48("16995") ? mounted.current : (stryCov_9fa48("16995", "16996", "16997"), !mounted.current)) return;
              setResolved(previous => {
                if (stryMutAct_9fa48("16999")) {
                  {}
                } else {
                  stryCov_9fa48("16999");
                  const next = new Map(previous);
                  for (const id of missing) if (stryMutAct_9fa48("17000")) {
                    ;
                  } else {
                    stryCov_9fa48("17000");
                    next.set(id, found.get(id));
                  }
                  return next;
                }
              });
            }
          });
        }
      }, stryMutAct_9fa48("17001") ? [] : (stryCov_9fa48("17001"), [idsKey]));
    }
    const lookup = useCallback(stryMutAct_9fa48("17002") ? () => undefined : (stryCov_9fa48("17002"), (id: string) => resolved.has(id) ? resolved.get(id) : null), stryMutAct_9fa48("17003") ? [] : (stryCov_9fa48("17003"), [resolved]));
    return stryMutAct_9fa48("17004") ? {} : (stryCov_9fa48("17004"), {
      lookup
    });
  }
}