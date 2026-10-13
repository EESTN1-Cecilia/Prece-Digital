/* Catalogo y validaciones del modulo de gestion de docentes.

   El modulo registra docentes (datos personales, titulo y especialidades) y sus
   asociaciones con la estructura academica:
   - Asociacion docente <-> materia: que materias dicta y en que curso/division y
     periodo.
   - Asociacion docente <-> curso/division: con que cursos o divisiones queda
     vinculado (rol de asignacion) y en que periodo.

   Los estados, tipos de documento, roles de asignacion y las reglas de periodo
   viven aca, en un unico lugar; el servicio rechaza cualquier valor fuera del
   catalogo y GET /api/v1/teachers/catalogos lo expone. */

/* ---------------- Estados ------------------------------------------------ */

export const ESTADOS_DOCENTE = [
  { valor: "activo", descripcion: "Docente en actividad, puede recibir asignaciones" },
  { valor: "inactivo", descripcion: "Docente dado de baja logica, no recibe nuevas asignaciones" }
];

export const ESTADOS_VALIDOS = ESTADOS_DOCENTE.map((estado) => estado.valor);
export const ESTADO_POR_DEFECTO = "activo";

export const ESTADOS_ASIGNACION = [
  { valor: "activo", descripcion: "Asignacion vigente" },
  { valor: "inactivo", descripcion: "Asignacion dada de baja logica" }
];

export const ESTADOS_ASIGNACION_VALIDOS = ESTADOS_ASIGNACION.map((estado) => estado.valor);
export const ESTADO_ASIGNACION_POR_DEFECTO = "activo";

/* ---------------- Tipos de documento ------------------------------------- */

export const TIPOS_DOCUMENTO = [
  { valor: "dni", descripcion: "Documento Nacional de Identidad" },
  { valor: "lc", descripcion: "Libreta Civica" },
  { valor: "le", descripcion: "Libreta de Enrolamiento" },
  { valor: "ci", descripcion: "Cedula de Identidad" },
  { valor: "pasaporte", descripcion: "Pasaporte" }
];

export const TIPOS_DOCUMENTO_VALIDOS = TIPOS_DOCUMENTO.map((tipo) => tipo.valor);
export const TIPO_DOCUMENTO_POR_DEFECTO = "dni";

/* ---------------- Roles de asignacion ------------------------------------ */

export const ROLES_ASIGNACION = [
  { valor: "titular", descripcion: "Docente a cargo de la materia o division" },
  { valor: "suplente", descripcion: "Reemplaza al titular" },
  { valor: "ayudante", descripcion: "Colabora con el titular" }
];

export const ROLES_ASIGNACION_VALIDOS = ROLES_ASIGNACION.map((rol) => rol.valor);
export const ROL_ASIGNACION_POR_DEFECTO = "titular";

/* ---------------- Periodo academico -------------------------------------- */

export const ANIO_MINIMO = 1990;
export const ANIO_MAXIMO = 2100;
export const CUATRIMESTRES = [1, 2];

export function esEntero(valor) {
  return /^\d+$/.test(String(valor ?? ""));
}

export function esAnioLectivo(valor) {
  if (!/^\d+$/.test(String(valor ?? ""))) {
    return false;
  }

  const anio = Number(valor);
  return Number.isInteger(anio) && anio >= ANIO_MINIMO && anio <= ANIO_MAXIMO;
}

/* Devuelve 1, 2 o null (periodo anual). Devuelve undefined si el valor es
   invalido. */
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

/* ---------------- Texto --------------------------------------------------- */

/* Comparaciones de texto sin tildes ni mayusculas. */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ---------------- Validaciones de datos del docente ---------------------- */

export const DOCUMENTO_RE = /^[0-9]{6,12}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TELEFONO_RE = /^[0-9()+\-.\s]{6,20}$/;

export const LIMITES = {
  nombre: 100,
  apellido: 100,
  titulo: 150,
  especialidad: 100,
  especialidades: 20,
  observaciones: 500,
  horasSemanales: 60
};

export function esDocumento(valor) {
  return typeof valor === "string" && DOCUMENTO_RE.test(valor.trim());
}

export function esEmail(valor) {
  return typeof valor === "string" && EMAIL_RE.test(valor.trim());
}

export function esTelefono(valor) {
  return typeof valor === "string" && TELEFONO_RE.test(valor.trim());
}

export const ORDENES_DOCENTES = {
  apellido: { campo: "apellidoSort", sentido: 1 },
  apellido_desc: { campo: "apellidoSort", sentido: -1 },
  nombre: { campo: "nombreSort", sentido: 1 },
  nombre_desc: { campo: "nombreSort", sentido: -1 },
  estado: { campo: "estado", sentido: 1 },
  estado_desc: { campo: "estado", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 }
};

export const ORDENES_ASIGNACIONES = {
  materia: { campo: "materiaSort", sentido: 1 },
  materia_desc: { campo: "materiaSort", sentido: -1 },
  periodo: { campo: "periodoSort", sentido: 1 },
  periodo_desc: { campo: "periodoSort", sentido: -1 },
  creado: { campo: "creadoEn", sentido: 1 },
  creado_desc: { campo: "creadoEn", sentido: -1 }
};
