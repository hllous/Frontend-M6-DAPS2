import { expect, test } from "@playwright/test";

test.describe("public health contract @smoke", () => {
  test("responds with the documented health envelope", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      status: "ok",
      service: "m6-ambiente-frontend",
    });
    expect(typeof body.timestamp).toBe("string");
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
  });
});
