import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { scenarios } from "@/lib/scenarios";
import { coverageIndicatorFixture } from "@/lib/indicator-fixtures";
import type { CoverageWire } from "@/lib/indicators";
import { handlers } from "@/mocks/handlers";

import { IndicatorsDashboard } from "./indicators-dashboard";

const server = setupServer(...handlers);
const downloadedBlobs: Blob[] = [];
const downloads: Array<{ filename: string; blob: Blob }> = [];
const NativeURL = globalThis.URL;

const zoneRates = [50, 60, 70, 75.4, 80, 85, 90, 94.9, 95, 97, 100];
const serviceTypeRates = [50, 60, 70, 75.5, 80, 85, 90, 94, 95, 98.5, 100];

function coverageRow(id: string, name: string, coveragePct: number, scheduled = 10) {
  if (name === 'Zona; "especial"' || name === 'Tipo; "especial"') {
    return { id, code: id, name, scheduled, served: 6, partial: 1, notServiced: 1, pending: 2, coveragePct };
  }

  if (scheduled === 0) {
    return { id, code: id, name, scheduled, served: 0, partial: 0, notServiced: 0, pending: 0, coveragePct };
  }

  const served = Math.floor(coveragePct / 10);
  return { id, code: id, name, scheduled, served, partial: 0, notServiced: scheduled - served, pending: 0, coveragePct };
}

const csvCoverageFixture: CoverageWire = {
  ...coverageIndicatorFixture,
  byZone: [
    ...zoneRates.map((rate, index) => coverageRow(
      `zone-${index + 1}`,
      index === 3 ? 'Zona; "especial"' : index === 10 ? "Zona fuera de las primeras diez" : `Zona ${String(index + 1).padStart(2, "0")}`,
      rate,
    )),
    coverageRow("zone-unscheduled", "Zona sin programados", 0, 0),
  ],
  byServiceType: [
    ...serviceTypeRates.map((rate, index) => coverageRow(
      `service-type-${index + 1}`,
      index === 3 ? 'Tipo; "especial"' : `Tipo ${String(index + 1).padStart(2, "0")}`,
      rate,
    )),
    coverageRow("service-type-unscheduled", "Tipo sin programados", 0, 0),
  ],
};

function readBlob(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob, "utf-8");
  });
}

function readBlobBytes(blob: Blob) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  downloadedBlobs.length = 0;
  downloads.length = 0;
  server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(csvCoverageFixture)));

  class DownloadURL extends NativeURL {
    static createObjectURL(object: Blob | MediaSource) {
      const blob = object as Blob;
      downloadedBlobs.push(blob);
      return `blob:coverage-${downloadedBlobs.length}`;
    }

    static revokeObjectURL(url: string) {
      void url;
    }
  }

  vi.stubGlobal("URL", DownloadURL);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    const blob = downloadedBlobs.at(-1);
    if (blob) downloads.push({ filename: this.download, blob });
  });
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});
afterAll(() => server.close());

