/* Registro unico de rutas de la API.

   Cada ruta: { method, path, middlewares?, handler }.
   - `:nombre` en el path llega al handler en `params`.
   - Las rutas protegidas usan siempre [verifyToken, required(PERMISO)].
   - El orden importa: gana la primera coincidencia.

   Los permisos salen de config/permissions.config.mjs. */

import { healthCheck } from "../controllers/health.controller.mjs";
import { listModules, listRoles } from "../controllers/catalog.controller.mjs";
import * as authorizationController from "../controllers/authorization.controller.mjs";
import { verifyToken } from "../middlewares/auth.middleware.mjs";
import { authorize } from "../middlewares/authorize.middleware.mjs";
import { PERMISSIONS as P } from "../config/permissions.config.mjs";

import * as authController from "../modules/auth/auth.controller.mjs";
import * as usersController from "../modules/auth/users.controller.mjs";
import * as studentsController from "../modules/students/students.controller.mjs";
import * as spacesController from "../modules/spaces/spaces.controller.mjs";
import * as schedulesController from "../modules/schedules/schedules.controller.mjs";
import * as teachersController from "../modules/teachers/teachers.controller.mjs";
import * as absencesController from "../modules/absences/absences.controller.mjs";
import * as workshopsController from "../modules/workshops/workshops.controller.mjs";
import * as inventoryController from "../modules/inventory/inventory.controller.mjs";
import * as requestsController from "../modules/requests/requests.controller.mjs";
import * as reservationsController from "../modules/reservations/reservations.controller.mjs";
import * as notificationsController from "../modules/notifications/notifications.controller.mjs";
import * as curriculumController from "../modules/curriculum/curriculum.controller.mjs";
import * as academicController from "../modules/academic/academic.controller.mjs";
import * as academicRecordsController from "../modules/academic-records/academic-records.controller.mjs";
import * as tutorController from "../modules/tutors/tutors.controller.mjs";
import * as auditController from "../modules/audit/audit.controller.mjs";
import { auditarAccion } from "../modules/audit/audit.middleware.mjs";

/* Exige un permiso existente: un typo en P.ALGO rompe el arranque en lugar de
   dejar la ruta abierta a cualquier usuario autenticado. */
function required(permission) {
  if (!permission) {
    throw new Error("Ruta con permiso inexistente: revisar PERMISSIONS en config/permissions.config.mjs");
  }

  return authorize({ permission });
}

