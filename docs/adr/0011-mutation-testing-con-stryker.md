# Mutation testing con Stryker en el Frontend

- **Estado:** aceptada
- **Fecha:** 2026-11-16
- **Reemplaza a:** ninguno
- **Reemplazada por:** ninguno

## Contexto

Los criterios de testing de la cátedra (Clase 15) piden un mutation score de al menos 60 % sobre la lógica de negocio. El Backend ya lo mide con Stryker (`stryker.config.json` y `mutation.yml`). La cobertura de líneas del Frontend no dice si los tests verifican algo: este análisis cambia el código (operadores, condiciones, textos) y cuenta cuántos de esos cambios hacen fallar algún test. Ticket: [#966](https://github.com/hllous/Frontend-M6-DAPS2/issues/966).

## Decisión

- **Herramienta:** Stryker con el runner de Vitest y el checker de TypeScript (descarta los mutantes que no compilan). Análisis `perTest`: cada mutante corre solo los tests que lo cubren. `pnpm mutation` corre todo en una máquina; el CI lo reparte.
- **Alcance (`mutate`):** `src/lib/**/*.ts` y los handlers `src/app/api/**/route.ts`. Quedan fuera los tests, los `*-fixtures.ts` (datos del modo mock) y los `.d.ts`. Son unos 190 archivos y unos 17 000 mutantes.
- **Tests que corre:** `vitest.mutation.config.ts`, con solo `src/lib` y `src/app/api`, en entorno `node`. Los archivos que necesitan `window` o `localStorage` declaran `// @vitest-environment jsdom` en la primera línea. Crear jsdom con el setup global en cada archivo (~9 s) volvía inviable la corrida: Stryker vuelve a ejecutar archivos por cada mutante.
- **Umbral:** `thresholds.break: 60`, el mínimo de la cátedra. El valor medido está en la sección "Resultado".
- **CI (`.github/workflows/mutation.yml`):** manual (`workflow_dispatch`) y semanal (lunes 06:00 UTC), nunca por push ni PR: con un umbral que frena, dejaría `develop` en rojo sin un PR de por medio. 16 jobs (`mutation shard N/16`) mutan cada uno una parte de los archivos (`scripts/mutation-shard.mjs`; reparto por tamaño, y `src/lib/services.ts` partido en rangos de líneas). El job `mutation score` junta los reportes (`scripts/mutation-merge.mjs`), calcula el score global con la fórmula de Stryker y falla si queda por debajo de `break`. Cada shard sube su reporte HTML y JSON como artifact `mutation-report-N`; el resumen por archivo queda en `mutation-summary`.
- **Incremental:** `incremental: true`. Cada shard guarda `reports/mutation/incremental.json` con `actions/cache` (clave por shard y hash de la configuración, con restore por prefijo): las corridas siguientes solo vuelven a probar los mutantes de lo que cambió.

## Resultado

Se completa con la primera corrida del workflow (ver el PR de este ADR y el run enlazado ahí). Mediciones previas con 7 de 8 shards del primer reparto, sin los archivos de rutas dinámicas (`[id]`), que el primer reparto no mutaba por un error de glob ya corregido: 56,2 % (3885 de 6916 mutantes válidos). Los puntos débiles son los textos de error sin verificar, los enumerados de Zod sin un test por valor y las ramas del modo mock de las rutas BFF.

## Consecuencias

Más fácil: un número comparable con el del Backend y una lista de mutantes sobrevivientes que apunta a tests que no verifican nada. Más difícil: la corrida completa tarda más de una hora aun repartida, y consume 16 runners.

Pendiente: reforzar los tests de los archivos con más sobrevivientes (`indicators.ts`, `containers.ts`, `operational-zones.ts`, `referrals.ts`, las rutas `evidence`, `services`, `environmental-reports` y `session/login`).

## Alternativas consideradas

- Un solo job: se descartó porque ~17 000 mutantes no entran en las 6 horas de un job de GitHub Actions.
- Excluir los mutantes de texto (`StringLiteral`): se descartó porque mezcla textos de log con enumerados y capacidades que sí son reglas.
- Correr los tests completos (jsdom por archivo): se descartó por costo, ver arriba.
- Limitar el alcance a unos pocos archivos de lógica: se descartó para no elegir el alcance en función del número.
