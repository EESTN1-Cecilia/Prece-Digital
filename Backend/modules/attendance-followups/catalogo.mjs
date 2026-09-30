/* Catalogo y validaciones del seguimiento de inasistencias.

   Un seguimiento es la intervencion que la institucion realizo ante una
   inasistencia de un alumno: cuando se hizo, de que tipo fue, quien la
   realizo o registro y que se observo.

   TIPOS_ACCION es el UNICO lugar donde viven los tipos de accion: el servicio
   rechaza cualquier valor fuera de la lista y expone el catalogo por
   GET /api/v1/seguimientos-inasistencia/catalogos. Agregar un tipo nuevo es
   agregar una fila aca, sin tocar el servicio ni el repositorio. */

export const TIPOS_ACCION = [
  { valor: "llamado_familia", descripcion: "Llamado telefonico a la familia del alumno" },
  { valor: "comunicacion_familia", descripcion: "Comunicacion con padre, madre o tutor" },
  { valor: "notificacion", descripcion: "Notificacion enviada a la familia o a la institucion" },
  { valor: "comunicacion_cuaderno", descripcion: "Comunicacion registrada mediante el cuaderno del alumno" },
  { valor: "entrevista", descripcion: "Entrevista o reunion con la familia, el alumno u otro responsable" },
  { valor: "otra_medida", descripcion: "Otra medida tomada por la institucion" }
];

export const TIPOS_VALIDOS = TIPOS_ACCION.map((tipo) => tipo.valor);

export function descripcionDeTipo(tipo) {
  return TIPOS_ACCION.find((item) => item.valor === tipo)?.descripcion ?? null;
}

/* ---------------- Fechas -------------------------------------------------- */

/* Las acciones se registran con fecha de calendario (AAAA-MM-DD), no con
   marca de tiempo: la institucion consulta por dia y por rango. */
const FECHA_CORTA = /^\d{4}-\d{2}-\d{2}$/;

export function esFecha(valor) {
  if (!FECHA_CORTA.test(String(valor ?? ""))) {
    return false;
  }

  const [anio, mes, dia] = String(valor).split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
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

/* ---------------- Observaciones -------------------------------------------- */

export const OBSERVACIONES_MIN = 5;
export const OBSERVACIONES_MAX = 500;

/* ---------------- Ordenes permitidos para listar --------------------------- */

export const ORDENES_SEGUIMIENTOS = {
  fecha: { campo: "fecha", sentido: 1 },
  fecha_desc: { campo: "fecha", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 },
  alumno: { campo: "alumnoSort", sentido: 1 },
  alumno_desc: { campo: "alumnoSort", sentido: -1 },
  tipo: { campo: "tipo", sentido: 1 },
  tipo_desc: { campo: "tipo", sentido: -1 }
};

/* El listado de alumnos con seguimiento agrupa, asi que se ordena por alumno o
   por cantidad de intervenciones, no por fecha de accion. */
export const ORDENES_ALUMNOS_SEGUIMIENTO = {
  alumno: ORDENES_SEGUIMIENTOS.alumno,
  alumno_desc: ORDENES_SEGUIMIENTOS.alumno_desc,
  total: { campo: "total", sentido: 1, porEntero: true },
  total_desc: { campo: "total", sentido: -1, porEntero: true }
};
