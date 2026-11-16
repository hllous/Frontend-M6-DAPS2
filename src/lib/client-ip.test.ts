import { afterEach, describe, expect, it, vi } from "vitest";

import { clientIp, UNKNOWN_CLIENT_IP } from "./client-ip";

afterEach(() => vi.unstubAllEnvs());

const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

describe("clientIp", () => {
  it("ignores spoofable forwarding headers when no trusted proxy overwrites them", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("M6_TRUST_PROXY", "");

    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6" }))).toBe(UNKNOWN_CLIENT_IP);
  });

  it("uses the first forwarded hop on Vercel", () => {
    vi.stubEnv("VERCEL", "1");

    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "2001:DB8::1" }))).toBe("2001:db8::1");
  });

  it("trusts the header when the deployment declares an overwriting proxy", () => {
    vi.stubEnv("M6_TRUST_PROXY", "true");

    expect(clientIp(req({ "x-forwarded-for": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("falls back to the shared key for missing or malformed values", () => {
    vi.stubEnv("VERCEL", "1");

    expect(clientIp(req({}))).toBe(UNKNOWN_CLIENT_IP);
    expect(clientIp(req({ "x-forwarded-for": "<script>" }))).toBe(UNKNOWN_CLIENT_IP);
  });
});
