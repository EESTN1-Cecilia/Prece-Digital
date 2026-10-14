/* Catalogo y validaciones de la estructura academica.

   Modelo segun la RQ "Cursos y divisiones":
   - Ciclo: primer ciclo (1ro-3ro, sin orientacion) o segundo ciclo (4to-7mo,
     con orientacion).
   - Orientacion: solamente en segundo ciclo.
   - Curso: anio + turno (+ orientacion cuando corresponde), pertenece a un
     unico ciclo y a un unico turno.
   - Division: pertenece a un unico curso y hereda el turno de ese curso. */

export const ESTADOS_VALIDOS = ["activo", "inactivo", "cerrado"];

/* Turnos permitidos. Se aceptan variantes con tilde o en minusculas y se
   guardan en mayusculas canonico (MANANA/TARDE). */
export const TURNOS = ["MANANA", "TARDE"];
export const TURNOS_ACEPTADOS = ["MANANA", "MAÑANA", "mañana", "TARDE", "tarde"];

export function normalizarTurno(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const normalizado = valor.trim().toUpperCase().replace("Ñ", "N");

  return TURNOS.includes(normalizado) ? normalizado : null;
}

export const TIPOS_CICLO = ["primer", "segundo"];

/* El tipo de ciclo que corresponde a cada anio/nivel. */
export function tipoCicloDeAnio(anio) {
  if (anio >= 1 && anio <= 3) {
    return "primer";
  }

  if (anio >= 4 && anio <= 7) {
    return "segundo";
  }

  return null;
}

export const ANIOS_VALIDOS = [1, 2, 3, 4, 5, 6, 7];

export const NOMBRE_ANIO = {
  1: "1ro",
  2: "2do",
  3: "3ro",
  4: "4to",
  5: "5to",
  6: "6to",
  7: "7mo"
};

export const CICLO_ANIOS = {
  primer: [1, 2, 3],
  segundo: [4, 5, 6, 7]
};

export function esEntero(valor) {
  return /^\d+$/.test(String(valor ?? ""));
}

/* Claves de unicidad / comparaciones sin tildes ni mayusculas. */
export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function esNombreDivision(valor) {
  return typeof valor === "string" && valor.trim().length > 0 && valor.trim().length <= 5;
}

/* Ordenes permitidos para listar. */
export const ORDENES_CURSOS = {
  anio: { campo: "anio", sentido: 1 },
  anio_desc: { campo: "anio", sentido: -1 },
  turno: { campo: "turno", sentido: 1 },
  turno_desc: { campo: "turno", sentido: -1 }
};

export const ORDENES_DIVISIONES = {
  nombre: { campo: "nombre", sentido: 1 },
  nombre_desc: { campo: "nombre", sentido: -1 },
  estado: { campo: "estadoSort", sentido: 1 },
  estado_desc: { campo: "estadoSort", sentido: -1 }
};

export const ORDENES_CICLOS = {
  nombre: { campo: "nombre", sentido: 1 },
  nombre_desc: { campo: "nombre", sentido: -1 }
};

export const ORDENES_ORIENTACIONES = {
  nombre: { campo: "nombre", sentido: 1 },
  nombre_desc: { campo: "nombre", sentido: -1 }
};