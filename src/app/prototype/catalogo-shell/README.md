# Prototipo · catálogo dentro del shell

Este prototipo responde la pregunta del issue #213: ¿las categorías del catálogo deben vivir como estado del destino `catalog` o como rutas anidadas bajo un layout persistente?

## Cómo verlo

```bash
npm run prototype:catalogo-shell
```

Abrir `http://localhost:4315/prototype/catalogo-shell` con una sesión activa.

- `?variant=A&destination=catalog&category=zones` muestra el destino interno. La navegación usa botones y `window.history.replaceState`; el path no cambia.
- `?variant=B` en `/prototype/catalogo-shell/routes/<category>` muestra rutas reales. La navegación usa enlaces de Next y el layout conserva el `AppShell`.
- La barra flotante alterna A/B y también responde a las flechas izquierda/derecha.

Las dos variantes montan el `AppShell` existente y los paneles de catálogo existentes. El código es descartable y queda en esta rama para servir como evidencia de la decisión.

## Decisión

El patrón recomendado es **B · rutas anidadas**. El catálogo reúne recursos administrables que necesitan URLs compartibles, recarga directa e historial del navegador; el layout persistente conserva la navegación institucional y el contexto de sesión.
