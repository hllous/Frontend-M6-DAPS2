# Límite de intentos de ingreso fallidos (fuerza bruta)

Decisión y fundamentos: [ADR-0009](../adr/0009-limite-de-intentos-de-ingreso-en-memoria.md). Ticket: [#969](https://github.com/hllous/Frontend-M6-DAPS2/issues/969).

## Comportamiento

| Aspecto | Valor |
| --- | --- |
| Ruta | `POST /api/session/login` (modo `real-m1`) |
| Qué cuenta | Credenciales rechazadas por M1 (HTTP 401 del BFF). No cuentan 400, 403, 5xx ni los pedidos mal formados |
| Por cuenta | 5 fallos en 15 minutos (correo normalizado) |
| Por IP | 20 fallos en 15 minutos |
| Respuesta al bloqueo | `429`, `Retry-After: <segundos restantes>`, `Cache-Control: no-store`, sin cookies, mensaje "Demasiados intentos de ingreso fallidos. Intente nuevamente más tarde." |
| Reseteo | Un ingreso correcto limpia el contador de la cuenta; la ventana vence sola a los 15 minutos del primer fallo |
| Enumeración de usuarios | Cuenta inexistente y existente responden igual (401 x5, luego 429) |
| Límite de concurrencia | Se mantiene: 5 intentos en vuelo por instancia (429 con `Retry-After: 5`) |

## De dónde sale la IP

`src/lib/client-ip.ts`. En Vercel la plataforma sobrescribe `X-Forwarded-For` con la IP pública del cliente, así que se usa. Fuera de Vercel el header lo puede enviar cualquiera: se ignora salvo `M6_TRUST_PROXY=true`, que solo debe activarse detrás de un proxy propio que lo sobrescriba. Sin IP confiable, todos comparten la clave `unknown`.

## Limitación en serverless

El estado vive en la memoria de cada instancia. En Vercel pueden coexistir varias instancias y se reinician sin aviso:

- el atacante puede obtener hasta `5 x instancias` intentos por cuenta cada 15 minutos;
- un reinicio (nuevo deploy, arranque en frío) borra los contadores;
- en la demo en vivo, una sola persona probando contra la URL desplegada suele caer en la misma instancia caliente y ve el 429 al sexto intento, pero no está garantizado.

Para un límite global: almacén compartido (Upstash/Vercel KV) o regla de rate limit en el firewall de Vercel. Pendiente como seguimiento, no incluido en la entrega 4.

## Cómo probarlo

```bash
for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -D - -X POST "$URL/api/session/login" \
    -H 'content-type: application/json' -H 'x-requested-with: XMLHttpRequest' \
    -d '{"email":"prueba@example.com","password":"incorrecta"}' | grep -iE '^HTTP|retry-after'
done
```

Los primeros cinco devuelven `401` y el sexto `429` con `Retry-After`. Para volver a probar con la misma cuenta, esperar a que venza la ventana o reiniciar la instancia.

Tests: `src/lib/login-rate-limit.test.ts`, `src/lib/client-ip.test.ts`, `src/app/api/session/login/rate-limit.test.ts` y el e2e `e2e/login-rate-limit.spec.ts` (proyecto `real-m1`).
