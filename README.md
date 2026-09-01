# Módulo 6 — Ambiente e Higiene · Frontend

Frontend del **Módulo 6** de la plataforma Municipalidad UADE. TPO de Desarrollo de Aplicaciones II — 2do cuatrimestre 2026, **Grupo 04**.

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Tailwind CSS**

## Deploy en producción

**Plataforma**: Vercel (Free Tier)  
**URL**: `https://m6-frontend.vercel.app`  
**Rama**: `develop` (deploy automático en cada push)

Vercel detecta automáticamente Next.js y buildea sin necesidad de Dockerfile. Deploy automático en ~2 minutos.

Guía completa: [`docs/deploy-vercel.md`](../docs/deploy-vercel.md) (en la raíz del workspace)

## Cómo correr localmente

### Opción 1: npm (desarrollo)

```bash
npm install
npm run dev
```

La app corre en `http://localhost:3000`.

- Health check: `http://localhost:3000/api/health`
- Configurar `NEXT_PUBLIC_API_URL` (ver `.env.example`) para apuntar al backend de M6.

### Opción 2: docker-compose (recomendado para integración)

Desde la raíz del workspace (`Desarrollo de apps 2/`):

```bash
docker-compose up --build
```

El frontend queda en `http://localhost:3002` (puerto 3002 para no colisionar con otros servicios).

Ver `docker-compose.yml` en la raíz del workspace para más detalles.

### Opción 3: Docker individual

```bash
docker build -t m6-frontend .
docker run -p 3000:3000 m6-frontend
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend de M6 | `http://localhost:3001` (local) o `https://m6-backend.onrender.com` (prod) |

**Importante**: Las variables `NEXT_PUBLIC_*` se inyectan en **build time** para client-side. En Vercel se configuran en el dashboard. En Docker, se pasa como `ARG` al Dockerfile.

## Estructura

```
src/app/            # App Router (páginas y rutas)
src/app/api/health/ # endpoint de health check
public/             # assets estáticos
Dockerfile          # build multi-stage (standalone output)
.github/workflows/  # CI (build + lint)
```

## Estado del proyecto

- ✅ Esqueleto Next.js 14 creado
- ✅ Docker + CI configurados
- ✅ Deploy en Vercel configurado (guía creada)
- ⏳ UI del módulo pendiente de desarrollo (el equipo de frontend construye sobre este esqueleto)
