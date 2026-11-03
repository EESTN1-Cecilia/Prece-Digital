/* =====================================================================================
   PRECE DIGITAL - Usuario de aplicacion con permisos minimos (T-SQL)

   LO EJECUTA UN ADMINISTRADOR (no el backend). No contiene contrasenas.

   Prerrequisito: el login de servidor `PreceDigital` ya existe. Si no existe, crearlo
   aparte, con la clave en una variable de entorno y sin dejarla en ningun script:
     CREATE LOGIN [PreceDigital] WITH PASSWORD = '<clave>', CHECK_POLICY = ON;

   Que hace (idempotente):
     - Crea el usuario de base `PreceDigital` para ese login.
     - Crea dos roles de base de datos:
         prece_app          uso diario del backend: lee las tablas de la aplicacion y
                            escribe solo donde hoy escribe el backend con SQL Server
                            (cuentas de alumno). Sin DELETE, sin DDL.
         prece_importador   ademas inserta/actualiza el padron. Se asigna al login solo
                            mientras se corre la importacion (ver el final del script).
     - NO usa sysadmin, db_owner, db_ddladmin ni permisos de servidor.

   Ejecutar conectado a la base `prece_digital` (USE prece_digital).
   ===================================================================================== */

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'PreceDigital')
  THROW 50010, 'No existe el login PreceDigital. Crearlo antes (ver encabezado).', 1;

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'PreceDigital')
  CREATE USER [PreceDigital] FOR LOGIN [PreceDigital] WITH DEFAULT_SCHEMA = dbo;

IF DATABASE_PRINCIPAL_ID('prece_app') IS NULL CREATE ROLE prece_app;
IF DATABASE_PRINCIPAL_ID('prece_importador') IS NULL CREATE ROLE prece_importador;

/* Lectura: las tablas que consultan los repositorios SQL Server (portal del alumno,
   padron y catalogos). Solo se otorga sobre las que existen. */
DECLARE @lectura TABLE (nombre SYSNAME);
INSERT INTO @lectura VALUES
  ('escuelas'), ('ciclos_lectivos'), ('orientaciones'), ('anios_divisiones'), ('materias'),
  ('estudiantes'), ('docentes'), ('docentes_asignaciones_materias'), ('grupos_taller'),
  ('inscripciones_taller'), ('movimientos_curso'), ('inasistencias'), ('calificaciones'),
  ('inasistencias_jornada'), ('situaciones_academicas'), ('situaciones_academicas_historial'),
  ('usuarios'), ('usuario_roles'), ('roles'), ('modulos'), ('permisos'), ('rol_permisos'),
  ('importaciones_listas'), ('importaciones_listas_estudiantes'), ('importaciones_listas_pendientes');

DECLARE @n SYSNAME, @sql NVARCHAR(400);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT nombre FROM @lectura WHERE OBJECT_ID('dbo.' + nombre, 'U') IS NOT NULL;
OPEN c; FETCH NEXT FROM c INTO @n;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = 'GRANT SELECT ON dbo.' + QUOTENAME(@n) + ' TO prece_app';
  EXEC(@sql);
  FETCH NEXT FROM c INTO @n;
END
CLOSE c; DEALLOCATE c;

/* Escritura del uso diario: cuentas de alumno (usuarios + usuario_roles). */
IF OBJECT_ID('dbo.usuarios', 'U') IS NOT NULL GRANT INSERT, UPDATE ON dbo.usuarios TO prece_app;
IF OBJECT_ID('dbo.usuario_roles', 'U') IS NOT NULL GRANT INSERT, UPDATE ON dbo.usuario_roles TO prece_app;

/* Importacion del padron: rol aparte, de uso temporal. */
ALTER ROLE prece_app ADD MEMBER prece_importador; -- hereda la lectura
IF OBJECT_ID('dbo.estudiantes', 'U') IS NOT NULL GRANT INSERT, UPDATE ON dbo.estudiantes TO prece_importador;
IF OBJECT_ID('dbo.anios_divisiones', 'U') IS NOT NULL GRANT INSERT ON dbo.anios_divisiones TO prece_importador;
IF OBJECT_ID('dbo.ciclos_lectivos', 'U') IS NOT NULL GRANT INSERT ON dbo.ciclos_lectivos TO prece_importador;
IF OBJECT_ID('dbo.importaciones_listas', 'U') IS NOT NULL GRANT INSERT, UPDATE ON dbo.importaciones_listas TO prece_importador;
IF OBJECT_ID('dbo.importaciones_listas_estudiantes', 'U') IS NOT NULL GRANT INSERT ON dbo.importaciones_listas_estudiantes TO prece_importador;
IF OBJECT_ID('dbo.importaciones_listas_pendientes', 'U') IS NOT NULL GRANT INSERT, UPDATE ON dbo.importaciones_listas_pendientes TO prece_importador;

/* Uso diario: siempre. */
ALTER ROLE prece_app ADD MEMBER [PreceDigital];

/* Para importar: descomentar, correr la importacion y volver a comentar/quitar.
   ALTER ROLE prece_importador ADD MEMBER [PreceDigital];
   ... importacion ...
   ALTER ROLE prece_importador DROP MEMBER [PreceDigital];
*/
