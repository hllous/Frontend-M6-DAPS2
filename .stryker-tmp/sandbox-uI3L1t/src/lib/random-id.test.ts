// @ts-nocheck
import { afterEach, describe, expect, it, vi } from "vitest";

import { randomInt, randomUuid } from "./random-id";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("randomUuid", () => {
  it("devuelve UUID v4 distintos", () => {
    const a = randomUuid();
    expect(a).toMatch(UUID_V4);
    expect(randomUuid()).not.toBe(a);
  });

  it("cae a getRandomValues cuando crypto.randomUUID no existe", () => {
    const getRandomValues = vi.fn(<T extends ArrayBufferView>(array: T) => {
      new Uint8Array(array.buffer).fill(0xff);
      return array;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    const id = randomUuid();

    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(id).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(id).toMatch(UUID_V4);
  });

  it("el fallback genera ids distintos con entropía real", () => {
    vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const ids = new Set(Array.from({ length: 50 }, () => randomUuid()));
    expect(ids.size).toBe(50);
    ids.forEach((id) => expect(id).toMatch(UUID_V4));
  });
});

describe("randomInt", () => {
  it("respeta el rango inclusivo", () => {
    const values = Array.from({ length: 500 }, () => randomInt(1000, 9999));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(1000);
    expect(Math.max(...values)).toBeLessThanOrEqual(9999);
    expect(randomInt(5, 5)).toBe(5);
  });

  it("descarta valores sesgados y vuelve a sortear", () => {
    // range 10 => limit 4294967290; 0xffffffff queda fuera y obliga a repetir.
    const draws = [0xffffffff, 0xfffffffa, 7];
    const getRandomValues = vi.fn(<T extends ArrayBufferView>(array: T) => {
      (array as unknown as Uint32Array)[0] = draws.shift() as number;
      return array;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    expect(randomInt(0, 9)).toBe(7);
    expect(getRandomValues).toHaveBeenCalledTimes(3);
  });
});
