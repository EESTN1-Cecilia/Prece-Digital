/* Escritura de la importacion en SQL Server. Todo ocurre en UNA transaccion: si algo
   falla no queda nada a medias. Es idempotente: cada alumno se identifica por
   `estudiantes.clave_importacion` (nombre normalizado de la planilla; las planillas
   no traen DNI) y volver a correr no duplica ni reasigna.

   Reglas:
     - Nunca elimina ni sobrescribe estudiantes existentes.
     - Si el alumno ya existe en OTRA division, no lo mueve: lo deja como pendiente.
     - Los DNI son provisorios (99xxxxxx, dni_provisorio = 1) hasta que secretaria
       cargue el real.
     - Divisiones y ciclo lectivo se crean solo si faltan, con el catalogo de la escuela.

   Requiere haber corrido 001_portal_alumno.sql y 002_importacion_listas.sql. */

import { enTransaccion } from "../../../database/sqlserver/conexion.mjs";
import { buscarDivision } from "../catalogo.mjs";

export async function aplicarImportacion({ analisis, archivos, cicloLectivo, escuelaId = null }) {
  return enTransaccion(async (consultar) => {
    /* 1. Escuela: solo se usa una existente, no se inventan datos institucionales. */
    const escuelas = await consultar("SELECT id FROM dbo.escuelas ORDER BY id");
    const escuela = escuelaId ? escuelas.find((e) => e.id === Number(escuelaId)) : escuelas.length === 1 ? escuelas[0] : null;
    if (!escuela) throw new Error(escuelas.length === 0 ? "No hay ninguna escuela cargada en dbo.escuelas." : "Hay mas de una escuela: indicar IMPORT_ESCUELA_ID.");

    /* 2. Ciclo lectivo. */
    let [ciclo] = await consultar("SELECT id FROM dbo.ciclos_lectivos WHERE escuela_id = @escuela AND anio = @anio", { escuela: escuela.id, anio: cicloLectivo });
    if (!ciclo) {
      [ciclo] = await consultar(
        "INSERT INTO dbo.ciclos_lectivos (escuela_id, anio, activo) OUTPUT INSERTED.id VALUES (@escuela, @anio, 1)",
        { escuela: escuela.id, anio: cicloLectivo }
      );
    }

    /* 3. Divisiones de las listas: se reutilizan las existentes, no se duplican. */
    const divisiones = new Map();
    const etiquetas = [...new Set(analisis.alumnos.map((a) => a.etiqueta))];
    let divisionesCreadas = 0;
    for (const etiqueta of etiquetas) {
      const ejemplo = analisis.alumnos.find((a) => a.etiqueta === etiqueta);
      let [fila] = await consultar(
        "SELECT id FROM dbo.anios_divisiones WHERE ciclo_lectivo_id = @ciclo AND anio_curso = @curso AND division = @division",
        { ciclo: ciclo.id, curso: ejemplo.curso, division: ejemplo.division }
      );
      if (!fila) {
        const datos = buscarDivision(ejemplo.curso, ejemplo.division);
        let orientacionId = null;
        if (datos.orientacion) {
          [{ id: orientacionId } = {}] = await consultar("SELECT id FROM dbo.orientaciones WHERE nombre = @nombre", { nombre: datos.orientacion });
          if (!orientacionId) throw new Error(`Falta la orientacion "${datos.orientacion}" en dbo.orientaciones (necesaria para ${etiqueta}).`);
        }
        [fila] = await consultar(
          `INSERT INTO dbo.anios_divisiones (escuela_id, ciclo_lectivo_id, anio_curso, division, turno_aula, orientacion_id)
           OUTPUT INSERTED.id VALUES (@escuela, @ciclo, @curso, @division, @turno, @orientacion)`,
          { escuela: escuela.id, ciclo: ciclo.id, curso: ejemplo.curso, division: ejemplo.division, turno: datos.turno, orientacion: orientacionId }
        );
        divisionesCreadas += 1;
      }
      divisiones.set(etiqueta, fila.id);
    }

    /* 4. Proximo DNI provisorio (con bloqueo para que dos corridas no lo repitan). */
    const [{ maximo }] = await consultar(
      `SELECT ISNULL(MAX(CAST(dni AS INT)), 99000000) AS maximo
         FROM dbo.estudiantes WITH (UPDLOCK, HOLDLOCK)
        WHERE dni_provisorio = 1 AND dni LIKE '99[0-9][0-9][0-9][0-9][0-9][0-9]'`
    );
    let siguienteDni = Number(maximo);

    /* 5. Lote de importacion (auditoria por archivo). */
    const [lote] = await consultar(
      `INSERT INTO dbo.importaciones_listas (ciclo_lectivo, archivos, alumnos_leidos)
       OUTPUT INSERTED.id VALUES (@ciclo, @archivos, @leidos)`,
      { ciclo: cicloLectivo, archivos: archivos.length, leidos: analisis.alumnos.length + analisis.pendientes.length }
    );

    const resumen = { nuevos: 0, yaExistian: 0, pendientes: analisis.pendientes.length, divisionesCreadas };
    const pendientes = [...analisis.pendientes];

    for (const a of analisis.alumnos) {
      const [existente] = await consultar("SELECT id, anio_division_id FROM dbo.estudiantes WHERE clave_importacion = @clave", { clave: a.clave });
      if (existente) {
        if (existente.anio_division_id === divisiones.get(a.etiqueta)) {
          resumen.yaExistian += 1;
        } else {
          pendientes.push({ motivo: "ya_existe_en_otra_division", archivo: a.archivo, hoja: a.hoja, curso: a.etiqueta, fila: a.fila, original: a.original, detalle: "No se reasigna automaticamente" });
          resumen.pendientes += 1;
        }
        continue;
      }

      siguienteDni += 1;
      const [nuevo] = await consultar(
        `INSERT INTO dbo.estudiantes (escuela_id, anio_division_id, nombre, apellido, genero, dni, dni_provisorio, condicion, activo, clave_importacion)
         OUTPUT INSERTED.id VALUES (@escuela, @division, @nombre, @apellido, @genero, @dni, 1, 'regular', 1, @clave)`,
        { escuela: escuela.id, division: divisiones.get(a.etiqueta), nombre: a.nombre, apellido: a.apellido, genero: a.genero ?? null, dni: String(siguienteDni), clave: a.clave }
      );
      await consultar(
        `INSERT INTO dbo.importaciones_listas_estudiantes (lote_id, estudiante_id, archivo, hoja, fila, texto_original, nombre_dividido_automaticamente)
         VALUES (@lote, @estudiante, @archivo, @hoja, @fila, @original, @dividido)`,
        { lote: lote.id, estudiante: nuevo.id, archivo: a.archivo, hoja: a.hoja, fila: a.fila, original: a.original, dividido: a.dividido ? 1 : 0 }
      );
      resumen.nuevos += 1;
    }

    for (const p of pendientes) {
      await consultar(
        `INSERT INTO dbo.importaciones_listas_pendientes (lote_id, motivo, archivo, hoja, curso, fila, texto_original, detalle)
         VALUES (@lote, @motivo, @archivo, @hoja, @curso, @fila, @original, @detalle)`,
        { lote: lote.id, motivo: p.motivo, archivo: p.archivo, hoja: p.hoja ?? null, curso: p.curso ?? null, fila: p.fila ?? null, original: p.original ?? null, detalle: p.detalle ?? null }
      );
    }

    await consultar(
      "UPDATE dbo.importaciones_listas SET alumnos_nuevos = @nuevos, alumnos_existentes = @existian, pendientes = @pendientes WHERE id = @lote",
      { nuevos: resumen.nuevos, existian: resumen.yaExistian, pendientes: resumen.pendientes, lote: lote.id }
    );

    return { ...resumen, loteId: lote.id };
  });
}
