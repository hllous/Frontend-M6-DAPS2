# Despliegue y estado del Módulo 6

> Estado del despliegue de producción del M6 (Ambiente, Higiene y Servicios Urbanos) al **03/09/2026**.
> Mantenido por DevOps. Si algo cambia de plataforma o de URL, actualizar este archivo.
> La parte de backend está sincronizada con `Backend/docs/deploy.md` en `develop` (`ffaa479`); ante discrepancias, ese archivo manda.

---

## 1. Estado actual

| Componente | Plataforma | Estado | URL |
|---|---|---|---|
| **Backend** (NestJS) | Render (Web Service, free) | ✅ Live | `https://m6-backend-m64k.onrender.com` |
| **PostgreSQL** | Render (Managed, free) | ✅ Available | (Internal URL, no accesible desde afuera) |
| **Frontend** (Next.js) | Vercel (free) | ✅ Live | `https://m6-ambiente-frontend.vercel.app` |

El deploy está **enlazado a la rama `develop`** de cada repo: al pushear código a `develop` se actualiza automáticamente — el backend vía GitHub Actions + Deploy Hook de Render, el frontend vía auto-deploy nativo de Vercel (~2-5 min).

El backend cerró las siete fases de su plan: 130 rutas REST en 23 tags de Swagger, con migraciones de Prisma corriendo solas en cada deploy. El catálogo completo está espejado en [`backend-context/api/endpoints.md`](backend-context/api/endpoints.md).

---

## 2. URLs útiles

| Recurso | URL |
|---|---|
| Frontend (landing) | `https://m6-ambiente-frontend.vercel.app` |
| Frontend health | `https://m6-ambiente-frontend.vercel.app/api/health` |
| Backend health | `https://m6-backend-m64k.onrender.com/health` |
| Backend Swagger UI | `https://m6-backend-m64k.onrender.com/api/docs` |

---

## 3. Cómo verificar que está todo OK

```bash
# Backend: debe devolver status ok
curl https://m6-backend-m64k.onrender.com/health
# → {"status":"ok","timestamp":"...","service":"m6-ambiente-backend"}

# Frontend: debe devolver status ok
curl https://m6-ambiente-frontend.vercel.app/api/health
# → {"status":"ok","timestamp":"...","service":"m6-ambiente-frontend"}
```

- **Swagger UI** en `.../api/docs` lista las 130 rutas REST en 23 tags, en orden de lectura: primero sobre qué se programa (zones, routes, service-frequencies, service-types, disposal-sites), después la operación (crews, vehicles, services), después el inventario (containers, green-points, trees, green-spaces), y al final control ambiental, derivaciones, evidence, indicators y citizen-portal.
- **Nota**: un `GET /` (raíz) del backend devuelve `404 Cannot GET /` — es esperado, el backend no expone una ruta raíz. Usar `/health` o `/api/docs` para probar.
- **Todo endpoint de dominio exige JWT** (guard global). Un `curl` sin `Authorization` devuelve `401`, no datos. Los únicos públicos son `/health` y los cuatro de `/public/*` (portal del ciudadano).

---

## 4. Cómo funciona el deploy

### Automático (lo normal)

**Backend (Render)** — lo dispara GitHub Actions:

```
git push origin develop
    ↓
GitHub Actions corre build + test (CI)
    ↓  si ambos pasan
Job "deploy" dispara el Deploy Hook de Render (con el commit exacto)
    ↓
Render buildea Docker y deploya
    ↓
Backend actualizado en ~3-5 min
```

**Frontend (Vercel)** — deploy nativo:

```
git push origin develop
    ↓
Vercel detecta cambios en Frontend-M6-DAPS2 → buildea Next.js → deploya
    ↓
Frontend actualizado en ~2-5 min
```

No hay que hacer nada manual en el día a día.

> **Nota**: el job `deploy` de GitHub Actions depende de `build`+`test`: si el CI falla, **no** se deploya. La config es el secret `RENDER_DEPLOY_HOOK_URL` + **Auto-Deploy apagado** en Render (para evitar dobles deploys).

### Deploy manual (cuando hace falta forzarlo)

- **Render** → servicio → pestaña **Deploys** → **Manual Deploy → Deploy latest commit**.
- **Vercel** → proyecto → **Deployments** → **Redeploy** del último deploy.

### Variables de entorno

