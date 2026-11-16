# Escaneo dinámico con OWASP ZAP

Evidencia de DAST del Frontend para la entrega 4 (ticket [#925](https://github.com/hllous/Frontend-M6-DAPS2/issues/925), spec [#922](https://github.com/hllous/Frontend-M6-DAPS2/issues/922), protocolo de hallazgos en [Backend #656](https://github.com/hllous/Backend-M6-DAPS2/issues/656)).

## Qué se escanea

El workflow [`dast.yml`](../../.github/workflows/dast.yml) corre a demanda (`workflow_dispatch`) y cada lunes 06:00 UTC. No se engancha al deploy. No hay reglas ignoradas (no hay `rules_file`).

| Job | Modo | Objetivo | Acción |
| --- | --- | --- | --- |
| `zap baseline (Vercel)` | Pasivo (`-a`) | Producción en Vercel. URL de la variable de Actions `ZAP_BASELINE_URL`; si no existe, `https://m6-ambiente-higiene.vercel.app` | `zaproxy/action-baseline@v0.15.0` |
| `zap active (build del CI)` | Activo (`-j -a`), sin autenticar | `next build` + `next start` dentro del job | `zaproxy/action-full-scan@v0.13.0` |

Nunca se lanza un escaneo activo contra Vercel.

La instancia del job activo arranca con `NODE_ENV=production`, donde la app solo admite `real-m1` (`src/instrumentation.ts`). Por eso los "mocks" son el M1 falso (`scripts/fake-m1.mjs`) y el Backend MSW de `scripts/msw-real-m1-backend.mjs`, que solo responde `GET /me`. Una `sitemap.xml` efímera, generada en el job desde el árbol de `src/app`, siembra al spider con cada página y cada ruta GET del BFF.

Corrida archivada: [run 43763194531](https://github.com/hllous/Frontend-M6-DAPS2/actions/runs/43763194531), 15/11/2026, rama `infra/925-zap`. Reportes en `docs/security/zap-2026-11-15/` (`baseline.html|json`, `active.html|json`).

## Resultado

| Job | High | Medium | Low | Informational |
| --- | --- | --- | --- | --- |
| Baseline (Vercel) | 0 | 3 | 7 | 15 |
| Activo (build del CI) | 0 | 2 | 8 | 14 |

**High: 0 en ambos.**

## Alertas Medium y justificación

| Alerta | Job | Estado | Justificación |
| --- | --- | --- | --- |
| Content Security Policy (CSP) Header Not Set (10038) | Baseline y activo | **Gap real, no se justifica como falso positivo** | La app no envía CSP (`next.config.mjs` no define `headers()`). El riesgo de XSS queda cubierto por el escape de React: no hay `dangerouslySetInnerHTML` con datos del usuario; el único uso es `src/components/ui/chart.tsx` (estilos de shadcn con la configuración de colores del propio código). La CSP sería defensa en profundidad. Recomendación: seguimiento aparte para agregar CSP (el inline de Next exige nonce o `'unsafe-inline'`). |
| Missing Anti-clickjacking Header (10020) | Baseline y activo | **Gap real** | No se envía `X-Frame-Options` ni `frame-ancestors`. Las pantallas autenticadas son enmarcables. Recomendación: seguimiento aparte con `frame-ancestors 'self'` o `X-Frame-Options: DENY`. |
| Cross-Domain Misconfiguration (10098) | Baseline | Aceptada | Vercel responde `Access-Control-Allow-Origin: *` solo en los estáticos de `/_next/static/` (CSS y JS públicos del bundle). No sirven datos ni sesión; las rutas BFF no lo envían. |

Los dos primeros no se cierran en este ticket, que es de escaneo, y quedan para decisión del líder. HSTS sí está en producción (`max-age=63072000; includeSubDomains; preload`).

## Resto de alertas

- **Low** (ambos): `X-Content-Type-Options`, `Permissions-Policy`, COEP/COOP/CORP, `X-Powered-By` y *Big Redirect*. Son cabeceras de endurecimiento no enviadas; `X-Powered-By` se puede quitar con `poweredByHeader: false`. *Big Redirect* es el cuerpo de la redirección de `/` y `/app` hacia `/login`, sin datos. *Cookie Slack Detector* (solo activo) aparece en rutas BFF sin sesión y no revela valores.
- **Informational**: *Information Disclosure - Sensitive Information in URL* y *Authentication Request Identified* se disparan con `/login?email=zaproxy@example.com&password=ZAP`, una URL que construye el propio spider al rellenar el formulario por GET; la app envía las credenciales por `POST /api/session/login`.

## Limitaciones declaradas

- **No hay escaneo activo autenticado del Frontend.** El login pasa por M1 real. La superficie de datos autenticada la cubre el ZAP autenticado del Backend ([Backend #659](https://github.com/hllous/Backend-M6-DAPS2/issues/659)).
- En el job activo el Backend simulado solo responde `GET /me`. Las rutas `/api/public/*` devuelven 503 y las protegidas 401: el escaneo ejercita el manejo de errores, las cabeceras y las páginas, no las respuestas con datos.
- El baseline sobre Vercel es pasivo y alcanza solo las páginas públicas.
