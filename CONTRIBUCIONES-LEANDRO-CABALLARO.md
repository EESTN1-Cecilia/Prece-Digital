# Contribuciones de Leandro Caballaro

Resumen de los commits de Leandro Caballaro (`leandrocaballaro`) en los dos repositorios del proyecto, sin contar merges.

- [Prece-Digital](https://github.com/EESTN1-Cecilia/Prece-Digital): 17 commits
- [Prece-Digital-Backend](https://github.com/EESTN1-Cecilia/Prece-Digital-Backend): 5 commits

## Prece-Digital-Backend

| Fecha | Commit | Aporte |
|---|---|---|
| 2026-09-03 | `c251fb8` | Estructura académica base: cursos, divisiones, materias y asignación docente |
| 2026-09-03 | `35fe047` | Módulo de espacios, edificios y carreras |
| 2026-09-03 | `596fbcc` | Horarios, turnos y franjas; gestión de docentes; ausencias y novedades docentes; inventario y movimientos |
| 2026-09-08 | `1945994` | Listados de alumnos por curso, división, grupo y taller |
| 2026-09-09 | `3137334` | Autenticación y módulos de gestión |

## Prece-Digital

### Backend

| Fecha | Commit | Aporte |
|---|---|---|
| 2026-09-16 | `b84941f` | Filtros de condición y período académico en listados; `listarPorIds`/`totalPorIds` en el repositorio; se elimina `LISTADOS_STUDENTS_ROLES`; tests de listados reescritos |
| 2026-09-17 | `5b013e7` | Gestión de movimientos de inventario del servidor |
| 2026-09-22 | `3fbc224` | Solicitudes y reservas de materiales; servicio general de notificaciones; flag `allowReservation` en inventario; permisos `NOTIFICATIONS_MANAGE`, `REQUESTS_WRITE` y `RESERVATIONS_WRITE` |
| 2026-10-07 | `2b5ed5c` | Rutas propias de alertas de inasistencia bajo `/api/v1/alertas/inasistencias` |
| 2026-10-09 | `bf69a8b` | Test de contrato con el frontend: se recorta la variable pegada al path en el escaneo |
| 2026-10-13 | `0856cf5` | Registro de las rutas de condiciones particulares en `routes/index.mjs` |
| 2026-10-13 | `0715e94` | Fix menor |
| 2026-11-03 | `0503f22` | Endurecimiento de seguridad HTTP y configuración de producción |
| 2026-11-03 | `281f74d` | Alcance adaptado a `main` y control de acceso por escuela |
| 2026-11-03 | `6b2eabc` | Corrección de la ruta citada en `SEGURIDAD.md` |
| 2026-11-03 | `dbffeae` | Los docentes sólo ven alumnos de sus cursos |
| 2026-11-03 | `fb5e8df` | Se separa el año lectivo del curso al recortar respuestas |
| 2026-11-03 | `fd3e0a6` | Rechazo de campos reservados y restricciones de base de datos |
| 2026-11-04 | `29d822d` | Gestión de preceptores suplentes |

### Frontend

| Fecha | Commit | Aporte |
|---|---|---|
| 2026-11-03 | `738d69b` | Se guardan en la API las cátedras que Dirección asigna a docentes |
| 2026-11-03 | `c1bdc98` | Test web: aviso de impresión de talleres sin cronograma |
| 2026-11-04 | `d4e6f81` | Calendario: errores de validación visibles en el formulario |

## Áreas cubiertas

- **Académico:** cursos, divisiones, materias, docentes, horarios, listados de alumnos.
- **Inventario y materiales:** movimientos, solicitudes, reservas.
- **Notificaciones y alertas:** servicio general, alertas de inasistencia.
- **Seguridad y permisos:** HTTP/producción, alcance por escuela, acceso docente por curso, validación de campos.
- **Gestión de preceptores:** suplencias.
