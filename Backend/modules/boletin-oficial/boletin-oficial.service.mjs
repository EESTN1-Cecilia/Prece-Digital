/* Boletin Oficial de Calificaciones y Planilla del docente: UNA sola fuente.

   Las notas que carga el docente en la planilla, las que corrige el personal en
   el boletin oficial y las que ve el alumno en su portal son los mismos
   registros del modulo de calificaciones. Este servicio solo traduce entre el
   formato de pantalla (por materia: informe1, informe2, diciembre, febrero) y
   el modelo del backend (materia + periodo + tipo de evaluacion), y delega en
   grades.service para validar y autorizar (un docente solo carga lo suyo). */

import { errorDeValidacion, noEncontrado, solicitudInvalida } from "../../utils/api-error.mjs";
import studentRepository from "../students/students.repository.mjs";
import academicRepository from "../academic/academic.repository.mjs";
import gradesRepository from "../grades/grades.repository.mjs";
import gradesService from "../grades/grades.service.mjs";
import { interpretarValor } from "../grades/catalogo.mjs";
import { ultimaCalificacion, cicloLectivoActual } from "../student-portal/catalogo.mjs";
import { exigirPeriodoHabilitado, puedeCargar } from "../grades/periodos-carga.service.mjs";
import boletinOficialRepository from "./boletin-oficial.repository.mjs";

/* Campo de pantalla -> periodo del backend. Diciembre y febrero son instancias
   del registro anual (cuatrimestre null); febrero es posterior y prevalece. */
export const CAMPOS = {
  informe1: { cuatrimestre: 1, tipoEvaluacion: "escrito", periodo: "Informe 1" },
  informe2: { cuatrimestre: 2, tipoEvaluacion: "escrito", periodo: "Informe 2" },
  diciembre: { cuatrimestre: null, tipoEvaluacion: "escrito", periodo: "Diciembre" },
  febrero: { cuatrimestre: null, tipoEvaluacion: "recuperatorio", periodo: "Febrero" }
};

/* Detalle de la planilla (parciales, valoracion e inasistencias) que pertenece
   a cada cuatrimestre: si el periodo esta bloqueado se conserva lo guardado. */
const DETALLE_POR_CAMPO = {
  informe1: ["p1", "p2", "v1", "f1"],
  informe2: ["p3", "p4", "v2", "f2"]
};

const VACIO = new Set(["", "-", "—"]);
const hoy = () => new Date().toISOString().slice(0, 10);

function campoDe(calificacion) {
  if (calificacion.cuatrimestre === 1) return "informe1";
  if (calificacion.cuatrimestre === 2) return "informe2";
  return calificacion.tipoEvaluacion === "recuperatorio" || calificacion.periodo === "Febrero" ? "febrero" : "diciembre";
}

function leerAnio(valor) {
  if (valor === undefined || valor === null || valor === "") return cicloLectivoActual();
  const anio = Number(valor);
  if (!Number.isInteger(anio) || anio < 1990 || anio > 2100) {
    throw errorDeValidacion([{ field: "anio", message: "El ciclo lectivo no es valido." }]);
  }
  return anio;
}

function armar(alumno, anio) {
  const delAnio = gradesRepository.listCalificaciones({ alumnoId: alumno.id, anio, estado: "activo" });
  const porMateria = new Map();
  for (const calificacion of delAnio) {
    if (!porMateria.has(calificacion.materiaId)) porMateria.set(calificacion.materiaId, []);
    porMateria.get(calificacion.materiaId).push(calificacion);
  }

  const notas = {};
  for (const [materiaId, lista] of porMateria) {
    const nombre = academicRepository.findSubjectRefById(materiaId)?.nombre ?? materiaId;
    const fila = { informe1: "", informe2: "", diciembre: "", febrero: "" };
    for (const campo of Object.keys(CAMPOS)) {
      const ultima = ultimaCalificacion(lista.filter((item) => campoDe(item) === campo));
      if (ultima) fila[campo] = String(ultima.valor);
    }
    notas[nombre] = fila;
  }

  const extra = boletinOficialRepository.obtener(alumno.id, anio);
  return {
    alumnoId: alumno.id,
    anio,
    notas,
    inasistencias: extra.inasistencias ?? "",
    pendientes: extra.pendientes ?? [],
    libroFolio: extra.libroFolio ?? null,
    detalle: extra.detalle ?? {},
    actualizadoEn: extra.actualizadoEn ?? null
  };
}

