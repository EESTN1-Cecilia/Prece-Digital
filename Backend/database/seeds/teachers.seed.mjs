import teachersRepository from "../../modules/teachers/teachers.repository.mjs";

/* Seed de gestion de docentes.

   Los ids tch-1..tch-3 coinciden a proposito con las referencias de docentes del
   seed academico (academic.seed.mjs: MATERIAS/DOCENTES_RELACIONES usan esos ids),
   con los mismos apellidos y nombres, para que jefatura y schedules resuelvan el
   docente tanto desde este modulo como desde la referencia academica.

   Las asignaciones referencian cursos, divisiones y materias que ya existen en el
   seed academico (cur-*, div-*, mat/lng/his/prog). Correr despues de seedAcademic()
   (ver database/seeds/index.mjs). El responsable del seed de auth es usr_8
   ("Secretaría"). */

const DOCENTES = [
  {
    id: "tch-1",
    apellido: "Villatoro",
    nombre: "María",
    tipoDocumento: "dni",
    documento: "20000001",
    email: "maria.villatoro@prece.local",
    telefono: "11 5555-0001",
    titulo: "Profesora de Matemática",
    especialidades: ["Matemática"],
    estado: "activo"
  },
  {
    id: "tch-2",
    apellido: "Sosa",
    nombre: "Humberto",
    tipoDocumento: "dni",
    documento: "20000002",
    email: "humberto.sosa@prece.local",
    telefono: null,
    titulo: "Profesor de Historia",
    especialidades: ["Historia", "Ciencias Sociales"],
    estado: "activo"
  },
  {
    id: "tch-3",
    apellido: "Ríos",
    nombre: "Lucía",
    tipoDocumento: "dni",
    documento: "20000003",
    email: "lucia.rios@prece.local",
    telefono: "11 5555-0003",
    titulo: "Técnica en Programación",
    especialidades: ["Programación", "Bases de Datos"],
    estado: "activo"
  },
  {
    id: "tch-4",
    apellido: "Fernández",
    nombre: "Diego",
    tipoDocumento: "dni",
    documento: "20000004",
    email: "diego.fernandez@prece.local",
    telefono: null,
    titulo: "Profesor de Lengua",
    especialidades: ["Lengua", "Literatura"],
    estado: "activo"
  },
  {
    id: "tch-5",
    apellido: "Gómez",
    nombre: "Ana",
    tipoDocumento: "dni",
    documento: "20000005",
    email: "ana.gomez@prece.local",
    telefono: null,
    titulo: "Profesora de Educación Física",
    especialidades: ["Ed. Física"],
    estado: "inactivo",
    fechaBaja: "2025-12-20T00:00:00.000Z"
  }
];

const ASIGNACIONES_MATERIA = [
  { id: "tcm-1", docenteId: "tch-1", materiaId: "mat", cursoId: "cur-1", divisionId: null, anio: 2026, cuatrimestre: null, horasSemanales: 6 },
  { id: "tcm-2", docenteId: "tch-2", materiaId: "his", cursoId: "cur-5", divisionId: "div-8", anio: 2026, cuatrimestre: null, horasSemanales: 4 },
  { id: "tcm-3", docenteId: "tch-3", materiaId: "prog", cursoId: "cur-6", divisionId: null, anio: 2026, cuatrimestre: null, horasSemanales: 8 },
  { id: "tcm-4", docenteId: "tch-4", materiaId: "lng", cursoId: "cur-1", divisionId: null, anio: 2026, cuatrimestre: null, horasSemanales: 5 },
  { id: "tcm-5", docenteId: "tch-1", materiaId: "mat", cursoId: "cur-5", divisionId: null, anio: 2025, cuatrimestre: null, horasSemanales: 6, estado: "inactivo", fechaBaja: "2025-12-20T00:00:00.000Z" }
];

const ASIGNACIONES_CURSO = [
  { id: "tcc-1", docenteId: "tch-1", cursoId: "cur-1", divisionId: null, rol: "titular", anio: 2026, cuatrimestre: null },
  { id: "tcc-2", docenteId: "tch-2", cursoId: "cur-5", divisionId: "div-8", rol: "titular", anio: 2026, cuatrimestre: null },
  { id: "tcc-3", docenteId: "tch-3", cursoId: "cur-6", divisionId: null, rol: "suplente", anio: 2026, cuatrimestre: null }
];

const RESPONSABLE = "usr_8";

export function seedTeachers() {
  if (teachersRepository.listDocentes().length > 0) {
    return;
  }

  for (const docente of DOCENTES) {
    teachersRepository.createDocente({
      ...docente,
      escuelaId: "esc-1",
      creadoPor: RESPONSABLE
    });
  }

  for (const asignacion of ASIGNACIONES_MATERIA) {
    teachersRepository.createAsignacionMateria({
      ...asignacion,
      escuelaId: "esc-1",
      creadoPor: RESPONSABLE
    });
  }

  for (const asignacion of ASIGNACIONES_CURSO) {
    teachersRepository.createAsignacionCurso({
      ...asignacion,
      escuelaId: "esc-1",
      creadoPor: RESPONSABLE
    });
  }
}
