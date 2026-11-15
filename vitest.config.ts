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
    // Solo se activa con `--coverage` (CI: unit-shard y unit-coverage). Mide, no exige
    // umbrales (#923). Las exclusiones se repiten en `sonar.coverage.exclusions` de
    // sonar-project.properties: si cambia una, cambia la otra.
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test/**",
        // Handlers y fixtures de MSW: infraestructura de test y modo mock, no código de la app.
        "src/mocks/**",
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
    },
  },
});
