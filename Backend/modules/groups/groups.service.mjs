import groupsRepository from "./groups.repository.mjs";
import spacesRepository from "../spaces/spaces.repository.mjs";
import schedulesRepository from "../schedules/schedules.repository.mjs";
import workshopsRepository from "../workshops/workshops.repository.mjs";
import { HttpError } from "../../utils/http-error.mjs";

export const GROUP_TYPES = ["curso", "burbuja", "taller", "temporal", "otro"];
export const GROUP_STATUSES = ["activo", "inactivo", "finalizado"];
export const ASSIGNABLE_FIELDS = ["courseId", "divisionId", "workshopId", "spaceId", "scheduleId"];

function validateRequired(fields, data) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      throw new HttpError(400, "validation_error", `El campo ${field} es requerido`);
    }
  }
}

function validateType(type) {
  if (!GROUP_TYPES.includes(type)) {
    throw new HttpError(400, "validation_error", `Tipo de grupo inválido. Tipos válidos: ${GROUP_TYPES.join(", ")}`);
  }
}

function validateStatus(status) {
  if (!GROUP_STATUSES.includes(status)) {
    throw new HttpError(400, "validation_error", `Estado inválido. Estados válidos: ${GROUP_STATUSES.join(", ")}`);
  }
}

function validateText(value, label, maxLength = 2000) {
  if (value != null && typeof value !== "string") {
    throw new HttpError(400, "validation_error", `${label} debe ser texto`);
  }
  if (value != null && value.length > maxLength) {
    throw new HttpError(400, "validation_error", `${label} no puede superar los ${maxLength} caracteres`);
  }
}

function validateIdField(value, label) {
  if (value != null && typeof value !== "string") {
    throw new HttpError(400, "validation_error", `${label} debe ser texto`);
  }
  if (value != null && value.trim() === "") {
    throw new HttpError(400, "validation_error", `${label} no puede estar vacío`);
  }
}

function assertGroupActive(group) {
  if (group.status !== "activo") {
    throw new HttpError(409, "conflict", "Un grupo desactivado o finalizado no puede utilizarse para nuevas asignaciones o integrantes");
  }
}

function resolveGroup(id) {
  const group = groupsRepository.findGroupById(id);
  if (!group) {
    throw new HttpError(404, "not_found", "Grupo no encontrado");
  }
  return group;
}

function resolveWorkshop(workshopId) {
  const workshop = workshopsRepository.findById(workshopId);
  if (!workshop) {
    throw new HttpError(404, "not_found", "El taller indicado no existe");
  }
  if (!workshop.isActive) {
    throw new HttpError(409, "conflict", "El taller indicado está desactivado");
  }
  return workshop;
}

function resolveSpace(spaceId) {
  const space = spacesRepository.findSpaceById(spaceId);
  if (!space) {
    throw new HttpError(404, "not_found", "El espacio indicado no existe");
  }
  if (space.status !== "activo") {
    throw new HttpError(409, "conflict", "El espacio indicado no está disponible (debe estar activo)");
  }
  return space;
}

function resolveSchedule(scheduleId) {
  const schedule = schedulesRepository.findScheduleById(scheduleId);
  if (!schedule) {
    throw new HttpError(404, "not_found", "El horario indicado no existe");
  }
  if (!schedule.isActive) {
    throw new HttpError(409, "conflict", "El horario indicado está desactivado");
  }
  return schedule;
}

function validateAssociationPayload(data) {
  const provided = ASSIGNABLE_FIELDS.filter((f) => data[f] !== undefined && data[f] !== null && data[f] !== "");
  if (provided.length === 0) {
    throw new HttpError(400, "validation_error", "Debe indicar al menos una asociación (curso, división, taller, espacio u horario)");
  }
  return provided;
}

/* Conflicto: un alumno no puede pertenecer a grupos incompatibles que compartan
   el mismo horario y espacio mientras ambos están activos. */
function assertNoIncompatibleGroupForStudent(studentId, targetGroupId) {
  const groups = groupsRepository.listGroups({ includeInactive: true });
  const target = groups.find((g) => g.id === targetGroupId) ?? resolveGroup(targetGroupId);

  for (const group of groups) {
    if (group.id === targetGroupId) continue;
    if (group.status !== "activo") continue;

    const sharesSchedule = target.scheduleId && group.scheduleId === target.scheduleId;
    const sharesSpace = target.spaceId && group.spaceId === target.spaceId;
    if (!sharesSchedule && !sharesSpace) continue;

    const studentInGroup = groupsRepository.listMemberStudentIds(group.id).includes(studentId);
    if (studentInGroup) {
      throw new HttpError(409, "conflict", `El alumno ya pertenece al grupo "${group.name}", incompatible en el mismo horario/espacio`, {
        studentId,
        conflictingGroupId: group.id,
        conflictingGroupName: group.name
      });
    }
  }
}

