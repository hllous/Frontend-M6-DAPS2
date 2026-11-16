import { describe, expect, it } from "vitest";

import { polygonCenter } from "./operational-zones";

describe("polygonCenter", () => {
  it("devuelve el centro por defecto sin lanzar TypeError cuando no hay polígonos", () => {
    expect(polygonCenter([])).toEqual([-34.58, -58.42]);
  });

  it("devuelve el centro por defecto cuando el polígono no tiene anillo exterior", () => {
    expect(polygonCenter([[]])).toEqual([-34.58, -58.42]);
  });

  it("usa el anillo exterior de mayor área", () => {
    const small = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as [number, number][];
    const large = [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]] as [number, number][];
    const [lat, lng] = polygonCenter([[small], [large]]);
    expect(lat).toBeCloseTo(5);
    expect(lng).toBeCloseTo(5);
  });
});
