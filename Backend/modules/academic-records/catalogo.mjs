/* Catalogo y validaciones de la situacion academica.

   Modelo segun la RQ "Situacion academica":
   - Cada registro asocia a un alumno con una materia dentro de un periodo
     (anio lectivo + cuatrimestre opcional).
   - El tipo de situacion describe la naturaleza del registro: cursada,
     pendiente, recursada, intensificada u otra definida por la institucion
     (ej.: equivalencia).
   - El estado de la materia describe la situacion actual de esa materia para
     el alumno (en curso, regular, aprobada, desaprobada o libre).
   - Las transiciones entre estados se definen de forma centralizada para
     evitar inconsistencias en el historial academico. */

export const TIPOS_SITUACION = [
  { valor: "cursada", descripcion: "Materia que el alumno cursa en el periodo actual" },
  { valor: "pendiente", descripcion: "Materia pendiente de aprobacion, conserva el periodo en que quedo pendiente" },
  { valor: "recursada", descripcion: "Materia que se vuelve a cursar, conserva el historial de la cursada anterior" },
  { valor: "intensificada", descripcion: "Materia intensificada, identificada y asociada al periodo correspondiente" },
  { valor: "equivalencia", descripcion: "Materia convalidada por equivalencia definida por la institucion" }
];

export const ESTADOS_MATERIA = [
  { valor: "en_curso", descripcion: "El alumno se encuentra cursando la materia" },
  { valor: "regular", descripcion: "El alumno quedo regular y puede rendir en mesas de examen" },
  { valor: "aprobada", descripcion: "La materia fue aprobada" },
  { valor: "desaprobada", descripcion: "La materia fue desaprobada" },
  { valor: "libre", descripcion: "El alumno quedo libre en la materia" }
];

export const TIPOS_VALIDOS = TIPOS_SITUACION.map((tipo) => tipo.valor);
export const ESTADOS_VALIDOS = ESTADOS_MATERIA.map((estado) => estado.valor);

/* Transiciones de estado permitidas. No incluye la homotransicion (cambiar a
   un estado identico no es una transicion). La clave "aprobada" no admite
   transiciones: es un estado terminal. */
export const TRANSICIONES = {
  en_curso: ["regular", "aprobada", "desaprobada", "libre"],
  regular: ["aprobada", "desaprobada", "libre"],
  desaprobada: ["en_curso"],
  libre: ["en_curso"],
  aprobada: []
};

export function transicionPermitida(estadoAnterior, estadoNuevo) {
  return (TRANSICIONES[estadoAnterior] ?? []).includes(estadoNuevo);
}

export const TIPO_POR_DEFECTO = "cursada";
export const ESTADO_POR_DEFECTO = "en_curso";

/* Periodo academico. El anio lectivo es obligatorio (numero entero) y el
   cuatrimestre es opcional: 1, 2 o null (periodo anual). */
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

/* Devuelve 1, 2 o null (periodo anual). Devuelve null si el valor esta
   ausente y undefined si el valor es invalido. */
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

export function esEntero(valor) {
  return /^\d+$/.test(String(valor ?? ""));
}

/* Comparaciones de texto sin tildes ni mayusculas. */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const OBSERVACIONES_MAX = 500;

/* Ordenes permitidos para listar. */
export const ORDENES_SITUACIONES = {
  anio: { campo: "anio", sentido: 1 },
  anio_desc: { campo: "anio", sentido: -1 },
  materia: { campo: "materiaSort", sentido: 1 },
  materia_desc: { campo: "materiaSort", sentido: -1 },
  estado: { campo: "estado", sentido: 1 },
  estado_desc: { campo: "estado", sentido: -1 },
  actualizado: { campo: "actualizadoEn", sentido: 1 },
  actualizado_desc: { campo: "actualizadoEn", sentido: -1 }
};