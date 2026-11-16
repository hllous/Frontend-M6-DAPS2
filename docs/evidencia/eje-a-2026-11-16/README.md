# Evidencia Eje A: responsive, accesibilidad y criterios solo-FE (16/11/2026)

Issue [#970](https://github.com/hllous/Frontend-M6-DAPS2/issues/970). Relacionados: #848 (UI móvil) y #147 (WCAG).

## Cómo se midió

- App en modo mock (`M6_AUTH_MODE=mock`, `pnpm dev`) sobre el código de la rama. Es un servidor de desarrollo: sirve para accesibilidad y buenas prácticas, no para medir rendimiento.
- **axe**: `@axe-core/playwright` con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`, en `e2e/accessibility.spec.ts`. Cada pantalla se abre a 360, 768 y 1280 px y el test falla ante cualquier violación (critical o serious, y también las menores).
- **Scroll horizontal**: `e2e/responsive-and-keyboard.spec.ts` comprueba que `scrollWidth` no supera `clientWidth` en las mismas pantallas y anchos.
- Las pantallas y anchos salen de una sola lista: `e2e/support/screens.ts` (21 pantallas: ingreso, inicio de cada rol, catálogos, contenedores, servicios, expedientes, mapa, tableros y las cuatro del portal público).
- **Lighthouse**: `chrome-devtools lighthouse_audit` (Edge), modo navegación, escritorio y móvil, según [`browser-diagnostics.md`](../../agents/browser-diagnostics.md). Esta herramienta no entrega la categoría de rendimiento, así que no hay puntaje de performance.

## Resultado axe y scroll horizontal

63 combinaciones pantalla x ancho (21 x 3) en cada suite: 0 violaciones de axe y 0 pantallas con scroll horizontal.

| Pantalla | 360 | 768 | 1280 |
|---|---|---|---|
| Todas las de `screens.ts` | 0 violaciones, sin scroll | 0 violaciones, sin scroll | 0 violaciones, sin scroll |

Violaciones halladas y corregidas antes de llegar a este resultado:

| Dónde | Regla (impacto) | Corrección |
|---|---|---|
| Mapa, pestañas de vista | `aria-valid-attr-value` (critical): el panel pisaba su `id` y `aria-controls` apuntaba a otro | Se quitó el `id` manual del panel en `mapa-operativo.tsx` |
| Mapa, pestañas inactivas (y toda `TabsTrigger`) | `color-contrast` (serious): 4,15:1 con `text-foreground/60` | `text-muted-foreground` en `src/components/ui/tabs.tsx` (token del tema) |
| Tableros, tablas solo para lector de pantalla | `scrollable-region-focusable` (serious) | `container={false}` en la tabla de `attention-signals.tsx` |

## Puntajes Lighthouse

Entre paréntesis, el puntaje en móvil cuando difiere.

| Pantalla | Accesibilidad (esc. / móvil) | Buenas prácticas (esc. / móvil) | SEO (esc. / móvil) |
|---|---|---|---|
| Ingreso `/login` | 100 / 100 | 100 / 100 | 100 / 100 |
| Inicio de Oficina `/app` | 100 / 100 | 100 / 100 | 100 / 100 |
| Contenedores `/app/catalog/containers` | 100 / 100 | 100 / 100 | 100 / 100 |
| Servicios `/app?destination=services` | 100 / 100 | 100 / 96 | 100 / 100 |
| Expedientes `/app?destination=environment` | 100 / 100 | 100 / 100 | 100 / 100 |
| Mapa `/app?destination=map` | 100 / 100 | 100 / 96 | 100 / 100 |
| Portal público `/consulta` | 100 / 100 | 100 / 100 | 100 / 100 |

El 96 de buenas prácticas en móvil es la auditoría `image-size-responsive`: las teselas de OpenStreetMap del mapa se piden a una resolución menor que la de pantalla. No es una violación de accesibilidad.

Los reportes completos están en [`lighthouse/`](lighthouse/) (HTML, uno por pantalla y dispositivo).

## Capturas

[`capturas/`](capturas/): 12 pantallas a 360, 768 y 1280 px (`<pantalla>-<ancho>.png`). Se ve el indicador de desarrollo de Next en la esquina inferior izquierda; no existe en producción.

## Criterios solo-FE de la matriz de QA

Los tests están en `e2e/qa-criterios-fe.spec.ts`, `src/components/ui/shadcn-guard.test.ts` y `src/app/api/session/login/route.test.ts`; el detalle por criterio va en la descripción del PR.
