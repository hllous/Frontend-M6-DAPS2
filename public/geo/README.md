# GeoJSON de CABA

Límites de las comunas y los barrios de la Ciudad Autónoma de Buenos Aires, copiados sin modificar desde `docs/geojson/` del Backend (commit `7ba0d71`, [Backend #422](https://github.com/hllous/Backend-M6-DAPS2/issues/422)). CRS `urn:ogc:def:crs:OGC:1.3:CRS84` (longitud, latitud).

| Archivo | Features | Propiedades |
|---|---|---|
| `caba_comunas.geojson` | 15 | `COMUNAS` (número), `BARRIOS`, `PERIMETRO`, `AREA`, `ID`, `OBJETO` |
| `caba_barrios.geojson` | 48 | `BARRIO` (nombre en mayúsculas), `COMUNA` (número), `PERIMETRO`, `AREA`, `OBJETO` |

## Fuente y licencia

Datasets abiertos de BA Data, Gobierno de la Ciudad de Buenos Aires (GCBA). Licencia Creative Commons Atribución 2.5 Argentina ([CC BY 2.5 AR](https://creativecommons.org/licenses/by/2.5/ar/)). Datos utilizados con fines académicos y adaptados para su integración en el proyecto.

## Emparejar con la API

- Barrio: normalizar `BARRIO` (sin acentos, minúsculas, espacios y signos a `-`, `GRAL.` como `general`) y compararlo con el `codigo` del barrio (`Zone.code`, `neighborhood.codigo` de `GET /zones`). `BOCA` es `la-boca` y se aliasa a mano.
- Comuna: `COMUNA` o `COMUNAS` igual a `N` corresponde a `comuna-N` (`commune.code` de `GET /communes`).

Verificado por el Backend el 27/10/2026 contra el catálogo real de M9: coinciden los 48 barrios y las 15 comunas. Detalle en [`docs/geojson/README.md` del Backend](https://github.com/hllous/Backend-M6-DAPS2/blob/develop/docs/geojson/README.md).
