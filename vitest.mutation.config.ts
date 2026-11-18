import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

// Config de Vitest solo para Stryker (`pnpm mutation`). Corre los tests que ejercitan lo que se
// muta (src/lib y las rutas BFF); los tests de componentes no aportan a esos mutantes. Incluye
// src/mocks: sus handlers envuelven las rutas BFF reales (`@/app/api/**/route`) y sus tests son los
// que cubren varias de ellas (p. ej. address-search).
// Se excluye `security-audit.test.ts`: escanea el código fuente buscando `eval(` y `new Function(`,
// y Stryker antepone a cada archivo que instrumenta un encabezado con `new Function("return this")`,
// así que ese test falla en la corrida inicial de Stryker y aborta todos los shards. Sigue corriendo
// en `pnpm test` y en el CI normal; no ejercita el código mutado (lee archivos).
// El entorno es node: crear jsdom + el setup global por archivo costaba ~9 s y volvía la corrida
// de Stryker (que re-ejecuta archivos por mutante) inviable. Los tests que necesitan DOM
// (window, localStorage) lo declaran con `// @vitest-environment jsdom` en la primera línea.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/lib/**/*.test.{ts,tsx}", "src/app/api/**/*.test.{ts,tsx}", "src/mocks/**/*.test.{ts,tsx}"],
      exclude: [...configDefaults.exclude, "src/lib/security-audit.test.ts"],
    },
  }),
);