/* Verifica que un horario/espacio no generen conflictos con otro grupo activo de la misma escuela. */
function assertNoGroupScheduleConflict({ scheduleId, spaceId, schoolId, school, excludeGroupId }) {
  if (!scheduleId && !spaceId) return;
  const groups = groupsRepository.listGroups({ schoolId, includeInactive: true }).filter((g) => g.id !== excludeGroupId && g.status === "activo");
  for (const group of groups) {
    const sameSchedule = scheduleId && group.scheduleId === scheduleId;
    const sameSpace = spaceId && group.spaceId === spaceId;
    if (sameSchedule && sameSpace) {
      throw new HttpError(409, "conflict", `El espacio y horario ya están asignados al grupo "${group.name}"`, {
        conflictingGroupId: group.id,
        conflictingGroupName: group.name
      });
    }
  }
}

function enrichGroup(group) {
  const activeMembers = groupsRepository.listMembers({ groupId: group.id }).filter((m) => m.isActive);
  const history = groupsRepository.listHistory(group.id);
  return {
    ...group,
    memberCount: activeMembers.length,
    members: activeMembers.map((m) => ({ id: m.id, studentId: m.studentId, isActive: m.isActive, createdAt: m.createdAt })),
    course: group.courseId ? { id: group.courseId } : null,
    division: group.divisionId ? { id: group.divisionId } : null,
    workshop: group.workshopId ? workshopsRepository.findById(group.workshopId) ?? null : null,
    space: group.spaceId ? spacesRepository.findSpaceById(group.spaceId) ?? null : null,
    schedule: group.scheduleId ? schedulesRepository.findScheduleById(group.scheduleId) ?? null : null,
    lastChange: history.length ? history[history.length - 1] : null,
    history
  };
}

