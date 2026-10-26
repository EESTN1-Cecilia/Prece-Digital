import spacesRepository from "../../modules/spaces/spaces.repository.mjs";
import schedulesRepository from "../../modules/schedules/schedules.repository.mjs";

/* Infraestructura minima para el tablero de preceptoria: un edificio, aulas,
   laboratorio, taller y biblioteca, mas una grilla semanal de clases.

   Sin estos datos el estado de aulas en vivo quedaria siempre vacio. La grilla
   se repite de lunes a viernes con los docentes y materias del seed academico
   (tch-1..tch-4, mat/lng/his/prog). */

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

const AULAS = [
  { id: "spc-101", name: "Aula 101", code: "A101", type: "aula", capacity: 32, floor: 1, sector: "Ala A" },
  { id: "spc-102", name: "Aula 102", code: "A102", type: "aula", capacity: 30, floor: 1, sector: "Ala A" },
  { id: "spc-201", name: "Aula 201", code: "A201", type: "aula", capacity: 28, floor: 2, sector: "Ala B" },
  { id: "spc-202", name: "Aula 202", code: "A202", type: "aula", capacity: 28, floor: 2, sector: "Ala B" },
  { id: "spc-203", name: "Aula 203", code: "A203", type: "aula", capacity: 26, floor: 2, sector: "Ala B", status: "mantenimiento" },
  { id: "spc-lab", name: "Laboratorio de Informatica", code: "LAB", type: "laboratorio", capacity: 24, floor: 2, sector: "Ala C" },
  { id: "spc-taller", name: "Taller 1", code: "T1", type: "taller", capacity: 20, floor: 1, sector: "Ala C" },
  { id: "spc-biblio", name: "Biblioteca", code: "BIB", type: "biblioteca", capacity: 40, floor: 1, sector: "Ala D" }
];

/* [aula, desde, hasta, docente, materia, curso, division] */
const CLASES = [
  ["spc-101", "07:30", "09:00", "tch-1", "mat", "cur-1", "div-1"],
  ["spc-101", "09:10", "10:40", "tch-4", "lng", "cur-1", "div-1"],
  ["spc-101", "10:50", "12:20", "tch-2", "his", "cur-1", "div-1"],
  ["spc-102", "07:30", "09:00", "tch-4", "lng", "cur-5", "div-8"],
  ["spc-102", "09:10", "10:40", "tch-1", "mat", "cur-5", "div-8"],
  ["spc-102", "14:00", "15:30", "tch-3", "prog", "cur-6", "div-10"],
  ["spc-201", "08:00", "09:30", "tch-2", "his", "cur-6", "div-10"],
  ["spc-201", "09:40", "11:10", "tch-3", "prog", "cur-6", "div-10"],
  ["spc-202", "14:00", "15:30", "tch-1", "mat", "cur-1", "div-3"],
  ["spc-202", "15:40", "17:10", "tch-4", "lng", "cur-1", "div-3"],
  ["spc-lab", "10:50", "12:20", "tch-3", "prog", "cur-6", "div-10"],
  ["spc-lab", "13:00", "14:30", "tch-3", "prog", "cur-6", "div-10"],
  ["spc-taller", "08:00", "12:00", "tch-3", "prog", "cur-6", "div-10"],
  ["spc-biblio", "11:00", "12:00", "tch-4", "lng", "cur-5", "div-8"]
];

export function seedPreceptoria() {
  const escuelaId = "esc-1";

  if (spacesRepository.listSpaces({ schoolId: escuelaId }).length > 0) {
    return;
  }

  const edificio = spacesRepository.createBuilding({
    id: "bld-1",
    name: "Edificio Principal",
    code: "EP",
    floors: 2,
    schoolId: escuelaId
  });

  for (const aula of AULAS) {
    spacesRepository.createSpace({ ...aula, buildingId: edificio.id, schoolId: escuelaId });
  }

  schedulesRepository.createShift({
    id: "shf-manana",
    name: "Turno manana",
    code: "TM",
    startTime: "07:00",
    endTime: "13:00",
    schoolId: escuelaId
  });
  schedulesRepository.createShift({
    id: "shf-tarde",
    name: "Turno tarde",
    code: "TT",
    startTime: "13:00",
    endTime: "19:00",
    schoolId: escuelaId
  });

  schedulesRepository.createSchedule({
    id: "sch-2026",
    name: "Ciclo lectivo 2026",
    year: 2026,
    period: "anual",
    startDate: "2026-03-02",
    endDate: "2026-12-18",
    schoolId: escuelaId
  });

  let indice = 0;

  for (const dia of DIAS) {
    for (const [spaceId, startTime, endTime, teacherId, subjectId, courseId, divisionId] of CLASES) {
      indice++;
      schedulesRepository.createAssignment({
        id: `sca-${String(indice).padStart(3, "0")}`,
        scheduleId: "sch-2026",
        dayOfWeek: dia,
        startTime,
        endTime,
        spaceId,
        subjectId,
        teacherId,
        courseId,
        divisionId,
        shiftId: Number(startTime.slice(0, 2)) < 13 ? "shf-manana" : "shf-tarde",
        schoolId: escuelaId
      });
    }
  }
}
