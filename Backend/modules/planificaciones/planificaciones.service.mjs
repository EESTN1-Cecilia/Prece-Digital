import planificacionesRepository from "./planificaciones.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import seguimientoRepository from "../seguimiento/seguimiento.repository.mjs";
import { PERMISSIONS as P, permissionsForRole } from "../../config/permissions.config.mjs";
import { HttpError } from "../../utils/http-error.mjs";

export const PLANNING_STATUSES = [
  "borrador",
  "en_revision",
  "observada",
  "aprobada",
  "finalizada",
  "archivada"
];

export const PLANNING_TRANSITIONS = {
  borrador: ["en_revision", "archivada"],
  en_revision: ["borrador", "aprobada", "observada", "archivada"],
  observada: ["borrador", "en_revision", "archivada"],
  aprobada: ["finalizada", "archivada"],
  finalizada: ["archivada"],
  archivada: []
};

export const PLANNING_PERIODS = [
  "anual",
  "primer_cuatrimestre",
  "segundo_cuatrimestre",
  "primer_trimestre",
  "segundo_trimestre",
  "tercer_trimestre"
];

export const ACTIVITY_TYPES = [
  "clase",
  "taller",
  "evaluacion",
  "tarea",
  "proyecto",
  "informe",
  "otra"
];

export const EDITABLE_STATUSES = ["borrador", "en_revision", "observada"];

export const STATUS_PERMISSION = {
  borrador: P.PLANNING_WRITE,
  en_revision: P.PLANNING_WRITE,
  observada: P.PLANNING_REVIEW,
  aprobada: P.PLANNING_REVIEW,
  finalizada: P.PLANNING_REVIEW,
  archivada: P.PLANNING_MANAGE
};

export const UNIQUE_COMBINATION = {
  enabled: true,
  fields: ["teacherId", "subjectId", "courseId", "divisionId", "year"]
};

const POR_PAGINA_DEFECTO = 20;
const POR_PAGINA_MAXIMO = 100;
const MAX_CONTENIDOS = 100;
const MAX_ACTIVIDADES = 100;
const SORT_FIELDS = ["createdAt", "updatedAt", "year", "status", "title", "period"];
const REVIEW_STATUSES = ["aprobada", "observada", "finalizada"];

function validateRequired(fields, data) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

function assertText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(422, "validation_error", `${label} es requerido`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new HttpError(422, "validation_error", `${label} no puede superar ${maxLength} caracteres`);
  }
  return text;
}

function assertOptionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  return assertText(value, label, maxLength);
}

function assertOptionalNumber(value, label, min, max) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new HttpError(422, "validation_error", `${label} debe ser un número entre ${min} y ${max}`);
  }
  return Math.round(number * 100) / 100;
}

function assertPositiveInt(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new HttpError(422, "validation_error", `${label} debe ser un entero mayor o igual a 1`);
  }
  return number;
}

function matchKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolvePlan(id) {
  const plan = planificacionesRepository.findPlanById(id);
  if (!plan) {
    throw new HttpError(404, "not_found", "Planificación no encontrada");
  }
  return plan;
}

function resolveTeacher(teacherId) {
  const teacher = teachersRepository.findById(teacherId);
  if (!teacher) {
    throw new HttpError(404, "not_found", "El docente indicado no existe");
  }
  return teacher;
}

function resolveSubject(subjectId) {
  const subject = seguimientoRepository.findSubjectById(subjectId);
  if (!subject) {
    throw new HttpError(404, "not_found", "Materia no encontrada");
  }
  return subject;
}

function schoolIdOf(user, data) {
  const schoolId = data?.schoolId ?? user.assignments?.[0]?.schoolId;
  if (!schoolId) {
    throw new HttpError(400, "validation_error", "El campo schoolId es requerido");
  }
  return schoolId;
}

function assertValidYear(year) {
  const value = Number(year);
  if (!Number.isInteger(value) || value < 2000 || value > 2100) {
    throw new HttpError(422, "validation_error", "El año de la planificación debe estar entre 2000 y 2100");
  }
  return value;
}

