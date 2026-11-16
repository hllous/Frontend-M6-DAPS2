// @vitest-environment node
import { ESLint } from "eslint";
import path from "node:path";
import { describe, expect, it } from "vitest";

// CA-HU01-3: el guard de shadcn del CI (regla no-restricted-syntax de eslint.config.mjs, que corre
// con `pnpm lint`) rechaza los componentes de UI escritos a mano fuera de src/components/ui.
const eslint = new ESLint({ cwd: path.resolve(__dirname, "../../..") });
const SCREEN = "src/components/pantalla-de-prueba.tsx";

async function messagesFor(code: string, filePath = SCREEN) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === "no-restricted-syntax").map((message) => message.message);
}

describe("guard de shadcn en el CI (CA-HU01-3)", () => {
  it.each([
    ["<button>", "export const A = () => <button type=\"button\">Guardar</button>;", /shadcn Button/],
    ["<input>", "export const A = () => <input aria-label=\"x\" />;", /shadcn Input/],
    ["<select>", "export const A = () => <select aria-label=\"x\" />;", /shadcn Select/],
    ["<textarea>", "export const A = () => <textarea aria-label=\"x\" />;", /shadcn Textarea/],
    ["<table>", "export const A = () => <table><tbody /></table>;", /shadcn Table/],
    ["<label>", "export const A = () => <label>x</label>;", /shadcn Label/],
  ])("rechaza un %s escrito a mano fuera del registro y nombra el componente de shadcn", async (_name, code, expected) => {
    const messages = await messagesFor(code);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.join("\n")).toMatch(expected);
  }, 60_000);

  it("acepta la misma pantalla armada con los componentes de src/components/ui", async () => {
    const code = 'import { Button } from "@/components/ui/button";\nexport const A = () => <Button type="button">Guardar</Button>;\n';
    expect(await messagesFor(code)).toEqual([]);
  }, 60_000);

  it("no aplica el guard dentro de src/components/ui, donde vive el registro", async () => {
    const code = 'export const A = () => <button type="button">Guardar</button>;\n';
    expect(await messagesFor(code, "src/components/ui/boton-de-prueba.tsx")).toEqual([]);
  }, 60_000);
});
