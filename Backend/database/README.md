# Database

La API usa un pool de MySQL mediante `mysql2`. La conexión se toma de `DATABASE_URL`.

## Configuración local

1. Crear un archivo `.env` a partir de `.env.example`.
2. Iniciar MySQL (por ejemplo, desde XAMPP).
3. Importar `schema.sql` en MySQL o phpMyAdmin.
4. Ejecutar `npm run dev`.

El servidor mantiene disponible la conexión real en `database/client.mjs`. Durante el prototipo, algunos módulos pueden usar repositorios en memoria hasta que se conecten sus tablas definitivas.

## Producción

La base para producción será PostgreSQL. Las migraciones deben mantenerse compatibles con MySQL y PostgreSQL o separarse por adaptador cuando una diferencia sea inevitable.

Las cuentas de usuario se dan de baja de forma lógica: no hay borrado físico. El repositorio marca `isActive = false` y `deactivatedAt`.