function assertValidPeriod(period) {
  if (period === undefined || period === null || period === "") return null;
  if (!PLANNING_PERIODS.includes(period)) {
    throw new HttpError(422, "validation_error", `Período inválido. Períodos válidos: ${PLANNING_PERIODS.join(", ")}`);
  }
  return period;
}

function assertValidStatus(status) {
  if (!PLANNING_STATUSES.includes(status)) {
    throw new HttpError(422, "validation_error", `Estado inválido. Estados válidos: ${PLANNING_STATUSES.join(", ")}`);
  }
  return status;
}

function hasPlanningPermission(user, permission) {
  return (user.assignments ?? []).some((assignment) => permissionsForRole(assignment.role).includes(permission));
}

function isDocente(user) {
  return (user.assignments ?? []).some((assignment) => assignment.role === "docente");
}

function findTeacherForUser(user) {
  const schoolId = user.assignments?.[0]?.schoolId ?? null;
  const teachers = schoolId ? teachersRepository.list({ schoolId }) : teachersRepository.list();
  return teachers.find((teacher) => teacher.userId === user.id) ?? null;
}

function docenteScope(user) {
  if (!isDocente(user)) return null;
  if (hasPlanningPermission(user, P.PLANNING_REVIEW) || hasPlanningPermission(user, P.PLANNING_MANAGE)) {
    return null;
  }
  return findTeacherForUser(user)?.id ?? "__sin_vinculo__";
}

function assertDocenteOwner(plan, user) {
  if (!isDocente(user)) return;
  const teacher = findTeacherForUser(user);
  if (!teacher || plan.teacherId !== teacher.id) {
    throw new HttpError(403, "forbidden", "Solo el docente a cargo puede operar su propia planificación");
  }
}

function assertDocenteCreatesOwn(teacherId, user) {
  if (!isDocente(user)) return;
  const teacher = findTeacherForUser(user);
  if (!teacher || teacher.id !== teacherId) {
    throw new HttpError(403, "forbidden", "El docente solo puede crear planificaciones a su nombre");
  }
}

function assertNotArchived(plan) {
  if (plan.status === "archivada") {
    throw new HttpError(409, "conflict", "La planificación está archivada y no admite cambios");
  }
}

function assertEditable(plan, user) {
  assertNotArchived(plan);
  if (EDITABLE_STATUSES.includes(plan.status)) return;
  if (!hasPlanningPermission(user, P.PLANNING_MANAGE)) {
    throw new HttpError(
      403,
      "forbidden",
      `Una planificación en estado ${plan.status} solo puede modificarse con permiso ${P.PLANNING_MANAGE}`
    );
  }
}

function assertTransitionPermission(user, targetStatus) {
  const permission = STATUS_PERMISSION[targetStatus];
  if (!hasPlanningPermission(user, permission)) {
    throw new HttpError(403, "forbidden", `No tiene permiso ${permission} para llevar la planificación a ${targetStatus}`);
  }
}

function assertTeacherAssociation({ teacherId, subjectId, courseId, divisionId, schoolId }) {
  const teacher = resolveTeacher(teacherId);
  if (!teacher.isActive) {
    throw new HttpError(422, "validation_error", "El docente indicado no está activo");
  }
  if (teacher.schoolId !== schoolId) {
    throw new HttpError(422, "validation_error", "El docente indicado no pertenece a la escuela");
  }
  const associations = teachersRepository.listSubjects({ teacherId: teacher.id, schoolId });
  const matches = associations.some(
    (association) =>
      association.subjectId === subjectId &&
      association.courseId === courseId &&
      (!divisionId || association.divisionId === divisionId)
  );
  if (!matches) {
    throw new HttpError(
      422,
      "validation_error",
      "El docente no está asociado a esa materia, curso y división"
    );
  }
  return teacher;
}

function normalizeContents(contents) {
  if (contents === undefined || contents === null) return [];
  if (!Array.isArray(contents)) {
    throw new HttpError(422, "validation_error", "Los contenidos deben ser una lista");
  }
  if (contents.length > MAX_CONTENIDOS) {
    throw new HttpError(422, "validation_error", `La planificación admite hasta ${MAX_CONTENIDOS} contenidos`);
  }
  return contents.map((item, index) => {
    const position = index + 1;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpError(422, "validation_error", `El contenido en la posición ${position} es inválido`);
    }
    return {
      name: assertText(item.name, `contenido ${position}: name`, 120),
      description: assertOptionalText(item.description, `contenido ${position}: description`, 500),
      estimatedHours: assertOptionalNumber(item.estimatedHours, `contenido ${position}: estimatedHours`, 0, 2000)
    };
  });
}

