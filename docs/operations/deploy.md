# Despliegue y estado operativo

Guía de referencia para los despliegues de M6. Las URLs y plataformas vienen de la configuración/documentación del proyecto; su disponibilidad puede cambiar.

> **Verificación en vivo: 01/10/2026 (America/Buenos_Aires, UTC−03:00).** El alias anterior `m6-ambiente-frontend-uade.vercel.app/api/health` devolvió HTTP `404` con `X-Vercel-Error: DEPLOYMENT_NOT_FOUND` a las 08:32:26; el alias `m6-ambiente-frontend.vercel.app/api/health` respondió HTTP `200` con el JSON esperado a las 08:37:04. El primer pedido a Backend `/health` agotó 30 s sin recibir bytes (08:32:27–08:32:57); al reintentar, respondió HTTP `200` a las 08:33:10. `/health/ready` respondió HTTP `200` con `database: "up"` a las 08:38:32. El timeout seguido por respuestas sanas no demuestra una caída y es compatible con el despertar del servicio en Render.

## Plataformas y URLs

| Componente | Plataforma documentada | URL de referencia |
|---|---|---|
| Backend NestJS | Render | `https://m6-backend-m64k.onrender.com` |
| PostgreSQL | Supabase (gestionado; el backend migró desde Render el 08/10/2026) | No tiene URL pública de la app |
| Frontend Next.js | Vercel | `https://m6-ambiente-higiene.vercel.app` (el «website» del repositorio) |

