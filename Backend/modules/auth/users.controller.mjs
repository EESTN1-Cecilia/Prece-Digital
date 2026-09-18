import { usersService } from "./users.service.mjs";

export function getUser({ params }) {
  return { data: usersService.get(params.userId) };
}

export async function createUser({ user, body }) {
  return { statusCode: 201, body: { data: await usersService.create(user, body) } };
}

export function updateUser({ user, params, body }) {
  return { data: usersService.update(user, params.userId, body) };
}

export function replaceUserRoles({ user, params, body }) {
  return { data: usersService.replaceRoles(user, params.userId, body) };
}
