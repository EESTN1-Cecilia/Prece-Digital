/* Verificacion integral del padron para el portal del alumno.

   Recorre TODOS los alumnos registrados (activos e inactivos, sin paginar ni
   muestrear) y cruza cada legajo con calificaciones, asistencias, situacion
   academica, matricula y cuentas. Es de solo lectura: no corrige nada. Cada
   problema se informa con su origen para que secretaria o preceptoria lo revise
   antes de tocar un dato oficial.

   Las consultas se hacen una sola vez para todo el padron y se indexan por
   alumno, asi el costo crece en forma lineal con la cantidad de alumnos
   (~900 en la EEST N1) en lugar de una consulta por alumno y por modulo. */

import { buscarDivision } from "../students/catalogo.mjs";
import studentPortalRepository, { cuentasRepository } from "./repositorio.mjs";
import { evaluarHabilitacion } from "./student-accounts.service.mjs";
import { armarAsistencias, matriculaVigente, materiasCurriculares, numeroDeDivision } from "./student-portal.service.mjs";
import { DNI_RE, cicloLectivoActual, usuariosIniciales } from "./catalogo.mjs";

const SEVERIDAD = { error: "error", advertencia: "advertencia" };

const DESCRIPCIONES = {
  dni_faltante: "El legajo no tiene DNI.",
  dni_invalido: "El DNI no tiene un formato válido (7 a 9 dígitos).",
  dni_provisorio: "El DNI es provisorio (nómina importada sin documento). No puede usarse para ingresar.",
  dni_duplicado: "El mismo DNI está cargado en más de un legajo.",
  posible_duplicado: "Hay otro legajo con el mismo apellido, nombre y fecha de nacimiento.",
  curso_division_inexistente: "El curso y la división del legajo no existen en el catálogo de la escuela.",
  sin_matricula: "No tiene matrícula en la estructura académica: no se le pueden asociar las materias de su división.",
  matricula_inconsistente: "La matrícula en la estructura académica no coincide con el curso y la división del legajo.",
  matricula_multiple: "Tiene más de una matrícula activa.",
  sin_materias: "Su división no tiene materias asignadas en la estructura curricular.",
  calificacion_otro_curso: "Tiene calificaciones del ciclo actual cargadas en otro curso o división.",
  calificacion_materia_inexistente: "Tiene calificaciones de una materia que no existe en el catálogo.",
  calificacion_ciclo_inconsistente: "La fecha de una calificación no corresponde al ciclo lectivo en que se registró.",
  inasistencia_otro_curso: "Tiene inasistencias del ciclo actual registradas en otro curso o división.",
  inasistencia_ciclo_inconsistente: "La fecha de una inasistencia no corresponde a su ciclo lectivo.",
  asistencia_registros_distintos: "Un mismo día figura distinto en el registro de inasistencias y en el de asistencia (tipo o justificación).",
  situacion_ciclo_futuro: "Tiene una situación académica de un ciclo posterior al actual.",
  previa_en_ciclo_actual: "Tiene una materia de tipo pendiente cargada en el ciclo actual.",
  posible_previa_sin_registrar: "Desaprobó una materia en un ciclo anterior y no tiene registro posterior (pendiente, recursada o aprobada).",
  cuenta_multiple: "Tiene más de una cuenta de acceso vinculada.",
  cuenta_legajo_inactivo: "Tiene una cuenta de acceso activa pero el legajo está dado de baja."
};

