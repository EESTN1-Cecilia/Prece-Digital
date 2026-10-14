/* Catalogo y validaciones del modulo de planificaciones docentes.

   Modelo segun la RQ "Planificaciones docentes":
   - Una planificacion pertenece a un docente, una materia, un curso, una
     division y un periodo (anio lectivo + cuatrimestre opcional; sin
     cuatrimestre es anual). El turno se hereda del curso.
   - Solo se puede planificar lo que el docente tiene asignado en el modulo de
     docentes (asignacion de materia activa que cubra el curso/division).
   - El contenido se organiza en secciones de texto (fundamentacion, objetivos,
     contenidos, ...). Las secciones viven aca y GET /api/v1/planificaciones/catalogos
     las expone, para que el frontend no las repita.
   - El estado sigue el circuito de presentacion y revision de Jefatura. Las
     transiciones validas viven aca: el frontend nunca decide si una
     transicion es posible, solo muestra las que informa el backend. */

/* ---------------- Estados ------------------------------------------------ */

export const ESTADOS = [
  { valor: "borrador", descripcion: "En elaboración por el docente" },
  { valor: "presentada", descripcion: "Presentada, pendiente de revisión" },
  { valor: "en_revision", descripcion: "En revisión por Jefatura" },
  { valor: "observada", descripcion: "Con observaciones a corregir por el docente" },
  { valor: "corregida", descripcion: "Corregida por el docente, pendiente de nueva revisión" },
  { valor: "aprobada", descripcion: "Aprobada por Jefatura" },
  { valor: "rechazada", descripcion: "Rechazada por Jefatura" }
];

export const ESTADOS_VALIDOS = ESTADOS.map((estado) => estado.valor);
export const ESTADO_INICIAL = "borrador";

/* Estados en los que el docente puede modificar la planificacion. */
export const ESTADOS_EDITABLES = ["borrador", "observada"];

/* Presentar: el docente entrega la planificacion para su revision. */
export const PRESENTACION = {
  borrador: "presentada",
  observada: "corregida"
};

/* Revision: transiciones que puede hacer Jefatura (permiso teaching-plans.manage). */
export const TRANSICIONES_REVISION = {
  presentada: ["en_revision", "observada", "aprobada", "rechazada"],
  corregida: ["en_revision", "observada", "aprobada", "rechazada"],
  en_revision: ["observada", "aprobada", "rechazada"]
};

/* Estados que exigen un motivo al registrarse. */
export const ESTADOS_CON_MOTIVO = ["observada", "rechazada"];

/* Estados que no cuentan para la unicidad: una planificacion rechazada no
   impide cargar otra para el mismo docente, materia, division y periodo. */
export const ESTADOS_SIN_UNICIDAD = ["rechazada"];

/* ---------------- Secciones de contenido --------------------------------- */

export const SECCIONES = [
  { valor: "fundamentacion", descripcion: "Fundamentación" },
  { valor: "objetivos", descripcion: "Objetivos" },
  { valor: "contenidos", descripcion: "Contenidos" },
  { valor: "estrategias", descripcion: "Estrategias y metodología" },
  { valor: "actividades", descripcion: "Actividades" },
  { valor: "recursos", descripcion: "Recursos" },
  { valor: "evaluacion", descripcion: "Evaluación y criterios" },
  { valor: "cronograma", descripcion: "Cronograma" },
  { valor: "bibliografia", descripcion: "Bibliografía" },
  { valor: "observaciones", descripcion: "Observaciones" }
];

export const SECCIONES_VALIDAS = SECCIONES.map((seccion) => seccion.valor);

/* ---------------- Turnos y periodo --------------------------------------- */

export const TURNOS = [
  { valor: "MANANA", descripcion: "Mañana" },
  { valor: "TARDE", descripcion: "Tarde" }
];

export const TURNOS_VALIDOS = TURNOS.map((turno) => turno.valor);

export const PERIODOS = [
  { valor: "anual", descripcion: "Anual" },
  { valor: "1", descripcion: "1er cuatrimestre" },
  { valor: "2", descripcion: "2do cuatrimestre" }
];

export const ANIO_MINIMO = 1990;
export const ANIO_MAXIMO = 2100;
export const CUATRIMESTRES = [1, 2];
export const ANIOS_CURSO = [1, 2, 3, 4, 5, 6, 7];

export const LIMITES = {
  seccion: 5000,
  motivo: 500,
  busqueda: 100
};

export function esAnioLectivo(valor) {
  if (!/^\d+$/.test(String(valor ?? ""))) {
    return false;
  }

  const anio = Number(valor);
  return Number.isInteger(anio) && anio >= ANIO_MINIMO && anio <= ANIO_MAXIMO;
}

/* Devuelve 1, 2 o null (periodo anual). Devuelve undefined si el valor es
   invalido. Acepta tambien "anual". */
export function normalizarCuatrimestre(valor) {
  if (valor === undefined || valor === null || valor === "" || valor === "anual") {
    return null;
  }

  const numero = Number(String(valor).trim());
  return CUATRIMESTRES.includes(numero) ? numero : undefined;
}

export function etiquetaPeriodo(anioLectivo, cuatrimestre) {
  return cuatrimestre ? `${anioLectivo} - ${cuatrimestre}° cuatrimestre` : `${anioLectivo} - Anual`;
}

export function descripcionTurno(turno) {
  return TURNOS.find((item) => item.valor === turno)?.descripcion ?? turno ?? null;
}

/* ---------------- Texto --------------------------------------------------- */

/* Comparaciones de texto sin tildes ni mayusculas. */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/* ---------------- Ordenes ------------------------------------------------- */

export const ORDENES = {
  id: { campo: "id", sentido: 1 },
  id_desc: { campo: "id", sentido: -1 },
  docente: { campo: "docenteSort", sentido: 1 },
  docente_desc: { campo: "docenteSort", sentido: -1 },
  materia: { campo: "materiaSort", sentido: 1 },
  materia_desc: { campo: "materiaSort", sentido: -1 },
  curso: { campo: "cursoSort", sentido: 1 },
  curso_desc: { campo: "cursoSort", sentido: -1 },
  estado: { campo: "estado", sentido: 1 },
  estado_desc: { campo: "estado", sentido: -1 },
  periodo: { campo: "periodoSort", sentido: 1 },
  periodo_desc: { campo: "periodoSort", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 },
  actualizado: { campo: "actualizadoEn", sentido: 1 },
  actualizado_desc: { campo: "actualizadoEn", sentido: -1 }
};

export const ORDEN_POR_DEFECTO = "actualizado_desc";
