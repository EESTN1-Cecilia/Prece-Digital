/* Catalogo y validaciones del modulo de promocion y cambio de curso.

   Un movimiento de curso/division registra de donde viene el alumno, a donde va y
   que tipo de movimiento es. Los tipos y las reglas de cada tipo viven aca, en
   un unico lugar; el servicio rechaza cualquier valor fuera del catalogo y el
   endpoint GET /api/v1/movimientos-cursos/catalogos lo expone.

   Curso y division de destino se validan contra el catalogo academico real
   (modules/students/catalogo.mjs, la EEST N1: basico 1-3 y orientaciones de 4 a 7).
   El backend deriva turno y orientacion del destino; el cliente no los inventa. */

import { CURSOS_VALIDOS, buscarDivision } from "../students/catalogo.mjs";

export { CURSOS_VALIDOS, buscarDivision };

export const TIPOS_MOVIMIENTO = [
  { valor: "promocion", descripcion: "El alumno pasa al curso inmediato siguiente" },
  { valor: "cambio_curso", descripcion: "El alumno cambia a otro curso" },
  { valor: "cambio_division", descripcion: "El alumno cambia de division dentro del mismo curso" },
  { valor: "otro", descripcion: "Otro movimiento definido por la institucion" }
];

export const TIPOS_VALIDOS = TIPOS_MOVIMIENTO.map((tipo) => tipo.valor);

export function descripcionDeTipo(tipo) {
  return TIPOS_MOVIMIENTO.find((item) => item.valor === tipo)?.descripcion ?? null;
}

/* ---------------- Periodo academico --------------------------------------- */

export const ANIO_MINIMO = 1990;
export const ANIO_MAXIMO = 2100;
export const CUATRIMESTRES = [1, 2];

export function esAnioLectivo(valor) {
  if (!/^\d+$/.test(String(valor ?? ""))) {
    return false;
  }

  const anio = Number(valor);
  return Number.isInteger(anio) && anio >= ANIO_MINIMO && anio <= ANIO_MAXIMO;
}

export function normalizarCuatrimestre(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return null;
  }

  const numero = Number(String(valor).trim());
  return CUATRIMESTRES.includes(numero) ? numero : undefined;
}

export function etiquetaPeriodo(anio, cuatrimestre) {
  return cuatrimestre ? `${anio} - C${cuatrimestre}` : String(anio);
}

/* ---------------- Fecha del movimiento ------------------------------------ */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esFecha(valor) {
  if (!FECHA.test(String(valor ?? ""))) {
    return false;
  }

  const [anio, mes, dia] = String(valor).split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

export function normalizarFecha(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return undefined;
  }

  const dia = String(valor).trim().slice(0, 10);
  return esFecha(dia) ? dia : undefined;
}

export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------- Limites ------------------------------------------------ */

export const MOTIVO_MAX = 500;
export const MOVIMIENTOS_MASIVOS_MAX = 500;

/* ---------------- Reglas por tipo de movimiento -------------------------- */

/* Valida que el destino sea coherente con el tipo y que el alumno realmente se
   mueva. Devuelve el curso y la division de destino; lanza errores si no. */
export function definirDestino(tipo, { alumno, cursoNuevo, divisionNueva }) {
  const cursoAnterior = Number(alumno.curso);
  const divisionAnterior = String(alumno.division ?? "");

  let destinoCurso = cursoNuevo === undefined || cursoNuevo === null || cursoNuevo === "" ? null : Number(String(cursoNuevo).trim());

  if (tipo === "cambio_division" && (destinoCurso === null || Number.isNaN(destinoCurso))) {
    destinoCurso = cursoAnterior;
  }

  if (tipo === "promocion" && (destinoCurso === null || Number.isNaN(destinoCurso))) {
    destinoCurso = cursoAnterior + 1;
  }

  const tipoRegla = {
    promocion: () => {
      if (destinoCurso !== cursoAnterior + 1) {
        return { error: { field: "cursoNuevo", message: "En una promocion el curso de destino debe ser el inmediato siguiente." } };
      }

      return { curso: destinoCurso };
    },
    cambio_curso: () => {
      if (destinoCurso === cursoAnterior) {
        return { error: { field: "cursoNuevo", message: "El curso de destino debe ser distinto del curso actual." } };
      }

      return { curso: destinoCurso };
    },
    cambio_division: () => {
      if (destinoCurso !== cursoAnterior) {
        return { error: { field: "cursoNuevo", message: "Un cambio de division conserva el curso actual." } };
      }

      return { curso: destinoCurso };
    },
    otro: () => ({ curso: destinoCurso })
  };

  const regla = tipoRegla[tipo];

  if (!regla) {
    return { error: { field: "tipo", message: "Tipo de movimiento invalido." } };
  }

  if (destinoCurso === null || Number.isNaN(destinoCurso) || !CURSOS_VALIDOS.includes(destinoCurso)) {
    return { error: { field: "cursoNuevo", message: "El curso de destino no existe." } };
  }

  const reglaResultado = regla();

  if (reglaResultado.error) {
    return reglaResultado;
  }

  const division = String(divisionNueva ?? "").trim();

  if (!division) {
    return { error: { field: "divisionNueva", message: "La division de destino es obligatoria." } };
  }

  const derivo = buscarDivision(reglaResultado.curso, division);

  if (!derivo) {
    return { error: { field: "divisionNueva", message: "La division de destino no existe para ese curso." } };
  }

  if (reglaResultado.curso === cursoAnterior && division === divisionAnterior) {
    return { error: { field: "divisionNueva", message: "El alumno ya se encuentra en ese curso y division." } };
  }

  return {
    curso: reglaResultado.curso,
    division,
    turno: derivo.turno,
    orientacion: derivo.orientacion
  };
}

/* ---------------- Ordenes permitidos para listar-------------------------- */

export const ORDENES_MOVIMIENTOS = {
  fecha: { campo: "fecha", sentido: 1 },
  fecha_desc: { campo: "fecha", sentido: -1 },
  anio: { campo: "anio", sentido: 1 },
  anio_desc: { campo: "anio", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 },
  alumno: { campo: "alumnoSort", sentido: 1 },
  alumno_desc: { campo: "alumnoSort", sentido: -1 }
};

/* Texto sin tildes ni mayusculas para comparaciones y busquedas. */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}