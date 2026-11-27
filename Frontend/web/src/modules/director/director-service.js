/**
 * Adaptador de servicios para el Módulo de Dirección.
 * Centraliza métricas institucionales, gestión de personal, creación de perfiles y asignación de roles.
 */

import { pedir } from "../../services/http.js";
import { roles as ROLES_CATALOGO } from "../../../../../Shared/src/domain.mjs";

export const ROLES_DISPONIBLES = ROLES_CATALOGO
  .filter((rol) => rol.id !== "server")
  .map((rol) => ({
    id: rol.id,
    nombre: rol.name,
    descripcion: rol.description,
    icono: {
      admin: "shield",
      director: "award",
      secretario: "students",
      preceptor: "attendance",
      docente: "academic",
      jefe_area: "academic"
    }[rol.id] || "user",
    color: {
      admin: "#dc2626",
      director: "#b45309",
      secretario: "#0284c7",
      preceptor: "#7c3aed",
      docente: "#16a34a",
      jefe_area: "#0f766e"
    }[rol.id] || "#64748b"
  }));

export const DirectorService = {
  /**
   * Obtiene las métricas consolidadas de la institución para el Director.
   */
  async getDashboardConsolidado() {
    const resumen = {
      // Alumnos y asistencia salen del tablero de secretaría: null = sin datos
      alumnos: {
        totalActivos: null,
        turnoManana: null,
        turnoTarde: null,
        divisiones: null,
        divisionesConAlumnos: null,
        alumnosEnRiesgo: null
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
        tasaGeneral: null,
        presentesHoy: null,
        ausentesHoy: null,
        porTurno: [],
        alertasConsecutivas: null
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
      /* Sin respuesta no se inventan cantidades: el panel muestra "sin datos". */
      resumen.personal.totalUsuarios = null;
      resumen.personal.activos = null;
    }

    // 2. Obtener datos de Secretaría
    try {
      const dashSec = await pedir("/api/v1/dashboard/secretaria");
      const alumnos = dashSec?.resumenAlumnos;
      if (alumnos) {
        const delTurno = (lista, nombre) => (lista ?? []).find((t) => String(t.turno).toLowerCase().startsWith(nombre));
        resumen.alumnos.totalActivos = alumnos.matricula ?? alumnos.activos;
        resumen.alumnos.turnoManana = delTurno(alumnos.porTurno, "mañ")?.cantidad ?? 0;
        resumen.alumnos.turnoTarde = delTurno(alumnos.porTurno, "tard")?.cantidad ?? 0;
        resumen.alumnos.divisiones = alumnos.divisiones ?? dashSec.alumnosPorCurso?.length ?? null;
        resumen.alumnos.divisionesConAlumnos = alumnos.divisionesConAlumnos ?? null;
      }
      if (Array.isArray(dashSec?.alertas)) {
        resumen.alumnos.alumnosEnRiesgo = dashSec.alertas.length;
        resumen.asistencia.alertasConsecutivas = dashSec.alertas.filter((a) => /asist/i.test(`${a.tipo} ${a.titulo}`)).length;
      }
      const hoy = dashSec?.asistenciaHoy;
      if (hoy) {
        resumen.asistencia.tasaGeneral = hoy.porcentaje;
        resumen.asistencia.presentesHoy = hoy.presentes;
        resumen.asistencia.ausentesHoy = hoy.ausentes;
        resumen.asistencia.porTurno = hoy.porTurno ?? [];
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
    /* Sin respuesta del servidor no se inventa personal: el error llega a la pantalla. */
    const respuesta = await pedir(`/api/v1/users${queryStr}`);
    const lista = Array.isArray(respuesta) ? respuesta : (respuesta?.items ?? respuesta?.data ?? []);

    return lista.map((u) => {
      const rawRoles = u.roles || u.assignments?.map((a) => a.role || a) || [];
      const roles = rawRoles.map((r) => {
        const id = typeof r === "string" ? r : (r?.id || r?.role || r?.codigo);
        const catalogo = ROLES_DISPONIBLES.find((c) => c.id === id) || ROLES_CATALOGO.find((c) => c.id === id);
        return {
          id,
          nombre: catalogo?.nombre || catalogo?.name || id,
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
    const roles = Array.isArray(datos.roles) ? datos.roles : [datos.roles].filter(Boolean);
    const cargoDocente = roles.includes("docente")
      ? {
          materia: String(datos.materia || "").trim(),
          situacionRevista: datos.situacionRevista === "provisorio" ? "provisional" : datos.situacionRevista,
          docenteSuplido:
            datos.situacionRevista === "suplente" ? String(datos.docenteSuplido || "").trim() : undefined,
          modulos: Number(datos.modulos),
          horaDesde: datos.horaDesde,
          horaHasta: datos.horaHasta,
          cursos: Array.isArray(datos.cursos) ? datos.cursos : [],
          dias: Array.isArray(datos.dias) ? datos.dias : [],
          grupoTaller: String(datos.grupoTaller || "").trim() || undefined
        }
      : undefined;

    const payload = {
      nombre: String(datos.nombre || "").trim(),
      apellido: String(datos.apellido || "").trim(),
      email: String(datos.email || "").trim().toLowerCase(),
      dni: String(datos.dni || "").trim().replace(/\D/g, ""),
      telefono: datos.telefono ? String(datos.telefono).trim() : undefined,
      area: datos.area || "E.E.S.T N°1",
      roles,
      cargoDocente,
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
  },

  /**
   * Resetea la contraseña de un integrante del personal. Devuelve la clave
   * temporal (se muestra una sola vez).
   */
  async resetearPassword(usuarioId) {
    const res = await pedir(`/api/v1/users/${encodeURIComponent(usuarioId)}/reset-password`, { method: "POST" });
    return res?.data ?? res;
  },

  /**
   * Elimina definitivamente una cuenta de usuario.
   */
  async eliminarUsuario(usuarioId) {
    return pedir(`/api/v1/users/${encodeURIComponent(usuarioId)}`, {
      method: "DELETE"
    });
  },

  // =========================================================================
  // GESTIÓN Y HABILITACIÓN DE PEDIDOS (SERVER, SECRETARÍA, PRECEPTORÍA)
  // =========================================================================

  /* Formato que usa la pantalla a partir del pedido guardado en el servidor. */
  _pedidoParaPantalla(p) {
    const fecha = (iso) => (iso ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) + " hs" : null);
    return {
      ...p,
      fecha: fecha(p.creadoEn),
      aprobadoEn: p.estado === "aprobado" ? fecha(p.resueltoEn) : null,
      aprobadoPor: p.estado === "aprobado" ? p.resueltoPor : null,
      rechazadoEn: p.estado === "rechazado" ? fecha(p.resueltoEn) : null,
      datosPlanilla: Array.isArray(p.datosPlanilla) ? p.datosPlanilla : []
    };
  },

  /**
   * Pedidos elevados a la Dirección, guardados en el servidor.
   */
  async listarPedidos() {
    const respuesta = await pedir("/api/v1/pedidos-direccion");
    const lista = Array.isArray(respuesta) ? respuesta : respuesta?.data ?? [];
    return lista.map((p) => this._pedidoParaPantalla(p));
  },

  /** Crea un pedido a la Dirección desde cualquier sector. */
  async crearPedido(datos) {
    await pedir("/api/v1/pedidos-direccion", { method: "POST", body: JSON.stringify(datos) });
    return this.listarPedidos();
  },

  /** Habilita (aprueba) un pedido. Devuelve la lista actualizada. */
  async aprobarPedido(pedidoId) {
    await pedir(`/api/v1/pedidos-direccion/${encodeURIComponent(pedidoId)}/aprobar`, { method: "POST" });
    return this.listarPedidos();
  },

  /** Rechaza un pedido con su motivo. Devuelve la lista actualizada. */
  async rechazarPedido(pedidoId, motivo = "Rechazado por Dirección") {
    await pedir(`/api/v1/pedidos-direccion/${encodeURIComponent(pedidoId)}/rechazar`, { method: "POST", body: JSON.stringify({ motivo }) });
    return this.listarPedidos();
  },

  // =========================================================================
  // GESTIÓN DE ASIGNACIONES: PRECEPTORES Y PROFESORES A CURSOS
  // =========================================================================

  /**
   * Obtiene el listado de las 27 divisiones institucionales con sus preceptores asignados.
   */
  async listarAsignacionesPreceptores() {
    /* Fuente unica: el backend. El alcance de cada preceptor sale de aca. */
    return pedir("/api/v1/preceptores/asignaciones");
  },

  /**
   * Guarda o reasigna un preceptor para una o varias divisiones.
   */
  async guardarAsignacionPreceptor(divisionId, preceptorData) {
    const divisiones = Array.isArray(divisionId) ? divisionId : [divisionId];
    return pedir("/api/v1/preceptores/asignaciones", {
      method: "PUT",
      body: JSON.stringify({ divisiones, preceptorId: preceptorData?.id })
    });
  },

  /**
   * Quita la asignación de preceptor de una o varias divisiones.
   */
  async quitarAsignacionPreceptor(divisionId) {
    const divisiones = Array.isArray(divisionId) ? divisionId : [divisionId];
    return pedir("/api/v1/preceptores/asignaciones/quitar", {
      method: "POST",
      body: JSON.stringify({ divisiones })
    });
  },

  async listarSuplencias() {
    return pedir("/api/v1/preceptores/suplencias");
  },

  async crearSuplencia(datos) {
    return pedir("/api/v1/preceptores/suplencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
  },

  async finalizarSuplencia(id) {
    return pedir(`/api/v1/preceptores/suplencias/${encodeURIComponent(id)}/finalizar`, { method: "POST" });
  },

  /**
   * Obtiene el listado de materias y cátedras con sus profesores asignados.
   */
  async guardarCatedras(catedras) {
    return pedir("/api/v1/docentes/catedras", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catedras })
    });
  },

  async listarAsignacionesProfesores() {
    const STORAGE_KEY = "prece_asignaciones_profesores";
    /* Fuente unica: el backend. El alcance de cada docente sale de aca. */
    let parsed = await pedir("/api/v1/docentes/catedras");

    /* Lo que quedo guardado en este navegador antes de usar la API se sube una vez. */
    if (parsed.length === 0) {
      try {
        const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        if (guardado.length > 0) {
          parsed = await this.guardarCatedras(guardado);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Storage ilegible o rechazado: se sigue con la grilla inicial
      }
    }

    if (parsed.length > 0) {
        return parsed.map((item) => {
          let mod = item.modulos;
          if (mod === undefined || mod === null) {
            const num = parseInt(String(item.horasSemanales || item.cargaHoraria || "").replace(/[^\d]/g, ""), 10);
            mod = !isNaN(num) && num > 0 ? Math.min(10, Math.max(1, num)) : 4;
          }
          return {
            ...item,
            modulos: mod,
            horasSemanales: mod,
            cargaHoraria: item.cargaHoraria && !item.cargaHoraria.includes("mód")
              ? `${mod} mód. semanales`
              : (item.cargaHoraria || `${mod} mód. semanales`)
          };
        });
    }

    /* Sin catedras en la base no se inventa ninguna: las asignaciones nacen del alta de cada docente
       (materia, cursos, dias y horario) o de la grilla de Direccion. */
    return [];
  },

  /**
   * Guarda o reasigna un profesor a una materia/cátedra específica.
   */
  async guardarAsignacionProfesor(catedraId, profesorData) {
    const lista = await this.listarAsignacionesProfesores();
    const ids = Array.isArray(catedraId) ? catedraId : [catedraId];
    const actualizada = lista.map((item) => {
      if (ids.includes(item.id)) {
        const cfg = profesorData.porCatedra?.[item.id] || {};
        const situacion = cfg.situacion || profesorData.situacion || item.situacion || "titular";
        let modulos = cfg.modulos !== undefined ? cfg.modulos : (profesorData.modulos !== undefined ? profesorData.modulos : (item.modulos || item.horasSemanales || 4));
        modulos = Math.min(10, Math.max(1, parseInt(modulos, 10) || 4));
        const cargaHoraria = cfg.cargaHoraria || profesorData.cargaHoraria || `${modulos} mód. semanales`;
        return {
          ...item,
          profesor: {
            id: profesorData.id || `doc-${Date.now()}`,
            nombre: profesorData.nombreCompleto || profesorData.nombre || "Docente Asignado",
            email: profesorData.email || "docente@prece.local",
            avatar: (profesorData.nombreCompleto || profesorData.nombre || "D").charAt(0).toUpperCase()
          },
          estado: "asignado",
          situacion,
          modulos,
          horasSemanales: modulos,
          cargaHoraria,
          docenteSuplido: situacion === "suplente" ? (cfg.docenteSuplido || profesorData.docenteSuplido || "") : "",
          fechaDesde: situacion === "suplente" ? (cfg.fechaDesde || profesorData.fechaDesde || "") : "",
          fechaHasta: situacion === "suplente" ? (cfg.fechaHasta || profesorData.fechaHasta || "") : ""
        };
      }
      return item;
    });

    return this.guardarCatedras(actualizada);
  },

  /**
   * Quita la asignación de profesor de una materia/cátedra.
   */
  async quitarAsignacionProfesor(catedraId) {
    const lista = await this.listarAsignacionesProfesores();
    const ids = Array.isArray(catedraId) ? catedraId : [catedraId];
    const actualizada = lista.map((item) => {
      if (ids.includes(item.id)) {
        return {
          ...item,
          profesor: null,
          estado: "sin_asignar"
        };
      }
      return item;
    });

    return this.guardarCatedras(actualizada);
  },

  /**
   * Agrega una nueva cátedra/materia a la grilla de asignaciones.
   */
  async crearAsignacionProfesor(datos) {
    const lista = await this.listarAsignacionesProfesores();
    const nuevo = {
      id: `cat-${Date.now()}`,
      anio: parseInt(datos.anio, 10) || 1,
      curso: `${datos.anio}°`,
      division: `División ${datos.division || 1}`,
      numDivision: String(datos.division || 1),
      materia: datos.materia || "Materia Nueva",
      area: datos.area || "Formación General",
      turno: datos.turno || "Mañana",
      cargaHoraria: datos.cargaHoraria || "4 hs semanales",
      profesor: datos.profesor ? {
        id: datos.profesor.id || `doc-${Date.now()}`,
        nombre: datos.profesor.nombreCompleto || datos.profesor.nombre,
        email: datos.profesor.email || "docente@prece.local",
        avatar: (datos.profesor.nombreCompleto || datos.profesor.nombre || "D").charAt(0).toUpperCase()
      } : null,
      estado: datos.profesor ? "asignado" : "sin_asignar"
    };

    const actualizada = [nuevo, ...lista];
    return this.guardarCatedras(actualizada);
  },

  /**
   * Obtiene los informes enviados por Dirección (filtrados opcionalmente por destinatario).
   * Los datos viven en el backend: no hay copia local ni informes de ejemplo, porque
   * un informe guardado solo en este navegador nunca llegaría a los alumnos.
   */
  async listarInformes(opciones = {}) {
    const destinatario = opciones.destinatario ? String(opciones.destinatario).toLowerCase() : null;
    const qs = destinatario ? `?destinatario=${encodeURIComponent(destinatario)}` : "";

    try {
      const res = await pedir(`/api/v1/informes-direccion${qs}`);
      return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    } catch {
      return [];
    }
  },

  /**
   * Crea y envía un nuevo informe de Dirección a alumnos, preceptores o ambos.
   * Si el servidor lo rechaza o no responde, el error llega al formulario: no se
   * guarda una copia local que el alumno no vería.
   */
  async crearInforme(datos) {
    const payload = {
      titulo: datos?.titulo ? String(datos.titulo).trim() : "Informe de Dirección",
      texto: String(datos?.texto || "").trim(),
      fecha: datos?.fecha || new Date().toISOString().slice(0, 10),
      destinatarios: datos?.destinatarios || "ambos",
      archivo: datos?.archivo || null
    };

    const res = await pedir("/api/v1/informes-direccion", {
      method: "POST",
      body: JSON.stringify(payload),
      tiempoLimite: 60000
    });
    return res?.data ?? res;
  },

  /**
   * Elimina un informe enviado por Dirección.
   */
  async eliminarInforme(informeId) {
    await pedir(`/api/v1/informes-direccion/${encodeURIComponent(informeId)}`, { method: "DELETE" });
    return { id: informeId, eliminado: true };
  }
};

