import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { delay, http, HttpResponse } from "msw";
import { createSessionCookie } from "@/test/session";

import { addressSearchRouteHandlers } from "./address-search-route-handlers";

const server = setupServer(...addressSearchRouteHandlers(""));
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const cookie = createSessionCookie("field-crew-member-route", { mode: "mock" });
const georefUrl = "https://apis.datos.gob.ar/georef/api/direcciones";
const address = { nomenclatura: "AV CORRIENTES 1000, Comuna 1, Ciudad Autónoma de Buenos Aires", provincia: { id: "02" }, ubicacion: { lat: -34.6036694728664, lon: -58.3809752829037 } };

it("maps a stalled upstream request to timeout", async () => {
  server.use(http.get(georefUrl, async () => {
    await delay(5500);
    return HttpResponse.json({ direcciones: [] });
  }));
  const response = await fetch("http://localhost/api/address-search?q=Corrientes", { headers: { cookie } });
  expect(response.status).toBe(504);
  expect(await response.json()).toMatchObject({ outcome: "timeout", message: "No se encontró esa dirección. Márquela en el mapa." });
}, 10000);

it("maps a transport failure to upstream_error", async () => {
  server.use(http.get(georefUrl, () => HttpResponse.error()));
  const response = await fetch("http://localhost/api/address-search?q=Corrientes", { headers: { cookie } });
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ outcome: "upstream_error" });
});

it.each([
  {},
  { direcciones: [{ ...address, nomenclatura: " " }] },
  { direcciones: [{ ...address, provincia: { id: "06" } }] },
  { direcciones: [{ ...address, ubicacion: { lat: 91, lon: -58 } }] },
  { direcciones: [{ ...address, ubicacion: { lat: null, lon: null } }] },
])("rejects an unusable upstream contract: %j", async (body) => {
  server.use(http.get(georefUrl, () => HttpResponse.json(body)));
  const response = await fetch("http://localhost/api/address-search?q=Corrientes", { headers: { cookie } });
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ outcome: "invalid_response", message: "No se encontró esa dirección. Márquela en el mapa." });
});

it("maps invalid JSON to invalid_response", async () => {
  server.use(http.get(georefUrl, () => new HttpResponse("private invalid JSON")));
  const response = await fetch("http://localhost/api/address-search?q=Corrientes", { headers: { cookie } });
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ outcome: "invalid_response" });
});

it.each([429, 500, 503])("maps upstream HTTP %s without exposing its body", async (status) => {
  server.use(http.get(georefUrl, () => new HttpResponse("upstream private details", { status })));
  const response = await fetch("http://localhost/api/address-search?q=Corrientes", { headers: { cookie } });
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ outcome: "upstream_error", statusCode: 502, message: "No se encontró esa dirección. Márquela en el mapa." });
});

it("distinguishes an empty search from results", async () => {
  server.use(http.get(georefUrl, () => HttpResponse.json({ direcciones: [] })));
  const response = await fetch("http://localhost/api/address-search?q=desconocida", { headers: { cookie } });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ outcome: "empty", data: [] });
});

it("searches only CABA and returns at most five labeled points rounded to seven decimals", async () => {
  server.use(http.get(georefUrl, ({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get("direccion")).toBe("Corrientes 1000");
    expect(url.searchParams.get("provincia")).toBe("02");
    expect(url.searchParams.get("max")).toBe("5");
    expect(request.headers.get("cookie")).toBeNull();
    expect(request.headers.get("authorization")).toBeNull();
    return HttpResponse.json({ direcciones: Array.from({ length: 8 }, () => address) });
  }));
  const response = await fetch("http://localhost/api/address-search?q=%20Corrientes%201000%20&provincia=06&max=5000", { headers: { cookie } });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ outcome: "results", data: Array.from({ length: 5 }, () => ({ label: address.nomenclatura, latitude: -34.6036695, longitude: -58.3809753 })) });
});

it.each(["", "?q=", "?q=%20%20", `?q=${"a".repeat(201)}`])("rejects invalid queries: %s", async (query) => {
  const response = await fetch(`http://localhost/api/address-search${query}`, { headers: { cookie } });
  expect(response.status).toBe(400);
});

it("requires an active session before searching addresses", async () => {
  const response = await fetch("http://localhost/api/address-search?q=Corrientes%201000");
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ statusCode: 401, path: "/api/address-search" });
});

it("rejects a tampered session before contacting Georef", async () => {
  const response = await fetch("http://localhost/api/address-search?q=Corrientes", {
    headers: { cookie: "m6_session=invalid" },
  });
  expect(response.status).toBe(401);
});

it("also permits an Office session", async () => {
  server.use(http.get(georefUrl, () => HttpResponse.json({ direcciones: [address] })));
  const response = await fetch("http://localhost/api/address-search?q=Corrientes", {
    headers: { cookie: createSessionCookie("office-duty-queue", { mode: "mock" }) },
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ outcome: "results" });
});
