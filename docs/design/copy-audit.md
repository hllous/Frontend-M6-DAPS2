# Copy audit

Auditoría de texto visible y texto para lectores de pantalla en toda la aplicación, previa a la implementación por área de la especificación #668 (ticket #669). Es un documento temporal: se elimina cuando aterriza el último ticket de la serie. Las reglas que aplica están en [DESIGN.md](../../DESIGN.md#ux-copy).

Alcance: `src/app/app` y los componentes que renderiza (títulos, subtítulos, cuerpo, etiquetas, placeholders, estados vacíos, toasts, diálogos, validaciones y errores, títulos de página, botones, `aria-label`, `title`, texto solo para lectores de pantalla). Quedan fuera `/prototype`, datos de mock y seed, comentarios y documentación. Solo se listan los textos que rompen una regla; lo que ya cumple no aparece. Las rutas `src/app/api` no se auditan: su texto no se renderiza directamente.

Acciones: **cut** (quitar sin reemplazo), **rephrase** (reescribir), **restructure** (cambia el layout, ver "Propuestas estructurales" del área), **delete** (quitar el elemento completo).

## Decisiones para la persona Product Owner

Aprobadas por el PO el 2026-10-22 en la revisión de este PR: se adoptan todas las recomendaciones, con la marca como texto (sin isotipo; no hay un sello municipal aprobado).

### 1. Nombre de negocio para M3 (derivaciones de reparación)

M3 recibe pedidos de reparación de daños en la vía pública. Candidatos:

| Candidato | Uso en pantalla | Observación |
| --- | --- | --- |
| **Obras Públicas** | "Derivación a Obras Públicas", "Orden de trabajo de Obras Públicas" | Nombre habitual de la secretaría en un municipio; claro para Oficina. |
| Mantenimiento vial | "Derivación a Mantenimiento vial" | Preciso para pavimento y veredas, pero deja afuera luminarias y sumideros que el tipo de daño también cubre. |
| Reparaciones urbanas | "Derivación a Reparaciones urbanas" | Neutro; no coincide con ningún área real del Municipio. |

**Recomendación: Obras Públicas.** Cubre todos los tipos de daño (pavimento, vereda, luminaria, sumidero, estructura) y es el nombre que Oficina ya usa al hablar con esa área.

### 2. Nombre de negocio para M7 (cortes de calle)

M7 aprueba, rechaza y da por finalizados los cortes de calle. Candidatos:

| Candidato | Uso en pantalla | Observación |
| --- | --- | --- |
| **Tránsito** | "Solicitud enviada a Tránsito", "Tránsito rechazó el corte" | Ya aparece en un placeholder actual ("rechazo de corte de calle por Tránsito"). Corto. |
| Movilidad y Tránsito | "Solicitud enviada a Movilidad y Tránsito" | Más formal, más largo; sirve si la secretaría se llama así. |
| Control de Tránsito | "Solicitud enviada a Control de Tránsito" | Acota a fiscalización; el corte de calle es una decisión de gestión. |

**Recomendación: Tránsito.**

### 3. Otros códigos de módulo que aparecen en pantalla

Rompen la regla 2 igual que M3 y M7. Propuesta única para todo el producto:

| Código | Dónde aparece | Propuesta |
| --- | --- | --- |
| M1 | Cuadrillas ("referencia M1", "Usuario M1 no resuelto"), login | Quitar el código. "Persona" / "Organización" en los selectores; "Persona no encontrada" cuando no se resuelve. |
| M2 | Reclamo en Servicios y expedientes ambientales | **Atención al Vecino**; cuando se pueda, solo "reclamo". |
| M4 | Resolución del acta de infracción | **Faltas** ("Resolución de Faltas"). |
| M6 | Título de pestaña, metadatos, logo del login, textos de Derivaciones | Dejar de nombrar al sistema; cuando haga falta, "el sistema". Para la marca: "Ambiente e Higiene". |

### 4. Vocabulario único

Todas las áreas usan el mismo reemplazo para el mismo concepto:

| Concepto | Texto en pantalla |
| --- | --- |
| `workOrderId` | Nº de orden de trabajo |
| `closureId` | Nº de corte |
| `ticketId` / UUID del ticket | Nº de reclamo |
| Zona (siempre) | Solo el nombre ("Belgrano"); el código solo en el alta y la edición de zona |
| "servicio", "cuadrilla", "asignación", "recorrido", "turno" | En minúscula en texto corrido, como fija DESIGN.md |
| Servicio POINT / ROUTE | "servicio puntual" / "servicio de recorrido" |
| Error de carga | "No se pudo cargar {objeto}. Intente nuevamente." Si el reintento no alcanza: "Si el problema continúa, avise a soporte." |
| Sin conexión (borrador) | "Sin conexión. Se guardó en este dispositivo; reenvíe cuando vuelva la conexión." |
| Servidor, backend, versión | No se nombran nunca |
| Baja lógica | "Dar de baja" (acción) y "dado de baja" (estado) |
| Solo consulta | "Solo consulta" una vez por pantalla, sin frase explicativa |

### 5. Decisiones menores

- **Marca "M6" en el login y en el título de pestaña.** Se sustituye el cuadrado "M6" por el logotipo de texto "Ambiente e Higiene" (sin isotipo ni sello) y las pestañas se titulan "Ambiente e Higiene — {pantalla}".
- **Línea "Sesión operativa" del shell.** Se elimina (no informa nada que el usuario no sepa).
- **Tablas del catálogo con columna Código.** Se mantienen (el código identifica contenedores, puntos verdes, tipos y sitios); solo se quita el código de **zona**.

## Resumen por área

Los totales de cada área cuentan las filas de las tablas de copy; las propuestas estructurales se cuentan aparte.

| Área | Filas señaladas (un texto o un grupo de textos relacionados) | Propuestas estructurales |
| --- | --- | --- |
| 1. Shell, navegación y login | 28 | 3 |
| 2. Servicios — Oficina | 142 | 9 |
| 3. Servicios — Campo | 58 | 5 |
| 4. Derivaciones | 46 | 6 |
| 5. Reportes ambientales | 60 | 6 |
| 6. Mapa operativo | 39 | 4 |
| 7. Catálogo | 158 | 8 |
| 8. Indicadores | 21 | 3 |

---

## 1. Shell, navegación y login

### Metadatos de página

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `src/app/layout.tsx:7` | "M6 — Ambiente e Higiene" (título) | rephrase | "Ambiente e Higiene" |
| `src/app/layout.tsx:7` | "Frontend del Módulo 6 — Ambiente, Higiene y Servicios Urbanos. Municipalidad UADE." (descripción) | rephrase | "Ambiente, Higiene y Servicios Urbanos" |
| `src/app/app/catalog/layout.tsx:4` | "M6 — Catálogo" | rephrase | "Catálogo — Ambiente e Higiene" |
| `src/app/app/page.tsx:24` | "M6 — {destino}" | rephrase | "{destino} — Ambiente e Higiene" |
| `src/components/shell/app-shell.examples.tsx:17` | `document.title = "M6 — Ambiente e Higiene"` | rephrase | "Ambiente e Higiene" |

### Login (`src/components/auth/login-form.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `login-form.tsx:56` | Cuadrado con "M6" | restructure | Logotipo de texto "Ambiente e Higiene" (sin isotipo ni sello) |
| `login-form.tsx:58` | "Ambiente y servicios" (sobretítulo) | delete | — |
| `login-form.tsx:60` | "Ingresar al sistema operativo" | rephrase | "Ingresar" |
| `login-form.tsx:63` | "Seleccione un escenario de trabajo para abrir una sesión protegida." | cut | — (el selector se explica solo) |
| `login-form.tsx:70` | "La autenticación real de M1 no está disponible hasta publicar su contrato." | rephrase | "El ingreso no está disponible por el momento." |
| `login-form.tsx:77` | "Escenario operativo" (etiqueta y `aria-label` en :83) | rephrase | "Perfil" |
| `login-form.tsx:94` | "El alcance de la sesión se limita al escenario elegido." | delete | — |
| `login-form.tsx:39` | "No se pudo iniciar la sesión." | rephrase | "No se pudo ingresar. Intente nuevamente." |
| `login-form.tsx:44` | "No se pudo conectar con la sesión local. Vuelva a intentarlo." | rephrase | "No se pudo ingresar. Revise la conexión e intente nuevamente." |

### Marco de navegación (`src/components/shell/app-shell.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `app-shell.tsx:230-232` | Etiqueta "Sesión operativa" (`aria-label` "Estado de sesión") | delete | — |
| `app-shell.tsx:299` y `:307` | "Más módulos" (botón `aria-label` y título de la hoja) | rephrase | "Más" |
| `app-shell.tsx:308` | "Seleccione un módulo disponible para su sesión." | delete | — |
| `app-shell.tsx:435` | "Priorice y coordine" (sobretítulo de Mi trabajo) | delete | — |
| `app-shell.tsx:453` | Insignia "Requiere revisión" en cada ítem sin acción | cut | Quitar la insignia; solo se marca el ítem que sí tiene acción |
| `app-shell.tsx:472` | "Cargando decisiones de arbolado…" | rephrase | "Cargando intervenciones de arbolado…" |
| `app-shell.tsx:423` | "No se pudo cargar la cola de autorizaciones. Intente nuevamente más tarde." | rephrase | "No se pudieron cargar las autorizaciones pendientes. Intente nuevamente." |

### Estados compartidos (`shell-states.tsx`, `zones-panel.tsx`, `routes-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `shell-states.tsx:9` | "No se pudo cargar el escenario" | rephrase | "No se pudo cargar la pantalla" |
| `shell-states.tsx:10`, `zones-panel.tsx:69`, `routes-panel.tsx:69` | "Verifique la conexión local y vuelva a intentarlo." | rephrase | "Revise la conexión e intente nuevamente." |
| `shell-states.tsx:16` | "Su sesión no cuenta con la capacidad necesaria para este módulo." | rephrase | "No tiene permiso para ver esta sección." |
| `shell-states.tsx:17` | "La aplicación operativa requiere una sesión activa." (+ botón "Volver a iniciar sesión") | cut | Solo el botón "Iniciar sesión" |
| `zones-panel.tsx:92` | "{código} — {nombre}" | rephrase | "{nombre}" (regla 3) |
| `zones-panel.tsx:79` | "No hay zonas registradas para mostrar." | cut | Solo el título "Sin zonas operativas" |
| `routes-panel.tsx:79` | "No hay recorridos registrados para mostrar." | cut | Solo el título "Sin recorridos" |

### Propuestas estructurales — Shell, navegación y login

- **Login de una sola decisión.** Quitar sobretítulo, subtítulo y ayuda del selector deja título, selector y botón; el formulario cabe sin desplazar en el celular.
- **Mi trabajo sin insignias de relleno.** La insignia "Requiere revisión" se repite en cada ítem; solo el ítem con acción lleva marca.
- **Más como hoja sin descripción.** La hoja "Más" muestra únicamente los enlaces.

---

## 2. Servicios — Oficina

### Espacio de trabajo (`services-workspace.tsx`, `services-table.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `services-workspace.tsx:1013` | "Servicios Urbanos" (título) | rephrase | "Servicios" |
| `services-workspace.tsx:347` | "Error del servidor ({estado}): {mensaje}" | rephrase | "No se pudieron cargar los servicios. Intente nuevamente." |
| `services-workspace.tsx:336` | "El período tiene demasiados servicios; acote el período." | rephrase | "Hay demasiados servicios en el período. Elija un período más corto." |
| `services-workspace.tsx:682` | "No se pudo consultar la respuesta de M7." | rephrase | "No se pudo consultar el estado del corte. Intente nuevamente." |
| `services-workspace.tsx:535` | "No se pudo cargar el detalle del servicio." | rephrase | "No se pudo cargar el servicio. Intente nuevamente." |
| `services-workspace.tsx:559`, `field-work-panel.tsx:171` | "No se pudieron cargar las derivaciones de este Servicio." | rephrase | "No se pudieron cargar las derivaciones." |
| `services-workspace.tsx:1130` | "No se pudieron actualizar los servicios. Se mantienen los resultados anteriores." | rephrase | "No se pudo actualizar. Se muestran los datos anteriores." |
| `services-workspace.tsx:1051` | `aria-label` "Limpiar todos los filtros aplicados" | rephrase | "Limpiar filtros" |
| `services-workspace.tsx:1028` | `aria-label` "Buscar servicios por texto libre" | rephrase | "Buscar servicios" |
| `services-workspace.tsx:1068` | `aria-label` "Programar nuevo servicio" | rephrase | "Programar servicio" |
| `services-workspace.tsx:1178` | `aria-label` "Ajustar ancho entre mapa y tabla" | rephrase | "Ajustar ancho del mapa" |
| `services-workspace.tsx:873` | "Este servicio está fuera del período seleccionado." | rephrase | "Fuera del período elegido." |
| `services-table.tsx:592` | "{columna}. Arrastre para reordenar. Use Alt y las flechas izquierda o derecha para mover." | cut | Mantener el atajo solo en `aria-keyshortcuts`; el nombre accesible queda "{columna}" |
| `services-table.tsx:897-898` | "No hay servicios que coincidan con los filtros aplicados." / "No hay servicios para mostrar en este período." | rephrase | "Sin servicios con esos filtros." / "Sin servicios en este período." |
| `services-table.tsx:568` | `aria-label` "Servicios operativos" | rephrase | "Servicios" |
| `services-table.tsx:576` | `aria-label` "Número de parada" | rephrase | "Orden" |

### Vista de mapa (`map-view.tsx`, `services-map-canvas.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `map-view.tsx:21-22` | "Preparando mapa geográfico" | rephrase | "Cargando mapa…" |
| `map-view.tsx:75` | "No se pudo cargar la información territorial. Revise la conexión e intente nuevamente." | rephrase | "No se pudo cargar el mapa. Intente nuevamente." |
| `map-view.tsx:131-135` | "No se pudo cargar el mapa" + "La tabla de servicios permanece completamente disponible y operativa. El mapa es una vista complementaria." | cut | Solo título y botón "Reintentar" |
| `map-view.tsx:141` | "Reintentar mapa" | rephrase | "Reintentar" |
| `map-view.tsx:148` | "Cargando mapa territorial…" | rephrase | "Cargando mapa…" |
| `map-view.tsx:109` | `aria-label` "Mapa territorial de Servicios" | rephrase | "Mapa de servicios" |
| `map-view.tsx:156` | `aria-label` "Servicios disponibles mientras carga el mapa" | delete | — |
| `services-map-canvas.tsx:269` | `aria-label` "Mapa geográfico de servicios operativos" | rephrase | "Mapa de servicios" |
| `services-map-canvas.tsx:287` | "{código} · {nombre}" (zona en el popup) | rephrase | "{nombre}" |
| `services-map-canvas.tsx:66` | "Ubicación resuelta" | rephrase | "Ubicación" |

