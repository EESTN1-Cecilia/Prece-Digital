import { authService } from "./auth.service.mjs";
import { usersService } from "./users.service.mjs";

export async function login({ body, request }) {
  const session = await authService.login({
    email: body.email,
    password: body.password,
    request
  });

  return {
    statusCode: 200,
    body: session
  };
}

export function refresh({ body }) {
  return {
    statusCode: 200,
    body: authService.refresh(body.refreshToken)
  };
}

export function logout({ body }) {
  return {
    statusCode: 200,
    body: authService.logout(body.refreshToken)
  };
}

export function me({ user }) {
  return {
    statusCode: 200,
    body: { data: authService.me(user) }
  };
}

export async function cambiarClave({ user, body }) {
  return {
    statusCode: 200,
    body: await authService.cambiarClave(user, { actual: body?.actual, nueva: body?.nueva })
  };
}

export function permissions({ user }) {
  return {
    statusCode: 200,
    body: { data: authService.permissions(user) }
  };
}

export function listUsers({ url }) {
  const resultado = usersService.list(Object.fromEntries(url.searchParams.entries()));

  return {
    statusCode: 200,
    body: { data: resultado.items, paginacion: resultado.paginacion }
  };
}

export function deactivateUser({ user, params, body, url }) {
  const contextSource = {
    ...body,
    ...Object.fromEntries(url.searchParams.entries())
  };

  return {
    statusCode: 200,
    body: {
      data: authService.deactivateUser(user, params.userId, contextSource)
    }
  };
}