**Backend (Render):**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | (Internal Database URL del Postgres) |
| `JWT_SECRET` | secreto ≥ 8 caracteres (generar random) |
| `JWT_EXPIRATION` | `3600` |
| `NODE_ENV` | `production` |
| `SANCTION_DEADLINE_DAYS` | `30` — plazo que se le da a M4 antes de cerrar el expediente por vencimiento |
| `KAFKA_CLIENT_ID` / `KAFKA_GROUP_ID` | `m6-ambiente` / `m6-ambiente-group`. Sin `KAFKA_BROKERS` la app arranca igual: los eventos quedan en el outbox y se loguean, sin publicarse |
| `R2_*` (`ACCOUNT_ID`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `BUCKET`, `PUBLIC_URL_BASE`) | Cloudflare R2 para evidencia. Sin ellas la app arranca, pero `POST /evidence` falla al subir |

> **Importante**: **NO** setear `PORT` a mano. Render inyecta su propio `PORT` automáticamente; pisarlo rompe el health check del deploy (la app corre en `10000` en free tier).

**Frontend (Vercel):**

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://m6-backend-m64k.onrender.com` |

> `NEXT_PUBLIC_*` se inyecta en **build time** (client-side). Si el backend cambia de URL, hay que actualizar la variable y redeployar.

> **Estado transitorio**: `NEXT_PUBLIC_API_URL` describe únicamente el scaffold actual y no es el contrato final de integración. La implementación objetivo es server-only/BFF: la URL del backend debe vivir en una variable no pública (por ejemplo `M6_BACKEND_URL`) y el navegador debe hablar con Route Handlers del frontend. No exponer secretos ni interpretar el gating de capabilities como autorización hasta resolver [#46](https://github.com/hllous/Frontend-M6-DAPS2/issues/46).

---

## 5. Gotchas conocidos

- **Spin-down de Render (free tier)**: el backend se "duerme" tras **15 min** sin requests. El primer request tras dormirse tarda **30-60 s** en responder (lo despierta). Para demos, abrir `/health` ~1 min antes. El Postgres y el frontend (Vercel) **no se duermen**.
- **Health Check Path de Render**: dejarlo **vacío**. Un path de health check mal configurado produce `==> Timed Out` en el deploy aunque la app arranque bien.
- **Bind `0.0.0.0`**: el backend escucha en `0.0.0.0:PORT` (no `localhost`), que es lo que Render espera. No cambiar esto.
- **Postgres free tier**: 256 MB de storage y retención de 90 días (los datos viejos se purgan). Suficiente para el TPO.

---

## 6. Pendientes para que la app funcione end-to-end

La infraestructura está deployada, las migraciones corren solas en cada deploy y el backend terminó su plan. Lo que falta para el end-to-end:

| # | Pendiente | Responsable | Detalle |
|---|---|---|---|
| 1 | **Migraciones de Prisma** | Backend | ✅ Resuelto. El `CMD` del Dockerfile corre `npx prisma migrate deploy` antes de arrancar; si la migración falla, el contenedor no levanta (deliberado: mejor no servir contra un esquema desactualizado). |
| 2 | **Services de dominio** | Backend | ✅ Completos — las siete fases del plan, incluidas control ambiental, derivaciones, evidencia, indicadores y portal del ciudadano. |
| 3 | **Autenticación** | Backend / M1 | ⚠️ Provisoria. Todo endpoint exige JWT (guard global), pero la verificación es HS256 contra `JWT_SECRET` hasta que M1 publique su contrato de firma y claims. **La autorización por rol todavía no existe**: cualquier usuario autenticado puede llamar cualquier endpoint. Es el bloqueante que más afecta al frontend — ver [ADR-0005](adr/0005-m6-backend-is-the-sole-authorization-authority.md). |
| 4 | **Bus de eventos** | M9 / cohorte | ⚠️ Outbox e inbox implementados, pero sin `KAFKA_BROKERS` no hay broker: los eventos se encolan y se loguean, no se publican. No bloquea al frontend (es tráfico backend-a-backend). |
| 5 | **UI del frontend** | Frontend | El frontend es un esqueleto (landing + health). Falta construir las vistas. El scaffold actual consume la API por `NEXT_PUBLIC_API_URL`, pero la arquitectura objetivo es BFF/server-only y queda pendiente de la decisión de auth de [#46](https://github.com/hllous/Frontend-M6-DAPS2/issues/46). |

**Prueba rápida** (todo endpoint de dominio exige token):

```bash
curl https://m6-backend-m64k.onrender.com/zones
# → 401 {"statusCode":401,"message":"Unauthorized",...}   ← esperado, falta el Bearer

curl https://m6-backend-m64k.onrender.com/public/zones
# → 200, las zonas activas (endpoint público del portal del ciudadano)
```

---

## 7. Referencia

- Guías paso a paso de deploy (fuera de git, en el workspace del DevOps): `docs/deploy-render.md` y `docs/deploy-vercel.md`.
- Seguimiento DevOps completo: `DEVOPS-SEGUIMIENTO.md` (workspace).
