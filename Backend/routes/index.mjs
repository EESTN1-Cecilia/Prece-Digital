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
import * as courseChangesController from "../modules/course-changes/course-changes.controller.mjs";
import * as bookRegistryController from "../modules/book-registry/book-registry.controller.mjs";
import * as particularConditionsController from "../modules/particular-conditions/particular-conditions.controller.mjs";
import * as observationsController from "../modules/observations/observations.controller.mjs";
import * as spacesController from "../modules/spaces/spaces.controller.mjs";
import * as schedulesController from "../modules/schedules/schedules.controller.mjs";
import * as teachersController from "../modules/teachers/teachers.controller.mjs";
import * as gradesController from "../modules/grades/grades.controller.mjs";
import * as absencesController from "../modules/absences/absences.controller.mjs";
import * as absenceEventsController from "../modules/absence-events/absence-events.controller.mjs";
import * as groupsController from "../modules/groups/groups.controller.mjs";
import * as reassignmentsController from "../modules/reassignments/reassignments.controller.mjs";
import * as seguimientoController from "../modules/seguimiento/seguimiento.controller.mjs";
import * as planificacionesController from "../modules/planificaciones/planificaciones.controller.mjs";
import * as controlPlanificacionesController from "../modules/control-planificaciones/control-planificaciones.controller.mjs";
import * as materialRequestsController from "../modules/material-requests/material-requests.controller.mjs";
import * as materialReservationsController from "../modules/material-reservations/material-reservations.controller.mjs";
import * as attendanceAlertsController from "../modules/attendance-alerts/attendance-alerts.controller.mjs";
import * as attendanceFollowupsController from "../modules/attendance-followups/attendance-followups.controller.mjs";
import * as inasistenciasController from "../modules/inasistencias/inasistencias.controller.mjs";
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
import * as jefaturaController from "../modules/jefatura/jefatura.controller.mjs";
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
  { method: "GET", path: "/api/v1/students/:studentId/observations", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.listarDeAlumno },
  { method: "POST", path: "/api/v1/students/:studentId/observations", middlewares: [verifyToken, required(P.OBSERVATIONS_WRITE)], handler: observationsController.crearObservacion },
  { method: "POST", path: "/api/v1/students/:studentId/transfers", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: studentsController.iniciarPase },
  { method: "POST", path: "/api/v1/students/:studentId/certificate", middlewares: [verifyToken, required(P.DOCUMENTS_WRITE)], handler: studentsController.emitirConstancia },

  /* Observaciones de alumnos. Los literales (catalogos) van antes que los
     parametros porque el router gana con la primera coincidencia. */
  { method: "GET", path: "/api/v1/observations/catalogos", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.catalogos },
  { method: "GET", path: "/api/v1/observations", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.listarObservaciones },
  { method: "GET", path: "/api/v1/observations/:observationId", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.obtenerObservacion },
  { method: "PATCH", path: "/api/v1/observations/:observationId", middlewares: [verifyToken, required(P.OBSERVATIONS_WRITE)], handler: observationsController.actualizarObservacion },
  { method: "POST", path: "/api/v1/observations/:observationId/seguimientos", middlewares: [verifyToken, required(P.OBSERVATIONS_WRITE)], handler: observationsController.crearSeguimiento },
  { method: "GET", path: "/api/v1/observations/:observationId/seguimientos", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.listarSeguimientos },
  { method: "GET", path: "/api/v1/seguimientos-observacion/:seguimientoId", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.obtenerSeguimiento },
  { method: "PATCH", path: "/api/v1/seguimientos-observacion/:seguimientoId", middlewares: [verifyToken, required(P.OBSERVATIONS_WRITE)], handler: observationsController.actualizarSeguimiento },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/observaciones/resumen", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.resumenDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/observaciones", middlewares: [verifyToken, required(P.OBSERVATIONS_READ)], handler: observationsController.historialDeAlumno },
  { method: "GET", path: "/api/v1/dashboard/secretaria", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.tableroSecretaria },
  { method: "GET", path: "/api/v1/jefatura/cursos-grupos", middlewares: [verifyToken, required(P.ACADEMICS_READ)], handler: jefaturaController.listCursosGrupos },
  { method: "GET", path: "/api/v1/jefatura/grilla", middlewares: [verifyToken, required(P.SCHEDULES_READ)], handler: jefaturaController.getGrilla },
  { method: "GET", path: "/api/v1/dashboard/server", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.tableroServer },
  { method: "POST", path: "/api/v1/alerts/:alertId/dismiss", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: studentsController.descartarAlerta },

  /* Condiciones particulares de alumnos. Los literales (catalogos) van antes que
     los parametros porque el router gana con la primera coincidencia. */
  { method: "GET", path: "/api/v1/students/:studentId/particular-conditions", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_READ)], handler: particularConditionsController.listarDeAlumno },
  { method: "POST", path: "/api/v1/students/:studentId/particular-conditions", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_WRITE)], handler: particularConditionsController.crearCondicion },
  { method: "GET", path: "/api/v1/particular-conditions/catalogos", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_READ)], handler: particularConditionsController.catalogos },
  { method: "GET", path: "/api/v1/particular-conditions", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_READ)], handler: particularConditionsController.listarCondiciones },
  { method: "GET", path: "/api/v1/particular-conditions/:conditionId", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_READ)], handler: particularConditionsController.obtenerCondicion },
  { method: "PATCH", path: "/api/v1/particular-conditions/:conditionId", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_WRITE)], handler: particularConditionsController.actualizarCondicion },
  { method: "POST", path: "/api/v1/particular-conditions/:conditionId/finalizar", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_WRITE)], handler: particularConditionsController.finalizarCondicion },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/condiciones/resumen", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_READ)], handler: particularConditionsController.resumenDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/condiciones", middlewares: [verifyToken, required(P.PARTICULAR_CONDITIONS_READ)], handler: particularConditionsController.historialDeAlumno },

  /* Promocion y cambio de curso. Los literales (catalogos, asignados,
     operaciones, masivos) van antes que :movimientoId y :operacionId porque el
     router gana con la primera coincidencia. El destino se valida contra el
     catalogo academico y la escuela sale del padron del alumno. */
  { method: "GET", path: "/api/v1/movimientos-cursos/catalogos", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.getCatalogos },
  { method: "GET", path: "/api/v1/movimientos-cursos/asignados", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.asignados },
  { method: "GET", path: "/api/v1/movimientos-cursos/operaciones/:operacionId", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.obtenerOperacion },
  { method: "POST", path: "/api/v1/movimientos-cursos/masivos", middlewares: [verifyToken, required(P.COURSE_CHANGES_WRITE)], handler: courseChangesController.registrarMasivos },
  { method: "GET", path: "/api/v1/movimientos-cursos", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.listarMovimientos },
  { method: "GET", path: "/api/v1/movimientos-cursos/:movimientoId", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.obtenerMovimiento },
  { method: "POST", path: "/api/v1/students/:studentId/promover", middlewares: [verifyToken, required(P.COURSE_CHANGES_WRITE)], handler: courseChangesController.promoverAlumno },
  { method: "POST", path: "/api/v1/students/:studentId/cambio-curso", middlewares: [verifyToken, required(P.COURSE_CHANGES_WRITE)], handler: courseChangesController.cambiarCurso },
  { method: "POST", path: "/api/v1/students/:studentId/cambio-division", middlewares: [verifyToken, required(P.COURSE_CHANGES_WRITE)], handler: courseChangesController.cambiarDivision },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/movimientos-cursos", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.historialDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/movimientos-cursos/ultimo", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.ultimoDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/situacion-curso", middlewares: [verifyToken, required(P.COURSE_CHANGES_READ)], handler: courseChangesController.situacionDeAlumno },
  /* Libro Matriz digital. Los literales (catalogos, exists) van antes que los
     parametros porque el router gana con la primera coincidencia. */
  { method: "GET", path: "/api/v1/students/:studentId/book-registry/exists", middlewares: [verifyToken, required(P.BOOK_REGISTRY_READ)], handler: bookRegistryController.existeDeAlumno },
  { method: "GET", path: "/api/v1/students/:studentId/book-registry", middlewares: [verifyToken, required(P.BOOK_REGISTRY_READ)], handler: bookRegistryController.obtenerDeAlumno },
  { method: "POST", path: "/api/v1/students/:studentId/book-registry", middlewares: [verifyToken, required(P.BOOK_REGISTRY_WRITE)], handler: bookRegistryController.crearRegistro },
  { method: "GET", path: "/api/v1/book-registry/catalogos", middlewares: [verifyToken, required(P.BOOK_REGISTRY_READ)], handler: bookRegistryController.catalogos },
  { method: "GET", path: "/api/v1/book-registry", middlewares: [verifyToken, required(P.BOOK_REGISTRY_READ)], handler: bookRegistryController.listarRegistros },
  { method: "GET", path: "/api/v1/book-registry/:registryId/historial", middlewares: [verifyToken, required(P.BOOK_REGISTRY_READ)], handler: bookRegistryController.historialDeRegistro },
  { method: "GET", path: "/api/v1/book-registry/:registryId", middlewares: [verifyToken, required(P.BOOK_REGISTRY_READ)], handler: bookRegistryController.obtenerRegistro },
  { method: "PATCH", path: "/api/v1/book-registry/:registryId", middlewares: [verifyToken, required(P.BOOK_REGISTRY_WRITE)], handler: bookRegistryController.actualizarRegistro },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/libro-matriz", middlewares: [verifyToken, required(P.BOOK_REGISTRY_READ)], handler: bookRegistryController.obtenerDeAlumno },

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

  /* Calificaciones: los literales (catalogos) y las consultas por alumno/docente
     van antes que /calificaciones/:calificacionId porque el router gana con la
     primera coincidencia. */
  { method: "GET", path: "/api/v1/calificaciones/catalogos", middlewares: [verifyToken, required(P.GRADES_READ)], handler: gradesController.getCatalogos },
  { method: "POST", path: "/api/v1/calificaciones", middlewares: [verifyToken, required(P.GRADES_WRITE)], handler: gradesController.createCalificacion },
  { method: "GET", path: "/api/v1/calificaciones", middlewares: [verifyToken, required(P.GRADES_READ)], handler: gradesController.listCalificaciones },
  { method: "GET", path: "/api/v1/calificaciones/:calificacionId", middlewares: [verifyToken, required(P.GRADES_READ)], handler: gradesController.getCalificacion },
  { method: "PATCH", path: "/api/v1/calificaciones/:calificacionId", middlewares: [verifyToken, required(P.GRADES_WRITE)], handler: gradesController.updateCalificacion },
  { method: "DELETE", path: "/api/v1/calificaciones/:calificacionId", middlewares: [verifyToken, required(P.GRADES_WRITE)], handler: gradesController.deleteCalificacion },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/calificaciones", middlewares: [verifyToken, required(P.GRADES_READ)], handler: gradesController.getCalificacionesDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/calificaciones/resumen", middlewares: [verifyToken, required(P.GRADES_READ)], handler: gradesController.getResumenDeAlumno },
  { method: "GET", path: "/api/v1/docentes/:docenteId/calificaciones", middlewares: [verifyToken, required(P.GRADES_READ)], handler: gradesController.getCalificacionesDeDocente },

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

  /* Docentes: primero los literales (catalogos, by-*) porque matchRoute se
     queda con la primera coincidencia y /teachers/:teacherId es generico. */
  { method: "GET", path: "/api/v1/teachers/catalogos", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.getCatalogos },
  { method: "GET", path: "/api/v1/teachers/by-subject/:subjectId", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeachersBySubject },
  { method: "GET", path: "/api/v1/teachers/by-course/:cursoId", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeachersByCourse },
  { method: "GET", path: "/api/v1/teachers/by-division/:divisionId", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeachersByDivision },
  { method: "POST", path: "/api/v1/teachers", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.createTeacher },
  { method: "GET", path: "/api/v1/teachers", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeachers },
  { method: "GET", path: "/api/v1/teachers/:teacherId", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.getTeacher },
  { method: "PATCH", path: "/api/v1/teachers/:teacherId", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.updateTeacher },
  { method: "DELETE", path: "/api/v1/teachers/:teacherId", middlewares: [verifyToken, required(P.TEACHERS_MANAGE)], handler: teachersController.deactivateTeacher },
  { method: "POST", path: "/api/v1/teachers/:teacherId/subjects", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.addSubjectToTeacher },
  { method: "GET", path: "/api/v1/teachers/:teacherId/subjects", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeacherSubjects },
  { method: "GET", path: "/api/v1/teachers/:teacherId/subjects/:assignmentId", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.getTeacherSubject },
  { method: "PATCH", path: "/api/v1/teacher-subjects/:assignmentId", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.updateTeacherSubject },
  { method: "DELETE", path: "/api/v1/teacher-subjects/:assignmentId", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.removeSubjectFromTeacher },
  { method: "POST", path: "/api/v1/teachers/:teacherId/courses", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.addCourseToTeacher },
  { method: "GET", path: "/api/v1/teachers/:teacherId/courses", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.listTeacherCourses },
  { method: "GET", path: "/api/v1/teachers/:teacherId/courses/:assignmentId", middlewares: [verifyToken, required(P.TEACHERS_READ)], handler: teachersController.getTeacherCourse },
  { method: "PATCH", path: "/api/v1/teacher-courses/:assignmentId", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.updateTeacherCourse },
  { method: "DELETE", path: "/api/v1/teacher-courses/:assignmentId", middlewares: [verifyToken, required(P.TEACHERS_WRITE)], handler: teachersController.removeCourseFromTeacher },

  /* Inasistencias de alumnos: rutas mas especificas primero por como matchea
     matchRoute (quien haga coincidir antes gana).
     Permisos: attendance.read para consultas y attendance.write para el resto. */
  { method: "GET", path: "/api/v1/inasistencias/motivos", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: inasistenciasController.listarMotivos },
  { method: "POST", path: "/api/v1/inasistencias", middlewares: [verifyToken, required(P.ATTENDANCE_WRITE)], handler: inasistenciasController.crearInasistencia },
  { method: "GET", path: "/api/v1/inasistencias", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: inasistenciasController.listarInasistencias },
  { method: "GET", path: "/api/v1/inasistencias/estadisticas", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: inasistenciasController.estadisticas },
  { method: "GET", path: "/api/v1/inasistencias/alumno/:alumnoId/totales", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: inasistenciasController.totalesDeAlumno },
  { method: "GET", path: "/api/v1/inasistencias/:inasistenciaId/historial", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: inasistenciasController.historialInasistencia },
  { method: "GET", path: "/api/v1/inasistencias/:inasistenciaId", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: inasistenciasController.obtenerInasistencia },
  { method: "POST", path: "/api/v1/inasistencias/:inasistenciaId/justify", middlewares: [verifyToken, required(P.ATTENDANCE_WRITE)], handler: inasistenciasController.justificarInasistencia },
  { method: "PATCH", path: "/api/v1/inasistencias/:inasistenciaId", middlewares: [verifyToken, required(P.ATTENDANCE_WRITE)], handler: inasistenciasController.modificarInasistencia },

  /* Inasistencias docentes (ausencias). Los literales van antes que :absenceId
     porque el router gana con la primera coincidencia. */
  { method: "GET", path: "/api/v1/absences/available-spaces", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.listAvailableSpaces },
  { method: "GET", path: "/api/v1/absences/affected-activities", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.listAffectedActivities },
  { method: "GET", path: "/api/v1/absences/grid", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.getGrid },
  { method: "POST", path: "/api/v1/absences", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.createAbsence },
  { method: "GET", path: "/api/v1/absences", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.listAbsences },
  { method: "GET", path: "/api/v1/absences/:absenceId/history", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.getAbsenceHistory },
  { method: "GET", path: "/api/v1/absences/:absenceId/availability", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.getAbsenceAvailability },
  { method: "POST", path: "/api/v1/absences/:absenceId/reactivate", middlewares: [verifyToken, required(P.ABSENCES_MANAGE)], handler: absencesController.reactivateAbsence },
  { method: "GET", path: "/api/v1/absences/:absenceId", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.getAbsence },
  { method: "PATCH", path: "/api/v1/absences/:absenceId", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.updateAbsence },
  { method: "POST", path: "/api/v1/absences/:absenceId/annul", middlewares: [verifyToken, required(P.ABSENCES_MANAGE)], handler: absencesController.annulAbsence },
  { method: "DELETE", path: "/api/v1/absences/:absenceId", middlewares: [verifyToken, required(P.ABSENCES_MANAGE)], handler: absencesController.annulAbsence },

  { method: "PATCH", path: "/api/v1/absence-liberations/:availabilityId", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.updateAvailabilityStatus },

  /* Eventos de ausencia: bitacora y consultas derivadas. Los literales van antes
     que los parametros porque el router gana con la primera coincidencia. */
  { method: "GET", path: "/api/v1/absence-events", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absenceEventsController.listAbsenceEvents },
  { method: "POST", path: "/api/v1/absence-events", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absenceEventsController.createAbsenceEvent },
  { method: "GET", path: "/api/v1/absence-events/by-absence/:absenceId", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absenceEventsController.getEventByAbsence },
  { method: "GET", path: "/api/v1/absence-events/:eventId/class-state", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absenceEventsController.getClassState },
  { method: "GET", path: "/api/v1/absence-events/:eventId/space-availability", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absenceEventsController.getSpaceAvailability },
  { method: "GET", path: "/api/v1/absence-events/:eventId/affected-classes", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absenceEventsController.getAffectedClasses },
  { method: "GET", path: "/api/v1/absence-events/:eventId/notifications", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absenceEventsController.getEventNotifications },
  { method: "GET", path: "/api/v1/absence-events/:eventId", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absenceEventsController.getAbsenceEvent },

  { method: "POST", path: "/api/v1/incidents", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.createIncident },
  { method: "GET", path: "/api/v1/incidents", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.listIncidents },
  { method: "GET", path: "/api/v1/incidents/:incidentId", middlewares: [verifyToken, required(P.ABSENCES_READ)], handler: absencesController.getIncident },
  { method: "PATCH", path: "/api/v1/incidents/:incidentId", middlewares: [verifyToken, required(P.ABSENCES_WRITE)], handler: absencesController.updateIncident },

  /* Alertas por inasistencias consecutivas.

     El registro propio de inasistencias vive bajo el namespace de alertas:
     /api/v1/inasistencias es del modulo inasistencias (listado, motivos,
     estadisticas, historial y justificacion). El registro de este modulo usa los
     permisos de asistencia (attendance.read / attendance.write); las alertas y la
     configuracion de la regla tienen permisos propios porque una es la lectura de
     la situacion y la otra la regla institucional. Configurar el umbral es
     potestad de la direccion, no de quien carga la inasistencia.

     Los literales (inasistencias, catalogos, evaluar, evaluaciones) van antes que
     los parametros porque el router gana con la primera coincidencia. */
  { method: "POST", path: "/api/v1/alertas/inasistencias", middlewares: [verifyToken, required(P.ATTENDANCE_WRITE)], handler: attendanceAlertsController.createInasistencia },
  { method: "GET", path: "/api/v1/alertas/inasistencias", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: attendanceAlertsController.listInasistencias },
  { method: "GET", path: "/api/v1/alertas/inasistencias/:inasistenciaId", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: attendanceAlertsController.getInasistencia },
  { method: "PATCH", path: "/api/v1/alertas/inasistencias/:inasistenciaId", middlewares: [verifyToken, required(P.ATTENDANCE_WRITE)], handler: attendanceAlertsController.updateInasistencia },
  { method: "DELETE", path: "/api/v1/alertas/inasistencias/:inasistenciaId", middlewares: [verifyToken, required(P.ATTENDANCE_WRITE)], handler: attendanceAlertsController.deactivateInasistencia },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/inasistencias", middlewares: [verifyToken, required(P.ATTENDANCE_READ)], handler: attendanceAlertsController.getInasistenciasDeAlumno },

  { method: "POST", path: "/api/v1/alertas/evaluar", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_WRITE)], handler: attendanceAlertsController.evaluarAlertas },
  { method: "GET", path: "/api/v1/alertas/evaluaciones", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_READ)], handler: attendanceAlertsController.listEvaluaciones },
  { method: "GET", path: "/api/v1/alertas/catalogos", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_READ)], handler: attendanceAlertsController.getCatalogos },
  { method: "GET", path: "/api/v1/alertas", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_READ)], handler: attendanceAlertsController.listAlertas },
  { method: "GET", path: "/api/v1/alertas/:alertaId", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_READ)], handler: attendanceAlertsController.getAlerta },
  { method: "PATCH", path: "/api/v1/alertas/:alertaId", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_WRITE)], handler: attendanceAlertsController.updateAlerta },
  { method: "POST", path: "/api/v1/alertas/:alertaId/reenviar", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_WRITE)], handler: attendanceAlertsController.reenviarNotificacion },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/alertas", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_READ)], handler: attendanceAlertsController.getAlertasDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/alertas/resumen", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_READ)], handler: attendanceAlertsController.getResumenDeAlumno },

  { method: "GET", path: "/api/v1/configuracion-alertas", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_READ)], handler: attendanceAlertsController.getConfiguracion },
  { method: "PUT", path: "/api/v1/configuracion-alertas", middlewares: [verifyToken, required(P.ATTENDANCE_ALERTS_CONFIGURE)], handler: attendanceAlertsController.updateConfiguracion },
  /* Seguimiento de inasistencias: los literales van antes que :seguimientoId
     porque el router gana con la primera coincidencia. */
  { method: "POST", path: "/api/v1/seguimientos-inasistencia", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_WRITE)], handler: attendanceFollowupsController.createSeguimiento },
  { method: "GET", path: "/api/v1/seguimientos-inasistencia", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_READ)], handler: attendanceFollowupsController.listSeguimientos },
  { method: "GET", path: "/api/v1/seguimientos-inasistencia/catalogos", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_READ)], handler: attendanceFollowupsController.getCatalogos },
  { method: "GET", path: "/api/v1/seguimientos-inasistencia/alumnos", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_READ)], handler: attendanceFollowupsController.listAlumnosConSeguimientos },
  { method: "GET", path: "/api/v1/seguimientos-inasistencia/:seguimientoId", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_READ)], handler: attendanceFollowupsController.getSeguimiento },
  { method: "PATCH", path: "/api/v1/seguimientos-inasistencia/:seguimientoId", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_WRITE)], handler: attendanceFollowupsController.updateSeguimiento },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/seguimiento-inasistencia", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_READ)], handler: attendanceFollowupsController.getHistorialDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/seguimiento-inasistencia/ultima", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_READ)], handler: attendanceFollowupsController.getUltimoDeAlumno },
  { method: "GET", path: "/api/v1/alumnos/:alumnoId/seguimiento-inasistencia/resumen", middlewares: [verifyToken, required(P.ATTENDANCE_FOLLOWUPS_READ)], handler: attendanceFollowupsController.getResumenDeAlumno },

  { method: "POST", path: "/api/v1/workshops", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.createWorkshop },
  { method: "GET", path: "/api/v1/workshops", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.listWorkshops },
  { method: "GET", path: "/api/v1/workshops/:workshopId", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.getWorkshop },
  { method: "PATCH", path: "/api/v1/workshops/:workshopId", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.updateWorkshop },
  { method: "DELETE", path: "/api/v1/workshops/:workshopId", middlewares: [verifyToken, required(P.WORKSHOPS_MANAGE)], handler: workshopsController.deactivateWorkshop },

  { method: "POST", path: "/api/v1/workshop-sessions", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.createSession },
  { method: "GET", path: "/api/v1/workshop-sessions", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.listSessions },
  { method: "GET", path: "/api/v1/workshop-sessions/:sessionId", middlewares: [verifyToken, required(P.WORKSHOPS_READ)], handler: workshopsController.getSession },
  { method: "PATCH", path: "/api/v1/workshop-sessions/:sessionId", middlewares: [verifyToken, required(P.WORKSHOPS_WRITE)], handler: workshopsController.updateSession },

  /* Inventario: los literales (stock-low) y las subrutas van antes que
     /inventory/:itemId porque el router gana con la primera coincidencia. */
  { method: "POST", path: "/api/v1/inventory", middlewares: [verifyToken, required(P.INVENTORY_WRITE)], handler: inventoryController.createMaterial },
  { method: "GET", path: "/api/v1/inventory", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.listMaterials },
  { method: "GET", path: "/api/v1/inventory/stock-low", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.listLowStock },
  { method: "GET", path: "/api/v1/inventory/:itemId/stock", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.getStock },
  { method: "GET", path: "/api/v1/inventory/:itemId/stock/verify", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.verifyStock },
  { method: "GET", path: "/api/v1/inventory/:itemId/movements", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.listItemMovements },
  { method: "GET", path: "/api/v1/inventory/:itemId/history", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.getItemHistory },
  { method: "POST", path: "/api/v1/inventory/:itemId/movements", middlewares: [verifyToken, required(P.INVENTORY_WRITE)], handler: inventoryController.registerMovement },
  { method: "POST", path: "/api/v1/inventory/:itemId/movements/adjust", middlewares: [verifyToken, required(P.INVENTORY_MANAGE)], handler: inventoryController.registerAdjust },
  { method: "GET", path: "/api/v1/inventory/:itemId", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.getMaterial },
  { method: "PATCH", path: "/api/v1/inventory/:itemId", middlewares: [verifyToken, required(P.INVENTORY_WRITE)], handler: inventoryController.updateMaterial },
  { method: "DELETE", path: "/api/v1/inventory/:itemId", middlewares: [verifyToken, required(P.INVENTORY_MANAGE)], handler: inventoryController.deactivateMaterial },

  { method: "POST", path: "/api/v1/inventory-movements", middlewares: [verifyToken, required(P.INVENTORY_WRITE)], handler: inventoryController.createMovementLegacy },
  { method: "GET", path: "/api/v1/inventory-movements", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.listMovements },
  { method: "GET", path: "/api/v1/inventory-movements/:movementId", middlewares: [verifyToken, required(P.INVENTORY_READ)], handler: inventoryController.getMovement },

  { method: "POST", path: "/api/v1/requests", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: requestsController.createRequest },
  { method: "GET", path: "/api/v1/requests", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: requestsController.listRequests },
  { method: "GET", path: "/api/v1/requests/:requestId", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: requestsController.getRequest },
  { method: "PATCH", path: "/api/v1/requests/:requestId", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: requestsController.updateRequest },
  { method: "POST", path: "/api/v1/requests/:requestId/comments", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: requestsController.addComment },
  { method: "GET", path: "/api/v1/requests/:requestId/comments", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: requestsController.listComments },

  /* Pedidos de materiales: subrutas de accion antes que :requestId. */
  { method: "POST", path: "/api/v1/material-requests", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: materialRequestsController.createRequest },
  { method: "GET", path: "/api/v1/material-requests", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: materialRequestsController.listRequests },
  { method: "POST", path: "/api/v1/material-requests/:requestId/status", middlewares: [verifyToken, required(P.REQUESTS_MANAGE)], handler: materialRequestsController.changeStatus },
  { method: "POST", path: "/api/v1/material-requests/:requestId/approve", middlewares: [verifyToken, required(P.REQUESTS_MANAGE)], handler: materialRequestsController.approveRequest },
  { method: "POST", path: "/api/v1/material-requests/:requestId/reject", middlewares: [verifyToken, required(P.REQUESTS_MANAGE)], handler: materialRequestsController.rejectRequest },
  { method: "POST", path: "/api/v1/material-requests/:requestId/cancel", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: materialRequestsController.cancelRequest },
  { method: "POST", path: "/api/v1/material-requests/:requestId/deliver", middlewares: [verifyToken, required(P.REQUESTS_MANAGE), required(P.INVENTORY_WRITE)], handler: materialRequestsController.deliverRequest },
  { method: "POST", path: "/api/v1/material-requests/:requestId/close", middlewares: [verifyToken, required(P.REQUESTS_MANAGE)], handler: materialRequestsController.closeRequest },
  { method: "GET", path: "/api/v1/material-requests/:requestId/history", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: materialRequestsController.getRequestHistory },
  { method: "GET", path: "/api/v1/material-requests/:requestId", middlewares: [verifyToken, required(P.REQUESTS_READ)], handler: materialRequestsController.getRequest },
  { method: "PATCH", path: "/api/v1/material-requests/:requestId", middlewares: [verifyToken, required(P.REQUESTS_WRITE)], handler: materialRequestsController.updateRequest },

  { method: "POST", path: "/api/v1/material-reservations", middlewares: [verifyToken, required(P.RESERVATIONS_WRITE)], handler: materialReservationsController.createReservation },
  { method: "GET", path: "/api/v1/material-reservations", middlewares: [verifyToken, required(P.RESERVATIONS_READ)], handler: materialReservationsController.listReservations },
  { method: "GET", path: "/api/v1/material-reservations/availability", middlewares: [verifyToken, required(P.RESERVATIONS_READ)], handler: materialReservationsController.getAvailability },
  { method: "POST", path: "/api/v1/material-reservations/:reservationId/approve", middlewares: [verifyToken, required(P.RESERVATIONS_MANAGE)], handler: materialReservationsController.approveReservation },
  { method: "POST", path: "/api/v1/material-reservations/:reservationId/reject", middlewares: [verifyToken, required(P.RESERVATIONS_MANAGE)], handler: materialReservationsController.rejectReservation },
  { method: "POST", path: "/api/v1/material-reservations/:reservationId/cancel", middlewares: [verifyToken, required(P.RESERVATIONS_WRITE)], handler: materialReservationsController.cancelReservation },
  { method: "POST", path: "/api/v1/material-reservations/:reservationId/deliver", middlewares: [verifyToken, required(P.RESERVATIONS_MANAGE), required(P.INVENTORY_WRITE)], handler: materialReservationsController.deliverReservation },
  { method: "POST", path: "/api/v1/material-reservations/:reservationId/finish", middlewares: [verifyToken, required(P.RESERVATIONS_MANAGE)], handler: materialReservationsController.finishReservation },
  { method: "GET", path: "/api/v1/material-reservations/:reservationId/history", middlewares: [verifyToken, required(P.RESERVATIONS_READ)], handler: materialReservationsController.getReservationHistory },
  { method: "GET", path: "/api/v1/material-reservations/:reservationId", middlewares: [verifyToken, required(P.RESERVATIONS_READ)], handler: materialReservationsController.getReservation },
  { method: "PATCH", path: "/api/v1/material-reservations/:reservationId", middlewares: [verifyToken, required(P.RESERVATIONS_WRITE)], handler: materialReservationsController.updateReservation },

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
  { method: "POST", path: "/api/v1/notifications/read", middlewares: [verifyToken, required(P.NOTIFICATIONS_WRITE)], handler: notificationsController.markManyRead },
  { method: "POST", path: "/api/v1/notifications/read-all", middlewares: [verifyToken, required(P.NOTIFICATIONS_WRITE)], handler: notificationsController.markAllRead },
  { method: "GET", path: "/api/v1/notifications/:notificationId", middlewares: [verifyToken, required(P.NOTIFICATIONS_READ)], handler: notificationsController.getNotification },
  { method: "POST", path: "/api/v1/notifications/:notificationId/read", middlewares: [verifyToken, required(P.NOTIFICATIONS_WRITE)], handler: notificationsController.markAsRead },
  { method: "POST", path: "/api/v1/notifications/:notificationId/archive", middlewares: [verifyToken, required(P.NOTIFICATIONS_WRITE)], handler: notificationsController.archiveNotification },

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

  /* Seguimiento curricular: materias, disenos, contenidos, seguimientos y
     avance. Los literales y subrutas van antes que los parametros. */
  { method: "POST", path: "/api/v1/curriculum/materias", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: seguimientoController.createSubject },
  { method: "GET", path: "/api/v1/curriculum/materias", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.listSubjects },
  { method: "GET", path: "/api/v1/curriculum/materias/:subjectId", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.getSubject },
  { method: "PATCH", path: "/api/v1/curriculum/materias/:subjectId", middlewares: [verifyToken, required(P.ACADEMICS_WRITE)], handler: seguimientoController.updateSubject },

  { method: "POST", path: "/api/v1/curriculum/disenos", middlewares: [verifyToken, required(P.CURRICULUM_MANAGE)], handler: seguimientoController.createDesign },
  { method: "GET", path: "/api/v1/curriculum/disenos", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.listDesigns },
  { method: "GET", path: "/api/v1/curriculum/disenos/:designId", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.getDesign },
  { method: "PATCH", path: "/api/v1/curriculum/disenos/:designId", middlewares: [verifyToken, required(P.CURRICULUM_MANAGE)], handler: seguimientoController.updateDesign },

  { method: "POST", path: "/api/v1/curriculum/contenidos", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: seguimientoController.createContent },
  { method: "GET", path: "/api/v1/curriculum/contenidos", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.listContents },
  { method: "GET", path: "/api/v1/curriculum/contenidos/pendientes", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.listPendingContents },
  { method: "GET", path: "/api/v1/curriculum/contenidos/:contentId/seguimientos", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.listContentTrackings },
  { method: "GET", path: "/api/v1/curriculum/contenidos/:contentId/historial", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.getContentHistory },
  { method: "GET", path: "/api/v1/curriculum/contenidos/:contentId", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.getContent },
  { method: "PATCH", path: "/api/v1/curriculum/contenidos/:contentId", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: seguimientoController.updateContent },

  { method: "POST", path: "/api/v1/curriculum/seguimientos", middlewares: [verifyToken, required(P.CURRICULUM_TRACK_WRITE)], handler: seguimientoController.createTracking },
  { method: "GET", path: "/api/v1/curriculum/seguimientos", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.listTrackings },
  { method: "GET", path: "/api/v1/curriculum/seguimientos/:trackingId", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.getTracking },
  { method: "PATCH", path: "/api/v1/curriculum/seguimientos/:trackingId", middlewares: [verifyToken, required(P.CURRICULUM_TRACK_WRITE)], handler: seguimientoController.updateTracking },

  { method: "GET", path: "/api/v1/curriculum/avance/materia", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.avanceMateria },
  { method: "GET", path: "/api/v1/curriculum/avance/curso", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.avanceCurso },
  { method: "GET", path: "/api/v1/curriculum/avance/docente", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.avanceDocente },
  { method: "GET", path: "/api/v1/curriculum/avance/periodo", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.avancePeriodo },
  { method: "GET", path: "/api/v1/curriculum/avance/pendientes", middlewares: [verifyToken, required(P.CURRICULUM_READ)], handler: seguimientoController.avancePendientes },

  /* Planificaciones docentes. Subrutas antes que :planId. */
  { method: "POST", path: "/api/v1/teacher-plans", middlewares: [verifyToken, required(P.PLANNING_WRITE)], handler: planificacionesController.createPlanning },
  { method: "GET", path: "/api/v1/teacher-plans", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.listPlannings },
  { method: "GET", path: "/api/v1/teacher-plans/by-teacher/:teacherId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.listPlanningsByTeacher },
  { method: "GET", path: "/api/v1/teacher-plans/by-subject/:subjectId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.listPlanningsBySubject },
  { method: "GET", path: "/api/v1/teacher-plans/by-course/:courseId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.listPlanningsByCourse },
  { method: "GET", path: "/api/v1/teacher-plans/by-period/:year", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.listPlanningsByPeriod },
  { method: "GET", path: "/api/v1/teacher-plans/:planId/status", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.getPlanningStatus },
  { method: "GET", path: "/api/v1/teacher-plans/:planId/history", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.getPlanningHistory },
  { method: "GET", path: "/api/v1/teacher-plans/:planId/curriculum-comparison", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.getPlanningCurriculumComparison },
  { method: "PATCH", path: "/api/v1/teacher-plans/:planId/status", middlewares: [verifyToken, required(P.PLANNING_WRITE)], handler: planificacionesController.changePlanningStatus },
  { method: "GET", path: "/api/v1/teacher-plans/:planId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: planificacionesController.getPlanning },
  { method: "PATCH", path: "/api/v1/teacher-plans/:planId", middlewares: [verifyToken, required(P.PLANNING_WRITE)], handler: planificacionesController.updatePlanning },
  { method: "DELETE", path: "/api/v1/teacher-plans/:planId", middlewares: [verifyToken, required(P.PLANNING_MANAGE)], handler: planificacionesController.archivePlanning },

  /* Control de planificaciones. Subrutas antes que :controlId. */
  { method: "POST", path: "/api/v1/planning-controls", middlewares: [verifyToken, required(P.PLANNING_REVIEW)], handler: controlPlanificacionesController.createControl },
  { method: "GET", path: "/api/v1/planning-controls", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.listControls },
  { method: "GET", path: "/api/v1/planning-controls/pending", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.listPendingControls },
  { method: "GET", path: "/api/v1/planning-controls/by-teacher/:teacherId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.listControlsByTeacher },
  { method: "GET", path: "/api/v1/planning-controls/by-subject/:subjectId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.listControlsBySubject },
  { method: "GET", path: "/api/v1/planning-controls/by-course/:courseId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.listControlsByCourse },
  { method: "GET", path: "/api/v1/planning-controls/by-period/:year", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.listControlsByPeriod },
  { method: "GET", path: "/api/v1/planning-controls/by-status/:status", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.listControlsByStatus },
  { method: "GET", path: "/api/v1/planning-controls/planning/:planId/history", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.getPlanningControlHistory },
  { method: "GET", path: "/api/v1/planning-controls/planning/:planId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.getControlByPlanning },
  { method: "GET", path: "/api/v1/planning-controls/:controlId/history", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.getControlAudit },
  { method: "PATCH", path: "/api/v1/planning-controls/:controlId/status", middlewares: [verifyToken, required(P.PLANNING_REVIEW)], handler: controlPlanificacionesController.changeControlStatus },
  { method: "GET", path: "/api/v1/planning-controls/:controlId", middlewares: [verifyToken, required(P.PLANNING_READ)], handler: controlPlanificacionesController.getControl },
  { method: "PATCH", path: "/api/v1/planning-controls/:controlId", middlewares: [verifyToken, required(P.PLANNING_REVIEW)], handler: controlPlanificacionesController.updateControl },

  /* Grupos: los literales (by-*) van antes que :groupId. */
  { method: "POST", path: "/api/v1/groups", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.createGroup },
  { method: "GET", path: "/api/v1/groups", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.listGroups },
  { method: "GET", path: "/api/v1/groups/by-student/:studentId", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.listStudentGroups },
  { method: "GET", path: "/api/v1/groups/by-course/:courseId", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.listGroupsByCourse },
  { method: "GET", path: "/api/v1/groups/by-division/:divisionId", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.listGroupsByDivision },
  { method: "POST", path: "/api/v1/groups/:groupId/members", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.addMember },
  { method: "GET", path: "/api/v1/groups/:groupId/members", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.listGroupMembers },
  { method: "DELETE", path: "/api/v1/groups/:groupId/members/:studentId", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.removeMember },
  { method: "GET", path: "/api/v1/groups/:groupId/planning", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.getGroupPlanning },
  { method: "GET", path: "/api/v1/groups/:groupId/history", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.getGroupHistory },
  { method: "PATCH", path: "/api/v1/groups/:groupId/division", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.assignToGroup },
  { method: "PATCH", path: "/api/v1/groups/:groupId/workshop", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.assignToGroup },
  { method: "PATCH", path: "/api/v1/groups/:groupId/space", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.assignToGroup },
  { method: "PATCH", path: "/api/v1/groups/:groupId/schedule", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.assignToGroup },
  { method: "POST", path: "/api/v1/groups/:groupId/activate", middlewares: [verifyToken, required(P.GROUPS_MANAGE)], handler: groupsController.activateGroup },
  { method: "POST", path: "/api/v1/groups/:groupId/deactivate", middlewares: [verifyToken, required(P.GROUPS_MANAGE)], handler: groupsController.deactivateGroup },
  { method: "POST", path: "/api/v1/groups/:groupId/finalize", middlewares: [verifyToken, required(P.GROUPS_MANAGE)], handler: groupsController.finalizeGroup },
  { method: "GET", path: "/api/v1/groups/:groupId", middlewares: [verifyToken, required(P.GROUPS_READ)], handler: groupsController.getGroup },
  { method: "PATCH", path: "/api/v1/groups/:groupId", middlewares: [verifyToken, required(P.GROUPS_WRITE)], handler: groupsController.updateGroup },

  /* Reasignaciones. Subrutas antes que :reassignmentId. */
  { method: "POST", path: "/api/v1/reassignments", middlewares: [verifyToken, required(P.REASSIGNMENTS_WRITE)], handler: reassignmentsController.createReassignment },
  { method: "GET", path: "/api/v1/reassignments", middlewares: [verifyToken, required(P.REASSIGNMENTS_READ)], handler: reassignmentsController.listReassignments },
  { method: "GET", path: "/api/v1/reassignments/current-space/:assignmentId", middlewares: [verifyToken, required(P.REASSIGNMENTS_READ)], handler: reassignmentsController.getCurrentSpace },
  { method: "GET", path: "/api/v1/reassignments/by-activity/:assignmentId", middlewares: [verifyToken, required(P.REASSIGNMENTS_READ)], handler: reassignmentsController.listReassignmentsByActivity },
  { method: "POST", path: "/api/v1/reassignments/:reassignmentId/revert", middlewares: [verifyToken, required(P.REASSIGNMENTS_WRITE)], handler: reassignmentsController.revertReassignment },
  { method: "GET", path: "/api/v1/reassignments/:reassignmentId", middlewares: [verifyToken, required(P.REASSIGNMENTS_READ)], handler: reassignmentsController.getReassignment },
  { method: "PATCH", path: "/api/v1/reassignments/:reassignmentId", middlewares: [verifyToken, required(P.REASSIGNMENTS_WRITE)], handler: reassignmentsController.updateReassignment },

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
