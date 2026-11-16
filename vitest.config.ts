import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Tests de componente con jsdom + MSW + userEvent tardan varios segundos cuando la
    // máquina está cargada (Vitest abre un worker por archivo) y el límite por defecto de
    // 5 s los cortaba al azar (#946). El CI ya usaba 30 s; ahora es el mismo valor en todos
    // lados, para que `pnpm test` local y el CI den el mismo resultado.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      ".agents/**",
      ".agents*/**",
      ".claude/**",
      ".claude*/**",
      ".codex/**",
      ".codex*/**",
      ".orca/**",
    ],
    // Solo se activa con `--coverage` (CI: unit-shard y unit-coverage). Los umbrales (#975)
    // se exigen solo sobre el informe completo: cada shard corre con
    // `COVERAGE_THRESHOLDS=off` porque ve una parte del código y no puede cumplirlos; el
    // job `unit-coverage` los aplica al fusionar los blobs. Los valores son la cobertura
    // medida redondeada hacia abajo: se suben cuando sube la cobertura, nunca se bajan.
    // Las exclusiones se repiten en `sonar.coverage.exclusions` de
    // sonar-project.properties: si cambia una, cambia la otra.
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "next.config.mjs"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test/**",
        // Handlers y fixtures de MSW: infraestructura de test y modo mock, no código de la app.
        "src/mocks/**",
        // Datos de prueba del modo mock (también excluidos de Sonar).
        "src/lib/services-fixtures.ts",
        // Componentes de shadcn idénticos a los que genera el CLI (verificados uno a uno).
        "src/components/ui/card.tsx",
        "src/components/ui/chart.tsx",
        "src/components/ui/collapsible.tsx",
        "src/components/ui/context-menu.tsx",
        "src/components/ui/empty.tsx",
        "src/components/ui/field.tsx",
        "src/components/ui/input-group.tsx",
        "src/components/ui/label.tsx",
        "src/components/ui/separator.tsx",
        "src/components/ui/toggle-group.tsx",
      ],
      reporter: ["lcov", "text-summary"],
      reportsDirectory: "./coverage",
      thresholds: process.env.COVERAGE_THRESHOLDS === "off"
        ? undefined
        : { lines: 92, statements: 90, functions: 87, branches: 83 },
    },
  },
});
