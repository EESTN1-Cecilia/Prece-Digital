/* =====================================================================================
   PRECE DIGITAL - Portal del alumno - Migracion para SQL Server (T-SQL)

   Que hace:
     1. Agrega a `usuarios` lo necesario para las cuentas de alumno (usuario, vinculo
        con el legajo, cambio obligatorio de clave). NO crea una tabla de cuentas
        paralela: el alumno es un usuario mas con el rol `alumno`.
     2. Marca en `estudiantes` los DNI provisorios (nomina importada sin documento).
     3. Registra el rol `alumno`, el modulo `student-portal` y sus permisos.
     4. Crea, solo si NO existen, las tablas que el backend ya usa en memoria y que
        schema.sql (modelo MySQL) no tenia: calificaciones por evaluacion,
        inasistencias de jornada con justificacion y situacion academica.
     5. Crea los indices que usan las consultas del portal y la verificacion.

   Es idempotente: se puede correr mas de una vez. No borra ni modifica datos
   academicos: solo agrega columnas, tablas, indices y filas de catalogo.

   ANTES DE CORRERLO
     - Hacer un backup de la base.
     - Si la base real usa otros nombres de tabla o columna, ajustar este script y
       las consultas de modules/student-portal/*.sqlserver.mjs (ver README.md de
       esta carpeta: tabla de equivalencias).
     - Se asume que ya existen: escuelas, usuarios, roles, modulos, permisos,
       rol_permisos, usuario_roles, ciclos_lectivos, anios_divisiones, materias,
       estudiantes, docentes, docentes_asignaciones_materias, inasistencias,
       movimientos_curso, grupos_taller e inscripciones_taller (schema.sql).
   ===================================================================================== */

SET XACT_ABORT ON;
BEGIN TRANSACTION;

/* ---------------------------------------------------------------------------------
   1. usuarios: cuentas de alumno
   --------------------------------------------------------------------------------- */

IF COL_LENGTH('dbo.usuarios', 'nombre_usuario') IS NULL
  ALTER TABLE dbo.usuarios ADD nombre_usuario NVARCHAR(30) NULL;

IF COL_LENGTH('dbo.usuarios', 'estudiante_id') IS NULL
  ALTER TABLE dbo.usuarios ADD estudiante_id INT NULL;

IF COL_LENGTH('dbo.usuarios', 'debe_cambiar_password') IS NULL
  ALTER TABLE dbo.usuarios ADD debe_cambiar_password BIT NOT NULL CONSTRAINT df_usuarios_debe_cambiar DEFAULT 0;

IF COL_LENGTH('dbo.usuarios', 'password_actualizada_en') IS NULL
  ALTER TABLE dbo.usuarios ADD password_actualizada_en DATETIME2(0) NULL;
GO

/* Las cuentas de alumno no tienen correo: el email pasa a ser opcional y su
   unicidad se mantiene solo entre los que lo tienen (indice filtrado). */
DECLARE @uq_email SYSNAME = (
  SELECT kc.name FROM sys.key_constraints kc
  JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
  JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
  WHERE kc.parent_object_id = OBJECT_ID('dbo.usuarios') AND kc.type = 'UQ' AND c.name = 'email'
);
IF @uq_email IS NOT NULL
  EXEC('ALTER TABLE dbo.usuarios DROP CONSTRAINT ' + @uq_email);

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.usuarios') AND name = 'email' AND is_nullable = 0)
  ALTER TABLE dbo.usuarios ALTER COLUMN email NVARCHAR(150) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.usuarios') AND name = 'ux_usuarios_email')
  CREATE UNIQUE INDEX ux_usuarios_email ON dbo.usuarios(email) WHERE email IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.usuarios') AND name = 'ux_usuarios_nombre_usuario')
  CREATE UNIQUE INDEX ux_usuarios_nombre_usuario ON dbo.usuarios(nombre_usuario) WHERE nombre_usuario IS NOT NULL;

/* Una sola cuenta por legajo. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.usuarios') AND name = 'ux_usuarios_estudiante')
  CREATE UNIQUE INDEX ux_usuarios_estudiante ON dbo.usuarios(estudiante_id) WHERE estudiante_id IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_usuarios_estudiante')
  ALTER TABLE dbo.usuarios ADD CONSTRAINT fk_usuarios_estudiante FOREIGN KEY (estudiante_id) REFERENCES dbo.estudiantes(id);
GO

/* ---------------------------------------------------------------------------------
   2. estudiantes: DNI provisorio
   --------------------------------------------------------------------------------- */

