import { usersService } from "./users.service.mjs";

export function getUser({ params }) {
  return { data: usersService.get(params.userId) };
}

export async function createUser({ user, body }) {
  return { statusCode: 201, body: { data: await usersService.create(user, body) } };
}

export async function updateUser({ user, params, body }) {
  return { data: await usersService.update(user, params.userId, body) };
}

export function replaceUserRoles({ user, params, body }) {
  return { data: usersService.replaceRoles(user, params.userId, body) };
}

export function deleteUser({ user, params }) {
  return { data: usersService.remove(user, params.userId) };
}

export async function resetUserPassword({ user, params }) {
  return { data: await usersService.resetPassword(user, params.userId) };
}
