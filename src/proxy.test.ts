import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("optimistic session proxy", () => {
  it("redirects an anonymous request away from the shell", () => {
    const response = proxy(new NextRequest("http://localhost/app"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets requests with a session cookie reach the server page", () => {
    const response = proxy(new NextRequest("http://localhost/app", {
      headers: { cookie: "m6_session=opaque" },
    }));

    expect(response).toBeUndefined();
  });
});
