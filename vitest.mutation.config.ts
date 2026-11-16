import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

// Config de Vitest solo para Stryker (`pnpm mutation`). Corre los tests que ejercitan lo que se
// muta (src/lib y las rutas BFF); los tests de componentes (jsdom + React) no aportan a esos
// mutantes y llevarÃ­an la corrida inicial de Stryker a varios minutos por mutante.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // Sin aislamiento por archivo: crear jsdom en cada uno de los ~150 archivos volvía la
      // corrida inicial de Stryker más lenta que el timeout.
      isolate: false,
      include: ["src/lib/**/*.test.{ts,tsx}", "src/app/api/**/*.test.{ts,tsx}"],
      // Depende del aislamiento de módulos de Vitest (vi.mock de next/headers): con
      // isolate:false falla. Su fuente (m1-refresh.ts) queda fuera de `mutate`.
      exclude: [...configDefaults.exclude, "src/lib/m1-refresh.test.ts"],
    },
  }),
);
