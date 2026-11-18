import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { coverageIndicatorFixture, wasteIndicatorFixture } from "./indicator-fixtures";
import {
  coverageBucket,
  coverageRowsToCsv,
  defaultIndicatorTarget,
  hasNumericThreshold,
  IndicatorContractError,
  IndicatorRequestError,
  indicatorQueryErrorMessage,
  indicatorQuerySchema,
  indicatorsAdapter,
  INDICATOR_TARGETS,
  INVERTED_RANGE_MESSAGE,
  isCoverageBelowTarget,
  parseIndicatorUrlState,
  serializeIndicatorUrlState,
} from "./indicators";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const respond = (body: unknown, status = 200) => vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(body, { status }));
const now = new Date("2026-09-15T12:00:00Z");

describe("indicadores: errores del contrato y del backend", () => {
  it("cada familia informa su mensaje de contrato y conserva la causa", async () => {
    respond({ nada: true });
    const cases: Array<[() => Promise<unknown>, string]> = [
      [() => indicatorsAdapter.getCoverage({}), "La cobertura no respeta el contrato de indicadores."],
      [() => indicatorsAdapter.getCompliance({}), "El cumplimiento no respeta el contrato de indicadores."],
      [() => indicatorsAdapter.getIncidents({}), "Las incidencias no respetan el contrato de indicadores."],
      [() => indicatorsAdapter.getWaste({}), "Los residuos no respetan el contrato de indicadores."],
    ];
    for (const [call, message] of cases) {
      const error = (await call().catch((e: unknown) => e)) as IndicatorContractError;
      expect(error).toBeInstanceOf(IndicatorContractError);
      expect(error.name).toBe("IndicatorContractError");
      expect(error.message).toBe(message);
      expect(error.cause).toBeDefined();
    }
  });

  it("una respuesta que no es JSON falla con el mensaje de información inválida", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>"));
    const error = (await indicatorsAdapter.getWaste({}).catch((e: unknown) => e)) as IndicatorContractError;
    expect(error.message).toBe("No se pudo obtener información válida de indicadores. Reintente en unos segundos.");
    expect(error.cause).toBeInstanceOf(Error);
  });

  it("un error HTTP con mensaje se relaya como IndicatorRequestError (texto o lista unida con espacio)", async () => {
    respond({ statusCode: 400, message: "Rango inválido" }, 400);
    const single = (await indicatorsAdapter.getWaste({}).catch((e: unknown) => e)) as IndicatorRequestError;
    expect(single).toBeInstanceOf(IndicatorRequestError);
    expect(single.name).toBe("IndicatorRequestError");
    expect(single.status).toBe(400);
    expect(single.message).toBe("Rango inválido");

    respond({ statusCode: 400, message: ["a", "b"] }, 400);
    const many = (await indicatorsAdapter.getWaste({}).catch((e: unknown) => e)) as IndicatorRequestError;
    expect(many.message).toBe("a b");
  });

  it("un error HTTP con cuerpo irreconocible falla con el mensaje de error inválido", async () => {
    respond({ otra: 1 }, 500);
    const error = (await indicatorsAdapter.getWaste({}).catch((e: unknown) => e)) as IndicatorContractError;
    expect(error.message).toBe("No se pudo obtener información válida de error de indicadores. Reintente en unos segundos.");
  });

  it("si el backend rechaza la serie por superar 90 puntos, cobertura reintenta sin serie y explica el rechazo", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ statusCode: 400, message: "La serie supera el máximo de 90 puntos." }, { status: 400 }))
      .mockResolvedValueOnce(Response.json(coverageIndicatorFixture));
    const result = await indicatorsAdapter.getCoverage({ from: "2026-01-01", to: "2026-03-01" });
    expect(result.seriesError).toBe("La serie supera el máximo de 90 puntos.");
    expect(String(fetchSpy.mock.calls[0]![0])).toContain("bucket=");
    expect(String(fetchSpy.mock.calls[1]![0])).not.toContain("bucket=");
  });

  it.each([
    ["no menciona 90", "La serie supera el máximo de puntos."],
    ["no habla de puntos ni intervalos", "La serie supera el máximo de 90 días."],
    ["no habla de un límite", "La serie tiene 90 puntos."],
  ])("un 400 que %s no se interpreta como límite de serie", async (_name, message) => {
    respond({ statusCode: 400, message }, 400);
    await expect(indicatorsAdapter.getCoverage({})).rejects.toBeInstanceOf(IndicatorRequestError);
  });

  it.each(["intervalos", "intervalo", "puntos", "punto"])("reconoce '%s' como unidad del límite", async (unit) => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ statusCode: 400, message: `Se excede el limite de 90 ${unit}` }, { status: 400 }))
      .mockResolvedValueOnce(Response.json(coverageIndicatorFixture));
    expect((await indicatorsAdapter.getCoverage({})).seriesError).toBeDefined();
  });

  it("un 500 con texto de límite no activa el reintento sin serie", async () => {
    respond({ statusCode: 500, message: "supera 90 puntos" }, 500);
    await expect(indicatorsAdapter.getCoverage({})).rejects.toBeInstanceOf(IndicatorRequestError);
  });

  it("si el reintento sin serie también falla, se propaga el error original", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ statusCode: 400, message: "supera 90 puntos" }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ nada: true }));
    const error = await indicatorsAdapter.getCoverage({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(IndicatorRequestError);
    expect((error as IndicatorRequestError).message).toBe("supera 90 puntos");
  });

  it("indicatorQueryErrorMessage distingue el rango invertido del resto", () => {
    expect(indicatorQueryErrorMessage({ issues: [{ message: "x" }, { message: INVERTED_RANGE_MESSAGE }] })).toBe(INVERTED_RANGE_MESSAGE);
    expect(indicatorQueryErrorMessage({ issues: [{ message: "x" }] })).toBe("Los filtros de indicadores no respetan el formato esperado.");
    expect(indicatorQueryErrorMessage({ issues: [] })).toBe("Los filtros de indicadores no respetan el formato esperado.");
  });

  it("valida el formato de los filtros", () => {
    const ok = { from: "2026-01-01", to: "2026-01-31", zoneId: "z", serviceTypeId: "t" };
    expect(indicatorQuerySchema.safeParse(ok).success).toBe(true);
    expect(indicatorQuerySchema.safeParse({ from: "2026-01-01x" }).success).toBe(false);
    expect(indicatorQuerySchema.safeParse({ from: "x2026-01-01" }).success).toBe(false);
    expect(indicatorQuerySchema.safeParse({ from: "2026-1-01" }).success).toBe(false);
    expect(indicatorQuerySchema.safeParse({ zoneId: "   " }).success).toBe(false);
    expect(indicatorQuerySchema.safeParse({ serviceTypeId: "" }).success).toBe(false);
    expect(indicatorQuerySchema.safeParse({ zoneId: "  z  " }).data?.zoneId).toBe("z");
    expect(indicatorQuerySchema.safeParse({ serviceTypeId: "  t  " }).data?.serviceTypeId).toBe("t");
    const inverted = indicatorQuerySchema.safeParse({ from: "2026-02-01", to: "2026-01-01" });
    expect(inverted.success).toBe(false);
    expect(inverted.error?.issues.map((issue) => issue.message)).toContain(INVERTED_RANGE_MESSAGE);
    expect(indicatorQuerySchema.safeParse({ from: "2026-01-01", to: "2026-01-01" }).success).toBe(true);
  });
});

