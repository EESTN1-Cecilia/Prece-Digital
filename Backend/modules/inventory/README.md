# Inventario (área de Server)

Módulo para la gestión del inventario de materiales, stock, ubicación y
trazabilidad. Todo cambio de stock se registra como movimiento (altas, bajas,
donaciones, préstamos, devoluciones y ajustes autorizados); el stock vigente se
mantiene atómicamente sincronizado con los movimientos y las modificaciones de
datos del material se auditan en un historial independiente.

## Materiales

- `POST /api/v1/inventory` → alta de material (requiere `inventory.write`)
- `GET /api/v1/inventory` → listado con filtros `category`, `status`, `location`, `unit`, `search`, `includeInactive`
- `GET /api/v1/inventory/:itemId` → consulta de un material
- `GET /api/v1/inventory/stock-low` → materiales con stock bajo o agotado
- `PATCH /api/v1/inventory/:itemId` → modificación de datos (nunca `quantity`; el stock solo se modifica vía movimientos)
- `DELETE /api/v1/inventory/:itemId` → baja (desactiva, no elimina el historial; requiere `inventory.manage`)

Catálogo de estados: `disponible`, `agotado`, `danado`, `en_reparacion`, `inactivo`.
Categorías: `mobiliario`, `equipamiento`, `material`, `herramienta`, `tecnologia`, `otro`.

## Stock

- `GET /api/v1/inventory/:itemId/stock` → stock vigente + nivel (`normal`, `bajo`, `agotado`)
- `GET /api/v1/inventory/:itemId/stock/verify` → reconstruye el stock desde el historial de movimientos y devuelve `stockActual`, `stockCalculado` y `consistente` (auditoría)

El stock de un material se refleja en `quantity`. Todo cambio de stock se registra
como movimiento con `previousStock` y `resultingStock`, y el responsable se toma de
la sesión autenticada (nunca del frontend).

## Movimientos

- `POST /api/v1/inventory/:itemId/movements` → registra `alta`, `baja`, `donacion`, `prestamo` o `devolucion` (requiere `inventory.write`)
- `POST /api/v1/inventory/:itemId/movements/adjust` → ajuste de stock a un valor objetivo (requiere `inventory.manage`)
- `GET /api/v1/inventory/:itemId/movements` → movimientos de un material (filtros `type`, `motivo`, `fromDate`, `toDate`)
- `GET /api/v1/inventory-movements` → movimientos globales (filtros `itemId`, `type`, `userId`, `motivo`, `fromDate`, `toDate`)
- `GET /api/v1/inventory-movements/:movementId` → consulta de un movimiento por ID

Tipos de movimiento: `alta`, `baja`, `donacion`, `prestamo`, `devolucion`, `ajuste`.

Reglas de negocio:
- `cantidad` es siempre un entero mayor a cero; la dirección la define el tipo:
  `alta`, `donacion` y `devolucion` incrementan el stock; `baja` y `prestamo` lo decrementan.
- El stock nunca puede quedar negativo: una `baja` o `prestamo` superior al stock disponible devuelve `422`.
- `motivo` es obligatorio en todo movimiento.
- La `devolucion` puede referenciar un `prestamo` previo del mismo material
  (`referenceMovementId`): la cantidad devuelta no puede superar el saldo pendiente
  (cantidad prestada menos devoluciones ya registradas contra ese préstamo).
- El `ajuste` se envía al endpoint `/adjust` con `nuevoStock` (entero no negativo)
  y fija el stock a ese valor; su `cantidad` es `|nuevoStock - stockAnterior|`.
  Un ajuste sin diferencia (`nuevoStock` igual al stock actual) devuelve `422`.
- Un material desactivado no admite nuevas operaciones de stock.
- Los movimientos son inmutables e históricos: nunca se eliminan ni se reescriben.
- La actualización de stock y la inserción del movimiento ocurren de forma atómica:
  ante una validación fallida no queda ni stock ni movimiento parcial.
- Al agotarse el stock el estado pasa a `agotado`; al reponerse vuelve a `disponible`.

## Historial (auditoría)

- `GET /api/v1/inventory/:itemId/history` → cambios de datos del material (filtros `changedBy`, `fromDate`, `toDate`)

## Almacenamiento

El módulo se implementa en memoria (Map en `database/memory-store.mjs`, prefijos
`inv_`/`inm_`/`inh_`). La migración `database/migrations/005_inventario.sql` define
la persistencia relacional (`inventario_materiales`, `movimientos_inventario`,
`historial_inventario`) con las mismas reglas y enums.