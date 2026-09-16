# Auditoría Transversal y Logs de Errores

Módulo para accesos, cambios sensibles, exportaciones, aprobaciones, restauraciones,
sesiones, dispositivos y fallos del servidor.

## Qué hace

Centraliza la trazabilidad de todo el backend:

- **Auditoría de acciones sensibles** (`auditLogs`): altas, modificaciones, bajas,
  accesos y exportaciones. Cada registro guarda `usuario_id`, `fecha_hora`, `accion`,
  `valor_anterior`, `valor_nuevo` y `dispositivo_ip` (además de escuela, tabla,
  registro, motivo, método y ruta).
- **Log de errores** (`errorLogs`): registra automáticamente los fallos (esperados e
  inesperados) con método, ruta, código, mensaje e IP.
- **Sanitización**: antes de persistir se ocultan contraseñas, hashes y tokens
  (`password`, `token`, `refreshToken`, `secret`, …). El log de errores y las
  consultas nunca exponen cuerpo de la petición ni cabeceras.

## Cómo se registra

1. **Automático y transversal**: en `src/app.mjs`, cada `POST` / `PATCH` / `PUT` /
   `DELETE` que termina correctamente se audita solo, con la acción derivada del
   método y la tabla inferida de la ruta. Los `GET` no se registran salvo que se
   auditen explícitamente.
2. **Explícito con middleware**: `auditarAccion` (en `audit.middleware.mjs`) envuelve
   controladores puntuales (accesos sensibles, exportaciones). Soporta `obtenerAnterior`
   para capturar el valor previo en modificaciones.
3. **Fallos**: `middlewares/error.middleware.mjs` persiste cada error en `errorLogs`.

```js
import { auditarAccion } from "../modules/audit/audit.middleware.mjs";

const conAuditoria = auditarAccion({ tabla: "documentos", accion: "export" });

export const apiRoutes = {
  "GET /api/v1/documents/:id/export": requerir(auth, conAuditoria(exportarDocumento))
};
```

## Endpoints

Todos requieren sesión. Permisos: `audit:read` para consulta, `audit:export` para la
descarga.

| Método y ruta | Descripción |
| --- | --- |
| `GET /api/v1/audit/logs` | Lista registros de auditoría. Filtros: `usuarioId`, `accion`, `tabla`, `registroId`, `desde`, `hasta`. |
| `GET /api/v1/audit/logs/:logId` | Detalle de un registro de auditoría. |
| `GET /api/v1/audit/errors` | Lista logs de errores. Filtros: `tipo` (`esperado`/`inesperado`), `desde`, `hasta`. |
| `GET /api/v1/audit/errors/:errorId` | Detalle de un log de error. |
| `GET /api/v1/audit/report` | Resumen: totales, errores por tipo, acciones por acción/tabla. |
| `GET /api/v1/audit/export` | Descarga los registros como CSV (`auditoria-YYYY-MM-DD.csv`). |

Ejemplo de respuesta (`GET /api/v1/audit/logs`):

```json
{
  "data": [
    {
      "id": "aud_...",
      "usuarioId": "usr_1",
      "escuelaId": "esc-1",
      "accion": "update",
      "tabla": "students",
      "registroId": "stu_9",
      "valorAnterior": { "nombre": "Ana" },
      "valorNuevo": { "nombre": "Ana Maria" },
      "motivo": null,
      "metodo": "PATCH",
      "ruta": "/api/v1/students/9",
      "ip": "192.168.1.10",
      "fechaHora": "2026-09-11T12:00:00.000Z"
    }
  ]
}
```

## Persistencia

Actual estado: **en memoria** (`auditLogs` y `errorLogs` en `database/memory-store.mjs`).
Cuando el backend migre a MySQL, se reemplazan por las tablas `auditoria_logs` y
`logs_errores` ya definidas en `database/schema.sql`.

## Consideraciones de seguridad

- Los reportes devuelven valores sanitizados: nunca contraseñas, hashes ni tokens.
- El log de errores guarda mensaje de error y código, pero **no** el cuerpo de la
  petición ni las cabeceras.
- La auditoría nunca interrumpe el flujo principal: si registrar falla, la petición
  continúa igual.