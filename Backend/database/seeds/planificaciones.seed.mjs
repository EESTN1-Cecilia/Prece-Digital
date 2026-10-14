import planificacionesRepository from "../../modules/planificaciones/planificaciones.repository.mjs";

/* Seed de planificaciones docentes.

   Cada planificacion cae dentro de una asignacion de materia del seed de
   docentes (teachers.seed.mjs): tcm-1 (Villatoro, Matematica, 1ro manana, todas
   las divisiones), tcm-2 (Sosa, Historia, 4to 1ra), tcm-3 (Rios, Programacion,
   4to 3ra) y tcm-4 (Fernandez, Lengua, 1ro manana). Correr despues de
   seedTeachers() (ver database/seeds/index.mjs).

   tch-1 esta ligado a usr_3 ("docente@prece.local"): ese usuario ve solo las
   planificaciones pla-1 a pla-3. Los estados cubren todo el circuito para
   probar las acciones disponibles. usr_6 es "jefearea@prece.local". */

const CONTENIDO_BASE = {
  fundamentacion: "La materia aporta herramientas para el razonamiento logico y la resolucion de problemas.",
  objetivos: "Que los estudiantes resuelvan situaciones problematicas aplicando los contenidos de la unidad.",
  contenidos: "Unidad 1: Numeros naturales y enteros.\nUnidad 2: Operaciones y propiedades.\nUnidad 3: Ecuaciones de primer grado.",
  evaluacion: "Evaluaciones escritas por unidad, trabajos practicos y seguimiento en clase."
};

const PLANIFICACIONES = [
  {
    id: "pla-1",
    docenteId: "tch-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-1",
    asignacionMateriaId: "tcm-1",
    anioLectivo: 2026,
    cuatrimestre: null,
    contenido: CONTENIDO_BASE,
    historia: [
      { estado: "borrador", fecha: "2026-02-20T13:00:00.000Z", usuarioId: "usr_3" },
      { estado: "presentada", fecha: "2026-03-02T13:00:00.000Z", usuarioId: "usr_3" },
      { estado: "aprobada", fecha: "2026-03-10T15:00:00.000Z", usuarioId: "usr_6" }
    ]
  },
  {
    id: "pla-2",
    docenteId: "tch-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-2",
    asignacionMateriaId: "tcm-1",
    anioLectivo: 2026,
    cuatrimestre: null,
    contenido: { ...CONTENIDO_BASE, bibliografia: "Manual de Matematica 1, editorial escolar." },
    historia: [
      { estado: "borrador", fecha: "2026-02-21T13:00:00.000Z", usuarioId: "usr_3" },
      { estado: "presentada", fecha: "2026-03-03T13:00:00.000Z", usuarioId: "usr_3" },
      {
        estado: "observada",
        fecha: "2026-03-11T15:00:00.000Z",
        usuarioId: "usr_6",
        motivo: "Falta detallar el cronograma y los criterios de evaluacion."
      }
    ]
  },
  {
    id: "pla-3",
    docenteId: "tch-1",
    materiaId: "mat",
    cursoId: "cur-1",
    divisionId: "div-3",
    asignacionMateriaId: "tcm-1",
    anioLectivo: 2026,
    cuatrimestre: null,
    contenido: { fundamentacion: CONTENIDO_BASE.fundamentacion },
    historia: [{ estado: "borrador", fecha: "2026-03-15T13:00:00.000Z", usuarioId: "usr_3" }]
  },
  {
    id: "pla-4",
    docenteId: "tch-2",
    materiaId: "his",
    cursoId: "cur-5",
    divisionId: "div-8",
    asignacionMateriaId: "tcm-2",
    anioLectivo: 2026,
    cuatrimestre: null,
    contenido: {
      fundamentacion: "La historia permite comprender los procesos sociales que explican el presente.",
      contenidos: "Unidad 1: La Revolucion de Mayo.\nUnidad 2: Las guerras de independencia."
    },
    historia: [
      { estado: "borrador", fecha: "2026-02-25T13:00:00.000Z", usuarioId: "usr_1" },
      { estado: "presentada", fecha: "2026-03-05T13:00:00.000Z", usuarioId: "usr_1" }
    ]
  },
  {
    id: "pla-5",
    docenteId: "tch-3",
    materiaId: "prog",
    cursoId: "cur-6",
    divisionId: "div-10",
    asignacionMateriaId: "tcm-3",
    anioLectivo: 2026,
    cuatrimestre: 1,
    contenido: {
      objetivos: "Desarrollar algoritmos simples y traducirlos a un lenguaje de programacion.",
      contenidos: "Unidad 1: Algoritmos.\nUnidad 2: Estructuras de control."
    },
    historia: [
      { estado: "borrador", fecha: "2026-02-26T13:00:00.000Z", usuarioId: "usr_1" },
      { estado: "presentada", fecha: "2026-03-04T13:00:00.000Z", usuarioId: "usr_1" },
      { estado: "en_revision", fecha: "2026-03-12T15:00:00.000Z", usuarioId: "usr_6" }
    ]
  },
  {
    id: "pla-6",
    docenteId: "tch-4",
    materiaId: "lng",
    cursoId: "cur-1",
    divisionId: "div-1",
    asignacionMateriaId: "tcm-4",
    anioLectivo: 2026,
    cuatrimestre: null,
    contenido: { contenidos: "Unidad 1: Comprension lectora." },
    historia: [
      { estado: "borrador", fecha: "2026-02-27T13:00:00.000Z", usuarioId: "usr_1" },
      { estado: "presentada", fecha: "2026-03-06T13:00:00.000Z", usuarioId: "usr_1" },
      { estado: "rechazada", fecha: "2026-03-13T15:00:00.000Z", usuarioId: "usr_6", motivo: "La planificacion no corresponde al diseño curricular vigente." }
    ]
  }
];

const ESTADOS_DE_REVISION = ["en_revision", "observada", "corregida", "aprobada", "rechazada"];

export function seedPlanificaciones() {
  if (planificacionesRepository.listPlanificaciones().length > 0) {
    return;
  }

  for (const { historia, ...planificacion } of PLANIFICACIONES) {
    const ultimo = historia[historia.length - 1];
    const presentacion = [...historia].reverse().find((paso) => ["presentada", "corregida"].includes(paso.estado));
    const revision = ESTADOS_DE_REVISION.includes(ultimo.estado) ? ultimo : null;

    planificacionesRepository.createPlanificacion({
      ...planificacion,
      escuelaId: "esc-1",
      estado: ultimo.estado,
      fechaPresentacion: presentacion?.fecha ?? null,
      fechaRevision: revision?.fecha ?? null,
      revisadoPor: revision?.usuarioId ?? null,
      motivoRevision: revision?.motivo ?? null,
      historialEstados: historia.map((paso, indice) => ({
        estadoAnterior: indice === 0 ? null : historia[indice - 1].estado,
        estadoNuevo: paso.estado,
        fecha: paso.fecha,
        usuarioId: paso.usuarioId,
        motivo: paso.motivo ?? null
      })),
      creadoPor: historia[0].usuarioId,
      creadoEn: historia[0].fecha,
      actualizadoEn: ultimo.fecha
    });
  }
}
