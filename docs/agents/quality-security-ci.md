# Calidad y seguridad en el CI

Guía de los análisis de calidad y seguridad del Frontend: qué corre, cómo leer cada resultado y dónde mirar el Backend. La decisión y su justificación están en [ADR-0008](../adr/0008-sonarcloud-trivy-y-zap-en-el-ci.md); los resultados de ZAP, en [`docs/security/zap.md`](../security/zap.md).

## Qué corre y cuándo

| Workflow o job | Archivo | Cuándo | Qué hace |
| --- | --- | --- | --- |
| `unit` (4 shards) | `ci.yml` | PR y push a `develop`, `test`, `main` | Vitest con cobertura v8 y `COVERAGE_THRESHOLDS=off` (cada shard ve solo una parte); sube un reporte `blob` (`vitest-blob-N`) |
| `unit-coverage` | `ci.yml` | Después de los shards | Combina los blobs con `vitest --merge-reports --coverage`, **exige los umbrales de cobertura** y sube `coverage-lcov` (`coverage/lcov.info`). En pushes a `develop` y `test` se saltea |
| `sonar` | `ci.yml` | Después de `unit-coverage` | Análisis de SonarCloud con esa cobertura. Espera el Quality Gate (`sonar.qualitygate.wait=true`) y falla si da rojo. Se saltea sin `SONAR_TOKEN` (forks) |
| `trivy` | `trivy.yml` | PR y push a `develop`, `test`, `main` | Dependencias (SBOM del lockfile), secretos, imagen del `Dockerfile` y configuración |
| `mutation shard N/16` y `mutation score` | `mutation.yml` | A demanda y cada lunes 06:00 UTC | Stryker sobre `src/lib` y las rutas BFF, repartido en 16 jobs; `mutation score` junta los reportes y falla bajo el umbral (`break` en `stryker.config.json`) |
| `zap baseline (Vercel)` y `zap active (build del CI)` | `dast.yml` | A demanda y cada lunes 06:00 UTC | ZAP pasivo contra Vercel y activo contra la app construida en el CI |

La cobertura tiene umbrales (#975) en `coverage.thresholds` de `vitest.config.ts`: líneas 92 %, sentencias 90 %, funciones 87 % y ramas 83 %, que son lo medido redondeado hacia abajo. Se aplican solo en `unit-coverage`, sobre el informe fusionado; los shards los desactivan con `COVERAGE_THRESHOLDS=off`. `unit-coverage` está en `needs` del job agregador `test` (el check requerido), así que una cobertura bajo el umbral frena el merge; el agregador acepta que esté salteado solo en pushes a `develop` y `test`. Los umbrales solo suben: si un cambio los incumple, se agregan tests, no se bajan. Corrida local con los mismos umbrales: `pnpm exec vitest run --coverage`. El job `sonar` falla si el Quality Gate de SonarCloud da rojo; para que frene el merge, el check `sonar` tiene que figurar como requerido en la protección de `develop` (lo configura el líder; ver el ADR).

## Cómo leer los resultados

- **Cobertura combinada:** en el run de `ci.yml`, el artifact `coverage-lcov`. Si el total no coincide con una corrida local sin shards (`pnpm exec vitest run --coverage`), falta un blob.
- **SonarCloud:** [dashboard del Frontend](https://sonarcloud.io/summary/overall?id=hllous_Frontend-M6-DAPS2). Los PRs se analizan solo si el plan lo permite; la rama principal siempre. Para subir a mano un análisis, `workflow_dispatch` de `ci.yml` con `sonar_branch_name`.
- **Exclusiones de Sonar:** viven en `sonar-project.properties`. La lista de componentes de shadcn repite `coverage.exclude` de `vitest.config.ts`: si cambiás una, cambiá la otra. Un componente de shadcn que modifiques a mano sale de la lista para que se analice.
- **Trivy:** un check rojo en el PR o en `main` significa HIGH/CRITICAL con fix disponible; la tabla está en el log del job. Todo (incluidas las sin fix) está en Code Scanning, categorías `trivy-deps`, `trivy-fs`, `trivy-image` y `trivy-config`. Una sin fix se documenta con justificación y mitigación en `.trivyignore`; las que tienen fix se corrigen, no se ignoran. No frena el merge: Vercel despliega por su integración.
- **Mutation testing:** reportes HTML y JSON por shard en los artifacts `mutation-report-N` y el resumen por archivo en `mutation-summary`; los mutantes que sobreviven se leen en el HTML. `pnpm mutation` corre todo en local (tarda horas); `pnpm mutation:shard <i> <n>` corre una parte. Decisión y alcance en [ADR-0011](../adr/0011-mutation-testing-con-stryker.md).
- **ZAP:** reportes HTML y JSON como artifacts del run (vencen). La corrida final está archivada en `docs/security/`. Cada Medium lleva su justificación en `docs/security/zap.md`.

## Qué hacer ante un hallazgo

Se sigue el protocolo de [Backend #656](https://github.com/hllous/Backend-M6-DAPS2/issues/656): triaje, severidad propuesta por el agente y decidida por el líder y QA, un PR `fix/` aparte y nada se esconde. Un falso positivo de Sonar o un hotspot lo marca una persona, con justificación; un agente no lo marca.

## Calidad del Backend

El Backend tiene sus propios análisis (SonarCloud, Trivy y ZAP baseline y activo autenticado). Se miran allá, no se espejan:

- [SonarCloud del Backend](https://sonarcloud.io/summary/overall?id=hllous_Backend-M6-DAPS2)
- [Workflows de Actions del Backend](https://github.com/hllous/Backend-M6-DAPS2/actions)
- [`docs/` del Backend](https://github.com/hllous/Backend-M6-DAPS2/tree/develop/docs), con el ADR y los informes de QA

El ZAP activo autenticado que falta en el Frontend (el login pasa por M1 real) lo cubre el del Backend.
