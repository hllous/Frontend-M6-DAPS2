import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { errorResponse, mapSessionError } from "./bff-route";
import { createSession, sessionCookieOptions, sessionCookieRemovalOptions, sessionMarkerCookieOptions } from "./session";

// Eje D: controles transversales del Frontend (ver docs/security/eje-d-evidencia.md).

afterEach(() => vi.unstubAllEnvs());

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mjs)$/.test(entry) && !/\.test\.|\.spec\./.test(entry) ? [full] : [];
  });
}

const SRC = path.resolve(__dirname, "..");
const files = sourceFiles(SRC).filter((file) => !file.includes(`${path.sep}mocks${path.sep}`) && !file.includes(`${path.sep}test${path.sep}`));
const relative = (file: string) => path.relative(SRC, file).split(path.sep).join("/");

describe("session cookies", () => {
  const session = createSession("office-duty-queue", { mode: "mock" });

  it("are Secure, HttpOnly and SameSite=Lax in production, including the marker and the removal cookie", () => {
    vi.stubEnv("NODE_ENV", "production");

    for (const options of [sessionCookieOptions(session), sessionMarkerCookieOptions(), sessionCookieRemovalOptions()]) {
      expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    }
  });

  it("are Secure for any non-loopback host even outside production", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(sessionCookieOptions(session, new Request("https://staging.example.test/")).secure).toBe(true);
    expect(sessionCookieOptions(session, new Request("http://localhost:3000/")).secure).toBe(false);
  });
});

describe("XSS surface", () => {
  it("renders HTML only in the shadcn chart style tag (colors from the code's own config)", () => {
    const users = files.filter((file) => /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|document\.write\(/.test(readFileSync(file, "utf8")));

    expect(users.map(relative)).toEqual(["components/ui/chart.tsx"]);
  });

  it("does not evaluate strings as code", () => {
    const offenders = files.filter((file) => /\beval\(|new Function\(/.test(readFileSync(file, "utf8")));

    expect(offenders.map(relative)).toEqual([]);
  });
});

describe("CORS", () => {
  it("is never enabled by the BFF: no route or config emits Access-Control-Allow-*", () => {
    const configs = [path.resolve(SRC, "..", "next.config.mjs")];
    const offenders = [...files, ...configs].filter((file) => /access-control-allow/i.test(readFileSync(file, "utf8")));

    expect(offenders.map((file) => path.basename(file))).toEqual([]);
  });
});

describe("BFF errors", () => {
  it("never include the stack, the original message or internal detail of an unexpected error", async () => {
    const internal = new Error("connect ECONNREFUSED 10.0.0.5:5432 at /srv/app/src/db.ts:42");

    const response = mapSessionError(internal, "/api/zones", "No se pudieron cargar las zonas.");
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toMatchObject({ statusCode: 500, message: "No se pudieron cargar las zonas.", path: "/api/zones" });
    expect(text).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|\/srv\/app|db\.ts|stack/);
  });

  it("only emit the documented problem-details fields", async () => {
    const body = await errorResponse(404, "No encontrado.", "/api/x").json();

    expect(Object.keys(body).sort()).toEqual(["error", "message", "path", "statusCode", "timestamp"]);
  });
});