function normalizeActivities(activities) {
  if (activities === undefined || activities === null) return [];
  if (!Array.isArray(activities)) {
    throw new HttpError(422, "validation_error", "Las actividades deben ser una lista");
  }
  if (activities.length > MAX_ACTIVIDADES) {
    throw new HttpError(422, "validation_error", `La planificación admite hasta ${MAX_ACTIVIDADES} actividades`);
  }
  return activities.map((item, index) => {
    const position = index + 1;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpError(422, "validation_error", `La actividad en la posición ${position} es inválido`);
    }
    const type = item.type === undefined || item.type === null || item.type === "" ? "clase" : item.type;
    if (!ACTIVITY_TYPES.includes(type)) {
      throw new HttpError(
        422,
        "validation_error",
        `actividad ${position}: tipo inválido. Tipos válidos: ${ACTIVITY_TYPES.join(", ")}`
      );
    }
    const date = assertOptionalText(item.date, `actividad ${position}: date`, 10);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HttpError(422, "validation_error", `actividad ${position}: date debe tener el formato YYYY-MM-DD`);
    }
    return {
      name: assertText(item.name, `actividad ${position}: name`, 120),
      type,
      description: assertOptionalText(item.description, `actividad ${position}: description`, 500),
      date
    };
  });
}

function assertUniqueCombination({ schoolId, teacherId, subjectId, courseId, divisionId, year, excludeId }) {
  if (!UNIQUE_COMBINATION.enabled) return;
  const duplicate = planificacionesRepository.listPlans({ schoolId }).some(
    (plan) =>
      plan.id !== excludeId &&
      plan.teacherId === teacherId &&
      plan.subjectId === subjectId &&
      plan.courseId === courseId &&
      (plan.divisionId ?? null) === (divisionId ?? null) &&
      plan.year === year
  );
  if (duplicate) {
    throw new HttpError(
      409,
      "conflict",
      "Ya existe una planificación para ese docente, materia, curso, división y año"
    );
  }
}

function assertFiltersExist(query) {
  if (query.teacherId) {
    resolveTeacher(query.teacherId);
  }
  if (query.subjectId) {
    resolveSubject(query.subjectId);
  }
  if (query.year !== undefined && query.year !== null && query.year !== "") {
    assertValidYear(query.year);
  }
  if (query.period !== undefined && query.period !== null && query.period !== "") {
    assertValidPeriod(query.period);
  }
  if (query.status !== undefined && query.status !== null && query.status !== "") {
    assertValidStatus(query.status);
  }
}

function readPagination(query) {
  const pagina = assertPositiveInt(query.pagina ?? 1, "pagina");
  const porPagina = assertPositiveInt(query.porPagina ?? POR_PAGINA_DEFECTO, "porPagina");
  if (porPagina > POR_PAGINA_MAXIMO) {
    throw new HttpError(422, "validation_error", `porPagina no puede superar ${POR_PAGINA_MAXIMO}`);
  }
  return { pagina, porPagina, offset: (pagina - 1) * porPagina };
}

function readSort(query) {
  const field = query.orden ?? "createdAt";
  if (!SORT_FIELDS.includes(field)) {
    throw new HttpError(422, "validation_error", `Orden inválido. Campos válidos: ${SORT_FIELDS.join(", ")}`);
  }
  const direccion = query.direccion ?? "desc";
  if (!["asc", "desc"].includes(direccion)) {
    throw new HttpError(422, "validation_error", "La dirección debe ser asc o desc");
  }
  return { field, direccion, factor: direccion === "asc" ? 1 : -1 };
}

function sortPlans(plans, { field, factor }) {
  return plans.sort((a, b) => {
    const left = a[field];
    const right = b[field];
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
    return String(left).localeCompare(String(right)) * factor;
  });
}

