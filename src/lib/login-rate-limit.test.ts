import { describe, expect, it } from "vitest";

import { LoginRateLimiter, normalizeLoginAccount } from "./login-rate-limit";

const WINDOW = 15 * 60_000;
const limiter = (options = {}) => new LoginRateLimiter({ windowMs: WINDOW, maxPerAccount: 5, maxPerIp: 20, ...options });

describe("LoginRateLimiter", () => {
  it("allows attempts until the account reaches its failure limit, then blocks with a Retry-After", () => {
    const l = limiter();
    for (let i = 0; i < 4; i += 1) l.recordFailure("1.1.1.1", "ana@x.test", 1_000);
    expect(l.check("1.1.1.1", "ana@x.test", 1_000)).toEqual({ allowed: true });

    l.recordFailure("1.1.1.1", "ana@x.test", 1_000);
    expect(l.check("1.1.1.1", "ana@x.test", 61_000)).toEqual({ allowed: false, retryAfterSeconds: 840 });
  });

  it("blocks the account from any IP but leaves other accounts alone", () => {
    const l = limiter();
    for (let i = 0; i < 5; i += 1) l.recordFailure(`9.9.9.${i}`, "ana@x.test", 0);

    expect(l.check("8.8.8.8", "ana@x.test", 1)).toMatchObject({ allowed: false });
    expect(l.check("8.8.8.8", "beto@x.test", 1)).toEqual({ allowed: true });
  });

  it("blocks an IP that fails against many accounts", () => {
    const l = limiter();
    for (let i = 0; i < 20; i += 1) l.recordFailure("1.1.1.1", `user${i}@x.test`, 0);

    expect(l.check("1.1.1.1", "nuevo@x.test", 1)).toMatchObject({ allowed: false });
    expect(l.check("2.2.2.2", "nuevo@x.test", 1)).toEqual({ allowed: true });
  });

  it("lets the user in again when the window expires", () => {
    const l = limiter();
    for (let i = 0; i < 5; i += 1) l.recordFailure("1.1.1.1", "ana@x.test", 0);

    expect(l.check("1.1.1.1", "ana@x.test", WINDOW - 1)).toMatchObject({ allowed: false });
    expect(l.check("1.1.1.1", "ana@x.test", WINDOW)).toEqual({ allowed: true });
    // La ventana nueva arranca de cero.
    l.recordFailure("1.1.1.1", "ana@x.test", WINDOW);
    expect(l.check("1.1.1.1", "ana@x.test", WINDOW + 1)).toEqual({ allowed: true });
  });

  it("clears the account counter on success but keeps the IP failures", () => {
    const l = limiter({ maxPerIp: 3 });
    l.recordFailure("1.1.1.1", "ana@x.test", 0);
    l.recordFailure("1.1.1.1", "ana@x.test", 0);
    l.recordSuccess("ana@x.test");
    l.recordFailure("1.1.1.1", "ana@x.test", 0);

    expect(l.check("2.2.2.2", "ana@x.test", 1)).toEqual({ allowed: true });
    expect(l.check("1.1.1.1", "otra@x.test", 1)).toMatchObject({ allowed: false });
  });

  it("reports at least one second of Retry-After", () => {
    const l = limiter();
    for (let i = 0; i < 5; i += 1) l.recordFailure("1.1.1.1", "ana@x.test", 0);

    expect(l.check("1.1.1.1", "ana@x.test", WINDOW - 1)).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("bounds memory by evicting when too many distinct keys are tracked", () => {
    const l = limiter({ maxKeys: 3, maxPerAccount: 1, maxPerIp: 100 });
    for (let i = 0; i < 4; i += 1) l.recordFailure("1.1.1.1", `u${i}@x.test`, i);

    // La cuenta más antigua se descartó para dejar lugar; las demás siguen bloqueadas.
    expect(l.check("3.3.3.3", "u0@x.test", 10)).toEqual({ allowed: true });
    expect(l.check("3.3.3.3", "u3@x.test", 10)).toMatchObject({ allowed: false });
  });

  it("drops expired keys before evicting live ones", () => {
    const l = limiter({ maxKeys: 2, maxPerAccount: 1, maxPerIp: 100 });
    l.recordFailure("1.1.1.1", "viejo@x.test", 0);
    l.recordFailure("1.1.1.2", "vivo@x.test", WINDOW - 1);
    l.recordFailure("1.1.1.3", "nuevo@x.test", WINDOW);

    expect(l.check("4.4.4.4", "vivo@x.test", WINDOW)).toMatchObject({ allowed: false });
  });
});

describe("normalizeLoginAccount", () => {
  it("shares one counter across case, spacing and compatibility variants of the same email", () => {
    expect(normalizeLoginAccount("  Ana@X.test ")).toBe("ana@x.test");
    expect(normalizeLoginAccount("ａna@x.test")).toBe("ana@x.test");
  });
});
