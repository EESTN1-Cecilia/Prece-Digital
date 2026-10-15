# Reservas de materiales (área de Server)

Módulo para reservar materiales del inventario para una fecha y horario determinados,
controlando la disponibilidad real (stock + reservas superpuestas) y administrando el
ciclo de vida de cada reserva. Se integra con el inventario y con las solicitudes de materiales.

## Ciclo de vida

```
             ┌── aprobada ────────────► activa ────────────► finalizada
             │        └──────────────► cancelada
pendiente ───┤
             └── rechazada (motivo obligatorio)

cancelada: desde pendiente o aprobada (aprobada solo por personal del Server)
```

Transiciones validadas por el backend: saltar pasos o mover estados terminales
(`rechazada`, `cancelada`, `finalizada`) devuelve `409`.

### Bloqueo de disponibilidad (regla institucional)

- `pendiente`, `aprobada` y `activa` **bloquean** la cantidad reservada durante el periodo.
- `rechazada`, `cancelada` y `finalizada` **liberan** la disponibilidad.
- Al aprobar y al entregar se revalida la disponibilidad excluyendo la propia reserva.

## Endpoints

- `POST /api/v1/material-reservations` → crea la reserva (`reservations.write`)
- `GET /api/v1/material-reservations` → listado con filtros (`reservations.read`)
  `ownerId`, `status`, `itemId`, `fromDate`, `toDate`, `sort=asc|desc`
- `GET /api/v1/material-reservations/availability` → disponibilidad de un material para un
  periodo (`reservations.read`). Query: `itemId`, `startDate`, `endDate`, `startTime`, `endTime`
- `GET /api/v1/material-reservations/:reservationId` → detalle con historial
- `PATCH /api/v1/material-reservations/:reservationId` → modifica
  `reason`, `observations`, `items` y/o periodo mientras esté `pendiente` (dueño o gestión)
  o `aprobada` (solo gestión). Revalida disponibilidad excluyendo la propia reserva.
- `POST /api/v1/material-reservations/:reservationId/approve` → aprueba (`reservations.manage`)
- `POST /api/v1/material-reservations/:reservationId/reject` → rechaza, motivo obligatorio (`reservations.manage`)
- `POST /api/v1/material-reservations/:reservationId/cancel` → cancela (`reservations.write`);
  desde `aprobada` requiere `reservations.manage`
- `POST /api/v1/material-reservations/:reservationId/deliver` → entrega/activa y genera los
  movimientos de inventario (`reservations.manage` + `inventory.write`)
- `POST /api/v1/material-reservations/:reservationId/finish` → finaliza (`reservations.manage`)
- `GET /api/v1/material-reservations/:reservationId/history` → historial de la reserva

## Creación

```json
POST /api/v1/material-reservations
{
  "reason": "Experiencia de laboratorio",
  "observations": "Preparar material antes de las 14 hs",
  "startDate": "2026-09-28",
  "endDate": "2026-09-28",
  "startTime": "14:00",
  "endTime": "16:00",
  "items": [
    { "itemId": "inv_xyz123", "quantity": 8 },
    { "itemId": "inv_abc789", "quantity": 2 }
  ]
}
```

El responsable se toma de la sesión autenticada (`ownerId`), nunca del frontend.
Cada ítem requiere un material activo **habilitado para reservas** (`allowReservation`,
por defecto `true`; se controla con `createMaterial`/`PATCH /inventory/:itemId`),
de la misma escuela, con cantidad entera mayor a cero y sin duplicados.

## Disponibilidad

La cantidad disponible para un periodo es:

```
disponible = stock_actual − Σ cantidad reservada en reservas que se superponen al periodo
            (pendientes, aprobadas o activas)
```

Dos reservas se consideran superpuestas si `inicioReservaA < finReservaB && inicioReservaB < finReservaA`,
comparando fecha + hora combinadas. La consulta de disponibilidad devuelve
`{ stock, reserved, available }` sin excluir ninguna reserva.

## Aprobación y entrega

- Aprobar revalida disponibilidad (excluyendo la propia reserva) y **no descuenta stock**.
- Entregar (solo desde `aprobada`) revalida disponibilidad y genera un movimiento tipo `baja`
  por cada material, con `previousStock`/`resultingStock`, `userId` de la sesión y motivo
  `Entrega por reserva <id> - <motivo>`. Es atómica: los movimientos se aplican solo tras
  validar todos los materiales.
- La cantidad entregada nunca supera la reservada (se entrega la cantidad reservada).
- Finalizar libera la disponibilidad y conserva el historial.

## Seguridad y auditoría

- `401` sin token; `403` sin permiso suficiente.
- Aprobar/rechazar/entregar/finalizar requiere `reservations.manage` (personal del Server);
  entregar además `inventory.write`.
- Cada transición registra usuario, fecha, estado anterior y estado nuevo en el historial.
- No se eliminan reservas físicamente: `rechazada`, `cancelada` y `finalizada` quedan en el store.

## Almacenamiento

Módulo en memoria (Map en `database/memory-store.mjs`, prefijos `mres_`/`mri_`/`mrh_`).
La migración `database/migrations/007_reservas_materiales.sql` define la persistencia
relacional (`reservas_materiales`, `reservas_materiales_items`,
`historial_reservas_materiales`) con los mismos estados, reglas e integridad referencial.