const groupsService = {
  createGroup(data, user) {
    validateRequired(["name", "type", "schoolId"], data);
    validateType(data.type);
    validateText(data.name, "El nombre del grupo", 200);
    validateText(data.description, "La descripción");
    validateText(data.observations, "Las observaciones");
    validateIdField(data.courseId, "El curso");
    validateIdField(data.divisionId, "La división");
    validateStatus(data.status ?? "activo");

    if (data.workshopId) resolveWorkshop(data.workshopId);
    if (data.spaceId) resolveSpace(data.spaceId);
    if (data.scheduleId) {
      resolveSchedule(data.scheduleId);
      assertNoGroupScheduleConflict({
        scheduleId: data.scheduleId,
        spaceId: data.spaceId,
        schoolId: data.schoolId,
        school: true
      });
    }

    const group = groupsRepository.createGroup({
      ...data,
      status: data.status ?? "activo",
      createdBy: user.id,
      updatedBy: user.id
    });
    return { statusCode: 201, body: { data: enrichGroup(group) } };
  },

  getGroup(id) {
    return { statusCode: 200, body: { data: enrichGroup(resolveGroup(id)) } };
  },

  listGroups(query, user) {
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const groups = groupsRepository.listGroups({
      schoolId,
      type: query.type,
      courseId: query.courseId,
      divisionId: query.divisionId,
      workshopId: query.workshopId,
      spaceId: query.spaceId,
      scheduleId: query.scheduleId,
      status: query.status,
      includeInactive: query.includeInactive === "true"
    });
    return {
      statusCode: 200,
      body: {
        data: groups.map((g) => ({
          ...g,
          memberCount: groupsRepository.countMembers(g.id)
        }))
      }
    };
  },

  updateGroup(id, data, user) {
    const current = resolveGroup(id);
    if (data.type) validateType(data.type);
    if (data.status) {
      validateStatus(data.status);
      if (current.status === "finalizado" && data.status !== "finalizado") {
        throw new HttpError(409, "conflict", "Un grupo finalizado solo puede reactivarse con una operación autorizada");
      }
    }
    if (data.name !== undefined) validateText(data.name, "El nombre del grupo", 200);
    if (data.description !== undefined) validateText(data.description, "La descripción");
    if (data.observations !== undefined) validateText(data.observations, "Las observaciones");
    if (data.courseId !== undefined) validateIdField(data.courseId, "El curso");
    if (data.divisionId !== undefined) validateIdField(data.divisionId, "La división");

    const resulting = { ...current, ...data };
    if (resulting.workshopId) resolveWorkshop(resulting.workshopId);
    if (resulting.spaceId) resolveSpace(resulting.spaceId);
    if (resulting.scheduleId) {
      resolveSchedule(resulting.scheduleId);
      assertNoGroupScheduleConflict({
        scheduleId: resulting.scheduleId,
        spaceId: resulting.spaceId,
        schoolId: resulting.schoolId,
        school: true,
        excludeGroupId: id
      });
    }

    const group = groupsRepository.updateGroup(id, data, user);
    return { statusCode: 200, body: { data: enrichGroup(group) } };
  },

  /* Asociar curso/división, taller, espacio u horario (endpoints dedicados). */
  assign(id, data, user) {
    const current = resolveGroup(id);
    const provided = validateAssociationPayload(data);

    for (const field of provided) {
      validateIdField(data[field], { courseId: "El curso", divisionId: "La división", workshopId: "El taller", spaceId: "El espacio", scheduleId: "El horario" }[field]);
    }

    if (data.workshopId) resolveWorkshop(data.workshopId);
    if (data.spaceId) {
      assertGroupActive(current);
      resolveSpace(data.spaceId);
    }
    if (data.scheduleId) {
      resolveSchedule(data.scheduleId);
      assertNoGroupScheduleConflict({
        scheduleId: data.scheduleId,
        spaceId: data.spaceId ?? current.spaceId,
        schoolId: current.schoolId,
        school: true,
        excludeGroupId: id
      });
    }

    const group = groupsRepository.updateGroup(id, data, user);
    return { statusCode: 200, body: { data: enrichGroup(group) } };
  },

  setStatus(id, status, user) {
    validateStatus(status);
    const current = resolveGroup(id);
    if (current.status === "finalizado" && status !== "activo") {
      throw new HttpError(409, "conflict", "Un grupo finalizado no puede volver a cambiarse de estado");
    }
    const group = groupsRepository.setGroupStatus(id, status, user);
    return { statusCode: 200, body: { data: enrichGroup(group) } };
  },

  addMember(groupId, studentId, user) {
    const group = resolveGroup(groupId);
    assertGroupActive(group);
    validateIdField(studentId, "El alumno");

    const alreadyActive = groupsRepository.listMembers({ groupId }).some((m) => m.studentId === studentId && m.isActive);
    if (alreadyActive) {
      throw new HttpError(409, "conflict", `El alumno ya pertenece al grupo "${group.name}"`);
    }

    assertNoIncompatibleGroupForStudent(studentId, groupId);

    const membership = groupsRepository.addMember({
      groupId,
      studentId,
      schoolId: group.schoolId,
      createdBy: user.id
    });
    if (!membership) {
      throw new HttpError(409, "conflict", `El alumno ya pertenece al grupo "${group.name}"`);
    }
    return {
      statusCode: 201,
      body: {
        data: enrichGroup(resolveGroup(groupId))
      }
    };
  },

  removeMember(groupId, studentId, user) {
    resolveGroup(groupId);
    validateIdField(studentId, "El alumno");
    const membership = groupsRepository.removeMember(groupId, studentId, user);
    if (!membership) {
      throw new HttpError(404, "not_found", "El alumno no pertenece actualmente al grupo");
    }
    return {
      statusCode: 200,
      body: {
        data: enrichGroup(resolveGroup(groupId))
      }
    };
  },

  listGroupMembers(groupId) {
    const group = resolveGroup(groupId);
    const members = groupsRepository.listMembers({ groupId }).filter((m) => m.isActive);
    return {
      statusCode: 200,
      body: {
        data: {
          groupId,
          groupName: group.name,
          total: members.length,
          members: members.map((m) => ({
            id: m.id,
            studentId: m.studentId,
            createdAt: m.createdAt,
            createdBy: m.createdBy
          }))
        }
      }
    };
  },

  listStudentGroups(studentId, query, user) {
    validateIdField(studentId, "El alumno");
    const schoolId = user.assignments?.[0]?.schoolId ?? query.schoolId;
    const groups = groupsRepository.listGroupsForStudent(studentId, {
      schoolId,
      includeInactive: query.includeInactive === "true"
    });
    return {
      statusCode: 200,
      body: {
        data: {
          studentId,
          total: groups.length,
          groups: groups.map((g) => ({
            ...g,
            memberCount: groupsRepository.countMembers(g.id)
          }))
        }
      }
    };
  },

  listGroupsByCourseOrDivision({ courseId, divisionId, user }) {
    const groups = groupsRepository.listGroups({
      courseId,
      divisionId,
      schoolId: user.assignments?.[0]?.schoolId,
      includeInactive: true
    });
    return {
      statusCode: 200,
      body: { data: groups.map((g) => ({ ...g, memberCount: groupsRepository.countMembers(g.id) })) }
    };
  },

  getGroupPlanning(groupId) {
    const group = resolveGroup(groupId);
    return {
      statusCode: 200,
      body: {
        data: {
          groupId: group.id,
          groupName: group.name,
          space: group.spaceId ? spacesRepository.findSpaceById(group.spaceId) ?? null : null,
          schedule: group.scheduleId ? schedulesRepository.findScheduleById(group.scheduleId) ?? null : null,
          status: group.status
        }
      }
    };
  },

  getGroupHistory(groupId) {
    resolveGroup(groupId);
    const history = groupsRepository.listHistory(groupId);
    return { statusCode: 200, body: { data: history } };
  }
};

export default groupsService;