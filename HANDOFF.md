# Continuar el sistema visual de M6

## Objetivo

Continuar [Frontend #12 — Decide the visual system and DESIGN.md standard](https://github.com/hllous/Frontend-M6-DAPS2/issues/12), dentro del mapa [#6](https://github.com/hllous/Frontend-M6-DAPS2/issues/6), mediante una decisión visual validada por el usuario por vez.

## Inicio de la próxima sesión

1. Leer `AGENTS.md`.
2. Leer `PRODUCT.md` y `DESIGN.md`; son las fuentes de verdad del producto y de las decisiones aprobadas.
3. Leer `src/app/prototype/charts/README.md`.
4. Ejecutar `npm run prototype:charts` y abrir `http://localhost:3012/?chart=A`.
5. Pedir al usuario que elija la presentación de gráficos. La opción A está recomendada, pero todavía no fue aprobada.

Cuando el usuario elija, registrar el veredicto en `DESIGN.md` y en el README del prototipo. Después, preparar automáticamente una sola comparación para la siguiente decisión pendiente indicada en `DESIGN.md` y esperar su validación. Avanzar sin pedir permiso para preparar el próximo prototipo; nunca aprobar una opción en nombre del usuario.

El brief original del proceso se llama `design-brief-message.md` y está en la carpeta Downloads del usuario que inició el trabajo.

## Estado técnico

- Rama de trabajo: `feature/012-design-system-standard`.
- Los prototipos son HTML/CSS descartable; la producción debe respetar la configuración shadcn Base UI de `components.json`.
- La última validación comprobó sintaxis de todos los `server.mjs`, contraste de paletas y detector de Impeccable sin hallazgos.
- `node_modules` no estaba instalado; ejecutar ESLint solamente después de instalar las dependencias.
- `.claude/` es contenido local del usuario y queda fuera de los commits de este trabajo.

## Suggested skills

- `wayfinder`: continuar el flujo del issue y su mapa, si está disponible.
- `prototype`: construir comparaciones enfocadas y con variantes por URL.
- `impeccable`: mantener el estándar visual y revisar los hooks de diseño.
- `shadcn`: alinear las decisiones con la base de componentes de producción.
- `browser`: verificar las variantes en escritorio y móvil.
