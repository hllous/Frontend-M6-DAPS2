/**
 * Límite de intentos de ingreso fallidos (fuerza bruta), en memoria. Ver ADR-0009 y docs/security/login-rate-limit.md.
 *
 * Ventana fija por clave: el primer fallo abre la ventana; al llegar al máximo la clave queda bloqueada hasta que vence.
 * Se cuentan solo las credenciales rechazadas por M1 (401), de modo que una cuenta que no existe se comporta igual que una
 * que existe con otra contraseña. El estado vive en la instancia: en serverless cada instancia tiene su propio contador.
 */

export const LOGIN_FAILURE_WINDOW_MS = 15 * 60_000;
/** Fallos por cuenta (correo normalizado) dentro de la ventana antes de bloquear. */
export const MAX_FAILURES_PER_ACCOUNT = 5;
/** Fallos por IP; más alto que el de cuenta porque detrás de una NAT comparten IP muchas personas. */
export const MAX_FAILURES_PER_IP = 20;
/** Tope de claves en memoria por mapa: cota contra quien llene la memoria con correos distintos. */
const MAX_TRACKED_KEYS = 10_000;

type Entry = { count: number; windowEndsAt: number };

export type LoginLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type LoginRateLimiterOptions = {
  windowMs?: number;
  maxPerAccount?: number;
  maxPerIp?: number;
  maxKeys?: number;
};

export class LoginRateLimiter {
  private readonly accounts = new Map<string, Entry>();
  private readonly ips = new Map<string, Entry>();
  private readonly windowMs: number;
  private readonly maxPerAccount: number;
  private readonly maxPerIp: number;
  private readonly maxKeys: number;

  constructor(options: LoginRateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? LOGIN_FAILURE_WINDOW_MS;
    this.maxPerAccount = options.maxPerAccount ?? MAX_FAILURES_PER_ACCOUNT;
    this.maxPerIp = options.maxPerIp ?? MAX_FAILURES_PER_IP;
    this.maxKeys = options.maxKeys ?? MAX_TRACKED_KEYS;
  }

  /** ¿Puede esta IP intentar ingresar con esta cuenta? Si no, cuántos segundos faltan para que se libere. */
  check(ip: string, account: string, now = Date.now()): LoginLimitDecision {
    const waits = [
      this.remaining(this.ips, ip, this.maxPerIp, now),
      this.remaining(this.accounts, account, this.maxPerAccount, now),
    ].filter((ms) => ms > 0);
    if (waits.length === 0) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(Math.max(...waits) / 1000)) };
  }

  recordFailure(ip: string, account: string, now = Date.now()): void {
    this.bump(this.ips, ip, now);
    this.bump(this.accounts, account, now);
  }

  /** Un ingreso correcto limpia la cuenta; la IP conserva sus fallos (otra cuenta sigue contando). */
  recordSuccess(account: string): void {
    this.accounts.delete(account);
  }

  reset(): void {
    this.accounts.clear();
    this.ips.clear();
  }

  private remaining(map: Map<string, Entry>, key: string, max: number, now: number): number {
    const entry = map.get(key);
    if (!entry) return 0;
    if (entry.windowEndsAt <= now) {
      map.delete(key);
      return 0;
    }
    return entry.count >= max ? entry.windowEndsAt - now : 0;
  }

  private bump(map: Map<string, Entry>, key: string, now: number): void {
    const entry = map.get(key);
    if (entry && entry.windowEndsAt > now) {
      entry.count += 1;
      return;
    }
    map.delete(key);
    if (map.size >= this.maxKeys) this.evict(map, now);
    map.set(key, { count: 1, windowEndsAt: now + this.windowMs });
  }

  private evict(map: Map<string, Entry>, now: number): void {
    for (const [key, entry] of map) if (entry.windowEndsAt <= now) map.delete(key);
    // Si todas siguen vigentes se descarta la más antigua (el Map conserva el orden de inserción).
    if (map.size >= this.maxKeys) {
      const oldest = map.keys().next();
      if (!oldest.done) map.delete(oldest.value);
    }
  }
}

/** Correo en forma canónica para contar: sin espacios, minúsculas y NFKC, así variantes del mismo correo comparten contador. */
export function normalizeLoginAccount(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}

/** Instancia del proceso usada por `POST /api/session/login`. */
export const loginRateLimiter = new LoginRateLimiter();
