# SQL Server

Todo lo necesario para conectar el **portal del alumno** a SQL Server cuando la base esté disponible. Mientras `DB_CLIENT` no sea `sqlserver`, la API sigue en el store en memoria y nada de esta carpeta se ejecuta.

| Archivo | Para qué |
| --- | --- |
| `001_portal_alumno.sql` | Migración T-SQL idempotente: columnas de cuenta de alumno en `usuarios`, `estudiantes.dni_provisorio`, rol/módulo/permisos del portal, tablas que el backend usa y faltaban en el modelo (`calificaciones`, `inasistencias_jornada`, `situaciones_academicas` + historial) e índices. No borra ni modifica datos académicos. |
| `verificacion-alumnos.sql` | Los mismos controles de la verificación integral, para correr directo sobre los ~900 alumnos reales. Solo lectura. |
| `conexion.mjs` | Pool de conexiones (`mssql`), consultas parametrizadas y transacciones. |
| `../../modules/student-portal/student-portal.repository.sqlserver.mjs` | Lectura de legajos, calificaciones, asistencias, situación académica, movimientos y talleres. |
| `../../modules/student-portal/cuentas.repository.sqlserver.mjs` | Cuentas de alumno en `usuarios` + `usuario_roles`. |

## Pasos para conectar

1. **Backup** de la base.
2. Revisar la **tabla de equivalencias** (abajo) contra la base real. Si algún nombre difiere, ajustar `001_portal_alumno.sql`, `verificacion-alumnos.sql` y las consultas de los dos `*.sqlserver.mjs`. Los servicios no cambian.
3. Correr la migración, cortando ante el primer error:

   ```bash
   sqlcmd -S SERVIDOR -d prece_digital -U usuario -P clave -b -i Backend/database/sqlserver/001_portal_alumno.sql
   ```

4. Correr la verificación y revisar cada lista con secretaría **antes** de habilitar el portal (DNI duplicados, provisorios, alumnos sin división, etc.):

   ```bash
   sqlcmd -S SERVIDOR -d prece_digital -U usuario -P clave -i Backend/database/sqlserver/verificacion-alumnos.sql -o verificacion.txt
   ```

5. Instalar el driver:

   ```bash
   npm install mssql -w @prece-digital/api
   ```

6. En `Backend/.env`:

   ```env
   DB_CLIENT=sqlserver
   DB_SERVER=localhost
   DB_PORT=1433
   DB_INSTANCE=            # p. ej. SQLEXPRESS (si se usa, se ignora DB_PORT)
   DB_NAME=prece_digital
   DB_USER=prece_api
   DB_PASSWORD=...
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

7. `npm run dev:api`. Al arrancar se valida la conexión y se cargan los catálogos; debe aparecer `Portal del alumno conectado a sqlserver`.

Se recomienda un usuario de base con permisos de **lectura** sobre las tablas académicas y de escritura solo sobre `usuarios` y `usuario_roles`.

## Tabla de equivalencias (modelo en memoria → SQL Server)

| Backend | Tabla SQL Server | Notas |
| --- | --- | --- |
| alumno (`students`) | `estudiantes` | `anio_division_id` es la matrícula vigente. |
| curso / división | `anios_divisiones` | `anio_curso` + `division` (número). El mismo id sirve como curso y división. |
| grupo de taller | `inscripciones_taller` → `grupos_taller` | Última inscripción activa. |
| materias de la división | `docentes_asignaciones_materias` | Del ciclo lectivo actual. |
| docente | `docentes` | |
| calificaciones | `calificaciones` (nueva) | Una fila por evaluación. `calificaciones_parciales` / `_cuatrimestrales` de schema.sql no tienen el modelo del módulo (valor por evaluación, tipo, cuatrimestre). |
| inasistencias con justificación | `inasistencias_jornada` (nueva) | `inasistencias` de schema.sql es el registro por tipo (ausente / tarde / media falta). |
| situación académica y previas | `situaciones_academicas` (+ `_historial`) (nuevas) | Previa = `tipo = 'pendiente'` de un ciclo anterior. |
| historial de cursos | `movimientos_curso` | |
| cuenta del alumno | `usuarios` (+ `usuario_roles` con rol `alumno`) | `nombre_usuario`, `estudiante_id`, `debe_cambiar_password`. El email pasa a ser opcional. |

## Qué sigue en memoria

El resto de la API (incluido el login del personal, los refresh tokens y los módulos que cargan notas y asistencias) sigue en el store en memoria hasta que cada módulo migre su repositorio. Mientras tanto:

- Las cuentas de alumno **sí** quedan en SQL Server: sobreviven a reinicios y el DNI no vuelve a servir como clave. Para que `verifyToken` las encuentre, cada cuenta usada se refleja en el repositorio de usuarios en memoria con el id `sql-usr-<id>`; después de un reinicio el alumno vuelve a iniciar sesión con su clave.
- Para que el portal muestre lo que cargan docentes y preceptores, esos módulos tienen que escribir en las mismas tablas (`calificaciones`, `inasistencias_jornada`, `inasistencias`, `situaciones_academicas`). Si se conecta solo el portal, verá los datos que ya existan en la base.
- `usuarios.dni` es único: si un alumno tiene el mismo DNI que una cuenta del personal, la creación de su cuenta falla y hay que revisarlo.
