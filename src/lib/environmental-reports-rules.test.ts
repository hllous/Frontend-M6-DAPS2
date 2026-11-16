// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { NetworkFailureError } from "./authenticated-fetch";
import {
  EnvironmentalReportContractError,
  EnvironmentalReportRequestError,
  environmentalInspectionCompleteInputSchema,
  environmentalReportsAdapter,
} from "./environmental-reports";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("inspection completion rules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T15:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  const done = { id: "source", label: "Verificar la fuente", completed: true };
  const base = {
    inspectedAt: "2026-09-20T14:55:00.000Z",
    outcome: "NO_VIOLATION" as const,
    checklist: [done],
    conclusion: "Sin hallazgos.",
  };
  const issues = (input: unknown) => {
    const result = environmentalInspectionCompleteInputSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  };

  it("accepts a no-violation inspection with a conclusion", () => {
    expect(issues(base)).toEqual([]);
  });

  it("requires at least one checklist item and every item completed", () => {
    expect(issues({ ...base, checklist: [] })).toContain("checklist: Debe completar el checklist de inspección.");
    expect(issues({ ...base, checklist: [done, { ...done, id: "b", completed: false }] })).toContain(
      "checklist: Debe completar todos los controles del checklist.",
    );
  });

  it("requires a conclusion when there is no violation or the result is inconclusive", () => {
    expect(issues({ ...base, conclusion: undefined })).toContain(
      "conclusion: La conclusión es obligatoria para un resultado sin infracción.",
    );
    expect(issues({ ...base, outcome: "INCONCLUSIVE", conclusion: undefined })).toContain(
      "conclusion: Debe explicar por qué la inspección resulta inconclusa.",
    );
    expect(issues({ ...base, outcome: "INCONCLUSIVE" })).toEqual([]);
  });

  it("lists every missing field of a found violation", () => {
    const found = issues({ ...base, outcome: "VIOLATION_FOUND", conclusion: undefined });

    expect(found).toEqual(
      expect.arrayContaining([
        "nextStep: Una infracción constatada debe continuar con la emisión del aviso.",
        "findings: Los hallazgos son obligatorios cuando se constata una infracción.",
        "violationType: Debe indicar el tipo de infracción constatada.",
        "severity: Debe indicar la gravedad de la infracción constatada.",
        "suggestedAction: Debe indicar la acción sugerida.",
      ]),
    );
  });

  it("rejects an inspection date more than five minutes in the future but allows a small clock skew", () => {
    expect(issues({ ...base, inspectedAt: "2026-09-20T15:04:00.000Z" })).toEqual([]);
    expect(issues({ ...base, inspectedAt: "2026-09-20T15:06:00.000Z" })).toContain(
      "inspectedAt: La fecha de inspección no puede ser futura.",
    );
  });

  it("caps conclusion and findings length", () => {
    expect(issues({ ...base, conclusion: "x".repeat(5000) }).join(" ")).toMatch(/conclusión no puede superar/);
  });
});

describe("environmental reports adapter transport", () => {
  it("serializes every report filter and repeats the status", async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get("*/api/environmental-reports", ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ data: [], meta: { total: 0, page: 3, pageSize: 5, totalPages: 0 } });
      }),
    );

    await environmentalReportsAdapter.list({
      status: ["RECEIVED", "UNDER_REVIEW"],
      reportType: "AIR_POLLUTION" as never,
      priority: "HIGH" as never,
      publicId: "PUB-1",
      ticketId: "T-1",
      search: "humo",
      page: 3,
      pageSize: 5,
    });

    expect(params?.getAll("status")).toEqual(["RECEIVED", "UNDER_REVIEW"]);
    expect(Object.fromEntries(params!.entries())).toMatchObject({
      reportType: "AIR_POLLUTION", priority: "HIGH", publicId: "PUB-1", ticketId: "T-1", search: "humo", page: "3", pageSize: "5",
    });
  });

  it("sends a single status as a scalar", async () => {
    let search = "";
    server.use(
      http.get("*/api/environmental-reports", ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
      }),
    );

    await environmentalReportsAdapter.list({ status: "CLOSED" });

    expect(search).toBe("?status=CLOSED");
  });

  it("turns a transport failure into NetworkFailureError and records telemetry", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    server.use(http.get("*/api/environmental-reports", () => HttpResponse.error()));

    await expect(environmentalReportsAdapter.list()).rejects.toBeInstanceOf(NetworkFailureError);
    expect(info).toHaveBeenCalledWith("[m6-telemetry]", { name: "request_network_failure", resource: "environmental-reports" });
  });

  it("raises a contract error when the body is not JSON", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    server.use(http.get("*/api/environmental-reports/ER-1", () => new HttpResponse("<html>", { status: 200 })));

    await expect(environmentalReportsAdapter.get("ER-1")).rejects.toBeInstanceOf(EnvironmentalReportContractError);
  });

  it("uses the documented message of an error, joined, and a generic one otherwise", async () => {
    server.use(
      http.get("*/api/environmental-reports/ER-1", () =>
        HttpResponse.json({ statusCode: 422, message: ["Uno.", "Dos."], error: "x", timestamp: "t", path: "/p" }, { status: 422 }),
      ),
      http.get("*/api/environmental-reports/ER-2", () => HttpResponse.json({ raro: true }, { status: 500 })),
    );

    await expect(environmentalReportsAdapter.get("ER-1")).rejects.toMatchObject({ message: "Uno. Dos.", status: 422 });
    const generic = await environmentalReportsAdapter.get("ER-2").catch((e: unknown) => e);
    expect(generic).toBeInstanceOf(EnvironmentalReportRequestError);
    expect(generic).toMatchObject({ message: "No se pudo completar la operación ambiental.", status: 500 });
  });

  it("encodes the report id in the path", async () => {
    let pathname = "";
    server.use(
      http.get("*/api/environmental-reports/*", ({ request }) => {
        pathname = new URL(request.url).pathname;
        return HttpResponse.json({ nope: true });
      }),
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    await environmentalReportsAdapter.get("a/b c").catch(() => undefined);

    expect(pathname).toBe("/api/environmental-reports/a%2Fb%20c");
  });
});
