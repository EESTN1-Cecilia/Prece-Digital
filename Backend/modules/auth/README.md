# Auth

Login propio con JWT, refresh tokens, control de permisos por rol y alcance, y bajas lógicas de cuentas.

## Endpoints

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/login` | No | Inicia sesión |
| POST | `/auth/refresh` | No | Rota el refresh token y emite un access token nuevo |
| POST | `/auth/logout` | No | Revoca el refresh token |
| GET | `/auth/me` | Bearer | Perfil y asignaciones del usuario autenticado |
| POST | `/auth/users/:userId/deactivate` | Bearer + `users.deactivate` | Baja lógica de la cuenta |

## Estrategia de autenticación

- Las contraseñas se guardan como hash bcrypt, nunca en texto plano.
- El login emite un **access token** (JWT HS256, vence por `JWT_ACCESS_EXPIRES_IN`) y
  un **refresh token** opaco con expiración propia (`JWT_REFRESH_EXPIRES_IN`).
- El access token solo lleva `sub` (id del usuario), `typ` y `roles`; nunca datos sensibles.
- El refresh token se guarda como hash SHA-256 en el store y se rota en cada uso:
  reutilizar uno revocado invalida todas las sesiones del usuario.
- El cierre de sesión revoca el refresh token en uso.
- Los secretos JWT se leen de `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`. En
  producción es obligatorio definirlos por variables de entorno con 16 caracteres
  o más; la API no arranca con los valores de desarrollo.

## Protección contra fuerza bruta

El login se limita por cuenta y por origen:

- `LOGIN_MAX_EMAIL_ATTEMPTS` (5): intentos fallidos por email antes de bloquear la cuenta.
- `LOGIN_MAX_IP_ATTEMPTS` (20): intentos fallidos por IP antes de bloquear el origen.
- `LOGIN_WINDOW_MS` y `LOGIN_LOCK_MS` (900000): ventana de conteo y duración del bloqueo.

Mientras hay un bloqueo, todo intento responde `429 TOO_MANY_ATTEMPTS` con el mismo
mensaje genérico (no permite deducir qué cuenta está afectada). Un login exitoso
despeja el contador de la cuenta. El contador por email solo avanza para cuentas
reales, para no permitir bloquear emails inexistentes.

## Alcance

Cada asignación combina un rol con un contexto opcional:

- `schoolId` (escuela)
- `courseId` (curso)
- `divisionId` (división)
- `subjectId` (materia)
- `shiftId` (turno)
- `periodId` (período)

Un valor omitido en la asignación significa “todo ese nivel”. Una asignación más específica no habilita acciones de nivel más amplio.

## Bajas lógicas

Las cuentas no se borran. Se desactivan (`isActive: false`, `deactivatedAt`) y se revocan sus sesiones.