### Programar servicio (`schedule-service-dialog.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `schedule-service-dialog.tsx:393` | "Programar servicio vinculado" / "Programar nuevo servicio" | rephrase | "Programar servicio" |
| `schedule-service-dialog.tsx:397-398` | "Programación vinculada a un evento u origen externo. El origen se preserva sin requerir reingreso." / "Defina el tipo de servicio, cobertura territorial y ventana horaria. Nace sin cuadrilla ni vehículo asignados." | cut | — |
| `schedule-service-dialog.tsx:423` | "Origen vinculado preservado" | cut | Mostrar solo el dato ("Reclamo 1234") |
| `schedule-service-dialog.tsx:430` | "UUID del ticket de M2" | rephrase | "Nº de reclamo" |
| `schedule-service-dialog.tsx:439` | "Pegue el UUID técnico del expediente. El formato TK-… es publicId y no sirve para correlacionar eventos." | cut | Placeholder: "Pegue el Nº de reclamo" |
| `schedule-service-dialog.tsx:301`, `:306` | "Debe indicar el UUID técnico del reclamo." / "El ticketId debe ser un UUID válido. El identificador TK-… es publicId y no reemplaza el UUID técnico." | rephrase | "Indique el Nº de reclamo." / "El Nº de reclamo no es válido." |
| `schedule-service-dialog.tsx:311`, `:316`, `:321` | "El identificador de inspección es obligatorio." / "…debe ser el UUID de la inspección." / "El identificador de alerta meteorológica es obligatorio." | rephrase | "Indique la inspección." / "La inspección no es válida." / "Indique la alerta meteorológica." |
| `schedule-service-dialog.tsx:381` | "Manual (operación a demanda)" / "Planificado (programa regular de servicio)" | rephrase | "Manual" / "Planificado" |
| `schedule-service-dialog.tsx:495` | "Modo determinado por el catálogo:" | cut | Mostrar solo el modo ("Recorrido" / "Puntual") |
| `schedule-service-dialog.tsx:63` | "Ubicación suelta (sin bien del inventario)" | rephrase | "Otra ubicación" |
| `schedule-service-dialog.tsx:600`, `:613` | "Bien del inventario" / "Seleccione un bien…" | rephrase | "Elemento" / "Seleccione un elemento" |
| `schedule-service-dialog.tsx:629`, `:632`, `:638` | "Buscando en el inventario…" / "No hay bienes que coincidan con la búsqueda." / "No se pudo consultar el inventario. Cambie la búsqueda para reintentar." | rephrase | "Buscando…" / "Sin resultados." / "No se pudo buscar. Intente nuevamente." |
| `schedule-service-dialog.tsx:634` | "La zona del servicio se deriva del bien elegido." | cut | Mostrar solo "Zona: {nombre}" |
| `schedule-service-dialog.tsx:683` | "Sin bien del inventario el servicio se ubica por zona; la referencia queda en las notas." | cut | — |
| `schedule-service-dialog.tsx:721` | "Notas e instrucciones operativas (opcional)" | rephrase | "Notas (opcional)" |
| `schedule-service-dialog.tsx:728` | "Instrucciones especiales para la cuadrilla o restricciones de acceso…" | rephrase | "Indicaciones para la cuadrilla" |
| `schedule-service-dialog.tsx:736` | "El servicio se creará en estado Programado sin cuadrilla ni vehículo asignados. La asignación operativa se realiza posteriormente en el despacho." | delete | — |
| `schedule-service-dialog.tsx:67` | "La fecha programada debe ser hoy o una fecha posterior en Argentina." | rephrase | "La fecha debe ser hoy o posterior." |
| `schedule-service-dialog.tsx:279` | "No hay un tipo de servicio activo para programar. Cree o active uno en Catálogo > Tipos de servicio." | rephrase | "No hay tipos de servicio activos. Active uno en Catálogo." |
| `schedule-service-dialog.tsx:413` | "No se pudieron cargar los tipos de servicio, recorridos y zonas. Cierre este diálogo y vuelva a intentarlo." | rephrase | "No se pudo cargar el formulario. Ciérrelo e intente nuevamente." |
| `schedule-service-dialog.tsx:343-344` | "El recorrido seleccionado no tiene paradas con zona asignada." / "Debe seleccionarse al menos una zona para el servicio." | rephrase | "El recorrido no tiene zonas." / "Seleccione al menos una zona." |

### Asignar cuadrilla (`assign-crew-dialog.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `assign-crew-dialog.tsx:234` | "Despacho y asignación operativa" (sobretítulo) | delete | — |
| `assign-crew-dialog.tsx:238` | "Asigne la cuadrilla operativa y los recursos vehiculares requeridos para la ejecución territorial del servicio." | delete | — |
| `assign-crew-dialog.tsx:298` | "Cargando cuadrillas, vehículos y requisitos del tipo de servicio…" | rephrase | "Cargando…" |
| `assign-crew-dialog.tsx:359` | "Equipo municipal o de cooperativa responsable de la ejecución del servicio." | delete | — |
| `assign-crew-dialog.tsx:405-406` | "Requerido por la especificación técnica del tipo de servicio (ej. recolección o barrido mecánico)." / "Opcional según los requerimientos operativos de la cuadrilla para este tipo de servicio." | delete | La etiqueta "Vehículo obligatorio" / "Vehículo opcional" alcanza |
| `assign-crew-dialog.tsx:415` | "Aviso de superposición horaria" | rephrase | "Se superpone con otro servicio" |
| `assign-crew-dialog.tsx:439` | "Se puede asignar igual, pero hay que justificar por qué: la justificación queda registrada con la asignación." | rephrase | "Justifique la asignación." |
| `assign-crew-dialog.tsx:167`, `:173` | "Debe seleccionar una cuadrilla asignada." / "El tipo de servicio requiere la asignación obligatoria de un vehículo operativo." | rephrase | "Seleccione una cuadrilla." / "Seleccione un vehículo." |
| `assign-crew-dialog.tsx:179` | "Hay un solapamiento: justifique la asignación en al menos {n} caracteres." | rephrase | "Escriba al menos {n} caracteres." |
| `assign-crew-dialog.tsx:203` | "El servicio cambió desde que abrió esta ventana. Actualice la lista e intente de nuevo." | rephrase | "El servicio cambió. Actualice la lista e intente nuevamente." |
| `assign-crew-dialog.tsx:136`, `:209` | "No se pudieron cargar los datos de la asignación." / "Ocurrió un error al procesar la asignación de recursos." | rephrase | "No se pudo cargar el formulario. Intente nuevamente." / "No se pudo asignar. Intente nuevamente." |
| `assign-crew-dialog.tsx:426` | `backendConflict` (mensaje de conflicto sin reescribir) | rephrase | Mostrar mensaje propio: "Otra asignación ocupa esa cuadrilla en el mismo horario." |

### Reprogramar y cancelar

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `reschedule-reason-dialog.tsx:98` | "Paso 1 de 2 · Motivo de reprogramación" | rephrase | "Reprogramar · Paso 1 de 2" |
| `reschedule-reason-dialog.tsx:103` | "…horaria. Las zonas asignadas se conservan sin cambios." | delete | — |
| `reschedule-reason-dialog.tsx:132` | "Ej. Alerta meteorológica, rechazo de corte de calle por Tránsito…" | rephrase | "Ej. Alerta meteorológica" |
| `reschedule-reason-dialog.tsx:135` | "La nueva fecha y ventana horaria se definen en un segundo paso, una vez confirmado el motivo." | delete | — |
| `reschedule-reason-dialog.tsx:152` | "Mover a reprogramar" | rephrase | "Continuar" |
| `reschedule-reason-dialog.tsx:72`, `:86` | "Debe indicar el motivo de la reprogramación." / "Ocurrió un error al reprogramar el servicio." | rephrase | "Indique el motivo." / "No se pudo reprogramar. Intente nuevamente." |
| `confirm-reschedule-dialog.tsx:116` | "Paso 2 de 2 · Nueva fecha y ventana" | rephrase | "Reprogramar · Paso 2 de 2" |
| `confirm-reschedule-dialog.tsx:120-121` | "Motivo registrado: {motivo}. El servicio volverá a estado Programado con la fecha y ventana horaria que indique aquí." | rephrase | "Motivo: {motivo}" |
| `confirm-reschedule-dialog.tsx:82`, `:104` | "Seleccione la nueva fecha del servicio." / "Ocurrió un error al confirmar la nueva fecha del servicio." | rephrase | "Seleccione la nueva fecha." / "No se pudo confirmar la fecha. Intente nuevamente." |
| `cancel-service-dialog.tsx:98` | "Cancelación de servicio" (sobretítulo) | delete | — |
| `cancel-service-dialog.tsx:104` | "…; al estar a reprogramar, se cancela directamente sin requerir una nueva fecha." | delete | — |
| `cancel-service-dialog.tsx:134` | "Ej. Solicitud del cliente, servicio duplicado, ya no es necesario…" | rephrase | "Ej. Servicio duplicado" |
| `cancel-service-dialog.tsx:136` | "Obligatorio. Esta acción no se puede deshacer." | rephrase | "Esta acción no se puede deshacer." |
| `cancel-service-dialog.tsx:72`, `:86` | "Debe indicar el motivo de la cancelación." / "Ocurrió un error al cancelar el servicio." | rephrase | "Indique el motivo." / "No se pudo cancelar. Intente nuevamente." |
| `cancel-service-dialog.tsx:158` | "Cancelar servicio" (botón de confirmación junto a "Cancelar") | rephrase | "Confirmar cancelación" |

### Suspender servicio (`suspend-service-dialog.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `suspend-service-dialog.tsx:349` | "Suspensión de servicio en curso" (sobretítulo) | delete | — |
| `suspend-service-dialog.tsx:357` | "Registre el motivo de la interrupción. El servicio pasará a estado Suspendido hasta que la persona responsable de la cuadrilla lo reanude." | rephrase | "Registre el motivo. La cuadrilla podrá reanudarlo." |
| `suspend-service-dialog.tsx:356` | "La suspensión se registró. Revise el estado de la evidencia y reintente las cargas pendientes." | rephrase | "Suspendido. Reintente los archivos pendientes." |
| `suspend-service-dialog.tsx:454` | "Describa la causa de la interrupción y cualquier detalle relevante para Oficina…" | rephrase | "Describa la causa" |
| `suspend-service-dialog.tsx:467` | "Archivos de evidencia" (título) junto a "Evidencia adjunta" (:469) | cut | Dejar solo "Evidencia adjunta" |
| `suspend-service-dialog.tsx:473-474` | "Los archivos que no se hayan subido conservan su estado y pueden reintentarse." / "Opcional, cuando sea aplicable (ej. fotografía del desperfecto o del obstáculo)." | rephrase | "Opcional. Foto del problema." |
| `suspend-service-dialog.tsx:294`, `:319` | "Seguimos sin conexión. El borrador se conserva en este dispositivo…" / "No se pudo conectar con el servidor. La suspensión quedó guardada como borrador local…" | rephrase | Texto estándar de sin conexión (ver Decisión 4) |
| `suspend-service-dialog.tsx:178` | "Error al subir el archivo" | rephrase | "No se pudo subir el archivo. Intente nuevamente." |
| `suspend-service-dialog.tsx:258`, `:263` | "Debe seleccionar un motivo de suspensión." / "Debe indicar una nota describiendo la suspensión." | rephrase | "Seleccione un motivo." / "Describa la suspensión." |
| `suspend-service-dialog.tsx:616` | "Los archivos pendientes no se enviarán y se quitarán de esta ventana. El servicio ya está suspendido." | rephrase | "Los archivos pendientes no se enviarán." |

### Detalle del servicio (`service-detail.tsx`, `service-preview.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `service-detail.tsx:233` | "Detalle operativo" (cabecera) y `sr-only` en `:241` "Detalle operativo del servicio" | delete | — |
| `service-detail.tsx:246`, `:251` | "Servicio en Recorrido" / "Servicio en Punto" | rephrase | "Recorrido" / "Puntual" |
| `service-detail.tsx:273` | "Motivo de estado" | rephrase | "Motivo" |
| `service-detail.tsx:284`, `:287` | `aria-label` "Verificando dependencia de corte de calle" / "Verificando la respuesta de M7 antes de habilitar la ejecución…" | rephrase | "Verificando el corte de calle…" |
| `service-detail.tsx:310-314` | "Corte de calle pendiente" + "Servicio en Recorrido no puede ejecutarse parcialmente." | rephrase | "Corte de calle pendiente de Tránsito" |
| `service-detail.tsx:326-327` | "Corte de calle aprobado por M7" + "El Servicio puede iniciar. Su estado permanece sin cambios hasta ejecutar la acción." | rephrase | "Corte de calle aprobado" (sin descripción) |
| `service-detail.tsx:339` | "La dependencia quedó liberada; el estado del Servicio no se reabre ni se modifica." | rephrase | "Corte de calle finalizado" (sin descripción) |
| `service-detail.tsx:355` | "El corte aprobado venció sin activarse. Si el Servicio no había iniciado, quedó para reprogramar." | rephrase | "El corte venció sin usarse." |
| `service-detail.tsx:372` | "M7 rechazó la solicitud. Oficina debe decidir explícitamente si reprogramar o cancelar el Servicio." | rephrase | "Tránsito rechazó el corte. Reprograme o cancele el servicio." |
| `service-detail.tsx:378`, `:383` | "Reprogramar servicio por rechazo de corte" / "Cancelar servicio por rechazo de corte" | rephrase | "Reprogramar" / "Cancelar servicio" |
| `service-detail.tsx:418`, `:451` | "No se pudo conectar con el servidor al iniciar/reanudar el servicio. La acción se conservó en…" | rephrase | Texto estándar de sin conexión |
| `service-detail.tsx:432`, `:465` | "Error al iniciar servicio" / "Error al reanudar servicio" | rephrase | "No se pudo iniciar el servicio." / "No se pudo reanudar el servicio." |
| `service-detail.tsx:478`, `:517` | "Cuadrilla asignada" / "Vehículo operativo" | rephrase | "Cuadrilla" / "Vehículo" |
| `service-detail.tsx:496` | "Asignación vigente" / "Pendiente de coordinación" | rephrase | Quitar "Asignación vigente"; "Sin asignar" |
| `service-detail.tsx:523` | "Vehículo asignado" / "Patente no disponible" / "Sin requerimiento especial" | rephrase | Mostrar solo la patente; "Sin vehículo" si no hay |
| `service-detail.tsx:510` | "Ventana: No establecida" | rephrase | "Horario: sin definir" |
| `service-detail.tsx:530` | "Alcance y delimitación territorial" | rephrase | "Zonas" |
| `service-detail.tsx:557` | "Bien de inventario / Objetivo:" (`:551`) y "Reclamo ciudadano (M2):" | rephrase | "Objetivo" / "Reclamo" |
| `service-detail.tsx:568` | "Notas operativas de despacho" | rephrase | "Notas" |
| `service-detail.tsx:584`, `:587` | "Derivaciones de reparación" + "Seguimiento de daños referidos a M3 desde este Servicio." | cut | Solo el título "Derivaciones" |
| `service-detail.tsx:596`, `:598` | "Este Servicio todavía no tiene derivaciones de reparación." / `aria-label` "Derivaciones de reparación del Servicio" | rephrase | "Sin derivaciones." / "Derivaciones" |
| `service-detail.tsx:608`, `:610`, `:611` | "Daño:" / "Ubicación:" / "Riesgo público:" | rephrase | Valor sin prefijo repetido; "Riesgo" solo cuando es "Sí" |
| `service-detail.tsx:645` | "Contexto relacionado" | rephrase | "Relacionado" |
| `service-detail.tsx:660` | "Objetivo" / "Árboles vinculados" | rephrase | "Árboles" |
| `service-preview.tsx:127` | "No definida" (ventana) | rephrase | "Sin definir" |
| `service-preview.tsx:136`, `service-detail.tsx:520` | "No asignado" / "Sin vehículo" | rephrase | "Sin vehículo" en ambos |
| `service-preview.tsx:144`, `:155` | "Notas operativas" / "Historial de cambios" | rephrase | "Notas" / "Historial" |
| `service-preview.tsx:204` | "Ver detalle completo" | rephrase | "Ver detalle" |
| `service-preview.tsx:82` | `aria-label` "Cerrar vista previa" | rephrase | "Cerrar" |

