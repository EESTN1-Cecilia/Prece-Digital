/* =====================================================================================
   PRECE DIGITAL - Personal y docentes en tablas relacionales (SQL Server / T-SQL)

   Que hace (solo agrega; no borra ni modifica datos existentes):
     1. asignaciones_docentes: agrega situacion_revista y docente_suplido. La columna
        rol_asignacion queda como esta (titular / suplente / ayudante); "provisional"
        vive en situacion_revista. horas_catedra guarda los modulos semanales.
     2. asignaciones_docentes_horarios: dia y horario de cada asignacion (1 = lunes ...
        5 = viernes). Una asignacion puede tener varios bloques.
     3. asignaciones_preceptores: que cursos tiene a cargo cada preceptor.
     4. Rol "server" (infraestructura / inventario), que el backend usa y no estaba.
     5. Indices unicos que evitan duplicados: materia por escuela, grupo de taller por
        ciclo y asignacion docente repetida.

   Es idempotente: se puede correr mas de una vez.

   Antes de correrlo: hacer backup de la base.
   ===================================================================================== */

SET QUOTED_IDENTIFIER ON; /* necesario para los indices filtrados */
SET XACT_ABORT ON;
BEGIN TRANSACTION;

/* 1. asignaciones_docentes ---------------------------------------------------------- */
IF COL_LENGTH('asignaciones_docentes', 'situacion_revista') IS NULL
  ALTER TABLE asignaciones_docentes ADD situacion_revista NVARCHAR(20) NULL;

IF COL_LENGTH('asignaciones_docentes', 'docente_suplido') IS NULL
  ALTER TABLE asignaciones_docentes ADD docente_suplido NVARCHAR(120) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'ck_asig_docentes_situacion')
  ALTER TABLE asignaciones_docentes
    ADD CONSTRAINT ck_asig_docentes_situacion
    CHECK (situacion_revista IS NULL OR situacion_revista IN (N'titular', N'provisional', N'suplente'));
GO

/* 2. Horarios de cada asignacion ---------------------------------------------------- */
IF OBJECT_ID(N'asignaciones_docentes_horarios', N'U') IS NULL
BEGIN
  CREATE TABLE asignaciones_docentes_horarios (
    id                    INT IDENTITY(1,1) NOT NULL,
    asignacion_docente_id INT NOT NULL,
    dia_semana            TINYINT NOT NULL,
    hora_desde            TIME(0) NOT NULL,
    hora_hasta            TIME(0) NOT NULL,
    creado_en             DATETIME2 NOT NULL CONSTRAINT df_asig_horarios_creado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_asignaciones_docentes_horarios PRIMARY KEY (id),
    CONSTRAINT fk_asig_horarios_asignacion FOREIGN KEY (asignacion_docente_id)
      REFERENCES asignaciones_docentes (id) ON DELETE CASCADE,
    CONSTRAINT ck_asig_horarios_dia CHECK (dia_semana BETWEEN 1 AND 5),
    CONSTRAINT ck_asig_horarios_horas CHECK (hora_hasta > hora_desde)
  );
END
GO

/* 3. Cursos a cargo de cada preceptor ----------------------------------------------- */
IF OBJECT_ID(N'asignaciones_preceptores', N'U') IS NULL
BEGIN
  CREATE TABLE asignaciones_preceptores (
    id                INT IDENTITY(1,1) NOT NULL,
    escuela_id        INT NOT NULL,
    usuario_id        INT NOT NULL,
    anio_division_id  INT NOT NULL,
    activo            BIT NOT NULL CONSTRAINT df_asig_preceptores_activo DEFAULT 1,
    creado_en         DATETIME2 NOT NULL CONSTRAINT df_asig_preceptores_creado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_asignaciones_preceptores PRIMARY KEY (id),
    CONSTRAINT fk_asig_preceptores_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas (id),
    CONSTRAINT fk_asig_preceptores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
    CONSTRAINT fk_asig_preceptores_curso FOREIGN KEY (anio_division_id) REFERENCES anios_divisiones (id),
    CONSTRAINT uq_asig_preceptores UNIQUE (usuario_id, anio_division_id)
  );
END
GO

/* 4. Rol "server" -------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM roles WHERE codigo = N'server')
  INSERT INTO roles (codigo, nombre, descripcion)
  VALUES (N'server', N'Servidor e inventario', N'Infraestructura, inventario y reservas de materiales');
GO

/* 5. Indices unicos ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_materias_escuela_nombre')
  CREATE UNIQUE INDEX ux_materias_escuela_nombre ON materias (escuela_id, nombre);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_grupos_taller_ciclo_nombre')
  CREATE UNIQUE INDEX ux_grupos_taller_ciclo_nombre ON grupos_taller (escuela_id, ciclo_lectivo_id, nombre);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_asig_docentes_vigente')
  CREATE UNIQUE INDEX ux_asig_docentes_vigente
    ON asignaciones_docentes (docente_id, ciclo_lectivo_id, materia_id, anio_division_id)
    WHERE activo = 1 AND materia_id IS NOT NULL AND anio_division_id IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_asig_docentes_curso')
  CREATE INDEX ix_asig_docentes_curso ON asignaciones_docentes (anio_division_id);
GO

COMMIT TRANSACTION;
GO
