import { Blob as NodeBlob } from "node:buffer";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";

import { handlers } from "./handlers";
import { withNodeFile } from "./node-file";
import { loadScenario } from "@/lib/scenario-client";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe("scenario mock handlers", () => {
  it("serves the same named Office scenario used by the shell", async () => {
    await expect(loadScenario("office-duty-queue")).resolves.toMatchObject({
      id: "office-duty-queue",
      actor: { kind: "OFFICE" },
    });
  });
});

describe("evidence mock handler", () => {
  it("rejects a real file above 4 MB despite a forged fileSize field", async () => {
    const boundary = "mock-size-boundary";
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="large.jpg"\r\nContent-Type: image/jpeg\r\n\r\n${"x".repeat(4 * 1024 * 1024 + 1)}\r\n`
      + `--${boundary}\r\nContent-Disposition: form-data; name="ownerType"\r\n\r\nSERVICE\r\n`
      + `--${boundary}\r\nContent-Disposition: form-data; name="ownerId"\r\n\r\nSVC-1050\r\n`
      + `--${boundary}\r\nContent-Disposition: form-data; name="fileSize"\r\n\r\n1\r\n--${boundary}--\r\n`;
    vi.stubGlobal("Blob", NodeBlob);
    const response = await withNodeFile(() => fetch("http://localhost/api/evidence", {
      method: "POST", headers: { "Idempotency-Key": "oversize-mock", "content-type": `multipart/form-data; boundary=${boundary}` }, body,
    }));

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ message: "El archivo supera el tamaño máximo permitido de 4 MB." });
  });
});
