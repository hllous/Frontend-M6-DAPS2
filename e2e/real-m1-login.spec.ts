import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { DEMO_IDENTITIES } from "../src/lib/demo-identities";

const PASSWORD = "m6-dev-796";

async function enterCredentials(page: import("@playwright/test").Page, email: string, password = PASSWORD) {
  const emailInput = page.getByRole("textbox", { name: "Correo electrónico" });
  const passwordInput = page.getByLabel("Contraseña");
  await emailInput.click();
  await emailInput.pressSequentially(email);
  await passwordInput.click();
  await passwordInput.pressSequentially(password);
  await page.getByRole("button", { name: "Ingresar al sistema" }).click();
}

async function expectNoSessionCookie(context: import("@playwright/test").BrowserContext) {
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "m6_session")).toBeUndefined();
}

test.describe("Ingreso real con M1", () => {
  test("explica el arranque en frío mientras M1 responde", async ({ page }) => {
    await page.route("**/api/session/login", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.goto("/login");
    const emailInput = page.getByRole("textbox", { name: "Correo electrónico" });
    await emailInput.click();
    await emailInput.pressSequentially("carlos.rodriguez@m6.local");
    const passwordInput = page.getByLabel("Contraseña");
    await passwordInput.click();
    await passwordInput.pressSequentially(PASSWORD);
    await page.getByRole("button", { name: "Ingresar al sistema" }).click();

    await expect(page.getByRole("status")).toHaveText("El servicio de ingreso está iniciando, puede tardar hasta un minuto y medio.");
    await expect(page).toHaveURL(/\/app$/, { timeout: 20_000 });
  });

  test("inicia sesión y vuelve a la pantalla solicitada", async ({ page }) => {
    await page.goto("/login?destination=work");
    await enterCredentials(page, "carlos.rodriguez@m6.local");

    await expect(page).toHaveURL(/\/app\?destination=work$/, { timeout: 20_000 });
    await expect(page.getByText(`Empleado M1 · ${DEMO_IDENTITIES["office-duty-queue"].sub}`)).toBeVisible();
  });

  test("muestra un error genérico para una contraseña incorrecta y conserva el correo", async ({ page, context }) => {
    await page.goto("/login");
    await enterCredentials(page, "carlos.rodriguez@m6.local", "clave incorrecta");

    await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toHaveValue("carlos.rodriguez@m6.local");
    await expect(page.getByLabel("Contraseña")).toHaveValue("");
    await expectNoSessionCookie(context);
  });

  test("rechaza una cuenta ciudadana antes de crear una sesión", async ({ page, context }) => {
    await page.goto("/login");
    await enterCredentials(page, "ciudadano@m6.local");

    await expect(page.getByText("Esta cuenta no tiene acceso a M6.")).toBeVisible();
    await expectNoSessionCookie(context);
  });

  test("explica que una cuenta inactiva debe contactar al soporte de M1", async ({ page, context }) => {
    await page.goto("/login");
    await enterCredentials(page, "inactivo@m6.local");

    await expect(page.getByText("La cuenta no puede iniciar sesión. Contacte al soporte de M1.")).toBeVisible();
    await expectNoSessionCookie(context);
  });

  test("lleva al empleado sin rol a la explicación accesible y permite cerrar sesión", async ({ page, context }) => {
    await page.goto("/login");
    await enterCredentials(page, "sin-rol@m6.local");

    await expect(page).toHaveURL(/\/no-role$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Sin rol asignado" })).toBeVisible();
    await expect(page.getByText("Empleado M1 · 900")).toBeVisible();
    const noRoleAxe = await new AxeBuilder({ page }).analyze();
    expect(noRoleAxe.violations).toEqual([]);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expectNoSessionCookie(context);
  });

  test("redirige a /no-role cuando una sesión sin permisos abre /app", async ({ page }) => {
    await page.goto("/login");
    await enterCredentials(page, "sin-rol@m6.local");

    await expect(page).toHaveURL(/\/no-role$/, { timeout: 20_000 });
    await page.goto("/app");
    await expect(page).toHaveURL(/\/no-role$/);
  });

  test("redirige a /app cuando una sesión con permisos abre /no-role", async ({ page }) => {
    await page.goto("/login");
    await enterCredentials(page, "carlos.rodriguez@m6.local");

    await expect(page).toHaveURL(/\/app$/, { timeout: 20_000 });
    await page.goto("/no-role");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("informa cuando M1 no está disponible", async ({ page }) => {
    await page.goto("/login");
    await enterCredentials(page, "m1-caido@m6.local");

    await expect(page.getByText("El servicio de ingreso no está disponible. Intente nuevamente en unos minutos.")).toBeVisible();
  });

  test("mantiene la pantalla de ingreso accesible", async ({ page }) => {
    await page.goto("/login");
    const loginAxe = await new AxeBuilder({ page }).analyze();

    expect(loginAxe.violations).toEqual([]);
  });
});
