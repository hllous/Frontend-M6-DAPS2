# Contexto del backend M6

Esta carpeta contiene un espejo de referencia del contrato HTTP y del modelo de dominio del backend. Se copió desde `Backend-M6-DAPS2`, rama `develop`, commit `30d49ea1d56f735a124ae9260cafefff095e07b6`, el 01/10/2026. Ese snapshot documenta 134 rutas REST distribuidas en 23 tags de Swagger.

## Contenido

- [`api/endpoints.md`](api/endpoints.md): catálogo de rutas, filtros y semántica.
- [`api/estandar-swagger.md`](api/estandar-swagger.md): formato y convenciones de la API.
- [`entidades/`](entidades/): recursos y sus estados.
- [`enumeraciones.md`](enumeraciones.md): valores cerrados del dominio.
- [`DER.md`](DER.md): modelo relacional.

## Fuente de verdad y actualización

El repositorio Backend es la fuente de verdad. Este espejo es de solo lectura: cuando cambie un contrato, actualizá el original en Backend y luego volvé a copiar las páginas correspondientes; no corrijas aquí una diferencia.

El artefacto OpenAPI versionado de este snapshot se encuentra disponible en [Backend `docs/api/openapi.json`](https://github.com/hllous/Backend-M6-DAPS2/blob/30d49ea1d56f735a124ae9260cafefff095e07b6/docs/api/openapi.json); este espejo no lo duplica.

El espejo cubre el dominio y la API que consume el frontend. No incluye `eventos/`, `bloqueantes.md`, el despliegue ni los acuerdos de integración backend-a-backend; por eso, algunos enlaces relativos heredados de las páginas copiadas pueden apuntar fuera de este espejo. Para las hipótesis y los flujos del frontend, consultá [`CONTRACTS.md`](../../CONTRACTS.md); para el estado general del proyecto, [`ROADMAP.md`](../../ROADMAP.md). Los bloqueantes completos están en el [repositorio Backend](https://github.com/hllous/Backend-M6-DAPS2/blob/develop/docs/bloqueantes.md).