export const apiRoutes = [
  { method: "GET", path: "/health", handler: healthCheck },
  { method: "GET", path: "/api/v1/modules", handler: listModules },
  { method: "GET", path: "/api/v1/roles", handler: listRoles },
  { method: "GET", path: "/api/v1/authorization/me", middlewares: [verifyToken], handler: authorizationController.getMe },
  { method: "GET", path: "/api/v1/authorization/modules", middlewares: [verifyToken, required(P.IDENTITY_READ)], handler: authorizationController.getModules },
  { method: "GET", path: "/api/v1/authorization/roles", middlewares: [verifyToken, required(P.IDENTITY_READ)], handler: authorizationController.getRoles },
  { method: "GET", path: "/api/v1/authorization/permissions", middlewares: [verifyToken, required(P.IDENTITY_READ)], handler: authorizationController.getPermissions },
  { method: "GET", path: "/api/v1/authorization/roles/:codigo/permissions", middlewares: [verifyToken, required(P.IDENTITY_READ)], handler: authorizationController.getRolePermissions },
  { method: "PUT", path: "/api/v1/authorization/roles/:codigo/permissions", middlewares: [verifyToken, required(P.IDENTITY_UPDATE)], handler: authorizationController.putRolePermissions },

  { method: "POST", path: "/api/v1/auth/login", handler: authController.login },
  { method: "POST", path: "/api/v1/auth/refresh", handler: authController.refresh },
  { method: "POST", path: "/api/v1/auth/logout", handler: authController.logout },
  { method: "GET", path: "/api/v1/auth/me", middlewares: [verifyToken], handler: authController.me },
  { method: "GET", path: "/api/v1/auth/permissions", middlewares: [verifyToken], handler: authController.permissions },
  { method: "GET", path: "/api/v1/users", middlewares: [verifyToken, required(P.USERS_READ)], handler: authController.listUsers },
  { method: "POST", path: "/api/v1/users", middlewares: [verifyToken, required(P.IDENTITY_CREATE)], handler: usersController.createUser },
  { method: "GET", path: "/api/v1/users/:userId", middlewares: [verifyToken, required(P.USERS_READ)], handler: usersController.getUser },
  { method: "PATCH", path: "/api/v1/users/:userId", middlewares: [verifyToken, required(P.IDENTITY_UPDATE)], handler: usersController.updateUser },
  { method: "PUT", path: "/api/v1/users/:userId/roles", middlewares: [verifyToken, required(P.IDENTITY_UPDATE)], handler: usersController.replaceUserRoles },
  { method: "PATCH", path: "/api/v1/users/:userId/deactivate", middlewares: [verifyToken, required(P.USERS_DEACTIVATE)], handler: authController.deactivateUser },

  { method: "GET", path: "/api/v1/schools/:schoolId/courses/:courseId/divisions/:divisionId/students", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: academicController.listAlumnosDeDivision },
  { method: "GET", path: "/api/v1/students/listas/curso", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.listarCurso },
  { method: "GET", path: "/api/v1/students/listas/division", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.listarDivision },
  { method: "GET", path: "/api/v1/students/listas/grupo", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.listarGrupo },
  { method: "GET", path: "/api/v1/students/listas/taller", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.listarTaller },
  { method: "POST", path: "/api/v1/students", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: studentsController.crearAlumno },
  { method: "GET", path: "/api/v1/students", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.listarAlumnos },
  { method: "GET", path: "/api/v1/students/divisions", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.listarDivisiones },
  { method: "GET", path: "/api/v1/students/:studentId", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.obtenerAlumno },
  { method: "PATCH", path: "/api/v1/students/:studentId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: studentsController.modificarAlumno },
  { method: "DELETE", path: "/api/v1/students/:studentId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: studentsController.desactivarAlumno },
  { method: "GET", path: "/api/v1/students/:studentId/summary", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.obtenerResumen },
  { method: "GET", path: "/api/v1/students/:studentId/profile", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.obtenerPerfil },
  { method: "GET", path: "/api/v1/students/:studentId/observations", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: studentsController.listarObservacionesDeAlumno },
  { method: "POST", path: "/api/v1/students/:studentId/observations", middlewares: [verifyToken, required(P.OBSERVATIONS_WRITE)], handler: studentsController.crearObservacion },
  { method: "POST", path: "/api/v1/students/:studentId/transfers", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: studentsController.iniciarPase },
  { method: "POST", path: "/api/v1/students/:studentId/certificate", middlewares: [verifyToken, required(P.DOCUMENTS_WRITE)], handler: studentsController.emitirConstancia },
  { method: "GET", path: "/api/v1/observations", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: studentsController.listarObservaciones },
  { method: "GET", path: "/api/v1/dashboard/secretaria", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.tableroSecretaria },
  { method: "POST", path: "/api/v1/alerts/:alertId/dismiss", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: studentsController.descartarAlerta },

  { method: "POST", path: "/api/v1/tutors", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: tutorController.createTutor },
  { method: "GET", path: "/api/v1/tutors", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: tutorController.listTutors },
  { method: "GET", path: "/api/v1/tutors/:tutorId", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: tutorController.getTutor },
  { method: "PATCH", path: "/api/v1/tutors/:tutorId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: tutorController.updateTutor },
  { method: "DELETE", path: "/api/v1/tutors/:tutorId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: tutorController.deactivateTutor },
  { method: "GET", path: "/api/v1/tutors/:tutorId/students", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: tutorController.listTutorStudents },
  { method: "POST", path: "/api/v1/students/:studentId/tutors", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: tutorController.associateTutor },
  { method: "GET", path: "/api/v1/students/:studentId/tutors", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: tutorController.listStudentTutors },
  { method: "PATCH", path: "/api/v1/student-tutors/:relationId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: tutorController.updateRelation },
  { method: "DELETE", path: "/api/v1/student-tutors/:relationId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: tutorController.unlinkRelation },

  { method: "POST", path: "/api/v1/ciclos", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.createCiclo },
  { method: "GET", path: "/api/v1/ciclos", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listCiclos },
  { method: "GET", path: "/api/v1/ciclos/:cicloId", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.getCiclo },
  { method: "PATCH", path: "/api/v1/ciclos/:cicloId", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.updateCiclo },
  { method: "DELETE", path: "/api/v1/ciclos/:cicloId", middlewares: [verifyToken, required(P.ACADEMICS_MANAGE)], handler: academicController.deactivateCiclo },

  { method: "POST", path: "/api/v1/orientaciones", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.createOrientacion },
  { method: "GET", path: "/api/v1/orientaciones", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listOrientaciones },
  { method: "GET", path: "/api/v1/orientaciones/:orientacionId", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.getOrientacion },
  { method: "PATCH", path: "/api/v1/orientaciones/:orientacionId", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.updateOrientacion },
  { method: "DELETE", path: "/api/v1/orientaciones/:orientacionId", middlewares: [verifyToken, required(P.ACADEMICS_MANAGE)], handler: academicController.deactivateOrientacion },

  { method: "POST", path: "/api/v1/cursos", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.createCurso },
  { method: "GET", path: "/api/v1/cursos", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listCursos },
  { method: "GET", path: "/api/v1/cursos/:cursoId", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.getCurso },
  { method: "GET", path: "/api/v1/cursos/:cursoId/divisiones", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listDivisionesDeCurso },
  { method: "GET", path: "/api/v1/cursos/:cursoId/alumnos", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listAlumnosDeCurso },
  { method: "GET", path: "/api/v1/cursos/:cursoId/materias", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listMateriasDeCurso },
  { method: "GET", path: "/api/v1/cursos/:cursoId/docentes", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listDocentesDeCurso },
  { method: "GET", path: "/api/v1/cursos/:cursoId/horarios", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listHorariosDeCurso },
  { method: "PATCH", path: "/api/v1/cursos/:cursoId", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.updateCurso },
  { method: "DELETE", path: "/api/v1/cursos/:cursoId", middlewares: [verifyToken, required(P.ACADEMICS_MANAGE)], handler: academicController.deactivateCurso },

  { method: "POST", path: "/api/v1/divisiones", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.createDivision },
  { method: "GET", path: "/api/v1/divisiones", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listDivisiones },
  { method: "GET", path: "/api/v1/divisiones/:divisionId", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.getDivision },
  { method: "GET", path: "/api/v1/divisiones/:divisionId/alumnos", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listAlumnosDeDivision },
  { method: "GET", path: "/api/v1/divisiones/:divisionId/materias", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listMateriasDeDivision },
  { method: "GET", path: "/api/v1/divisiones/:divisionId/docentes", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listDocentesDeDivision },
  { method: "GET", path: "/api/v1/divisiones/:divisionId/horarios", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: academicController.listHorariosDeDivision },
  { method: "PATCH", path: "/api/v1/divisiones/:divisionId", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: academicController.updateDivision },
  { method: "DELETE", path: "/api/v1/divisiones/:divisionId", middlewares: [verifyToken, required(P.ACADEMICS_MANAGE)], handler: academicController.deactivateDivision },

  { method: "POST", path: "/api/v1/situaciones-academicas", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_WRITE)], handler: academicRecordsController.createSituacion },
  { method: "GET", path: "/api/v1/situaciones-academicas", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.listSituaciones },
  { method: "GET", path: "/api/v1/situaciones-academicas/catalogos", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.getCatalogos },
  { method: "GET", path: "/api/v1/situaciones-academicas/pendientes", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.listPendientes },
  { method: "GET", path: "/api/v1/situaciones-academicas/recursadas", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.listRecursadas },
  { method: "GET", path: "/api/v1/situaciones-academicas/intensificadas", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.listIntensificadas },
  { method: "GET", path: "/api/v1/situaciones-academicas/:situacionId", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.getSituacion },
  { method: "PATCH", path: "/api/v1/situaciones-academicas/:situacionId", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_WRITE)], handler: academicRecordsController.updateSituacion },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/situacion-academica", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.getSituacionDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/situacion-academica/:materiaId", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.getSituacionDeAlumnoYMateria },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/historial-academico", middlewares: [verifyToken, required(P.ACADEMIC_RECORDS_READ)], handler: academicRecordsController.getHistorialDeAlumno },

  { method: "POST", path: "/api/v1/buildings", middlewares: [verifyToken, required(P.SPACES_WRITE)], handler: spacesController.createBuilding },
  { method: "GET", path: "/api/v1/buildings", middlewares: [verifyToken, required(P.SPACES_READ)], handler: spacesController.listBuildings },
  { method: "GET", path: "/api/v1/buildings/:buildingId", middlewares: [verifyToken, required(P.SPACES_READ)], handler: spacesController.getBuilding },
  { method: "PATCH", path: "/api/v1/buildings/:buildingId", middlewares: [verifyToken, required(P.SPACES_WRITE)], handler: spacesController.updateBuilding },

  { method: "POST", path: "/api/v1/spaces", middlewares: [verifyToken, required(P.SPACES_WRITE)], handler: spacesController.createSpace },
  { method: "GET", path: "/api/v1/spaces", middlewares: [verifyToken, required(P.SPACES_READ)], handler: spacesController.listSpaces },
  { method: "GET", path: "/api/v1/spaces/:spaceId", middlewares: [verifyToken, required(P.SPACES_READ)], handler: spacesController.getSpace },
  { method: "PATCH", path: "/api/v1/spaces/:spaceId", middlewares: [verifyToken, required(P.SPACES_WRITE)], handler: spacesController.updateSpace },
  { method: "DELETE", path: "/api/v1/spaces/:spaceId", middlewares: [verifyToken, required(P.SPACES_MANAGE)], handler: spacesController.deleteSpace },

  { method: "POST", path: "/api/v1/careers", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: spacesController.createCareer },
  { method: "GET", path: "/api/v1/careers", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: spacesController.listCareers },
  { method: "GET", path: "/api/v1/careers/:careerId", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: spacesController.getCareer },
  { method: "PATCH", path: "/api/v1/careers/:careerId", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: spacesController.updateCareer },

  { method: "POST", path: "/api/v1/shifts", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.createShift },
  { method: "GET", path: "/api/v1/shifts", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.listShifts },
  { method: "GET", path: "/api/v1/shifts/:shiftId", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.getShift },
  { method: "PATCH", path: "/api/v1/shifts/:shiftId", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.updateShift },

  { method: "POST", path: "/api/v1/time-slots", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.createTimeSlot },
  { method: "GET", path: "/api/v1/time-slots", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.listTimeSlots },
  { method: "GET", path: "/api/v1/time-slots/:timeSlotId", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.getTimeSlot },
  { method: "PATCH", path: "/api/v1/time-slots/:timeSlotId", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.updateTimeSlot },

  { method: "POST", path: "/api/v1/schedules", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.createSchedule },
  { method: "GET", path: "/api/v1/schedules", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.listSchedules },
  { method: "GET", path: "/api/v1/schedules/:scheduleId", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.getSchedule },
  { method: "PATCH", path: "/api/v1/schedules/:scheduleId", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.updateSchedule },

  { method: "POST", path: "/api/v1/schedule-assignments", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.createAssignment },
  { method: "GET", path: "/api/v1/schedule-assignments", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.listAssignments },
  { method: "GET", path: "/api/v1/schedule-assignments/:assignmentId", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: schedulesController.getAssignment },
  { method: "PATCH", path: "/api/v1/schedule-assignments/:assignmentId", middlewares: [verifyToken, required(P.SCHEDULES_WRITE)], handler: schedulesController.updateAssignment },
  { method: "DELETE", path: "/api/v1/schedule-assignments/:assignmentId", middlewares: [verifyToken, required(P.SCHEDULES_MANAGE)], handler: schedulesController.deleteAssignment },

  { method: "POST", path: "/api/v1/teachers", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.createTeacher },
  { method: "GET", path: "/api/v1/teachers", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeachers },
  { method: "GET", path: "/api/v1/teachers/:teacherId", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.getTeacher },
  { method: "PATCH", path: "/api/v1/teachers/:teacherId", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.updateTeacher },
  { method: "DELETE", path: "/api/v1/teachers/:teacherId", middlewares: [verifyToken, required(P.TEACHERS_MANAGE)], handler: teachersController.deactivateTeacher },
  { method: "POST", path: "/api/v1/teachers/:teacherId/subjects", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.addSubjectToTeacher },
  { method: "GET", path: "/api/v1/teachers/:teacherId/subjects", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeacherSubjects },
  { method: "DELETE", path: "/api/v1/teacher-subjects/:assignmentId", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.removeSubjectFromTeacher },

  { method: "POST", path: "/api/v1/absences", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.createAbsence },
  { method: "GET", path: "/api/v1/absences", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.listAbsences },
  { method: "GET", path: "/api/v1/absences/:absenceId", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.getAbsence },
  { method: "PATCH", path: "/api/v1/absences/:absenceId", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.updateAbsence },
  { method: "DELETE", path: "/api/v1/absences/:absenceId", middlewares: [verifyToken, required(P.ABSENCES_MANAGE)], handler: absencesController.deleteAbsence },

  { method: "POST", path: "/api/v1/incidents", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.createIncident },
  { method: "GET", path: "/api/v1/incidents", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.listIncidents },
  { method: "GET", path: "/api/v1/incidents/:incidentId", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.getIncident },
  { method: "PATCH", path: "/api/v1/incidents/:incidentId", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.updateIncident },

  { method: "POST", path: "/api/v1/workshops", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.createWorkshop },
  { method: "GET", path: "/api/v1/workshops", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.listWorkshops },
  { method: "GET", path: "/api/v1/workshops/:workshopId", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.getWorkshop },
  { method: "PATCH", path: "/api/v1/workshops/:workshopId", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.updateWorkshop },
  { method: "DELETE", path: "/api/v1/workshops/:workshopId", middlewares: [verifyToken, required(P.WORKSHOPS_MANAGE)], handler: workshopsController.deactivateWorkshop },

  { method: "POST", path: "/api/v1/workshop-sessions", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.createSession },
  { method: "GET", path: "/api/v1/workshop-sessions", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.listSessions },
  { method: "GET", path: "/api/v1/workshop-sessions/:sessionId", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.getSession },
  { method: "PATCH", path: "/api/v1/workshop-sessions/:sessionId", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.updateSession },

  { method: "POST", path: "/api/v1/inventory", middlewares: [verifyToken, required(P.INVENTORY_WRITE)], handler: inventoryController.createItem },
  { method: "GET", path: "/api/v1/inventory", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.listItems },
  { method: "GET", path: "/api/v1/inventory/:itemId", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.getItem },
  { method: "PATCH", path: "/api/v1/inventory/:itemId", middlewares: [verifyToken, required(P.INVENTORY_WRITE)], handler: inventoryController.updateItem },
  { method: "DELETE", path: "/api/v1/inventory/:itemId", middlewares: [verifyToken, required(P.INVENTORY_MANAGE)], handler: inventoryController.deleteItem },

  { method: "POST", path: "/api/v1/inventory-movements", middlewares: [verifyToken, required(P.INVENTORY_WRITE)], handler: inventoryController.createMovement },
  { method: "GET", path: "/api/v1/inventory-movements", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.listMovements },

  { method: "POST", path: "/api/v1/requests", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: requestsController.createRequest },
  { method: "GET", path: "/api/v1/requests", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: requestsController.listRequests },
  { method: "GET", path: "/api/v1/requests/:requestId", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: requestsController.getRequest },
  { method: "PATCH", path: "/api/v1/requests/:requestId", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: requestsController.updateRequest },
  { method: "POST", path: "/api/v1/requests/:requestId/comments", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: requestsController.addComment },
  { method: "GET", path: "/api/v1/requests/:requestId/comments", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: requestsController.listComments },

  { method: "POST", path: "/api/v1/reservations", middlewares: [verifyToken, required(P.RESERVATIONS_WRITE)], handler: reservationsController.createReservation },
  { method: "GET", path: "/api/v1/reservations", middlewares: [verifyToken, required(P.RESERVATIONS_READ)], handler: reservationsController.listReservations },
  { method: "GET", path: "/api/v1/reservations/:reservationId", middlewares: [verifyToken, required(P.RESERVATIONS_READ)], handler: reservationsController.getReservation },
  { method: "PATCH", path: "/api/v1/reservations/:reservationId", middlewares: [verifyToken, required(P.RESERVATIONS_WRITE)], handler: reservationsController.updateReservation },
  { method: "POST", path: "/api/v1/reservations/:reservationId/approve", middlewares: [verifyToken, required(P.RESERVATIONS_MANAGE)], handler: reservationsController.approveReservation },
  { method: "POST", path: "/api/v1/reservations/:reservationId/reject", middlewares: [verifyToken, required(P.RESERVATIONS_MANAGE)], handler: reservationsController.rejectReservation },
  { method: "POST", path: "/api/v1/reservations/:reservationId/cancel", middlewares: [verifyToken, required(P.RESERVATIONS_WRITE)], handler: reservationsController.cancelReservation },

  { method: "POST", path: "/api/v1/notifications", middlewares: [verifyToken, required(P.NOTIFICATIONS_WRITE)], handler: notificationsController.createNotification },
  { method: "GET", path: "/api/v1/notifications", middlewares: [verifyToken, required(P.NOTIFICATIONS_READ)], handler: notificationsController.listNotifications },
  { method: "GET", path: "/api/v1/notifications/unread-count", middlewares: [verifyToken, required(P.NOTIFICATIONS_READ)], handler: notificationsController.getUnreadCount },
  { method: "GET", path: "/api/v1/notifications/:notificationId", middlewares: [verifyToken, required(P.NOTIFICATIONS_READ)], handler: notificationsController.getNotification },
  { method: "POST", path: "/api/v1/notifications/:notificationId/read", middlewares: [verifyToken, required(P.NOTIFICATIONS_READ)], handler: notificationsController.markAsRead },
  { method: "POST", path: "/api/v1/notifications/read-all", middlewares: [verifyToken, required(P.NOTIFICATIONS_READ)], handler: notificationsController.markAllRead },

  { method: "POST", path: "/api/v1/curriculum/areas", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: curriculumController.createArea },
  { method: "GET", path: "/api/v1/curriculum/areas", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: curriculumController.listAreas },
  { method: "GET", path: "/api/v1/curriculum/areas/:areaId", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: curriculumController.getArea },
  { method: "PATCH", path: "/api/v1/curriculum/areas/:areaId", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: curriculumController.updateArea },

  { method: "POST", path: "/api/v1/curriculum/plans", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: curriculumController.createPlan },
  { method: "GET", path: "/api/v1/curriculum/plans", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: curriculumController.listPlans },
  { method: "GET", path: "/api/v1/curriculum/plans/:planId", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: curriculumController.getPlan },
  { method: "PATCH", path: "/api/v1/curriculum/plans/:planId", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: curriculumController.updatePlan },

  { method: "POST", path: "/api/v1/curriculum/activities", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: curriculumController.createActivity },
  { method: "GET", path: "/api/v1/curriculum/activities", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: curriculumController.listActivities },
  { method: "GET", path: "/api/v1/curriculum/activities/:activityId", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: curriculumController.getActivity },
  { method: "PATCH", path: "/api/v1/curriculum/activities/:activityId", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: curriculumController.updateActivity },

  { method: "GET", path: "/api/v1/audit/logs", middlewares: [verifyToken, required(P.AUDIT_READ)], handler: auditController.listLogs },
  { method: "GET", path: "/api/v1/audit/logs/:logId", middlewares: [verifyToken, required(P.AUDIT_READ)], handler: auditController.getLog },
  { method: "GET", path: "/api/v1/audit/errors", middlewares: [verifyToken, required(P.AUDIT_READ)], handler: auditController.listErrors },
  { method: "GET", path: "/api/v1/audit/errors/:errorId", middlewares: [verifyToken, required(P.AUDIT_READ)], handler: auditController.getError },
  { method: "GET", path: "/api/v1/audit/report", middlewares: [verifyToken, required(P.AUDIT_READ)], handler: auditController.report },
  { method: "GET", path: "/api/v1/audit/export", middlewares: [verifyToken, required(P.AUDIT_EXPORT)], handler: auditarAccion({ tabla: "auditoria", accion: "export" })(auditController.exportCsv) }
];

function tokenize(path) {
  return path.split("/").filter(Boolean);
}

function matchPath(patternTokens, pathTokens) {
  if (patternTokens.length !== pathTokens.length) {
    return null;
  }

  const params = {};

  for (let i = 0; i < patternTokens.length; i++) {
    const pattern = patternTokens[i];

    if (pattern.startsWith(":")) {
      params[pattern.slice(1)] = decodeURIComponent(pathTokens[i]);
      continue;
    }

    if (pattern !== pathTokens[i]) {
      return null;
    }
  }

  return params;
}

export function matchRoute(routes, method, pathname) {
  const pathTokens = tokenize(pathname);

  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const params = matchPath(tokenize(route.path), pathTokens);
    if (params) {
      return {
        ...route,
        params,
        middlewares: route.middlewares ?? []
      };
    }
  }

  return null;
}
