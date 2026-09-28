# Alertas por inasistencia consecutiva

Detecta automaticamente cuando un alumno alcanza el periodo de inasistencias
consecutivas que exige la institucion, registra la situacion detectada y genera el
evento que dispara la notificacion a preceptoria.

## Como esta separado

El modulo esta partido en tres piezas a proposito, porque la institucion necesita
poder cambiar la regla y el canal de comunicacion por separado:

- `deteccion.service.mjs` decide que periodos cumplen la condicion. Es codigo puro:
  no lee el store, no escribe y no importa notificaciones. La misma funcion corre
  al registrar una inasistencia, desde un proceso periodico y desde cualquier otro
  canal.
- `attendance-alerts.service.mjs` orquesta: deduplica, registra la alerta y recien
  despues notifica.
- `despacho-notificaciones.service.mjs` es el unico que envia. Reemplazarlo por
  correo, sms o app es cambiar ese archivo y el campo `canales` de la
  configuracion; la deteccion no se toca.

## Flujo de una evaluacion

1. La deteccion recibe las inasistencias vigentes del alumno y la configuracion de
   la escuela, y devuelve los periodos que cumplen la condicion.
2. Cada periodo trae una `clave` construida con escuela, alumno, condicion, rango de
   fechas y umbral. Si ya hay una alerta valida con esa clave, el periodo se omite
   y queda registrado como duplicado evitado.
3. Se registra la alerta con estado `activa` y la configuracion que se aplico.
4. Se genera el evento con destinatarios, tipo, mensaje, prioridad, canal y estado.
5. Se despacha la notificacion y se vincula el evento a la alerta.

Repetir cualquiera de los pasos no produce una segunda alerta: la deduplicacion
esta en la clave, no en el momento de la llamada.

## Configuracion por escuela

`GET /api/v1/configuracion-alertas` y `PUT /api/v1/configuracion-alertas` sobre la
escuela de la sesion. Campos:

| Campo | Por defecto | Que hace |
| --- | --- | --- |
| `habilitada` | `true` | Apaga la deteccion sin borrar la configuracion. |
| `diasConsecutivos` | `3` | Dias lectivos seguidos que generan la alerta. |
| `tiposContabilizados` | `["ausente"]` | Que tipos de inasistencia cuentan. |
| `justificadasGeneranAlerta` | `false` | Si una inasistencia justificada cuenta para el umbral. |
| `justificadasReinicianRacha` | `true` | Si una justificada corta la racha. |
| `prioridadNotificacion` | `"alta"` | Prioridad del evento. |
| `canales` | `["notificacion_interna"]` | Canales por los que se avisa. |
| `diasNoHabiles` | `[]` | Feriados y feriados puente. Los sabados y domingos ya se excluyen. |
| `umbralAlertaInasistencias` | `15` | Referencia institucional para el reporte, no intervene en la racha. |

## Que cuenta como consecutivo

Dias lectivos corridos: el fin de semana no corta la racha porque no hay clase que
falte, y los dias no habiles de la escuela tampoco. Si el alumno falta el jueves y
el viernes de la misma semana, la racha sigue; si falta el jueves y el lunes
siguiente, se corta, porque el viernes no se registro y el fin de semana no
empieza un conteo nuevo.

Una inasistencia justificada no cuenta para el umbral y, por defecto, corta la
racha: lo que la institucion quiere ver es que el alumno retome la asistencia.

El periodo se cierra cuando la racha completa el umbral. Un alumno con cinco
inasistencias seguidas y umbral 3 genera un aviso, no cinco: la siguiente alerta
exige un periodo completo nuevo.

## Estados de la alerta

`activa` -> `en_revision` | `resuelta` | `descartada`
`en_revision` -> `activa` | `resuelta` | `descartada`

`resuelta` y `descartada` son terminales. `descartada` es el unico estado que
libera la clave del periodo: si la institucion descarta la alerta como falso
positivo, una evaluacion posterior puede volver a generar otra para el mismo rango.

Cada cambio de estado guarda el estado anterior en `historial` y queda en la
auditoria del modulo.

