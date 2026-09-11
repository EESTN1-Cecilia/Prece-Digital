import { healthCheck } from "../controllers/health.controller.mjs";
import { listModules, listRoles } from "../controllers/catalog.controller.mjs";
import { listStudents } from "../controllers/students.controller.mjs";
import { listarCurso, listarDivision, listarGrupo, listarTaller } from "../modules/students/students.controller.mjs";
import { crearAlumno, listarAlumnos, obtenerAlumno, modificarAlumno, desactivarAlumno } from "../modules/students/students.controller.mjs";
import { verifyToken } from "../middlewares/auth.middleware.mjs";
import { authorize } from "../middlewares/authorize.middleware.mjs";
import { PERMISSIONS as P, ROLES } from "../config/permissions.config.mjs";

import * as authController from "../modules/auth/auth.controller.mjs";
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
import * as authorizationController from "../controllers/authorization.controller.mjs";
import { requierePermiso, requiereSesion } from "../middlewares/authorization.middleware.mjs";

const required = (permission, roles) => authorize({ permission, roles });
const scoped = (permission, roles) => authorize({ permission, roles });

export const apiRoutes = [
  { method: "GET", path: "/health", handler: healthCheck },
  { method: "GET", path: "/api/v1/modules", handler: listModules },
  { method: "GET", path: "/api/v1/roles", handler: listRoles },
  { method: "GET", path: "/api/v1/authorization/me", handler: requiereSesion(authorizationController.getMe) },
  { method: "GET", path: "/api/v1/authorization/modules", handler: requierePermiso("identity:read", authorizationController.getModules) },
  { method: "GET", path: "/api/v1/authorization/roles", handler: requierePermiso("identity:read", authorizationController.getRoles) },
  { method: "GET", path: "/api/v1/authorization/permissions", handler: requierePermiso("identity:read", authorizationController.getPermissions) },
  { method: "GET", path: "/api/v1/authorization/roles/:codigo/permissions", handler: requierePermiso("identity:read", authorizationController.getRolePermissions) },
  { method: "PUT", path: "/api/v1/authorization/roles/:codigo/permissions", handler: requierePermiso("identity:update", authorizationController.putRolePermissions) },

  { method: "POST", path: "/api/v1/auth/login", handler: authController.login },
  { method: "POST", path: "/api/v1/auth/refresh", handler: authController.refresh },
  { method: "POST", path: "/api/v1/auth/logout", handler: authController.logout },
  { method: "GET", path: "/api/v1/auth/me", middlewares: [verifyToken], handler: authController.me },
  { method: "GET", path: "/api/v1/users", middlewares: [verifyToken, required(P.USERS_READ)], handler: authController.listUsers },
  { method: "PATCH", path: "/api/v1/users/:userId/deactivate", middlewares: [verifyToken, required(P.USERS_DEACTIVATE)], handler: authController.deactivateUser },

  { method: "GET", path: "/api/v1/schools/:schoolId/courses/:courseId/divisions/:divisionId/students", middlewares: [verifyToken, scoped(P.STUDENTS_READ)], handler: listStudents },
  { method: "GET", path: "/api/v1/students/listas/curso", handler: listarCurso },
  { method: "GET", path: "/api/v1/students/listas/division", handler: listarDivision },
  { method: "GET", path: "/api/v1/students/listas/grupo", handler: listarGrupo },
  { method: "GET", path: "/api/v1/students/listas/taller", handler: listarTaller },
  { method: "POST", path: "/api/v1/students", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: crearAlumno },
  { method: "GET", path: "/api/v1/students", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: listarAlumnos },
  { method: "GET", path: "/api/v1/students/:studentId", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: obtenerAlumno },
  { method: "PATCH", path: "/api/v1/students/:studentId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: modificarAlumno },
  { method: "DELETE", path: "/api/v1/students/:studentId", middlewares: [verifyToken, required(P.STUDENTS_WRITE)], handler: desactivarAlumno },

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
  { method: "POST", path: "/api/v1/notifications/:notificationId/read", middlewares: [verifyToken, required(P.NOTIFICATIONS_WRITE)], handler: notificationsController.markAsRead },
  { method: "POST", path: "/api/v1/notifications/read-all", middlewares: [verifyToken, required(P.NOTIFICATIONS_WRITE)], handler: notificationsController.markAllRead },

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
  { method: "PATCH", path: "/api/v1/curriculum/activities/:activityId", middlewares: [verifyToken, required(P.CURRICULUM_WRITE)], handler: curriculumController.updateActivity }
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

export function matchRoute(method, pathname) {
  const pathTokens = tokenize(pathname);

  for (const route of apiRoutes) {
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
