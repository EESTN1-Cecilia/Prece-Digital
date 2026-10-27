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
    let lista = [];
    try {
      const respuesta = await pedir(`/api/v1/users${queryStr}`);
      lista = Array.isArray(respuesta) ? respuesta : (respuesta?.items ?? respuesta?.data ?? []);
    } catch {
      // Fallback institucional en caso de contingencia o servidor local sin inicializar
      lista = [
        { id: "usr-dir-1", nombre: "Cecilia", apellido: "Gómez", displayName: "Cecilia Gómez", email: "direccion@prece.local", dni: "24890123", telefono: "11-4567-8901", area: "Dirección", roles: ["director"], estado: "activo", isActive: true },
        { id: "usr-sec-1", nombre: "Mariana", apellido: "López", displayName: "Mariana López", email: "secretaria@prece.local", dni: "27654321", telefono: "11-4567-8902", area: "Secretaría", roles: ["secretario"], estado: "activo", isActive: true },
        { id: "usr-prec-1", nombre: "Preceptor", apellido: "1° A", displayName: "Preceptor 1° A", email: "preceptor@prece.local", dni: "29123456", telefono: "11-4567-8903", area: "Preceptoría", roles: ["preceptor"], estado: "activo", isActive: true },
        { id: "usr-prec-2", nombre: "Carlos", apellido: "Ramos", displayName: "Carlos Ramos", email: "cramos@prece.local", dni: "31234567", telefono: "11-4567-8904", area: "Preceptoría", roles: ["preceptor"], estado: "activo", isActive: true },
        { id: "usr-doc-1", nombre: "Docente", apellido: "Matemática", displayName: "Docente Matemática", email: "docente@prece.local", dni: "32345678", telefono: "11-4567-8905", area: "Ciencias Exactas", roles: ["docente"], estado: "activo", isActive: true },
        { id: "usr-doc-2", nombre: "María", apellido: "Villatoro", displayName: "Prof. María Villatoro", email: "mvillatoro@prece.local", dni: "33456789", telefono: "11-4567-8906", area: "Lengua y Comunicación", roles: ["docente"], estado: "activo", isActive: true },
        { id: "usr-doc-3", nombre: "Lucía", apellido: "Ríos", displayName: "Prof. Lucía Ríos", email: "lrios@prece.local", dni: "34567890", telefono: "11-4567-8907", area: "Ciencias Sociales", roles: ["docente"], estado: "activo", isActive: true },
        { id: "usr-doc-4", nombre: "Humberto", apellido: "Sosa", displayName: "Prof. Humberto Sosa", email: "hsosa@prece.local", dni: "28901234", telefono: "11-4567-8908", area: "Educación Física", roles: ["docente"], estado: "activo", isActive: true },
        { id: "usr-doc-5", nombre: "Esteban", apellido: "Gómez", displayName: "Prof. Esteban Gómez", email: "egomez@prece.local", dni: "30123456", telefono: "11-4567-8909", area: "Técnica", roles: ["docente"], estado: "activo", isActive: true },
        { id: "usr-jefe-1", nombre: "Alejandro", apellido: "Fernández", displayName: "Alejandro Fernández", email: "jefatura@prece.local", dni: "26789012", telefono: "11-4567-8910", area: "Jefatura de Taller", roles: ["jefe_area"], estado: "activo", isActive: true },
        { id: "usr-srv-1", nombre: "Hernán", apellido: "Gómez", displayName: "Hernán Gómez", email: "server@prece.local", dni: "35678901", telefono: "11-4567-8911", area: "Server y Redes", roles: ["server"], estado: "activo", isActive: true },
        { id: "usr-adm-1", nombre: "Administrador", apellido: "Sistema", displayName: "Administrador Sistema", email: "admin@prece.local", dni: "22345678", telefono: "11-4567-8912", area: "Informática", roles: ["admin"], estado: "activo", isActive: true }
      ];
    }

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
    const roles = Array.isArray(datos.roles) ? datos.roles : [datos.roles].filter(Boolean);
    const cargoDocente = roles.includes("docente")
      ? {
          materia: String(datos.materia || "").trim(),
          situacionRevista: datos.situacionRevista,
          docenteSuplido:
            datos.situacionRevista === "suplente" ? String(datos.docenteSuplido || "").trim() : undefined,
          modulos: Number(datos.modulos),
          horaDesde: datos.horaDesde,
          horaHasta: datos.horaHasta
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

  // =========================================================================
  // GESTIÓN Y HABILITACIÓN DE PEDIDOS (SERVER, SECRETARÍA, PRECEPTORÍA)
  // =========================================================================

  /**
   * Obtiene la lista de pedidos que requieren habilitación y autorización de Dirección.
   */
  async listarPedidos() {
    const STORAGE_KEY = "prece_pedidos_director";
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        return JSON.parse(guardado);
      }
    } catch {
      // Ignorar error de storage
    }

    const iniciales = [
      {
        id: "ped-1",
        codigo: "PED-2026-041",
        sector: "Server",
        tipo: "actualizacion_planillas",
        titulo: "Actualización de Planilla de Calificaciones - 4° 1° Computación",
        solicitante: "Hernán Gómez",
        rolSolicitante: "Responsable de Server",
        fecha: "Hoy, 10:45 hs",
        archivo: "Planilla_Calificaciones_4to1ra_2Trimestre.xlsx",
        alcance: "4° 1° Computación (Turno Mañana)",
        impacto: "64 calificaciones · 32 alumnos",
        detalle: "Reemplazo de calificaciones parciales y promedios del segundo trimestre según planilla cargada desde el servidor escolar. Los datos permanecen bloqueados y no se actualizarán en el sistema hasta que Dirección los apruebe.",
        estado: "pendiente",
        aprobadoEn: null,
        aprobadoPor: null,
        datosPlanilla: [
          { alumno: "Acosta Sofía", materia: "Programación II", anterior: "7 (Siete)", nueva: "9 (Nueve)", estado: "Modificada" },
          { alumno: "Benítez Julián", materia: "Bases de Datos", anterior: "5 (Cinco)", nueva: "7 (Siete)", estado: "Modificada" },
          { alumno: "Castro Mateo", materia: "Redes y Telecom.", anterior: "Pendiente", nueva: "8 (Ocho)", estado: "Nueva" },
          { alumno: "Díaz Camila", materia: "Sistemas Operativos", anterior: "6 (Seis)", nueva: "8 (Ocho)", estado: "Modificada" },
          { alumno: "Flores Lucas", materia: "Laboratorio III", anterior: "4 (Cuatro)", nueva: "7 (Siete)", estado: "Modificada" }
        ]
      },
      {
        id: "ped-2",
        codigo: "PED-2026-042",
        sector: "Server",
        tipo: "inventario_hardware",
        titulo: "Baja de Inventario y Reasignación de Lote de Netbooks (Carro 2)",
        solicitante: "Lucas Romero",
        rolSolicitante: "Soporte Técnico de Server",
        fecha: "Hoy, 09:15 hs",
        archivo: "Acta_Baja_Hardware_Lote08.pdf",
        alcance: "Laboratorio 2 · Carro Móvil B",
        impacto: "8 equipos dados de baja · 8 reasignaciones",
        detalle: "Baja por rotura irreparable de placa madre en 8 netbooks escolares y destino a banco de repuestos técnicos para talleres de electrónica. Requiere autorización directiva.",
        estado: "pendiente",
        aprobadoEn: null,
        aprobadoPor: null,
        datosPlanilla: [
          { alumno: "Carro 2 - Netbook #12", materia: "Placa Madre Quemada", anterior: "Activo / En Servicio", nueva: "Baja Definitiva", estado: "Baja" },
          { alumno: "Carro 2 - Netbook #15", materia: "Pantalla Dañada", anterior: "Activo / En Servicio", nueva: "Baja Definitiva", estado: "Baja" },
          { alumno: "Carro 2 - Netbook #22", materia: "Falla de Encendido", anterior: "Activo / En Servicio", nueva: "Baja Definitiva", estado: "Baja" }
        ]
      },
      {
        id: "ped-3",
        codigo: "PED-2026-039",
        sector: "Secretaría",
        tipo: "libro_matriz",
        titulo: "Rectificación de Folio y Calificación en Libro Matriz",
        solicitante: "Mariana López",
        rolSolicitante: "Secretaría Académica",
        fecha: "Ayer, 16:30 hs",
        archivo: "Resolucion_Equivalencia_2026.pdf",
        alcance: "Ciclo Superior · Egresados 2025",
        impacto: "2 actas analíticas rectificadas",
        detalle: "Reapertura de acta de examen por resolución de equivalencia ministerial aprobada para la alumna Gómez Rocío. Requiere firma y habilitación del Director.",
        estado: "pendiente",
        aprobadoEn: null,
        aprobadoPor: null,
        datosPlanilla: [
          { alumno: "Gómez Rocío", materia: "Química Aplicada", anterior: "Previa Pendiente", nueva: "Aprobada por Equivalencia (8)", estado: "Rectificada" }
        ]
      },
      {
        id: "ped-4",
        codigo: "PED-2026-035",
        sector: "Preceptoría",
        tipo: "justificacion_asistencia",
        titulo: "Justificación Extraordinaria por Licencia Médica Prolongada",
        solicitante: "Carlos Ramos",
        rolSolicitante: "Jefe de Preceptores",
        fecha: "10 de Octubre, 11:20 hs",
        archivo: "Certificado_Medico_Avalado.pdf",
        alcance: "2° 1° · Turno Mañana",
        impacto: "14 inasistencias justificadas",
        detalle: "Dispensa reglamentaria con reincorporación y plan de continuidad pedagógica domiciliaria del estudiante Benítez Julián.",
        estado: "aprobado",
        aprobadoEn: "10/10/2026 14:10 hs",
        aprobadoPor: "Dirección General",
        datosPlanilla: [
          { alumno: "Benítez Julián", materia: "Inasistencias 15/09 al 02/10", anterior: "Injustificadas (14)", nueva: "Justificadas por Dispensa", estado: "Aprobado" }
        ]
      }
    ];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(iniciales));
    } catch {
      // Ignorar error
    }
    return iniciales;
  },

  /**
   * Habilita y aprueba un pedido, permitiendo que la actualización se aplique.
   */
  async aprobarPedido(pedidoId) {
    const STORAGE_KEY = "prece_pedidos_director";
    const lista = await this.listarPedidos();
    const ahora = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());

    const actualizada = lista.map((p) => {
      if (p.id === pedidoId) {
        return {
          ...p,
          estado: "aprobado",
          aprobadoEn: `${ahora} hs`,
          aprobadoPor: "Dirección General"
        };
      }
      return p;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Ignorar error
    }
    return actualizada;
  },

  /**
   * Rechaza un pedido, impidiendo que los cambios se sincronicen o actualicen.
   */
  async rechazarPedido(pedidoId, motivo = "Rechazado por Dirección") {
    const STORAGE_KEY = "prece_pedidos_director";
    const lista = await this.listarPedidos();
    const ahora = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());

    const actualizada = lista.map((p) => {
      if (p.id === pedidoId) {
        return {
          ...p,
          estado: "rechazado",
          rechazadoEn: `${ahora} hs`,
          motivoRechazo: motivo
        };
      }
      return p;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Ignorar error
    }
    return actualizada;
  },

  /**
   * Simula la creación de un nuevo pedido de actualización desde Server.
   */
  async crearPedidoPrueba(sector = "Server") {
    const STORAGE_KEY = "prece_pedidos_director";
    const lista = await this.listarPedidos();
    const numero = Math.floor(Math.random() * 800) + 100;
    const nuevo = {
      id: `ped-${Date.now()}`,
      codigo: `PED-2026-${numero}`,
      sector,
      tipo: "actualizacion_planillas",
      titulo: `Actualización de Planilla de Cursos y Alumnos - 5° 2° (${sector})`,
      solicitante: "Lucas Gómez",
      rolSolicitante: `Operador Técnico · ${sector}`,
      fecha: "Hace instantes",
      archivo: `Planilla_Actualizacion_${sector}_5to2da.xlsx`,
      alcance: "5° 2° Informática · Turno Tarde",
      impacto: "58 registros modificados · 29 alumnos",
      detalle: "Solicitud de sincronización de nueva planilla de notas y equivalencias de taller cargada en Server. Requiere aprobación directiva para sobrescribir.",
      estado: "pendiente",
      aprobadoEn: null,
      aprobadoPor: null,
      datosPlanilla: [
        { alumno: "Martínez Juan", materia: "Modelos y Sistemas", anterior: "6 (Seis)", nueva: "8 (Ocho)", estado: "Modificada" },
        { alumno: "Ríos Valentina", materia: "Seguridad Informática", anterior: "Pendiente", nueva: "9 (Nueve)", estado: "Nueva" },
        { alumno: "Vargas Franco", materia: "Prácticas Profesionalizantes", anterior: "7 (Siete)", nueva: "10 (Diez)", estado: "Modificada" }
      ]
    };

    const actualizada = [nuevo, ...lista];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Ignorar error
    }
    return actualizada;
  },

  // =========================================================================
  // GESTIÓN DE ASIGNACIONES: PRECEPTORES Y PROFESORES A CURSOS
  // =========================================================================

  /**
   * Obtiene el listado de las 27 divisiones institucionales con sus preceptores asignados.
   */
  async listarAsignacionesPreceptores() {
    const STORAGE_KEY = "prece_asignaciones_preceptores";
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        return JSON.parse(guardado);
      }
    } catch {
      // Ignorar error de storage
    }

    const DIVISIONES_DEF = [
      { anio: 1, division: "1", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 1, division: "2", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 1, division: "3", turno: "Tarde", orientacion: "Ciclo Básico" },
      { anio: 1, division: "4", turno: "Tarde", orientacion: "Ciclo Básico" },
      { anio: 1, division: "6", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 2, division: "1", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 2, division: "2", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 2, division: "3", turno: "Tarde", orientacion: "Ciclo Básico" },
      { anio: 2, division: "4", turno: "Tarde", orientacion: "Ciclo Básico" },
      { anio: 2, division: "6", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 3, division: "1", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 3, division: "2", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 3, division: "3", turno: "Tarde", orientacion: "Ciclo Básico" },
      { anio: 3, division: "4", turno: "Tarde", orientacion: "Ciclo Básico" },
      { anio: 3, division: "6", turno: "Mañana", orientacion: "Ciclo Básico" },
      { anio: 4, division: "1", turno: "Mañana", orientacion: "Técnico en Informática" },
      { anio: 4, division: "2", turno: "Tarde", orientacion: "Técnico en Informática" },
      { anio: 4, division: "3", turno: "Mañana", orientacion: "Técnico en Programación" },
      { anio: 4, division: "4", turno: "Tarde", orientacion: "Técnico en Programación" },
      { anio: 5, division: "1", turno: "Mañana", orientacion: "Técnico en Informática" },
      { anio: 5, division: "2", turno: "Tarde", orientacion: "Técnico en Informática" },
      { anio: 5, division: "3", turno: "Mañana", orientacion: "Técnico en Programación" },
      { anio: 5, division: "4", turno: "Tarde", orientacion: "Técnico en Programación" },
      { anio: 6, division: "1", turno: "Mañana", orientacion: "Técnico en Informática" },
      { anio: 6, division: "3", turno: "Mañana", orientacion: "Técnico en Programación" },
      { anio: 7, division: "1", turno: "Mañana", orientacion: "Técnico en Informática" },
      { anio: 7, division: "2", turno: "Tarde", orientacion: "Técnico en Programación" }
    ];

    const iniciales = DIVISIONES_DEF.map((d) => {
      const id = `${d.anio}-${d.division}`;
      // Asignar por defecto 1° 1° y 2° 1° para reflejar 2 de 27 asignadas como en la maqueta
      if (d.anio === 1 && d.division === "1") {
        return {
          id,
          anio: d.anio,
          curso: `${d.anio}°`,
          division: `División ${d.division}`,
          numDivision: d.division,
          turno: d.turno,
          orientacion: d.orientacion,
          preceptor: {
            id: "usr-preceptor-1",
            nombre: "Preceptor 1° A",
            email: "preceptor@prece.local",
            avatar: "P"
          },
          estado: "asignado",
          actualizadoEn: "2026-03-02"
        };
      }
      if (d.anio === 2 && d.division === "1") {
        return {
          id,
          anio: d.anio,
          curso: `${d.anio}°`,
          division: `División ${d.division}`,
          numDivision: d.division,
          turno: d.turno,
          orientacion: d.orientacion,
          preceptor: {
            id: "usr-preceptor-2",
            nombre: "Carlos Ramos",
            email: "cramos@prece.local",
            avatar: "C"
          },
          estado: "asignado",
          actualizadoEn: "2026-03-02"
        };
      }
      return {
        id,
        anio: d.anio,
        curso: `${d.anio}°`,
        division: `División ${d.division}`,
        numDivision: d.division,
        turno: d.turno,
        orientacion: d.orientacion,
        preceptor: null,
        estado: "sin_asignar",
        actualizadoEn: null
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(iniciales));
    } catch {
      // Silencioso
    }

    return iniciales;
  },

  /**
   * Guarda o reasigna un preceptor para una división específica.
   */
  async guardarAsignacionPreceptor(divisionId, preceptorData) {
    const STORAGE_KEY = "prece_asignaciones_preceptores";
    const lista = await this.listarAsignacionesPreceptores();
    const ids = Array.isArray(divisionId) ? divisionId : [divisionId];
    const actualizada = lista.map((item) => {
      if (ids.includes(item.id)) {
        return {
          ...item,
          preceptor: {
            id: preceptorData.id || `prec-${Date.now()}`,
            nombre: preceptorData.nombreCompleto || preceptorData.nombre || "Preceptor Asignado",
            email: preceptorData.email || "preceptor@prece.local",
            avatar: (preceptorData.nombreCompleto || preceptorData.nombre || "P").charAt(0).toUpperCase()
          },
          estado: "asignado",
          actualizadoEn: new Date().toISOString().split("T")[0]
        };
      }
      return item;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Silencioso
    }

    return actualizada;
  },

  /**
   * Quita la asignación de preceptor de una división.
   */
  async quitarAsignacionPreceptor(divisionId) {
    const STORAGE_KEY = "prece_asignaciones_preceptores";
    const lista = await this.listarAsignacionesPreceptores();
    const ids = Array.isArray(divisionId) ? divisionId : [divisionId];
    const actualizada = lista.map((item) => {
      if (ids.includes(item.id)) {
        return {
          ...item,
          preceptor: null,
          estado: "sin_asignar",
          actualizadoEn: new Date().toISOString().split("T")[0]
        };
      }
      return item;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Silencioso
    }

    return actualizada;
  },

  /**
   * Obtiene el listado de materias y cátedras con sus profesores asignados.
   */
  async listarAsignacionesProfesores() {
    const STORAGE_KEY = "prece_asignaciones_profesores";
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) {
        const parsed = JSON.parse(guardado);
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
    } catch {
      // Ignorar error de storage
    }

    const iniciales = [
      {
        id: "cat-1",
        anio: 1,
        curso: "1°",
        division: "División 1",
        numDivision: "1",
        materia: "Matemática",
        area: "Ciencias Exactas",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-1",
          nombre: "Docente Matemática",
          email: "docente@prece.local",
          avatar: "D"
        },
        estado: "asignado"
      },
      {
        id: "cat-2",
        anio: 1,
        curso: "1°",
        division: "División 1",
        numDivision: "1",
        materia: "Prácticas del Lenguaje",
        area: "Lengua y Comunicación",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-2",
          nombre: "Prof. María Villatoro",
          email: "mvillatoro@prece.local",
          avatar: "M"
        },
        estado: "asignado"
      },
      {
        id: "cat-3",
        anio: 1,
        curso: "1°",
        division: "División 1",
        numDivision: "1",
        materia: "Ciencias Sociales",
        area: "Ciencias Sociales",
        turno: "Mañana",
        cargaHoraria: "3 hs semanales",
        profesor: {
          id: "usr-doc-3",
          nombre: "Prof. Lucía Ríos",
          email: "lrios@prece.local",
          avatar: "L"
        },
        estado: "asignado"
      },
      {
        id: "cat-4",
        anio: 1,
        curso: "1°",
        division: "División 1",
        numDivision: "1",
        materia: "Ciencias Naturales",
        area: "Ciencias Naturales",
        turno: "Mañana",
        cargaHoraria: "3 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-5",
        anio: 1,
        curso: "1°",
        division: "División 1",
        numDivision: "1",
        materia: "Educación Física",
        area: "Deportes",
        turno: "Mañana",
        cargaHoraria: "2 hs semanales",
        profesor: {
          id: "usr-doc-4",
          nombre: "Prof. Humberto Sosa",
          email: "hsosa@prece.local",
          avatar: "H"
        },
        estado: "asignado"
      },
      {
        id: "cat-6",
        anio: 1,
        curso: "1°",
        division: "División 1",
        numDivision: "1",
        materia: "Procedimientos Técnicos (Taller)",
        area: "Técnica",
        turno: "Mañana",
        cargaHoraria: "6 hs semanales",
        profesor: {
          id: "usr-doc-5",
          nombre: "Prof. Esteban Gómez",
          email: "egomez@prece.local",
          avatar: "E"
        },
        estado: "asignado"
      },
      {
        id: "cat-7",
        anio: 1,
        curso: "1°",
        division: "División 2",
        numDivision: "2",
        materia: "Matemática",
        area: "Ciencias Exactas",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-1",
          nombre: "Docente Matemática",
          email: "docente@prece.local",
          avatar: "D"
        },
        estado: "asignado"
      },
      {
        id: "cat-8",
        anio: 1,
        curso: "1°",
        division: "División 2",
        numDivision: "2",
        materia: "Prácticas del Lenguaje",
        area: "Lengua y Comunicación",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-2",
          nombre: "Prof. María Villatoro",
          email: "mvillatoro@prece.local",
          avatar: "M"
        },
        estado: "asignado"
      },
      {
        id: "cat-9",
        anio: 1,
        curso: "1°",
        division: "División 2",
        numDivision: "2",
        materia: "Ciencias Sociales",
        area: "Ciencias Sociales",
        turno: "Mañana",
        cargaHoraria: "3 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-10",
        anio: 1,
        curso: "1°",
        division: "División 3",
        numDivision: "3",
        materia: "Matemática",
        area: "Ciencias Exactas",
        turno: "Tarde",
        cargaHoraria: "4 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-11",
        anio: 2,
        curso: "2°",
        division: "División 1",
        numDivision: "1",
        materia: "Matemática",
        area: "Ciencias Exactas",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-1",
          nombre: "Docente Matemática",
          email: "docente@prece.local",
          avatar: "D"
        },
        estado: "asignado"
      },
      {
        id: "cat-12",
        anio: 2,
        curso: "2°",
        division: "División 1",
        numDivision: "1",
        materia: "Física y Química",
        area: "Ciencias Naturales",
        turno: "Mañana",
        cargaHoraria: "3 hs semanales",
        profesor: {
          id: "usr-doc-3",
          nombre: "Prof. Lucía Ríos",
          email: "lrios@prece.local",
          avatar: "L"
        },
        estado: "asignado"
      },
      {
        id: "cat-13",
        anio: 2,
        curso: "2°",
        division: "División 1",
        numDivision: "1",
        materia: "Historia",
        area: "Ciencias Sociales",
        turno: "Mañana",
        cargaHoraria: "2 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-14",
        anio: 3,
        curso: "3°",
        division: "División 1",
        numDivision: "1",
        materia: "Biología",
        area: "Ciencias Naturales",
        turno: "Mañana",
        cargaHoraria: "3 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-15",
        anio: 4,
        curso: "4°",
        division: "División 1",
        numDivision: "1",
        materia: "Programación I",
        area: "Informática",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-1",
          nombre: "Docente Matemática",
          email: "docente@prece.local",
          avatar: "D"
        },
        estado: "asignado"
      },
      {
        id: "cat-16",
        anio: 4,
        curso: "4°",
        division: "División 1",
        numDivision: "1",
        materia: "Sistemas Operativos",
        area: "Informática",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-6",
          nombre: "Prof. Andrea Ferreyra",
          email: "aferreyra@prece.local",
          avatar: "A"
        },
        estado: "asignado"
      },
      {
        id: "cat-17",
        anio: 4,
        curso: "4°",
        division: "División 1",
        numDivision: "1",
        materia: "Aplicaciones Web",
        area: "Informática",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-18",
        anio: 4,
        curso: "4°",
        division: "División 3",
        numDivision: "3",
        materia: "Algoritmos y Estructura de Datos",
        area: "Programación",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-6",
          nombre: "Prof. Andrea Ferreyra",
          email: "aferreyra@prece.local",
          avatar: "A"
        },
        estado: "asignado"
      },
      {
        id: "cat-19",
        anio: 4,
        curso: "4°",
        division: "División 3",
        numDivision: "3",
        materia: "Bases de Datos",
        area: "Programación",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-20",
        anio: 5,
        curso: "5°",
        division: "División 1",
        numDivision: "1",
        materia: "Redes y Telecomunicaciones",
        area: "Informática",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      },
      {
        id: "cat-21",
        anio: 5,
        curso: "5°",
        division: "División 1",
        numDivision: "1",
        materia: "Programación II",
        area: "Informática",
        turno: "Mañana",
        cargaHoraria: "4 hs semanales",
        profesor: {
          id: "usr-doc-1",
          nombre: "Docente Matemática",
          email: "docente@prece.local",
          avatar: "D"
        },
        estado: "asignado"
      },
      {
        id: "cat-22",
        anio: 6,
        curso: "6°",
        division: "División 1",
        numDivision: "1",
        materia: "Prácticas Profesionalizantes I",
        area: "Técnica Profesional",
        turno: "Mañana",
        cargaHoraria: "8 hs semanales",
        profesor: {
          id: "usr-doc-5",
          nombre: "Prof. Esteban Gómez",
          email: "egomez@prece.local",
          avatar: "E"
        },
        estado: "asignado"
      },
      {
        id: "cat-23",
        anio: 7,
        curso: "7°",
        division: "División 1",
        numDivision: "1",
        materia: "Prácticas Profesionalizantes II",
        area: "Técnica Profesional",
        turno: "Mañana",
        cargaHoraria: "10 hs semanales",
        profesor: {
          id: "usr-doc-5",
          nombre: "Prof. Esteban Gómez",
          email: "egomez@prece.local",
          avatar: "E"
        },
        estado: "asignado"
      },
      {
        id: "cat-24",
        anio: 7,
        curso: "7°",
        division: "División 1",
        numDivision: "1",
        materia: "Emprendimientos Productivos",
        area: "Economía y Gestión",
        turno: "Mañana",
        cargaHoraria: "3 hs semanales",
        profesor: null,
        estado: "sin_asignar"
      }
    ];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(iniciales));
    } catch {
      // Silencioso
    }

    return iniciales;
  },

  /**
   * Guarda o reasigna un profesor a una materia/cátedra específica.
   */
  async guardarAsignacionProfesor(catedraId, profesorData) {
    const STORAGE_KEY = "prece_asignaciones_profesores";
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
          cargaHoraria
        };
      }
      return item;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Silencioso
    }

    return actualizada;
  },

  /**
   * Quita la asignación de profesor de una materia/cátedra.
   */
  async quitarAsignacionProfesor(catedraId) {
    const STORAGE_KEY = "prece_asignaciones_profesores";
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

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Silencioso
    }

    return actualizada;
  },

  /**
   * Agrega una nueva cátedra/materia a la grilla de asignaciones.
   */
  async crearAsignacionProfesor(datos) {
    const STORAGE_KEY = "prece_asignaciones_profesores";
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizada));
    } catch {
      // Silencioso
    }

    return actualizada;
  }
};

