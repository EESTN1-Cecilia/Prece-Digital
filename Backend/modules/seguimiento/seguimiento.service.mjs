import seguimientoRepository from "./seguimiento.repository.mjs";
import teachersRepository from "../teachers/teachers.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

export const CONTENT_STATUSES = [
  "no_iniciado",
  "en_desarrollo",
  "desarrollado",
  "parcialmente_desarrollado",
  "no_desarrollado",
  "reprogramado"
];

export const DISENO_STATUSES = ["borrador", "vigente", "archivado"];

export const PENDING_STATUSES = ["no_iniciado", "no_desarrollado"];

const PROGRESS_BY_STATUS = {
  no_iniciado: 0,
  en_desarrollo: 30,
  parcialmente_desarrollado: 60,
  desarrollado: 100,
  no_desarrollado: 0,
  reprogramado: 0
};

function validateRequired(fields, data) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

function normalizeName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveSubject(subjectId) {
  const subject = seguimientoRepository.findSubjectById(subjectId);
  if (!subject) {
    throw new HttpError(404, "not_found", "Materia no encontrada");
  }
  return subject;
}

function resolveDesign(designId) {
  const design = seguimientoRepository.findDesignById(designId);
  if (!design) {
    throw new HttpError(404, "not_found", "Diseño curricular no encontrado");
  }
  return design;
}

function resolveContent(contentId) {
  const content = seguimientoRepository.findContentById(contentId);
  if (!content) {
    throw new HttpError(404, "not_found", "Contenido no encontrado");
  }
  return content;
}

function resolveTeacher(teacherId) {
  const teacher = teachersRepository.findById(teacherId);
  if (!teacher) {
    throw new HttpError(404, "not_found", "El docente indicado no existe");
  }
  return teacher;
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
    throw new HttpError(422, "validation_error", "El año del diseño debe estar entre 2000 y 2100");
  }
  return value;
}

function assertValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new HttpError(422, "validation_error", "La fecha debe tener el formato YYYY-MM-DD");
  }
}

function assertValidProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new HttpError(422, "validation_error", "El avance debe ser un número entre 0 y 100");
  }
  return Math.round(progress);
}

function isDocente(user) {
  return (user.assignments ?? []).some((assignment) => assignment.role === "docente");
}

function findTeacherForUser(user) {
  const schoolId = user.assignments?.[0]?.schoolId ?? null;
  const teachers = schoolId ? teachersRepository.list({ schoolId }) : teachersRepository.list();
  return teachers.find((teacher) => teacher.userId === user.id) ?? null;
}

function assertDocenteOwner(content, user) {
  if (!isDocente(user)) {
    return;
  }
  const teacher = findTeacherForUser(user);
  if (!teacher || !content.teacherId || content.teacherId !== teacher.id) {
    throw new HttpError(403, "forbidden", "Solo el docente a cargo del contenido puede registrar seguimientos");
  }
}

function assertTeacherAssociated(teacherId, design) {
  const teacher = resolveTeacher(teacherId);
  if (!teacher.isActive) {
    throw new HttpError(422, "validation_error", "El docente indicado no está activo");
  }
  const associations = teachersRepository.listSubjects({ teacherId: teacher.id, schoolId: design.schoolId });
  if (!associations.some((ts) => ts.subjectId === design.subjectId)) {
    throw new HttpError(422, "validation_error", "El docente no está asociado a la materia del diseño");
  }
  if (design.courseId && !associations.some((ts) => ts.courseId === design.courseId)) {
    throw new HttpError(422, "validation_error", "El docente no está asociado al curso del diseño");
  }
  if (design.divisionId && !associations.some((ts) => ts.divisionId === design.divisionId)) {
    throw new HttpError(422, "validation_error", "El docente no está asociado a la división del diseño");
  }
}

function assertValidStatus(status, validStatuses, label) {
  if (!validStatuses.includes(status)) {
    throw new HttpError(422, "validation_error", `Estado inválido. Estados válidos: ${validStatuses.join(", ")}`);
  }
}

function assertFiltersExist(query) {
  if (query.subjectId) {
    resolveSubject(query.subjectId);
  }
  if (query.designId) {
    resolveDesign(query.designId);
  }
  if (query.teacherId) {
    resolveTeacher(query.teacherId);
  }
  if (query.year !== undefined && query.year !== null && query.year !== "") {
    assertValidYear(query.year);
  }
}

