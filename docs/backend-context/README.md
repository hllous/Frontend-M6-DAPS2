# Contexto del backend M6

Esta carpeta contiene un espejo de referencia del contrato HTTP y del modelo de dominio del backend. Se copió desde `Backend-M6-DAPS2`, rama `develop`, commit `d3b7b4a16c377d1a0f52915130803d1cb2433a22`, el 13/10/2026 (la copia anterior era del commit `30d49ea1d56f735a124ae9260cafefff095e07b6`, del 01/10/2026). Ese snapshot documenta 134 rutas REST distribuidas en 23 tags de Swagger, la misma cuenta que el anterior.

**Qué cambió en el contrato documentado entre las dos copias:** `GET /services` suma los filtros `targetType` y `targetId`; `GET /tree-interventions` suma `treeId`; los expedientes ambientales devuelven `assignedCrewId` (derivado de la inspección más reciente con servicio vigente); un expediente `FORWARDED`, `DISMISSED`, `NO_VIOLATION` o `CLOSED` se reabre a `UNDER_REVIEW` cuando M2 manda `REOPENED`; y `POST /events/inbox` ahora recibe el sobre del Core. Esto sale de la documentación del backend, no de una verificación contra el código: [`CONTRACTS.md`](../../CONTRACTS.md) y los ADR conservan sus propias fechas de verificación (01/10/2026).

## Contenido

- [`api/endpoints.md`](api/endpoints.md): catálogo de rutas, filtros y semántica.
- [`api/estandar-swagger.md`](api/estandar-swagger.md): formato y convenciones de la API.
- [`entidades/`](entidades/): recursos y sus estados.
- [`enumeraciones.md`](enumeraciones.md): valores cerrados del dominio.
- [`DER.md`](DER.md): modelo relacional.

## Fuente de verdad y actualización

El repositorio Backend es la fuente de verdad. Este espejo es de solo lectura: cuando cambie un contrato, actualizá el original en Backend y luego volvé a copiar las páginas correspondientes; no corrijas aquí una diferencia.

El artefacto OpenAPI versionado de este snapshot se encuentra disponible en [Backend `docs/api/openapi.json`](https://github.com/hllous/Backend-M6-DAPS2/blob/d3b7b4a16c377d1a0f52915130803d1cb2433a22/docs/api/openapi.json); este espejo no lo duplica.

El espejo cubre el dominio y la API que consume el frontend. No incluye `eventos/`, `bloqueantes.md`, el despliegue ni los acuerdos de integración backend-a-backend; por eso, algunos enlaces relativos heredados de las páginas copiadas pueden apuntar fuera de este espejo. Para las hipótesis y los flujos del frontend, consultá [`CONTRACTS.md`](../../CONTRACTS.md); para el estado general del proyecto, [`ROADMAP.md`](../../ROADMAP.md). Los bloqueantes completos están en el [repositorio Backend](https://github.com/hllous/Backend-M6-DAPS2/blob/develop/docs/bloqueantes.md).
