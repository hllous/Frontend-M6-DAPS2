const FORBIDDEN: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "module code", pattern: /\bM[1-9]\b/g },
  { label: "the word backend", pattern: /backend/gi },
  { label: "API field name", pattern: /\b(?:workOrderId|closureId|ticketId|serviceId|zoneId)\b/g },
];

const ATTRIBUTES = ["aria-label", "title", "placeholder"];

// Joins text nodes with spaces so adjacent elements ("M1" + "x") never fuse into one word.
function visibleText(container: HTMLElement): string {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    parts.push(node.textContent ?? "");
  }
  return parts.join(" ");
}

/**
 * Fails when rendered copy leaks internal vocabulary: module codes (M1–M9), the word
 * "backend" or raw API field names. Checks visible text plus aria-label, title and
 * placeholder values.
 */
export function expectNoInternalJargon(container: HTMLElement): void {
  const sources: Array<{ where: string; value: string }> = [
    { where: "text", value: visibleText(container) },
  ];
  for (const attribute of ATTRIBUTES) {
    const selector = `[${attribute}]`;
    const elements = [
      ...(container.matches(selector) ? [container] : []),
      ...container.querySelectorAll(selector),
    ];
    for (const element of elements) {
      sources.push({ where: attribute, value: element.getAttribute(attribute) ?? "" });
    }
  }

  const offenders: string[] = [];
  for (const { where, value } of sources) {
    for (const { label, pattern } of FORBIDDEN) {
      for (const match of value.matchAll(pattern)) {
        offenders.push(`${label} "${match[0]}" in ${where}: "${value.trim().slice(0, 120)}"`);
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error(`Internal jargon found in rendered copy:\n- ${offenders.join("\n- ")}`);
  }
}
