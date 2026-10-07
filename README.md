# Módulo 6 — Ambiente e Higiene · Frontend

Aplicación web interna para planificar y ejecutar servicios municipales de Ambiente, Higiene y Servicios Urbanos. Está dirigida al personal de Oficina y al personal de Campo, con vistas de escritorio y uso móvil.

## Stack

- Next.js 16 (App Router), React 19 y TypeScript
- Tailwind CSS 4
- Node.js 22 para CI y la imagen Docker
- Zod para validar datos en los límites de los adaptadores

## Funcionalidad

- Programación, asignación y ejecución de Servicios ROUTE y POINT.
- Catálogos de zonas, recorridos, frecuencias, cuadrillas, vehículos, contenedores, puntos verdes, espacios verdes y arbolado.
- Expedientes e inspecciones de control ambiental, evidencia y derivaciones a otros módulos.
- Mapa operativo y tablero de indicadores.

## Ejecución local

```bash
npm ci
npm run dev
```

La aplicación queda en `http://localhost:3000`; el health check local es `/api/health`. La configuración se describe en [`.env.example`](.env.example). El modo local predeterminado usa escenarios y fixtures (`M6_AUTH_MODE=mock`).

Si vas a usar variables locales, copiá `.env.example` a `.env.local` y ajustá los valores. Cuando el backend local usa el puerto 3000, iniciá el frontend en otro puerto, por ejemplo `npm run dev -- --port 3001`.

Para conectarse al backend, configurar `M6_AUTH_MODE=backend-development`, `M6_BACKEND_ORIGIN`, `M6_DEV_JWT` y `M6_SESSION_SECRET`. Son variables del servidor: el navegador llama a los Route Handlers del BFF de Next.js y nunca recibe el JWT. La autenticación real de M1 aún no está habilitada; el modo `real-m1` falla de forma cerrada hasta que M1 publique su contrato verificable. Ver [contratos](CONTRACTS.md) y [ADR-0004](docs/adr/0004-owned-bff-session-the-m1-jwt-never-reaches-the-browser.md).

## Docker

```bash
docker build -t m6-frontend .
# Crear .env.local a partir de .env.example antes de este comando.
docker run --env-file .env.local -p 3000:3000 m6-frontend
```

La imagen usa la salida `standalone` de Next.js. Para operar contra el backend, la configuración de sesión y autenticación debe estar disponible en el contenedor.

## Estructura

```text
src/app/app/       # espacios de trabajo y páginas
src/app/api/       # Route Handlers del BFF
src/lib/           # sesiones, adaptadores, esquemas y reglas de dominio
src/components/    # interfaz y flujos operativos
e2e/               # recorridos Playwright y accesibilidad
docs/              # contratos, decisiones y guías
```

## Documentación

El índice está en [`docs/README.md`](docs/README.md). Ahí se separan documentación de producto, dominio, contratos, diseño, operación y guías de trabajo.