> **Verificación del 30/10/2026:** `https://m6-ambiente-higiene.vercel.app/api/health` respondió `200`. `https://frontend-m6-daps2-grupo4-modulo6.vercel.app`, que todavía figura en la guía del backend ([Backend #471](https://github.com/hllous/Backend-M6-DAPS2/issues/471)), redirige con `308` a esa URL. El alias `m6-ambiente-frontend.vercel.app` también respondió `200`, pero no es el canónico.

| Recurso | URL |
|---|---|
| Health del frontend | `https://m6-ambiente-higiene.vercel.app/api/health` |
| Health del backend | `https://m6-backend-m64k.onrender.com/health` |
| Readiness del backend (incluye PostgreSQL) | `https://m6-backend-m64k.onrender.com/health/ready` |
| Swagger del backend | `https://m6-backend-m64k.onrender.com/api/docs` |

## Verificar el despliegue

```bash
curl --max-time 90 -i https://m6-ambiente-higiene.vercel.app/api/health
curl --max-time 90 -i https://m6-backend-m64k.onrender.com/health
curl --max-time 90 -i https://m6-backend-m64k.onrender.com/health/ready
```

El `GET` del frontend está implementado en [`src/app/api/health/route.ts`](../../src/app/api/health/route.ts) y responde JSON con `status: "ok"`, timestamp y `service: "m6-ambiente-frontend"`. La ruta existe en el código aunque eso no garantiza que cualquier alias de Vercel apunte a un deployment: el alias `m6-ambiente-frontend-uade.vercel.app` respondió `404 DEPLOYMENT_NOT_FOUND`, mientras que `m6-ambiente-frontend.vercel.app` respondió `200` durante la verificación registrada arriba (la URL canónica desde entonces es `m6-ambiente-higiene.vercel.app`). El `next.config.mjs` del repositorio no fija los dominios de Vercel.

Backend `/health` es **liveness**: confirma que el proceso responde, pero no consulta PostgreSQL. Para verificar también la base, usá `/health/ready`, que ejecuta `SELECT 1` con un timeout de 3 s y responde `200` con `database: "up"` o `503` si la base no responde. `/api/docs` publica el catálogo Swagger. Un `401` al llamar un endpoint de dominio protegido sin Bearer es esperado. Los endpoints públicos del portal ciudadano están bajo `/public/*`.

No uses `NEXT_PUBLIC_API_URL`: el navegador consume los Route Handlers del BFF de Next.js, que llaman al backend desde el servidor.

## Automatización

- El CI del frontend corre con Node.js 22 y valida tipos, build, lint, pruebas unitarias/componentes, Playwright y auditoría de dependencias. Ver [workflow](../../.github/workflows/ci.yml).
- Producción sale de `main`, en los dos repositorios: Vercel publica en producción solo lo que llega a `main` (los últimos deployments `Production` de GitHub, del 27/10 y 28/10, son commits de `main`), y el backend pasó de `develop` a `main` en Render el 22/10. Un merge a `develop` corre el CI y genera un deployment `Preview` en Vercel, pero no cambia producción hasta el release `develop` → `test` → `main`. Ante un fallo, consultá el estado del proyecto y sus logs en Vercel.
- El backend usa GitHub Actions y un Deploy Hook de Render según `Backend-M6-DAPS2/docs/deploy.md`. La guía y el CI vigentes del backend son la fuente para su pipeline.
- Los repositorios tienen pipelines separados; un deploy de frontend no actualiza backend ni al revés.
- Si una consulta a Render agota el tiempo de espera, repetila una vez con un límite explícito para permitir que despierte el servicio. Registrá el timeout como inconcluso si no hay respuesta HTTP; no lo presentes como una caída sin otra evidencia.

## Variables de entorno del frontend

La lista para desarrollo está en [`.env.example`](../../.env.example). En Vercel configurá las variables del servidor en el entorno correspondiente, sin prefijo `NEXT_PUBLIC_`:

| Variable | Uso |
|---|---|
| `M6_AUTH_MODE` | `mock` para escenarios locales; `backend-development` para integrar con el backend usando un JWT de desarrollo. `real-m1` todavía falla de forma cerrada. Configurar el modo explícitamente en producción: si se omite, el código selecciona `real-m1`. |
| `M6_BACKEND_ORIGIN` | Origen privado de M6 Backend; requerido en `backend-development`. |
| `M6_JWT_SECRET` | `JWT_SECRET` del backend (base64). Si está, el BFF firma un token HS256 de 5 minutos por petición con la persona del seed del perfil elegido (#740) y la sesión dura horas (#745). Solo servidor, guardar como secreto, nunca `NEXT_PUBLIC_*`. |
| `M6_JWT_ISSUER` | Emisor (`iss`) de esos tokens; por defecto `modulo1-ciudadanos`. Debe coincidir con `JWT_ISSUER` del backend. |
| `M6_DEV_JWT` | Alternativa sin `M6_JWT_SECRET`: JWT de desarrollo único, aceptado por el backend (vence a los 15 min salvo fecha límite). Con `M6_JWT_SECRET` se ignora. Guardar como secreto. |
| `M1_BASE_URL` | Opcional. Base de M1 para `POST /auth/refresh`; sin ella (o sin refresh token en la sesión) no hay renovación. No verificado contra M1. |
| `M6_SESSION_SECRET` | Secreto aleatorio de al menos 32 bytes para sellar la cookie del BFF (generalo con `openssl rand -base64 32`). Obligatorio cuando `NODE_ENV=production`; el desarrollo local tiene un valor de respaldo. |
| `NEXT_PUBLIC_DISABLE_MSW` | Solo para desarrollo y depuración de pruebas; desactiva el service worker de MSW. |

> **Solo para la demo desplegada.** `M6_AUTH_MODE=backend-development` con `M6_JWT_SECRET` hace que el login abierto emita, sin credenciales, tokens de cualquier persona del seed (administración incluida) contra el backend. No cargar ese secreto en un ambiente con usuarios reales ni reutilizarlo fuera de la demo: cualquiera que abra la URL puede elegir cualquier perfil. La sesión dura 8 horas desde el login, sin corte por inactividad. Cuando M1 esté hosteado se borra `src/lib/demo-jwt.ts` y el login pasa a ser el de M1.

La cookie de sesión es `httpOnly`, `Secure` en producción y `SameSite=Lax`. La implementación actual la cifra con AES-256-GCM; aún no autentica contra M1. Para una demo aislada, el modo `mock` usa fixtures. Para probar llamadas al backend, usá `backend-development` y un JWT temporal válido. No publiques secretos en el repositorio ni los incluyas en variables públicas.

## Variables principales del backend

Los nombres exactos están definidos en `Backend-M6-DAPS2/src/config/env.validation.ts` y la guía de despliegue del backend. Entre las variables principales están:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL; requerida. |
| `JWT_SECRET` | Secreto compartido de M1, en base64, con el que el backend verifica el JWT (HMAC `HS256`/`HS384`/`HS512`). Mientras M1 no esté hosteado, con él también se firman los tokens de demo (`M6_DEV_JWT` o `M6_JWT_SECRET` del frontend). |
| `JWT_ISSUER` | `iss` esperado; por defecto `modulo1-ciudadanos`. |
| `M6_BOOTSTRAP_ADMIN_USER_IDS` | Ids numéricos de M1 que arrancan como `M6_ADMIN`; sin ellos nadie puede asignar roles y toda la API responde 403. |
| `CORS_ORIGINS` | Orígenes permitidos. No limita al BFF, que llama desde el servidor. |
| `SANCTION_DEADLINE_DAYS` | Plazo de cierre automático de expedientes; default de 30 días. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL_BASE` | Cloudflare R2 para evidencia. Sin la configuración de storage, `/evidence` no puede completar la subida. |
| `RABBITMQ_URL` | Broker de eventos del Core (RabbitMQ). Si falta, el backend conserva los eventos en outbox y no los publica ni consume. |
| `RABBITMQ_EXCHANGE`, `RABBITMQ_QUEUE` | `muni.inbox` y `q.ambiente` (defaults): los crea el Core y el backend solo verifica que existan. |
| `CORE_API_URL`, `CORE_MODULE_ID`, `CORE_MODULE_SECRET` | API del Core, id del módulo (`ambiente`) y secret para pedir el token de módulo. El secret se carga solo en el panel de Render. |
| `CORE_REGISTER_ON_BOOT` | Si el backend registra al arrancar sus suscripciones y publicaciones en el Core; con más de una réplica va en `false` y se usa `npm run core:register`. |

Render provee `PORT`; no lo fijes manualmente. El backend sirve en `0.0.0.0` dentro del contenedor.

## Estado y límites conocidos

- Backend `develop` implementa sus siete fases: 142 rutas REST en 27 tags Swagger (cuenta del catálogo en [374f66e](https://github.com/hllous/Backend-M6-DAPS2/commit/374f66e), 30/10/2026). El [mirror local](../backend-context/README.md) y su [catálogo](../backend-context/api/endpoints.md) coinciden con ese commit.
- La integración de autenticación real de M1 sigue pendiente: M1 publicó el contrato del JWT, pero no está hosteado. El frontend tiene modo mock y un modo de desarrollo con tokens de demo; el backend autoriza cada escritura por rol de M6, y el control de capabilities del frontend no reemplaza esa autorización.
- En `POST /evidence`, Backend verifica el tipo real por magic bytes, limita el tamaño a 10 MB y elimina metadatos de JPEG, PNG y WebP cuando reconoce la estructura del archivo. Las imágenes con estructuras inesperadas se almacenan sin modificar para preservar la evidencia. Los PDF pasan sin limpiar y no hay escaneo de malware. [Backend issue #90](https://github.com/hllous/Backend-M6-DAPS2/issues/90) está cerrado con estas exclusiones documentadas; ver también [ADR-0006](../adr/0006-frontend-security-controls-are-defense-in-depth-only.md).
- Backend no tiene auditoría de lecturas ni escrituras para los datos Tier 2; el alcance se difirió fuera del TPO en el cierre de [Backend issue #90](https://github.com/hllous/Backend-M6-DAPS2/issues/90). No prometas mostrar quién vio esos datos.
- No existen endpoints de exportación o reporting en Backend. El allowlist server-side no es un control faltante de una ruta actual; el criterio para cualquier endpoint futuro es usar proyecciones explícitas campo por campo.
- `POST /services/:id/cancel` permite `SCHEDULED`, `RESCHEDULED` o `SUSPENDED` → `CANCELLED` y exige motivo; `IN_PROGRESS` no se cancela directamente. La documentación y el controller vigentes están alineados; [Backend issue #114](https://github.com/hllous/Backend-M6-DAPS2/issues/114) está cerrado.
- La lista de dependencias de producción está en [`ROADMAP.md`](../../ROADMAP.md#typed-external-and-cross-cutting-gates).
