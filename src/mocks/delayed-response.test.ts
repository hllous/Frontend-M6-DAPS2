import { afterEach, describe, expect, it, vi } from "vitest";

import { mockResponseAfter } from "./delayed-response";

afterEach(() => vi.useRealTimers());

describe("mockResponseAfter", () => {
  it("waits for the requested delay before creating the response", async () => {
    vi.useFakeTimers();
    const createResponse = vi.fn(() => "mock response");
    const pending = mockResponseAfter(250, createResponse);

    await vi.advanceTimersByTimeAsync(249);
    expect(createResponse).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBe("mock response");
    expect(createResponse).toHaveBeenCalledOnce();
  });
});
