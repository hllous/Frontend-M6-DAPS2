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
- **Tests que corre:** `vitest.mutation.config.ts`, con `src/lib`, `src/app/api` y `src/mocks` (sus handlers envuelven las rutas BFF reales, así que sus tests son los que cubren varias de ellas; `src/mocks` no se muta), en entorno `node`. Los archivos que necesitan `window` o `localStorage` declaran `// @vitest-environment jsdom` en la primera línea. Crear jsdom con el setup global en cada archivo (~9 s) volvía inviable la corrida: Stryker vuelve a ejecutar archivos por cada mutante.
- **Umbral:** `thresholds.break: 65` desde [#988](https://github.com/hllous/Frontend-M6-DAPS2/issues/988) (antes 60, el mínimo de la cátedra), para que el score alcanzado no vuelva a bajar sin que el workflow falle. El valor medido está en la sección "Resultado".
- **CI (`.github/workflows/mutation.yml`):** manual (`workflow_dispatch`) y semanal (lunes 06:00 UTC), nunca por push ni PR: con un umbral que frena, dejaría `develop` en rojo sin un PR de por medio. 24 jobs (`mutation shard N/24`) mutan cada uno una parte de los archivos (`scripts/mutation-shard.mjs`; reparto por tamaño, y los archivos grandes partidos en rangos de líneas). El job `mutation score` junta los reportes (`scripts/mutation-merge.mjs`), cuenta cada mutante una sola vez (archivo, posición, mutador y reemplazo) aunque venga en más de un shard, calcula el score global con la fórmula de Stryker y falla si queda por debajo de `break`. Cada shard sube su reporte HTML y JSON como artifact `mutation-report-N`; el resumen por archivo queda en `mutation-summary`.
- **Incremental:** `incremental: true`. Cada shard guarda `reports/mutation/incremental.json` con `actions/cache` (clave por shard y hash de la configuración, con restore por prefijo): las corridas siguientes solo vuelven a probar los mutantes de lo que cambió.

## Resultado

Primera medición completa y confiable ([#988](https://github.com/hllous/Frontend-M6-DAPS2/issues/988), run [44189163682](https://github.com/hllous/Frontend-M6-DAPS2/actions/runs/44189163682)): **62,46 %** (5303 de 8490 mutantes válidos). El 56,2 % previo venía de corridas parciales, y el merge de shards contaba dos veces los archivos que llegaban enteros en más de un shard.

Con los tests de #988, run [44215371447](https://github.com/hllous/Frontend-M6-DAPS2/actions/runs/44215371447): **66,51 %** (5647 de 8490). Lo que queda sin detectar son sobre todo textos de pantalla (cuyos tests serían espejos del texto) y ramas de las rutas BFF (`crews`, `services`, `evidence`, `session/login`).

## Consecuencias

Más fácil: un número comparable con el del Backend y una lista de mutantes sobrevivientes que apunta a tests que no verifican nada. Más difícil: la corrida completa tarda más de una hora aun repartida, y consume 24 runners.

Pendiente: reforzar los tests de las rutas BFF con más sobrevivientes (`crews`, `services`, `evidence`, `session/login`) y de `containers.ts`.

## Alternativas consideradas

- Un solo job: se descartó porque ~17 000 mutantes no entran en las 6 horas de un job de GitHub Actions.
- Excluir los mutantes de texto (`StringLiteral`): se descartó porque mezcla textos de log con enumerados y capacidades que sí son reglas.
- Correr los tests completos (jsdom por archivo): se descartó por costo, ver arriba.
- Limitar el alcance a unos pocos archivos de lógica: se descartó para no elegir el alcance en función del número.
