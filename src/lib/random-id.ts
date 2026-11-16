/**
 * Identificadores y enteros aleatorios basados en Web Crypto (navegador y Node),
 * en lugar de `Math.random()`, que no es criptográficamente seguro (Sonar S2245).
 */

/** UUID v4. Usa `crypto.randomUUID()` y cae a `getRandomValues` fuera de contextos seguros. */
export function randomUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Entero uniforme en [min, max] (ambos inclusive), sin sesgo de módulo. */
export function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return min + (buffer[0] % range);
}
