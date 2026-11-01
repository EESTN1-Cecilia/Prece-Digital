/* =====================================================================================
   PRECE DIGITAL - Calendario escolar y docente (T-SQL)
   LO EJECUTA UN ADMINISTRADOR. Idempotente. NO fue ejecutado por quien lo escribio.
   Hoy la API guarda estos datos en memoria (modules/calendario); estas tablas son
   la estructura equivalente para cuando el calendario pase a SQL Server.
   Las fechas son DATE (sin hora): no hay conversion UTC y no hay corrimiento de dia.
   ===================================================================================== */

IF OBJECT_ID('dbo.CalendarioEvento', 'U') IS NULL
CREATE TABLE dbo.CalendarioEvento (
  Id                  NVARCHAR(64)   NOT NULL CONSTRAINT PK_CalendarioEvento PRIMARY KEY,   -- pba-2026-inicio-clases | inst-<guid>
  Clave               NVARCHAR(64)   NULL,
  Origen              VARCHAR(14)    NOT NULL CONSTRAINT CK_CalEv_Origen CHECK (Origen IN ('oficial','institucional')),
  Ambito              VARCHAR(14)    NOT NULL CONSTRAINT CK_CalEv_Ambito CHECK (Ambito IN ('general','docente','institucional')),
  Titulo              NVARCHAR(160)  NOT NULL,
  Descripcion         NVARCHAR(600)  NULL,
  Categoria           VARCHAR(24)    NOT NULL,
  FechaInicio         DATE           NOT NULL,
  FechaFin            DATE           NULL,
  Fuente              NVARCHAR(200)  NULL,
  UrlReferencia       NVARCHAR(500)  NULL,
  AnioLectivo         SMALLINT       NOT NULL,
  EstadoVerificacion  VARCHAR(10)    NOT NULL CONSTRAINT CK_CalEv_Estado CHECK (EstadoVerificacion IN ('verificado','pendiente')),
  ActualizadoEn       DATETIME2(0)   NOT NULL CONSTRAINT DF_CalEv_Act DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_CalEv_Fechas CHECK (FechaFin IS NULL OR FechaFin >= FechaInicio)
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_CalendarioEvento_Oficial')
CREATE UNIQUE INDEX UX_CalendarioEvento_Oficial ON dbo.CalendarioEvento (AnioLectivo, Clave) WHERE Origen = 'oficial';  -- evita duplicados
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CalendarioEvento_Fecha')
CREATE INDEX IX_CalendarioEvento_Fecha ON dbo.CalendarioEvento (FechaInicio, FechaFin);

IF OBJECT_ID('dbo.CalendarioCambio', 'U') IS NULL
CREATE TABLE dbo.CalendarioCambio (
  Id           INT IDENTITY(1,1) PRIMARY KEY,
  EventoId     NVARCHAR(64) NOT NULL REFERENCES dbo.CalendarioEvento(Id),
  Fecha        DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
  InicioAntes  DATE NULL, FinAntes DATE NULL,
  InicioDespues DATE NULL, FinDespues DATE NULL,
  Fuente       NVARCHAR(500) NULL
);

IF OBJECT_ID('dbo.CalendarioConsulta', 'U') IS NULL
CREATE TABLE dbo.CalendarioConsulta (
  Id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  Fecha       DATETIME2(0) NOT NULL,
  AnioLectivo SMALLINT NOT NULL,
  Ok          BIT NOT NULL,
  Motivo      NVARCHAR(300) NULL,
  Resumen     NVARCHAR(MAX) NULL,      -- JSON con fuentes y conteos
  EjecutadoPor NVARCHAR(64) NULL
);