### Derivaciones desde el servicio

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `create-repair-request-dialog.tsx:348` | "Crear derivación de reparación" | rephrase | "Derivar a Obras Públicas" |
| `create-repair-request-dialog.tsx:351` | "Registre el daño de infraestructura observado durante la inspección. La inspección permanece como fuente canónica de la derivación." | cut | — |
| `create-repair-request-dialog.tsx:352` | "Registre el daño de infraestructura que será referido a M3. La derivación conserva al Servicio como su Referral context." | cut | — |
| `create-repair-request-dialog.tsx:366` | "Ver inspección fuente" / "Ver Servicio fuente" | rephrase | "Ver inspección" / "Ver servicio" |
| `create-repair-request-dialog.tsx:377-382` | "Verificando el estado de la derivación" / "No se pudo verificar el estado" / "Derivación sin enviar" / "Unsent referral" | rephrase | "Verificando…" / "No se pudo verificar" / "Sin enviar" / (quitar el texto en inglés) |
| `create-repair-request-dialog.tsx:386-391` | "Comprobando si el Servicio ya tiene una derivación de este tipo." / "No vuelva a enviar hasta confirmar si la derivación quedó registrada." / "No se recibió confirmación del envío. Los valores quedaron retenidos en este dispositivo." / "No se recibió confirmación del envío y no se encontró una derivación del mismo tipo creada desde que se preparó el borrador." | rephrase | Dejar una sola frase según el caso: "No se pudo confirmar el envío. Verifique antes de reenviar." |
| `create-repair-request-dialog.tsx:401-402` | "Derivación ya registrada." / "Derivación creada y pendiente de respuesta de M3." | rephrase | "Ya estaba derivada." / "Derivada a Obras Públicas." |
| `create-repair-request-dialog.tsx:147`, `:282`, `:304`, `:316` | "La derivación de reparación ya está registrada." / "Derivación de reparación creada." | rephrase | "Ya estaba derivada." / "Derivación creada." |
| `create-repair-request-dialog.tsx:163`, `:191`, `:261` | "No se pudo verificar si la derivación ya quedó registrada. Verifique el estado antes de volver a enviarla." | rephrase | "No se pudo confirmar el envío. Verifique antes de reenviar." |
| `create-repair-request-dialog.tsx:323` | "No se pudo crear la derivación." | rephrase | "No se pudo derivar. Intente nuevamente." |
| `create-repair-request-dialog.tsx:438` | "Indique una dirección o referencia legible para M3." | cut | — |
| `create-repair-request-dialog.tsx:458`, `:468`, `:472` | "¿Implica riesgo para la seguridad pública? \*" + "Sí, implica riesgo para la seguridad pública" / "No implica riesgo para la seguridad pública" | rephrase | "Riesgo para la seguridad pública \*" + "Sí" / "No" |
| `create-repair-request-dialog.tsx:475` | "Este dato se registra de forma independiente a la severidad." | delete | — |
| `create-repair-request-dialog.tsx:486` | `actionLabel` "derivación de reparación" | rephrase | "derivación" |
| `create-repair-request-dialog.tsx:506` | "Cerrar confirmación" | rephrase | "Cerrar" |
| `create-repair-request-dialog.tsx:511-516` | "Verificando y enviando..." / "Verificando estado..." / "Verificar y reenviar derivación" / "Crear derivación a M3" | rephrase | "Enviando…" / "Verificando…" / "Verificar y reenviar" / "Derivar" |
| `create-street-closure-request-dialog.tsx:274` | "Solicitar corte de calle" | rephrase | "Solicitar corte de calle a Tránsito" |
| `create-street-closure-request-dialog.tsx:283-295` | "Solicitud pendiente" + "M6 creó el registro. Queda pendiente la respuesta de M7 y el Servicio conserva este contexto." / "M6 creó el registro desde la intervención autorizada. Queda pendiente la respuesta de M7." | rephrase | "Solicitud enviada" + "Tránsito debe responder." |
| `create-street-closure-request-dialog.tsx:303` | "Solicitud sin enviar" | rephrase | "Sin enviar" |
| `create-street-closure-request-dialog.tsx:316` | "{id} · {n} árbol vinculado · Estado autorizada" | rephrase | "{n} árbol · Autorizada" |
| `create-street-closure-request-dialog.tsx:232`, `:255` | "Solicitud de corte creada y pendiente de respuesta de M7." | rephrase | "Solicitud de corte enviada a Tránsito." |
| `create-street-closure-request-dialog.tsx:237` | "No se pudo crear la solicitud." | rephrase | "No se pudo enviar la solicitud. Intente nuevamente." |
| `create-street-closure-request-dialog.tsx:197`, `:209` | "Se agregó un tramo afectado." / "Se quitó el tramo afectado {n}." | cut | Sin toast: el cambio se ve en el formulario |
| `create-street-closure-request-dialog.tsx:348` | "Explique por qué el Servicio necesita el corte" / "…la intervención de arbolado necesita el corte" | rephrase | "Motivo del corte" |
| `create-street-closure-request-dialog.tsx:366` | "El tipo describe la solicitud enviada a M7, no una decisión de M7." | delete | — |
| `create-street-closure-request-dialog.tsx:421-422` | "La ventana se prefija desde el Servicio cuando existe, pero debe revisarse y puede editarse antes del envío." / "Indique la ventana que M6 solicitará a M7. Puede editarla antes del envío." | delete | — |
| `create-street-closure-request-dialog.tsx:451`, `:462` | "Desde calle transversal \*" / "Hasta calle transversal \*" | rephrase | "Desde calle \*" / "Hasta calle \*" |
| `create-street-closure-request-dialog.tsx:479`, `:483`, `:490` | `aria-label` "Quitar tramo afectado {n}" / "Quitar tramo" / "Agregar tramo afectado" | rephrase | "Quitar tramo {n}" / "Quitar" / "Agregar tramo" |
| `create-street-closure-request-dialog.tsx:502` | "Crear solicitud de corte" | rephrase | "Enviar solicitud" |

### Propuestas estructurales — Servicios, Oficina

- **Programar servicio, secciones colapsables.** Hoy el formulario muestra origen, tipo, modo, objetivo, zona, fecha, notas y cuatro textos de ayuda a la vez. Propuesta: tipo, objetivo, fecha y horario siempre visibles; origen, notas y dirección alternativa dentro de "Más datos".
- **Fusionar origen y reclamo.** "Origen del servicio" y el campo de reclamo vinculado son un solo dato; mostrar el reclamo solo cuando el origen es "Reclamo".
- **Asignar cuadrilla sin bloque de ayuda.** Eliminar los tres párrafos de descripción; la fila "Fecha / Horario / Zonas" del servicio se mantiene arriba como contexto.
- **Reprogramar en un solo diálogo.** Los dos pasos ("motivo" y "nueva fecha") se funden en uno: motivo y fecha juntos. Quita el "Paso 1/2" y las frases que explican el segundo paso.
- **Detalle del servicio.** Los cinco mensajes del corte de calle (verificando, pendiente, aprobado, finalizado, vencido, rechazado) pasan a una sola insignia de estado con un renglón; solo "rechazado" conserva texto de acción.
- **Eliminar el ítem "Detalle operativo"** y el sobretítulo "Servicio en Recorrido / Punto": el modo ya se ve en el tipo de servicio.
- **Derivaciones del servicio.** La sección de derivaciones se reduce a una lista con estado y destino; el subtítulo "Seguimiento de daños…" se elimina.
- **Solicitud de corte de calle.** Los tramos afectados salen del formulario principal y se agregan con "Agregar tramo"; se quitan los toasts de alta/baja de tramo.
- **Mapa de servicios.** Quitar el aviso de que la tabla sigue operativa y el `aria-label` de "Servicios disponibles mientras carga el mapa".

---

## 3. Servicios — Campo

### Mi trabajo y servicios asignados (`field-work-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `field-work-panel.tsx:265` | "Turno en curso" (sobretítulo) | delete | — |
| `field-work-panel.tsx:281` | "No hay servicios asignados para su cuadrilla en este turno." | rephrase | "Sin servicios asignados." |
| `field-work-panel.tsx:334` | "Aviso: Inicio fuera de ventana horaria" | rephrase | "Fuera del horario" |
| `field-work-panel.tsx:344` | "Borrador local pendiente de envío (sin conexión)" | rephrase | "Sin enviar (sin conexión)" |
| `field-work-panel.tsx:322` | "Sin vehículo" | rephrase | "Sin vehículo" (sin cambio; mismo término en todo el producto) |
| `field-work-panel.tsx:366` | "Ver detalle" | rephrase | "Abrir" |
| `field-work-panel.tsx:381` | "Reintentar envío" | rephrase | "Reenviar" |
| `field-work-panel.tsx:397` | "La persona responsable de la cuadrilla registra los cambios de estado del servicio." | rephrase | "Solo consulta" |
| `field-work-panel.tsx:214` | "Volver a Servicios asignados" | rephrase | "Volver" |
| `field-work-panel.tsx:73` | "No se pudieron cargar los servicios de la cuadrilla." | rephrase | "No se pudieron cargar los servicios. Intente nuevamente." |

### Conflicto de borrador (`draft-conflict-view.tsx`, `inspection-execution-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `draft-conflict-view.tsx:158`, `inspection-execution-panel.tsx:481` | "Conflicto de sincronización" | rephrase | "El servicio cambió" |
| `draft-conflict-view.tsx:160`, `inspection-execution-panel.tsx:481` | "No se aplicó el borrador local automáticamente." | delete | — |
| `draft-conflict-view.tsx:75-76` | "Compare ambas versiones antes de decidir si conserva el borrador local para reintentar más tarde o lo descarta. Nunca se aplica automáticamente." | rephrase | "Compare y elija qué hacer con lo que cargó." |
| `draft-conflict-view.tsx:83` | `aria-label` "Comparación de versiones del servicio" | rephrase | "Comparación" |
| `draft-conflict-view.tsx:91-92` | "Su borrador" / "Versión actual del servidor" | rephrase | "Lo que cargó" / "Estado actual" |
| `draft-conflict-view.tsx:123`, `:126` | "Descartar borrador" / "Conservar borrador" | rephrase | "Descartar lo cargado" / "Conservar para después" |

### Inspección ambiental (`inspection-execution-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `inspection-execution-panel.tsx:331` | "Ejecución de inspección ambiental" | rephrase | "Inspección ambiental" |
| `inspection-execution-panel.tsx:338` | "El servicio todavía no está en curso" + "El resultado y la evidencia de la inspección se registran con el servicio en curso. Inícielo para habilitar el formulario." | rephrase | "Inicie el servicio para registrar la inspección." |
| `inspection-execution-panel.tsx:339` | "Solo consulta" + "La persona responsable de la cuadrilla registra el resultado y la evidencia de esta inspección." | rephrase | "Solo consulta" |
| `inspection-execution-panel.tsx:348` | "Borrador local pendiente" + "El resultado se conserva en este dispositivo y requiere un reenvío manual cuando vuelva la conexión." | rephrase | "Sin enviar. Reenvíe cuando vuelva la conexión." |
| `inspection-execution-panel.tsx:375` | "Indique cuándo se realizó la visita. Se admite una tolerancia de cinco minutos por diferencias de reloj." | delete | — |
| `inspection-execution-panel.tsx:389` | "Seleccione el resultado que refleja la visita realizada." | delete | — |
| `inspection-execution-panel.tsx:394` | "Marque cada control realizado antes de registrar el resultado." | delete | — |
| `inspection-execution-panel.tsx:413` | "Explique qué impidió confirmar el resultado." / "Describa brevemente la conclusión de la visita." | cut | Etiqueta suficiente |
| `inspection-execution-panel.tsx:417` | "Próximo paso" + "Se informa al backend el paso requerido para continuar el expediente." | rephrase | "Próximo paso: aviso a emitir por Oficina" (sin descripción) |
| `inspection-execution-panel.tsx:463` | "La decisión final corresponde a Oficina y no se determina en este formulario." | delete | — |
| `inspection-execution-panel.tsx:518` | "{n} archivo(s) ya asociado(s). Puede agregar fotografías o documentos. Se admiten JPEG, PNG, WebP y PDF hasta {tamaño} por archivo." | rephrase | "Fotos o PDF, hasta {tamaño} por archivo." |
| `inspection-execution-panel.tsx:491` | "El servidor registró la inspección. Siguiente paso: {paso}." | rephrase | "Siguiente paso: {paso}." |
| `inspection-execution-panel.tsx:503` | "La inspección quedó registrada, pero {id} sigue en curso. Registre el resultado de la zona y complete el servicio para cerrarlo." | rephrase | "Falta registrar la zona y completar el servicio." |
| `inspection-execution-panel.tsx:281`, `:287` | "No se pudo conectar con el servidor. El resultado quedó guardado como borrador local; reintente el envío cuando recupere la conexión." / "Seguimos sin conexión. El borrador se conserva en este dispositivo para reintentar el envío más tarde." | rephrase | Texto estándar de sin conexión |
| `inspection-execution-panel.tsx:228` | "No se pudo subir el archivo." | rephrase | "No se pudo subir el archivo. Intente nuevamente." |
| `inspection-execution-panel.tsx:205`, `:209` | "\"{archivo}\" supera el tamaño máximo permitido de {tamaño}." / "…tiene un formato no permitido. Formatos admitidos: JPEG, PNG, WebP o PDF." | rephrase | "\"{archivo}\" pesa más de {tamaño}." / "\"{archivo}\" no es una foto ni un PDF." |
| `inspection-execution-panel.tsx:315` | "El servicio no tiene una inspección ambiental vinculada." | rephrase | "Este servicio no tiene inspección." |

