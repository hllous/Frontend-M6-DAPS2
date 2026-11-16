# Módulo 6 — Ambiente e Higiene · Frontend

[![CI](https://github.com/hllous/Frontend-M6-DAPS2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hllous/Frontend-M6-DAPS2/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=hllous_Frontend-M6-DAPS2&metric=alert_status)](https://sonarcloud.io/summary/overall?id=hllous_Frontend-M6-DAPS2)
[![Cobertura](https://sonarcloud.io/api/project_badges/measure?project=hllous_Frontend-M6-DAPS2&metric=coverage)](https://sonarcloud.io/summary/overall?id=hllous_Frontend-M6-DAPS2)

Aplicación web interna del **Módulo 6** de Municipalidad UADE (Desarrollo de Aplicaciones II, 2.º cuatrimestre 2026, **Grupo 04**) para planificar y ejecutar servicios de Ambiente, Higiene y Servicios Urbanos, para personal de Oficina y de Campo.

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4.

## Levantar el sistema completo

El sistema completo (frontend, backend, base de datos, broker y M1 falso) se levanta siguiendo el **[README del backend](https://github.com/hllous/Backend-M6-DAPS2#levantar-el-sistema-en-local)**.

## Ver solo la interfaz, sin backend

Requiere [Node.js 22](https://nodejs.org/). Usa datos de ejemplo y no llama al backend:

```bash
corepack enable
pnpm install
pnpm dev
```

Abrí <http://localhost:3000>.

## Versión desplegada

<https://m6-ambiente-higiene.vercel.app>

## Documentación

| | Dónde |
|---|---|
| Manual de usuario | [`docs/manual-de-usuario/`](docs/manual-de-usuario/manual-de-usuario.md) |
| Decisiones técnicas (ADR) | [`docs/adr/`](docs/adr/) |
| Contratos con el backend | [`CONTRACTS.md`](CONTRACTS.md) |
| Índice completo | [`docs/README.md`](docs/README.md) |

Plan de pruebas, matriz de trazabilidad, informes y registro de defectos del módulo: [`docs/QA/` del backend](https://github.com/hllous/Backend-M6-DAPS2/tree/main/docs/QA).
