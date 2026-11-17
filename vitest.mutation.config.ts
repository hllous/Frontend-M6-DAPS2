import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

// Config de Vitest solo para Stryker (`pnpm mutation`). Corre los tests que ejercitan lo que se
// muta (src/lib y las rutas BFF); los tests de componentes no aportan a esos mutantes.
// El entorno es node: crear jsdom + el setup global por archivo costaba ~9 s y volvía la corrida
// de Stryker (que re-ejecuta archivos por mutante) inviable. Los tests que necesitan DOM
// (window, localStorage) lo declaran con `// @vitest-environment jsdom` en la primera línea.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/lib/**/*.test.{ts,tsx}", "src/app/api/**/*.test.{ts,tsx}"],
    },
  }),
);
