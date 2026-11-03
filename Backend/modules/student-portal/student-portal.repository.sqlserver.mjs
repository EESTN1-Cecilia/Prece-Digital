/* Acceso a datos del portal del alumno contra SQL Server.

   Cumple el mismo contrato que student-portal.repository.mjs (memoria):
   - metodos de DATOS asincronicos, que devuelven los registros con la misma
     forma que los modulos en memoria (ids como texto, fechas AAAA-MM-DD);
   - metodos de CATALOGO sincronicos (materia, docente, curso, division), que se
     leen de una cache cargada con preparar() al arrancar y que se refresca sola.

   Tablas (ver database/sqlserver/001_portal_alumno.sql y schema.sql):
     estudiantes ............ legajo; anio_division_id es la matricula vigente
     anios_divisiones ....... curso y division del ciclo lectivo
     materias, docentes ..... catalogos
     docentes_asignaciones_materias .. materias y docentes de cada division
     calificaciones ......... una fila por evaluacion
     inasistencias_jornada .. ausencias de jornada con justificacion
     inasistencias .......... registro por tipo (ausente / tarde / media_falta)
     situaciones_academicas (+ _historial) .. cursadas, previas, recursadas
     movimientos_curso ...... historial de cursos
     inscripciones_taller / grupos_taller .. grupo de taller

   Si la base real usa otros nombres, se ajustan SOLO las consultas de este
   archivo: los servicios no cambian. */

import { consultar } from "../../database/sqlserver/conexion.mjs";
import { cicloLectivoActual } from "./catalogo.mjs";

const VIGENCIA_CACHE_MS = 5 * 60 * 1000;

const cache = {
  cargadaEn: 0,
  materias: new Map(),
  docentes: new Map(),
  divisiones: new Map()
};

const texto = (valor) => (valor === null || valor === undefined ? null : String(valor));
const fecha = (valor) => (valor instanceof Date ? valor.toISOString().slice(0, 10) : valor ? String(valor).slice(0, 10) : null);
const momento = (valor) => (valor instanceof Date ? valor.toISOString() : valor ?? null);
const entero = (valor) => (valor === null || valor === undefined || valor === "" ? null : Number(valor));

function agruparPor(lista, clave) {
  const mapa = new Map();
  for (const item of lista) {
    if (!mapa.has(item[clave])) mapa.set(item[clave], []);
    mapa.get(item[clave]).push(item);
  }
  return mapa;
}

/* ---------------- Mapeo fila -> forma de los modulos ------------------------ */

const SELECT_ALUMNO = `
  SELECT e.id, e.escuela_id, e.nombre, e.apellido, e.dni, e.dni_provisorio, e.fecha_nacimiento,
         e.condicion, e.activo, e.fecha_egreso,
         ad.id AS anio_division_id, ad.anio_curso, ad.division, ad.turno_aula,
         o.nombre AS orientacion,
         it.grupo_taller_id, gt.nombre AS grupo_taller
  FROM dbo.estudiantes e
  LEFT JOIN dbo.anios_divisiones ad ON ad.id = e.anio_division_id
  LEFT JOIN dbo.orientaciones o ON o.id = ad.orientacion_id
  OUTER APPLY (
    SELECT TOP 1 i.grupo_taller_id FROM dbo.inscripciones_taller i
    WHERE i.estudiante_id = e.id AND i.activo = 1 ORDER BY i.creado_en DESC
  ) it
  LEFT JOIN dbo.grupos_taller gt ON gt.id = it.grupo_taller_id`;

function alumnoDesdeFila(fila) {
  return {
    id: texto(fila.id),
    escuelaId: texto(fila.escuela_id),
    nombre: fila.nombre,
    apellido: fila.apellido,
    dni: fila.dni,
    dniProvisorio: Boolean(fila.dni_provisorio),
    fechaNacimiento: fecha(fila.fecha_nacimiento),
    curso: entero(fila.anio_curso),
    division: texto(fila.division),
    divisionId: texto(fila.anio_division_id),
    turno: fila.turno_aula ?? null,
    orientacion: fila.orientacion ?? null,
    condicion: fila.condicion ?? null,
    tallerId: texto(fila.grupo_taller_id),
    grupoTaller: fila.grupo_taller ?? null,
    isActive: Boolean(fila.activo),
    fechaBaja: fecha(fila.fecha_egreso)
  };
}