function buildList(query, user) {
  assertFiltersExist(query);
  const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
  const teacherId = docenteScope(user) ?? query.teacherId;
  const sort = readSort(query);
  const { pagina, porPagina, offset } = readPagination(query);
  const matched = planificacionesRepository.listPlans({
    schoolId,
    teacherId,
    subjectId: query.subjectId,
    courseId: query.courseId,
    divisionId: query.divisionId,
    year: query.year,
    period: query.period,
    status: query.status
  });
  const sorted = sortPlans(matched, sort);
  const total = sorted.length;
  const items = sorted.slice(offset, offset + porPagina).map((plan) => enrichPlan(plan));
  return {
    statusCode: 200,
    body: {
      data: items,
      filtros: {
        teacherId: teacherId ?? null,
        subjectId: query.subjectId ?? null,
        courseId: query.courseId ?? null,
        divisionId: query.divisionId ?? null,
        year: query.year ? Number(query.year) : null,
        period: query.period ?? null,
        status: query.status ?? null,
        orden: sort.field,
        direccion: sort.direccion,
        pagina,
        porPagina
      },
      paginacion: {
        total,
        pagina,
        porPagina,
        totalPaginas: total === 0 ? 0 : Math.ceil(total / porPagina)
      }
    }
  };
}

function diffValues(before, after, fields) {
  return fields
    .filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null))
    .map((field) => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
}

function enrichPlan(plan) {
  const subject = seguimientoRepository.findSubjectById(plan.subjectId) ?? null;
  const teacher = teachersRepository.findById(plan.teacherId) ?? null;
  return {
    ...plan,
    subjectName: subject?.name ?? null,
    subjectCode: subject?.code ?? null,
    teacher: teacher
      ? { id: teacher.id, userId: teacher.userId, firstName: teacher.firstName, lastName: teacher.lastName }
      : null,
    historyCount: planificacionesRepository.listHistoryEntries({ planningId: plan.id }).length,
    allowedTransitions: PLANNING_TRANSITIONS[plan.status] ?? [],
    isEditable: EDITABLE_STATUSES.includes(plan.status)
  };
}

function assertNoAssociationChange(plan, data) {
  const locked = ["teacherId", "subjectId", "courseId", "divisionId", "year"];
  const changed = locked.filter(
    (field) => data[field] !== undefined && String(data[field] ?? "") !== String(plan[field] ?? "")
  );
  if (changed.length) {
    throw new HttpError(
      422,
      "validation_error",
      `La asociación de la planificación no puede modificarse: ${changed.join(", ")}`
    );
  }
}

function curriculumContentsOf(plan) {
  const designs = seguimientoRepository
    .listDesigns({
      schoolId: plan.schoolId,
      subjectId: plan.subjectId,
      courseId: plan.courseId,
      year: plan.year
    })
    .filter((design) => !plan.divisionId || !design.divisionId || design.divisionId === plan.divisionId);
  return {
    designs,
    contents: designs.flatMap((design) => seguimientoRepository.listContents({ designId: design.id, schoolId: plan.schoolId }))
  };
}

