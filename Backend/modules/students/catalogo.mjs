/* Catalogo academico de la gestion de alumnos.
   Refleja la estructura real de la escuela cargada en database/schema.sql (seed de
   anios_divisiones: EEST N1 Montegrande, doble turno, 7 anios). Se usa para validar
   que el curso y la division existan y para derivar turno y orientacion sin
   depender de que el cliente los envie.

   Estructura de anios_divisiones (curso, division, turno_aula, orientacion):
     - Ciclo Basico (1 a 3): divisiones 1, 2, 3, 4 y 6, sin orientacion.
     - Tecnico en Informatica (4 a 7): 4°1, 4°2, 5°1, 5°2, 6°1 y 7°1.
     - Tecnico en Programacion (4 a 7): 4°3, 4°4, 5°3, 5°4, 6°3 y 7°2. */

export const CURSOS_VALIDOS = [1, 2, 3, 4, 5, 6, 7];
export const CONDICIONES_VALIDAS = ["regular", "irregular"];
export const ESTADOS_VALIDOS = ["activo", "inactivo", "todos"];
export const TURNOS_VALIDOS = ["mañana", "tarde"];
export const ORIENTACION_INFORMATICA = "Técnico en Informática";
export const ORIENTACION_PROGRAMACION = "Técnico en Programación";

export const DNI_RE = /^\d{7,9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TELEFONO_RE = /^[0-9()+\-.\s]{6,20}$/;

/* Ordenamientos permitidos para listados y busquedas. El backend solo acepta
   estas claves; nunca interpola texto libre en una consulta. */
export const ORDENES_VALIDOS = {
  apellido: "apellido, nombre",
  apellido_desc: "apellido DESC, nombre DESC",
  nombre: "nombre, apellido",
  nombre_desc: "nombre DESC, apellido DESC",
  dni: "dni",
  dni_desc: "dni DESC",
  curso: "curso, division, apellido",
  curso_desc: "curso DESC, division DESC, apellido DESC"
};

/* [anio, division, turno_aula, orientacion] */
const DIVISIONES = [
  [1, "1", "mañana", null],
  [1, "2", "mañana", null],
  [1, "3", "tarde", null],
  [1, "4", "tarde", null],
  [1, "6", "mañana", null],
  [2, "1", "mañana", null],
  [2, "2", "mañana", null],
  [2, "3", "tarde", null],
  [2, "4", "tarde", null],
  [2, "6", "mañana", null],
  [3, "1", "mañana", null],
  [3, "2", "mañana", null],
  [3, "3", "tarde", null],
  [3, "4", "tarde", null],
  [3, "6", "mañana", null],
  [4, "1", "mañana", ORIENTACION_INFORMATICA],
  [4, "2", "tarde", ORIENTACION_INFORMATICA],
  [4, "3", "mañana", ORIENTACION_PROGRAMACION],
  [4, "4", "tarde", ORIENTACION_PROGRAMACION],
  [5, "1", "mañana", ORIENTACION_INFORMATICA],
  [5, "2", "tarde", ORIENTACION_INFORMATICA],
  [5, "3", "mañana", ORIENTACION_PROGRAMACION],
  [5, "4", "tarde", ORIENTACION_PROGRAMACION],
  [6, "1", "mañana", ORIENTACION_INFORMATICA],
  [6, "3", "mañana", ORIENTACION_PROGRAMACION],
  [7, "1", "mañana", ORIENTACION_INFORMATICA],
  [7, "2", "tarde", ORIENTACION_PROGRAMACION]
];

export function buscarDivision(anio, division) {
  const división = String(division).trim();
  const entrada = DIVISIONES.find(([a, d]) => a === anio && d === división);

  return entrada ? { turno: entrada[2], orientacion: entrada[3] } : null;
}