### Ejecución por zonas (`zone-execution-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `zone-execution-panel.tsx:520` | "Registro de ejecución de zonas" | rephrase | "Zonas" |
| `zone-execution-panel.tsx:524-525` | "Recorrido por zonas: registre el resultado de cada zona en cualquier orden." / "Servicio puntual: registre el resultado de la zona correspondiente." | delete | — |
| `zone-execution-panel.tsx:535` | "Se enviará junto con la finalización del Servicio. No se requiere una confirmación adicional." | delete | — |
| `zone-execution-panel.tsx:532` | "Nueva ubicación del contenedor" | rephrase | "Nueva ubicación" |
| `zone-execution-panel.tsx:482` | "Servicio finalizado con estado: {estado} ({código})" | rephrase | "Servicio {estado}" (sin código) |
| `zone-execution-panel.tsx:488` | "Error al completar el servicio en el servidor." | rephrase | "No se pudo completar el servicio. Intente nuevamente." |
| `zone-execution-panel.tsx:595` | "Todas las zonas registradas. Listo para finalizar." | rephrase | "Falta solo completar el servicio." |
| `zone-execution-panel.tsx:656`, `:709` | `aria-label` "Navegación de zonas del servicio" | rephrase | "Zonas" |
| `zone-execution-panel.tsx:762` | "Zona seleccionada" | cut | La selección ya se ve; `aria-current` basta |
| `zone-execution-panel.tsx:803` | "Motivo de excepción:" | rephrase | "Motivo:" |
| `zone-execution-panel.tsx:927`, `:930` | "Resultado pendiente de registro" + "La persona responsable de la cuadrilla registrará el resultado de esta zona." | rephrase | "Pendiente" |
| `zone-execution-panel.tsx:954-955` | "Borrador local pendiente de envío" + "Los datos se conservaron en este dispositivo; reenvíelos manualmente cuando recupere la conexión." | rephrase | Texto estándar de sin conexión |
| `zone-execution-panel.tsx:962` | "No se pudo guardar el resultado" | rephrase | "No se pudo guardar. Intente nuevamente." |
| `zone-execution-panel.tsx:970`, `:973` | "Resultado de la zona \*" / `aria-label` "Resultado de la zona" | rephrase | "Resultado \*" |
| `zone-execution-panel.tsx:1021` | "Motivo de la excepción * Obligatorio" | rephrase | "Motivo \*" (sin el rótulo "Obligatorio" duplicado) |
| `zone-execution-panel.tsx:1028`, `:1046` | "Seleccione un motivo..." / "Detalles sobre el estado de la zona, incidencias o desvíos..." | rephrase | "Seleccione un motivo" / "Detalle (opcional)" |
| `zone-execution-panel.tsx:1055`, `:1059-1060` | "Evidencia adjunta" + "Opcional en caso de finalización completa." / "Obligatoria para resultados parciales o no atendidos (fotografía o acta)." | rephrase | "Evidencia" + "Obligatoria si es parcial o no atendida." |
| `zone-execution-panel.tsx:345`, `:351` | "El motivo es obligatorio para resultados parciales o no atendidos." / "Se requiere adjuntar evidencia documental o fotográfica para resultados parciales o no atendidos." | rephrase | "Indique el motivo." / "Adjunte una foto o un acta." |
| `zone-execution-panel.tsx:459` | "La {campo} {es obligatoria / son obligatorias} para completar la reubicación." | rephrase | "Complete {campo} para finalizar." |
| `zone-execution-panel.tsx:210` | "No se pudo cargar la evidencia. Recargue el servicio para reintentar." | rephrase | "No se pudo cargar la evidencia. Intente nuevamente." |
| `zone-execution-panel.tsx:287` | "Error al subir el archivo" | rephrase | "No se pudo subir el archivo. Intente nuevamente." |
| `zone-execution-panel.tsx:299`, `:381`, `:408` | "No se pudo cargar la evidencia. Puede reintentar la carga." / "Resultado de la zona registrado." | rephrase | "No se pudo subir la evidencia." / "Zona registrada." |
| `zone-execution-panel.tsx:391`, `:415` | "Seguimos sin conexión…" / "No se pudo conectar con el servidor. El resultado quedó guardado como borrador local…" | rephrase | Texto estándar de sin conexión |
| `zone-execution-panel.tsx:848` | "Sin archivos adjuntos." | rephrase | "Sin archivos." |
| `zone-execution-panel.tsx:1157`, `:1160` | "Guardando resultado..." / "Guardar resultado de zona" | rephrase | "Guardando…" / "Guardar zona" |

### Propuestas estructurales — Servicios, Campo

- **Quitar los bloques de ayuda de la inspección.** Hoy el formulario tiene siete descripciones de campo; en celular ocupan más que los controles. Mantener solo la etiqueta y, para evidencia, el límite de tamaño.
- **Un solo aviso de "sin conexión".** Hoy hay cuatro variantes del borrador pendiente (tarjeta del servicio, panel de inspección, panel de zonas, diálogo de suspensión). Un componente común muestra una línea con el botón "Reenviar".
- **Conflicto de borrador más corto.** Dos columnas ("Lo que cargó" / "Estado actual") y dos botones, sin párrafo introductorio.
- **Inspección: resultado y siguiente paso juntos.** "Próximo paso" es un dato fijo; pasa a mostrarse como parte del resultado ya registrado, no como campo de formulario.
- **Zonas: una sola instrucción.** Reemplazar los dos párrafos de modo (recorrido / puntual) por el encabezado "Zonas" y el contador "{n} de {m} registradas".

---

## 4. Derivaciones

### Lista (`referrals-workspace.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `referrals-workspace.tsx:65` | "M3 · Reparaciones" / "M7 · Cortes de calle" | rephrase | "Obras Públicas · Reparación" / "Tránsito · Corte de calle" |
| `referrals-workspace.tsx:69-70` | "Daño detectado en un Servicio" / "Corte solicitado para un Servicio" | cut | — (el tipo ya dice qué es) |
| `referrals-workspace.tsx:79`, `:81`, `:82` | "Intervención de arbolado de origen" / "Inspección de origen" / "Servicio de origen" | rephrase | "Intervención" / "Inspección" / "Servicio" |
| `referrals-workspace.tsx:87`, `:89`, `:90` | "La intervención autorizada se consulta en su catálogo de origen." / "La información de la inspección se consulta en su expediente ambiental." / "La información del Servicio se consulta en su módulo de origen." | delete | — |
| `referrals-workspace.tsx:95`, `:97`, `:98` | "Ver intervención de origen" / "Ver inspección fuente" / "Ver Servicio de origen" | rephrase | "Ver intervención" / "Ver inspección" / "Ver servicio" |
| `referrals-workspace.tsx:103` | "Corte solicitado para una intervención de arbolado autorizada" | rephrase | "Corte para intervención de arbolado" |
| `referrals-workspace.tsx:282` | "No se pudo verificar el Servicio de origen." | rephrase | "No se pudo cargar el servicio." |
| `referrals-workspace.tsx:306`, `:320` | "Intente nuevamente en unos instantes." | rephrase | "Intente nuevamente." |
| `referrals-workspace.tsx:374-375` | "Seguimiento de solicitudes referidas a M3 y M7 desde Servicios e intervenciones autorizadas." / "Solicitudes vinculadas exclusivamente a sus Servicios asignados." | delete | — |
| `referrals-workspace.tsx:361` | "Derivaciones externas" | rephrase | "Derivaciones" |
| `referrals-workspace.tsx:377` | "{n} registro(s)" | rephrase | "{n} derivaciones" |
| `referrals-workspace.tsx:410-411` | "Hay derivaciones sin mostrar" + "{n} derivación(es) llegaron del backend con un formato que esta versión no reconoce y no se muestra. Consulte con el equipo de M6." | rephrase | "No se pudieron mostrar {n} derivaciones. Si el problema continúa, avise a soporte." |
| `referrals-workspace.tsx:422` | "Seleccione una derivación para consultar su detalle. La fuente canónica se consulta mediante el enlace a su módulo de origen." (`sr-only`) | delete | — |
| `referrals-workspace.tsx:457` | `aria-label` "Resumen de conciliación" | rephrase | "Alertas" |
| `referrals-workspace.tsx:471` | "Revisión de conciliación requerida" / "Seguimiento de conciliación" | rephrase | "Para revisar" (se oculta si no hay alertas) |
| `referrals-workspace.tsx:475-476` | "{n} advertencias requieren revisión explícita de Oficina." / "Las respuestas externas se mantienen visibles hasta que M3 o M7 confirme una decisión." | rephrase | "{n} para revisar" / — (delete) |
| `referrals-workspace.tsx:479` | "M6 no cambia estados, fusiona duplicados, reintenta envíos ni modifica el Servicio automáticamente." | delete | — |
| `referrals-workspace.tsx:483`, `:487` | "{n} fuera de plazo" / "{n} con cambios de origen" | rephrase | "{n} vencidas" / "{n} con cambios" |
| `referrals-workspace.tsx:506`, `:510`, `:522`, `:528` | `aria-label` "Alertas de conciliación" y rótulos "Derivación externa vencida" / "Origen actualizado" / "Origen sin verificar" | rephrase | "Alertas" y "Vencida" / "Cambió el servicio" / "Sin verificar" |
| `referrals-workspace.tsx:1122-1123` | "No hay derivaciones para esta sesión" + "No se encontraron solicitudes de reparación o cortes de calle en el alcance disponible." | rephrase | "Sin derivaciones" (sin descripción) |

### Detalle (`referrals-workspace.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `referrals-workspace.tsx:657` | "Última actualización" | rephrase | "Actualizada" (junto a "Creada") |
| `referrals-workspace.tsx:692` | "Alertas de conciliación" / "Seguimiento de conciliación" | rephrase | "Alertas" (solo si las hay) |
| `referrals-workspace.tsx:696-697` | "Revise estas señales con la respuesta de M3 o M7 antes de decidir el próximo paso." / "Las respuestas externas tardías, fuera de orden o sin correlación permanecen visibles para revisión explícita." | delete | — |
| `referrals-workspace.tsx:705`, `:709` | "Derivación externa vencida" + "No se crea un estado nuevo, no se reintenta el envío y no se modifica el Servicio automáticamente." | rephrase | "Vencida: {destino} no respondió a tiempo." |
| `referrals-workspace.tsx:715`, `:720` | "Candidata a derivación duplicada" + "Registros relacionados: {ids}. La coincidencia requiere revisión humana; M6 no fusiona ni reintenta por un error ambiguo." | rephrase | "Posible duplicada de {ids}." |
| `referrals-workspace.tsx:727-728`, `:737` | "El Servicio de origen cambió" + "La derivación conserva el contexto original. Compare antes de resolver la conciliación." + "El cambio no reabre, sobrescribe ni cancela esta derivación automáticamente." | rephrase | "El servicio cambió desde que se derivó." |
| `referrals-workspace.tsx:751-753` | "Límite de seguridad" + "Este registro tiene identificador M6 y, por eso, permanece en seguimiento como derivación creada. Si un envío falló antes de crear un registro, es un envío sin enviar y no una derivación pendiente." + "M6 solo registra una decisión externa ya confirmada mediante recuperación manual; no inventa respuestas de M3/M7 ni modifica el Servicio por su cuenta." | delete | — |
| `referrals-workspace.tsx:782` | "Recuperación manual" | rephrase | "Registrar respuesta" |
| `referrals-workspace.tsx:787` | "No cambia una decisión externa ni reemplaza la reconciliación automática por eventos." | delete | — |
| `referrals-workspace.tsx:163` | "Registrar inicio de reparación" | rephrase | "Registrar inicio" |
| `referrals-workspace.tsx:165` | "Confirme que M3 ya asignó la orden de trabajo y registre su identificador." | rephrase | "Obras Públicas ya asignó la orden." |
| `referrals-workspace.tsx:166-167` | "Identificador externo de M3 (workOrderId)" + "Debe coincidir con la orden de trabajo que M3 ya informó." | rephrase | "Nº de orden de trabajo" (sin ayuda) |
| `referrals-workspace.tsx:174`, `:176` | "Registrar cierre de reparación" / "Confirme que M3 ya informó la finalización de la orden de trabajo." | rephrase | "Registrar cierre" / "Obras Públicas ya terminó la reparación." |
| `referrals-workspace.tsx:177-178` | "Identificador externo de M3 (workOrderId)" + "Vuelva a indicar el identificador de la orden confirmada por M3." | rephrase | "Nº de orden de trabajo" (sin ayuda) |
| `referrals-workspace.tsx:189`, `:191` | "Registrar aprobación de M7" / "Confirme que M7 ya aprobó el corte y registre el identificador de cierre." | rephrase | "Registrar aprobación" / "Tránsito ya aprobó el corte." |
| `referrals-workspace.tsx:192-193` | "Identificador externo de M7 (closureId)" + "Debe coincidir con el identificador de cierre que M7 ya informó." | rephrase | "Nº de corte" (sin ayuda) |
| `referrals-workspace.tsx:198`, `:200` | "Registrar rechazo de M7" / "Confirme que M7 ya rechazó el corte. Luego Oficina deberá decidir si reprograma o cancela el Servicio." | rephrase | "Registrar rechazo" / "Tránsito rechazó el corte." |
| `referrals-workspace.tsx:208`, `:210` | "Registrar finalización de M7" / "Confirme que M7 ya informó que el corte terminó y que puede liberarse esta dependencia." | rephrase | "Registrar finalización" / "El corte terminó." |
| `referrals-workspace.tsx:878` | "Debe indicar el {identificador externo…}." | rephrase | "Indique el {Nº de orden de trabajo / Nº de corte}." |
| `referrals-workspace.tsx:919` | "No se pudo registrar la recuperación manual." | rephrase | "No se pudo registrar. Intente nuevamente." |
| `referrals-workspace.tsx:949-951` | "Estado actual" / "Nuevo estado" / "Destino externo" | rephrase | "Estado" / "Pasará a" / "Destino" (con nombre de negocio) |
| `referrals-workspace.tsx:995` | "Confirmar recuperación" | rephrase | "Confirmar" |
| `referrals-workspace.tsx:1007` | "Datos de la solicitud de reparación" | rephrase | "Reparación" |
| `referrals-workspace.tsx:1011` | "Riesgo para la seguridad pública" | rephrase | "Riesgo" |
| `referrals-workspace.tsx:1013` | "Identificador externo de M3" / "M3 todavía no informó un identificador" | rephrase | "Nº de orden de trabajo" / "Sin asignar" |
| `referrals-workspace.tsx:1025`, `:1027-1029` | "Tipo de corte" / "Inicio solicitado" / "Fin solicitado" / "Identificador externo de M7" / "M7 todavía no informó un identificador" | rephrase | "Tipo" / "Inicio" / "Fin" / "Nº de corte" / "Sin asignar" |

