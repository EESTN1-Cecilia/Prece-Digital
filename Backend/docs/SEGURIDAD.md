# Política y revisión de seguridad del backend

Reglas comunes para Web y Mobile: ambos consumen la misma API y no hay política propia por cliente. Toda regla se aplica en el backend.

## Reglas vigentes

| Tema | Regla | Dónde |
| --- | --- | --- |
| Contraseñas | Solo hash con bcrypt. Nunca se devuelven ni se registran. | `modules/auth/`, `userRepository.publicView` |
| Tokens | JWT de acceso (15 min) y refresh rotativo y revocable (7 días). El usuario se vuelve a leer en cada pedido. | `modules/auth/token.service.mjs`, `middlewares/auth.middleware.mjs` |
| Login | Bloqueo por cuenta e IP tras intentos fallidos, con 429. Mensaje único para no revelar si la cuenta existe. | `modules/auth/login-throttle.service.mjs` |
| Autorización | `verifyToken` + `authorize({ permission })` según el catálogo del backend. El 403 no detalla permisos ni alcance. | `middlewares/authorize.middleware.mjs`, `config/permissions.config.mjs` |
| Errores | Formato único `{ error: { code, message, details } }`. Sin stack ni SQL en producción. | `middlewares/error.middleware.mjs` |
| Auditoría | Altas, cambios y bajas automáticos; login y logout; errores y rechazos con usuario e IP. Oculta contraseñas y tokens. Consulta solo con `AUDIT_READ`. | `modules/audit/` |
| Secretos | Solo por variables de entorno. `.env` no se versiona; `.env.example` no tiene valores reales. | `config/app.config.mjs` |
| Archivos | La API no recibe archivos hoy: el cuerpo es solo JSON. Un módulo que los agregue debe validar tipo, tamaño y contenido, generar el nombre en el backend y guardar fuera del código. | `utils/read-body.mjs` |

## HTTP

- Métodos: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` y `OPTIONS` para CORS. Otro método responde 405.
- Cuerpo: `application/json`, objeto JSON, 1 MB como máximo. Si no, responde 415, 400 o 413.
- Headers en toda respuesta: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`, `Cache-Control: no-store`. En producción también `Strict-Transport-Security`.
- La API no usa cookies.

## CORS

`CORS_ORIGINS` lista los orígenes autorizados, separados por comas. Sin la lista, desarrollo acepta cualquier origen y producción no arranca. `*` tampoco arranca en producción. Headers permitidos: `Authorization` y `Content-Type`. No se habilitan credenciales.

## Rate limiting

Por IP, ventana de 60 s, configurable por entorno. Al superarlo responde 429 con `Retry-After` y queda en el log de errores.

| Grupo | Variable | Por defecto |
| --- | --- | --- |
| Autenticación (login, refresh, logout) | `RATE_LIMIT_AUTH` | 300 |
| Lecturas | `RATE_LIMIT_READ` | 3000 |
| Escrituras | `RATE_LIMIT_WRITE` | 1000 |

Los valores son altos porque una escuela suele salir por una sola IP. `X-Forwarded-For` solo se usa con `TRUST_PROXY=true`.

## Arranque en producción

No arranca sin: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (12 caracteres o más). Con `DB_CLIENT=sqlserver` exige además `DB_USER` y `DB_PASSWORD`. Los usuarios de desarrollo no se crean en producción.

## Revisión previa a producción

Corregido en esta revisión:

| Hallazgo | Corrección |
| --- | --- |
| Producción creaba usuarios con contraseñas publicadas en el repositorio | Solo administrador inicial por entorno |
| CORS `*` en todos los entornos | Lista obligatoria en producción |
| `X-Forwarded-For` falsificable: evadía el bloqueo de login y falseaba la IP de auditoría | Solo con `TRUST_PROXY` |
| Una URL inválida generaba un rechazo fuera del manejo de errores | Validada dentro del flujo, responde 400 |
| El 403 revelaba permiso, roles y alcance | Respuesta sin detalle |
| Sin headers de seguridad, sin límite general, sin control de método ni `Content-Type` | Agregados |
| Login auditado como `create` y sin usuario | Acción `login` con el usuario |

Revisado sin hallazgos: un preceptor recibe 403 en las 44 rutas con id de un alumno que no tiene asignado; `003_usuario_aplicacion.sql` no usa roles administrativos; `npm audit` de producción sin vulnerabilidades; sin `.env`, claves ni certificados en el historial de Git; sin SQL armado por interpolación en la búsqueda sobre `modules/` y `database/`.

## Pendiente

- **Campos inesperados:** el rechazo central cubre campos del servidor y claves de prototipo (`utils/read-body.mjs`). Otros campos desconocidos se ignoran en cada módulo, no se rechazan.
- **Acceso de docentes:** un docente puede leer datos, tutores y condiciones particulares de cualquier alumno, no solo de sus cursos. Falta decidir la regla.
- **Alcance por escuela:** `authorize` solo compara la escuela si el pedido la nombra. Con un id directo no se compara, y un director de otra escuela podría leer el recurso. Hay que cerrarlo antes de operar con más de una escuela.
- **Base de datos:** `014_restricciones_integridad.sql` no se ejecutó contra un MySQL real. `DB_ENCRYPT` es `false` por defecto y en producción solo genera un aviso.
- **Datos personales:** falta la matriz de campos por rol y endpoint.
- **Conservación de auditoría:** falta definir el plazo.
- **Persistencia:** la mayoría de los módulos usa el store en memoria, sin transacciones reales ni datos tras reiniciar.
- **Rate limit:** es por proceso, no compartido entre instancias.
- **Público sin token:** `/health`, `/api/v1/modules` y `/api/v1/roles`. Falta decidir si los dos catálogos deben seguir abiertos.
- **Contraseñas de desarrollo:** siguen en `database/seeds/auth.seed.mjs` y `scripts/auth-smoke.mjs`. No usarlas fuera de desarrollo.
