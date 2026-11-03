/* =====================================================================================
   PRECE DIGITAL - Verificacion integral del padron (SQL Server, solo lectura)

   Mismos controles que GET /api/v1/portal-alumnos/verificacion y que
   `npm run verificar:alumnos`, escritos para correr directo sobre la base real
   con los ~900 alumnos. NO modifica datos: cada consulta lista lo que hay que
   revisar, con su origen, para que secretaria lo corrija a mano.

   Correr despues de 001_portal_alumno.sql. Ciclo lectivo: el anio en curso.
   ===================================================================================== */

SET NOCOUNT ON;
DECLARE @ciclo SMALLINT = YEAR(GETDATE());

/* 0. Totales del padron (todos los alumnos, sin muestreo) */
SELECT
  COUNT(*)                                             AS alumnos_verificados,
  SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END)          AS activos,
  SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END)          AS inactivos,
  SUM(CASE WHEN dni_provisorio = 1 THEN 1 ELSE 0 END)  AS con_dni_provisorio
FROM dbo.estudiantes;

/* 1. DNI faltante o con formato invalido (7 a 9 digitos) */
SELECT id, apellido, nombre, dni, 'dni_invalido' AS problema
FROM dbo.estudiantes
WHERE dni IS NULL
   OR LEN(dni) NOT BETWEEN 7 AND 9
   OR dni LIKE '%[^0-9]%';

/* 2. DNI provisorio: no puede usarse para ingresar al portal */
SELECT id, apellido, nombre, dni, 'dni_provisorio' AS problema
FROM dbo.estudiantes
WHERE dni_provisorio = 1;

/* 3. DNI duplicado entre legajos */
SELECT e.id, e.apellido, e.nombre, e.dni, 'dni_duplicado' AS problema
FROM dbo.estudiantes e
JOIN (SELECT dni FROM dbo.estudiantes GROUP BY dni HAVING COUNT(*) > 1) d ON d.dni = e.dni
ORDER BY e.dni, e.id;

/* 4. Posible perfil duplicado: misma persona con DNI distinto */
SELECT e.id, e.apellido, e.nombre, e.fecha_nacimiento, e.dni, 'posible_duplicado' AS problema
FROM dbo.estudiantes e
JOIN (
  SELECT apellido, nombre, fecha_nacimiento
  FROM dbo.estudiantes
  WHERE fecha_nacimiento IS NOT NULL
  GROUP BY apellido, nombre, fecha_nacimiento
  HAVING COUNT(*) > 1
) d ON d.apellido = e.apellido AND d.nombre = e.nombre AND d.fecha_nacimiento = e.fecha_nacimiento
ORDER BY e.apellido, e.nombre;

/* 5. Alumno activo sin curso/division, o con una division de otro ciclo lectivo */
SELECT e.id, e.apellido, e.nombre, e.dni, ad.anio_curso, ad.division, cl.anio AS ciclo_division,
       CASE WHEN e.anio_division_id IS NULL THEN 'sin_division' ELSE 'division_de_otro_ciclo' END AS problema
FROM dbo.estudiantes e
LEFT JOIN dbo.anios_divisiones ad ON ad.id = e.anio_division_id
LEFT JOIN dbo.ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
WHERE e.activo = 1
  AND (e.anio_division_id IS NULL OR cl.anio <> @ciclo);

/* 6. Division sin materias asignadas (no se le pueden asociar materias al alumno) */
SELECT ad.id AS anio_division_id, ad.anio_curso, ad.division, COUNT(DISTINCT e.id) AS alumnos, 'sin_materias' AS problema
FROM dbo.anios_divisiones ad
JOIN dbo.estudiantes e ON e.anio_division_id = ad.id AND e.activo = 1
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.docentes_asignaciones_materias am
  WHERE am.estado = 'activo' AND am.anio_lectivo = @ciclo
    AND am.anio_division_id = ad.id
)
GROUP BY ad.id, ad.anio_curso, ad.division;

/* 7. Calificaciones del ciclo actual cargadas en otra division que la del alumno */
SELECT c.id AS calificacion_id, e.id AS estudiante_id, e.apellido, e.nombre, e.dni,
       c.anio_division_id AS division_calificacion, e.anio_division_id AS division_alumno, 'calificacion_otro_curso' AS problema
FROM dbo.calificaciones c
JOIN dbo.estudiantes e ON e.id = c.estudiante_id
WHERE c.activa = 1 AND c.anio = @ciclo
  AND c.anio_division_id IS NOT NULL AND c.anio_division_id <> e.anio_division_id;

/* 8. Calificaciones cuya fecha no corresponde a su ciclo lectivo */
SELECT c.id AS calificacion_id, c.estudiante_id, c.anio, c.fecha, 'calificacion_ciclo_inconsistente' AS problema
FROM dbo.calificaciones c
WHERE c.activa = 1 AND YEAR(c.fecha) <> c.anio;

