import { containersAdapter, type Container } from "./containers";
import { greenPointsAdapter, type GreenPoint } from "./green-points";
import { greenSpacesAdapter, type GreenSpace } from "./green-spaces";
import { treesAdapter, type Tree } from "./trees";

const MAP_PAGE_SIZE = 100;

type Page<T> = {
  items: T[];
  page: number;
  totalPages: number;
};

async function loadEveryPage<T>(readPage: (page: number) => Promise<Page<T>>): Promise<T[]> {
  const items: T[] = [];
  let pageNumber = 1;
  let totalPages = 1;

  do {
    const page = await readPage(pageNumber);
    items.push(...page.items);
    totalPages = page.totalPages;
    pageNumber += 1;
  } while (pageNumber <= totalPages);

  return items;
}

export type OperationalMapData = {
  containers: Container[];
  greenPoints: GreenPoint[];
  greenSpaces: GreenSpace[];
  trees: Tree[];
};

export const operationalMapAdapter = {
  async load(): Promise<OperationalMapData> {
    const [containers, greenPoints, greenSpaces, trees] = await Promise.all([
      loadEveryPage(async (page) => {
        const result = await containersAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.containers, page: result.page, totalPages: result.totalPages };
      }),
      loadEveryPage(async (page) => {
        const result = await greenPointsAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.greenPoints, page: result.page, totalPages: result.totalPages };
      }),
      loadEveryPage(async (page) => {
        const result = await greenSpacesAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.greenSpaces, page: result.page, totalPages: result.totalPages };
      }),
      loadEveryPage(async (page) => {
        const result = await treesAdapter.list({ page, pageSize: MAP_PAGE_SIZE });
        return { items: result.trees, page: result.page, totalPages: result.totalPages };
      }),
    ]);

    return { containers, greenPoints, greenSpaces, trees };
  },
};
