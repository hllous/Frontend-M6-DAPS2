# Concurrencia optimista con ETag y timeout de 5 s en el BFF

- **Estado:** aceptada
- **Fecha:** 2026-11-16
- **Reemplaza a:** ninguno
- **Reemplazada por:** ninguno

## Contexto

Dos defectos del Eje C de testing (integración y resiliencia):

- **DEF-32** ([#973](https://github.com/hllous/Frontend-M6-DAPS2/issues/973)). El Backend implementa concurrencia optimista ([ADR-012 del Backend](https://github.com/hllous/Backend-M6-DAPS2/blob/develop/docs/decisiones/adr-012-concurrencia-optimista-etag.md), resumido en [`endpoints.md`](../backend-context/api/endpoints.md)): `ETag` débil `W/"<ms de updatedAt>"` en `GET /:id` de contenedores, servicios, intervenciones de arbolado y expedientes ambientales, e `If-Match` opcional con 412 en sus transiciones y en `PATCH /containers/:id` y `PATCH /services/:id`. El Frontend no lo usaba: dos personas que accionaban sobre el mismo registro se pisaban sin enterarse.
- **DEF-33** ([#974](https://github.com/hllous/Frontend-M6-DAPS2/issues/974)). El BFF esperaba al Backend hasta 15 s. El criterio pide un timeout efectivo de 5 s, con un fallback definido y comunicado y sin pedidos colgados.

## Decisión

**Concurrencia optimista.**

- El BFF es transparente: `fetchBackend` reenvía el `If-Match` del navegador en las escrituras (nunca en un `GET`, para que la lectura de alcance de una ruta no falle por versión; solo `*` o una lista de entity-tags de hasta 512 caracteres) y `forwardResponse` devuelve el `ETag`. Un 412 se reescribe a Problem Details con `code: "STALE_RECORD"` y el texto "Otra persona modificó este registro. Recargue para ver los cambios." (registro formal de `DESIGN.md`).
- El navegador guarda, por registro, la última versión que leyó (`src/lib/record-versions.ts`, enganchado en `authenticatedFetch`) y la manda como `If-Match` en las escrituras que el Backend versiona. La versión sale del `ETag` del detalle o de la escritura; si la respuesta no lo trae, como en los listados, se deriva de `updatedAt` con la misma fórmula del Backend. Sin `updatedAt` la escritura sale sin `If-Match`, como antes.
- Ante un 412 la interfaz muestra un aviso persistente (Sonner, el toast de shadcn) con la acción "Recargar". No recarga sola ni reintenta con otra versión: el formulario o el diálogo queda abierto con lo que la persona escribió.
- El modo mock emula la misma semántica (`src/lib/bff-mock-versions.ts`): ETag desde `updatedAt`, 412 sin ejecutar la escritura y `updatedAt` que avanza en cada escritura exitosa.

**Timeout.**

- `BACKEND_TIMEOUT_MS = 5_000` para las rutas autenticadas y las públicas. No hay patrón de variables de entorno para timeouts, así que es una constante. La subida de evidencia mantiene su plazo propio de 60 s, porque transfiere el archivo.
- El plazo usa un `AbortController` propio: al vencer, el `fetch` se aborta de verdad y el pedido termina en el 503 de `BackendUnavailableError` ("El sistema no responde. Reintente en unos segundos."), que las pantallas muestran con su acción de reintentar. El plazo cubre también la lectura del cuerpo. Si el pedido falla antes, el temporizador se libera.
- **Un único reintento, solo en `GET` y `HEAD`, solo ante una falla de red inmediata** (por ejemplo, el proxy de Render cerró una conexión keep-alive) y dentro del mismo plazo de 5 s. Un timeout no se reintenta, porque el plazo ya se agotó y reintentar lo duplicaría. Una escritura nunca se reintenta, porque el primer intento pudo haberse aplicado.

## Consecuencias

- **Arranque en frío de Render.** El free tier duerme el Backend tras 15 minutos sin pedidos y tarda de 30 a 60 s en despertar (runbook 1 del Backend, `docs/operacion/runbooks.md`). Con 5 s, los primeros pedidos después de una siesta responden 503 con el aviso de reintento en lugar de quedarse colgados. El pedido abortado igual despierta la instancia, así que reintentar al rato anda. La mitigación es mantenerla despierta, no subir el timeout: el pinger externo cada 5 minutos sobre `/health` (cron-job.org) y el workflow `keepalive.yml` del Backend como respaldo. Antes de una demo, abrir `https://m6-backend-m64k.onrender.com/health` y esperar el 200.
- La renovación del token contra M1 conserva sus propios plazos (4 s preventiva, 15 s reactiva, `src/lib/m1-refresh.ts`). En el peor caso, un pedido que renueva suma ese plazo al de 5 s del Backend.
- `PATCH /services/:id` acepta `If-Match` en el Backend, pero el BFF no expone esa ruta: la interfaz no edita los datos de un servicio.
- `assign-crew`, `assign-service`, `request-information`, `zone-results` y las inspecciones no están versionados en el Backend, así que salen sin `If-Match`.
- Las versiones viven en memoria de la pestaña: otra pestaña o una recarga vuelven a leerlas.

## Alternativas consideradas

- Pasar el ETag explícito por cada adaptador y diálogo: más de veinte llamadas para el mismo efecto, y los listados no traen ETag por ítem.
- Pedir `GET /:id` al abrir cada diálogo: no detecta el cambio ocurrido entre el listado que la persona vio y la apertura del diálogo.
- Subir el timeout para absorber el arranque en frío: incumple el criterio y deja a la persona mirando una pantalla colgada hasta un minuto.
