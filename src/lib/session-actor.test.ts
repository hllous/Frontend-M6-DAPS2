import { describe, expect, it } from "vitest";
import { createTestSession } from "@/test/session";
import { createSession } from "./session";
import { sessionActor } from "./session-actor";

describe("nombre de la persona de la sesión", () => {
  it("usa el nombre del perfil mock sin rol", async () => {
    expect((await sessionActor(createSession("employee-no-role", { mode: "mock" }))).displayName).toBe("Empleado sin rol");
  });

  it("usa el legajo cuando el adaptador no encuentra la persona", async () => {
    expect((await sessionActor(createTestSession("office-duty-queue"))).displayName).toBe("Legajo 10000");
  });

  it("usa el nombre que devuelve el adaptador", async () => {
    const session = createTestSession("office-duty-queue");
    expect((await sessionActor({ ...session, identity: { ...session.identity!, userId: "user-maria" } })).displayName).toBe("María Fernández");
  });
});
