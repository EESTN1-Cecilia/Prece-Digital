import { env } from "../config/env.js";

const STORAGE_KEY = "prece_active_role";

const ROLES = {
  secretaria: {
    id: "usr_sec_01",
    nombre: "Secretaría General",
    email: "secretario@prece.escuela.edu.ar",
    rol: "secretaria",
    rolNombre: "Secretaría",
    escuela: "E.E.S.T N°1 Monte Grande",
    cue: "0601449",
    cicloLectivo: "2026",
    permisos: ["all"]
  },
  preceptor: {
    id: "usr_prec_01",
    nombre: "Preceptoría",
    email: "preceptor@prece.escuela.edu.ar",
    rol: "preceptor",
    rolNombre: "Preceptoría",
    escuela: "E.E.S.T N°1 Monte Grande",
    cicloLectivo: "2026",
    divisionesAsignadas: ["1° 1°", "2° 1°", "3° 1°"],
    permisos: ["attendance:view", "attendance:edit", "students:view", "observations:view"]
  }
};

export const AuthService = {
  /**
   * Obtiene el rol activo del usuario (por defecto 'secretaria').
   */
  getActiveRole() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ROLES[stored]) {
        return stored;
      }
    } catch {
      // Ignorar error de acceso a storage
    }
    return "secretaria";
  },

  /**
   * Obtiene la información del usuario actual según su rol activo.
   */
  getCurrentUser() {
    const roleKey = this.getActiveRole();
    return ROLES[roleKey] || ROLES.secretaria;
  },

  /**
   * Inicia sesión con las credenciales demo en el backend y guarda el token JWT.
   */
  async loginDemo(roleKey = this.getActiveRole()) {
    const credenciales = {
      secretaria: { email: "secretario@prece.escuela.edu.ar", password: "Pr3ceD1git4l!" },
      preceptor: { email: "preceptor@prece.escuela.edu.ar", password: "Pr3ceD1git4l!" }
    };
    const cred = credenciales[roleKey] || credenciales.secretaria;

    try {
      const res = await fetch(`${env.apiBaseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cred)
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.token) {
          localStorage.setItem("auth_token", data.token);
          return data.token;
        }
      }
    } catch (e) {
      console.warn("No se pudo conectar al endpoint de login:", e);
    }
    return null;
  },

  /**
   * Obtiene el token JWT actual o solicita uno nuevo al backend.
   */
  async getToken() {
    let token = localStorage.getItem("auth_token");
    if (!token) {
      token = await this.loginDemo();
    }
    return token;
  },

  /**
   * Cambia el rol activo ('secretaria' | 'preceptor') y emite un evento global.
   */
  async switchRole(roleKey) {
    const validRole = ROLES[roleKey] ? roleKey : "secretaria";
    localStorage.setItem(STORAGE_KEY, validRole);
    localStorage.removeItem("auth_token");
    await this.loginDemo(validRole);
    const user = ROLES[validRole];
    window.dispatchEvent(new CustomEvent("auth:role_changed", { detail: user }));
    return user;
  }
};

