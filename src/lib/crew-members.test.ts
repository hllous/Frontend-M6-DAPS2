import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { crewFixtures, resetCrewFixtures } from "./crew-fixtures";
import { CrewContractError, crewsAdapter } from "./crews";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetCrewFixtures();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("crew membership adapter", () => {
  it("adds one or more M1 members through the dedicated sub-resource", async () => {
    const updated = await crewsAdapter.addMembers("crew-membership", ["user-ana", "user-pedro"]);

    expect(updated).toMatchObject({
      id: "crew-membership",
      memberUserIds: ["user-ana", "user-pedro"],
    });
    expect(crewFixtures.find((crew) => crew.id === "crew-membership")?.memberUserIds).toEqual([
      "user-ana",
      "user-pedro",
    ]);
  });

  it("removes one M1 member through the dedicated sub-resource", async () => {
    const updated = await crewsAdapter.removeMember("crew-membership", "user-pedro");

    expect(updated).toMatchObject({
      id: "crew-membership",
      memberUserIds: ["user-ana"],
    });
  });

  it("validates the membership response independently from crew updates", async () => {
    const original = await crewsAdapter.get("crew-membership");
    expect(original.memberUserIds).toEqual(["user-ana"]);

    await expect(crewsAdapter.addMembers("crew-membership", ["user-pedro"])).resolves.toMatchObject({
      memberUserIds: ["user-ana", "user-pedro"],
    });
  });

  it("rejects a malformed membership response at the adapter boundary", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/api/crews/crew-membership/members")) {
        return new Response(JSON.stringify({ memberUserIds: "not-an-array" }), { status: 200 });
      }
      return originalFetch(input, init);
    });

    await expect(crewsAdapter.addMembers("crew-membership", ["user-pedro"])).rejects.toBeInstanceOf(CrewContractError);
  });
});
