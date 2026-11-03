# Database

## Persistencia actual

La API persiste en memoria: `memory-store.mjs` es el único almacenamiento y cada módulo accede a él solo a través de su repositorio (`modules/<x>/<x>.repository.mjs`, `database/repositories/`).

`seeds/index.mjs` carga los datos de desarrollo de todos los módulos al arrancar fuera de producción. `seeds/students.seed.mjs` es la única lista de alumnos: los demás seeds referencian sus ids.

`seeds/alumnos-datos.seed.mjs` completa a todos los alumnos al arrancar en desarrollo (no corre en los tests): notas del ciclo actual y de los anteriores según el plan de su año (`Shared/src/planes-boletin.mjs`), previas, inasistencias, datos personales faltantes y un tutor. Los valores salen del id del alumno: cada reinicio genera los mismos datos.

## Modelo objetivo

`schema.sql` y `migrations/` describen el modelo relacional para MySQL (desarrollo) y PostgreSQL (producción). Todavía no está conectado.

Para migrar un módulo:

1. Crear sus tablas en `schema.sql`/`migrations/`.
2. Reescribir su repositorio contra la base, manteniendo los mismos métodos.
3. Correr `npm test`: controladores, servicios y rutas no cambian.

Las cuentas y los alumnos se dan de baja de forma lógica: no hay borrado físico.

## SQL Server

`sqlserver/` tiene la migracion T-SQL, la verificacion del padron, la conexion (`mssql`) y la guia para conectar el portal del alumno a SQL Server (`DB_CLIENT=sqlserver`). Ver `sqlserver/README.md`.
