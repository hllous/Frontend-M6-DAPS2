import { describe, expect, it } from "vitest";

import { forwardResponse } from "@/lib/bff-route";

describe("BFF upstream relay", () => {
  it.each(["application/json", "application/json; charset=utf-8", "Application/JSON; charset=UTF-8"])("relays %s bytes and status with nosniff", async (contentType) => {
    const body = '{"message":"Error documentado."}';
    const result = forwardResponse(new Response(body, {
      status: 422, headers: { "content-type": contentType, "set-cookie": "upstream=secret", "x-internal": "private" },
    }));
    expect(result.status).toBe(422);
    expect(result.headers.get("content-type")).toBe(contentType);
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(result.headers.has("set-cookie")).toBe(false);
    expect(result.headers.has("x-internal")).toBe(false);
    expect(await result.text()).toBe(body);
  });

  it.each(["text/html", "text/plain", "application/problem+json", "application/jsonp", "application/json-malicious", ""])("wraps disallowed type %s without exposing upstream body", async (contentType) => {
    const result = forwardResponse(new Response("<script>upstream detail</script>", {
      status: 502, headers: { "content-type": contentType },
    }), "/api/services");
    expect(result.status).toBe(502);
    expect(result.headers.get("content-type")).toContain("application/json");
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await result.json()).toEqual({
      statusCode: 502, error: "Bad Gateway", path: "/api/services",
      message: "La respuesta del backend no tiene un tipo de contenido JSON válido.", timestamp: expect.any(String),
    });
  });

  it("relays a 2xx response with no content type as JSON", async () => {
    const body = '{"ok":true}';
    const upstream = new Response(body, { status: 200 });
    upstream.headers.delete("content-type");
    const result = forwardResponse(upstream);
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("application/json");
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await result.text()).toBe(body);
  });

  it("wraps a text/html 2xx response as Bad Gateway", async () => {
    const result = forwardResponse(new Response("<html>upstream failure</html>", {
      status: 200, headers: { "content-type": "text/html" },
    }), "/api/services");
    expect(result.status).toBe(502);
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await result.json()).toMatchObject({ statusCode: 502, error: "Bad Gateway", path: "/api/services" });
  });

  it("preserves a text/html 503 gateway error status", async () => {
    const result = forwardResponse(new Response("upstream", { status: 503, headers: { "content-type": "text/html" } }), "/api/services");
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({ statusCode: 503, error: "Service Unavailable", path: "/api/services" });
  });

  it.each([204, 205, 304])("preserves bodyless HTTP %s with nosniff", async (status) => {
    const result = forwardResponse(new Response(null, { status }));
    expect(result.status).toBe(status);
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await result.text()).toBe("");
  });
});