function computeStats(contents) {
  const total = contents.length;
  const pendientes = contents.filter((content) => PENDING_STATUSES.includes(content.status)).length;
  const desarrollados = contents.filter((content) => content.status === "desarrollado").length;
  const enProceso = contents.filter(
    (content) => content.status !== "desarrollado" && !PENDING_STATUSES.includes(content.status)
  ).length;
  const promedio = total
    ? Math.round(contents.reduce((acc, content) => acc + (Number(content.progress) || 0), 0) / total)
    : 0;
  return { total, pendientes, desarrollados, enProceso, promedio };
}

function contentsOfSubject(subjectId, schoolId, query) {
  let designs = seguimientoRepository.listDesigns({ subjectId, schoolId });
  if (query.year !== undefined && query.year !== null && query.year !== "") {
    designs = designs.filter((design) => design.year === Number(query.year));
  }
  let contents = designs.flatMap((design) => seguimientoRepository.listContents({ designId: design.id, schoolId }));
  if (query.courseId) {
    contents = contents.filter((content) => {
      const design = seguimientoRepository.findDesignById(content.designId);
      return design?.courseId === query.courseId;
    });
  }
  return contents;
}

function enrichSubject(subject) {
  const schoolId = subject.schoolId;
  const designs = seguimientoRepository.listDesigns({ subjectId: subject.id, schoolId });
  const contents = designs.flatMap((design) => seguimientoRepository.listContents({ designId: design.id, schoolId }));
  return {
    ...subject,
    designsCount: designs.length,
    ...computeStats(contents)
  };
}

function enrichDesign(design) {
  const subject = seguimientoRepository.findSubjectById(design.subjectId) ?? null;
  const contents = seguimientoRepository.listContents({ designId: design.id, schoolId: design.schoolId });
  return {
    ...design,
    subjectName: subject?.name ?? null,
    ...computeStats(contents)
  };
}

function enrichContent(content) {
  const design = seguimientoRepository.findDesignById(content.designId) ?? null;
  const subject = design ? (seguimientoRepository.findSubjectById(design.subjectId) ?? null) : null;
  const teacher = content.teacherId ? (teachersRepository.findById(content.teacherId) ?? null) : null;
  const trackings = seguimientoRepository.listTrackings({ contentId: content.id, schoolId: content.schoolId });
  const latest = trackings[trackings.length - 1] ?? null;
  return {
    id: content.id,
    designId: content.designId,
    designName: design?.name ?? null,
    subjectId: design?.subjectId ?? null,
    subjectName: subject?.name ?? null,
    courseId: design?.courseId ?? null,
    divisionId: design?.divisionId ?? null,
    year: design?.year ?? null,
    name: content.name,
    description: content.description,
    teacherId: content.teacherId,
    teacher: teacher ? { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName } : null,
    order: content.order,
    status: content.status,
    progress: Number(content.progress) || 0,
    schoolId: content.schoolId,
    createdBy: content.createdBy,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    trackingCount: trackings.length,
    lastTracking: latest
      ? { id: latest.id, status: latest.status, progress: Number(latest.progress) || 0, date: latest.date, note: latest.note }
      : null
  };
}

function enrichTracking(tracking) {
  const content = seguimientoRepository.findContentById(tracking.contentId) ?? null;
  const design = content ? (seguimientoRepository.findDesignById(content.designId) ?? null) : null;
  const subject = design ? (seguimientoRepository.findSubjectById(design.subjectId) ?? null) : null;
  return {
    id: tracking.id,
    contentId: tracking.contentId,
    contentName: content?.name ?? null,
    designId: design?.id ?? null,
    designName: design?.name ?? null,
    subjectId: design?.subjectId ?? null,
    subjectName: subject?.name ?? null,
    courseId: design?.courseId ?? null,
    year: design?.year ?? null,
    status: tracking.status,
    progress: Number(tracking.progress) || 0,
    note: tracking.note,
    date: tracking.date,
    schoolId: tracking.schoolId,
    createdBy: tracking.createdBy,
    createdAt: tracking.createdAt,
    updatedBy: tracking.updatedBy,
    updatedAt: tracking.updatedAt
  };
}

