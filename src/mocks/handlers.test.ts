import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { handlers } from "./handlers";
import { loadScenario } from "@/lib/scenario-client";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("scenario mock handlers", () => {
  it("serves the same named Office scenario used by the shell", async () => {
    await expect(loadScenario("office-duty-queue")).resolves.toMatchObject({
      id: "office-duty-queue",
      actor: { kind: "OFFICE" },
    });
  });
});
