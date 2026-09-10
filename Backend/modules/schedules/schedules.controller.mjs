import schedulesService from "./schedules.service.mjs";

export function createShift({ body, user }) {
  return schedulesService.createShift(body, user);
}

export function getShift({ params }) {
  return schedulesService.getShift(params.shiftId);
}

export function listShifts({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return schedulesService.listShifts(query, user);
}

export function updateShift({ params, body }) {
  return schedulesService.updateShift(params.shiftId, body);
}

export function createTimeSlot({ body, user }) {
  return schedulesService.createTimeSlot(body, user);
}

export function getTimeSlot({ params }) {
  return schedulesService.getTimeSlot(params.timeSlotId);
}

export function listTimeSlots({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return schedulesService.listTimeSlots(query, user);
}

export function updateTimeSlot({ params, body }) {
  return schedulesService.updateTimeSlot(params.timeSlotId, body);
}

export function createSchedule({ body, user }) {
  return schedulesService.createSchedule(body, user);
}

export function getSchedule({ params }) {
  return schedulesService.getSchedule(params.scheduleId);
}

export function listSchedules({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return schedulesService.listSchedules(query, user);
}

export function updateSchedule({ params, body }) {
  return schedulesService.updateSchedule(params.scheduleId, body);
}

export function createAssignment({ body, user }) {
  return schedulesService.createAssignment(body, user);
}

export function getAssignment({ params }) {
  return schedulesService.getAssignment(params.assignmentId);
}

export function listAssignments({ url, user }) {
  const query = Object.fromEntries(url.searchParams.entries());
  return schedulesService.listAssignments(query, user);
}

export function updateAssignment({ params, body, user }) {
  return schedulesService.updateAssignment(params.assignmentId, body, user);
}

export function deleteAssignment({ params }) {
  return schedulesService.deleteAssignment(params.assignmentId);
}