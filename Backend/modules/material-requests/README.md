# Solicitudes de materiales (área de Server)

Módulo para que los usuarios autorizados soliciten materiales al área de Server y el
personal responsable los revise, apruebe, rechace, entregue y cierre, manteniendo la
trazabilidad completa de cada transición de estado y su integración con el inventario.

## Ciclo de vida

`pendiente` → `en_revision` → `aprobada` → `entregada` → `cerrada`
                    ↘ `rechazada`
        `cancelada` (desde `pendiente`, `en_revision` o `aprobada`)

Transiciones validadas por el backend: mover fuera de un estado terminal
(`rechazada`, `cancelada`, `cerrada`) o saltar pasos devuelve `409`.

## Endpoints

- `POST /api/v1/material-requests` → crea una solicitud (`requests.write`)
- `GET /api/v1/material-requests` → listado con filtros (`requests.read`)
  `requesterId`, `status`, `itemId`, `fromDate`, `toDate`, `schoolId`, `sort=asc|desc`
- `GET /api/v1/material-requests/:requestId` → detalle con historial de estados
- `PATCH /api/v1/material-requests/:requestId` → modifica `reason`, `observations` o `items` mientras esté `pendiente`/`en_revision`
- `POST /api/v1/material-requests/:requestId/status` → cambio de estado genérico (`requests.manage`)
- `POST /api/v1/material-requests/:requestId/approve` → aprueba con cantidades (`requests.manage`)
- `POST /api/v1/material-requests/:requestId/reject` → rechaza (motivo obligatorio) (`requests.manage`)
- `POST /api/v1/material-requests/:requestId/cancel` → cancela (`requests.write`)
- `POST /api/v1/material-requests/:requestId/deliver` → entrega y genera los movimientos de inventario (`requests.manage` + `inventory.write`)
- `POST /api/v1/material-requests/:requestId/close` → cierra una solicitud entregada (`requests.manage`)
- `GET /api/v1/material-requests/:requestId/history` → historial de cambios de estado

## Creación

```json
POST /api/v1/material-requests
{
  "reason": "Materiales para el taller de programacion",
  "observations": "Entrega semestral",
  "items": [
    { "itemId": "inv_xyz123", "quantity": 10, "observations": "Cables tipo B" },
    { "itemId": "inv_abc789", "quantity": 4 }
  ]
}
```

El solicitante se toma de la sesión autenticada (`requesterId`), nunca del frontend.
Cada ítem requiere un material activo de la misma escuela, cantidad entera mayor a cero
y sin materiales duplicados en la misma solicitud.

## Aprobación

- Solo válida desde `en_revision`.
- La cantidad aprobada puede ser menor a la solicitada (incluso `0` = no se entrega ese ítem).
  Si un material no se lista en el body de aprobación, se aprueba la cantidad solicitada.
- Verifica disponibilidad del stock al aprobar, pero **no descuenta stock**: la salida solo
  ocurre en la entrega.

## Entrega

- Solo válida desde `aprobada` (garantiza que no se generan movimientos duplicados).
- Genera un movimiento de inventario tipo `baja` por cada material con cantidad aprobada
  mayor a cero, con `previousStock`/`resultingStock` correctos, `userId` de la sesión y
  motivo `Entrega por solicitud <id> - <motivo>`.
- La operación es atómica: todas las validaciones de stock se ejecutan antes de escribir
  cualquier movimiento; si alguna falla no queda ni movimiento ni cambio de estado.

## Seguridad

- `401` sin token; `403` sin permiso suficiente.
- Aprobar/rechazar/entregar/cerrar requiere `requests.manage` (personal del Server).
- Las operaciones de stock requieren además `inventory.write`.
- El usuario responsable de cada operación se obtiene siempre de la sesión autenticada.
- El historial de estados se conserva sin eliminación física.

## Almacenamiento

Módulo en memoria (Map en `database/memory-store.mjs`, prefijos `mreq_`/`mre_`/`mrh_`).
La migración `database/migrations/006_solicitudes_materiales.sql` define la persistencia
relacional (`solicitudes_materiales`, `solicitudes_materiales_items`,
`historial_solicitudes_materiales`) con los mismos estados, reglas e integridad referencial.