describe("IndicatorsDashboard CSV export", () => {
  it("downloads every zone and service type in the table sort order with Argentine CSV formatting", async () => {
    const user = userEvent.setup();
    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Exportar CSV" })).toHaveLength(2));
    const categoryRegion = screen.getByRole("region", { name: "Por categoría" });
    const territoryRegion = screen.getByRole("region", { name: "Detalle territorial" });
    const zoneExport = within(territoryRegion).getByRole("button", { name: "Exportar CSV" });
    const serviceTypeExport = within(categoryRegion).getByRole("button", { name: "Exportar CSV" });

    expect(zoneExport).toBeVisible();
    expect(serviceTypeExport).toBeVisible();
    expect(within(territoryRegion).getByText("Mostrando 10 de 12")).toBeVisible();
    expect(within(territoryRegion).queryByRole("rowheader", { name: "Zona fuera de las primeras diez" })).not.toBeInTheDocument();

    await user.click(zoneExport);
    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe("cobertura-zonas-2026-08-08_2026-09-06.csv");
    expect([...(await readBlobBytes(downloads[0].blob)).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const zoneCsv = await readBlob(downloads[0].blob);
    const zoneLines = zoneCsv.replace(/^\uFEFF/, "").split("\r\n");
    expect(zoneLines[0]).toBe("Zona;Programados;Atendidos;Parciales;No atendidos;Pendientes;Cobertura %;Bajo la meta;Programado a futuro;Muestra baja");
    expect(zoneLines).toHaveLength(13);
    expect(zoneLines[1]).toMatch(/^Zona 01;.*;Sí;0;No$/);
    expect(zoneLines[4]).toBe('"Zona; ""especial""";10;6;1;1;2;75,4;Sí;0;No');
    expect(zoneLines[8]).toMatch(/^Zona 08;.*;Sí;0;No$/);
    expect(zoneLines[9]).toMatch(/^Zona 09;.*;No;0;No$/);
    expect(zoneLines[10]).toMatch(/^Zona 10;.*;No;0;No$/);
    expect(zoneLines[11]).toMatch(/^Zona fuera de las primeras diez;.*;No;0;No$/);
    expect(zoneLines[12]).toBe("Zona sin programados;0;0;0;0;0;Sin programados;No;0;No");

    await user.click(serviceTypeExport);
    expect(downloads).toHaveLength(2);
    expect(downloads[1].filename).toBe("cobertura-tipos-2026-08-08_2026-09-06.csv");
    expect([...(await readBlobBytes(downloads[1].blob)).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const serviceTypeCsv = await readBlob(downloads[1].blob);
    const serviceTypeLines = serviceTypeCsv.replace(/^\uFEFF/, "").split("\r\n");
    expect(serviceTypeLines[0]).toBe("Tipo de servicio;Programados;Atendidos;Parciales;No atendidos;Pendientes;Cobertura %;Bajo la meta;Programado a futuro;Muestra baja");
    expect(serviceTypeLines).toHaveLength(13);
    expect(serviceTypeLines[1]).toMatch(/^Tipo 11;.*;No;0;No$/);
    expect(serviceTypeLines[8]).toBe('"Tipo; ""especial""";10;6;1;1;2;75,5;Sí;0;No');
    expect(serviceTypeLines[12]).toBe("Tipo sin programados;0;0;0;0;0;Sin programados;No;0;No");
  });

  it("neutraliza los prefijos de fórmula solo en los nombres exportados", async () => {
    const user = userEvent.setup();
    const riskyNames = ["=Zona", "+Zona", "-Zona", undefined, "@Zona", "\tZona", "\rZona"];
    const injectionFixture: CoverageWire = {
      ...csvCoverageFixture,
      byZone: csvCoverageFixture.byZone.map((row, index) => riskyNames[index] ? { ...row, name: riskyNames[index]! } : row),
    };
    server.use(http.get("*/api/indicators/coverage", () => HttpResponse.json(injectionFixture)));

    render(<IndicatorsDashboard scenario={scenarios.officeDutyQueue} />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Exportar CSV" })).toHaveLength(2));
    const territoryRegion = await screen.findByRole("region", { name: "Detalle territorial" });
    await user.click(await within(territoryRegion).findByRole("button", { name: "Exportar CSV" }));

    const csv = await readBlob(downloads[0].blob);
    expect(csv).toContain("'=Zona;10;5;0;5;0;50;Sí");
    expect(csv).toContain("'+Zona;10;6;0;4;0;60;Sí");
    expect(csv).toContain("'-Zona;10;7;0;3;0;70;Sí");
    expect(csv).toContain("'@Zona;10;8;0;2;0;80;Sí");
    expect(csv).toContain("'\tZona;10;8;0;2;0;85;Sí");
    expect(csv).toContain("\"'\rZona\";10;9;0;1;0;90;Sí");
  });
});
