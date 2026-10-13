/* Catalogo y validaciones del modulo de observaciones de alumnos.

   Una observacion es la novedad que un sector de la institucion registra sobre
   un alumno: cuando, de que tipo, quien la registro, en que sector y que se
   observo. Sobre una observacion se registran acciones de seguimiento.

   Este archivo es el UNICO lugar donde viven los tipos, estados y sectores: el
   servicio rechaza cualquier valor fuera de la lista y expone el catalogo por
   GET /api/v1/observations/catalogos. Agregar un valor nuevo es agregar una fila
   aca, sin tocar el servicio ni el repositorio. */

export const TIPOS_OBSERVACION = [
  { valor: "Académica", descripcion: "Desempeño, trayectoria y dificultades académicas." },
  { valor: "Convivencia", descripcion: "Situaciones de convivencia y comportamiento." },
  { valor: "Asistencia", descripcion: "Novedades vinculadas a la asistencia del alumno." },
  { valor: "Administrativa", descripcion: "Novedades administrativas del legajo." },
  { valor: "Pedagógica", descripcion: "Acompañamiento y estrategias pedagógicas." }
];

export const TIPOS_VALIDOS = TIPOS_OBSERVACION.map((tipo) => tipo.valor);

export function descripcionDeTipo(tipo) {
  return TIPOS_OBSERVACION.find((item) => item.valor === tipo)?.descripcion ?? null;
}

export const ESTADOS_OBSERVACION = [
  { valor: "Activa", descripcion: "Observacion vigente." },
  { valor: "Modificada", descripcion: "Observacion editada despues de su alta." },
  { valor: "Histórica", descripcion: "Observacion conservada solo a modo de historial." }
];

export const ESTADOS_VALIDOS = ESTADOS_OBSERVACION.map((estado) => estado.valor);

/* Sectores sugeridos para el formulario. El sector se guarda como texto libre
   (hasta SECTOR_MAXIMO caracteres): esta lista es una ayuda, no una restriccion,
   para no perder los sectores que ya usaba la institucion. */
export const SECTORES_SUGERIDOS = [
  "Preceptoría",
  "Coordinación",
  "Equipo de Orientación (EOE)",
  "Tutoría",
  "Biblioteca",
  "Secretaría",
  "Dirección"
];

export const ESTADOS_SEGUIMIENTO = [
  { valor: "pendiente", descripcion: "Accion registrada y aun no resuelta." },
  { valor: "realizada", descripcion: "Accion completada." },
  { valor: "cancelada", descripcion: "Accion dejada sin efecto." }
];

export const ESTADOS_SEGUIMIENTO_VALIDOS = ESTADOS_SEGUIMIENTO.map((estado) => estado.valor);

/* ---------------- Limites de texto ---------------------------------------- */

export const DESCRIPCION_MINIMA = 1;
export const DESCRIPCION_MAXIMA = 500;
export const SECTOR_MAXIMO = 80;
export const ACCION_MINIMA = 3;
export const ACCION_MAXIMA = 200;
export const SEGUIMIENTO_OBSERVACION_MINIMA = 1;
export const SEGUIMIENTO_OBSERVACION_MAXIMA = 500;

/* ---------------- Fechas -------------------------------------------------- */

/* Las observaciones y sus seguimientos se fechan con dia de calendario
   (AAAA-MM-DD), no con marca de tiempo: la institucion consulta por dia y rango. */
const FECHA_CORTA = /^\d{4}-\d{2}-\d{2}$/;

export function esFecha(valor) {
  if (!FECHA_CORTA.test(String(valor ?? ""))) {
    return false;
  }

  const [anio, mes, dia] = String(valor).split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

/* Normaliza a AAAA-MM-DD. Acepta el dia suelto o una marca de tiempo ISO (de la
   que toma el dia) y devuelve undefined ante cualquier otra cosa, incluidas las
   fechas que no existen en el calendario (por ejemplo 2026-02-30). */
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

/* Comparaciones de texto sin tildes ni mayusculas (orden de alumnos). */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ---------------- Ordenes permitidos para listar -------------------------- */

export const ORDENES_OBSERVACIONES = {
  fecha: { campo: "fecha", sentido: 1 },
  fecha_desc: { campo: "fecha", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 },
  alumno: { campo: "alumnoSort", sentido: 1 },
  alumno_desc: { campo: "alumnoSort", sentido: -1 },
  tipo: { campo: "tipo", sentido: 1 },
  tipo_desc: { campo: "tipo", sentido: -1 },
  estado: { campo: "estado", sentido: 1 },
  estado_desc: { campo: "estado", sentido: -1 }
};

export const ORDENES_SEGUIMIENTOS_OBSERVACION = {
  fecha: { campo: "fecha", sentido: 1 },
  fecha_desc: { campo: "fecha", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 },
  estado: { campo: "estado", sentido: 1 },
  estado_desc: { campo: "estado", sentido: -1 }
};
