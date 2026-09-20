import { describe, expect, it } from "vitest";

import { createContainerInputSchema, confirmRelocationInputSchema, updateContainerInputSchema } from "./containers";
import { createEnvironmentalReportInputSchema, environmentalInspectionChecklistResultSchema } from "./environmental-reports";
import { createGreenSpaceInputSchema } from "./green-spaces";
import { greenPointCreateInputSchema } from "./green-points";
import { cancelServiceInputSchema, containerLocationSchema, rescheduleServiceInputSchema, suspendServiceInputSchema } from "./services";
import { treeCreateInputSchema, treeUpdateInputSchema } from "./trees";
import { createVehicleInputSchema } from "./vehicles";

const container = { code: "C-1", containerType: "HOUSEHOLD", zoneId: "z1", address: "Calle 1", lat: -34.6, lng: -58.4, capacityLiters: 1100 };
const environmentalReport = { reportType: "DUMPING", address: "Calle 1", lat: -34.6, lng: -58.4, description: "Basural" };
const tree = { surveyCode: "T-1", zoneId: "z1", species: "Fresno", heightM: 10, diameterCm: 30 };

describe("coordinate ranges and rounding (#248)", () => {
  it.each([
    ["contenedor", (lat: number, lng: number) => createContainerInputSchema.safeParse({ ...container, lat, lng })],
    ["reubicacion", (lat: number, lng: number) => confirmRelocationInputSchema.safeParse({ address: "Calle 1", lat, lng })],
    ["reporte ambiental", (lat: number, lng: number) => createEnvironmentalReportInputSchema.safeParse({ ...environmentalReport, lat, lng })],
    ["ubicacion de cierre", (lat: number, lng: number) => containerLocationSchema.safeParse({ address: "Calle 1", lat, lng })],
    ["arbol", (lat: number, lng: number) => treeCreateInputSchema.safeParse({ ...tree, lat, lng })],
    ["punto verde", (lat: number, lng: number) => greenPointCreateInputSchema.safeParse({ code: "PV-1", name: "Punto", zoneId: "z1", wasteTypes: ["RECYCLABLE"], lat, lng })],
    ["espacio verde", (lat: number, lng: number) => createGreenSpaceInputSchema.safeParse({ name: "Plaza", spaceType: "SQUARE", areaM2: 10, zoneId: "z1", lat, lng })],
  ])("%s acepta los limites y rechaza el limite + 1", (_name, parse) => {
    expect(parse(90, 180).success).toBe(true);
    expect(parse(-90, -180).success).toBe(true);
    expect(parse(90.1, 0).success).toBe(false);
    expect(parse(-90.1, 0).success).toBe(false);
    expect(parse(0, 180.1).success).toBe(false);
    expect(parse(0, -180.1).success).toBe(false);
  });

  it("redondea a 7 decimales lo que se envia", () => {
    const parsed = createContainerInputSchema.parse({ ...container, lat: -34.123456789, lng: -58.987654321 });

    expect(parsed.lat).toBe(-34.1234568);
    expect(parsed.lng).toBe(-58.9876543);
  });

  it("el update de contenedor tambien acota las coordenadas", () => {
    expect(updateContainerInputSchema.safeParse({ lat: 91 }).success).toBe(false);
    expect(updateContainerInputSchema.safeParse({ lng: 180 }).success).toBe(true);
  });
});

describe("numeric caps (#248)", () => {
  it("capacityLiters: entero 1..2147483647", () => {
    expect(createContainerInputSchema.safeParse({ ...container, capacityLiters: 2147483647 }).success).toBe(true);
    expect(createContainerInputSchema.safeParse({ ...container, capacityLiters: 2147483648 }).success).toBe(false);
    expect(createContainerInputSchema.safeParse({ ...container, capacityLiters: 0 }).success).toBe(false);
    expect(createContainerInputSchema.safeParse({ ...container, capacityLiters: 1.5 }).success).toBe(false);
  });

  it("capacity de vehiculo: mayor a 0 y hasta 99999999.99", () => {
    const vehicle = { plate: "AA 111 AA", vehicleType: "VAN" };
    expect(createVehicleInputSchema.safeParse({ ...vehicle, capacity: 99999999.99 }).success).toBe(true);
    expect(createVehicleInputSchema.safeParse({ ...vehicle, capacity: 100000000 }).success).toBe(false);
    expect(createVehicleInputSchema.safeParse({ ...vehicle, capacity: 0 }).success).toBe(false);
  });

  it("areaM2 de espacio verde: mayor a 0 y hasta 99999999.99", () => {
    const space = { name: "Plaza", spaceType: "SQUARE", zoneId: "z1" };
    expect(createGreenSpaceInputSchema.safeParse({ ...space, areaM2: 99999999.99 }).success).toBe(true);
    expect(createGreenSpaceInputSchema.safeParse({ ...space, areaM2: 100000000 }).success).toBe(false);
  });

  it("heightM hasta 999.99 y diameterCm hasta 9999.9", () => {
    expect(treeCreateInputSchema.safeParse({ ...tree, heightM: 999.99, diameterCm: 9999.9 }).success).toBe(true);
    expect(treeCreateInputSchema.safeParse({ ...tree, heightM: 1000 }).success).toBe(false);
    expect(treeCreateInputSchema.safeParse({ ...tree, diameterCm: 10000 }).success).toBe(false);
    expect(treeUpdateInputSchema.safeParse({ heightM: 1000 }).success).toBe(false);
  });
});

describe("required text is trimmed (#248)", () => {
  it("rechaza motivos y notas que son solo espacios", () => {
    expect(cancelServiceInputSchema.safeParse({ reason: "   " }).success).toBe(false);
    expect(rescheduleServiceInputSchema.safeParse({ reason: "\n " }).success).toBe(false);
    expect(suspendServiceInputSchema.safeParse({ reason: "WEATHER", note: "  " }).success).toBe(false);
    expect(environmentalInspectionChecklistResultSchema.safeParse({ id: "  ", label: "Control", completed: true }).success).toBe(false);
  });

  it("guarda el motivo sin espacios sobrantes", () => {
    expect(cancelServiceInputSchema.parse({ reason: "  sin acceso  " }).reason).toBe("sin acceso");
  });
});
