/* =====================================================================================
   PRECE DIGITAL - Permisos del usuario de la API para guardar el personal (T-SQL)

   LO EJECUTA UN ADMINISTRADOR (sa). No contiene contrasenas. Es idempotente.

   La API guarda ahora cuentas, roles, docentes, materias, grupos de taller y asignaciones
   en tablas relacionales: necesita leer y escribir en ellas. No recibe DDL ni db_owner.
   ===================================================================================== */

DECLARE @escritura TABLE (nombre SYSNAME);
INSERT INTO @escritura VALUES
  ('usuarios'), ('usuario_roles'), ('docentes'), ('materias'), ('grupos_taller'),
  ('asignaciones_docentes'), ('asignaciones_docentes_horarios'), ('asignaciones_preceptores');

DECLARE @lectura TABLE (nombre SYSNAME);
INSERT INTO @lectura VALUES ('escuelas'), ('ciclos_lectivos'), ('anios_divisiones'), ('roles');

DECLARE @n SYSNAME, @sql NVARCHAR(400);

DECLARE c1 CURSOR LOCAL FAST_FORWARD FOR SELECT nombre FROM @escritura WHERE OBJECT_ID('dbo.' + nombre, 'U') IS NOT NULL;
OPEN c1; FETCH NEXT FROM c1 INTO @n;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = 'GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.' + QUOTENAME(@n) + ' TO [PreceDigital]';
  EXEC(@sql);
  FETCH NEXT FROM c1 INTO @n;
END
CLOSE c1; DEALLOCATE c1;

DECLARE c2 CURSOR LOCAL FAST_FORWARD FOR SELECT nombre FROM @lectura WHERE OBJECT_ID('dbo.' + nombre, 'U') IS NOT NULL;
OPEN c2; FETCH NEXT FROM c2 INTO @n;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = 'GRANT SELECT ON dbo.' + QUOTENAME(@n) + ' TO [PreceDigital]';
  EXEC(@sql);
  FETCH NEXT FROM c2 INTO @n;
END
CLOSE c2; DEALLOCATE c2;
GO
