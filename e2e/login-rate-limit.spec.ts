import { expect, test } from "@playwright/test";

import { SESSION_MUTATION_HEADERS } from "../src/lib/session-request";

// Eje D (fuerza bruta): corre contra el frontend real-m1 con el M1 falso (proyecto "real-m1").
// Cada test usa correos propios para no consumir el contador de las cuentas de otros tests.

const MAX_FAILURES = 5;

test.describe("Límite de intentos de ingreso fallidos", () => {
  test("responde 429 con Retry-After tras 5 fallos y no filtra si la cuenta existe", async ({ request }) => {
    const tag = Date.now();
    const accounts = { existe: "diego.sosa@m6.local", inexistente: `nadie-${tag}@m6.local` };
    const statuses: Record<string, number[]> = { existe: [], inexistente: [] };
    let blocked: Awaited<ReturnType<typeof request.post>> | undefined;

    for (const [kind, email] of Object.entries(accounts)) {
      for (let attempt = 0; attempt <= MAX_FAILURES; attempt += 1) {
        const response = await request.post("/api/session/login", {
          data: { email, password: `incorrecta-${attempt}` },
          headers: SESSION_MUTATION_HEADERS,
        });
        statuses[kind].push(response.status());
        if (response.status() === 429 && kind === "inexistente") blocked = response;
      }
    }

    expect(statuses.inexistente).toEqual([401, 401, 401, 401, 401, 429]);
    // La cuenta real no se usa en otros tests; si el servidor ya la bloqueó en una corrida previa (reuseExistingServer), solo se exige el mismo comportamiento.
    expect(statuses.existe.every((status) => status === 401 || status === 429)).toBe(true);
    expect(statuses.existe.at(-1)).toBe(429);
    expect(Number(blocked?.headers()["retry-after"])).toBeGreaterThan(0);
    expect(blocked?.headers()["cache-control"]).toBe("no-store");
    expect(((await blocked?.json()) as { message: string }).message).toMatch(/Demasiados intentos/);
    expect(blocked?.headers()["set-cookie"]).toBeUndefined();
  });

  test("la pantalla de ingreso muestra el aviso en español cuando llega el 429", async ({ page }) => {
    const email = `fuerza-bruta-${Date.now()}@m6.local`;
    for (let attempt = 0; attempt < MAX_FAILURES; attempt += 1) {
      await page.request.post("/api/session/login", { data: { email, password: "incorrecta" }, headers: SESSION_MUTATION_HEADERS });
    }

    await page.goto("/login");
    const emailInput = page.getByRole("textbox", { name: "Correo electrónico" });
    await emailInput.click();
    await emailInput.pressSequentially(email);
    const passwordInput = page.getByLabel("Contraseña", { exact: true });
    await passwordInput.click();
    await passwordInput.pressSequentially("incorrecta");
    await page.getByRole("button", { name: "Ingresar al sistema" }).click();

    await expect(page.getByText("Demasiados intentos de ingreso fallidos")).toBeVisible();
  });
});
