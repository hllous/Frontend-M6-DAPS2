// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadReferenceCatalog, loadTreeReferences, REFERENCE_UNAVAILABLE } from "./reference-catalog";
import { treeFixtures } from "./tree-fixtures";
import type { Tree } from "./trees";
import { useReferenceCatalog, useTreeReferences } from "./use-reference-catalog";
import { vehicleFixtures } from "./vehicles-fixtures";
import type { Zone } from "./zones";
import { zoneFixtures } from "./zones-fixtures";

vi.mock("./reference-catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./reference-catalog")>()),
  loadReferenceCatalog: vi.fn(),
  loadTreeReferences: vi.fn(),
}));

const loadCatalog = vi.mocked(loadReferenceCatalog);
const loadTrees = vi.mocked(loadTreeReferences);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("useReferenceCatalog", () => {
  it("arranca cargando, sin items y con lookup null; al resolver queda listo y busca por id", async () => {
    const pending = deferred<Zone[]>();
    loadCatalog.mockReturnValueOnce(pending.promise);
    const [first, second] = zoneFixtures;

    const { result } = renderHook(() => useReferenceCatalog("zones"));

    expect(result.current.status).toBe("loading");
    expect(result.current.items).toEqual([]);
    expect(result.current.lookup(first.id)).toBeNull();
    expect(result.current.lookup("zona-inexistente")).toBeNull();
    expect(loadCatalog).toHaveBeenCalledWith("zones", {});

    await act(async () => pending.resolve([first, second]));

    expect(result.current.status).toBe("ready");
    expect(result.current.items).toEqual([first, second]);
    expect(result.current.lookup(first.id)).toBe(first.name);
    expect(result.current.lookup(second.id)).toBe(second.name);
    expect(result.current.lookup("zona-inexistente")).toBe(REFERENCE_UNAVAILABLE.zones);
  });

  it("nombra los vehículos por su patente", async () => {
    const vehicle = vehicleFixtures[0];
    loadCatalog.mockResolvedValueOnce([vehicle]);

    const { result } = renderHook(() => useReferenceCatalog("vehicles"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.lookup(vehicle.id)).toBe(vehicle.plate);
    expect(result.current.lookup("otro")).toBe(REFERENCE_UNAVAILABLE.vehicles);
  });

  it("si la carga falla queda en error, sin items, y el lookup devuelve el texto de no disponible", async () => {
    loadCatalog.mockRejectedValueOnce(new Error("Backend caído"));

    const { result } = renderHook(() => useReferenceCatalog("crews"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.items).toEqual([]);
    expect(result.current.lookup("crew-1")).toBe(REFERENCE_UNAVAILABLE.crews);
  });

  it("pasa la query al cargador y vuelve a pedir el catálogo cuando la query cambia, mostrando carga mientras tanto", async () => {
    const [first, second] = zoneFixtures;
    const nextLoad = deferred<Zone[]>();
    loadCatalog.mockResolvedValueOnce([first]).mockReturnValueOnce(nextLoad.promise);

    const { result, rerender } = renderHook(({ search }) => useReferenceCatalog("zones", { search }), { initialProps: { search: "bel" } });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(loadCatalog).toHaveBeenLastCalledWith("zones", { search: "bel" });

    rerender({ search: "pal" });

    expect(loadCatalog).toHaveBeenCalledTimes(2);
    expect(loadCatalog).toHaveBeenLastCalledWith("zones", { search: "pal" });
    expect(result.current.status).toBe("loading");
    expect(result.current.items).toEqual([]);
    expect(result.current.lookup(first.id)).toBeNull();

    await act(async () => nextLoad.resolve([second]));

    expect(result.current.status).toBe("ready");
    expect(result.current.items).toEqual([second]);
    expect(result.current.lookup(first.id)).toBe(REFERENCE_UNAVAILABLE.zones);
  });

  it("no vuelve a pedir el catálogo si la query llega como objeto nuevo con la misma forma", async () => {
    loadCatalog.mockResolvedValue([]);

    const { result, rerender } = renderHook(() => useReferenceCatalog("zones", { search: "bel" }));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender();

    expect(loadCatalog).toHaveBeenCalledTimes(1);
  });

  it("ignora la respuesta tardía de la query anterior", async () => {
    const [first, second] = zoneFixtures;
    const stale = deferred<Zone[]>();
    loadCatalog.mockReturnValueOnce(stale.promise).mockResolvedValueOnce([second]);

    const { result, rerender } = renderHook(({ search }) => useReferenceCatalog("zones", { search }), { initialProps: { search: "bel" } });
    rerender({ search: "pal" });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => stale.resolve([first]));

    expect(result.current.status).toBe("ready");
    expect(result.current.items).toEqual([second]);
  });

  it("ignora el error tardío de la query anterior", async () => {
    const [, second] = zoneFixtures;
    const stale = deferred<Zone[]>();
    loadCatalog.mockReturnValueOnce(stale.promise).mockResolvedValueOnce([second]);

    const { result, rerender } = renderHook(({ search }) => useReferenceCatalog("zones", { search }), { initialProps: { search: "bel" } });
    rerender({ search: "pal" });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => stale.reject(new Error("tarde")));

    expect(result.current.status).toBe("ready");
    expect(result.current.items).toEqual([second]);
  });

  it("vuelve a pedir el catálogo cuando cambia el tipo de referencia", async () => {
    loadCatalog.mockResolvedValue([]);

    const { result, rerender } = renderHook(({ kind }: { kind: "zones" | "crews" }) => useReferenceCatalog(kind), { initialProps: { kind: "zones" } });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    rerender({ kind: "crews" });

    expect(loadCatalog).toHaveBeenLastCalledWith("crews", {});
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.lookup("x")).toBe(REFERENCE_UNAVAILABLE.crews);
  });
});