function exigirAlumno(alumnoId) {
  const alumno = studentRepository.findById(alumnoId);
  if (!alumno) throw noEncontrado("El alumno");
  return alumno;
}

function limpiarDetalle(detalle) {
  const limpio = {};
  for (const [materia, filas] of Object.entries(detalle ?? {})) {
    if (!filas || typeof filas !== "object") continue;
    limpio[String(materia).slice(0, 80)] = Object.fromEntries(
      Object.entries(filas)
        .filter(([, valor]) => ["string", "number"].includes(typeof valor))
        .slice(0, 20)
        .map(([campo, valor]) => [String(campo).slice(0, 20), String(valor).slice(0, 40)])
    );
  }
  return limpio;
}

/* Deja en `detalle` los valores ya guardados de las claves bloqueadas. */
function conservarDetalle(detalle, guardado, claves) {
  const resultado = {};
  for (const [materia, filas] of Object.entries(detalle)) {
    const previas = guardado?.[materia] ?? {};
    const fila = { ...filas };
    for (const clave of claves) {
      if (previas[clave] !== undefined) fila[clave] = previas[clave];
      else delete fila[clave];
    }
    resultado[materia] = fila;
  }
  return resultado;
}

export const boletinOficialService = {
  obtener(alumnoId, query = {}) {
    return armar(exigirAlumno(alumnoId), leerAnio(query.anio));
  },

  /* Varios alumnos de una vez (planilla de un curso completo). */
  listar(query = {}) {
    const ids = String(query.ids ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) throw solicitudInvalida("Indica los alumnos en el parametro ids.");
    if (ids.length > 200) throw solicitudInvalida("Se pueden consultar hasta 200 alumnos por pedido.");
    const anio = leerAnio(query.anio);
    const alumnos = {};
    for (const id of ids) {
      const alumno = studentRepository.findById(id);
      if (alumno) alumnos[id] = armar(alumno, anio);
    }
    return { anio, alumnos };
  },

  /* Cuantos alumnos de un curso y division ya tienen nota en cada materia (para
     los indicadores "calificado / sin calificar" de las pantallas). */
  resumenDeCurso(query = {}) {
    const anio = leerAnio(query.anio);
    const curso = Number(String(query.curso ?? "").replace(/\D/g, ""));
    const division = String(query.division ?? "").replace(/\D/g, "");
    if (!curso || !division) throw solicitudInvalida("Indica curso y division.");

    const alumnos = studentRepository.all().filter((alumno) => alumno.isActive !== false && Number(alumno.curso) === curso && String(alumno.division) === division);
    const materias = {};
    const conNotas = [];

    for (const alumno of alumnos) {
      const notas = armar(alumno, anio).notas;
      const nombres = Object.keys(notas).filter((nombre) => Object.values(notas[nombre]).some(Boolean));
      if (nombres.length > 0) conNotas.push(alumno.id);
      for (const nombre of nombres) materias[nombre] = (materias[nombre] ?? 0) + 1;
    }

    return { anio, curso, division, alumnos: alumnos.length, conNotas, materias };
  },

  guardar(alumnoId, cuerpo, user) {
    const alumno = exigirAlumno(alumnoId);
    const anio = leerAnio(cuerpo?.anio);
    const errores = [];
    const plan = [];

    for (const [materia, campos] of Object.entries(cuerpo?.notas ?? {})) {
      if (!String(materia).trim() || !campos || typeof campos !== "object") continue;
      for (const [campo, crudo] of Object.entries(campos)) {
        if (!CAMPOS[campo]) continue; // promedioAnual y definitiva se calculan, no se guardan
        const texto = String(crudo ?? "").trim();
        if (VACIO.has(texto)) {
          plan.push({ materia, campo, valor: null });
        } else if (interpretarValor(texto)) {
          plan.push({ materia, campo, valor: texto });
        } else {
          errores.push({ field: `notas.${materia}.${campo}`, message: `"${texto}" no es una nota valida (1 a 10, TEA, TEP o TED).` });
        }
      }
    }

    if (errores.length > 0) throw errorDeValidacion(errores);

    /* Primera pasada, sin efectos: que cambia en cada campo. Asi un periodo de
       carga bloqueado frena el guardado antes de tocar ninguna nota. */
    const acciones = [];
    for (const { materia, campo, valor } of plan) {
      const nombre = String(materia).trim();
      const ref = academicRepository.findSubjectRefByName(nombre);

      /* Lo que muestra la pantalla para este campo es la ULTIMA calificacion del
         periodo (igual que el portal), asi que esa es la que se corrige. Si
         hay varias evaluaciones en el periodo, al vaciar el campo se dan de
         baja todas. */
      const delCampo = ref
        ? gradesRepository
          .listCalificaciones({ alumnoId: alumno.id, materiaId: ref.id, anio, estado: "activo" })
          .filter((item) => campoDe(item) === campo)
        : [];

      if (valor === null) {
        if (delCampo.length > 0) acciones.push({ tipo: "baja", campo, ref, delCampo });
        continue;
      }

      const existente = ultimaCalificacion(delCampo);
      if (existente) {
        const info = interpretarValor(valor);
        if (String(existente.valor) !== String(info.nota ?? info.concepto)) {
          acciones.push({ tipo: "modificar", campo, ref, existente, valor });
        }
        continue;
      }

      acciones.push({ tipo: "alta", campo, nombre, valor });
    }

    for (const campo of new Set(acciones.map((accion) => accion.campo))) {
      exigirPeriodoHabilitado(user, { anio, ...CAMPOS[campo] });
    }

    const cambios = [];
    for (const accion of acciones) {
      const { campo } = accion;

      if (accion.tipo === "baja") {
        for (const item of accion.delCampo) {
          gradesService.deleteCalificacion(item.id, user);
          cambios.push({ materia: accion.ref.nombre, campo, accion: "baja" });
        }
        continue;
      }

      if (accion.tipo === "modificar") {
        gradesService.updateCalificacion(accion.existente.id, { valor: accion.valor, fecha: hoy() }, user);
        cambios.push({ materia: accion.ref.nombre, campo, accion: "modificada" });
        continue;
      }

      const definicion = CAMPOS[campo];
      const ref = academicRepository.ensureSubjectRef(accion.nombre);
      let fecha = hoy();
      if (campo === "febrero") {
        // Febrero siempre es posterior a diciembre para que prevalezca como definitiva
        const dic = gradesRepository.findCalificacionDuplicada({ alumnoId: alumno.id, materiaId: ref.id, anio, cuatrimestre: null, tipoEvaluacion: CAMPOS.diciembre.tipoEvaluacion });
        if (dic && dic.fecha >= fecha) fecha = new Date(Date.parse(dic.fecha) + 86_400_000).toISOString().slice(0, 10);
      }

      gradesService.createCalificacion({
        alumnoId: alumno.id,
        materiaId: ref.id,
        anio,
        cuatrimestre: definicion.cuatrimestre,
        tipoEvaluacion: definicion.tipoEvaluacion,
        periodo: definicion.periodo,
        valor: accion.valor,
        fecha
      }, user);
      cambios.push({ materia: ref.nombre, campo, accion: "alta" });
    }

    const extra = {};
    if (cuerpo?.inasistencias !== undefined) extra.inasistencias = String(cuerpo.inasistencias ?? "").trim().slice(0, 10);
    if (Array.isArray(cuerpo?.pendientes)) extra.pendientes = cuerpo.pendientes.slice(0, 20).map((fila) => (fila && typeof fila === "object" ? Object.fromEntries(Object.entries(fila).slice(0, 30).map(([k, v]) => [String(k).slice(0, 30), String(v ?? "").slice(0, 80)])) : {}));
    if (cuerpo?.libroFolio && typeof cuerpo.libroFolio === "object") {
      extra.libroFolio = { libro: String(cuerpo.libroFolio.libro ?? "").slice(0, 20), folio: String(cuerpo.libroFolio.folio ?? "").slice(0, 20) };
    }
    if (cuerpo?.detalle) {
      const bloqueadas = Object.keys(DETALLE_POR_CAMPO)
        .filter((campo) => !puedeCargar(user, { anio, ...CAMPOS[campo] }))
        .flatMap((campo) => DETALLE_POR_CAMPO[campo]);
      const detalle = limpiarDetalle(cuerpo.detalle);
      extra.detalle = bloqueadas.length > 0
        ? conservarDetalle(detalle, boletinOficialRepository.obtener(alumno.id, anio).detalle, bloqueadas)
        : detalle;
    }
    if (Object.keys(extra).length > 0) boletinOficialRepository.guardar(alumno.id, anio, extra);

    return { ...armar(alumno, anio), cambios };
  }
};

export default boletinOficialService;
