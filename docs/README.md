# Documentación

Este índice indica dónde encontrar cada tipo de documentación y cuál es su fuente de verdad.

## Documentos principales

Los documentos centrales están en la raíz. En particular, el dominio sigue la convención de contexto único: `CONTEXT.md` en la raíz y las decisiones en `docs/adr/`.

- [README](../README.md): stack, ejecución local y estructura del repositorio.
- [PRODUCT](../PRODUCT.md): propósito, usuarios, principios y evidencia de producto.
- [CONTEXT](../CONTEXT.md): vocabulario y conceptos del dominio M6.
- [CONTRACTS](../CONTRACTS.md): contratos frontend/backend, hipótesis y criterios de aceptación.
- [DESIGN](../DESIGN.md): estándar visual y de interacción.
- [ROADMAP](../ROADMAP.md): fases, dependencias y preparación de entregas.

## `docs/`

- [adr/README.md](adr/README.md): índice de decisiones técnicas del proyecto.
- [agents/README.md](agents/README.md): índice de guías de trabajo del repositorio.
- [backend-context/](backend-context/README.md): espejo de contexto y API del backend. Es de solo lectura; ante una diferencia, corregir la fuente del backend y volver a copiarlo.
- [design/examples/](design/examples/README.md): ejemplos verificables del estándar de [DESIGN](../DESIGN.md).
- [operations/deploy.md](operations/deploy.md): estado y procedimiento de despliegue.

## Dónde agregar documentación

- Vocabulario del dominio: `CONTEXT.md`.
- Decisión técnica difícil de revertir: `docs/adr/`.
- Contratos y reglas de integración del frontend: `CONTRACTS.md`.
- Reglas visuales: `DESIGN.md`; ejemplos verificables, `docs/design/examples/`.
- Procedimientos de contribución y operación: `docs/agents/` y `docs/operations/`.
