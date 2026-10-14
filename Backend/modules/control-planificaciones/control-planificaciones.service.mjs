import controlPlanificacionesRepository from "./control-planificaciones.repository.mjs";
import planificacionesRepository from "../planificaciones/planificaciones.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import seguimientoRepository from "../seguimiento/seguimiento.repository.mjs";
import { PLANNING_PERIODS } from "../planificaciones/planificaciones.service.mjs";
import { PERMISSIONS as P, permissionsForRole } from "../../config/permissions.config.mjs";
import { HttpError } from "../../utils/http-error.mjs";

export const CONTROL_STATUSES = [
  "pendiente",
  "en_revision",
  "aprobada",
  "aprobada_con_observaciones",
  "requiere_correccion",
  "finalizada"
];

export const CONTROL_TRANSITIONS = {
  pendiente: ["en_revision"],
  en_revision: ["aprobada", "aprobada_con_observaciones", "requiere_correccion"],
  requiere_correccion: ["en_revision"],
  aprobada: ["finalizada"],
  aprobada_con_observaciones: ["finalizada"],
  finalizada: []
};

export const CURRICULUM_MATCH_VALUES = ["total", "parcial", "no_coincide", "no_evaluado"];

export const STATUS_PERMISSION = {
  pendiente: P.PLANNING_REVIEW,
  en_revision: P.PLANNING_REVIEW,
  requiere_correccion: P.PLANNING_REVIEW,
  aprobada: P.PLANNING_REVIEW,
  aprobada_con_observaciones: P.PLANNING_REVIEW,
  finalizada: P.PLANNING_MANAGE
};

export const ALLOW_MULTIPLE_REVIEWS = true;

const OPEN_STATUSES = ["pendiente", "en_revision"];
const CREATION_STATUSES = ["pendiente", "en_revision"];
const MAX_CONTENTS = 100;
const POR_PAGINA_DEFECTO = 20;
const POR_PAGINA_MAXIMO = 100;
const SORT_FIELDS = ["createdAt", "updatedAt", "reviewDate", "status", "year", "curriculumMatch"];

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function assertValidReviewDate(value) {
  const date = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new HttpError(422, "validation_error", "La fecha de revisión debe tener el formato YYYY-MM-DD");
  }
  if (date > today()) {
    throw new HttpError(422, "validation_error", "La fecha de revisión no puede ser futura");
  }
  return date;
}

