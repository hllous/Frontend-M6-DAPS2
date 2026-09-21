import { describe, expect, it } from "vitest";

import {
  MAX_PAGE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  boundedDecimalInput,
  clampPage,
  clampPageSize,
  externalIdInput,
  latitudeInput,
  parseCoordinateField,
  longitudeInput,
  pageParam,
  pageSizeParam,
  roundCoordinate,
  searchParam,
} from "./input-limits";

function decimals(value: number): number {
  const [, fraction = ""] = String(value).split(".");
  return fraction.length;
}

describe("roundCoordinate", () => {
  it.each([-34.123456789, 34.123456789, -58.38159999999, 0.00000004, -0.00000006, 179.99999999, -89.12345675])(
    "deja %s con no mas de 7 decimales",
    (value) => {
      expect(decimals(roundCoordinate(value))).toBeLessThanOrEqual(7);
    },
  );

  it("redondea al septimo decimal", () => {
    expect(roundCoordinate(-34.123456789)).toBe(-34.1234568);
    expect(roundCoordinate(-58.381599)).toBe(-58.381599);
  });
});

describe("latitudeInput / longitudeInput", () => {
  it("aceptan los limites y rechazan lo que los supera", () => {
    expect(latitudeInput().safeParse(90).success).toBe(true);
    expect(latitudeInput().safeParse(-90).success).toBe(true);
    expect(latitudeInput().safeParse(90.0000001).success).toBe(false);
    expect(latitudeInput().safeParse(-91).success).toBe(false);
    expect(longitudeInput().safeParse(180).success).toBe(true);
    expect(longitudeInput().safeParse(-180).success).toBe(true);
    expect(longitudeInput().safeParse(180.5).success).toBe(false);
    expect(longitudeInput().safeParse(-181).success).toBe(false);
  });

  it("rechaza NaN e Infinity", () => {
    expect(latitudeInput().safeParse(Number.NaN).success).toBe(false);
    expect(longitudeInput().safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
  });

  it("redondea a 7 decimales al parsear", () => {
    expect(latitudeInput().parse(-34.123456789)).toBe(-34.1234568);
  });

  it("informa el rango en castellano", () => {
    const result = latitudeInput().safeParse(500);
    expect(result.success ? "" : result.error.issues[0]?.message).toBe("La latitud debe estar entre -90 y 90.");
  });
});

describe("boundedDecimalInput", () => {
  it("respeta el tope y el minimo", () => {
    const capacity = boundedDecimalInput("La capacidad", 99999999.99, { positive: true });
    expect(capacity.safeParse(99999999.99).success).toBe(true);
    expect(capacity.safeParse(100000000).success).toBe(false);
    expect(capacity.safeParse(0).success).toBe(false);
    const height = boundedDecimalInput("La altura", 999.99);
    expect(height.safeParse(0).success).toBe(true);
    expect(height.safeParse(-1).success).toBe(false);
    expect(height.safeParse(1000).success).toBe(false);
  });
});

describe("externalIdInput", () => {
  it("acepta 100 caracteres y rechaza 101 o vacio", () => {
    expect(externalIdInput().safeParse("a".repeat(100)).success).toBe(true);
    expect(externalIdInput().safeParse("a".repeat(101)).success).toBe(false);
    expect(externalIdInput().safeParse("   ").success).toBe(false);
  });
});

describe("clampPage / clampPageSize", () => {
  it("fija page en 1..MAX_PAGE", () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-4)).toBe(1);
    expect(clampPage(3.9)).toBe(3);
    expect(clampPage(99999999)).toBe(MAX_PAGE);
    expect(clampPage(Number.NaN)).toBeUndefined();
  });

  it("fija pageSize en 1..MAX_PAGE_SIZE", () => {
    expect(clampPageSize(500)).toBe(MAX_PAGE_SIZE);
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(25)).toBe(25);
  });
});

describe("parametros de consulta", () => {
  it("pageParam y pageSizeParam devuelven undefined si faltan y acotan si sobran", () => {
    expect(pageParam(new URLSearchParams())).toBeUndefined();
    expect(pageParam(new URLSearchParams("page=99999999"))).toBe(MAX_PAGE);
    expect(pageParam(new URLSearchParams("page=abc"))).toBeUndefined();
    expect(pageSizeParam(new URLSearchParams("pageSize=1000"))).toBe(MAX_PAGE_SIZE);
  });

  it("searchParam trunca a MAX_SEARCH_LENGTH", () => {
    expect(searchParam(new URLSearchParams())).toBeUndefined();
    expect(searchParam(new URLSearchParams(`search=${"x".repeat(150)}`))).toHaveLength(MAX_SEARCH_LENGTH);
    expect(searchParam(new URLSearchParams("search=poda"))).toBe("poda");
  });
});

describe("parseCoordinateField", () => {
  it("devuelve el valor redondeado a 7 decimales", () => {
    expect(parseCoordinateField(" -34.123456789 ", "lat")).toEqual({ value: -34.1234568 });
    expect(parseCoordinateField("-58.381599", "lng")).toEqual({ value: -58.381599 });
  });

  it("devuelve errores en castellano para vacio, texto y fuera de rango", () => {
    expect(parseCoordinateField("", "lat")).toEqual({ error: "Indique una latitud numérica válida." });
    expect(parseCoordinateField("abc", "lng").error).toBe("La longitud debe ser un número válido.");
    expect(parseCoordinateField("91", "lat").error).toBe("La latitud debe estar entre -90 y 90.");
    expect(parseCoordinateField("-181", "lng").error).toBe("La longitud debe estar entre -180 y 180.");
  });
});
