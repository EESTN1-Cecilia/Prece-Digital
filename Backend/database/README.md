# Database

## Persistencia actual

La API persiste en memoria: `memory-store.mjs` es el único almacenamiento y cada módulo accede a él solo a través de su repositorio (`modules/<x>/<x>.repository.mjs`, `database/repositories/`).

`seeds/index.mjs` carga los datos de desarrollo de todos los módulos al arrancar fuera de producción. `seeds/students.seed.mjs` es la única lista de alumnos: los demás seeds referencian sus ids.

## Modelo objetivo

`schema.sql` y `migrations/` describen el modelo relacional para MySQL (desarrollo) y PostgreSQL (producción). Todavía no está conectado.

Para migrar un módulo:

1. Crear sus tablas en `schema.sql`/`migrations/`.
2. Reescribir su repositorio contra la base, manteniendo los mismos métodos.
3. Correr `npm test`: controladores, servicios y rutas no cambian.

Las cuentas y los alumnos se dan de baja de forma lógica: no hay borrado físico.
