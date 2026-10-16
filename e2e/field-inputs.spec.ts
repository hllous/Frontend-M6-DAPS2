import { expect, test, type Page } from "@playwright/test";
import { createElement, Fragment, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../src/components/ui/field";
import { Input } from "../src/components/ui/input";
import { Label } from "../src/components/ui/label";
import { Textarea } from "../src/components/ui/textarea";

// Playwright compiles the JSX inside the imported components with its own
// runtime, which yields plain descriptors instead of React elements. PW walks
// those descriptors (calling function components) so react-dom can render the
// real components to static markup.
type Descriptor = { __pw_type: string; type: unknown; props: Record<string, unknown> };

function isDescriptor(node: unknown): node is Descriptor {
  return Boolean(node) && typeof node === "object" && "__pw_type" in (node as object);
}

function PW({ node }: { node: unknown }): ReactElement | null {
  if (Array.isArray(node)) return createElement(Fragment, null, ...node.map((child, index) => createElement(PW, { node: child, key: index })));
  if (!isDescriptor(node)) return (node ?? null) as ReactElement | null;

  const { type, props } = node;
  if (typeof type === "function" && !(type as { $$typeof?: symbol }).$$typeof) {
    return createElement(PW, { node: (type as (p: unknown) => unknown)(props) });
  }
  const { children, ...rest } = props;
  const empty = children === undefined || (Array.isArray(children) && children.length === 0);
  return empty ? createElement(type as string, rest) : createElement(type as string, rest, createElement(PW, { node: children }));
}

function h(type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Descriptor {
  return { __pw_type: "jsx", type, props: { ...props, children } };
}

const markup = renderToStaticMarkup(
  createElement(PW, {
    node: h(
      "main",
      { id: "field-inputs-fixture", style: { padding: 24, maxWidth: 480, background: "var(--color-canvas)" } },
      h(
        FieldGroup,
        null,
        h(
          Field,
          null,
          h(FieldLabel, { htmlFor: "fx-name" }, "Nombre"),
          h(Input, { id: "fx-name", "aria-describedby": "fx-name-help" }),
          h(FieldDescription, { id: "fx-name-help" }, "Como figura en el padrón"),
        ),
        h(
          Field,
          { "data-invalid": true },
          h(FieldLabel, { htmlFor: "fx-email" }, "Correo"),
          h(Input, { id: "fx-email", "aria-invalid": true }),
          h(FieldError, null, "El correo es obligatorio"),
        ),
        h(Field, null, h(FieldLabel, { htmlFor: "fx-notes" }, "Notas"), h(Textarea, { id: "fx-notes" })),
        h(Label, { htmlFor: "fx-solo" }, "Etiqueta suelta"),
        h(Input, { id: "fx-solo" }),
      ),
    ),
  }),
);

async function mount(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.evaluate((html) => {
    document.body.innerHTML = html;
  }, markup);
}

const evidenceDir = process.env.EVIDENCE_DIR;

test.describe("shadcn Field, Label, Input and Textarea", () => {
  for (const { name, width, height, input } of [
    { name: "desktop", width: 1440, height: 900, input: 40 },
    { name: "mobile", width: 390, height: 844, input: 48 },
  ]) {
    test(`sizes and tokens at ${name} width`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await mount(page);

      const box = async (id: string) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().height);
      expect(await box("fx-name")).toBe(input);
      expect(await box("fx-email")).toBe(input);
      expect(await box("fx-solo")).toBe(input);
      expect(await box("fx-notes")).toBeGreaterThanOrEqual(96);

      const fontSize = await page.locator("#fx-name").evaluate((el) => getComputedStyle(el).fontSize);
      expect(fontSize).toBe(width <= 760 ? "16px" : "14px");

      const border = await page.locator("#fx-name").evaluate((el) => getComputedStyle(el).borderTopColor);
      expect(border).toBe("rgb(112, 132, 154)");
      const invalidBorder = await page.locator("#fx-email").evaluate((el) => getComputedStyle(el).borderTopColor);
      expect(invalidBorder).toBe("rgb(159, 47, 39)");

      if (evidenceDir) {
        await page.screenshot({ path: `${evidenceDir}/field-inputs-${width}x${height}.png` });
      }
    });
  }

  test("keyboard moves through the controls and shows the focus ring", async ({ page }) => {
    await mount(page);

    await page.keyboard.press("Tab");
    await expect(page.locator("#fx-name")).toBeFocused();
    await page.keyboard.type("Ana");
    await expect(page.locator("#fx-name")).toHaveValue("Ana");
    const outline = await page.locator("#fx-name").evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.outlineStyle, style.outlineWidth, style.outlineOffset, style.outlineColor];
    });
    expect(outline).toEqual(["solid", "3px", "2px", "rgb(35, 119, 189)"]);

    await page.keyboard.press("Tab");
    await expect(page.locator("#fx-email")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#fx-notes")).toBeFocused();
    await page.keyboard.type("a");
    await page.keyboard.press("Enter");
    await page.keyboard.type("b");
    await expect(page.locator("#fx-notes")).toHaveValue("a\nb");
  });

  test("labels are associated and the error is announced", async ({ page }) => {
    await mount(page);

    await expect(page.getByRole("textbox", { name: "Nombre" })).toHaveAccessibleDescription("Como figura en el padrón");
    await expect(page.getByRole("textbox", { name: "Notas" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Etiqueta suelta" })).toBeVisible();
    await page.getByText("Nombre", { exact: true }).click();
    await expect(page.locator("#fx-name")).toBeFocused();

    await expect(page.getByRole("alert")).toHaveText("El correo es obligatorio");
    await expect(page.getByRole("textbox", { name: "Correo" })).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('[data-slot="field"][data-invalid="true"]')).toHaveCount(1);
  });
});
