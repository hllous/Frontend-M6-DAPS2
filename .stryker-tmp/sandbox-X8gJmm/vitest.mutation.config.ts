import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

// Config de Vitest solo para Stryker (`pnpm mutation`). Corre los tests que ejercitan lo que se
// muta (src/lib y las rutas BFF); los tests de componentes (jsdom + React) no aportan a esos
// mutantes y llevarían la corrida inicial de Stryker a varios minutos por mutante.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      isolate: false,
      include: ["src/lib/**/*.test.{ts,tsx}", "src/app/api/**/*.test.{ts,tsx}"],
    },
  }),
);
