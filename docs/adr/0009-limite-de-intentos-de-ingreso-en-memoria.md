# Límite de intentos de ingreso fallidos en memoria, por IP y por cuenta

- **Estado:** aceptada
- **Fecha:** 2026-11-16
- **Reemplaza a:** ninguno
- **Reemplazada por:** ninguno

## Contexto

`POST /api/session/login` solo acotaba los intentos **concurrentes** (5 en vuelo por instancia). Varios intentos fallidos seguidos no recibían 429, así que la fuerza bruta de contraseñas no se frenaba en el BFF. El criterio del Eje D (seguridad) de la cátedra se prueba en vivo. Ver [ADR-0004](0004-owned-bff-session-the-m1-jwt-never-reaches-the-browser.md) (la sesión del BFF) y [ADR-0006](0006-frontend-security-controls-are-defense-in-depth-only.md) (los controles del Frontend son defensa en profundidad; M1 sigue siendo quien autentica).

## Decisión

Un limitador de **ventana fija en memoria** (`src/lib/login-rate-limit.ts`) que cuenta solo las credenciales rechazadas por M1:

- **Por cuenta** (correo normalizado: NFKC, sin espacios, minúsculas): 5 fallos en 15 minutos bloquean la cuenta desde cualquier IP.
- **Por IP**: 20 fallos en 15 minutos bloquean la IP. Es más alto porque detrás de una NAT (una oficina, un colegio) comparten IP muchas personas.
- El bloqueo responde `429` con `Retry-After` (segundos que faltan para que venza la ventana) y el mensaje "Demasiados intentos de ingreso fallidos. Intente nuevamente más tarde." No se llama a M1 mientras dure.
- Un ingreso correcto resetea el contador de la **cuenta**; el de la IP conserva sus fallos.
- No permite enumerar usuarios: una cuenta inexistente y una existente con otra contraseña cuentan igual y devuelven las mismas respuestas (401 y, al sexto intento, 429). Los pedidos mal formados (400) no cuentan.
- **IP del cliente** (`src/lib/client-ip.ts`): `X-Real-IP` o el primer salto de `X-Forwarded-For` **solo** cuando un proxy propio los sobrescribe: en Vercel (`VERCEL` definida) o con `M6_TRUST_PROXY=true`. Fuera de eso se ignoran, porque un cliente podría inventarlos para repartir sus fallos entre IPs falsas; todos comparten entonces la clave `unknown` (el límite por IP es más estricto en conjunto, pero no se puede eludir).
- El mapa tiene un tope de 10.000 claves por tipo (se descartan las vencidas y luego la más antigua) para que enviar correos distintos no agote la memoria.

## Consecuencias

- **Limitación en serverless.** En Vercel cada instancia de la función tiene su propio mapa: los contadores no se comparten ni sobreviven a un arranque en frío o a una nueva versión. Un atacante que reparta pedidos entre instancias obtiene hasta `5 x instancias` intentos por cuenta cada 15 minutos. Es una cota, no un cierre. Para un límite global hace falta un almacén compartido (Upstash/Vercel KV) o el WAF de Vercel (`vercel firewall` con regla de rate limit sobre `/api/session/login`); no se hizo ahora por alcance y por no sumar un servicio nuevo antes de la entrega 4.
- **Bloqueo de cuenta como vector de denegación.** Quien conozca un correo puede bloquearlo 15 minutos con 5 intentos. Se acepta: la ventana es corta, no es permanente y M1 queda como autoridad. El límite por cuenta pesa más que el de IP a propósito.
- **Una sola IP lógica fuera de Vercel.** Sin `M6_TRUST_PROXY`, el límite por IP es global a la instancia (20 fallos / 15 min en total).
- Los límites son constantes en el código (no hay variables de entorno para aflojarlos en producción).

## Alternativas consideradas

- **Almacén compartido (Redis/KV):** correcto para varias instancias, pero agrega un servicio, una credencial y una dependencia en el camino de login; descartado para esta entrega, queda como seguimiento.
- **Solo el WAF/firewall de Vercel:** no es verificable desde el repositorio ni por la cátedra en un clon local, y no distingue cuentas.
- **Confiar siempre en `X-Forwarded-For`:** permite saltearse el límite por IP con un header inventado.
