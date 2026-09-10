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
