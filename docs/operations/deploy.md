# Despliegue y estado operativo

Guía de referencia para los despliegues de M6. Las URLs y plataformas vienen de la configuración/documentación del proyecto; su disponibilidad puede cambiar.

> **Verificación en vivo: 01/10/2026 (America/Buenos_Aires, UTC−03:00).** El alias anterior `m6-ambiente-frontend-uade.vercel.app/api/health` devolvió HTTP `404` con `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` a las 08:32:26; el alias `m6-ambiente-frontend.vercel.app/api/health` respondió HTTP `200` con el JSON esperado a las 08:37:04. El primer pedido a Backend `/health` agotó 30 s sin recibir bytes (08:32:27–08:32:57); al reintentar, respondió HTTP `200` a las 08:33:10. `/health/ready` respondió HTTP `200` con `database: "up"` a las 08:38:32. El timeout seguido por respuestas sanas no demuestra una caída y es compatible con el despertar del servicio en Render.

## Plataformas y URLs

| Componente | Plataforma documentada | URL de referencia |
|---|---|---|
| Backend NestJS | Render | `https://m6-backend-m64k.onrender.com` |
| PostgreSQL | Render, acceso interno | No tiene URL pública |
| Frontend Next.js | Vercel | `https://m6-ambiente-frontend.vercel.app` |

| Recurso | URL |
|---|---|
| Health del frontend | `https://m6-ambiente-frontend.vercel.app/api/health` |
| Health del backend | `https://m6-backend-m64k.onrender.com/health` |
| Readiness del backend (incluye PostgreSQL) | `https://m6-backend-m64k.onrender.com/health/ready` |
| Swagger del backend | `https://m6-backend-m64k.onrender.com/api/docs` |

## Verificar el despliegue

```bash
curl --max-time 90 -i https://m6-ambiente-frontend.vercel.app/api/health
curl --max-time 90 -i https://m6-backend-m64k.onrender.com/health
curl --max-time 90 -i https://m6-backend-m64k.onrender.com/health/ready
```

El `GET` del frontend está implementado en [`src/app/api/health/route.ts`](../../src/app/api/health/route.ts) y responde JSON con `status: "ok"`, timestamp y `service: "m6-ambiente-frontend"`. La ruta existe en el código aunque eso no garantiza que cualquier alias de Vercel apunte a un deployment: el alias `m6-ambiente-frontend-uade.vercel.app` respondió `404 DEPLOYMENT_NOT_FOUND`, mientras que `m6-ambiente-frontend.vercel.app` respondió `200` durante la verificación registrada arriba. El `next.config.mjs` del repositorio no fija los dominios de Vercel.

Backend `/health` es **liveness**: confirma que el proceso responde, pero no consulta PostgreSQL. Para verificar también la base, usá `/health/ready`, que ejecuta `SELECT 1` con un timeout de 3 s y responde `200` con `database: "up"` o `503` si la base no responde. `/api/docs` publica el catálogo Swagger. Un `401` al llamar un endpoint de dominio protegido sin Bearer es esperado. Los endpoints públicos del portal ciudadano están bajo `/public/*`.

No uses `NEXT_PUBLIC_API_URL`: el navegador consume los Route Handlers del BFF de Next.js, que llaman al backend desde el servidor.

## Automatización

- El CI del frontend corre con Node.js 22 y valida tipos, build, lint, pruebas unitarias/componentes, Playwright y auditoría de dependencias. Ver [workflow](../../.github/workflows/ci.yml).
- Vercel está configurado para desplegar los cambios de `develop`; ante un fallo, consultá el estado del proyecto y sus logs en Vercel.
- El backend usa GitHub Actions y un Deploy Hook de Render según `Backend-M6-DAPS2/docs/deploy.md`. La guía y el CI vigentes del backend son la fuente para su pipeline.
- Los repositorios tienen pipelines separados; un deploy de frontend no actualiza backend ni al revés.
- Si una consulta a Render agota el tiempo de espera, repetila una vez con un límite explícito para permitir que despierte el servicio. Registrá el timeout como inconcluso si no hay respuesta HTTP; no lo presentes como una caída sin otra evidencia.

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

- Backend `develop` implementa sus siete fases: 134 rutas REST en 23 tags Swagger (snapshot verificado en [30d49ea](https://github.com/hllous/Backend-M6-DAPS2/commit/30d49ea1d56f735a124ae9260cafefff095e07b6)). El [mirror local](../backend-context/README.md) y su [catálogo](../backend-context/api/endpoints.md) se actualizaron desde ese mismo snapshot el 01/10/2026.
- La integración de autenticación real de M1 sigue pendiente. El frontend tiene modo mock y un modo de desarrollo con JWT; el control de capabilities del frontend no reemplaza autorización en backend.
- En `POST /evidence`, Backend verifica el tipo real por magic bytes, limita el tamaño a 10 MB y elimina metadatos de JPEG, PNG y WebP cuando reconoce la estructura del archivo. Las imágenes con estructuras inesperadas se almacenan sin modificar para preservar la evidencia. Los PDF pasan sin limpiar y no hay escaneo de malware. [Backend issue #90](https://github.com/hllous/Backend-M6-DAPS2/issues/90) está cerrado con estas exclusiones documentadas; ver también [ADR-0006](../adr/0006-frontend-security-controls-are-defense-in-depth-only.md).
- Backend no tiene auditoría de lecturas ni escrituras para los datos Tier 2; el alcance se difirió fuera del TPO en el cierre de [Backend issue #90](https://github.com/hllous/Backend-M6-DAPS2/issues/90). No prometas mostrar quién vio esos datos.
- No existen endpoints de exportación o reporting en Backend. El allowlist server-side no es un control faltante de una ruta actual; el criterio para cualquier endpoint futuro es usar proyecciones explícitas campo por campo.
- `POST /services/:id/cancel` permite `SCHEDULED`, `RESCHEDULED` o `SUSPENDED` → `CANCELLED` y exige motivo; `IN_PROGRESS` no se cancela directamente. La documentación y el controller vigentes están alineados; [Backend issue #114](https://github.com/hllous/Backend-M6-DAPS2/issues/114) está cerrado.
- La lista de dependencias de producción está en [`ROADMAP.md`](../../ROADMAP.md#typed-external-and-cross-cutting-gates).
