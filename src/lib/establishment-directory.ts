export type EstablishmentDirectoryQuery = {
  query: string;
};

export type Establishment = {
  id: string;
  name: string;
  address: string;
};

export interface EstablishmentDirectoryAdapter {
  resolve(query: EstablishmentDirectoryQuery): Promise<Establishment | null>;
}

export const establishmentDirectoryFixtures: readonly Establishment[] = [
  {
    id: "EST-BOEDO-1880",
    name: "Planta de tratamiento Boedo",
    address: "Av. Boedo 1880",
  },
  {
    id: "EST-BRASIL-2450",
    name: "Industrias Brasil",
    address: "Av. Brasil 2450",
  },
];

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es-AR");
}

/**
 * Temporary local implementation for development and tests. The M4 search
 * contract is not published yet, so production integration must replace this
 * adapter rather than adding M4-specific request details to the UI.
 */
export const localEstablishmentDirectoryAdapter: EstablishmentDirectoryAdapter = {
  async resolve({ query }: EstablishmentDirectoryQuery) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return null;

    return establishmentDirectoryFixtures.find((establishment) =>
      [establishment.id, establishment.name, establishment.address]
        .some((value) => normalize(value).includes(normalizedQuery)),
    ) ?? null;
  },
};

export let establishmentDirectoryAdapter: EstablishmentDirectoryAdapter = localEstablishmentDirectoryAdapter;

export function setEstablishmentDirectoryAdapter(adapter: EstablishmentDirectoryAdapter) {
  establishmentDirectoryAdapter = adapter;
}

export function resetEstablishmentDirectoryAdapter() {
  establishmentDirectoryAdapter = localEstablishmentDirectoryAdapter;
}
