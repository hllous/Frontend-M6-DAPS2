/**
 * IP del cliente para el límite de intentos de ingreso.
 *
 * Solo se confía en `X-Forwarded-For` cuando un proxy propio lo sobrescribe: en Vercel (`VERCEL` está definida) la
 * plataforma reemplaza el header con la IP pública del cliente (vercel.com/docs/headers/request-headers#x-forwarded-for).
 * Fuera de Vercel (local, Docker) un cliente podría inventarlo para saltarse el límite, así que se ignora salvo que el
 * despliegue declare `M6_TRUST_PROXY=true` porque su proxy lo sobrescribe. Sin IP confiable todos comparten la clave
 * `unknown`: el límite por IP es más estricto en conjunto, pero no se puede eludir cambiando el header.
 */
export const UNKNOWN_CLIENT_IP = "unknown";

const IP_PATTERN = /^[0-9a-f:.]{2,45}$/i;

function proxyIsTrusted(): boolean {
  return Boolean(process.env.VERCEL) || process.env.M6_TRUST_PROXY === "true";
}

export function clientIp(request: Request): string {
  if (!proxyIsTrusted()) return UNKNOWN_CLIENT_IP;
  const candidate = request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && IP_PATTERN.test(candidate) ? candidate.toLowerCase() : UNKNOWN_CLIENT_IP;
}