IF COL_LENGTH('dbo.estudiantes', 'dni_provisorio') IS NULL
  ALTER TABLE dbo.estudiantes ADD dni_provisorio BIT NOT NULL CONSTRAINT df_estudiantes_dni_provisorio DEFAULT 0;
GO

/* ---------------------------------------------------------------------------------
   3. Rol, modulo y permisos del portal
   --------------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE codigo = 'alumno')
  INSERT INTO dbo.roles (codigo, nombre, descripcion)
  VALUES ('alumno', 'Alumno', 'Consulta su propia informacion academica. La cuenta se crea con el DNI del legajo.');

IF NOT EXISTS (SELECT 1 FROM dbo.modulos WHERE codigo = 'student-portal')
  INSERT INTO dbo.modulos (codigo, nombre, descripcion)
  VALUES ('student-portal', 'Portal del alumno', 'Perfil, boletin, asistencias, situacion academica y previas del alumno autenticado.');

IF NOT EXISTS (SELECT 1 FROM dbo.permisos WHERE codigo = 'student-portal.read')
  INSERT INTO dbo.permisos (codigo, modulo, accion, descripcion)
  VALUES ('student-portal.read', 'student-portal', 'read', 'Consultar la propia informacion academica');

IF NOT EXISTS (SELECT 1 FROM dbo.permisos WHERE codigo = 'student-portal.update')
  INSERT INTO dbo.permisos (codigo, modulo, accion, descripcion)
  VALUES ('student-portal.update', 'student-portal', 'update', 'Cambiar el propio usuario y contraseña');

INSERT INTO dbo.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM dbo.roles r
JOIN dbo.permisos p ON p.codigo IN ('student-portal.read', 'student-portal.update')
WHERE r.codigo = 'alumno'
  AND NOT EXISTS (SELECT 1 FROM dbo.rol_permisos rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id);
GO

/* ---------------------------------------------------------------------------------
   4. Tablas que usa el backend y no estaban en el modelo
   --------------------------------------------------------------------------------- */

/* Calificaciones por evaluacion (modulo grades). Valor numerico 1-10 o conceptual
   TEA/TEP/TED, tal como lo carga el docente. cuatrimestre NULL = registro anual. */
IF OBJECT_ID('dbo.calificaciones', 'U') IS NULL
CREATE TABLE dbo.calificaciones (
  id                      INT IDENTITY(1,1) PRIMARY KEY,
  escuela_id              INT           NOT NULL REFERENCES dbo.escuelas(id),
  estudiante_id           INT           NOT NULL REFERENCES dbo.estudiantes(id),
  materia_id              INT           NOT NULL REFERENCES dbo.materias(id),
  anio_division_id        INT           NULL REFERENCES dbo.anios_divisiones(id),
  docente_id              INT           NULL,
  asignacion_materia_id   INT           NULL,
  anio                    SMALLINT      NOT NULL,
  cuatrimestre            TINYINT       NULL CHECK (cuatrimestre IN (1, 2)),
  periodo                 NVARCHAR(40)  NULL,
  tipo_evaluacion         NVARCHAR(20)  NOT NULL CHECK (tipo_evaluacion IN ('escrito','oral','trabajo_practico','proyecto','recuperatorio')),
  valor                   NVARCHAR(10)  NOT NULL,
  fecha                   DATE          NOT NULL,
  observaciones           NVARCHAR(255) NULL,
  activa                  BIT           NOT NULL DEFAULT 1,
  fecha_baja              DATETIME2(0)  NULL,
  creado_por              INT           NULL,
  creado_en               DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME(),
  actualizado_en          DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME()
);

/* Inasistencias de jornada completa con circuito de justificacion (modulo
   inasistencias). La tabla `inasistencias` de schema.sql es la del registro
   por tipo (ausente / tarde / media_falta) del modulo de alertas. */
