/**
 * Adaptador de servicios para el Módulo de Dirección.
 * Centraliza métricas institucionales, gestión de personal, creación de perfiles y asignación de roles.
 */

import { pedir } from "../../services/http.js";
import { roles as ROLES_CATALOGO } from "../../../../../Shared/src/domain.mjs";

export const ROLES_DISPONIBLES = ROLES_CATALOGO.map((rol) => ({
  id: rol.id,
  nombre: rol.name,
  descripcion: rol.description,
  icono: {
    admin: "shield",
    director: "award",
    secretario: "students",
    preceptor: "attendance",
    docente: "academic",
    jefe_area: "briefcase",
    server: "server"
  }[rol.id] || "user",
  color: {
    admin: "#dc2626",
    director: "#b45309",
    secretario: "#0284c7",
    preceptor: "#7c3aed",
    docente: "#16a34a",
    jefe_area: "#d97706",
    server: "#059669"
  }[rol.id] || "#64748b"
}));

export const DirectorService = {
  /**
   * Obtiene las métricas consolidadas de la institución para el Director.
   */
  async getDashboardConsolidado() {
    const resumen = {
      alumnos: {
        totalActivos: 840,
        turnoManana: 450,
        turnoTarde: 390,
        divisiones: 32,
        promedioPorDivision: 26,
        alumnosEnRiesgo: 12
      },
      personal: {
        totalUsuarios: 0,
        activos: 0,
        porRol: {
          director: 0,
          secretario: 0,
          preceptor: 0,
          docente: 0,
          jefe_area: 0,
          server: 0,
          admin: 0
        }
      },
      asistencia: {
        tasaGeneral: 94.2,
        presentesHoy: 791,
        ausentesHoy: 49,
        alertasConsecutivas: 3
      },
      serverPañol: {
        totalItems: 0,
        sinStock: 0,
        stockBajo: 0,
        solicitudesPendientes: 0,
        reservasActivas: 0
      },
      academico: {
        totalMaterias: 68,
        alumnosConPrevias: 28,
        materiasCriticas: ["Matemática 4°", "Física 3°", "Sistemas Operativos 5°"]
      }
    };

    // 1. Obtener usuarios y desglosar personal
    try {
      const usuarios = await pedir("/api/v1/users");
      const lista = Array.isArray(usuarios) ? usuarios : (usuarios?.items ?? usuarios?.data ?? []);
      if (lista.length > 0) {
        resumen.personal.totalUsuarios = lista.length;
        resumen.personal.activos = lista.filter((u) => u.isActive !== false && u.estado !== "inactivo").length;

        for (const u of lista) {
          const roles = u.roles || u.assignments?.map((a) => a.role) || [];
          for (const r of roles) {
            const rolId = typeof r === "string" ? r : (r?.id || r?.role);
            if (resumen.personal.porRol[rolId] !== undefined) {
              resumen.personal.porRol[rolId] += 1;
            }
          }
        }
      }
    } catch {
      // Fallback a conteos aproximados
      resumen.personal.totalUsuarios = 42;
      resumen.personal.activos = 40;
      resumen.personal.porRol = {
        director: 2,
        secretario: 3,
        preceptor: 8,
        docente: 24,
        jefe_area: 2,
        server: 2,
        admin: 1
      };
    }

    // 2. Obtener datos de Secretaría
    try {
      const dashSec = await pedir("/api/v1/dashboard/secretaria");
      if (dashSec) {
        if (dashSec.matriculaActiva) resumen.alumnos.totalActivos = dashSec.matriculaActiva;
        if (Array.isArray(dashSec.alumnosPorCurso)) resumen.alumnos.divisiones = dashSec.alumnosPorCurso.length;
        if (Array.isArray(dashSec.porTurno)) {
          const tm = dashSec.porTurno.find((t) => String(t.turno).toLowerCase().includes("mañ"));
          const tt = dashSec.porTurno.find((t) => String(t.turno).toLowerCase().includes("tard"));
          if (tm) resumen.alumnos.turnoManana = tm.cantidad;
          if (tt) resumen.alumnos.turnoTarde = tt.cantidad;
        }
        if (Array.isArray(dashSec.alertas)) {
          resumen.alumnos.alumnosEnRiesgo = dashSec.alertas.length;
        }
      }
    } catch {
      // Silencioso
    }

    // 3. Obtener datos de Server y Pañol
    try {
      const dashServer = await pedir("/api/v1/dashboard/server");
      if (dashServer) {
        if (dashServer.totales) {
          resumen.serverPañol.totalItems = dashServer.totales.totalItems ?? dashServer.totales.totalMateriales ?? 0;
          resumen.serverPañol.sinStock = dashServer.totales.sinStock ?? 0;
          resumen.serverPañol.stockBajo = dashServer.totales.stockBajo ?? 0;
          resumen.serverPañol.solicitudesPendientes = dashServer.totales.solicitudesPendientes ?? 0;
          resumen.serverPañol.reservasActivas = dashServer.totales.reservasActivas ?? 0;
        }
      }
    } catch {
      // Silencioso
    }

    return resumen;
  },

  /**
   * Lista todos los usuarios/perfiles registrados con filtros opcionales.
   */
  async listarPerfiles(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.q) params.set("q", filtros.q);
    if (filtros.rol) params.set("rol", filtros.rol);
    if (filtros.estado) params.set("estado", filtros.estado);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const respuesta = await pedir(`/api/v1/users${queryStr}`);
    const lista = Array.isArray(respuesta) ? respuesta : (respuesta?.items ?? respuesta?.data ?? []);

    return lista.map((u) => {
      const rawRoles = u.roles || u.assignments?.map((a) => a.role || a) || [];
      const roles = rawRoles.map((r) => {
        const id = typeof r === "string" ? r : (r?.id || r?.role || r?.codigo);
        const catalogo = ROLES_DISPONIBLES.find((c) => c.id === id);
        return {
          id,
          nombre: catalogo?.nombre || id,
          color: catalogo?.color || "#64748b"
        };
      });

      const nombreCompleto = u.displayName || [u.nombre, u.apellido].filter(Boolean).join(" ") || u.email;

      return {
        id: u.id,
        nombre: u.nombre || nombreCompleto.split(" ")[0] || "",
        apellido: u.apellido || nombreCompleto.split(" ").slice(1).join(" ") || "",
        nombreCompleto,
        email: u.email,
        dni: u.dni || "-",
        telefono: u.telefono || "-",
        area: u.area || u.schoolId || "E.E.S.T N°1",
        roles,
        estado: (u.isActive === false || u.estado === "inactivo") ? "inactivo" : "activo",
        ultimoAcceso: u.ultimoAcceso || u.lastLoginAt || null,
        creadoEn: u.creadoEn || u.createdAt || null
      };
    });
  },

  /**
   * Crea un nuevo perfil de usuario asignando sus roles correspondientes.
   * Devuelve la información del usuario creado incluyendo la contraseña temporal.
   */
  async crearPerfil(datos) {
    const payload = {
      nombre: String(datos.nombre || "").trim(),
      apellido: String(datos.apellido || "").trim(),
      email: String(datos.email || "").trim().toLowerCase(),
      dni: String(datos.dni || "").trim().replace(/\D/g, ""),
      telefono: datos.telefono ? String(datos.telefono).trim() : undefined,
      area: datos.area || "E.E.S.T N°1",
      roles: Array.isArray(datos.roles) ? datos.roles : [datos.roles].filter(Boolean),
      schoolId: datos.schoolId || "esc-1"
    };

    const res = await pedir("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const creado = res?.data ?? res?.body?.data ?? res;
    return creado;
  },

  /**
   * Actualiza los roles de un usuario existente.
   */
  async actualizarRoles(usuarioId, roles) {
    return pedir(`/api/v1/users/${encodeURIComponent(usuarioId)}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roles: Array.isArray(roles) ? roles : [roles] })
    });
  },

  /**
   * Modifica los datos personales o el estado de un usuario.
   */
  async actualizarPerfil(usuarioId, datos) {
    return pedir(`/api/v1/users/${encodeURIComponent(usuarioId)}`, {
      method: "PATCH",
      body: JSON.stringify(datos)
    });
  },

  /**
   * Cambia el estado de una cuenta (Activa / Inactiva).
   */
  async alternarEstadoUsuario(usuarioId, nuevoEstado) {
    return pedir(`/api/v1/users/${encodeURIComponent(usuarioId)}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: nuevoEstado })
    });
  }
};