describe("useTreeReferences", () => {
  const [treeA, treeB, treeC] = treeFixtures;

  it("pide una sola vez los ids distintos, ordenados; null mientras carga y undefined si no existe", async () => {
    const pending = deferred<Map<string, Tree>>();
    loadTrees.mockReturnValueOnce(pending.promise);
    const ids = [treeB.id, treeA.id, treeB.id, "arbol-inexistente"];

    const { result } = renderHook(() => useTreeReferences(ids));

    expect(loadTrees).toHaveBeenCalledTimes(1);
    expect(loadTrees).toHaveBeenCalledWith(["arbol-inexistente", "tree-1", "tree-2"]);
    expect(result.current.lookup(treeA.id)).toBeNull();

    await act(async () => pending.resolve(new Map([[treeA.id, treeA], [treeB.id, treeB]])));

    expect(result.current.lookup(treeA.id)).toBe(treeA);
    expect(result.current.lookup(treeB.id)).toBe(treeB);
    expect(result.current.lookup("arbol-inexistente")).toBeUndefined();
    expect(result.current.lookup("nunca-pedido")).toBeNull();
  });

  it("si la carga falla, los ids pedidos quedan como no encontrados", async () => {
    loadTrees.mockRejectedValueOnce(new Error("Backend caído"));

    const { result } = renderHook(() => useTreeReferences([treeA.id]));

    await waitFor(() => expect(result.current.lookup(treeA.id)).toBeUndefined());
  });

  it("con ids nuevos pide solo los que faltan y conserva los ya resueltos", async () => {
    loadTrees.mockResolvedValueOnce(new Map([[treeA.id, treeA]])).mockResolvedValueOnce(new Map([[treeB.id, treeB]]));

    const { result, rerender } = renderHook(({ ids }) => useTreeReferences(ids), { initialProps: { ids: [treeA.id] } });
    await waitFor(() => expect(result.current.lookup(treeA.id)).toBe(treeA));

    rerender({ ids: [treeA.id, treeB.id] });
    await waitFor(() => expect(result.current.lookup(treeB.id)).toBe(treeB));

    expect(loadTrees).toHaveBeenCalledTimes(2);
    expect(loadTrees).toHaveBeenLastCalledWith([treeB.id]);
    expect(result.current.lookup(treeA.id)).toBe(treeA);
  });

  it("si los ids ya se pidieron (subconjunto o en otro orden), no vuelve a llamar al Backend", async () => {
    loadTrees.mockResolvedValueOnce(new Map([[treeA.id, treeA], [treeB.id, treeB]]));

    const { result, rerender } = renderHook(({ ids }) => useTreeReferences(ids), { initialProps: { ids: [treeA.id, treeB.id] } });
    await waitFor(() => expect(result.current.lookup(treeA.id)).toBe(treeA));
    rerender({ ids: [treeB.id] });
    rerender({ ids: [treeB.id, treeA.id] });

    expect(loadTrees).toHaveBeenCalledTimes(1);
    expect(result.current.lookup(treeB.id)).toBe(treeB);
  });

  it("en StrictMode (montar, desmontar, volver a montar) pide una sola vez y resuelve", async () => {
    loadTrees.mockResolvedValueOnce(new Map([[treeC.id, treeC]]));

    const { result } = renderHook(() => useTreeReferences([treeC.id]), { reactStrictMode: true });

    await waitFor(() => expect(result.current.lookup(treeC.id)).toBe(treeC));
    expect(loadTrees).toHaveBeenCalledTimes(1);
  });
});