function assertValidYear(year) {
  const value = Number(year);
  if (!Number.isInteger(value) || value < 2000 || value > 2100) {
    throw new HttpError(422, "validation_error", "El año debe estar entre 2000 y 2100");
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
  if (!CONTROL_STATUSES.includes(status)) {
    throw new HttpError(422, "validation_error", `Estado inválido. Estados válidos: ${CONTROL_STATUSES.join(", ")}`);
  }
  return status;
}

function assertValidMatch(curriculumMatch) {
  if (!CURRICULUM_MATCH_VALUES.includes(curriculumMatch)) {
    throw new HttpError(
      422,
      "validation_error",
      `Correspondencia inválida. Valores válidos: ${CURRICULUM_MATCH_VALUES.join(", ")}`
    );
  }
  return curriculumMatch;
}

function hasPlanningPermission(user, permission) {
  return (user.assignments ?? []).some((assignment) => permissionsForRole(assignment.role).includes(permission));
}

function resolveControl(id) {
  const control = controlPlanificacionesRepository.findControlById(id);
  if (!control) {
    throw new HttpError(404, "not_found", "Control de planificación no encontrado");
  }
  return control;
}

function resolvePlanning(planningId) {
  const planning = planificacionesRepository.findPlanById(planningId);
  if (!planning) {
    throw new HttpError(404, "not_found", "Planificación no encontrada");
  }
  return planning;
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

function assertSchoolScope(record, user) {
  const schoolId = user.assignments?.[0]?.schoolId ?? null;
  if (schoolId && record.schoolId !== schoolId) {
    throw new HttpError(403, "forbidden", "El registro pertenece a otra escuela");
  }
}

function assertTransitionPermission(user, targetStatus) {
  const permission = STATUS_PERMISSION[targetStatus];
  if (!hasPlanningPermission(user, permission)) {
    throw new HttpError(403, "forbidden", `No tiene permiso ${permission} para llevar el control a ${targetStatus}`);
  }
}

function vigenteDesignsOf(planning) {
  const designs = seguimientoRepository
    .listDesigns({
      schoolId: planning.schoolId,
      subjectId: planning.subjectId,
      courseId: planning.courseId,
      year: planning.year
    })
    .filter((design) => !planning.divisionId || !design.divisionId || design.divisionId === planning.divisionId);
  if (!designs.length) {
    throw new HttpError(
      422,
      "validation_error",
      "No existe un diseño curricular vigente para la materia, curso y año de la planificación"
    );
  }
  return designs;
}

function curriculumContentsOf(designs, schoolId) {
  return designs.flatMap((design) => seguimientoRepository.listContents({ designId: design.id, schoolId }));
}

function normalizeContents(contents, planning, designs) {
  if (!Array.isArray(contents) || contents.length === 0) {
    throw new HttpError(422, "validation_error", "Los contenidos revisados deben ser una lista no vacía");
  }
  if (contents.length > MAX_CONTENTS) {
    throw new HttpError(422, "validation_error", `El control admite hasta ${MAX_CONTENTS} contenidos`);
  }
  const plannedNames = new Set((planning.contents ?? []).map((item) => matchKey(item.name)));
  const curriculumById = new Map(
    curriculumContentsOf(designs, planning.schoolId).map((content) => [content.id, content])
  );
  return contents.map((item, index) => {
    const position = index + 1;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpError(422, "validation_error", `El contenido revisado en la posición ${position} es inválido`);
    }
    const name = assertText(item.name, `contenido ${position}: name`, 120);
    const plannedContentName = assertOptionalText(
      item.plannedContentName,
      `contenido ${position}: plannedContentName`,
      120
    );
    if (plannedContentName && !plannedNames.has(matchKey(plannedContentName))) {
      throw new HttpError(
        422,
        "validation_error",
        `contenido ${position}: plannedContentName no corresponde a un contenido de la planificación`
      );
    }
    const curriculumContentId = item.curriculumContentId ?? null;
    if (curriculumContentId) {
      const curriculumContent = curriculumById.get(curriculumContentId);
      if (!curriculumContent) {
        throw new HttpError(
          422,
          "validation_error",
          `contenido ${position}: curriculumContentId no pertenece al diseño curricular vigente`
        );
      }
      if (matchKey(curriculumContent.name) !== matchKey(name)) {
        throw new HttpError(
          422,
          "validation_error",
          `contenido ${position}: el contenido curricular no corresponde al nombre revisado`
        );
      }
    }
    return {
      name,
      description: assertOptionalText(item.description, `contenido ${position}: description`, 500),
      plannedContentName,
      curriculumContentId,
      evaluated: item.evaluated === true
    };
  });
}

function assertMatchRules({ contents, curriculumMatch, observations, status }) {
  const evaluated = contents.filter((item) => item.evaluated);
  if (curriculumMatch === "total") {
    if (evaluated.length !== contents.length || contents.some((item) => !item.curriculumContentId)) {
      throw new HttpError(
        422,
        "validation_error",
        "La coincidencia total exige todos los contenidos evaluados y vinculados al diseño curricular"
      );
    }
  }
  if (curriculumMatch === "parcial") {
    if (!evaluated.length) {
      throw new HttpError(422, "validation_error", "La coincidencia parcial exige al menos un contenido evaluado");
    }
    if (!observations) {
      throw new HttpError(422, "validation_error", "La coincidencia parcial exige registrar observaciones");
    }
  }
  if (curriculumMatch === "no_coincide" && !observations) {
    throw new HttpError(422, "validation_error", "La ausencia de correspondencia exige registrar observaciones");
  }
  if (status === "requiere_correccion" && !observations) {
    throw new HttpError(422, "validation_error", "Una revisión que requiere corrección debe registrar observaciones");
  }
}

function assertNoOpenControl(planningId) {
  const existing = controlPlanificacionesRepository.listControls({ planningId });
  if (!ALLOW_MULTIPLE_REVIEWS) {
    if (existing.length) {
      throw new HttpError(409, "conflict", "La planificación ya tiene un control de revisión registrado");
    }
    return;
  }
  if (existing.some((control) => OPEN_STATUSES.includes(control.status))) {
    throw new HttpError(409, "conflict", "La planificación ya tiene un control de revisión en curso");
  }
}

function assertFiltersExist(query) {
  if (query.planningId) {
    resolvePlanning(query.planningId);
  }
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
  if (query.curriculumMatch !== undefined && query.curriculumMatch !== null && query.curriculumMatch !== "") {
    assertValidMatch(query.curriculumMatch);
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

function sortControls(controls, { field, factor }) {
  return controls.sort((a, b) => {
    const left = a[field];
    const right = b[field];
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
    return String(left).localeCompare(String(right)) * factor;
  });
}

function diffValues(before, after, fields) {
  return fields
    .filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null))
    .map((field) => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
}

function enrichControl(control) {
  const planning = planificacionesRepository.findPlanById(control.planningId) ?? null;
  const teacher = teachersRepository.findById(control.teacherId) ?? null;
  const subject = seguimientoRepository.findSubjectById(control.subjectId) ?? null;
  return {
    ...control,
    planningTitle: planning?.title ?? null,
    planningStatus: planning?.status ?? null,
    teacher: teacher
      ? { id: teacher.id, userId: teacher.userId, firstName: teacher.firstName, lastName: teacher.lastName }
      : null,
    subjectName: subject?.name ?? null,
    subjectCode: subject?.code ?? null,
    historyCount: controlPlanificacionesRepository.listHistoryEntries({ controlId: control.id }).length,
    allowedTransitions: CONTROL_TRANSITIONS[control.status] ?? [],
    isEditable: control.status !== "finalizada"
  };
}

function buildList(query, user) {
  assertFiltersExist(query);
  const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
  const sort = readSort(query);
  const { pagina, porPagina, offset } = readPagination(query);
  const statuses = query.pendiente === "true" ? OPEN_STATUSES : undefined;
  const matched = controlPlanificacionesRepository.listControls({
    schoolId,
    planningId: query.planningId,
    teacherId: query.teacherId,
    subjectId: query.subjectId,
    courseId: query.courseId,
    divisionId: query.divisionId,
    year: query.year,
    period: query.period,
    status: statuses ? undefined : query.status,
    statuses,
    curriculumMatch: query.curriculumMatch
  });
  const sorted = sortControls(matched, sort);
  const total = sorted.length;
  const items = sorted.slice(offset, offset + porPagina).map((control) => enrichControl(control));
  return {
    statusCode: 200,
    body: {
      data: items,
      filtros: {
        planningId: query.planningId ?? null,
        teacherId: query.teacherId ?? null,
        subjectId: query.subjectId ?? null,
        courseId: query.courseId ?? null,
        divisionId: query.divisionId ?? null,
        year: query.year ? Number(query.year) : null,
        period: query.period ?? null,
        status: query.status ?? null,
        curriculumMatch: query.curriculumMatch ?? null,
        pendiente: query.pendiente === "true",
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

function registerHistory(control, type, { fromStatus = null, toStatus = null, changes = [], comment = null, user }) {
  return controlPlanificacionesRepository.createHistoryEntry({
    controlId: control.id,
    planningId: control.planningId,
    type,
    fromStatus,
    toStatus,
    changes,
    comment,
    performedBy: user.id
  });
}

const controlPlanificacionesService = {
  createControl(data, user) {
    validateRequired(["planningId", "contents"], data);
    const planning = resolvePlanning(data.planningId);
    assertSchoolScope(planning, user);
    const teacher = resolveTeacher(planning.teacherId);
    if (!teacher.isActive) {
      throw new HttpError(422, "validation_error", "El docente responsable de la planificación no está activo");
    }
    const subject = resolveSubject(planning.subjectId);
    if (subject.schoolId !== planning.schoolId) {
      throw new HttpError(422, "validation_error", "La materia de la planificación no pertenece a la escuela");
    }
    assertValidYear(planning.year);
    assertValidPeriod(planning.period);
    const designs = vigenteDesignsOf(planning);
    const status = data.status ?? "pendiente";
    if (!CREATION_STATUSES.includes(status)) {
      throw new HttpError(
        422,
        "validation_error",
        `El control se crea en pendiente o en_revision. Estados válidos de creación: ${CREATION_STATUSES.join(", ")}`
      );
    }
    assertValidStatus(status);
    const curriculumMatch = assertValidMatch(data.curriculumMatch ?? "no_evaluado");
    const contents = normalizeContents(data.contents, planning, designs);
    const observations = assertOptionalText(data.observations, "observations", 1000);
    const reviewDate = data.reviewDate === undefined || data.reviewDate === null
      ? today()
      : assertValidReviewDate(data.reviewDate);
    assertMatchRules({ contents, curriculumMatch, observations, status });
    assertNoOpenControl(planning.id);
    const control = controlPlanificacionesRepository.createControl({
      planningId: planning.id,
      teacherId: planning.teacherId,
      subjectId: planning.subjectId,
      courseId: planning.courseId,
      divisionId: planning.divisionId ?? null,
      year: planning.year,
      period: planning.period ?? null,
      designIds: designs.map((design) => design.id),
      contents,
      curriculumMatch,
      observations,
      status,
      reviewDate,
      reviewedBy: user.id,
      schoolId: planning.schoolId,
      createdBy: user.id
    });
    registerHistory(control, "creacion", { toStatus: status, user });
    return { statusCode: 201, body: { data: enrichControl(control) } };
  },

  getControl(id, user) {
    const control = resolveControl(id);
    assertSchoolScope(control, user);
    return { statusCode: 200, body: { data: enrichControl(control) } };
  },

  listControls(query, user) {
    return buildList(query ?? {}, user);
  },

  listPendingControls(query, user) {
    return buildList({ ...query, pendiente: "true", status: undefined }, user);
  },

  listControlsByTeacher(teacherId, query, user) {
    resolveTeacher(teacherId);
    return buildList({ ...query, teacherId }, user);
  },

  listControlsBySubject(subjectId, query, user) {
    resolveSubject(subjectId);
    return buildList({ ...query, subjectId }, user);
  },

  listControlsByCourse(courseId, query, user) {
    if (!courseId) {
      throw new HttpError(400, "validation_error", "El campo courseId es requerido");
    }
    return buildList({ ...query, courseId }, user);
  },

  listControlsByPeriod(year, query, user) {
    return buildList({ ...query, year: assertValidYear(year) }, user);
  },

  listControlsByStatus(status, query, user) {
    assertValidStatus(status);
    return buildList({ ...query, status }, user);
  },

  getControlByPlanning(planningId, user) {
    const planning = resolvePlanning(planningId);
    assertSchoolScope(planning, user);
    const controls = controlPlanificacionesRepository.listControls({ planningId: planning.id }).sort((a, b) => {
      if (a.reviewDate !== b.reviewDate) return a.reviewDate < b.reviewDate ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    const latest = controls[0];
    if (!latest) {
      throw new HttpError(404, "not_found", "La planificación no tiene controles de revisión");
    }
    return { statusCode: 200, body: { data: enrichControl(latest) } };
  },

  getPlanningControlHistory(planningId, user) {
    const planning = resolvePlanning(planningId);
    assertSchoolScope(planning, user);
    const controls = sortControls(controlPlanificacionesRepository.listControls({ planningId: planning.id }), {
      field: "reviewDate",
      factor: -1
    });
    return {
      statusCode: 200,
      body: {
        data: {
          planningId: planning.id,
          planningStatus: planning.status,
          total: controls.length,
          entries: controls.map((control) => enrichControl(control))
        }
      }
    };
  },

  getControlAudit(id, user) {
    const control = resolveControl(id);
    assertSchoolScope(control, user);
    const entries = controlPlanificacionesRepository.listHistoryEntries({ controlId: control.id });
    return {
      statusCode: 200,
      body: {
        data: {
          controlId: control.id,
          planningId: control.planningId,
          total: entries.length,
          entries
        }
      }
    };
  },

  updateControl(id, data, user) {
    const control = resolveControl(id);
    assertSchoolScope(control, user);
    if (control.status === "finalizada") {
      throw new HttpError(409, "conflict", "El control está finalizado y no admite cambios");
    }
    if (data.status !== undefined && data.status !== null) {
      throw new HttpError(422, "validation_error", "El estado del control se cambia en /status");
    }
    if (data.planningId !== undefined && data.planningId !== control.planningId) {
      throw new HttpError(422, "validation_error", "El control no puede reasignarse a otra planificación");
    }
    const planning = resolvePlanning(control.planningId);
    assertSchoolScope(planning, user);
    const designs = vigenteDesignsOf(planning);
    const contents = data.contents === undefined
      ? control.contents
      : normalizeContents(data.contents, planning, designs);
    const curriculumMatch = data.curriculumMatch === undefined
      ? control.curriculumMatch
      : assertValidMatch(data.curriculumMatch);
    const observations = data.observations === undefined
      ? control.observations
      : assertOptionalText(data.observations, "observations", 1000);
    const reviewDate = data.reviewDate === undefined ? control.reviewDate : assertValidReviewDate(data.reviewDate);
    assertMatchRules({ contents, curriculumMatch, observations, status: control.status });
    const updates = {};
    if (data.contents !== undefined) {
      updates.contents = contents;
    }
    if (data.curriculumMatch !== undefined) {
      updates.curriculumMatch = curriculumMatch;
    }
    if (data.observations !== undefined) {
      updates.observations = observations;
    }
    if (data.reviewDate !== undefined) {
      updates.reviewDate = reviewDate;
    }
    if (!Object.keys(updates).length) {
      return { statusCode: 200, body: { data: enrichControl(control) } };
    }
    const updated = controlPlanificacionesRepository.updateControl(id, { ...updates, updatedBy: user.id });
    registerHistory(updated, "actualizacion", {
      fromStatus: control.status,
      toStatus: updated.status,
      changes: diffValues(control, updated, Object.keys(updates)),
      user
    });
    return { statusCode: 200, body: { data: enrichControl(updated) } };
  },

  changeStatus(id, data, user) {
    const control = resolveControl(id);
    assertSchoolScope(control, user);
    validateRequired(["status"], data);
    const target = assertValidStatus(data.status);
    if (target === control.status) {
      throw new HttpError(409, "conflict", `El control ya se encuentra en estado ${control.status}`);
    }
    const allowed = CONTROL_TRANSITIONS[control.status] ?? [];
    if (!allowed.includes(target)) {
      throw new HttpError(
        422,
        "validation_error",
        `Transición no permitida de ${control.status} a ${target}. Permitidas: ${allowed.join(", ") || "ninguna"}`
      );
    }
    assertTransitionPermission(user, target);
    const comment = assertOptionalText(data.comment, "comment", 1000);
    const updates = { status: target, reviewedBy: user.id };
    const changes = [];
    if (data.observations !== undefined && data.observations !== null) {
      updates.observations = assertOptionalText(data.observations, "observations", 1000);
      changes.push({ field: "observations", before: control.observations, after: updates.observations });
    }
    const observations = updates.observations ?? control.observations;
    if (target === "requiere_correccion" && !observations) {
      throw new HttpError(422, "validation_error", "Una revisión que requiere corrección debe registrar observaciones");
    }
    if (target === "aprobada_con_observaciones" && !observations) {
      throw new HttpError(422, "validation_error", "Una aprobación con observaciones debe registrar observaciones");
    }
    const updated = controlPlanificacionesRepository.updateControl(id, updates);
    registerHistory(updated, "cambio_estado", {
      fromStatus: control.status,
      toStatus: target,
      changes,
      comment,
      user
    });
    return { statusCode: 200, body: { data: enrichControl(updated) } };
  }
};

export default controlPlanificacionesService;
