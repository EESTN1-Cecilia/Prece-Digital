/* Catalogo y validaciones del modulo de calificaciones.

   Modelo segun la RQ "Calificaciones":
   - Cada calificacion registra el valor obtenido por un alumno en una materia
     dentro de un periodo (anio lectivo + cuatrimestre opcional) y un alcance
     (curso y/o division).
   - El tipo de evaluacion describe la instancia (escrito, oral, trabajo practico,
     proyecto o recuperatorio).
   - El valor puede ser numerico (escala 1 a 10) o conceptual (valoracion
     cualitativa). Cuando es numerico se deriva la condicion (aprobado o
     desaprobado) tomando la nota de aprobacion de la escala vigente.

   Este catalogo no conoce la estructura academica: las referencias (alumno,
   materia, curso, division, docente) se validan en el servicio contra academic,
   students y teachers. */

export const TIPOS_EVALUACION = [
  { valor: "escrito", descripcion: "Evaluación escrita" },
  { valor: "oral", descripcion: "Evaluación oral" },
  { valor: "trabajo_practico", descripcion: "Trabajo práctico" },
  { valor: "proyecto", descripcion: "Proyecto" },
  { valor: "recuperatorio", descripcion: "Recuperatorio" }
];

export const TIPOS_EVALUACION_VALIDOS = TIPOS_EVALUACION.map((tipo) => tipo.valor);
export const TIPO_EVALUACION_POR_DEFECTO = "escrito";

/* Valoraciones cualitativas admitidas cuando el valor no es numerico. */
export const CONCEPTOS = [
  { valor: "TEA", descripcion: "Trayectoria educativa avanzada" },
  { valor: "TEP", descripcion: "Trayectoria educativa en proceso" },
  { valor: "TED", descripcion: "Trayectoria educativa con dificultad" }
];

export const CONCEPTOS_VALIDOS = CONCEPTOS.map((concepto) => concepto.valor);

/* Escala numerica vigente. La nota de aprobacion define la condicion derivada. */
export const ESCALA = {
  minimo: 1,
  maximo: 10,
  aprobacion: 6,
  decimales: 2
};

export const CONDICIONES = [
  { valor: "aprobado", descripcion: "El alumno alcanza la nota de aprobacion." },
  { valor: "desaprobado", descripcion: "El alumno no alcanza la nota de aprobacion." }
];

export const CONDICIONES_VALIDAS = CONDICIONES.map((condicion) => condicion.valor);

/* Periodo academico. El anio lectivo es obligatorio (numero entero) y el
   cuatrimestre es opcional: 1, 2 o null (periodo anual). */
export const ANIO_MINIMO = 1990;
export const ANIO_MAXIMO = 2100;

export const CUATRIMESTRES = [1, 2];

export const OBSERVACIONES_MAX = 255;
export const PERIODO_MAX = 40;

export function esAnioLectivo(valor) {
  if (!/^\d+$/.test(String(valor ?? ""))) {
    return false;
  }

  const anio = Number(valor);
  return Number.isInteger(anio) && anio >= ANIO_MINIMO && anio <= ANIO_MAXIMO;
}

/* Devuelve 1, 2 o null (periodo anual). Devuelve null si el valor esta ausente
   y undefined si el valor es invalido. */
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

export function esFecha(valor) {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor));
}

/* Interpreta el valor cargado y lo clasifica. Devuelve:
     { tipoValor: "numerico", nota, concepto: null }
     { tipoValor: "conceptual", nota: null, concepto }
   o null si no es un valor valido de la escala. */
export function interpretarValor(valor) {
  if (typeof valor === "number") {
    if (Number.isFinite(valor) && valor >= ESCALA.minimo && valor <= ESCALA.maximo) {
      return { tipoValor: "numerico", nota: valor, concepto: null };
    }

    return null;
  }

  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  if (!texto) {
    return null;
  }

  const concepto = CONCEPTOS_VALIDOS.find((codigo) => codigo.toLowerCase() === texto.toLowerCase());

  if (concepto) {
    return { tipoValor: "conceptual", nota: null, concepto };
  }

  const normalizado = texto.replace(",", ".");

  if (/^\d+(\.\d{1,2})?$/.test(normalizado)) {
    const numero = Number(normalizado);

    if (numero >= ESCALA.minimo && numero <= ESCALA.maximo) {
      return { tipoValor: "numerico", nota: numero, concepto: null };
    }
  }

  return null;
}

export function condicionDe(nota) {
  if (nota === null || nota === undefined) {
    return null;
  }

  return nota >= ESCALA.aprobacion ? "aprobado" : "desaprobado";
}

/* Comparaciones de texto sin tildes ni mayusculas. */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* Ordenes permitidos para listar. `numerico` indica como comparar el campo. */
export const ORDENES_CALIFICACIONES = {
  fecha: { campo: "fecha", sentido: 1 },
  fecha_desc: { campo: "fecha", sentido: -1 },
  alumno: { campo: "alumnoSort", sentido: 1 },
  alumno_desc: { campo: "alumnoSort", sentido: -1 },
  materia: { campo: "materiaSort", sentido: 1 },
  materia_desc: { campo: "materiaSort", sentido: -1 },
  nota: { campo: "notaSort", sentido: 1, numerico: true },
  nota_desc: { campo: "notaSort", sentido: -1, numerico: true },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 }
};
