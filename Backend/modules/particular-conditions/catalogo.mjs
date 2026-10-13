/* Catalogo y validaciones del modulo de condiciones particulares.

   Una condicion particular es la informacion que la institucion registra sobre un
   alumno (salud, accesibilidad, adaptaciones, situaciones familiares, etc.) y que
   puede permanecer activa o finalizarse con el tiempo. Se conserva el historial
   completo de cada condicion y el de las condiciones de un alumno.

   Este archivo es el UNICO lugar donde viven los estados y los limites: el
   servicio rechaza cualquier valor fuera de la lista y expone el catalogo por
   GET /api/v1/particular-conditions/catalogos. Agregar un estado nuevo (por
   ejemplo "suspendida") es agregar una fila aca, sin tocar el servicio. */

export const ESTADOS_CONDICION = [
  { valor: "activa", descripcion: "Condicion vigente sobre el alumno." },
  { valor: "finalizada", descripcion: "Condicion cerrada; se conserva para consulta historica." }
];

export const ESTADOS_VALIDOS = ESTADOS_CONDICION.map((estado) => estado.valor);

export const ESTADO_ACTIVA = "activa";
export const ESTADO_FINALIZADA = "finalizada";

export function descripcionDeEstado(estado) {
  return ESTADOS_CONDICION.find((item) => item.valor === estado)?.descripcion ?? null;
}

/* ---------------- Limites de texto ---------------------------------------- */

export const DESCRIPCION_MINIMA = 5;
export const DESCRIPCION_MAXIMA = 1000;

/* ---------------- Fechas -------------------------------------------------- */

/* Las condiciones se fechan con dia de calendario (AAAA-MM-DD): la institucion
   consulta por dia y por rango. */
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

/* Comparaciones de texto sin tildes ni mayusculas (filtros y deteccion de
   duplicados de condiciones activas). */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ---------------- Ordenes permitidos para listar -------------------------- */

export const ORDENES_CONDICIONES = {
  fecha_inicio: { campo: "fechaInicio", sentido: 1 },
  fecha_inicio_desc: { campo: "fechaInicio", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 },
  actualizado: { campo: "actualizadoEn", sentido: 1 },
  actualizado_desc: { campo: "actualizadoEn", sentido: -1 },
  alumno: { campo: "alumnoSort", sentido: 1 },
  alumno_desc: { campo: "alumnoSort", sentido: -1 },
  estado: { campo: "estado", sentido: 1 },
  estado_desc: { campo: "estado", sentido: -1 }
};
