import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { coverageIndicatorFixture } from "@/lib/indicator-fixtures";
import { indicatorsAdapter } from "@/lib/indicators";
import { handlers } from "@/mocks/handlers";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("cobertura cuando el backend rechaza el intervalo de la serie (#780)", () => {
  it("reintenta sin intervalo y conserva el mensaje del servidor", async () => {
    const buckets: Array<string | null> = [];
    server.use(http.get("*/api/indicators/coverage", ({ request }) => {
      const bucket = new URL(request.url).searchParams.get("bucket");
      buckets.push(bucket);
      return bucket ? HttpResponse.json({ statusCode: 400, message: "El rango supera el máximo de 90 intervalos." }, { status: 400 }) : HttpResponse.json(coverageIndicatorFixture);
    }));
    const result = await indicatorsAdapter.getCoverage({ from: "2026-08-01", to: "2026-09-01" });
    expect(buckets).toEqual(["week", null]);
    expect(result.primary.value).toBe(82.2);
    expect(result.seriesError).toBe("El rango supera el máximo de 90 intervalos.");
  });
});