const SELECT_CALIFICACION = `
  SELECT id, estudiante_id, materia_id, anio_division_id, docente_id, anio, cuatrimestre,
         tipo_evaluacion, valor, fecha, observaciones, creado_en
  FROM dbo.calificaciones WHERE activa = 1`;

function calificacionDesdeFila(fila) {
  return {
    id: texto(fila.id),
    alumnoId: texto(fila.estudiante_id),
    materiaId: texto(fila.materia_id),
    cursoId: texto(fila.anio_division_id),
    divisionId: texto(fila.anio_division_id),
    docenteId: texto(fila.docente_id),
    anio: entero(fila.anio),
    cuatrimestre: entero(fila.cuatrimestre),
    tipoEvaluacion: fila.tipo_evaluacion,
    valor: fila.valor,
    fecha: fecha(fila.fecha),
    observaciones: fila.observaciones ?? null,
    creadoEn: momento(fila.creado_en)
  };
}

const SELECT_INASISTENCIA = `
  SELECT id, estudiante_id, curso, division, fecha, anio, cuatrimestre, motivo, estado_justificacion
  FROM dbo.inasistencias_jornada`;

function inasistenciaDesdeFila(fila) {
  return {
    id: texto(fila.id),
    alumnoId: texto(fila.estudiante_id),
    curso: entero(fila.curso),
    division: texto(fila.division),
    fecha: fecha(fila.fecha),
    anio: entero(fila.anio),
    cuatrimestre: entero(fila.cuatrimestre),
    motivo: fila.motivo,
    estadoJustificacion: fila.estado_justificacion
  };
}

const SELECT_REGISTRO = `
  SELECT id, estudiante_id, fecha, tipo, justificada, motivo
  FROM dbo.inasistencias WHERE baja_en IS NULL`;

function registroDesdeFila(fila) {
  return {
    id: texto(fila.id),
    alumnoId: texto(fila.estudiante_id),
    fecha: fecha(fila.fecha),
    tipo: fila.tipo,
    justificada: Boolean(fila.justificada),
    motivo: fila.motivo ?? null
  };
}

const SELECT_SITUACION = `
  SELECT id, estudiante_id, materia_id, anio, cuatrimestre, tipo, estado, antecedente_id, observaciones, creado_en, actualizado_en
  FROM dbo.situaciones_academicas`;

const SELECT_HISTORIAL = `
  SELECT h.situacion_id, h.estado, h.tipo, h.anio, h.cuatrimestre, h.observaciones, h.fecha
  FROM dbo.situaciones_academicas_historial h`;

function situacionDesdeFila(fila, historial = []) {
  return {
    id: texto(fila.id),
    alumnoId: texto(fila.estudiante_id),
    materiaId: texto(fila.materia_id),
    anio: entero(fila.anio),
    cuatrimestre: entero(fila.cuatrimestre),
    tipo: fila.tipo,
    estado: fila.estado,
    antecedenteId: texto(fila.antecedente_id),
    observaciones: fila.observaciones ?? null,
    creadoEn: momento(fila.creado_en),
    actualizadoEn: momento(fila.actualizado_en),
    historial: historial.map((entrada) => ({
      estado: entrada.estado,
      tipo: entrada.tipo,
      anio: entero(entrada.anio),
      cuatrimestre: entero(entrada.cuatrimestre),
      etiqueta: entrada.cuatrimestre ? `${entrada.anio} - C${entrada.cuatrimestre}` : String(entrada.anio),
      observaciones: entrada.observaciones ?? null,
      fecha: momento(entrada.fecha)
    }))
  };
}

