# Eventos de ausencia y notificaciones

Módulo que vincula las ausencias docentes con el sistema general de
notificaciones. Al registrarse una ausencia activa, el backend identifica la
actividad afectada (asignación horaria, curso, división, materia, espacio),
genera un evento y notifica a los destinatarios correspondientes a través del
módulo `notifications` (nunca con lógica propia de notificación).

## Flujo

1. Se registra una ausencia válida (docente activo, asignación horaria activa,
   fecha coincidente con el día de la asignación, sin duplicados).
2. El backend crea el evento (`aev_`) con la clase afectada y el espacio liberado
   para el día y horario de esa clase (`classState: sin_clase`,
   `spaceAvailable: true`).
3. Se notifica a preceptoría de la escuela de la ausencia; para los tipos
   `medica`, `personal` e `injustificada` se notifica también a dirección, con
   prioridad `alta`. Los destinatarios se resuelven siempre en el servidor.
4. Las notificaciones usan el servicio general: `type: ausencia`,
   `referenceType: absence_event` y `referenceId` con el ID del evento.

## Deduplicación e idempotencia

- Un evento por ausencia: generar de nuevo devuelve el evento existente
  (`200`, `created: false`).
- Una notificación por destinatario y evento (nunca se duplica).
- Conservación: el evento y sus notificaciones persisten aunque la ausencia se
  anule o el grupo se reasigne posteriormente.

## Ciclo de vida

- Anular la ausencia inactiva el evento (`status: anulada`, `classState: con_clase`,
  `spaceAvailable: false`).
- Reactivar la ausencia vuelve a activar el evento.
- Actualizar la ausencia sincroniza los datos del evento sin generar notificaciones nuevas.
- Reasignación: si hay una reasignación activa para `scheduleAssignmentId` y
  `date`, las consultas posteriores reflejan el nuevo espacio (`reassigned`,
  `currentSpaceId`) sin alterar la ausencia ni el evento original.

## Endpoints

- `POST /api/v1/absence-events` · `absences.write` → genera el evento (`{ absenceId }`).
- `GET /api/v1/absence-events` · `absences.read` → listado con filtros (`absenceId`, `teacherId`, `courseId`, `divisionId`, `subjectId`, `spaceId`, `date`, `startDate`, `endDate`, `status`).
- `GET /api/v1/absence-events/by-absence/:absenceId` · `absences.read`.
- `GET /api/v1/absence-events/:eventId` · `absences.read` → evento enriquecido.
- `GET /api/v1/absence-events/:eventId/affected-classes` · `absences.read` → clases afectadas con estado y espacio actual.
- `GET /api/v1/absence-events/:eventId/class-state` · `absences.read` → `sin_clase` / `con_clase`.
- `GET /api/v1/absence-events/:eventId/space-availability` · `absences.read` → espacio liberado.
- `GET /api/v1/absence-events/:eventId/notifications` · `absences.read` → notificaciones del evento.

## Validaciones

- Existencia de la ausencia, del docente, de la asignación horaria y del espacio.
- La asignación horaria debe corresponder al docente de la ausencia.
- La ausencia debe estar activa (`409` si está anulada).
- Los destinatarios se resuelven por rol y escuela dentro del backend; el
  cliente no puede elegirlos.
- Autenticación y permisos `absences.read`/`absences.write` (401/403).

## Almacenamiento

En memoria (`database/memory-store.mjs`, Maps `absenceEvents` con prefijo `aev_`
y `absenceEventNotifications` con prefijo `ael_`). La migración
`database/migrations/006_ausencia_eventos.sql` define la persistencia relacional
(`ausencia_eventos`, `ausencia_evento_notificaciones`) con las mismas reglas.