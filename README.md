# Módulo 6 — Ambiente e Higiene · Frontend

Frontend del **Módulo 6** de la plataforma Municipalidad UADE. TPO de Desarrollo de Aplicaciones II — 2do cuatrimestre 2026, **Grupo 04**.

## Stack

- **Next.js** (App Router) + React + TypeScript
- **Tailwind CSS**

## Cómo correr localmente

```bash
npm install
npm run dev
```

La app corre en `http://localhost:3000`.

- Health check: `http://localhost:3000/api/health`
- Configurar `NEXT_PUBLIC_API_URL` (ver `.env.example`) para apuntar al backend de M6.

## Docker

```bash
docker build -t m6-frontend .
docker run -p 3000:3000 m6-frontend
```

## Estructura

```
src/app/            # App Router (páginas y rutas)
src/app/api/health/ # endpoint de health check
public/             # assets estáticos
Dockerfile          # build multi-stage (standalone output)
.github/workflows/  # CI (build + lint)
```