async function situacionesConHistorial(filtro, parametros) {
  const [filas, historial] = await Promise.all([
    consultar(`${SELECT_SITUACION} ${filtro}`, parametros),
    consultar(`${SELECT_HISTORIAL} JOIN dbo.situaciones_academicas s ON s.id = h.situacion_id ${filtro.replace(/estudiante_id/g, "s.estudiante_id")} ORDER BY h.fecha`, parametros)
  ]);
  const porSituacion = agruparPor(historial.map((entrada) => ({ ...entrada, situacion_id: texto(entrada.situacion_id) })), "situacion_id");
  return filas.map((fila) => situacionDesdeFila(fila, porSituacion.get(texto(fila.id)) ?? []));
}

/* ---------------- Repositorio ------------------------------------------------ */

const studentPortalRepositorySqlServer = {
  motor: "sqlserver",

  /* Carga los catalogos chicos en memoria. Se llama al arrancar y se refresca
     sola cada VIGENCIA_CACHE_MS en el proximo pedido de datos. */
  async preparar({ forzar = false } = {}) {
    if (!forzar && Date.now() - cache.cargadaEn < VIGENCIA_CACHE_MS) return;

    const [materias, docentes, divisiones] = await Promise.all([
      consultar("SELECT id, nombre FROM dbo.materias"),
      consultar("SELECT id, apellido, nombre, estado FROM dbo.docentes"),
      consultar("SELECT id, anio_curso, division FROM dbo.anios_divisiones")
    ]);

    cache.materias = new Map(materias.map((fila) => [texto(fila.id), { id: texto(fila.id), nombre: fila.nombre }]));
    cache.docentes = new Map(docentes.map((fila) => [texto(fila.id), { id: texto(fila.id), apellido: fila.apellido, nombre: fila.nombre, estado: fila.estado }]));
    /* En SQL Server la division ES el curso del ciclo (anios_divisiones): el
       mismo id sirve como cursoId y divisionId. */
    cache.divisiones = new Map(divisiones.map((fila) => [texto(fila.id), { id: texto(fila.id), cursoId: texto(fila.id), anio: entero(fila.anio_curso), nombre: texto(fila.division) }]));
    cache.cargadaEn = Date.now();
  },

  /* ---------------- Catalogos (sincronicos) ------------------------------ */

  materia(id) {
    return cache.materias.get(texto(id)) ?? null;
  },

  docente(id) {
    return id ? cache.docentes.get(texto(id)) ?? null : null;
  },

  curso(id) {
    const division = id ? cache.divisiones.get(texto(id)) : null;
    return division ? { id: division.id, anio: division.anio } : null;
  },

  division(id) {
    return id ? cache.divisiones.get(texto(id)) ?? null : null;
  },

  /* ---------------- Alumno ---------------------------------------------- */

  async alumno(id) {
    await this.preparar();
    const filas = await consultar(`${SELECT_ALUMNO} WHERE e.id = @id`, { id: entero(id) });
    return filas[0] ? alumnoDesdeFila(filas[0]) : null;
  },

  async alumnoPorDni(dni) {
    await this.preparar();
    const filas = await consultar(`${SELECT_ALUMNO} WHERE e.dni = @dni`, { dni: String(dni) });
    return filas[0] ? alumnoDesdeFila(filas[0]) : null;
  },

  async contarAlumnosConDni(dni) {
    const [fila] = await consultar("SELECT COUNT(*) AS cantidad FROM dbo.estudiantes WHERE dni = @dni", { dni: String(dni) });
    return Number(fila?.cantidad ?? 0);
  },

  async todosLosAlumnos() {
    await this.preparar();
    return (await consultar(SELECT_ALUMNO)).map(alumnoDesdeFila);
  },

  /* ---------------- Estructura academica --------------------------------- */

  async matriculas() {
    const filas = await consultar("SELECT id, anio_division_id FROM dbo.estudiantes WHERE anio_division_id IS NOT NULL");
    return filas.map((fila) => ({ id: `mat-${fila.id}`, estudianteId: texto(fila.id), divisionId: texto(fila.anio_division_id), isActive: true }));
  },

  async matriculasDe(alumnoId) {
    const filas = await consultar("SELECT id, anio_division_id FROM dbo.estudiantes WHERE id = @id AND anio_division_id IS NOT NULL", { id: entero(alumnoId) });
    return filas.map((fila) => ({ id: `mat-${fila.id}`, estudianteId: texto(fila.id), divisionId: texto(fila.anio_division_id), isActive: true }));
  },

  async relacionesMateria() {
    const filas = await consultar(
      `SELECT DISTINCT anio_division_id, materia_id FROM dbo.docentes_asignaciones_materias
       WHERE estado = 'activo' AND anio_lectivo = @ciclo AND anio_division_id IS NOT NULL`,
      { ciclo: cicloLectivoActual() }
    );
    const mapa = new Map();
    for (const fila of filas) {
      const clave = `division:${texto(fila.anio_division_id)}`;
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(texto(fila.materia_id));
    }
    return mapa;
  },

  async asignacionesDeDivision({ divisionId }) {
    const filas = await consultar(
      `SELECT id, docente_id, materia_id, anio_division_id, anio_lectivo FROM dbo.docentes_asignaciones_materias
       WHERE estado = 'activo' AND anio_division_id = @division`,
      { division: entero(divisionId) }
    );
    return filas.map((fila) => ({
      id: texto(fila.id),
      docenteId: texto(fila.docente_id),
      materiaId: texto(fila.materia_id),
      divisionId: texto(fila.anio_division_id),
      anio: entero(fila.anio_lectivo)
    }));
  },

  async taller(id) {
    if (!id) return null;
    const [fila] = await consultar("SELECT id, nombre FROM dbo.grupos_taller WHERE id = @id", { id: entero(id) });
    return fila ? { id: texto(fila.id), name: fila.nombre } : null;
  },

  /* ---------------- Calificaciones --------------------------------------- */

  async calificacionesDe(alumnoId) {
    return (await consultar(`${SELECT_CALIFICACION} AND estudiante_id = @id`, { id: entero(alumnoId) })).map(calificacionDesdeFila);
  },

  async calificacionesPorAlumno() {
    return agruparPor((await consultar(SELECT_CALIFICACION)).map(calificacionDesdeFila), "alumnoId");
  },

  /* ---------------- Asistencia ------------------------------------------- */

  async inasistenciasDe(alumnoId) {
    return (await consultar(`${SELECT_INASISTENCIA} WHERE estudiante_id = @id`, { id: entero(alumnoId) })).map(inasistenciaDesdeFila);
  },

  async inasistenciasPorAlumno() {
    return agruparPor((await consultar(SELECT_INASISTENCIA)).map(inasistenciaDesdeFila), "alumnoId");
  },

  async registrosAsistenciaDe(alumnoId) {
    return (await consultar(`${SELECT_REGISTRO} AND estudiante_id = @id`, { id: entero(alumnoId) })).map(registroDesdeFila);
  },

  async registrosAsistenciaPorAlumno() {
    return agruparPor((await consultar(SELECT_REGISTRO)).map(registroDesdeFila), "alumnoId");
  },

  /* ---------------- Situacion academica ---------------------------------- */

  async situacionesDe(alumnoId) {
    return situacionesConHistorial("WHERE estudiante_id = @id", { id: entero(alumnoId) });
  },

  async situacionesPorAlumno() {
    return agruparPor(await situacionesConHistorial("", {}), "alumnoId");
  },

  /* ---------------- Historial de cursos ---------------------------------- */

  async movimientosDe(alumnoId) {
    const filas = await consultar(
      `SELECT id, tipo, anio, cuatrimestre, fecha, curso_anterior, division_anterior, curso_nuevo, division_nueva
       FROM dbo.movimientos_curso WHERE estudiante_id = @id ORDER BY fecha DESC`,
      { id: entero(alumnoId) }
    );
    return filas.map((fila) => ({
      id: texto(fila.id),
      alumnoId: texto(alumnoId),
      tipo: fila.tipo,
      anio: entero(fila.anio),
      cuatrimestre: entero(fila.cuatrimestre),
      fecha: fecha(fila.fecha),
      cursoAnterior: entero(fila.curso_anterior),
      divisionAnterior: texto(fila.division_anterior),
      cursoNuevo: entero(fila.curso_nuevo),
      divisionNueva: texto(fila.division_nueva)
    }));
  }
};

export default studentPortalRepositorySqlServer;