describe("estado del tablero en la URL", () => {
  it("lee todos los parámetros válidos", () => {
    const params = new URLSearchParams("from=2026-08-01&to=2026-08-31&zoneId=Z1&serviceTypeId=T1&family=waste&view=table&signal=zones:z-1:x");
    expect(parseIndicatorUrlState(params, now)).toEqual({
      query: { from: "2026-08-01", to: "2026-08-31", zoneId: "Z1", serviceTypeId: "T1" },
      family: "waste",
      view: "table",
      signal: { breakdownId: "zones", pointId: "z-1:x" },
    });
  });

  it("lo inválido o ausente cae a los valores por defecto", () => {
    const state = parseIndicatorUrlState(new URLSearchParams("from=mal&family=otra&view=otra&signal=:sin-id"), now);
    expect(state.family).toBe("coverage");
    expect(state.view).toBe("bars");
    expect(state.signal).toBeUndefined();
    expect(state.query.to).toBe("2026-09-15");
    expect(parseIndicatorUrlState(new URLSearchParams("signal=sinseparador"), now).signal).toBeUndefined();
    expect(parseIndicatorUrlState(new URLSearchParams("signal=a:b"), now).signal).toEqual({ breakdownId: "a", pointId: "b" });
  });

  it("serializa solo lo informado, conserva el resto de la URL y pisa los parámetros del tablero", () => {
    const query = serializeIndicatorUrlState({ query: { from: "2026-08-01", to: "2026-08-31", zoneId: "Z1", serviceTypeId: "T1" }, family: "waste", view: "table", signal: { breakdownId: "b", pointId: "p" } }, "destination=indicators&from=viejo&zoneId=viejo&serviceTypeId=viejo&to=viejo&family=x&view=table&signal=y");
    const params = new URLSearchParams(query);
    expect(Object.fromEntries(params)).toEqual({ destination: "indicators", from: "2026-08-01", to: "2026-08-31", zoneId: "Z1", serviceTypeId: "T1", family: "waste", view: "table", signal: "b:p" });
    expect(serializeIndicatorUrlState({ query: {}, family: "coverage", view: "bars" }, "view=table&signal=a:b&from=1")).toBe("family=coverage");
    expect(serializeIndicatorUrlState({ query: { from: "2026-08-01" }, family: "coverage", view: "bars" })).toBe("from=2026-08-01&family=coverage");
  });
});

