# M6 Environment, Hygiene and Urban Services

Vocabulario común para las operaciones municipales de Ambiente, Higiene y Servicios Urbanos.

## Language

**Service**:
Unidad de trabajo municipal programable, de tipo ROUTE (recorrido por zonas) o POINT (intervención sobre un objetivo puntual), que avanza desde su planificación hasta un resultado operativo.
_Avoid_: Job, task, work order

**Assignment**:
Asociación de una cuadrilla y un vehículo con un Service ya programado. Asignar es una decisión distinta de programar.
_Avoid_: Staffing, dispatch

**Zone (M6)**:
Agrupación operativa de barrios usada para componer Routes y organizar Services. Es distinta de los conceptos llamados “zona” en otros módulos.
_Avoid_: M9 zone, neighborhood (the unit a Zone groups)

**Validity (ServiceFrequency)**:
Período durante el cual una regla de ServiceFrequency está vigente. Su finalización no cambia los Services que ya se generaron con esa regla.
_Avoid_: Frequency deactivation, generic close

**ZoneResult**:
Resultado registrado para una zona de un Service, sea ROUTE o POINT: serviced, partial o not-serviced.
_Avoid_: Zone status, stop result

**Delayed notice**:
Aviso de Campo sobre una demora en un Service, con una nota y una estimación revisada. No cambia el estado del Service.
_Avoid_: Delay status, alert

**Local draft**:
Datos todavía no enviados de un formulario de Campo, conservados cuando no hay conectividad para que una persona pueda retomarlos y enviarlos después.
_Avoid_: Offline queue, pending sync, cached submission

**Conflict (Service)**:
Situación en la que un envío de Campo ya no coincide con el Service porque otra decisión lo reasignó, canceló o reprogramó. Requiere resolución explícita y no se decide sobrescribiendo el dato más reciente.
_Avoid_: Sync error, merge conflict

**Evidence**:
Material que respalda un reporte, inspección o resultado operativo: motivo, observaciones y, cuando está disponible, una imagen o documento. La evidencia queda asociada al registro que documenta, no a una acción aislada.
_Avoid_: Attachment, proof, documentation

**Office**:
Actor de M6 responsable de planificar Services, organizar catálogos y tomar decisiones administrativas como reprogramar trabajo, autorizar intervenciones o emitir actas. Es distinto de Field.
_Avoid_: Supervisor, admin, back-office

**Field**:
Actor de M6 que ejecuta Services asignados en territorio y puede realizar inspecciones ambientales. Comprende Crew Leaders y Crew Members; es distinto de Office.
_Avoid_: Crew (the team a Field actor belongs to), worker, inspector (as a separate actor kind)

**Crew Leader**:
Integrante de Campo responsable de conducir la ejecución de una asignación y registrar sus resultados.
_Avoid_: Foreman, crew lead

**Crew Member**:
Integrante de una Crew que participa de la ejecución y consulta el trabajo asignado; el Crew Leader registra sus resultados.
_Avoid_: Worker, staff

**Capability**:
Acción específica de M6 que un actor puede realizar, como programar un Service, emitir un acta o autorizar una TreeIntervention. Una Capability es más acotada que un rol.
_Avoid_: Role, permission, scope

**My Work**:
Lista personal de trabajo pendiente para un actor. Para Field muestra Services asignados; para Office, acciones que requieren su intervención, no un resumen de todo un equipo o zona.
_Avoid_: Home, Inbox, Dashboard (as a synonym for this view)

**Sensitivity Tier**:
Clasificación de datos según su impacto de privacidad: Tier 0 (operativos y catálogos), Tier 1 (internos o vinculados a identidad) y Tier 2 (identidad de denunciantes, hallazgos de inspección y detalle de actas o sanciones). Es independiente de las acciones permitidas a un actor.
_Avoid_: PII flag, confidential, sensitive (as an undefined adjective)

**RepairRequest**:
Registro de M6 que deriva a M3 un daño de infraestructura detectado durante un Service o EnvironmentalInspection. Sigue la solicitud externa, no la orden de trabajo de M3; `publicSafetyRisk` es un hecho distinto de `severity`.
_Avoid_: work order, repair task

**StreetClosureRequest**:
Registro de M6 que solicita a M7 el cierre de una calle para ejecutar un Service o una TreeIntervention autorizada. La respuesta de M7 puede determinar si el trabajo relacionado puede avanzar.
_Avoid_: traffic ticket, closure status (when referring to the M7 response)

