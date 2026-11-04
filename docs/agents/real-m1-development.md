# Ingreso real con M1 en desarrollo

El modo `real-m1` envía el correo y la contraseña desde el navegador al Route Handler de sesión. El servidor de Next llama a M1 y a `GET /me`; la cookie de sesión es `HttpOnly` y los tokens de M1 no llegan al navegador.

El M1 desplegado usa la base `https://ciudadanos-m1-backend.onrender.com/`; se configura con `M1_BASE_URL`, nunca como valor por defecto en el código. Render puede tardar hasta 78 segundos en el primer arranque: el BFF espera hasta 90 segundos y el formulario informa ese tiempo mientras conecta.

## M1 falso local

En una terminal, desde la raíz del frontend, iniciá el servidor de prueba:

```powershell
$env:FAKE_M1_PORT = "3120"
pnpm dev:fake-m1
```

El servidor solo escucha en `127.0.0.1`, rechaza la ejecución con `NODE_ENV=production` y nunca registra credenciales ni tokens. No uses sus cuentas en otro entorno. Las cuentas de empleados y el ciudadano usan `m6-dev-796`; la cuenta inactiva también usa esa clave. `m1-caido@m6.local` simula una caída del servicio.

| Perfil | Correo |
| --- | --- |
| Oficina · cola de decisiones | `carlos.rodriguez@m6.local` |
| Oficina · operaciones | `julian.lopez@m6.local` |
| Oficina · ambiental | `diego.sosa@m6.local` |
| Oficina · auditoría | `camila.medina@m6.local` |
| Campo · responsable de cuadrilla | `sofia.lopez@m6.local` |
| Campo · integrante de cuadrilla | `diego.martinez@m6.local` |
| Campo · inspector | `carlos.medina@m6.local` |
| Empleado sin rol de M6 | `sin-rol@m6.local` |
| Ciudadano (sin acceso a M6) | `ciudadano@m6.local` |
| Cuenta inactiva | `inactivo@m6.local` |
| M1 no disponible | `m1-caido@m6.local` |

## Frontend y respuesta de `GET /me`

En otra terminal, configurá Next para conectarse al servidor falso y cargar el Backend MSW local:

```powershell
$env:M6_AUTH_MODE = "real-m1"
$env:M1_BASE_URL = "http://127.0.0.1:3120/api/v1/"
$env:M1_FAKE_ENABLED = "true"
$env:M6_BACKEND_ORIGIN = "http://m6-demo-backend.invalid"
$env:M6_REAL_M1_MOCK_BACKEND = "true"
$env:NODE_OPTIONS = "--import=./scripts/msw-real-m1-backend.mjs"
$env:NEXT_PUBLIC_DISABLE_MSW = "true"
pnpm dev --port 3121
```

`pnpm test:e2e` incluye el proyecto `real-m1`: inicia un M1 falso en 4312 y un Next independiente en 4311, con el MSW de Backend cargado dentro de ese proceso. La spec `e2e/real-m1-login.spec.ts` corre en CI sin variables adicionales. Para ejecutarla contra los servidores que arrancaste manualmente arriba, usá `$env:PLAYWRIGHT_REAL_M1_BASE_URL = "http://localhost:3121"; pnpm exec playwright test --project=real-m1 e2e/real-m1-login.spec.ts`.

Abrí `http://localhost:3121/login`. El Backend MSW solo responde `GET /me` para estas pruebas y deriva roles de M6 de los perfiles de desarrollo; las rutas de dominio requieren un Backend disponible. La cuenta sin rol permite revisar el flujo de ingreso y la pantalla `/no-role` sin asignar capacidades.

El M1 falso incluye un endpoint de refresh local y emite tokens descartables con el formato estructural esperado por el BFF. No valida una contraseña real, no representa un entorno de identidad y no debe usarse fuera de desarrollo o pruebas. En producción `M1_BASE_URL` debe ser HTTPS hacia M1 y `M1_FAKE_ENABLED` no debe estar activo.