const planificacionesService = {
  createPlanning(data, user) {
    validateRequired(["title", "teacherId", "subjectId", "courseId", "year"], data);
    const schoolId = schoolIdOf(user, data);
    if (data.status !== undefined && data.status !== null) {
      if (data.status !== "borrador") {
        throw new HttpError(422, "validation_error", "Una planificación se crea en estado borrador");
      }
    }
    const subject = resolveSubject(data.subjectId);
    if (subject.schoolId !== schoolId) {
      throw new HttpError(422, "validation_error", "La materia no pertenece a la escuela indicada");
    }
    const year = assertValidYear(data.year);
    const period = assertValidPeriod(data.period);
    const divisionId = data.divisionId ?? null;
    assertDocenteCreatesOwn(data.teacherId, user);
    assertTeacherAssociation({
      teacherId: data.teacherId,
      subjectId: subject.id,
      courseId: data.courseId,
      divisionId,
      schoolId
    });
    assertUniqueCombination({
      schoolId,
      teacherId: data.teacherId,
      subjectId: subject.id,
      courseId: data.courseId,
      divisionId,
      year
    });
    const plan = planificacionesRepository.createPlan({
      title: assertText(data.title, "title", 120),
      teacherId: data.teacherId,
      subjectId: subject.id,
      courseId: data.courseId,
      divisionId,
      year,
      period,
      contents: normalizeContents(data.contents),
      activities: normalizeActivities(data.activities),
      observations: assertOptionalText(data.observations, "observations", 1000),
      status: "borrador",
      schoolId,
      createdBy: user.id
    });
    planificacionesRepository.createHistoryEntry({
      planningId: plan.id,
      type: "creacion",
      fromStatus: null,
      toStatus: "borrador",
      changes: [],
      comment: null,
      performedBy: user.id
    });
    return { statusCode: 201, body: { data: enrichPlan(plan) } };
  },

  getPlanning(id) {
    return { statusCode: 200, body: { data: enrichPlan(resolvePlan(id)) } };
  },

  listPlannings(query, user) {
    return buildList(query ?? {}, user);
  },

  listPlanningsByTeacher(teacherId, query, user) {
    resolveTeacher(teacherId);
    return buildList({ ...query, teacherId }, user);
  },

  listPlanningsBySubject(subjectId, query, user) {
    resolveSubject(subjectId);
    return buildList({ ...query, subjectId }, user);
  },

  listPlanningsByCourse(courseId, query, user) {
    if (!courseId) {
      throw new HttpError(400, "validation_error", "El campo courseId es requerido");
    }
    return buildList({ ...query, courseId }, user);
  },

  listPlanningsByPeriod(year, query, user) {
    return buildList({ ...query, year: assertValidYear(year) }, user);
  },

  updatePlanning(id, data, user) {
    const plan = resolvePlan(id);
    assertEditable(plan, user);
    assertDocenteOwner(plan, user);
    assertNoAssociationChange(plan, data);
    if (data.status !== undefined && data.status !== null) {
      throw new HttpError(422, "validation_error", "El estado de la planificación se cambia en /status");
    }
    const updates = {};
    if (data.title !== undefined) {
      updates.title = assertText(data.title, "title", 120);
    }
    if (data.period !== undefined) {
      updates.period = assertValidPeriod(data.period);
    }
    if (data.contents !== undefined) {
      updates.contents = normalizeContents(data.contents);
    }
    if (data.activities !== undefined) {
      updates.activities = normalizeActivities(data.activities);
    }
    if (data.observations !== undefined) {
      updates.observations = assertOptionalText(data.observations, "observations", 1000);
    }
    if (Object.keys(updates).length === 0) {
      return { statusCode: 200, body: { data: enrichPlan(plan) } };
    }
    const updated = planificacionesRepository.updatePlan(id, { ...updates, updatedBy: user.id });
    planificacionesRepository.createHistoryEntry({
      planningId: id,
      type: "modificacion",
      fromStatus: plan.status,
      toStatus: updated.status,
      changes: diffValues(plan, updated, Object.keys(updates)),
      comment: null,
      performedBy: user.id
    });
    return { statusCode: 200, body: { data: enrichPlan(updated) } };
  },

  changeStatus(id, data, user) {
    const plan = resolvePlan(id);
    validateRequired(["status"], data);
    const target = assertValidStatus(data.status);
    if (target === plan.status) {
      throw new HttpError(409, "conflict", `La planificación ya se encuentra en estado ${plan.status}`);
    }
    const allowed = PLANNING_TRANSITIONS[plan.status] ?? [];
    if (!allowed.includes(target)) {
      throw new HttpError(
        422,
        "validation_error",
        `Transición no permitida de ${plan.status} a ${target}. Permitidas: ${allowed.join(", ") || "ninguna"}`
      );
    }
    assertDocenteOwner(plan, user);
    assertTransitionPermission(user, target);
    const comment = assertOptionalText(data.comment, "comment", 1000);
    if (target === "observada" && !comment) {
      throw new HttpError(422, "validation_error", "Debe indicar el motivo de la observación");
    }
    const updated = planificacionesRepository.updatePlan(id, {
      status: target,
      updatedBy: user.id,
      ...(REVIEW_STATUSES.includes(target) ? { reviewedBy: user.id, reviewedAt: new Date().toISOString() } : {}),
      ...(target === "archivada" ? { archivedAt: new Date().toISOString() } : {})
    });
    planificacionesRepository.createHistoryEntry({
      planningId: id,
      type: "cambio_estado",
      fromStatus: plan.status,
      toStatus: target,
      changes: [],
      comment,
      performedBy: user.id
    });
    return { statusCode: 200, body: { data: enrichPlan(updated) } };
  },

  archivePlanning(id, data, user) {
    return planificacionesService.changeStatus(id, { ...data, status: "archivada" }, user);
  },

  getStatus(id, user) {
    const plan = resolvePlan(id);
    return {
      statusCode: 200,
      body: {
        data: {
          planningId: plan.id,
          title: plan.title,
          status: plan.status,
          isEditable: EDITABLE_STATUSES.includes(plan.status),
          requiresManageToEdit: !EDITABLE_STATUSES.includes(plan.status) && plan.status !== "archivada",
          allowedTransitions: (PLANNING_TRANSITIONS[plan.status] ?? []).map((target) => ({
            status: target,
            permission: STATUS_PERMISSION[target]
          })),
          canEditContent:
            EDITABLE_STATUSES.includes(plan.status) || hasPlanningPermission(user, P.PLANNING_MANAGE),
          reviewedBy: plan.reviewedBy,
          reviewedAt: plan.reviewedAt,
          archivedAt: plan.archivedAt,
          updatedBy: plan.updatedBy,
          updatedAt: plan.updatedAt
        }
      }
    };
  },

  getHistory(id) {
    const plan = resolvePlan(id);
    const entries = planificacionesRepository.listHistoryEntries({ planningId: plan.id });
    return {
      statusCode: 200,
      body: {
        data: {
          planningId: plan.id,
          total: entries.length,
          entries
        }
      }
    };
  },

  getCurriculumComparison(id, user) {
    const plan = resolvePlan(id);
    if (user.assignments?.[0]?.schoolId && user.assignments[0].schoolId !== plan.schoolId) {
      throw new HttpError(403, "forbidden", "La planificación pertenece a otra escuela");
    }
    const { designs, contents } = curriculumContentsOf(plan);
    const index = new Map(contents.map((content) => [matchKey(content.name), content]));
    const planificados = plan.contents.map((content) => {
      const match = index.get(matchKey(content.name)) ?? null;
      return {
        name: content.name,
        description: content.description,
        estimatedHours: content.estimatedHours,
        seguimiento: match
          ? {
              contentId: match.id,
              name: match.name,
              status: match.status,
              progress: Number(match.progress) || 0
            }
          : null
      };
    });
    const matchedNames = new Set(
      planificados.filter((item) => item.seguimiento).map((item) => matchKey(item.name))
    );
    const sinPlanificar = contents
      .filter((content) => !matchedNames.has(matchKey(content.name)))
      .map((content) => ({
        contentId: content.id,
        name: content.name,
        status: content.status,
        progress: Number(content.progress) || 0
      }));
    const conSeguimiento = planificados.filter((item) => item.seguimiento).length;
    const promedioAvance = contents.length
      ? Math.round(contents.reduce((acc, content) => acc + (Number(content.progress) || 0), 0) / contents.length)
      : 0;
    return {
      statusCode: 200,
      body: {
        data: {
          planningId: plan.id,
          teacherId: plan.teacherId,
          subjectId: plan.subjectId,
          courseId: plan.courseId,
          divisionId: plan.divisionId,
          year: plan.year,
          period: plan.period,
          status: plan.status,
          designs: designs.map((design) => ({ id: design.id, name: design.name, status: design.status })),
          planificados,
          sinPlanificar,
          resumen: {
            planificados: planificados.length,
            conSeguimiento,
            sinSeguimiento: planificados.length - conSeguimiento,
            contenidosCurriculum: contents.length,
            curriculumSinPlanificar: sinPlanificar.length,
            promedioAvance
          }
        }
      }
    };
  }
};

export default planificacionesService;