### Propuestas estructurales — Derivaciones

- **Detalle en tres bloques.** Encabezado (destino, estado, fechas), datos de la solicitud y "Registrar respuesta". Las cuatro tarjetas actuales (resumen de conciliación, alertas, límite de seguridad, recuperación manual) se reducen: las alertas pasan a una línea bajo el encabezado y el "Límite de seguridad" se elimina.
- **Una sola advertencia por acción.** Cada acción de "Registrar respuesta" lleva, a lo sumo, una frase al lado: "Confirme solo lo que {destino} ya informó."
- **Alertas como insignias, sin párrafos.** Vencida, posible duplicada y servicio cambiado se muestran como insignia + los registros relacionados; la explicación de política se elimina.
- **Resumen de conciliación en la lista.** Se oculta cuando no hay alertas; hoy se muestra siempre como "Seguimiento de conciliación".
- **Fila de la lista.** Mostrar destino, estado, fecha y próxima acción; quitar la descripción del tipo y la nota de "se consulta en su módulo de origen".
- **Datos externos.** "Nº de orden de trabajo" y "Nº de corte" se muestran solo cuando existen; hoy cada ausencia genera una frase.

---

## 5. Reportes ambientales

### Espacio de trabajo (`environmental-reports-workspace.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `environmental-reports-workspace.tsx:163` | `aria-label` "Solicitud de información pendiente" | rephrase | "Información pedida" |
| `environmental-reports-workspace.tsx:167` | "Mientras esté pendiente no se puede derivar, desestimar ni cerrar el expediente. Si el pedido vence sin respuesta, M2 cancela el reclamo y el expediente pasa a Desestimado." | rephrase | "Pendiente de respuesta. Si vence, el expediente se desestima." |
| `environmental-reports-workspace.tsx:173` | "No informado" | rephrase | "—" |
| `environmental-reports-workspace.tsx:203` | "Ubicación sin dirección" | rephrase | "Sin dirección" |
| `environmental-reports-workspace.tsx:207` | "Sin detalle operativo informado." | rephrase | "Sin detalle." |
| `environmental-reports-workspace.tsx:266`, `:272` | "Intente nuevamente en unos instantes." | rephrase | "Intente nuevamente." |
| `environmental-reports-workspace.tsx:299` | "Expediente {id} abierto en estado Recibido." | rephrase | "Expediente {id} abierto." |
| `environmental-reports-workspace.tsx:319` | "{id} cambió mientras se procesaba la acción. Se actualizó el estado; revise nuevamente las acciones disponibles." | rephrase | "El expediente cambió. Revise el estado actual." |
| `environmental-reports-workspace.tsx:323` | "No se pudo actualizar el expediente." | rephrase | "No se pudo actualizar el expediente. Intente nuevamente." |
| `environmental-reports-workspace.tsx:373` | "ID, dirección o ticket" | rephrase | "Nº, dirección o reclamo" |
| `environmental-reports-workspace.tsx:710` | "{tipo} · actualización de {fecha}" | rephrase | "{tipo} · actualizado {fecha}" |
| `environmental-reports-workspace.tsx:713` | "Siguiente decisión de Oficina" + "Las acciones disponibles respetan el estado actual del expediente." | rephrase | "Acciones" (sin descripción) |
| `environmental-reports-workspace.tsx:714` | "Programación de inspección" + "La inspección {id} quedó registrada sin Servicio POINT: falta programar su fecha y su cuadrilla." / "La inspección anterior fue inconclusa. Registre una nueva inspección y un nuevo Servicio POINT." / "Defina la fecha y la cuadrilla. El tipo de Servicio POINT se determina automáticamente." | rephrase | "Inspección" + "Falta fecha y cuadrilla." / "La anterior fue inconclusa. Programe otra." / (delete) |
| `environmental-reports-workspace.tsx:717` | "Contexto operativo" / "Detalle del hallazgo" | rephrase | "Datos" / "Hallazgo" |
| `environmental-reports-workspace.tsx:717` | "Vigencia del registro" + "La prioridad y los cambios tardíos de M2 se muestran como información de lectura." + "Escalado por M2" | rephrase | "Escalado" (solo si aplica); delete el resto |
| `environmental-reports-workspace.tsx:717` | "Ticket de origen: {id}" / "UUID técnico…" | rephrase | "Reclamo: {id}"; quitar el UUID técnico |
| `environmental-reports-workspace.tsx:718` | "Historia de inspecciones" / "No hay inspecciones registradas." / "Inspección {n} de {m}" | rephrase | "Inspecciones" / "Sin inspecciones." / "Inspección {n}" |
| `environmental-reports-workspace.tsx:504`, `:541` | "No se pudo cargar el acta de infracción." / "No se pudo cargar la historia de inspecciones." | rephrase | "No se pudo cargar el acta." / "No se pudieron cargar las inspecciones." |
| `environmental-reports-workspace.tsx:593`, `:595` | "No se pudo pedir la información: ya hay una solicitud pendiente o el expediente cambió. Se actualizó el estado." / "No se pudo pedir la información al vecino." | rephrase | "Ya hay una solicitud pendiente." / "No se pudo enviar el pedido. Intente nuevamente." |
| `environmental-reports-workspace.tsx:612` | "Inspección ambiental · {id}" | rephrase | "Inspección · {id}" |
| `environmental-reports-workspace.tsx:630`, `:645` | "No se pudo actualizar el expediente. Recargue la pantalla." / "No se pudo completar la programación. Revise el estado del expediente." | rephrase | "No se pudo actualizar. Intente nuevamente." / "No se pudo programar. Intente nuevamente." |
| `environmental-reports-workspace.tsx:637` | "Debe seleccionar una zona operativa para programar la inspección." | rephrase | "Seleccione una zona." |
| `environmental-reports-workspace.tsx:655` | "La inspección quedó programada, pero no se pudo crear el Servicio POINT. {motivo}Use «Programar servicio» para reintentar." | rephrase | "Inspección programada, pero no se creó el servicio. Use «Programar servicio»." |
| `environmental-reports-workspace.tsx:752` | `aria-label` "Estado de cierre" | rephrase | "Cierre" |
| `environmental-reports-workspace.tsx:769-775` | `aria-label` "Excepciones de integración M4" + título "Excepciones de integración M4" + "Estas resoluciones no pudieron asociarse a un acta conocida. Revise la correlación antes de tomar cualquier decisión fuera de M6." | rephrase | "Resoluciones sin acta" + "No coinciden con ningún acta." |
| `environmental-reports-workspace.tsx:794-800` | "Resolución de M4" + "Registro de solo lectura. M6 no edita ni reemplaza la decisión externa." | rephrase | "Resolución de Faltas" (sin descripción) |
| `environmental-reports-workspace.tsx:806-808` | "Acta relacionada" / "Referencia externa" / "Motivo informado por M4" | rephrase | "Acta" / "Referencia" / "Motivo" |
| `environmental-reports-workspace.tsx:818` | "El acta se emite una sola vez a partir de la inspección {id} y queda como registro de lectura." | delete | — |
| `environmental-reports-workspace.tsx:823` | "La evidencia se conserva dentro de la inspección; no se copia al acta." | delete | — |
| `environmental-reports-workspace.tsx:823` | "La emisión está bloqueada: agregue evidencia a la inspección antes de emitir el acta." | rephrase | "Agregue evidencia a la inspección para emitir el acta." |
| `environmental-reports-workspace.tsx:824` | "No hay un acta disponible para esta inspección." | rephrase | "Sin acta." |
| `environmental-reports-workspace.tsx:825` | "Acta inmutable" + "No se puede editar ni eliminar. Una corrección requiere una nueva inspección." | rephrase | "Acta emitida. No se puede modificar." |
| `environmental-reports-workspace.tsx:825` | "Actas previas del establecimiento" / "Establecimiento resuelto:" | rephrase | "Actas previas" / "Establecimiento:" |
| `environmental-reports-workspace.tsx:819` | "Emitir aviso de infracción" (botón) / `:907` título | rephrase | "Emitir acta" |
| `environmental-reports-workspace.tsx:907` | "Emisión de acta" (sobretítulo) + "La emisión es inmutable. Verifique la inspección y seleccione un establecimiento antes de registrar el aviso." | rephrase | Sobretítulo: delete; "Verifique la inspección y elija el establecimiento. No se puede modificar." |
| `environmental-reports-workspace.tsx:915` | "El directorio es un adapter local reemplazable. M4 no se contacta durante la búsqueda." | delete | — |
| `environmental-reports-workspace.tsx:917`, `:862` | "Se registrará un aviso no derivado: M4 no fue contactado y el expediente se cerrará localmente." / "No se encontró un establecimiento. M4 no será contactado por este flujo." | rephrase | "No se encontró el establecimiento." / "El acta no se enviará a Faltas." |
| `environmental-reports-workspace.tsx:919` | "Aviso no derivado: M4 no fue contactado. El expediente se cerrará localmente." | rephrase | "El acta no se enviará a Faltas. El expediente se cierra." |
| `environmental-reports-workspace.tsx:849`, `:866` | "Ingrese un ID, nombre o dirección para buscar el establecimiento." / "No se pudo consultar el directorio local. Intente nuevamente." | rephrase | "Ingrese nombre, dirección o Nº." / "No se pudo buscar. Intente nuevamente." |
| `environmental-reports-workspace.tsx:873-876` | "Resuelva un establecimiento o continúe sin establecimiento." / "Seleccione el tipo de infracción." / "Seleccione la gravedad." / "Seleccione la acción sugerida." | rephrase | "Elija un establecimiento o continúe sin él." (otros: sin cambio) |
| `environmental-reports-workspace.tsx:883` | "Revise los datos requeridos antes de emitir el acta." | rephrase | "Complete los datos obligatorios." |
| `environmental-reports-workspace.tsx:890`, `:682`, `:684` | "No se pudo emitir el acta de infracción." / "Conflicto al emitir el acta: {mensaje}" | rephrase | "No se pudo emitir el acta. Intente nuevamente." |
| `environmental-reports-workspace.tsx:673` | "No hay una inspección con infracción constatada." | rephrase | "No hay inspección con infracción." |
| `environmental-reports-workspace.tsx:966-971` | "Programar reinspección" / "Programar servicio" / "Programar inspección" + "La inspección anterior fue inconclusa. Se creará una nueva inspección con su propio Servicio POINT." / "La inspección ya está registrada. Defina fecha, zona y cuadrilla para crear solo su Servicio POINT." / "Defina fecha y cuadrilla. El checklist se captura en la inspección y el modo POINT se asigna automáticamente." | cut | Quitar las tres descripciones |
| `environmental-reports-workspace.tsx:1017` | "Programación operativa" (sobretítulo) | delete | — |
| `environmental-reports-workspace.tsx:995`, `:996` | "Indique la fecha, la zona y la cuadrilla para continuar." / "Hay un solapamiento: justifique la asignación en al menos {n} caracteres." | rephrase | "Indique fecha, zona y cuadrilla." / "Escriba al menos {n} caracteres." |
| `environmental-reports-workspace.tsx:1009` | "No se pudo completar la programación." | rephrase | "No se pudo programar. Intente nuevamente." |
| `environmental-reports-workspace.tsx:1028` | "Justificación del solapamiento" | rephrase | "Justificación" |
| `environmental-reports-workspace.tsx:1066` | "Detección de campo" (sobretítulo) | delete | — |
| `environmental-reports-workspace.tsx:1066` | "Abrir reporte ambiental" + "Registre el hallazgo observado en la vía pública. El expediente se abrirá como Recibido para su revisión." | rephrase | "Abrir reporte" (sin descripción) |
| `environmental-reports-workspace.tsx:1051-1053` | "Describa el hallazgo para que Oficina pueda clasificarlo." | rephrase | "Describa el hallazgo." |
| `environmental-reports-workspace.tsx:1081-1082` | "Latitud \*" / "Longitud \*" | restructure | Ver estructurales |
| `environmental-reports-workspace.tsx:1093` | "No hay expedientes con esos filtros" + "Pruebe con otro estado, tipo o término de búsqueda." / "No hay expedientes asignados" + "Los nuevos reportes aparecerán aquí después de abrirlos." | rephrase | "Sin expedientes con esos filtros." / "Sin expedientes." (sin descripción) |

### Diálogos (`report-decision-dialog.tsx`, `request-information-dialog.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `report-decision-dialog.tsx:19`, `:25` | "Indique por qué corresponde derivar este expediente. El motivo queda registrado en el historial." / "Indique por qué se desestima este expediente. El motivo queda registrado en el historial." | rephrase | "Indique el motivo. Queda en el historial." |
| `report-decision-dialog.tsx:62` | "Debe indicar el motivo." | rephrase | "Indique el motivo." |
| `report-decision-dialog.tsx:104`, `request-information-dialog.tsx:113` | "Volver al expediente" | rephrase | "Cancelar" |
| `request-information-dialog.tsx:49` | "Debe indicar qué información se le pide al vecino." | rephrase | "Indique qué información pide." |
| `request-information-dialog.tsx:79` | "Qué se le pide al vecino" | rephrase | "Qué información necesita" |
| `request-information-dialog.tsx:96` | "Opcional. Es una fecha sugerida: M2 fija el vencimiento efectivo. Si vence sin respuesta, M2 cancela el reclamo y el expediente se desestima." | rephrase | "Opcional. Si vence sin respuesta, el expediente se desestima." |
| `request-information-dialog.tsx:99`, `:109` | "Nota interna" + "Opcional. Para el equipo: el vecino no la ve." | rephrase | "Nota interna (el vecino no la ve)" |

### Propuestas estructurales — Reportes ambientales

