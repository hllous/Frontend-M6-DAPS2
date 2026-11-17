# Eje D (seguridad): evidencia del Frontend

Tabla criterio, estado y evidencia, para copiar a la pasada de QA. Verificada el 16/11/2026 sobre `develop` más el PR de [#969](https://github.com/hllous/Frontend-M6-DAPS2/issues/969). Los tests unitarios corren con `pnpm test`; los e2e con `pnpm exec playwright test --project=<proyecto> <archivo>` (el de fuerza bruta usa el proyecto `real-m1`).

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| Fuerza bruta en el login: 429 tras 5 fallos por cuenta (y 20 por IP) con `Retry-After` y mensaje en español | Cumple | `src/lib/login-rate-limit.test.ts`, `src/app/api/session/login/rate-limit.test.ts`, `e2e/login-rate-limit.spec.ts`; [login-rate-limit.md](login-rate-limit.md) |
| El login exitoso resetea el contador de la cuenta; la ventana de 15 minutos libera | Cumple | `rate-limit.test.ts` ("resets the account counter after a successful login", "lets the account in again after the 15 minute window") |
| No se enumeran usuarios (cuenta inexistente = cuenta existente) | Cumple | `rate-limit.test.ts` ("does not reveal whether the account exists"), `e2e/login-rate-limit.spec.ts` |
| Límite de fuerza bruta compartido entre instancias serverless | **Parcial**: en memoria, por instancia | [ADR-0009](../adr/0009-limite-de-intentos-de-ingreso-en-memoria.md), sección Consecuencias; seguimiento: almacén compartido o firewall de Vercel |
| IP del cliente no falsificable | Cumple | `src/lib/client-ip.test.ts` (fuera de Vercel se ignora `X-Forwarded-For`) |
| CSP en las páginas (nonce por pedido, `frame-ancestors 'none'`, `object-src 'none'`) | Cumple | `src/lib/security-headers.test.ts`, `e2e/security-headers.spec.ts` ("pages send the CSP...", "each request gets a fresh nonce") |
| CSP cerrada en el BFF (`default-src 'none'`) | Cumple | `e2e/security-headers.spec.ts` ("the BFF answers with a closed CSP") |
| Sin violaciones de CSP en las pantallas principales | Cumple | `e2e/security-headers.spec.ts` ("no CSP violations on the main screens") |
| `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` | Cumple | `next.config.test.mjs`, `e2e/security-headers.spec.ts` |
| Esas cabeceras también en 404, redirecciones y errores del BFF | Cumple | `e2e/security-headers.spec.ts` ("headers on every kind of response") |
| `X-Powered-By` oculto | Cumple | `next.config.test.mjs`, `e2e/security-headers.spec.ts` |
| HSTS en producción | Cumple (`next.config.mjs` en producción; Vercel manda el suyo) | `next.config.test.mjs` ("sends HSTS in production only"); contra el despliegue: `curl -sI https://m6-ambiente-higiene.vercel.app/login \| grep -i strict-transport` |
| Cookie de sesión `HttpOnly`, `SameSite=Lax`, `Secure` en producción y en hosts no loopback | Cumple | `src/lib/security-audit.test.ts` ("session cookies"), `src/app/api/session/handlers.test.ts`, `e2e/security-headers.spec.ts` ("session cookies") |
| La cookie de sesión no es legible por scripts | Cumple | `e2e/security-headers.spec.ts` (`document.cookie` sin `m6_session`) |
| El JWT de M1 nunca llega al navegador | Cumple | [ADR-0004](../adr/0004-owned-bff-session-the-m1-jwt-never-reaches-the-browser.md); `publicSession` omite `accessToken` y `refreshToken` |
| CORS de `/api/*` sin comodín con credenciales | Cumple (no se emite ningún `Access-Control-Allow-*`; solo mismo origen) | `src/lib/security-audit.test.ts` ("CORS"), `e2e/security-headers.spec.ts` ("never answers with a wildcard or reflected CORS origin", "a cross-origin preflight is not approved") |
| Errores del BFF sin stack ni detalles internos | Cumple | `src/lib/security-audit.test.ts` ("BFF errors"), `e2e/security-headers.spec.ts` ("errors carry no stack trace or internal detail"); el 500 usa un mensaje fijo por ruta (`mapSessionError`) |
| Logs del BFF sin tokens ni datos personales | Cumple | `rate-limit.test.ts` ("logs no password, email or token..."), `src/lib/telemetry.test.ts` (lista cerrada de campos), [ADR-0006](../adr/0006-frontend-security-controls-are-defense-in-depth-only.md) |
| XSS: texto de usuarios escapado | Cumple | `e2e/xss-escaping.spec.ts` (payload `<img onerror>` + `<script>` se muestra literal y no ejecuta) |
| XSS: sin `dangerouslySetInnerHTML`/`innerHTML`/`eval` con datos de usuario | Cumple (único uso: `components/ui/chart.tsx`, estilos con colores del propio código) | `src/lib/security-audit.test.ts` ("XSS surface") |
| Escaneo dinámico (ZAP): sin High | Cumple | [zap.md](zap.md), reportes en `zap-2026-11-15/` |
| Dependencias y secretos | Cumple | Jobs `trivy`, `audit` y `secrets` del CI ([ADR-0008](../adr/0008-sonarcloud-trivy-y-zap-en-el-ci.md)) |

## Qué no cubre el Frontend

La autorización y la validación autoritativa son del Backend ([ADR-0005](../adr/0005-m6-backend-is-the-sole-authorization-authority.md), [ADR-0006](../adr/0006-frontend-security-controls-are-defense-in-depth-only.md)): inyección SQL, control de acceso por rol, subida de archivos y auditoría Tier 2 se evidencian en el Backend.
