/* Catalogo de areas y dependencias institucionales.

   Es la unica fuente de verdad de los sectores por los que se puede asignar
   personal. El frontend lo consume por GET /api/v1/catalogos/areas: no se
   escriben a mano departments que no esten en esta lista.

   Los valores provienen de la estructura de la institucion ya declarada en el
   sistema (los mismos sectores que usa el panel de Direccion para clasificar al
   personal). Cada area tiene un identificador estable: es lo que se guarda en
   el usuario, no el texto visible, para que un cambio de nombre no rompa los
   datos ya cargados. */

export const AREAS_INSTITUCIONALES = [
  {
    id: "direccion",
    nombre: "Dirección",
    descripcion: "Equipo Directivo de la institución."
  },
  {
    id: "secretaria",
    nombre: "Secretaría",
    descripcion: "Secretaría y administración académica."
  },
  {
    id: "preceptoria",
    nombre: "Preceptoría",
    descripcion: "Cuerpo de preceptores y seguimiento de estudiantes."
  },
  {
    id: "informatica",
    nombre: "Informática",
    descripcion: "Departamento de Informática y Programación."
  },
  {
    id: "electromecanica",
    nombre: "Electromecánica",
    descripcion: "Departamento de Electromecánica."
  },
  {
    id: "taller",
    nombre: "Taller",
    descripcion: "Área de talleres técnicos."
  },
  {
    id: "exactas",
    nombre: "Exactas",
    descripcion: "Ciencias Exactas y Naturales."
  },
  {
    id: "docencia",
    nombre: "Docencia",
    descripcion: "Cuerpo docente general."
  },
  {
    id: "servidor",
    nombre: "Server y Pañol",
    descripcion: "Pañol, servidor y soporte técnico."
  }
];

const AREAS_POR_ID = new Map(AREAS_INSTITUCIONALES.map((area) => [area.id, area]));

/* El area por defecto es el cuerpo docente: es el sector mas habitual del
   personal y no cambia el comportamiento de los registros ya cargados. */
export const AREA_DEFECTO = "docencia";

export function listarAreas() {
  return AREAS_INSTITUCIONALES.map((area) => ({ ...area }));
}

export function areaPorId(id) {
  return AREAS_POR_ID.get(id) ?? null;
}

export function esAreaValida(id) {
  return AREAS_POR_ID.has(id);
}

export function nombreArea(id) {
  return AREAS_POR_ID.get(id)?.nombre ?? null;
}