- **Latitud y longitud como una sola ubicación — propuesta reemplazada por [#692](https://github.com/hllous/Frontend-M6-DAPS2/issues/692).** Dirección o referencia sigue siendo obligatoria; la ubicación se elige y confirma en el mapa. La acción es obligatoria porque el alta exige coordenadas; [#695](https://github.com/hllous/Frontend-M6-DAPS2/issues/695) elimina los campos manuales y el valor de respaldo.
- **Detalle con acciones primero.** "Siguiente decisión de Oficina" y "Programación de inspección" se funden en un único bloque "Acciones" con los botones que aplican.
- **Sobretítulos de diálogo fuera.** Los sobretítulos "Emisión de acta", "Programación operativa", "Detección de campo" repiten el título; se eliminan.
- **Resolución y excepciones de Faltas.** Las dos alertas se unen en una sección "Resolución" con una fila por acta; la nota de solo lectura se elimina.
- **Datos del reclamo en una línea.** "Ticket de origen" y "UUID técnico" se unen en "Reclamo: {nº}".
- **Información pedida.** El aviso de solicitud pendiente se reduce a una línea con el vencimiento.

---

## 6. Mapa operativo

### Vistas y capas (`mapa-operativo.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `mapa-operativo.tsx:89` | "Contexto territorial" (título de la vista Inventario) | rephrase | "Inventario" |
| `mapa-operativo.tsx:93` | "Atención hoy" / "Zonas atendidas hoy" | rephrase | "Hoy" / "Hoy" |
| `mapa-operativo.tsx:122`, `:123` | "No se pudo cargar la información territorial. Revise la conexión e intente nuevamente." / "No se pudo cargar esta vista territorial. Intente nuevamente." | rephrase | "No se pudo cargar el mapa. Intente nuevamente." / "No se pudo cargar esta vista. Intente nuevamente." |
| `mapa-operativo.tsx:593`, `:605` | "El mapa no está disponible" / "La vista no está disponible" | rephrase | "No se pudo cargar el mapa" / "No se pudo cargar la vista" |
| `mapa-operativo.tsx:101`, `:623` | `aria-label` "Mapa geográfico" / "Datos del mapa operativo" | rephrase | "Mapa" |
| `mapa-operativo.tsx:650`, `:1127` | `aria-label` "Controles de la vista {vista}" | rephrase | "Controles" |
| `mapa-operativo.tsx:672`, `:684`, `:693` | `aria-label` "Carga de recorridos" / "Carga de cobertura" / "Carga de atención de hoy" | rephrase | "Cargando" |
| `mapa-operativo.tsx:720`, `:724`, `:726` | "{n} zonas operativas" / "{n} de {m} zonas con datos" / "{n} servicio(s) de atención" | rephrase | "{n} zonas" / "{n} de {m} con datos" / "{n} servicios" |
| `mapa-operativo.tsx:749` | "Capas visibles" | rephrase | "Capas" |
| `mapa-operativo.tsx:809-810` | "No hay elementos visibles" + "Active al menos una capa con recursos ubicados." | rephrase | "Sin elementos. Active una capa." |
| `mapa-operativo.tsx:210`, `:220`, `:230` | "Sin dirección informada" / "superficie no registrada" / "Sin relevamiento" | rephrase | "Sin dirección" / "sin superficie" / "Sin relevamiento" |

### Zonas

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `mapa-operativo.tsx:833` | "Zonas operativas" | rephrase | "Zonas" |
| `mapa-operativo.tsx:835` | "Cuatro polígonos oficiales unidos al catálogo por el código estable de zona." | delete | — |
| `mapa-operativo.tsx:855` | "{código}" como título de cada zona (y su nombre debajo) | rephrase | "{nombre}" (sin código) |
| `mapa-operativo.tsx:861` | "Seleccione una zona para destacarla en el mapa. El color no es el único indicador: cada zona conserva su código y nombre." | delete | — |
| `operational-map-canvas.tsx:259` | "{código} · {nombre}" (popup de zona) | rephrase | "{nombre}" |

### Cobertura

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `mapa-operativo.tsx:888` | "Objetivos atendidos sobre programados. Período: {período}." | rephrase | "{período}" (se conserva la fecha) |
| `mapa-operativo.tsx:891` | `aria-label` "Escala semántica de cobertura" | rephrase | "Escala de cobertura" |
| `mapa-operativo.tsx:931` | "Seleccione una zona para destacarla. El color se acompaña con la tasa, el código y el detalle atendido/programado." | delete | — |
| `operational-map-canvas.tsx:335`, `:342` | "Sin datos para el período" / "Cobertura: {tasa}" / "Cobertura {tasa} · {nota}" | rephrase | "Sin datos" / "{tasa}" / "{tasa} · {nota}" |
| `operational-map-canvas.tsx:188-195` | `aria-label` "Mapa geográfico de zonas operativas" / "…de cobertura por zona" / "…del recorrido" / "…de zonas atendidas hoy" / "…del inventario urbano" | rephrase | "Mapa de zonas" / "Mapa de cobertura" / "Mapa del recorrido" / "Mapa de hoy" / "Mapa de inventario" |

### Recorrido y hoy

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `mapa-operativo.tsx:959` | "Recorrido operativo" (título si no hay recorrido elegido) | rephrase | "Recorrido" |
| `mapa-operativo.tsx:961` | "Las paradas se leen en orden y cada zona queda resaltada en el mapa." | delete | — |
| `mapa-operativo.tsx:964` | "Recorrido a visualizar" | rephrase | "Recorrido" |
| `mapa-operativo.tsx:970` | "No hay recorridos activos" | rephrase | "Sin recorridos activos" |
| `mapa-operativo.tsx:1000`, `operational-map-canvas.tsx:295-296` | "{n} min estimados" / "Sin duración" / "Duración estimada no informada" | rephrase | "{n} min" / "—" |
| `mapa-operativo.tsx:1010-1011` | "No hay paradas para mostrar" + "Seleccione un recorrido activo con zonas configuradas." | rephrase | "Sin paradas" + "Elija otro recorrido." |
| `mapa-operativo.tsx:1031` | "Zonas atendidas hoy" | rephrase | "Hoy" |
| `mapa-operativo.tsx:1034` | "{fecha}. La cobertura se actualiza desde los resultados registrados por zona." | rephrase | "{fecha}" (se conserva la fecha) |
| `mapa-operativo.tsx:1039` | "{n} servicio(s) programado(s) hoy" | rephrase | "{n} servicios hoy" |
| `mapa-operativo.tsx:1059-1060` | "No hay servicios programados hoy" + "Cuando exista atención para la fecha actual, cada zona aparecerá con su resultado operativo." | rephrase | "Sin servicios hoy" (sin descripción) |
| `mapa-operativo.tsx:1066` | "Servicios incluidos" | rephrase | "Servicios" |
| `mapa-operativo.tsx:1072` | "{id} · Horario no informado–" | rephrase | "{id} · sin horario" |
| `mapa-operativo.tsx:1084` | "La vista consulta el detalle de cada servicio del día para no confundir una zona asignada con una zona efectivamente atendida." | delete | — |
| `mapa-operativo.tsx:1095` | "Sin valor" | rephrase | "—" |
| `mapa-operativo.tsx:563`, `:571` | `aria-label` y tooltip "Actualizar datos" | rephrase | "Actualizar" |
| `mapa-operativo.tsx:581` | `aria-label` "Vistas del mapa operativo" | rephrase | "Vistas" |
| `mapa-operativo.tsx:618` | "Reintentar vista" | rephrase | "Reintentar" |
| `operational-map-canvas.tsx:96` | "{n} elementos de inventario; acercar para verlos" | rephrase | "{n} elementos; acerque el mapa" |

### Propuestas estructurales — Mapa operativo

- **Panel de vista sin introducción.** Cada vista conserva solo el encabezado; las frases introductorias desaparecen y el mapa gana la altura. Cobertura mantiene el período; Hoy mantiene la fecha.
- **Zonas con color y nombre.** La lista de zonas queda con muestra de color y nombre; el código se elimina y con él la nota de accesibilidad.
- **Leyenda de cobertura fusionada.** Escala y porcentaje en una sola línea bajo el título; la frase "El color se acompaña con la tasa…" se elimina porque la tasa ya aparece como texto.
- **Recorrido: una fila por parada.** Número, zona y duración; sin el texto "Las paradas se leen en orden".

---

## 7. Catálogo

### Portada y componentes compartidos (`catalog-landing.tsx`, `catalog-pager.tsx`, `catalog-deactivation-dialog.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `catalog-landing.tsx:100`, `:105` | "Configuración" (sobretítulo) + "Recursos que sostienen la planificación y la ejecución de servicios." | delete | — |
| `catalog-landing.tsx:129` | "Su sesión tiene acceso de consulta a los catálogos disponibles." | rephrase | "Solo consulta" |
| `catalog-landing.tsx:13`, `:20`, `:27`, `:34`, `:41`, `:48`, `:55`, `:62`, `:69`, `:76`, `:83`, `:90` | Descripciones de cada tarjeta (12), por ejemplo "Trazados y secuencias de paradas para servicios de recolección y barrido." | delete | Las tarjetas quedan con título; el título ya nombra el catálogo |
| `catalog-landing.tsx:27` | "Áreas operativas municipales para asignación de cuadrillas y coberturas." | delete | — |

### Zonas (`zone-catalog-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `zone-catalog-panel.tsx:373` | "Configuración de áreas operativas para asignación de cuadrillas y recorridos de recolección." | delete | — |
| `zone-catalog-panel.tsx:400` | "Buscar por código o nombre..." | rephrase | "Buscar zona" |
| `zone-catalog-panel.tsx:442` | "El código identifica la zona de forma única y es inmutable tras la creación." | rephrase | "No se puede cambiar después." |
| `zone-catalog-panel.tsx:547` | "El código es de solo lectura porque identifica unívocamente la zona y no puede modificarse." | delete | La etiqueta "Código (inmutable)" ya lo dice |
| `zone-catalog-panel.tsx:610` | "Zona activa para asignaciones" | rephrase | "Activa" |
| `zone-catalog-panel.tsx:672`, `:685` | Columna "Código" en la lista de zonas | restructure | Se mantiene la columna en la gestión de zonas; ver estructurales |
| `zone-catalog-panel.tsx:692`, `:713`, `:759` | "Ver en gestionar barrios" / "Gestionar barrios" | rephrase | "Ver barrios" / "Barrios" |
| `zone-catalog-panel.tsx:764` | "Zona: {código} — {nombre}" | rephrase | "Zona: {nombre}" |
| `zone-catalog-panel.tsx:780`, `:783` | "Barrios asignados" + "Quite un barrio para eliminarlo de esta zona." | rephrase | "Barrios" (sin descripción) |
| `zone-catalog-panel.tsx:840` | "Busque y seleccione uno o más barrios." | delete | — |
| `zone-catalog-panel.tsx:851` | "Buscar por nombre o identificador" | rephrase | "Buscar barrio" |
| `zone-catalog-panel.tsx:934` | "La zona {código} — {nombre} quedará inactiva. Los registros asociados conservarán su referencia." (y `:933`, `:935`, `:936`) | rephrase | "La zona {nombre} quedará inactiva." con el nombre en título y botones |
| `zone-catalog-panel.tsx:956`, `:967` | "No se pudieron verificar las referencias. Si continúa, la baja puede afectar servicios o elementos que todavía usan este registro." / "Entiendo que no se verificaron las referencias" | rephrase | "No se pudo verificar si la zona está en uso." / "Dar de baja de todos modos" |
| `zone-catalog-panel.tsx:976`, `:995`, `:1003`, `:1011` | "Advertencia: esta zona todavía cuenta con elementos activos referenciados:" / "Contenedores asociados:" / "Árboles censados:" / "Espacios verdes:" | rephrase | "La zona está en uso:" / "Contenedores" / "Árboles" / "Espacios verdes" |
| `zone-catalog-panel.tsx:195`, `:231`, `:267` | "Error inesperado al crear la zona operativa." / "Error al actualizar la zona operativa." / "No se pudo dar de baja la zona operativa." | rephrase | "No se pudo crear la zona. Intente nuevamente." (análogos) |

### Selectores de zona en otros catálogos

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `container-catalog-panel.tsx:614`, `:628`, `:707`, `:815`, `:838`, `:1020` | "{código} · {nombre}" (filtro, columna, detalle y formulario) | rephrase | "{nombre}" |
| `green-point-catalog-panel.tsx:429`, `:446`, `:721`, `:746` | "{código} · {nombre}" | rephrase | "{nombre}" |
| `green-spaces-panel.tsx:366`, `:383`, `:697`, `:716` | "{código} · {nombre}" | rephrase | "{nombre}" |
| `tree-catalog-panel.tsx:303`, `:307`, `:392`, `:394` | "{código} · {nombre}" | rephrase | "{nombre}" |
| `route-catalog-panel.tsx:818`, `:837`, `:979` | "{código} — {nombre} (Ya en recorrido)" / "{nombre} ({código})" | rephrase | "{nombre}" / "{nombre} (ya en el recorrido)" |

### Recorridos (`route-catalog-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `route-catalog-panel.tsx:499` | "Gestione los recorridos operativos para la planificación y ejecución de servicios." | delete | — |
| `route-catalog-panel.tsx:604` | "Los recorridos nuevos nacen sin paradas. Para diagramar y ordenar la secuencia de paradas operativas, utilice el generador de secuencias." | rephrase | "Sin paradas." |
| `route-catalog-panel.tsx:621` | "Modo lectura: se requieren permisos de oficina para configurar paradas." | rephrase | "Solo consulta" |
| `route-catalog-panel.tsx:663`, `:666` | "Editor de secuencia de paradas" + "Configure el orden y la duración de cada parada. Al guardar, se reemplazará la secuencia de forma atómica." | rephrase | "Paradas" (sin descripción) |
| `route-catalog-panel.tsx:696` | "No hay paradas en la secuencia. Puede guardar el recorrido sin paradas o agregar zonas debajo." | rephrase | "Sin paradas." |
| `route-catalog-panel.tsx:804` | "Agregar parada operativa al recorrido" | rephrase | "Agregar parada" |
| `route-catalog-panel.tsx:827` | "Seleccione una zona operativa activa..." | rephrase | "Seleccione una zona" |
| `route-catalog-panel.tsx:850` | "Duración est.:" | rephrase | "Duración (min)" |
| `route-catalog-panel.tsx:887-888` | "Guardar dejará el recorrido sin paradas." / "{n} parada(s) lista(s) para guardar." | delete | — |
| `route-catalog-panel.tsx:937` | "Buscar por código o nombre..." | rephrase | "Buscar recorrido" |
| `route-catalog-panel.tsx:954` | "Todos" / "Solo activos" / "Solo inactivos" | rephrase | "Todos" / "Activos" / "Inactivos" |
| `route-catalog-panel.tsx:1025`, `:1044`, `:1047-1048` | "Error al cargar recorridos" / "No se encontraron recorridos" + "No hay recorridos que coincidan con los filtros seleccionados." / "No hay recorridos registrados en el catálogo." | rephrase | "No se pudieron cargar los recorridos." / "Sin recorridos" (sin descripción) |
| `route-catalog-panel.tsx:1058` | "Crear primer recorrido" | rephrase | "Nuevo recorrido" |
| `route-catalog-panel.tsx:1175`, `:1294` | "Registre un recorrido operativo. El código asignado será inmutable tras la creación." / "El código es inmutable tras la creación." | rephrase | "El código no se puede cambiar después." |
| `route-catalog-panel.tsx:1187`, `:1213`, `:1217` | "Código del recorrido" / "Nombre descriptivo" / "Ej: Recorrido Nocturno San Telmo" | rephrase | "Código" / "Nombre" / "Ej. Nocturno San Telmo" |
| `route-catalog-panel.tsx:1269` | "Modifique los datos operativos del recorrido." | delete | — |
| `route-catalog-panel.tsx:1381` | "Verificando referencias a frecuencias de servicio..." | rephrase | "Verificando…" |
| `route-catalog-panel.tsx:1388`, `:1394` | "No se pudieron verificar las referencias. Si continúa, la baja puede afectar servicios o elementos que todavía usan este registro." / "Entiendo que no se verificaron las referencias" | rephrase | "No se pudo verificar si el recorrido está en uso." / "Dar de baja de todos modos" |
| `route-catalog-panel.tsx:1403`, `:1405` | "Advertencia: el recorrido está asignado a frecuencias de servicio activas" + "El backend no realiza control referencial automático. Desactivar este recorrido mantendrá las frecuencias existentes pero podría impactar en la programación operativa futura." | rephrase | "El recorrido tiene frecuencias activas. Seguirán vigentes tras la baja." |
| `route-catalog-panel.tsx:1426` | "No se detectaron frecuencias de servicio activas referenciando este recorrido." | delete | — |
| `route-catalog-panel.tsx:1444-1451` | "No se pudo verificar el recorrido" / "Aviso de concurrencia en el recorrido" + "No se pudo comprobar si el recorrido fue modificado en el servidor." / "El recorrido fue modificado en el servidor después de que abrió este editor." | rephrase | "El recorrido cambió" + "Otra persona lo modificó mientras editaba." |
| `route-catalog-panel.tsx:1456-1457` | "Aviso informativo: no fue posible verificar la secuencia actual… de forma atómica." / "Aviso informativo (no autoritativo): El backend no posee control de concurrencia ni bloqueo optimista para paradas. Si continúa, la secuencia completa reemplazará los cambios existentes en el servidor de forma atómica." | rephrase | "Si guarda, reemplaza las paradas actuales." |
| `route-catalog-panel.tsx:349`, `:354`, `:359`, `:364`, `:426`, `:434` | "Debe seleccionar una zona para la parada." / "La zona seleccionada no es válida." / "Una zona no puede repetirse en el mismo recorrido: {zona}." / "La duración estimada debe ser un número entero entre 1 y 1440 minutos." | rephrase | "Seleccione una zona." / "Zona no válida." / "{zona} ya está en el recorrido." / "La duración debe ser de 1 a 1440 minutos." |

### Frecuencias de servicio (`service-frequencies-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `service-frequencies-panel.tsx:340` | "Configure reglas de recorrido por día, turno y vigencia. Esta configuración no genera servicios automáticamente." | delete | — |
| `service-frequencies-panel.tsx:375-376` | "Solo se muestran tipos de servicio de modo Recorrido. El tipo y el recorrido quedan inmutables después de crear la regla." | rephrase | "Tipo y recorrido no se pueden cambiar después." |
| `service-frequencies-panel.tsx:278` | "Frecuencia creada. La regla queda almacenada para su configuración operativa." | rephrase | "Frecuencia creada." |
| `service-frequencies-panel.tsx:304`, `:324` | "Frecuencia actualizada. Los servicios ya creados no se modifican." / "Vigencia cerrada. Los servicios ya creados no se modifican." | rephrase | "Frecuencia actualizada." / "Vigencia cerrada." |
| `service-frequencies-panel.tsx:557` | "Ruta" (filtro) | rephrase | "Recorrido" (mismo término en todo el producto) |
| `service-frequencies-panel.tsx:757` | "Regla configurada para un tipo de servicio y recorrido." | delete | — |
| `service-frequencies-panel.tsx:838` | "Estos vínculos no se pueden modificar." | delete | — |
| `service-frequencies-panel.tsx:963`, `:969-970` | "…La regla dejará de estar vigente." / "El sistema establecerá la fecha de cierre hoy o en la fecha de inicio si todavía no comenzó. Los servicios ya creados quedan…" | rephrase | "La regla dejará de estar vigente hoy. Los servicios ya creados no cambian." |
| `service-frequencies-panel.tsx:1010` | "Seleccione todos los días que forman parte de la regla." | delete | — |
| `service-frequencies-panel.tsx:112` | "Sin fecha de cierre" | rephrase | "Sin cierre" |
| `service-frequencies-panel.tsx:359` | "Esta sesión puede consultar las frecuencias, pero no administrarlas." | rephrase | "Solo consulta" |

### Tipos de servicio (`service-types-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `service-types-panel.tsx:265` | "Defina cómo se programan y ejecutan los servicios urbanos." | delete | — |
| `service-types-panel.tsx:284` | "Esta sesión puede consultar el catálogo, pero no administrarlo." | rephrase | "Solo consulta" |
| `service-types-panel.tsx:294`, `:728` | "Código, categoría y modo quedan fijos al crear el tipo." / "El código, la categoría y el modo son de solo lectura porque ya pueden estar copiados en servicios programados." | rephrase | "No se pueden cambiar después." |
| `service-types-panel.tsx:647` | "Configuración disponible para la planificación de servicios." | delete | — |
| `service-types-panel.tsx:671` | "Sí requiere vehículo" / "No requiere vehículo" | rephrase | "Sí" / "No" (columna "Vehículo") |
| `service-types-panel.tsx:243` | "Tipo de servicio dado de baja. Los servicios existentes conservan su configuración." | rephrase | "Tipo de servicio dado de baja." |

### Sitios de disposición (`disposal-sites-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `disposal-sites-panel.tsx:224` | "Destinos de disposición final que pueden referenciar los registros de recolección." | delete | — |
| `disposal-sites-panel.tsx:242` | "Esta sesión puede consultar el catálogo, pero no administrarlo." | rephrase | "Solo consulta" |
| `disposal-sites-panel.tsx:252` | "El sitio podrá ser referenciado por registros de recolección…" | delete | — |
| `disposal-sites-panel.tsx:516` | "Información del lugar de tratamiento o transferencia." | delete | — |
| `disposal-sites-panel.tsx:587-588` | "La baja siempre es lógica para preservar las referencias de los registros de recolección." | delete | — |
| `disposal-sites-panel.tsx:202` | "Sitio de disposición dado de baja. Los registros existentes conservan su referencia." | rephrase | "Sitio dado de baja." |
| `disposal-sites-panel.tsx:697` | "El sitio quedará inactivo y no se utilizará en nuevas operaciones. Los registros existentes conservarán su referencia." | rephrase | "El sitio quedará inactivo." |

### Cuadrillas (`crew-catalog-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `crew-catalog-panel.tsx:350` | "Consulte equipos, turnos y referencias de identidad administradas por M1." | delete | — |
| `crew-catalog-panel.tsx:228`, `:233` | "Usuario M1 no resuelto" / "Organización M1 no resuelta" | rephrase | "Persona no encontrada" / "Organización no encontrada" |
| `crew-catalog-panel.tsx:568-569` | "Las membresías se muestran como referencias de identidad de M1. Office puede administrarlas desde este sub-recurso." | delete | — |
| `crew-catalog-panel.tsx:654` | "Busque nombres disponibles y seleccione uno o más usuarios administrados por M1." | delete | — |
| `crew-catalog-panel.tsx:715` | "Los responsables y organizaciones se seleccionan mediante sus IDs…" | delete | — |
| `crew-catalog-panel.tsx:777` | "El tipo no se puede cambiar después de registrar la cuadrilla." | rephrase | "No se puede cambiar después." |
| `crew-catalog-panel.tsx:798`, `:817` | "Seleccione una referencia M1" | rephrase | "Seleccione una persona" / "Seleccione una organización" |
| `crew-catalog-panel.tsx:849` | "Los integrantes se administran desde el detalle de la cuadrilla." | delete | — |
| `crew-catalog-panel.tsx:940` | `aria-label` "Agregar integrantes (M1), {resumen}" | rephrase | "Agregar integrantes, {resumen}" |
| `crew-catalog-panel.tsx:878` | "La cuadrilla quedará inactiva y no estará disponible para nuevas asignaciones. Las asignaciones existentes conservarán su referencia." | rephrase | "La cuadrilla quedará inactiva." |

### Vehículos (`vehicle-catalog-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `vehicle-catalog-panel.tsx:264` | "Registre los vehículos disponibles para la asignación de servicios." | delete | — |
| `vehicle-catalog-panel.tsx:438` | "Información operativa del vehículo registrado." | delete | — |
| `vehicle-catalog-panel.tsx:531-532` | "Complete los datos del recurso operativo. La baja se realiza de forma lógica." | delete | — |
| `vehicle-catalog-panel.tsx:624` | "Capacidad operativa declarada, en toneladas. Admite hasta dos decimales." | rephrase | "En toneladas" |
| `vehicle-catalog-panel.tsx:511` | "El vehículo quedará inactivo y no estará disponible para nuevas asignaciones. Las asignaciones existentes conservarán su referencia." | rephrase | "El vehículo quedará inactivo." |

### Contenedores y diálogos de ciclo de vida (`container-catalog-panel.tsx` y diálogos)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `container-catalog-panel.tsx:512` | "Inventario urbano de contenedores de vía pública para recolección diferenciada y mantenimiento." | delete | — |
| `container-catalog-panel.tsx:642` | "Cargando inventario de contenedores…" | rephrase | "Cargando contenedores…" |
| `container-catalog-panel.tsx:734-735` | "Actualice los datos operativos del contenedor. El código y el tipo son inmutables tras su registro." / "Complete los datos del nuevo contenedor para incorporarlo al inventario en estado Activo." | rephrase | "El código y el tipo no se pueden cambiar después." / — |
| `container-catalog-panel.tsx:767`, `:802` | "Identificador inmutable asignado al alta." / "Categoría de residuo inmutable tras el registro." | delete | — |
| `container-catalog-panel.tsx:989` | "Información técnica y geográfica registrada en el inventario" | delete | — |
| `container-catalog-panel.tsx:1050`, `:1079` | "Diagnóstico de daño" / "Sí (notificación a M3)" | rephrase | "Daño" / "Sí (avisa a Obras Públicas)" |
| `container-catalog-panel.tsx:1308`, `:1328` | "Iniciar reparación independiente" / "Completar reparación independiente" | rephrase | "Iniciar reparación" / "Completar reparación" |
| `container-catalog-panel.tsx:144` | "No se pudo verificar si hay un servicio en curso para este contenedor. Reintente para habilitar las acciones." | rephrase | "No se pudo verificar. Intente nuevamente." |
| `container-catalog-panel.tsx:1381`, `:1395`, `:1421`, `:1447`, `:1473`, `:1485`, `:1497`, `:1509` | "Desborde reportado con éxito para el contenedor {código}." (y 7 análogos con "con éxito") | rephrase | "Desborde reportado: {código}." |
| `container-catalog-panel.tsx:462`, `:473` | "Contenedor actualizado con éxito." / "Contenedor registrado con éxito." | rephrase | "Contenedor actualizado." / "Contenedor registrado." |
| `complete-repair-dialog.tsx:102-104` | "Acción independiente de Oficina para restituir el contenedor a estado Activo. No corresponde al completado de un Servicio vinculado. Puede adjuntar evidencia plana al contenedor." | rephrase | "El contenedor vuelve a Activo." |
| `complete-repair-dialog.tsx:122` | "Estado actual: En reparación" | rephrase | "Estado: En reparación" |
| `complete-repair-dialog.tsx:152` | "Confirmar reparación completa" | rephrase | "Confirmar reparación" |
| `start-repair-dialog.tsx:87-88` | "Acción independiente de Oficina para enviar el contenedor dañado a reparación. No corresponde al completado de un Servicio vinculado." | rephrase | "El contenedor pasa a En reparación." |
| `start-repair-dialog.tsx:106-107` | "Estado actual: Dañado" / "Nuevo estado: En reparación" | rephrase | "Dañado → En reparación" |
| `confirm-relocation-dialog.tsx:131` | "Confirmación de nueva ubicación" (sobretítulo) | delete | — |
| `confirm-relocation-dialog.tsx:137-138` | "Indique la nueva dirección y coordenadas geográficas donde ha sido instalado el contenedor para restituirlo a estado Activo." | rephrase | "Indique dónde quedó instalado el contenedor." |
| `confirm-relocation-dialog.tsx:157` | "Ubicación anterior registrada:" | rephrase | "Ubicación anterior:" |
| `start-relocation-dialog.tsx:93` | "Despacho de reubicación" (sobretítulo) | delete | — |
| `start-relocation-dialog.tsx:99-101` | "Confirme el inicio del proceso de reubicación física del contenedor. El contenedor pasará al estado En reubicación hasta que se confirme su nueva ubicación." | rephrase | "El contenedor pasa a En reubicación hasta confirmar su nueva ubicación." |
| `start-relocation-dialog.tsx:119`, `:122`, `:136-137` | "Detalles del contenedor:" / "Ubicación actual:" / "Al confirmar, el contenedor figurará en estado de tránsito/reubicación y requerirá el registro de su nueva dirección física para volver a…" | cut | Quitar el cuadro de detalles y el aviso final |
| `empty-container-dialog.tsx:93` | "Despacho operativo de vaciado" (sobretítulo) | delete | — |
| `empty-container-dialog.tsx:99-100` | "Confirme el vaciado del contenedor desbordado para restituirlo a estado Activo." | rephrase | "El contenedor vuelve a Activo." |
| `empty-container-dialog.tsx:118`, `:121` | "Detalles del contenedor:" / "Ubicación:" | cut | — |
| `report-overflow-dialog.tsx:105` | "Novedad operativa en vía pública" (sobretítulo) | delete | — |
| `report-overflow-dialog.tsx:111-112` | "Confirme que el contenedor ha superado su capacidad física o presenta acumulación de residuos perimetral. Esta acción transicionará…" | rephrase | "El contenedor pasa a Desbordado." |
| `report-overflow-dialog.tsx:131`, `:134` | "Detalles del contenedor:" / "Ubicación:" | cut | — |
| `report-damage-dialog.tsx:159` | "Novedad de mantenimiento y avería" (sobretítulo) | delete | — |
| `report-damage-dialog.tsx:163-164` | "Registre el desperfecto o siniestro observado. Esta acción transicionará el estado a Dañado e informará los requerimientos de…" | rephrase | "El contenedor pasa a Dañado." |
| `report-damage-dialog.tsx:287-289` | "Marque si el daño involucra rotura de calzada, vereda, anclajes civiles o requiere obra civil externa antes de poder restituir o reinstalar el contenedor." | rephrase | "Rotura de calzada, vereda o anclajes." |
| `remove-container-dialog.tsx:97-99` | "Esta acción terminal de Oficina cambiará el contenedor dañado a Retirado. No podrá iniciar otra transición de ciclo de vida después del retiro. Puede adjuntar evidencia plana al contenedor." | rephrase | "El contenedor pasa a Retirado. No se puede deshacer." |
| `remove-container-dialog.tsx:116` | "Confirmación de retiro" | delete | — |
| `container-evidence-queue.tsx:69`, `:75`, `:129` | "\"{archivo}\" supera el tamaño máximo permitido de {tamaño}." / "…tiene un formato no permitido ({tipo}). Formatos admitidos: JPEG, PNG, WebP, PDF." / "Error al subir el archivo" | rephrase | "\"{archivo}\" pesa más de {tamaño}." / "\"{archivo}\" no es una foto ni un PDF." / "No se pudo subir el archivo. Intente nuevamente." |

### Espacios verdes y puntos verdes (`green-spaces-panel.tsx`, `green-point-catalog-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `green-spaces-panel.tsx:290` | "Plazas, parques, canteros y ramblas disponibles para la planificación operativa." | delete | — |
| `green-spaces-panel.tsx:504` | "Información del espacio y su zona operativa." | delete | — |
| `green-spaces-panel.tsx:600-601` | "Complete los datos del espacio catalogado. La baja se realiza de forma lógica." | delete | — |
| `green-spaces-panel.tsx:664`, `:686` | "El tipo no se puede cambiar después de registrar el espacio…" / "Superficie declarada en metros cuadrados." | rephrase | "No se puede cambiar después." / "En m²" |
| `green-spaces-panel.tsx:475` | "El espacio verde quedará inactivo. Los registros existentes conservarán su referencia histórica." | rephrase | "El espacio verde quedará inactivo." |
| `green-point-catalog-panel.tsx:387` | "Puntos de entrega voluntaria, su ubicación y el conjunto completo de residuos que aceptan." | delete | — |
| `green-point-catalog-panel.tsx:400` | "Esta sesión puede consultar el catálogo, pero no administrarlo." | rephrase | "Solo consulta" |
| `green-point-catalog-panel.tsx:647-648` | "Actualice los datos del punto. La selección de residuos reemplaza el conjunto completo aceptado." / "Complete los datos del punto de entrega voluntaria." | delete | — |
| `green-point-catalog-panel.tsx:682` | "El código identifica el punto en la vía pública y no se puede…" | rephrase | "No se puede cambiar después." |
| `green-point-catalog-panel.tsx:770`, `:817` | "…lista ordenada." / "Opcional. Permite encontrar el punto junto con su ubicación…" | delete | — |
| `green-point-catalog-panel.tsx:949` | "Información del emplazamiento y del conjunto completo de residuos" | delete | — |
| `green-point-catalog-panel.tsx:919` | "El punto verde quedará inactivo y no estará disponible para nuevas consultas operativas. Sus registros históricos conservarán la referencia." | rephrase | "El punto verde quedará inactivo." |
| `green-point-catalog-panel.tsx:365`, `:333`, `:336` | "Punto verde dado de baja. Se conserva su referencia histórica." / "…actualizado con éxito." / "…creado con éxito." | rephrase | "Punto verde dado de baja." / "Punto verde actualizado." / "Punto verde creado." |

### Árboles, relevamientos e intervenciones (`tree-*`, `audited-tree-survey-panel.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `tree-catalog-panel.tsx:289` | "Censo de arbolado urbano, ubicación y medidas registradas para cada ejemplar." | delete | — |
| `tree-catalog-panel.tsx:293` | "Esta sesión puede consultar el censo, pero no administrarlo." | rephrase | "Solo consulta" |
| `tree-catalog-panel.tsx:396` | "Seleccione la zona que corresponde al árbol." | delete | — |
| `tree-catalog-panel.tsx:417` | "Información del ejemplar, su historial de relevamientos y el trabajo relacionado." | delete | — |
| `tree-catalog-panel.tsx:449` | "Las intervenciones que incluyen este árbol, y los servicios vinculados a cada una, se consultan en la cola de intervenciones de arbolado." | delete | — |
| `tree-catalog-panel.tsx:275`, `:255`, `:258` | "Árbol dado de baja. Se conserva su referencia histórica." / "Árbol actualizado con éxito." / "Árbol creado con éxito." | rephrase | "Árbol dado de baja." / "Árbol actualizado." / "Árbol creado." |
| `audited-tree-survey-panel.tsx:129` | "Relevamiento registrado con éxito." | rephrase | "Relevamiento registrado." |
| `audited-tree-survey-panel.tsx:143` | "Esta sesión puede consultar el historial, pero no registrar relevamientos." | rephrase | "Solo consulta" |
| `audited-tree-survey-panel.tsx:167` | "No hay registros para los filtros seleccionados. Quite uno o más filtros para consultar el historial." | rephrase | "Sin relevamientos con esos filtros." |
| `audited-tree-survey-panel.tsx:172` | "Observación ambiental del árbol. El registro quedará guardado como parte del historial inmutable." | rephrase | "No se puede modificar después." |
| `audited-tree-survey-panel.tsx:179`, `:197`, `:215` | "Indique la fecha en que se realizó la observación." / "Use el nivel que corresponda a la exposición observada." / "Registre la acción recomendada, si corresponde." | delete | — |
| `audited-tree-survey-panel.tsx:177`, `:183`, `:192` | "Fecha del relevamiento (obligatorio)" / "Estado sanitario (obligatorio)" / "Nivel de riesgo (obligatorio)" | rephrase | "Fecha \*" / "Estado sanitario \*" / "Nivel de riesgo \*" (mismo marcador que el resto de los formularios) |
| `audited-tree-survey-panel.tsx:206` | "Obligatorio para niveles de riesgo alto o crítico." | rephrase | "Obligatorio si el riesgo es alto o crítico." |
| `tree-interventions-panel.tsx:483` | "Solicitudes de poda, extracción, plantación o tratamiento con su estado y decisión registrada." | delete | — |
| `tree-interventions-panel.tsx:486` | "Esta sesión puede consultar las solicitudes, pero no crear intervenciones de arbolado." | rephrase | "Solo consulta" |
| `tree-interventions-panel.tsx:192` | "Registre qué intervención requiere uno o más árboles. La solicitud comenzará en estado solicitada." | delete | — |
| `tree-interventions-panel.tsx:222` | "Seleccione uno o más ejemplares; puede elegir varios árboles." | delete | — |
| `tree-interventions-panel.tsx:244` | "Es obligatoria para solicitar una extracción. No se adjuntan evidencias en esta etapa." | rephrase | "Obligatoria para extracción." |
| `tree-interventions-panel.tsx:198`, `:206`, `:226`, `:231` | "… (obligatorio)" | rephrase | "… \*" |
| `tree-interventions-panel.tsx:579` | "Solicitud de corte creada y pendiente de respuesta de M7." | rephrase | "Solicitud de corte enviada a Tránsito." |
| `tree-interventions-panel.tsx:587` | "Consulte los datos de la solicitud y, según su estado y permisos, registre una decisión de autorización." | delete | — |
| `tree-interventions-panel.tsx:624` | "Servicio puntual de ejecución" | rephrase | "Servicio" |
| `tree-interventions-panel.tsx:656` | "No se pudieron cargar cuadrillas y vehículos; puede asignarlos después desde Servicios." | rephrase | "No se pudieron cargar. Asigne luego desde Servicios." |
| `tree-interventions-panel.tsx:666` | "Esta decisión es terminal. Puede registrar una nueva solicitud con los datos de esta extracción." | rephrase | "Extracción rechazada. Puede crear otra solicitud." |
| `tree-interventions-panel.tsx:687` | "La extracción quedará rechazada y no podrá reabrirse desde esta solicitud." | rephrase | "La extracción quedará rechazada. No se puede deshacer." |
| `tree-interventions-panel.tsx:438`, `:458` | "La extracción fue enviada a autorización." / "La intervención ya estaba vinculada al servicio {a}. El servicio {b} quedó creado sin vincular: cancélelo desde Servicios." | rephrase | "Extracción enviada a autorización." / "Ya estaba vinculada al servicio {a}. Cancele el servicio {b} desde Servicios." |

### Propuestas estructurales — Catálogo

- **Portada del catálogo con títulos.** Las doce tarjetas pierden su descripción; el título del catálogo ya dice qué contiene.
- **Un solo texto para "Solo consulta".** Hoy hay once variantes de la frase "Esta sesión puede consultar el catálogo, pero no administrarlo"; pasa a una insignia "Solo consulta" en el encabezado.
- **Baja con una sola frase.** Los once diálogos de baja repiten "quedará inactivo… conservarán su referencia"; la consecuencia queda en "{objeto} quedará inactivo" y la verificación de referencias se limita a "Está en uso por {n} {cosas}".
- **Verificación de referencias bajo demanda.** Las advertencias de referencias no verificadas (zona, recorrido) se muestran solo si falló la verificación, con un casillero "Dar de baja de todos modos".
- **Diálogos de contenedor sin tarjeta de detalles.** Vaciado, desborde y reubicación repiten dirección y estado en un cuadro "Detalles del contenedor"; el título del diálogo ya nombra el contenedor.
- **Zona: código solo en el alta y la edición.** La columna "Código" de la lista de zonas se quita; el código sigue visible dentro del formulario de edición. Todos los selectores de zona muestran el nombre.
- **Recorrido: editor de paradas con una línea de estado.** "{n} paradas · {minutos} min" reemplaza el párrafo "listas para guardar".
- **Árbol: relevamiento sin ayudas de campo.** Quitar las ayudas de fecha, riesgo e intervención; dejar solo la restricción de riesgo alto.

---

## 8. Indicadores

### Tablero (`indicators-dashboard.tsx`)

| Ubicación | Texto actual | Acción | Propuesta |
| --- | --- | --- | --- |
| `indicators-dashboard.tsx:420` | "Una lectura común de cobertura, cumplimiento, incidencias y residuos para coordinar la operación municipal." | delete | — |
| `indicators-dashboard.tsx:220` | `aria-label` "Familias de indicadores" | rephrase | "Familias" |
| `indicators-dashboard.tsx:249` | "No se pudo cargar {sección}" + "Verifique la conexión y vuelva a intentarlo. El período y la familia seleccionada se conservarán." | rephrase | "No se pudo cargar {sección}. Intente nuevamente." |
| `indicators-dashboard.tsx:414` | "Indicadores no disponibles" + "Su sesión no tiene la capacidad necesaria para consultar indicadores operativos." | rephrase | "No tiene permiso para ver los indicadores." |
| `indicators-dashboard.tsx:454` | "Resumen de {familia}" / "Cargando resumen…" / "No se pudo cargar el resumen." / "No hay resultados para este período." | rephrase | "{familia}" / "Cargando…" / "No se pudo cargar. Intente nuevamente." / "Sin resultados en el período." |
| `indicators-dashboard.tsx:443` | `aria-label` "Visualización de indicadores" | rephrase | "Vista" |
| `indicators-dashboard.tsx:471` | "Cargando {noun}…" / "No se pudieron cargar las {noun}; el filtro no está disponible." | rephrase | "Cargando…" / "No se pudieron cargar. Intente nuevamente." |
| `indicators-dashboard.tsx:484` | "No se encontraron {noun}." | rephrase | "Sin resultados." |
| `indicators-dashboard.tsx:504` | "Unidad de análisis: servicio + zona. Los objetivos programados representan la meta del período; los servicios cancelados no se incluyen en el cálculo de incumplimiento." | delete | — |
| `indicators-dashboard.tsx:507` | "El estado en fecha compara el último `ZoneResult.recordedAt` con `Service.scheduledDate`. Las zonas sin atención se ordenan con el motivo registrado." | delete | — |
| `indicators-dashboard.tsx:510` | "Los contenedores y arbolado son instantáneas actuales; los reportes consideran el período y la resolución media usa solo reportes cerrados." | rephrase | "Contenedores y arbolado: situación actual." |
| `indicators-dashboard.tsx:513` | "Los volúmenes se informan en kilogramos y metros cúbicos por tipo y destino. El desvío expresa el porcentaje del período que no fue enviado al relleno sanitario." | rephrase | "Volúmenes en kg y m³. Desvío: porcentaje que no fue a relleno sanitario." |
| `indicators-dashboard.tsx:134` | "La señal «{señal}» no se puede vincular con un registro operativo: el contrato de indicadores no expone una clave compatible con un catálogo actual." | rephrase | "No hay registros para «{señal}»." |
| `indicators-dashboard.tsx:552` | "Registros accesibles" + "Consulte los registros que explican la señal sin habilitar su gestión desde el tablero." | rephrase | "Registros" (sin descripción) |
| `indicators-dashboard.tsx:556` | "Filtro activo: …" / "Sin filtro de señal. Se muestran todos los {registros} accesibles en el período." / "Seleccione una señal compatible para consultar sus registros accesibles." | rephrase | "Filtro: …" / "Todos los registros del período." / "Seleccione un dato del gráfico." |
| `indicators-dashboard.tsx:557` | "Quitar filtro de señal" | rephrase | "Quitar filtro" |
| `indicators-dashboard.tsx:559` | "Cargando registros accesibles…" / "No se pudieron cargar los registros accesibles." / "No hay una relación de registros disponible para esta señal." / "Esta familia no tiene una vista de registros accesibles para la selección actual." | rephrase | "Cargando…" / "No se pudieron cargar los registros." / "Sin registros." |
| `indicators-dashboard.tsx:550` | "No se pudieron cargar los registros relacionados porque la familia seleccionada no está disponible." | rephrase | "No se pudieron cargar los registros." |
| `indicators-dashboard.tsx:570` | "No hay registros accesibles para este filtro." | rephrase | "Sin registros." |
| `indicators-dashboard.tsx:105`, `:117`, `:128` | "Abrir Servicios" / "Abrir catálogo de contenedores" | rephrase | "Ver servicios" / "Ver contenedores" |
| `indicators-dashboard.tsx:145`, `:156` | "Sin zona informada" / "Sin dirección registrada" | rephrase | "Sin zona" / "Sin dirección" |

### Propuestas estructurales — Indicadores

- **Quitar las notas de método.** Los cuatro párrafos "detailContext" (unidad de análisis, definición de "en fecha", instantáneas, volúmenes) se reemplazan por, como máximo, un texto de ayuda dentro de un tooltip de la familia, no visible por defecto.
- **Registros como panel secundario.** "Registros" arranca contraído y se abre al elegir un dato del gráfico; hoy repite un mensaje por cada combinación de estado.
- **Encabezado sin subtítulo.** El título y el selector de período alcanzan; el período y la frescura de datos se mantienen.
