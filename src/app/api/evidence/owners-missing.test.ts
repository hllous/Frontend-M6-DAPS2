import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { evidenceCache, resetServiceFixtures, resetZoneResultFixtures } from "@/lib/services-fixtures";
import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { withNodeFile } from "@/mocks/node-file";
import { GET, POST as rawPost } from "./route";
import { loginAs } from "@/test/session";

const POST = (request: Request) => withNodeFile(() => rawPost(request));

beforeEach(() => {
  resetServiceFixtures();
  resetZoneResultFixtures();
  resetContainerFixtures();
  evidenceCache.clear();
});
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  vi.restoreAllMocks();
});

function upload(cookie: string, ownerType: string, ownerId: string, key: string) {
  const body = new FormData();
  body.append("file", new File(["image"], "photo.jpg", { type: "image/jpeg" }));
  body.append("ownerType", ownerType);
  body.append("ownerId", ownerId);
  return new Request("http://localhost/api/evidence", { method: "POST", headers: { cookie, "Idempotency-Key": key }, body });
}

describe("/api/evidence en modo mock: dueños inexistentes", () => {
  it.each([
    ["SERVICE", "SVC-NO-EXISTE", "El servicio SVC-NO-EXISTE no existe."],
    ["ZONE_RESULT", "ZR-NO-EXISTE", "El resultado de zona ZR-NO-EXISTE no existe."],
    ["CONTAINER", "CNT-NO-EXISTE", "El contenedor CNT-NO-EXISTE no existe."],
    ["INSPECTION", "INS-NO-EXISTE", "La inspección INS-NO-EXISTE no existe."],
  ])("GET de %s inexistente responde 404", async (ownerType, ownerId, message) => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request(`http://localhost/api/evidence?ownerType=${ownerType}&ownerId=${ownerId}`, { headers: { cookie } }));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message });
  });

  it.each([
    ["SERVICE", "SVC-NO-EXISTE", "El servicio SVC-NO-EXISTE no existe."],
    ["ZONE_RESULT", "ZR-NO-EXISTE", "El resultado de zona ZR-NO-EXISTE no existe."],
    ["CONTAINER", "CNT-NO-EXISTE", "El contenedor CNT-NO-EXISTE no existe."],
    ["INSPECTION", "INS-NO-EXISTE", "La inspección INS-NO-EXISTE no existe."],
  ])("POST de evidencia para %s inexistente responde 404 y no guarda nada", async (ownerType, ownerId, message) => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await POST(upload(cookie, ownerType, ownerId, `missing-${ownerType}`));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message });
  });
});