describe("pedido al backend", () => {
  it("coverageBucket usa semanas hasta 90 y meses después (con alineación a lunes)", () => {
    expect(coverageBucket({ from: "2026-01-05", to: "2026-01-11" })).toBe("week");
    // 90 semanas completas desde un lunes: 630 días
    expect(coverageBucket({ from: "2024-01-01", to: "2025-09-20" })).toBe("week");
    expect(coverageBucket({ from: "2024-01-01", to: "2025-09-21" })).toBe("week");
    expect(coverageBucket({ from: "2024-01-01", to: "2025-09-22" })).toBe("month");
    // empezar un domingo suma casi una semana por alineación
    expect(coverageBucket({ from: "2024-01-07", to: "2025-09-21" })).toBe("week");
    expect(coverageBucket({ from: "2024-01-07", to: "2025-09-22" })).toBe("month");
  });

  it("arma la consulta con compare, bucket y filtros según la familia", async () => {
    const spy = respond(coverageIndicatorFixture);
    await indicatorsAdapter.getCoverage({ from: "2026-08-01", to: "2026-08-31", zoneId: "Z 1", serviceTypeId: "T1" });
    const url = new URL(String(spy.mock.calls[0]![0]), "http://x");
    expect(url.pathname).toBe("/api/indicators/coverage");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-08-01", to: "2026-08-31", compare: "previous", bucket: "week", zoneId: "Z 1", serviceTypeId: "T1" });

    const wasteSpy = respond(wasteIndicatorFixture);
    await indicatorsAdapter.getWaste({ from: "2026-08-01", to: "2026-08-31", zoneId: "Z1", serviceTypeId: "T1" });
    const waste = new URL(String(wasteSpy.mock.calls.at(-1)![0]), "http://x");
    expect(waste.searchParams.has("bucket")).toBe(false);
    expect(waste.searchParams.has("zoneId")).toBe(false);
  });
});

describe("metas y exportación CSV", () => {
  it("meta por defecto de cada familia", () => {
    expect(defaultIndicatorTarget("coverage")).toEqual({ value: 95, direction: "min" });
    expect(defaultIndicatorTarget("compliance")).toEqual({ value: 90, direction: "min" });
    expect(defaultIndicatorTarget("incidents")).toEqual({ value: 5, direction: "max" });
    expect(defaultIndicatorTarget("waste")).toBeNull();
    expect(INDICATOR_TARGETS.incidents.target.unit).toBe("días hábiles");
  });

  it("hasNumericThreshold exige valor numérico y dirección min o max", () => {
    expect(hasNumericThreshold(undefined)).toBe(false);
    expect(hasNumericThreshold(null)).toBe(false);
    expect(hasNumericThreshold({ value: null, direction: "min" })).toBe(false);
    expect(hasNumericThreshold({ value: 1, direction: "otra" })).toBe(false);
    expect(hasNumericThreshold({ value: 1, direction: "min" })).toBe(true);
    expect(hasNumericThreshold({ value: 1, direction: "max" })).toBe(true);
  });

  it("isCoverageBelowTarget solo aplica con programados y respeta la dirección", () => {
    expect(isCoverageBelowTarget(0, 10)).toBe(false);
    expect(isCoverageBelowTarget(1, 94.9)).toBe(true);
    expect(isCoverageBelowTarget(1, 95)).toBe(false);
    expect(isCoverageBelowTarget(1, 10, null)).toBe(false);
    expect(isCoverageBelowTarget(1, 6, { value: 5, direction: "max" })).toBe(true);
    expect(isCoverageBelowTarget(1, 5, { value: 5, direction: "max" })).toBe(false);
  });

  it("exporta el CSV con BOM, separador ;, CRLF, escapes y formato es-AR", () => {
    const csv = coverageRowsToCsv([
      { name: "Zona; \"A\"", scheduled: 1200, served: 1000, partial: 100, notServiced: 50, pending: 50, coveragePct: 83.33, upcoming: 2000, lowSample: true },
      { name: "=SUMA(1)", scheduled: 0, served: 0, partial: 0, notServiced: 0, pending: 0, coveragePct: 0 },
      { name: "-x", scheduled: 10, served: 10, partial: 0, notServiced: 0, pending: 0, coveragePct: 100, upcoming: null },
      { name: "a\nb", scheduled: 10, served: 10, partial: 0, notServiced: 0, pending: 0, coveragePct: 100, upcoming: 0 },
    ], "Zona");
    expect(csv).toBe([
      "﻿Zona;Programados;Atendidos;Parciales;No atendidos;Pendientes;Cobertura %;Bajo la meta;Programado a futuro;Muestra baja",
      "\"Zona; \"\"A\"\"\";1.200;1.000;100;50;50;83,3;Sí;2.000;Sí",
      "'=SUMA(1);0;0;0;0;0;Sin programados;No;Sin dato;No",
      "'-x;10;10;0;0;0;100;No;Sin dato;No",
      "\"a\nb\";10;10;0;0;0;100;No;0;No",
    ].join("\r\n"));
  });

  it("el nombre que no empieza con un carácter de fórmula no se prefija", () => {
    expect(coverageRowsToCsv([{ name: "a=b", scheduled: 1, served: 1, partial: 0, notServiced: 0, pending: 0, coveragePct: 100 }], "N").split("\r\n")[1]).toMatch(/^a=b;/);
  });
});
