/* =====================================================================================
   PRECE DIGITAL - Importacion de listas del ciclo lectivo - Migracion SQL Server (T-SQL)

   Que hace (idempotente, se puede correr mas de una vez):
     1. estudiantes.clave_importacion: nombre normalizado de la planilla. Es la clave
        de idempotencia de la importacion (las planillas no traen DNI). Indice unico
        filtrado: no puede haber dos alumnos importados con la misma clave.
     2. importaciones_listas: un registro por corrida (auditoria).
     3. importaciones_listas_estudiantes: de que archivo/hoja/fila salio cada alumno
        y el texto original de la planilla (apellido y nombre vienen en un solo campo).
     4. importaciones_listas_pendientes: casos que requieren revision humana.

   No borra ni modifica datos existentes. Requiere haber corrido 001_portal_alumno.sql
   (usa estudiantes.dni_provisorio). HACER BACKUP ANTES:
     BACKUP DATABASE prece_digital TO DISK = 'C:\respaldos\prece_digital_antes_importacion.bak' WITH CHECKSUM;
   ===================================================================================== */

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.estudiantes', 'dni_provisorio') IS NULL
  THROW 50001, 'Falta estudiantes.dni_provisorio: correr antes 001_portal_alumno.sql', 1;

IF COL_LENGTH('dbo.estudiantes', 'genero') IS NULL
  ALTER TABLE dbo.estudiantes ADD genero NVARCHAR(30) NULL;

IF COL_LENGTH('dbo.estudiantes', 'clave_importacion') IS NULL
  ALTER TABLE dbo.estudiantes ADD clave_importacion NVARCHAR(200) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_estudiantes_clave_importacion' AND object_id = OBJECT_ID('dbo.estudiantes'))
  EXEC('CREATE UNIQUE INDEX uq_estudiantes_clave_importacion ON dbo.estudiantes (clave_importacion) WHERE clave_importacion IS NOT NULL');

IF OBJECT_ID('dbo.importaciones_listas', 'U') IS NULL
  CREATE TABLE dbo.importaciones_listas (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    ciclo_lectivo       SMALLINT      NOT NULL,
    archivos            INT           NOT NULL DEFAULT 0,
    alumnos_leidos      INT           NOT NULL DEFAULT 0,
    alumnos_nuevos      INT           NOT NULL DEFAULT 0,
    alumnos_existentes  INT           NOT NULL DEFAULT 0,
    pendientes          INT           NOT NULL DEFAULT 0,
    creado_en           DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
  );

IF OBJECT_ID('dbo.importaciones_listas_estudiantes', 'U') IS NULL
  CREATE TABLE dbo.importaciones_listas_estudiantes (
    id                                INT IDENTITY(1,1) PRIMARY KEY,
    lote_id                           INT           NOT NULL REFERENCES dbo.importaciones_listas(id),
    estudiante_id                     INT           NOT NULL REFERENCES dbo.estudiantes(id),
    archivo                           NVARCHAR(260) NOT NULL,
    hoja                              NVARCHAR(100) NULL,
    fila                              INT           NULL,
    texto_original                    NVARCHAR(200) NOT NULL,
    nombre_dividido_automaticamente   BIT           NOT NULL DEFAULT 0,
    CONSTRAINT uq_importacion_estudiante UNIQUE (lote_id, estudiante_id)
  );

IF OBJECT_ID('dbo.importaciones_listas_pendientes', 'U') IS NULL
  CREATE TABLE dbo.importaciones_listas_pendientes (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    lote_id         INT           NOT NULL REFERENCES dbo.importaciones_listas(id),
    motivo          NVARCHAR(60)  NOT NULL,
    archivo         NVARCHAR(260) NOT NULL,
    hoja            NVARCHAR(100) NULL,
    curso           NVARCHAR(10)  NULL,
    fila            INT           NULL,
    texto_original  NVARCHAR(200) NULL,
    detalle         NVARCHAR(400) NULL,
    resuelto        BIT           NOT NULL DEFAULT 0
  );

COMMIT TRANSACTION;
