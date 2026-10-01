# Despliegue y estado operativo

Guía de referencia para los despliegues de M6. Las URLs y plataformas vienen de la configuración/documentación del proyecto; su disponibilidad puede cambiar.

> **Revisión: 30/09/2026.** No se pudo confirmar que los dos health checks públicos estuvieran sanos: la URL de frontend devolvió `404` en `/api/health` y el backend agotó el tiempo de espera durante la consulta. Verificá el despliegue antes de una demo; un timeout del backend también puede ocurrir mientras Render despierta el servicio.

## Plataformas y URLs

| Componente | Plataforma documentada | URL de referencia |
|---|---|---|
| Backend NestJS | Render | `https://m6-backend-m64k.onrender.com` |
| PostgreSQL | Render, acceso interno | No tiene URL pública |
| Frontend Next.js | Vercel | `https://m6-ambiente-frontend-uade.vercel.app` |

| Recurso | URL |
|---|---|
| Health del frontend | `https://m6-ambiente-frontend-uade.vercel.app/api/health` |
| Health del backend | `https://m6-backend-m64k.onrender.com/health` |
| Swagger del backend | `https://m6-backend-m64k.onrender.com/api/docs` |

## Verificar el despliegue

```bash
curl --max-time 90 -i https://m6-ambiente-frontend-uade.vercel.app/api/health
curl --max-time 90 -i https://m6-backend-m64k.onrender.com/health
```

El health check frontend responde JSON con `status: "ok"`, timestamp y `service: "m6-ambiente-frontend"`. El backend responde en `/health`; `/api/docs` publica su catálogo Swagger. Un `401` al llamar un endpoint de dominio protegido sin Bearer es esperado. Los endpoints públicos del portal ciudadano están bajo `/public/*`.

La verificación registrada arriba encontró `404` en el health del frontend y timeout en el backend dentro de 25 segundos. Repetí la consulta y revisá el último deployment del proveedor antes de asumir disponibilidad. No uses `NEXT_PUBLIC_API_URL`: el navegador consume los Route Handlers del BFF de Next.js, que llaman al backend desde el servidor.

## Automatización

- El CI del frontend corre con Node.js 20 y valida tipos, build, lint, pruebas unitarias/componentes, Playwright y auditoría de dependencias. Ver [workflow](../../.github/workflows/ci.yml).
- Vercel está configurado para desplegar los cambios de `develop`; ante un fallo, consultá el estado del proyecto y sus logs en Vercel.
- El backend usa GitHub Actions y un Deploy Hook de Render según `Backend-M6-DAPS2/docs/deploy.md`. La guía y el CI vigentes del backend son la fuente para su pipeline.
- Los repositorios tienen pipelines separados; un deploy de frontend no actualiza backend ni al revés.

## Variables de entorno del frontend

La lista para desarrollo está en [`.env.example`](../../.env.example). En Vercel configurá las variables del servidor en el entorno correspondiente, sin prefijo `NEXT_PUBLIC_`:

| Variable | Uso |
|---|---|
| `M6_AUTH_MODE` | `mock` para escenarios locales; `backend-development` para integrar con el backend usando un JWT de desarrollo. `real-m1` todavía falla de forma cerrada. Configurar el modo explícitamente en producción: si se omite, el código selecciona `real-m1`. |
| `M6_BACKEND_ORIGIN` | Origen privado de M6 Backend; requerido en `backend-development`. |
| `M6_DEV_JWT` | JWT de desarrollo aceptado por el backend; requerido en `backend-development`. Guardar como secreto. |
| `M6_SESSION_SECRET` | Secreto del BFF para sellar la cookie de sesión. Obligatorio cuando `NODE_ENV=production`; el desarrollo local tiene un valor de respaldo. |
| `NEXT_PUBLIC_DISABLE_MSW` | Solo para desarrollo y depuración de pruebas; desactiva el service worker de MSW. |

La cookie de sesión es `httpOnly`, `Secure` en producción y `SameSite=Lax`. La implementación actual la cifra con AES-256-GCM; aún no autentica contra M1. Para una demo aislada, el modo `mock` usa fixtures. Para probar llamadas al backend, usá `backend-development` y un JWT temporal válido. No publiques secretos en el repositorio ni los incluyas en variables públicas.

## Variables principales del backend

Los nombres exactos están definidos en `Backend-M6-DAPS2/src/config/env.validation.ts` y la guía de despliegue del backend. Entre las variables principales están:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL; requerida. |
| `JWT_SECRET` | Firma/verificación HS256 provisoria del backend; no es el contrato final de M1. |
| `JWT_EXPIRATION` | Duración de JWT; default de 3600 segundos. |
| `SANCTION_DEADLINE_DAYS` | Plazo de cierre automático de expedientes; default de 30 días. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL_BASE` | Cloudflare R2 para evidencia. Sin la configuración de storage, `/evidence` no puede completar la subida. |
| `KAFKA_BROKERS` | Broker de eventos. Si falta, el backend conserva los eventos en outbox y no los publica. |

Render provee `PORT`; no lo fijes manualmente. El backend sirve en `0.0.0.0` dentro del contenedor.

## Estado y límites conocidos

- El backend implementó sus siete fases: 130 rutas REST en 23 tags. El detalle copiado al frontend está en [`backend-context/api/endpoints.md`](../backend-context/api/endpoints.md).
- La integración de autenticación real de M1 sigue pendiente. El frontend tiene modo mock y un modo de desarrollo con JWT; el control de capabilities del frontend no reemplaza autorización en backend.
- El backend hoy valida el MIME declarado y el tamaño en `/evidence`, pero aún faltan inspección de bytes, stripping de metadatos, escaneo de malware, auditoría de lecturas Tier 2 y allowlists server-side para exports. Ver [ADR-0006](../adr/0006-frontend-security-controls-are-defense-in-depth-only.md) y [Backend issue #90](https://github.com/hllous/Backend-M6-DAPS2/issues/90).
- Backend rechaza cancelar un Servicio en `RESCHEDULED`, aunque el frontend expone esa acción. La integración debe tratarse como pendiente hasta que Backend y frontend concilien el contrato; ver [CONTRACTS.md](../../CONTRACTS.md#worked-example-service) y [Backend issue #114](https://github.com/hllous/Backend-M6-DAPS2/issues/114).
- La lista de dependencias de producción está en [`ROADMAP.md`](../../ROADMAP.md#typed-external-and-cross-cutting-gates).
