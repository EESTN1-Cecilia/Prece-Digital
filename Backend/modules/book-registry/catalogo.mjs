/* Catalogo y validaciones del modulo de Libro Matriz digital.

   El Libro Matriz digitaliza el registro que la institucion lleva por alumno:
   numero de libro, numero de folio, fecha de registro y los datos adicionales
   definidos administrativamente (matricula, plan, resolucion, etc.). Se conserva
   el historial de cada modificacion.

   Este archivo es el UNICO lugar donde viven los estados y los limites: el
   servicio rechaza cualquier valor fuera de las reglas y expone el catalogo por
   GET /api/v1/book-registry/catalogos. */

export const ESTADOS_REGISTRO = [
  { valor: "activo", descripcion: "Registro vigente del Libro Matriz." },
  { valor: "archivado", descripcion: "Registro dado de baja logica; se conserva para consulta administrativa." }
];

export const ESTADOS_VALIDOS = ESTADOS_REGISTRO.map((estado) => estado.valor);

export const ESTADO_ACTIVO = "activo";
export const ESTADO_ARCHIVADO = "archivado";

export function descripcionDeEstado(estado) {
  return ESTADOS_REGISTRO.find((item) => item.valor === estado)?.descripcion ?? null;
}

/* ---------------- Limites y formatos -------------------------------------- */

export const NUMERO_LIBRO_MAXIMO = 30;
export const NUMERO_FOLIO_MAXIMO = 30;

/* Numero de libro y de folio: letras, numeros, espacios, puntos, barras y
   guiones (por ejemplo "L-012", "12 bis", "Folio 3/4"). */
export const PATRON_NUMERO = /^[A-Za-z0-9][A-Za-z0-9 ./_-]*$/;

export const DATOS_ADICIONALES_MAXIMOS = 20;
export const CLAVE_ADICIONAL_MAXIMA = 40;
export const VALOR_ADICIONAL_MAXIMO = 500;

/* ---------------- Fechas -------------------------------------------------- */

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
   duplicados de libro y folio). */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ---------------- Ordenes permitidos para listar -------------------------- */

export const ORDENES_REGISTROS = {
  libro: { campo: "numeroLibroSort", sentido: 1 },
  libro_desc: { campo: "numeroLibroSort", sentido: -1 },
  folio: { campo: "numeroFolioSort", sentido: 1 },
  folio_desc: { campo: "numeroFolioSort", sentido: -1 },
  fecha_registro: { campo: "fechaRegistro", sentido: 1 },
  fecha_registro_desc: { campo: "fechaRegistro", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 },
  actualizado: { campo: "actualizadoEn", sentido: 1 },
  actualizado_desc: { campo: "actualizadoEn", sentido: -1 },
  alumno: { campo: "alumnoSort", sentido: 1 },
  alumno_desc: { campo: "alumnoSort", sentido: -1 }
};
