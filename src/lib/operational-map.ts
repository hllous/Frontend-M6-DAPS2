import { containersAdapter, type Container } from "./containers";
import { greenPointsAdapter, type GreenPoint } from "./green-points";
import { greenSpacesAdapter, type GreenSpace } from "./green-spaces";
import { treesAdapter, type Tree } from "./trees";
import { onMapInventoryChanged } from "./map-inventory-events";

const MAP_PAGE_SIZE = 100;
const MAX_CONCURRENT_PAGES = 6;
let activePages = 0;
const waitingPages: Array<() => void> = [];

async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (activePages >= MAX_CONCURRENT_PAGES) await new Promise<void>((resolve) => waitingPages.push(resolve));
  else activePages++;
  try { return await work(); }
  finally {
    const next = waitingPages.shift();
    if (next) next(); else activePages--;
  }
}

type Page<T> = {
  items: T[];
  page: number;
  totalPages: number;
};

async function loadEveryPage<T>(readPage: (page: number) => Promise<Page<T>>, previous: T[][], onPage: (pages: T[][]) => void): Promise<T[]> {
  const pages = previous.slice();
  const first = await limited(() => readPage(1));
  pages[0] = first.items;
  onPage(pages.slice());
  let next = 2;
  const results = await Promise.allSettled(Array.from({ length: Math.min(4, Math.max(0, first.totalPages - 1)) }, async () => {
    while (next <= first.totalPages) {
      const pageNumber = next++;
      pages[pageNumber - 1] = (await limited(() => readPage(pageNumber))).items;
      onPage(pages.slice());
    }
  }));
  const failure = results.find((result) => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  pages.length = Math.max(0, first.totalPages);
  onPage(pages.slice());
  return pages.flat();
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
let cachedPages: { [K in keyof OperationalMapData]: OperationalMapData[K][] } = { containers: [], greenPoints: [], greenSpaces: [], trees: [] };
const subscribers = new Set<(data: OperationalMapData) => void>();

export const operationalMapAdapter = {
  invalidate(preserve = false) { generation++; pending = undefined; if (!preserve) { snapshot = undefined; cachedPages = { containers: [], greenPoints: [], greenSpaces: [], trees: [] }; } },
  subscribe(listener: (data: OperationalMapData) => void) {
    subscribers.add(listener);
    if (snapshot) listener(snapshot);
    return () => { subscribers.delete(listener); };
  },
  load(): Promise<OperationalMapData> {
    if (pending) return pending;
    const current = this.fetch();
    pending = current;
    current.catch(() => { if (pending === current) { generation++; pending = undefined; } });
    return current;
  },
  async fetch(): Promise<OperationalMapData> {
    const currentGeneration = generation;
    let partial: OperationalMapData = snapshot ?? { containers: [], greenPoints: [], greenSpaces: [], trees: [] };
    const update = <K extends keyof OperationalMapData>(key: K, pages: OperationalMapData[K][]) => {
      if (generation !== currentGeneration) return;
      cachedPages = { ...cachedPages, [key]: pages };
      partial = { ...partial, [key]: pages.flat() };
      snapshot = partial;
      subscribers.forEach((listener) => listener(partial));
    };
    const results = await Promise.allSettled([
      loadEveryPage(async (page) => {
        const result = await containersAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.containers, page: result.page, totalPages: result.totalPages };
      }, cachedPages.containers, (pages) => update("containers", pages)),
      loadEveryPage(async (page) => {
        const result = await greenPointsAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.greenPoints, page: result.page, totalPages: result.totalPages };
      }, cachedPages.greenPoints, (pages) => update("greenPoints", pages)),
      loadEveryPage(async (page) => {
        const result = await greenSpacesAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.greenSpaces, page: result.page, totalPages: result.totalPages };
      }, cachedPages.greenSpaces, (pages) => update("greenSpaces", pages)),
      loadEveryPage(async (page) => {
        const result = await treesAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.trees, page: result.page, totalPages: result.totalPages };
      }, cachedPages.trees, (pages) => update("trees", pages)),
    ]);

    if (generation !== currentGeneration) return this.load();
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    const [containers, greenPoints, greenSpaces, trees] = results.map((result) => {
      if (result.status === "rejected") throw result.reason;
      return result.value;
    }) as [Container[], GreenPoint[], GreenSpace[], Tree[]];

    return { containers, greenPoints, greenSpaces, trees };
  },
};

onMapInventoryChanged(() => operationalMapAdapter.invalidate());
