import { authService } from "./auth.service.mjs";

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

export function listUsers() {
  return {
    statusCode: 200,
    body: { data: authService.listUsers() }
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
