import { describe, expect, it } from "vitest";
import { asksForOverrideNote, crewFitWarnings } from "./crew-fit";

describe("asksForOverrideNote", () => {
  it("detecta el 409 que pide la justificación", () => {
    expect(asksForOverrideNote("La asignacion tiene reparos: se solapa. Para continuar hace falta 'overrideNote' explicando por que.")).toBe(true);
    expect(asksForOverrideNote("La cuadrilla trabaja en otra zona; hace falta overrideNote")).toBe(true);
  });

  it("no toma por justificable un 409 que sólo nombra la cuadrilla o la zona", () => {
    expect(asksForOverrideNote("La cuadrilla está inactiva.")).toBe(false);
    expect(asksForOverrideNote("La zona no existe.")).toBe(false);
  });
});

describe("crewFitWarnings", () => {
  it("redacta un aviso por cada diferencia", () => {
    expect(crewFitWarnings({ zone: true, specialty: true })).toEqual([
      "La cuadrilla trabaja en una zona distinta.",
      "La cuadrilla tiene una especialidad distinta.",
    ]);
    expect(crewFitWarnings({ zone: false, specialty: true })).toEqual(["La cuadrilla tiene una especialidad distinta."]);
    expect(crewFitWarnings({ zone: false, specialty: false })).toEqual([]);
  });
});
