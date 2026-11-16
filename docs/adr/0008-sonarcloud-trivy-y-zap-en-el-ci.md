# SonarCloud, Trivy y ZAP en el CI del Frontend

- **Estado:** aceptada
- **Fecha:** 2026-11-16
- **Reemplaza a:** ninguno
- **Reemplazada por:** ninguno

## Contexto

Los criterios de testing de la cátedra (Clase 15) evalúan el módulo M6 entero, Frontend y Backend. Hasta la entrega 4 el Frontend no medía cobertura y no tenía análisis estático, de dependencias ni dinámico. La defensa de XSS del Backend ("la API devuelve JSON; el escape lo hace el cliente") necesita evidencia sobre este repositorio.

Las decisiones compartidas (criterios, protocolo de hallazgos, Opción C) están en la spec del Backend, [Backend #656](https://github.com/hllous/Backend-M6-DAPS2/issues/656). La spec del Frontend es [#922](https://github.com/hllous/Frontend-M6-DAPS2/issues/922). El CI en verde sobre el tag es eliminatorio (G3), así que ninguna herramienta nueva puede tumbarlo sin aviso.

## Decisión

Tres herramientas, cada una con su workflow o job, y sin tocar la branch protection de los jobs existentes.

**SonarCloud, con cobertura combinada de los 4 shards.**

- Cada shard de Vitest genera cobertura v8 y un reporte `blob`. El job `unit-coverage` los combina con `vitest --merge-reports --coverage` y publica `lcov`. Se mide, no hay umbral que frene el CI.
- El job `sonar` corre después de `unit-coverage` con la action oficial y se saltea sin `SONAR_TOKEN` (PRs de forks). Se usa el análisis desde el CI y no el automático de SonarCloud, que no importa la cobertura y no respeta las exclusiones.
- **Exclusiones** (en `sonar-project.properties`, alineadas con `coverage.exclude` de `vitest.config.ts` para que el número de Sonar coincida con el del informe de QA):
  - Componentes de shadcn **idénticos a lo que genera el CLI** (`shadcn add <nombre> --dry-run --view` contra el registro base-nova), de cobertura y duplicación. No son código escrito por el equipo e inflarían las métricas. Los que el equipo modificó **no** se excluyen: se analizan.
  - Specs (`*.test.*`, `src/test`, `e2e/`) y mocks de MSW (`src/mocks`): no son código de producción. Con el alcance de análisis nuevo de SonarCloud `sonar.tests` no tiene efecto, así que se acota con `sonar.exclusions`; lo que se pierde es buscar bugs en los tests.
  - `src/lib/services-fixtures.ts`: datos de prueba del modo mock, no código de producción (aprobado por el líder).
- **Opción C para el gate:** arranca no bloqueante (`sonar.qualitygate.wait=false`, job fuera de la branch protection) y pasa a bloqueante y requerido en los PRs a `develop` cuando esté verde. Un gate rojo sobre el tag tumbaría G3; la fase no bloqueante cubre solo la transición. El paso a bloqueante es el ticket [#926](https://github.com/hllous/Frontend-M6-DAPS2/issues/926).

**Trivy** (`.github/workflows/trivy.yml`): cuatro pasadas, `deps` (SBOM SPDX generado con `pnpm sbom --prod` desde el lockfile), `fs` (secretos), `image` (imagen del `Dockerfile`) y `config`. El SBOM reemplaza a `trivy fs` sobre el lockfile porque Trivy 0.70 lee solo 15 paquetes del formato de pnpm 12 y dejaba pasar CVE conocidas. Cada pasada sube SARIF a Code Scanning con HIGH/CRITICAL, incluidas las sin fix, y falla con las que sí tienen fix. Las sin fix se documentan con justificación y mitigación en `.trivyignore`. No frena el merge: el deploy lo hace Vercel por su integración, así que el gate se ve como check rojo en el PR y en `main`.

**OWASP ZAP** (`.github/workflows/dast.yml`, detalle y resultados en [`docs/security/zap.md`](../security/zap.md)): corre a demanda y cada lunes, sin engancharse al deploy.

- **Baseline pasivo contra Vercel**, para probar con evidencia los headers que ve el usuario real.
- **Escaneo activo contra la app construida en el CI** (`next build` + `next start`, con el M1 falso y el Backend MSW). Nunca contra Vercel: escribiría datos y afectaría al entorno real.
- Sin reglas ignoradas de antemano; cada Medium lleva su justificación escrita. La corrida final se archiva en `docs/security/` porque los artifacts vencen.
- **Limitación declarada: no hay escaneo activo autenticado del Frontend.** El login pasa por M1 real. La superficie de datos autenticada la cubre el ZAP autenticado del Backend ([Backend #659](https://github.com/hllous/Backend-M6-DAPS2/issues/659)).

## Consecuencias

Datos sobre `main` (Frontend `06bab02`, 16/11/2026):

- **SonarCloud:** cobertura 85,4 %, duplicación 1,9 %, 0 bugs, 0 vulnerabilidades, ratings A/A/A, Quality Gate aprobado.
- **Trivy:** 0 HIGH/CRITICAL en dependencias, imagen y configuración. Antes, 10 HIGH del npm embebido en la imagen base y el contenedor como root; se corrigió con un `Dockerfile` sin npm y con `USER node`.
- **ZAP** (run [43788949297](https://github.com/hllous/Frontend-M6-DAPS2/actions/runs/43788949297)): baseline contra Vercel, 0 High y 3 Medium; activo, 0 High y 2 Medium.

Más fácil: cada PR muestra calidad, cobertura y vulnerabilidades, y el equipo puede demostrar los números ante la cátedra. Más difícil: el CI suma jobs y un secreto (`SONAR_TOKEN`) que carga el líder; las exclusiones de shadcn hay que revisarlas cuando se agrega o se modifica un componente generado.

Pendiente:

- Pasar el gate de Sonar a bloqueante y requerido ([#926](https://github.com/hllous/Frontend-M6-DAPS2/issues/926)) y marcar a mano los hotspots y falsos positivos (un "cumple" lo dictamina una persona, no el agente).
- Los headers CSP, `X-Content-Type-Options` y `X-Frame-Options` que ZAP marca como Medium se agregan en la configuración de Next.js; su disposición queda en `docs/security/zap.md`.
- Umbral de cobertura que frene el CI y escaneo activo autenticado: fuera de la entrega 4.

## Alternativas consideradas

- Análisis automático de SonarCloud: se descartó porque no importa la cobertura (daría 0 %), no respeta las exclusiones y no puede ser un check del pipeline.
- Umbral de cobertura bloqueante desde el inicio: se descartó para no romper G3 a días de la entrega con una cobertura real aún baja.
- Gate de Sonar bloqueante desde el primer análisis: se descartó por la misma razón; se eligió la Opción C.
- Excluir toda la carpeta `src/components/ui/`: se descartó porque incluye componentes que el equipo modificó, y eso maquillaría las métricas (G9).
- `trivy fs` sobre `pnpm-lock.yaml`: se descartó porque no detecta CVE conocidas (ver arriba).
- ZAP activo contra Vercel o autenticado contra M1 real: se descartó por el riesgo sobre datos y servicios reales; queda como limitación declarada.
