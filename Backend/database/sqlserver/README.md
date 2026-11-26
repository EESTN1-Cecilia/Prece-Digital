# SQL Server

Hay dos usos independientes de SQL Server:

- **`DB_CLIENT=sqlserver`**: guarda todos los datos de la API en tablas `ps_*` (ver `../persistencia.mjs` y el README raíz). Solo necesita una base vacía y un usuario con permiso para crear tablas.
- **`DB_PORTAL=sqlserver`**: el portal del alumno lee las tablas académicas reales del colegio. Es lo que describe este documento.

Todo lo necesario para conectar el **portal del alumno** a las tablas académicas reales. Mientras `DB_PORTAL` no sea `sqlserver`, el portal lee los mismos datos que el resto de la API.

| Archivo | Para qué |
| --- | --- |
| `001_portal_alumno.sql` | Migración T-SQL idempotente: columnas de cuenta de alumno en `usuarios`, `estudiantes.dni_provisorio`, rol/módulo/permisos del portal, tablas que el backend usa y faltaban en el modelo (`calificaciones`, `inasistencias_jornada`, `situaciones_academicas` + historial) e índices. No borra ni modifica datos académicos. |
| `verificacion-alumnos.sql` | Los mismos controles de la verificación integral, para correr directo sobre los ~900 alumnos reales. Solo lectura. |
| `005_personal_docentes.sql` | Personal y docentes en tablas relacionales: situación de revista y docente suplido en `asignaciones_docentes`, tabla de horarios por día (`asignaciones_docentes_horarios`), cursos a cargo de cada preceptor (`asignaciones_preceptores`), rol `server` e índices únicos contra duplicados. Solo agrega; es idempotente. |
| `006_permisos_personal.sql` | Permisos de lectura y escritura del usuario de la API (`PreceDigital`) sobre esas tablas. Lo corre un administrador (`sa`). |
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

5. El driver (`mssql`) ya viene con `npm install`.

6. En `Backend/.env`:

   ```env
   DB_PORTAL=sqlserver
   DB_CLIENT=sqlserver     # opcional: ademas guarda el resto de la API en la misma base
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

## Personal y docentes (tablas relacionales)

Con `DB_CLIENT=sqlserver` el personal ya **no** se guarda en `ps_users`: vive en tablas con claves foráneas, y la API lo carga de ahí al arrancar (`../personal-sqlserver.mjs`). Se desactiva con `DB_PERSONAL=memoria`.

```text
usuarios ──< usuario_roles >── roles
usuarios ──< docentes
usuarios ──< asignaciones_docentes >── materias, anios_divisiones, grupos_taller
                      └──< asignaciones_docentes_horarios   (día 1 = lunes … 5 = viernes, hora desde/hasta)
usuarios ──< asignaciones_preceptores >── anios_divisiones
```

- **Alta de docente** (Dirección → Nuevo perfil): materia, curso/s, grupo de taller, situación de revista, módulos, días y horario. Con un solo guardado se crean la cuenta, el perfil docente, la materia, el grupo de taller, las asignaciones por curso y sus horarios, y la misma asignación aparece en la grilla de Asignaciones. Si algo no se puede guardar en la base, no queda nada a medias.
- **Alcance del docente:** solo ve los cursos y materias que tiene asignados en esa grilla.
- **Ids:** en memoria la cuenta es `usr_<usuarios.id>`, el mismo número que tiene en SQL Server.
- **Administradores:** si no hay ninguno, la API crea el inicial con `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` (variables de entorno del servidor). Para sumar otro:

  ```bash
  docker exec -it precedigital-api node scripts/crear-admin.mjs correo@dominio.com "Nombre Apellido"
  docker restart precedigital-api
  ```

  El script genera una contraseña temporal, la muestra **una sola vez** en la terminal y guarda solo el hash.
- **Credenciales:** nunca se escriben en el repositorio ni en este README. Las de producción viven en el `.env` del servidor y en la terminal de quien crea la cuenta.

Orden para aplicar en un servidor existente: backup → `005_personal_docentes.sql` (como `sa`, con `-I -b`) → `006_permisos_personal.sql` → deploy → `crear-admin.mjs` si hace falta otro administrador.

## Qué sigue en memoria

El resto de la API (los refresh tokens y los módulos que cargan notas y asistencias) sigue en el store en memoria hasta que cada módulo migre su repositorio. Mientras tanto:

- Las cuentas de alumno **sí** quedan en SQL Server: sobreviven a reinicios y el DNI no vuelve a servir como clave. Para que `verifyToken` las encuentre, cada cuenta usada se refleja en el repositorio de usuarios en memoria con el id `sql-usr-<id>`; después de un reinicio el alumno vuelve a iniciar sesión con su clave.
- Para que el portal muestre lo que cargan docentes y preceptores, esos módulos tienen que escribir en las mismas tablas (`calificaciones`, `inasistencias_jornada`, `inasistencias`, `situaciones_academicas`). Si se conecta solo el portal, verá los datos que ya existan en la base.
- `usuarios.dni` es único: si un alumno tiene el mismo DNI que una cuenta del personal, la creación de su cuenta falla y hay que revisarlo.
