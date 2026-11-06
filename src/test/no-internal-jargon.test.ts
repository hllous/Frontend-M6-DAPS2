import { describe, expect, it } from "vitest";

import { expectNoInternalJargon } from "@/test/no-internal-jargon";

function render(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("expectNoInternalJargon", () => {
  it("passes on clean visible text and attributes", () => {
    const container = render(
      '<main><h1>Servicios</h1><button aria-label="Cerrar" title="Cerrar panel">x</button><input placeholder="Buscar" /><p>Orden OT-2048 y M30</p></main>',
    );
    expect(() => expectNoInternalJargon(container)).not.toThrow();
  });

  it.each([
    ["a module name", "<p>Módulo 6</p>", "Módulo 6"],
    ["a module code", "<p>Disponible en M3</p>", "M3"],
    ["the word backend", "<p>Error del Backend</p>", "Backend"],
    ["workOrderId", "<p>workOrderId faltante</p>", "workOrderId"],
    ["closureId", "<p>closureId</p>", "closureId"],
    ["ticketId", "<p>ticketId</p>", "ticketId"],
    ["serviceId", "<p>serviceId</p>", "serviceId"],
    ["zoneId", "<p>zoneId</p>", "zoneId"],
    ["short ID", "<p>#9ee7865f</p>", "#9ee7865f"],
    ["UUID", "<p>550e8400-e29b-41d4-a716-446655440091</p>", "550e8400-e29b-41d4-a716-446655440091"],
  ])("fails on %s in visible text", (_name, html, offender) => {
    expect(() => expectNoInternalJargon(render(html))).toThrow(offender);
  });

  it.each([
    ["aria-label", '<button aria-label="Ver M2">x</button>', "M2"],
    ["title", '<span title="Datos del backend">x</span>', "backend"],
    ["placeholder", '<input placeholder="zoneId" />', "zoneId"],
  ])("fails when the pattern appears only in %s", (_name, html, offender) => {
    expect(() => expectNoInternalJargon(render(html))).toThrow(offender);
  });

  it("permits technical IDs only when explicitly allowed", () => {
    const container = render("<p>#9ee7865f 550e8400-e29b-41d4-a716-446655440091</p>");
    expect(() => expectNoInternalJargon(container, { allowTechnicalIds: true })).not.toThrow();
    expect(() => expectNoInternalJargon(render("<p>backend</p>"), { allowTechnicalIds: true })).toThrow();
  });

  it("lists every offending string", () => {
    const container = render('<p>M1</p><button aria-label="backend">x</button>');
    expect(() => expectNoInternalJargon(container)).toThrow(/M1[\s\S]*backend/);
  });
});
