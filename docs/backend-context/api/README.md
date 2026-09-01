> **Espejo de solo lectura**, copiado de `Backend/docs/api/README.md` el 2026-09-01. Mantenido acá para tener el modelo de dominio y el estándar de API como contexto en el frontend mientras los endpoints reales del backend todavía no están definidos. Ante cualquier discrepancia, el original en el repo `Backend` es la fuente de verdad — no editar este archivo para cambiar el contrato: corregir en `Backend` y volver a copiar.
>
> Fuera de este espejo (no migrado, son de integración backend-a-backend vía bus de eventos, no algo que el frontend consuma): `docs/eventos/`, `docs/bloqueantes.md`, `Acuerdo-Eventos-M6.md`, `Cruce-Eventos-M6.md`. Los links de este archivo hacia esas rutas no resuelven acá.

# API REST del backend M6

Documentación técnica de la API que expone el backend, para uso del equipo interno.

## Qué hay acá

- [`estandar-swagger.md`](estandar-swagger.md) — convenciones que **todo endpoint debe cumplir** (tags, formato de respuestas, códigos HTTP, autenticación, DTOs). De lectura obligatoria antes de escribir el primer endpoint.
- `endpoints.md` (repo Backend, no mirado acá) — resumen de endpoints REST expuestos por M6. *A completar cuando existan endpoints reales.* Una vez que exista, conviene traer también una copia acá.

## URL pública del Swagger

Cuando el backend esté desplegado, la doc interactiva vive en:

> `https://[url-railway]/api/docs`

*Pendiente: pegar la URL cuando se haga el primer deploy (sprint 1).*

## Convención general

La comunicación entre módulos es **por eventos asincrónicos** — no REST (ver `docs/eventos/` en el repo Backend). REST se usa solo para:

1. Comunicación frontend M6 → backend M6 (uso interno).
2. Casos justificados de consulta síncrona a otros módulos (por ejemplo, consulta de establecimiento a M4 antes de emitir un acta).
