import { env } from "../config/env.js";
import { AuthService } from "./auth-service.js";

/**
 * Cliente HTTP unificado para interactuar con la API del Backend.
 */
export async function httpClient(endpoint, options = {}, isRetry = false) {
  const url = endpoint.startsWith("http") ? endpoint : `${env.apiBaseUrl}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  let token = localStorage.getItem("auth_token");
  if (!token && !endpoint.includes("/api/v1/auth/login")) {
    token = await AuthService.getToken();
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401 && !isRetry && !endpoint.includes("/api/v1/auth/login")) {
      localStorage.removeItem("auth_token");
      await AuthService.loginDemo();
      return httpClient(endpoint, options, true);
    }

    if (!response.ok) {
      let errorData = null;
      try {
        errorData = await response.json();
      } catch {
        // Ignorar si el cuerpo no es JSON
      }

      const error = new Error(
        errorData?.message || `Error en la API (${response.status} ${response.statusText})`
      );
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (err) {
    throw err;
  }
}

