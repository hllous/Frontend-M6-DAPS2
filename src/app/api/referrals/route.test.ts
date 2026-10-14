import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { GET } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => {
  process.env.M6_AUTH_MODE = "mock";
  resetRepairRequestFixtures();
  resetStreetClosureRequestFixtures();
  resetServiceFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
});



describe("referral workspace BFF", () => {
  it("returns both referral kinds to Office", async () => {
    const cookie = await loginAs("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "REPAIR_REQUEST", destination: "M3", id: "RR-1001" }),
      expect.objectContaining({ kind: "STREET_CLOSURE_REQUEST", destination: "M7", id: "SCR-1001" }),
    ]));
  });

  it("returns only referrals attached to the Field crew's Services", async () => {
    const cookie = await loginAs("field-crew-leader-route");
    const response = await GET(new Request("http://localhost/api/referrals", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.every((referral: { sourceServiceId: string }) => ["SVC-1050", "SVC-1051", "SVC-1055", "SVC-1052", "SVC-1054", "SVC-1094", "SVC-1095", "SVC-1096", "SVC-1097", "SVC-1080"].includes(referral.sourceServiceId))).toBe(true);
  });
});
