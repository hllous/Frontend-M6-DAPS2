import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { backendEnv, loginAs } from "@/test/session";

/**
 * Orden por columna de los catálogos paginados (Backend #703) en el BFF: `sort` y `order` viajan al Backend
 * tal cual (y en ese orden dentro de la query), un valor fuera de la lista da 400 sin llamar al Backend, y el
 * modo mock ordena todo el resultado antes de paginar con el mismo criterio.
 */
type Handler = (request: Request) => Promise<Response>;

const collections = import.meta.glob<{ GET: Handler }>("/src/app/api/*/route.ts");

const families = [
  { dir: "vehicles", textField: "plate", enumField: "vehicleType", validSorts: "plate, vehicleType, capacity, active, createdAt" },
  { dir: "containers", textField: "code", enumField: "containerType", validSorts: "code, containerType, status, capacityLiters, createdAt" },
  { dir: "trees", textField: "surveyCode", enumField: "species", validSorts: "surveyCode, species, active, createdAt" },
  { dir: "crews", textField: "name", enumField: "crewType", validSorts: "name, crewType, defaultShift, active, createdAt" },
  { dir: "routes", textField: "code", enumField: "name", validSorts: "code, name, active, createdAt" },
  { dir: "green-points", textField: "code", enumField: "name", validSorts: "code, name, active, createdAt" },
  { dir: "green-spaces", textField: "name", enumField: "spaceType", validSorts: "name, spaceType, active, createdAt" },
] as const;

let restoreEnv: () => void;
beforeEach(() => {
  restoreEnv = backendEnv();
});
afterEach(() => {
  restoreEnv();
  vi.restoreAllMocks();
});

async function get(dir: string, query: string, cookie?: string) {
  const { GET } = await collections[`/src/app/api/${dir}/route.ts`]();
  return GET(new Request(`http://localhost/api/${dir}${query}`, { headers: cookie ? { cookie } : {} }));
}

const backendCookie = () => loginAs("office-duty-queue", { mode: "real-m1", backendOrigin: "https://backend.internal" });

describe.each(families)("/api/$dir: sort y order (#703)", ({ dir, textField, enumField, validSorts }) => {
  describe("contra el Backend", () => {
    async function forwarded(query: string) {
      const cookie = await backendCookie();
      const backend = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } }));
      await get(dir, query, cookie);
      return backend;
    }

    it("reenvía sort y order junto con la página, exactamente", async () => {
      const backend = await forwarded(`?page=2&pageSize=20&sort=${textField}&order=desc`);

      expect(backend).toHaveBeenCalledTimes(1);
      const url = backend.mock.calls[0]?.[0] as URL;
      expect(url.pathname).toBe(`/${dir}`);
      expect(url.search).toBe(`?page=2&pageSize=20&sort=${textField}&order=desc`);
    });

    it("reenvía solo order (invierte el orden por defecto)", async () => {
      const backend = await forwarded("?order=desc");

      expect((backend.mock.calls[0]?.[0] as URL).search).toBe("?order=desc");
    });

    it("sin sort ni order no agrega nada a la query del Backend", async () => {
      const backend = await forwarded("?page=1");

      expect((backend.mock.calls[0]?.[0] as URL).search).toBe("?page=1");
    });

    it.each([
      ["un sort fuera de la lista", "?sort=password"],
      ["un order inválido", `?sort=${textField}&order=up`],
      ["un order vacío", "?order="],
    ])("responde 400 con %s y no llama al Backend", async (_name, query) => {
      const cookie = await backendCookie();
      const backend = vi.spyOn(globalThis, "fetch");

      const response = await get(dir, query, cookie);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        statusCode: 400,
        error: "Bad Request",
        path: `/api/${dir}`,
        message: `Orden inválido. «sort» admite: ${validSorts}; «order» admite: asc, desc.`,
      });
      expect(backend).not.toHaveBeenCalled();
    });

    it("sin sesión responde 401 antes de validar el orden", async () => {
      const response = await get(dir, "?sort=password");

      expect(response.status).toBe(401);
    });
  });

  describe("en modo mock", () => {
    const mockCookie = () => loginAs("office-duty-queue", { mode: "mock" });

    async function values(query: string, field: string) {
      const response = await get(dir, `?pageSize=100${query}`, await mockCookie());
      expect(response.status).toBe(200);
      const body = (await response.json()) as { data: Record<string, unknown>[] };
      return body.data.map((item) => item[field]);
    }

    it("ordena todo el resultado de forma ascendente por el campo pedido", async () => {
      const unsorted = (await values("", textField)) as string[];
      const expected = [...unsorted].sort((a, b) => a.localeCompare(b));

      expect(unsorted.length).toBeGreaterThan(1);
      expect(await values(`&sort=${textField}&order=asc`, textField)).toEqual(expected);
    });

    it("ordena de forma descendente y el default de order es asc", async () => {
      const ascending = await values(`&sort=${textField}&order=asc`, textField);

      expect(await values(`&sort=${textField}&order=desc`, textField)).toEqual([...ascending].reverse());
      expect(await values(`&sort=${textField}`, textField)).toEqual(ascending);
    });

    it("con solo order invierte el orden por defecto", async () => {
      const ascending = await values(`&sort=${textField}&order=asc`, textField);

      expect(await values("&order=desc", textField)).toEqual([...ascending].reverse());
    });

    it("la página 2 continúa el orden de la página 1", async () => {
      const all = await values(`&sort=${textField}&order=desc`, textField);
      const page = async (n: number) => {
        const response = await get(dir, `?pageSize=1&page=${n}&sort=${textField}&order=desc`, await mockCookie());
        return ((await response.json()) as { data: Record<string, unknown>[] }).data.map((item) => item[textField]);
      };

      expect(all.length).toBeGreaterThan(2);
      expect([...(await page(1)), ...(await page(2))]).toEqual(all.slice(0, 2));
    });

    it("acepta cada campo de la lista del Backend y responde 200", async () => {
      for (const field of validSorts.split(", ")) {
        const response = await get(dir, `?sort=${field}&order=desc`, await mockCookie());
        expect(response.status, field).toBe(200);
      }
    });

    it("responde 400 con un sort fuera de la lista", async () => {
      const response = await get(dir, `?sort=${enumField}x`, await mockCookie());

      expect(response.status).toBe(400);
    });
  });
});