function problema(codigo, severidad, detalle = null) {
  return { codigo, severidad, descripcion: DESCRIPCIONES[codigo] ?? codigo, detalle };
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function contarPor(lista, clave) {
  const mapa = new Map();
  for (const item of lista) {
    const valor = clave(item);
    if (!valor) continue;
    mapa.set(valor, (mapa.get(valor) ?? 0) + 1);
  }
  return mapa;
}

function ubicacionDeRegistro(cursoId, divisionId) {
  const division = studentPortalRepository.division(divisionId);
  const curso = studentPortalRepository.curso(cursoId ?? division?.cursoId);
  return { curso: curso?.anio ?? null, division: division ? numeroDeDivision(division.nombre) : null };
}

export async function verificarPadron({ incluirSinProblemas = false } = {}) {
  const cicloActual = cicloLectivoActual();
  /* Una lectura por modulo para todo el padron, en paralelo. */
  const [alumnos, calificacionesPorAlumno, inasistenciasPorAlumno, registrosPorAlumno, situacionesPorAlumno, matriculas, relacionesMateria] =
    await Promise.all([
      studentPortalRepository.todosLosAlumnos(),
      studentPortalRepository.calificacionesPorAlumno(),
      studentPortalRepository.inasistenciasPorAlumno(),
      studentPortalRepository.registrosAsistenciaPorAlumno(),
      studentPortalRepository.situacionesPorAlumno(),
      studentPortalRepository.matriculas(),
      studentPortalRepository.relacionesMateria()
    ]);
  const idsAlumnos = new Set(alumnos.map((alumno) => alumno.id));
  const matriculasPorAlumno = new Map();
  for (const matricula of matriculas) {
    if (!matriculasPorAlumno.has(matricula.estudianteId)) matriculasPorAlumno.set(matricula.estudianteId, []);
    matriculasPorAlumno.get(matricula.estudianteId).push(matricula);
  }

  const cuentas = await cuentasRepository.listarCuentasDeAlumnos();
  const cuentasPorAlumno = new Map();
  for (const cuenta of cuentas) {
    if (!cuentasPorAlumno.has(cuenta.studentId)) cuentasPorAlumno.set(cuenta.studentId, []);
    cuentasPorAlumno.get(cuenta.studentId).push(cuenta);
  }

  const dnis = contarPor(alumnos, (alumno) => alumno.dni);
  const claveIdentidad = (alumno) =>
    `${normalizar(alumno.apellido)}|${normalizar(alumno.nombre)}|${alumno.fechaNacimiento ?? "?"}`;
  const identidades = contarPor(alumnos, (alumno) => (alumno.fechaNacimiento ? claveIdentidad(alumno) : null));

  const iniciales = usuariosIniciales(alumnos);
  const resultados = [];
  const habilitacion = { habilitados: 0, bloqueados: 0, motivos: {} };

  for (const alumno of alumnos) {
    const problemas = [];
    const calificaciones = calificacionesPorAlumno.get(alumno.id) ?? [];
    const inasistencias = inasistenciasPorAlumno.get(alumno.id) ?? [];
    const registros = registrosPorAlumno.get(alumno.id) ?? [];
    const situaciones = situacionesPorAlumno.get(alumno.id) ?? [];
    const propias = matriculasPorAlumno.get(alumno.id) ?? [];

    /* 1. DNI valido y unico */
    if (!alumno.dni) problemas.push(problema("dni_faltante", SEVERIDAD.error));
    else if (!DNI_RE.test(String(alumno.dni))) problemas.push(problema("dni_invalido", SEVERIDAD.error, { dni: alumno.dni }));
    if (alumno.dniProvisorio) problemas.push(problema("dni_provisorio", SEVERIDAD.error, { dni: alumno.dni }));
    const repetido = alumno.dni && dnis.get(alumno.dni) > 1;
    if (repetido) {
      const otros = alumnos.filter((otro) => otro.dni === alumno.dni && otro.id !== alumno.id).map((otro) => otro.id);
      problemas.push(problema("dni_duplicado", SEVERIDAD.error, { dni: alumno.dni, otrosLegajos: otros }));
    }

    /* 2. Perfiles duplicados (misma persona en dos legajos con DNI distinto) */
    if (alumno.fechaNacimiento && identidades.get(claveIdentidad(alumno)) > 1) {
      const otros = alumnos
        .filter((otro) => otro.id !== alumno.id && otro.fechaNacimiento && claveIdentidad(otro) === claveIdentidad(alumno))
        .map((otro) => ({ id: otro.id, dni: otro.dni }));
      problemas.push(problema("posible_duplicado", SEVERIDAD.advertencia, { otrosLegajos: otros }));
    }

    /* 3. Curso y division correctos */
    if (!buscarDivision(Number(alumno.curso), alumno.division ?? "")) {
      problemas.push(problema("curso_division_inexistente", SEVERIDAD.error, { curso: alumno.curso, division: alumno.division }));
    }

    const activas = propias.filter((matricula) => matricula.isActive !== false);
    const vigente = matriculaVigente(alumno, activas);
    if (alumno.isActive) {
      if (!activas.length) problemas.push(problema("sin_matricula", SEVERIDAD.advertencia));
      else if (!vigente) {
        problemas.push(problema("matricula_inconsistente", SEVERIDAD.error, {
          legajo: { curso: alumno.curso, division: alumno.division },
          matriculas: activas.map((matricula) => ({ id: matricula.id, ...ubicacionDeRegistro(null, matricula.divisionId) }))
        }));
      }
      if (activas.length > 1) problemas.push(problema("matricula_multiple", SEVERIDAD.advertencia, { matriculas: activas.map((m) => m.id) }));
    }

    /* 4. Materias asociadas */
    if (vigente && materiasCurriculares(alumno, activas, relacionesMateria).ids.length === 0) {
      problemas.push(problema("sin_materias", SEVERIDAD.advertencia, { divisionId: vigente.division.id }));
    }

    /* 5. Calificaciones del alumno correcto, en su curso y su ciclo */
    const fueraDeCurso = [];
    const materiaInexistente = new Set();
    const cicloMalo = [];
    for (const calificacion of calificaciones) {
      if (!studentPortalRepository.materia(calificacion.materiaId)) materiaInexistente.add(calificacion.materiaId);
      if (calificacion.fecha && Number(calificacion.fecha.slice(0, 4)) !== calificacion.anio) cicloMalo.push(calificacion.id);
      if (calificacion.anio === cicloActual && (calificacion.cursoId || calificacion.divisionId)) {
        const ubicacion = ubicacionDeRegistro(calificacion.cursoId, calificacion.divisionId);
        const cursoDistinto = ubicacion.curso !== null && ubicacion.curso !== alumno.curso;
        const divisionDistinta = ubicacion.division !== null && ubicacion.division !== String(alumno.division);
        if (cursoDistinto || divisionDistinta) fueraDeCurso.push({ id: calificacion.id, ...ubicacion });
      }
    }
    if (fueraDeCurso.length) problemas.push(problema("calificacion_otro_curso", SEVERIDAD.error, { calificaciones: fueraDeCurso }));
    if (materiaInexistente.size) problemas.push(problema("calificacion_materia_inexistente", SEVERIDAD.error, { materias: [...materiaInexistente] }));
    if (cicloMalo.length) problemas.push(problema("calificacion_ciclo_inconsistente", SEVERIDAD.error, { calificaciones: cicloMalo }));

    /* 6. Asistencias del alumno correcto, en su curso y su ciclo */
    const inasOtroCurso = inasistencias.filter(
      (registro) => registro.anio === cicloActual && (registro.curso !== alumno.curso || String(registro.division) !== String(alumno.division))
    );
    if (inasOtroCurso.length) {
      problemas.push(problema("inasistencia_otro_curso", SEVERIDAD.advertencia, {
        inasistencias: inasOtroCurso.map((registro) => ({ id: registro.id, fecha: registro.fecha, curso: registro.curso, division: registro.division }))
      }));
    }
    const inasCicloMalo = inasistencias.filter((registro) => Number(String(registro.fecha).slice(0, 4)) !== registro.anio);
    if (inasCicloMalo.length) problemas.push(problema("inasistencia_ciclo_inconsistente", SEVERIDAD.error, { inasistencias: inasCicloMalo.map((r) => r.id) }));

    const { conflictos } = armarAsistencias(alumno, { inasistencias, registros }, {});
    if (conflictos.length) problemas.push(problema("asistencia_registros_distintos", SEVERIDAD.advertencia, { dias: conflictos }));

    /* 7. Boletines / situacion academica en su ciclo; previas */
    const futuras = situaciones.filter((situacion) => situacion.anio > cicloActual);
    if (futuras.length) problemas.push(problema("situacion_ciclo_futuro", SEVERIDAD.error, { situaciones: futuras.map((s) => s.id) }));

    const pendientesActuales = situaciones.filter((situacion) => situacion.tipo === "pendiente" && situacion.anio >= cicloActual);
    if (pendientesActuales.length) problemas.push(problema("previa_en_ciclo_actual", SEVERIDAD.advertencia, { situaciones: pendientesActuales.map((s) => s.id) }));

    const sinSeguimiento = situaciones.filter(
      (situacion) =>
        situacion.anio < cicloActual &&
        situacion.estado === "desaprobada" &&
        !situaciones.some((otra) => otra.id !== situacion.id && otra.materiaId === situacion.materiaId && otra.anio >= situacion.anio && ["pendiente", "recursada"].includes(otra.tipo)) &&
        !situaciones.some((otra) => otra.materiaId === situacion.materiaId && otra.anio > situacion.anio && otra.estado === "aprobada")
    );
    if (sinSeguimiento.length) {
      problemas.push(problema("posible_previa_sin_registrar", SEVERIDAD.advertencia, {
        situaciones: sinSeguimiento.map((s) => ({ id: s.id, materiaId: s.materiaId, anio: s.anio }))
      }));
    }

    /* 8. Cuentas de acceso */
    const propiasCuentas = cuentasPorAlumno.get(alumno.id) ?? [];
    if (propiasCuentas.length > 1) problemas.push(problema("cuenta_multiple", SEVERIDAD.error, { cuentas: propiasCuentas.map((c) => c.id) }));
    if (!alumno.isActive && propiasCuentas.some((cuenta) => cuenta.isActive)) problemas.push(problema("cuenta_legajo_inactivo", SEVERIDAD.advertencia));

    const ingreso = evaluarHabilitacion(alumno, { dniRepetido: Boolean(repetido) });
    if (ingreso.habilitado) habilitacion.habilitados += 1;
    else {
      habilitacion.bloqueados += 1;
      habilitacion.motivos[ingreso.motivo] = (habilitacion.motivos[ingreso.motivo] ?? 0) + 1;
    }

    resultados.push({
      id: alumno.id,
      dni: alumno.dni,
      apellido: alumno.apellido,
      nombre: alumno.nombre,
      curso: alumno.curso,
      division: alumno.division,
      activo: alumno.isActive,
      ingreso: {
        habilitado: ingreso.habilitado,
        motivo: ingreso.motivo,
        tieneCuenta: propiasCuentas.length > 0,
        /* Credencial para entregar al alumno: usuario inicial y, como clave, su DNI. */
        usuario: propiasCuentas[0]?.username ?? iniciales.get(alumno.id) ?? null
      },
      registros: {
        calificaciones: calificaciones.length,
        inasistencias: inasistencias.length,
        registrosAsistencia: registros.length,
        situaciones: situaciones.length
      },
      problemas
    });
  }

  /* Registros que apuntan a alumnos que no existen: no se los atribuye a nadie. */
  const huerfanos = {
    calificaciones: [...calificacionesPorAlumno.keys()].filter((id) => !idsAlumnos.has(id)),
    inasistencias: [...inasistenciasPorAlumno.keys()].filter((id) => !idsAlumnos.has(id)),
    registrosAsistencia: [...registrosPorAlumno.keys()].filter((id) => !idsAlumnos.has(id)),
    situaciones: [...situacionesPorAlumno.keys()].filter((id) => !idsAlumnos.has(id)),
    matriculas: matriculas.filter((matricula) => !idsAlumnos.has(matricula.estudianteId)).map((matricula) => matricula.id),
    cuentas: cuentas.filter((cuenta) => !cuenta.studentId || !idsAlumnos.has(cuenta.studentId)).map((cuenta) => cuenta.id)
  };

  const problemasPorCodigo = {};
  for (const resultado of resultados) {
    for (const item of resultado.problemas) {
      problemasPorCodigo[item.codigo] ??= { codigo: item.codigo, severidad: item.severidad, descripcion: item.descripcion, alumnos: 0 };
      problemasPorCodigo[item.codigo].alumnos += 1;
    }
  }

  const conProblemas = resultados.filter((resultado) => resultado.problemas.length);

  return {
    generadoEn: new Date().toISOString(),
    cicloLectivo: cicloActual,
    totales: {
      alumnosVerificados: resultados.length,
      activos: resultados.filter((resultado) => resultado.activo).length,
      inactivos: resultados.filter((resultado) => !resultado.activo).length,
      sinProblemas: resultados.length - conProblemas.length,
      conProblemas: conProblemas.length,
      conErrores: resultados.filter((resultado) => resultado.problemas.some((item) => item.severidad === SEVERIDAD.error)).length,
      ingresoHabilitado: habilitacion.habilitados,
      ingresoBloqueado: habilitacion.bloqueados,
      motivosBloqueo: habilitacion.motivos,
      cuentasCreadas: cuentas.length
    },
    problemasPorCodigo: Object.values(problemasPorCodigo).sort((a, b) => b.alumnos - a.alumnos),
    huerfanos,
    alumnos: incluirSinProblemas ? resultados : conProblemas
  };
}

export default { verificarPadron };