## Endpoints

### Inasistencias (permisos `attendance.read` / `attendance.write`)

| Metodo | Ruta | Que hace |
| --- | --- | --- |
| POST | `/api/v1/inasistencias` | Registra una inasistencia y devuelve la evaluacion que produjo. |
| GET | `/api/v1/inasistencias` | Lista con filtros por alumno, tipo, justificada y rango de fechas. |
| GET | `/api/v1/inasistencias/:inasistenciaId` | Detalle de una inasistencia. |
| PATCH | `/api/v1/inasistencias/:inasistenciaId` | Corrige o justifica. Vuelve a evaluar sin duplicar. |
| DELETE | `/api/v1/inasistencias/:inasistenciaId` | Baja logica con motivo. Nunca se borra fisico. |
| GET | `/api/v1/alumnos/:alumnoId/inasistencias` | Inasistencias del alumno, ordenadas por fecha. |

Una inasistencia por alumno y dia: registrar dos veces la misma fecha responde 409.

### Alertas (permisos `attendance-alerts.read` / `attendance-alerts.write`)

| Metodo | Ruta | Que hace |
| --- | --- | --- |
| GET | `/api/v1/alertas` | Lista con filtros, orden y paginacion. |
| GET | `/api/v1/alertas/catalogos` | Tipos, condiciones, estados, prioridades y limites. |
| GET | `/api/v1/alertas/:alertaId` | Detalle, con el evento de notificacion. |
| PATCH | `/api/v1/alertas/:alertaId` | Cambia estado, observaciones y la intervencion que la resuelve. |
| POST | `/api/v1/alertas/:alertaId/reenviar` | Reintenta un evento pendiente sin volver a detectar. |
| GET | `/api/v1/alumnos/:alumnoId/alertas` | Alertas del alumno. |
| GET | `/api/v1/alumnos/:alumnoId/alertas/resumen` | Inasistencias, racha actual y cuanto falta para la alerta. |

### Deteccion y configuracion

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/alertas/evaluar` | `attendance-alerts.write` |
| GET | `/api/v1/alertas/evaluaciones` | `attendance-alerts.read` |
| GET | `/api/v1/configuracion-alertas` | `attendance-alerts.read` |
| PUT | `/api/v1/configuracion-alertas` | `attendance-alerts.configure` |

`POST /api/v1/alertas/evaluar` es el proceso periodico: recorre todos los alumnos
con inasistencias de la escuela. Admite `alumnoId` para evaluar uno solo. El cliente
pide que se corra, pero no puede influir en el resultado.

`attendance-alerts.configure` lo tienen solo direccion y administracion: el umbral
es una decision institucional, no de quien carga la inasistencia.

## Notificaciones

El evento que consume el sistema general de notificaciones lleva `destinatarios`,
`tipoNotificacion`, `mensaje`, `prioridad`, `canales` y `estadoEnvio`. Los
destinatarios por defecto son los preceptores de la escuela del alumno, que son
quienes gestionan el contacto con la familia.

Las notificaciones se crean en el modulo `notifications` con `type: "ausencia"`,
`referenceType: "alerta_ausencia"` y `referenceId` = id de la alerta, de modo que
un aviso se puede rastrear desde cualquier lado.

## Seguridad

- Toda operacion exige token y permiso.
- La escuela sale de la sesion: el cliente no puede consultar otra escuela. Una
  inasistencia, una alerta o un alumno de otra escuela se responde `404`, no `403`,
  para no revelar que el id existe.
- El cliente no puede crear una alerta ni forzar el resultado de una evaluacion: la
  deteccion es enteramente server-side. Solo puede pedir que se corra.
- `escuelaId` nunca se acepta desde el cuerpo, y `alumnoId` solo donde la
  operacion lo necesita: registrar una inasistencia o acotar una evaluacion a un
  alumno   de la propia escuela. La condicion, el umbral, el estado y la configuracion
  aplicada los decide el servidor.
- Altas, modificaciones, bajas, cambios de estado, ajustes de configuracion y las evaluaciones quedan en la auditoria del modulo.