IF OBJECT_ID('dbo.inasistencias_jornada', 'U') IS NULL
CREATE TABLE dbo.inasistencias_jornada (
  id                     INT IDENTITY(1,1) PRIMARY KEY,
  escuela_id             INT           NOT NULL REFERENCES dbo.escuelas(id),
  estudiante_id          INT           NOT NULL REFERENCES dbo.estudiantes(id),
  curso                  TINYINT       NOT NULL,
  division               NVARCHAR(5)   NOT NULL,
  fecha                  DATE          NOT NULL,
  anio                   SMALLINT      NOT NULL,
  cuatrimestre           TINYINT       NULL CHECK (cuatrimestre IN (1, 2)),
  motivo                 NVARCHAR(20)  NOT NULL CHECK (motivo IN ('personal','salud','institucional','otra')),
  estado_justificacion   NVARCHAR(20)  NOT NULL CHECK (estado_justificacion IN ('no_justificada','pendiente','justificada')),
  observaciones          NVARCHAR(500) NULL,
  creado_por             INT           NULL,
  creado_en              DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME(),
  CONSTRAINT uq_inasistencia_jornada UNIQUE (estudiante_id, fecha)
);

/* Situacion academica (modulo academic-records): cursada, pendiente (previa),
   recursada, intensificada o equivalencia, con su estado y su historial. */
IF OBJECT_ID('dbo.situaciones_academicas', 'U') IS NULL
CREATE TABLE dbo.situaciones_academicas (
  id               INT IDENTITY(1,1) PRIMARY KEY,
  escuela_id       INT           NOT NULL REFERENCES dbo.escuelas(id),
  estudiante_id    INT           NOT NULL REFERENCES dbo.estudiantes(id),
  materia_id       INT           NOT NULL REFERENCES dbo.materias(id),
  anio             SMALLINT      NOT NULL,
  cuatrimestre     TINYINT       NULL CHECK (cuatrimestre IN (1, 2)),
  tipo             NVARCHAR(20)  NOT NULL CHECK (tipo IN ('cursada','pendiente','recursada','intensificada','equivalencia')),
  estado           NVARCHAR(20)  NOT NULL CHECK (estado IN ('en_curso','regular','aprobada','desaprobada','libre')),
  antecedente_id   INT           NULL REFERENCES dbo.situaciones_academicas(id),
  observaciones    NVARCHAR(500) NULL,
  creado_en        DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME(),
  actualizado_en   DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME(),
  actualizado_por  INT           NULL
);

/* Unicidad por alumno + materia + periodo (cuatrimestre NULL = anual). */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_situacion_periodo')
  CREATE UNIQUE INDEX ux_situacion_periodo ON dbo.situaciones_academicas(estudiante_id, materia_id, anio, cuatrimestre);

IF OBJECT_ID('dbo.situaciones_academicas_historial', 'U') IS NULL
CREATE TABLE dbo.situaciones_academicas_historial (
  id               INT IDENTITY(1,1) PRIMARY KEY,
  situacion_id     INT           NOT NULL REFERENCES dbo.situaciones_academicas(id),
  estado           NVARCHAR(20)  NOT NULL,
  tipo             NVARCHAR(20)  NOT NULL,
  anio             SMALLINT      NOT NULL,
  cuatrimestre     TINYINT       NULL,
  observaciones    NVARCHAR(500) NULL,
  actualizado_por  INT           NULL,
  fecha            DATETIME2(0)  NOT NULL DEFAULT SYSDATETIME()
);
GO

/* ---------------------------------------------------------------------------------
   5. Indices de las consultas del portal y de la verificacion
   --------------------------------------------------------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_estudiantes_dni')
  CREATE INDEX ix_estudiantes_dni ON dbo.estudiantes(dni);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_calificaciones_estudiante')
  CREATE INDEX ix_calificaciones_estudiante ON dbo.calificaciones(estudiante_id, anio, materia_id) INCLUDE (cuatrimestre, valor, fecha, activa);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_inasistencias_jornada_estudiante')
  CREATE INDEX ix_inasistencias_jornada_estudiante ON dbo.inasistencias_jornada(estudiante_id, anio);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_situaciones_estudiante')
  CREATE INDEX ix_situaciones_estudiante ON dbo.situaciones_academicas(estudiante_id, tipo, anio);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_situaciones_historial')
  CREATE INDEX ix_situaciones_historial ON dbo.situaciones_academicas_historial(situacion_id, fecha);
GO

COMMIT TRANSACTION;
GO