**Stale external referral**:
Aviso de que una RepairRequest o StreetClosureRequest sigue esperando una respuesta externa más allá del plazo previsto. No es un estado nuevo ni modifica la derivación.
_Avoid_: failed referral, timed-out request

**Manual referral recovery**:
Revisión explícita de Office para reconciliar una derivación cuando no llegó la respuesta externa esperada. Es excepcional y no reemplaza el flujo normal de respuesta.
_Avoid_: manual status edit, force transition

**Street-closure dependency**:
Dependencia entre una StreetClosureRequest y el Service de origen: la solicitud pendiente impide iniciar el Service, su aprobación permite avanzar, el rechazo requiere que Office reprograme o cancele, y el fin del cierre libera la dependencia.
_Avoid_: blocked Service status, traffic approval

**Referral context**:
Referencia que identifica el registro de origen de una RepairRequest o StreetClosureRequest y explica por qué se creó.
_Avoid_: copied source, external work order

**Duplicate referral candidate**:
Derivación activa que coincide con otra por registro de origen, tipo de solicitud, clase de daño cuando corresponda y ubicación. Es un indicio para revisión humana, no una duplicación confirmada.
_Avoid_: duplicate by text, automatic merge

**Referral reconciliation**:
Revisión de Office de una derivación cuyo origen cambió, cuya respuesta externa falta o llegó fuera de orden, o cuyo envío quedó incierto. Conserva los hechos registrados y no reemplaza una decisión externa.
_Avoid_: force sync, last-write-wins

**Uncorrelated external response**:
Respuesta externa que no puede vincularse con certeza a la derivación y al origen que declara actualizar. Requiere revisión antes de cambiar el registro de M6.
_Avoid_: orphan event, automatic recovery

**Unsent referral**:
Intento de derivación que no llegó a crear un registro en M6. Se diferencia de una derivación pendiente, que ya tiene registro y espera una respuesta externa.
_Avoid_: failed status, pending request

**Weather-triggered Service response**:
Decisión de Office sobre un Service existente cuyo origen es `WEATHER_ALERT`. Se resuelve para cada Service, no como un estado común a varios trabajos.
_Avoid_: Weather cancellation, weather batch

**Inspection follow-up**:
Service programado después de una EnvironmentalInspection para atender un hallazgo. El hallazgo no es en sí mismo un Service.
_Avoid_: Inspection batch, finding task

**EnvironmentalReport**:
Expediente ambiental de M6 asociado a una denuncia ciudadana o a una detección propia, que avanza desde su recepción hasta su cierre. Es distinto del `caseFile` de M1.
_Avoid_: caseFile, ticket (when referring to the M6 case file)

**Own-initiative detection**:
Situación ambiental observada por Field fuera de una denuncia ciudadana de M2, que ingresa al circuito de revisión de Office.
_Avoid_: ticket, complaint

**Triage**:
Revisión de Office de un EnvironmentalReport recibido para decidir si corresponde inspeccionar, devolver el caso a M2 o descartarlo.
_Avoid_: dispatch, approval

**EnvironmentalInspection**:
Registro de una inspección vinculada a un EnvironmentalReport, con lista de verificación, hallazgos y resultado.
_Avoid_: inspection task, finding task

**Inspection checklist**:
Conjunto de verificaciones aplicables a una EnvironmentalInspection que debe completarse antes de registrar su resultado.
_Avoid_: inspection form, task list

**Reinspection**:
Nueva EnvironmentalInspection programada después de una inspección inconclusa. La inspección anterior permanece en la historia del expediente.
_Avoid_: repeat inspection, inspection retry

**ViolationNotice**:
Acta formal e inmutable emitida por Office después de constatar una infracción. Puede quedar registrada sin derivación a M4 cuando no se identifica un establecimiento.
_Avoid_: sanction, fine, warning

**Non-forwarded notice**:
ViolationNotice que no puede enviarse a M4 porque no se identificó un establecimiento. Su registro no implica una sanción externa.
_Avoid_: failed notice, pending notice

**SanctionOutcome**:
Resolución de M4 asociada a una ViolationNotice, que representa la decisión externa sobre la sanción.
_Avoid_: internal resolution, notice status

**Deadline closure**:
Cierre automático de un expediente cuando vence el plazo para recibir una resolución de M4. Es distinto de una decisión sancionatoria o de un rechazo explícito.
_Avoid_: timeout dismissal, automatic rejection

**Bulk Service operation**:
Decisión coordinada que modifica varios Services como una sola operación.
_Avoid_: Mass action, bulk edit