/* 9. Valores de calificacion fuera de la escala (1 a 10 o TEA/TEP/TED) */
SELECT c.id AS calificacion_id, c.estudiante_id, c.valor, 'valor_fuera_de_escala' AS problema
FROM dbo.calificaciones c
WHERE c.activa = 1
  AND UPPER(c.valor) NOT IN ('TEA', 'TEP', 'TED')
  AND (TRY_CONVERT(DECIMAL(4, 2), REPLACE(c.valor, ',', '.')) IS NULL
       OR TRY_CONVERT(DECIMAL(4, 2), REPLACE(c.valor, ',', '.')) NOT BETWEEN 1 AND 10);

/* 10. Inasistencias del ciclo actual registradas en otro curso/division */
SELECT i.id AS inasistencia_id, e.id AS estudiante_id, e.apellido, e.nombre, i.fecha,
       i.curso, i.division, ad.anio_curso, ad.division AS division_alumno, 'inasistencia_otro_curso' AS problema
FROM dbo.inasistencias_jornada i
JOIN dbo.estudiantes e ON e.id = i.estudiante_id
LEFT JOIN dbo.anios_divisiones ad ON ad.id = e.anio_division_id
WHERE i.anio = @ciclo AND (i.curso <> ad.anio_curso OR i.division <> ad.division);

/* 11. Mismo dia con datos distintos en los dos registros de asistencia */
SELECT j.estudiante_id, j.fecha, j.estado_justificacion, r.tipo,
       CASE WHEN r.justificada = 1 THEN 'justificada' ELSE 'no_justificada' END AS justificacion_registro,
       'asistencia_registros_distintos' AS problema
FROM dbo.inasistencias_jornada j
JOIN dbo.inasistencias r ON r.estudiante_id = j.estudiante_id AND r.fecha = j.fecha AND r.baja_en IS NULL
WHERE r.tipo <> 'ausente'
   OR (j.estado_justificacion <> 'pendiente'
       AND j.estado_justificacion <> CASE WHEN r.justificada = 1 THEN 'justificada' ELSE 'no_justificada' END);

/* 12. Situaciones academicas de un ciclo posterior al actual */
SELECT s.id, s.estudiante_id, s.materia_id, s.anio, 'situacion_ciclo_futuro' AS problema
FROM dbo.situaciones_academicas s
WHERE s.anio > @ciclo;

/* 13. Materia desaprobada en un ciclo anterior sin registro posterior
       (ni pendiente, ni recursada, ni aprobada): posible previa sin registrar */
SELECT s.id, s.estudiante_id, s.materia_id, s.anio, 'posible_previa_sin_registrar' AS problema
FROM dbo.situaciones_academicas s
WHERE s.anio < @ciclo AND s.estado = 'desaprobada'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.situaciones_academicas o
    WHERE o.estudiante_id = s.estudiante_id AND o.materia_id = s.materia_id AND o.id <> s.id
      AND ((o.anio >= s.anio AND o.tipo IN ('pendiente', 'recursada')) OR (o.anio > s.anio AND o.estado = 'aprobada'))
  );

/* 14. Registros que apuntan a alumnos inexistentes (no se atribuyen a nadie) */
SELECT 'calificaciones' AS tabla, c.id FROM dbo.calificaciones c WHERE NOT EXISTS (SELECT 1 FROM dbo.estudiantes e WHERE e.id = c.estudiante_id)
UNION ALL
SELECT 'inasistencias_jornada', i.id FROM dbo.inasistencias_jornada i WHERE NOT EXISTS (SELECT 1 FROM dbo.estudiantes e WHERE e.id = i.estudiante_id)
UNION ALL
SELECT 'situaciones_academicas', s.id FROM dbo.situaciones_academicas s WHERE NOT EXISTS (SELECT 1 FROM dbo.estudiantes e WHERE e.id = s.estudiante_id);

/* 15. Habilitacion para el primer ingreso con DNI */
SELECT
  SUM(CASE WHEN e.activo = 1 AND e.dni_provisorio = 0 AND d.cantidad = 1
            AND LEN(e.dni) BETWEEN 7 AND 9 AND e.dni NOT LIKE '%[^0-9]%' THEN 1 ELSE 0 END) AS pueden_ingresar,
  SUM(CASE WHEN NOT (e.activo = 1 AND e.dni_provisorio = 0 AND d.cantidad = 1
            AND LEN(e.dni) BETWEEN 7 AND 9 AND e.dni NOT LIKE '%[^0-9]%') THEN 1 ELSE 0 END) AS ingreso_bloqueado,
  (SELECT COUNT(*) FROM dbo.usuarios u WHERE u.estudiante_id IS NOT NULL) AS cuentas_creadas
FROM dbo.estudiantes e
JOIN (SELECT dni, COUNT(*) AS cantidad FROM dbo.estudiantes GROUP BY dni) d ON d.dni = e.dni;