function syncContentFromTrackings(content, user) {
  const trackings = seguimientoRepository.listTrackings({ contentId: content.id, schoolId: content.schoolId });
  const latest = trackings[trackings.length - 1];
  if (!latest) {
    return content;
  }
  return seguimientoRepository.updateContent(content.id, {
    status: latest.status,
    progress: Number(latest.progress) || 0
  }, user);
}

const seguimientoService = {
  createSubject(data, user) {
    validateRequired(["name", "code"], data);
    const schoolId = schoolIdOf(user, data);
    const normalizedCode = normalizeName(data.code);
    const exists = seguimientoRepository.listSubjects({ schoolId }).some(
      (subject) => normalizeName(subject.code) === normalizedCode
    );
    if (exists) {
      throw new HttpError(409, "conflict", "Ya existe una materia con ese código en la escuela");
    }
    const subject = seguimientoRepository.createSubject({
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      schoolId
    });
    return { statusCode: 201, body: { data: enrichSubject(subject) } };
  },

  getSubject(id) {
    return { statusCode: 200, body: { data: enrichSubject(resolveSubject(id)) } };
  },

  listSubjects(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const subjects = seguimientoRepository.listSubjects({
      schoolId,
      includeInactive: query.includeInactive === "true"
    }).map(enrichSubject);
    return { statusCode: 200, body: { data: subjects } };
  },

  updateSubject(id, data) {
    const subject = resolveSubject(id);
    const updates = {};
    for (const key of ["name", "description"]) {
      if (data[key] !== undefined) {
        updates[key] = data[key];
      }
    }
    if (data.code !== undefined) {
      const normalizedCode = normalizeName(data.code);
      const duplicate = seguimientoRepository.listSubjects({ schoolId: subject.schoolId }).some(
        (other) => other.id !== subject.id && normalizeName(other.code) === normalizedCode
      );
      if (duplicate) {
        throw new HttpError(409, "conflict", "Ya existe una materia con ese código en la escuela");
      }
      updates.code = data.code;
    }
    const updated = seguimientoRepository.updateSubject(id, updates);
    return { statusCode: 200, body: { data: enrichSubject(updated) } };
  },

  createDesign(data, user) {
    validateRequired(["subjectId", "year", "courseId", "name"], data);
    const subject = resolveSubject(data.subjectId);
    const schoolId = schoolIdOf(user, data);
    if (subject.schoolId !== schoolId) {
      throw new HttpError(422, "validation_error", "La materia no pertenece a la escuela indicada");
    }
    const year = assertValidYear(data.year);
    if (data.status !== undefined) {
      assertValidStatus(data.status, DISENO_STATUSES, "diseño");
    }
    const duplicate = seguimientoRepository.listDesigns({ schoolId }).some(
      (design) => design.subjectId === subject.id && design.year === year && design.courseId === data.courseId
    );
    if (duplicate) {
      throw new HttpError(409, "conflict", "Ya existe un diseño curricular para esa materia, año y curso");
    }
    const design = seguimientoRepository.createDesign({
      subjectId: subject.id,
      year,
      courseId: data.courseId,
      divisionId: data.divisionId ?? null,
      name: data.name,
      description: data.description ?? null,
      objectives: Array.isArray(data.objectives) ? data.objectives : [],
      status: data.status ?? "borrador",
      schoolId,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: enrichDesign(design) } };
  },

  getDesign(id) {
    return { statusCode: 200, body: { data: enrichDesign(resolveDesign(id)) } };
  },

  listDesigns(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const designs = seguimientoRepository.listDesigns({
      schoolId,
      subjectId: query.subjectId,
      courseId: query.courseId,
      year: query.year,
      status: query.status
    }).map(enrichDesign);
    return { statusCode: 200, body: { data: designs } };
  },

  updateDesign(id, data) {
    const design = resolveDesign(id);
    if (data.status !== undefined) {
      assertValidStatus(data.status, DISENO_STATUSES, "diseño");
    }
    const updates = {};
    for (const key of ["name", "description", "status"]) {
      if (data[key] !== undefined) {
        updates[key] = data[key];
      }
    }
    if (data.objectives !== undefined) {
      if (!Array.isArray(data.objectives)) {
        throw new HttpError(422, "validation_error", "Los objetivos deben ser una lista");
      }
      updates.objectives = data.objectives;
    }
    const updated = seguimientoRepository.updateDesign(id, updates);
    return { statusCode: 200, body: { data: enrichDesign(updated) } };
  },

  createContent(data, user) {
    validateRequired(["designId", "name"], data);
    const design = resolveDesign(data.designId);
    if (design.status === "archivado") {
      throw new HttpError(409, "conflict", "El diseño curricular está archivado");
    }
    if (data.progress !== undefined && data.progress !== null) {
      throw new HttpError(422, "validation_error", "El avance se deriva de los seguimientos y no puede fijarse manualmente");
    }
    const status = data.status ?? "no_iniciado";
    assertValidStatus(status, CONTENT_STATUSES, "contenido");
    if (data.teacherId) {
      assertTeacherAssociated(data.teacherId, design);
    }
    const normalizedName = normalizeName(data.name);
    const duplicate = seguimientoRepository.listContents({ designId: design.id, schoolId: design.schoolId }).some(
      (content) => normalizeName(content.name) === normalizedName
    );
    if (duplicate) {
      throw new HttpError(409, "conflict", "Ya existe un contenido con ese nombre en el diseño");
    }
    const content = seguimientoRepository.createContent({
      designId: design.id,
      name: data.name,
      description: data.description ?? null,
      teacherId: data.teacherId ?? null,
      order: data.order ?? null,
      status,
      progress: PROGRESS_BY_STATUS[status] ?? 0,
      schoolId: design.schoolId,
      createdBy: user.id
    });
    return { statusCode: 201, body: { data: enrichContent(content) } };
  },

  getContent(id) {
    return { statusCode: 200, body: { data: enrichContent(resolveContent(id)) } };
  },

  listContents(query, user) {
    assertFiltersExist(query);
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let contents = seguimientoRepository.listContents({
      designId: query.designId,
      teacherId: query.teacherId,
      status: query.status,
      statuses: query.pendiente === "true" ? PENDING_STATUSES : undefined,
      schoolId
    });
    if (query.subjectId) {
      contents = contents.filter((content) => {
        const design = seguimientoRepository.findDesignById(content.designId);
        return design?.subjectId === query.subjectId;
      });
    }
    if (query.courseId) {
      contents = contents.filter((content) => {
        const design = seguimientoRepository.findDesignById(content.designId);
        return design?.courseId === query.courseId;
      });
    }
    if (query.year !== undefined && query.year !== null && query.year !== "") {
      const year = Number(query.year);
      contents = contents.filter((content) => {
        const design = seguimientoRepository.findDesignById(content.designId);
        return design?.year === year;
      });
    }
    contents.sort((a, b) => {
      const designA = seguimientoRepository.findDesignById(a.designId) ?? null;
      const designB = seguimientoRepository.findDesignById(b.designId) ?? null;
      if ((designA?.courseId ?? "") !== (designB?.courseId ?? "")) {
        return (designA?.courseId ?? "").localeCompare(designB?.courseId ?? "");
      }
      return a.name.localeCompare(b.name);
    });
    return { statusCode: 200, body: { data: contents.map(enrichContent) } };
  },

  listPendingContents(query, user) {
    assertFiltersExist(query);
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let contents = seguimientoRepository.listContents({ schoolId });
    if (query.designId) {
      contents = contents.filter((content) => content.designId === query.designId);
    }
    if (query.teacherId) {
      contents = contents.filter((content) => content.teacherId === query.teacherId);
    }
    contents = contents.filter((content) => PENDING_STATUSES.includes(content.status));
    const filtered = contents.filter((content) => {
      const design = seguimientoRepository.findDesignById(content.designId);
      if (!design) return false;
      if (query.subjectId && design.subjectId !== query.subjectId) return false;
      if (query.courseId && design.courseId !== query.courseId) return false;
      if (query.year !== undefined && query.year !== null && query.year !== "" && design.year !== Number(query.year)) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const designA = seguimientoRepository.findDesignById(a.designId) ?? null;
      const designB = seguimientoRepository.findDesignById(b.designId) ?? null;
      if ((designA?.courseId ?? "") !== (designB?.courseId ?? "")) {
        return (designA?.courseId ?? "").localeCompare(designB?.courseId ?? "");
      }
      return a.name.localeCompare(b.name);
    });
    return { statusCode: 200, body: { data: filtered.map(enrichContent) } };
  },

  updateContent(id, data, user) {
    const content = resolveContent(id);
    if (data.progress !== undefined && data.progress !== null) {
      throw new HttpError(422, "validation_error", "El avance se deriva de los seguimientos y no puede fijarse manualmente");
    }
    if (data.status !== undefined && data.status !== null) {
      throw new HttpError(422, "validation_error", "El estado se deriva de los seguimientos y no puede fijarse manualmente");
    }
    const design = seguimientoRepository.findDesignById(content.designId);
    const updates = {};
    if (data.name !== undefined) {
      const normalizedName = normalizeName(data.name);
      const duplicate = seguimientoRepository.listContents({ designId: content.designId, schoolId: content.schoolId }).some(
        (other) => other.id !== content.id && normalizeName(other.name) === normalizedName
      );
      if (duplicate) {
        throw new HttpError(409, "conflict", "Ya existe un contenido con ese nombre en el diseño");
      }
      updates.name = data.name;
    }
    if (data.description !== undefined) {
      updates.description = data.description;
    }
    if (data.order !== undefined) {
      updates.order = data.order;
    }
    if (data.teacherId !== undefined) {
      if (!data.teacherId) {
        updates.teacherId = null;
      } else {
        assertTeacherAssociated(data.teacherId, design);
        updates.teacherId = data.teacherId;
      }
    }
    const updated = seguimientoRepository.updateContent(id, updates, user);
    return { statusCode: 200, body: { data: enrichContent(updated) } };
  },

  createTracking(data, user) {
    validateRequired(["contentId", "status"], data);
    const content = resolveContent(data.contentId);
    const design = resolveDesign(content.designId);
    if (design.status === "archivado") {
      throw new HttpError(409, "conflict", "El diseño curricular está archivado");
    }
    assertDocenteOwner(content, user);
    assertValidStatus(data.status, CONTENT_STATUSES, "contenido");
    const progress = data.progress === undefined || data.progress === null
      ? PROGRESS_BY_STATUS[data.status] ?? 0
      : assertValidProgress(data.progress);
    const date = data.date ?? new Date().toISOString().slice(0, 10);
    assertValidDate(date);
    const tracking = seguimientoRepository.createTracking({
      contentId: content.id,
      status: data.status,
      progress,
      note: data.note ?? null,
      date,
      schoolId: content.schoolId,
      createdBy: user.id
    });
    seguimientoRepository.createHistoryEntry({
      contentId: content.id,
      trackingId: tracking.id,
      type: "creado",
      status: tracking.status,
      progress: tracking.progress,
      note: tracking.note,
      date: tracking.date,
      performedBy: user.id
    });
    const synced = syncContentFromTrackings(content, user);
    return {
      statusCode: 201,
      body: {
        data: {
          tracking: enrichTracking(tracking),
          content: enrichContent(synced)
        }
      }
    };
  },

  getTracking(id) {
    const tracking = seguimientoRepository.findTrackingById(id);
    if (!tracking) {
      throw new HttpError(404, "not_found", "Seguimiento no encontrado");
    }
    return { statusCode: 200, body: { data: enrichTracking(tracking) } };
  },

  listTrackings(query, user) {
    assertFiltersExist(query);
    if (query.contentId) {
      resolveContent(query.contentId);
    }
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let trackings = seguimientoRepository.listTrackings({
      contentId: query.contentId,
      status: query.status,
      schoolId
    });
    if (query.designId) {
      trackings = trackings.filter((tracking) => {
        const content = seguimientoRepository.findContentById(tracking.contentId);
        return content?.designId === query.designId;
      });
    }
    if (query.teacherId) {
      trackings = trackings.filter((tracking) => {
        const content = seguimientoRepository.findContentById(tracking.contentId);
        return content?.teacherId === query.teacherId;
      });
    }
    if (query.subjectId) {
      trackings = trackings.filter((tracking) => {
        const content = seguimientoRepository.findContentById(tracking.contentId) ?? null;
        const design = content ? (seguimientoRepository.findDesignById(content.designId) ?? null) : null;
        return design?.subjectId === query.subjectId;
      });
    }
    if (query.year !== undefined && query.year !== null && query.year !== "") {
      const year = Number(query.year);
      trackings = trackings.filter((tracking) => {
        const content = seguimientoRepository.findContentById(tracking.contentId) ?? null;
        const design = content ? (seguimientoRepository.findDesignById(content.designId) ?? null) : null;
        return design?.year === year;
      });
    }
    trackings.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { statusCode: 200, body: { data: trackings.map(enrichTracking) } };
  },

  updateTracking(id, data, user) {
    const tracking = seguimientoRepository.findTrackingById(id);
    if (!tracking) {
      throw new HttpError(404, "not_found", "Seguimiento no encontrado");
    }
    const content = resolveContent(tracking.contentId);
    assertDocenteOwner(content, user);
    const updates = {};
    if (data.status !== undefined && data.status !== null) {
      assertValidStatus(data.status, CONTENT_STATUSES, "contenido");
      updates.status = data.status;
      if (data.progress === undefined || data.progress === null) {
        updates.progress = PROGRESS_BY_STATUS[data.status] ?? 0;
      }
    }
    if (data.progress !== undefined && data.progress !== null) {
      updates.progress = assertValidProgress(data.progress);
    }
    if (data.note !== undefined) {
      updates.note = data.note;
    }
    if (data.date !== undefined && data.date !== null) {
      assertValidDate(data.date);
      updates.date = data.date;
    }
    const updated = seguimientoRepository.updateTracking(id, updates, user);
    seguimientoRepository.createHistoryEntry({
      contentId: content.id,
      trackingId: updated.id,
      type: "actualizado",
      status: updated.status,
      progress: updated.progress,
      note: updated.note,
      date: updated.date,
      performedBy: user.id
    });
    const synced = syncContentFromTrackings(content, user);
    return {
      statusCode: 200,
      body: {
        data: {
          tracking: enrichTracking(updated),
          content: enrichContent(synced)
        }
      }
    };
  },

  getContentHistory(contentId) {
    const content = resolveContent(contentId);
    const history = seguimientoRepository.listHistoryEntries({ contentId: content.id });
    return {
      statusCode: 200,
      body: {
        data: {
          contentId: content.id,
          entries: history
        }
      }
    };
  },

  listContentTrackings(contentId, user) {
    const content = resolveContent(contentId);
    const trackings = seguimientoRepository.listTrackings({
      contentId: content.id,
      schoolId: user.assignments?.[0]?.schoolId ?? null
    });
    return { statusCode: 200, body: { data: trackings.map(enrichTracking) } };
  },

  avanceMateria(query, user) {
    assertFiltersExist(query);
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const subjects = seguimientoRepository.listSubjects({ schoolId });
    const items = subjects.map((subject) => {
      const contents = contentsOfSubject(subject.id, schoolId, query);
      return {
        subjectId: subject.id,
        name: subject.name,
        code: subject.code,
        courseIds: contents.length ? [...new Set(contents.map((content) => {
          const design = seguimientoRepository.findDesignById(content.designId);
          return design?.courseId ?? null;
        }).filter(Boolean))] : [],
        ...computeStats(contents)
      };
    });
    const allContents = subjects.flatMap((subject) => contentsOfSubject(subject.id, schoolId, query));
    return {
      statusCode: 200,
      body: {
        data: {
          items,
          resumen: {
            materias: subjects.length,
            ...computeStats(allContents)
          }
        }
      }
    };
  },

  avanceCurso(query, user) {
    assertFiltersExist(query);
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let contents = seguimientoRepository.listContents({ schoolId });
    if (query.year !== undefined && query.year !== null && query.year !== "") {
      const year = Number(query.year);
      contents = contents.filter((content) => {
        const design = seguimientoRepository.findDesignById(content.designId);
        return design?.year === year;
      });
    }
    const byCourse = new Map();
    for (const content of contents) {
      const design = seguimientoRepository.findDesignById(content.designId) ?? null;
      const courseId = design?.courseId ?? "sin_curso";
      if (!byCourse.has(courseId)) {
        byCourse.set(courseId, []);
      }
      byCourse.get(courseId).push(content);
    }
    const items = [...byCourse.entries()].map(([courseId, courseContents]) => {
      const subjectIds = [...new Set(courseContents.map((content) => {
        const design = seguimientoRepository.findDesignById(content.designId);
        return design?.subjectId ?? null;
      }).filter(Boolean))];
      const subjectNames = subjectIds.map((subjectId) => {
        const subject = seguimientoRepository.findSubjectById(subjectId);
        return subject?.name ?? null;
      }).filter(Boolean);
      return {
        courseId,
        subjectIds,
        subjectNames,
        ...computeStats(courseContents)
      };
    });
    return {
      statusCode: 200,
      body: {
        data: {
          items,
          resumen: computeStats(contents)
        }
      }
    };
  },

  avanceDocente(query, user) {
    assertFiltersExist(query);
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let contents = seguimientoRepository.listContents({ schoolId });
    if (query.year !== undefined && query.year !== null && query.year !== "") {
      const year = Number(query.year);
      contents = contents.filter((content) => {
        const design = seguimientoRepository.findDesignById(content.designId);
        return design?.year === year;
      });
    }
    const byTeacher = new Map();
    for (const content of contents) {
      const key = content.teacherId ?? "sin_docente";
      if (!byTeacher.has(key)) {
        byTeacher.set(key, []);
      }
      byTeacher.get(key).push(content);
    }
    const items = [...byTeacher.entries()].map(([teacherId, teacherContents]) => {
      const teacher = teacherId !== "sin_docente" ? (teachersRepository.findById(teacherId) ?? null) : null;
      return {
        teacherId: teacherId === "sin_docente" ? null : teacherId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
        ...computeStats(teacherContents)
      };
    }).sort((a, b) => (a.teacherName ?? "").localeCompare(b.teacherName ?? ""));
    return {
      statusCode: 200,
      body: {
        data: {
          items,
          resumen: computeStats(contents)
        }
      }
    };
  },

  avancePeriodo(query, user) {
    assertFiltersExist(query);
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let contents = seguimientoRepository.listContents({ schoolId });
    if (query.courseId) {
      contents = contents.filter((content) => {
        const design = seguimientoRepository.findDesignById(content.designId);
        return design?.courseId === query.courseId;
      });
    }
    const byYear = new Map();
    for (const content of contents) {
      const design = seguimientoRepository.findDesignById(content.designId) ?? null;
      const year = design?.year ?? 0;
      if (!byYear.has(year)) {
        byYear.set(year, []);
      }
      byYear.get(year).push(content);
    }
    const items = [...byYear.entries()].map(([year, yearContents]) => ({
      year,
      ...computeStats(yearContents)
    })).sort((a, b) => a.year - b.year);
    return {
      statusCode: 200,
      body: {
        data: {
          items,
          resumen: computeStats(contents)
        }
      }
    };
  },

  avancePendientes(query, user) {
    assertFiltersExist(query);
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    let contents = seguimientoRepository.listContents({ schoolId })
      .filter((content) => PENDING_STATUSES.includes(content.status));
    if (query.designId) {
      contents = contents.filter((content) => content.designId === query.designId);
    }
    if (query.teacherId) {
      contents = contents.filter((content) => content.teacherId === query.teacherId);
    }
    const grouped = new Map();
    for (const content of contents) {
      const design = seguimientoRepository.findDesignById(content.designId) ?? null;
      if (!design) continue;
      if (query.subjectId && design.subjectId !== query.subjectId) continue;
      if (query.courseId && design.courseId !== query.courseId) continue;
      if (query.year !== undefined && query.year !== null && query.year !== "" && design.year !== Number(query.year)) continue;
      const key = `${design.courseId ?? "sin_curso"}|${design.subjectId}|${content.teacherId ?? "sin_docente"}`;
      if (!grouped.has(key)) {
        const subject = seguimientoRepository.findSubjectById(design.subjectId) ?? null;
        const teacher = content.teacherId ? (teachersRepository.findById(content.teacherId) ?? null) : null;
        grouped.set(key, {
          courseId: design.courseId ?? null,
          subjectId: design.subjectId,
          subjectName: subject?.name ?? null,
          teacherId: content.teacherId ?? null,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null
        });
      }
      grouped.get(key).count = (grouped.get(key).count ?? 0) + 1;
    }
    const items = [...grouped.values()].sort((a, b) => {
      if ((a.courseId ?? "") !== (b.courseId ?? "")) {
        return (a.courseId ?? "").localeCompare(b.courseId ?? "");
      }
      return (a.subjectName ?? "").localeCompare(b.subjectName ?? "");
    });
    return {
      statusCode: 200,
      body: {
        data: {
          total: items.reduce((acc, item) => acc + (item.count ?? 0), 0),
          items
        }
      }
    };
  }
};

export default seguimientoService;