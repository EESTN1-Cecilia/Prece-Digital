/**
 * Adaptador de servicios para el Módulo de Dirección.
 * Centraliza métricas institucionales, gestión de personal, creación de perfiles y asignación de roles.
 */

import { pedir } from "../../services/http.js";
import { roles as ROLES_CATALOGO } from "../../../../../Shared/src/domain.mjs";

/* Forma que usa la seccion de asignaciones de Direccion. */
function vistaDivisionPreceptor(division) {
  const turno = division.turno === "tarde" ? "Tarde" : "Mañana";
  return {
    id: division.id,
    anio: division.anio,
    curso: `${division.anio}°`,
    division: `División ${division.division}`,
    numDivision: division.division,
    turno,
    orientacion: division.orientacion || "Ciclo Básico",
    activos: division.activos,
    preceptor: division.preceptor
      ? { ...division.preceptor, avatar: String(division.preceptor.nombre || "P").charAt(0).toUpperCase() }
      : null,
    estado: division.estado
  };
}

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

/* Traduce un usuario del backend a la forma que usan las vistas del panel.
   El area se guarda como identificador (area) y se muestra con su nombre
   (areaNombre): el texto viene del catalogo institucional del servidor. */
export function mapearPerfil(u = {}) {
  const rawRoles = u.roles || u.assignments?.map((a) => a.role || a) || [];
  const roles = rawRoles
    .map((r) => {
      const id = typeof r === "string" ? r : (r?.id || r?.role || r?.codigo);
      const catalogo = ROLES_DISPONIBLES.find((c) => c.id === id);
      return {
        id,
        nombre: catalogo?.nombre || id,
        color: catalogo?.color || "#64748b"
      };
    })
    .filter((rol) => Boolean(rol.id));

  const nombreCompleto =
    u.displayName || [u.nombre, u.apellido].filter(Boolean).join(" ") || u.email || "";

  return {
    id: u.id,
    nombre: u.nombre || nombreCompleto.split(" ")[0] || "",
    apellido: u.apellido || nombreCompleto.split(" ").slice(1).join(" ") || "",
    nombreCompleto,
    email: u.email,
    dni: u.dni || "—",
    telefono: u.telefono || "—",
    area: u.area ?? null,
    areaNombre: u.areaNombre ?? null,
    roles,
    estado: u.isActive === false || u.estado === "inactivo" ? "inactivo" : "activo",
    ultimoAcceso: u.ultimoAcceso || u.lastLoginAt || null,
    creadoEn: u.creadoEn || u.createdAt || null
  };
}

export const DirectorService = {
  /**
   * Obtiene las métricas consolidadas de la institución para el Director.
   *
   * Cada bloque se arma con lo que devuelve el backend. Cuando un módulo no
   * está disponible (o el usuario no tiene permiso para verlo) el bloque
   * queda con `disponible: false` y la vista lo dice, en lugar de mostrar una
   * cifra inventada.
   */
  async getDashboardConsolidado() {
    const resumen = {
      alumnos: {
        disponible: false,
        totalActivos: 0,
        total: 0,
        porTurno: [],
        divisiones: 0,
        alumnosEnRiesgo: 0,
        casosDestacados: [],
        alertas: []
      },
      personal: {
        disponible: false,
        totalUsuarios: 0,
        activos: 0,
        inactivos: 0,
        porRol: {}
      },
      asistencia: {
        disponible: false,
        totalInasistencias: 0,
        justificadas: 0,
        noJustificadas: 0,
        pendientes: 0,
        alumnosEnRiesgo: 0,
        porDivision: []
      },
      serverPañol: {
        disponible: false,
        totalItems: 0,
        sinStock: 0,
        stockBajo: 0,
        solicitudesPendientes: 0,
        reservasActivas: 0,
        alertas: []
      },
      academico: {
        disponible: false,
        totalMateriasPendientes: 0,
        totalMateriasDesaprobadas: 0,
        cambiosCursoPendientes: 0,
        casosDestacados: []
      }
    };

    // 1. Personal: el mismo listado que usa la pestana de gestion de roles.
    try {
      const { items } = await this.listarPerfiles();
      resumen.personal.disponible = true;
      resumen.personal.totalUsuarios = items.length;
      resumen.personal.activos = items.filter((u) => u.estado === "activo").length;
      resumen.personal.inactivos = items.length - resumen.personal.activos;

      for (const u of items) {
        for (const rol of u.roles) {
          resumen.personal.porRol[rol.id] = (resumen.personal.porRol[rol.id] ?? 0) + 1;
        }
      }
    } catch {
      // El bloque queda marcado como no disponible: la vista lo informa.
    }

    // 2. Secretaria: matricula, turnos, divisiones y alertas academicas.
    try {
      const dashSec = await pedir("/api/v1/dashboard/secretaria");
      const alumnos = dashSec?.resumenAlumnos;

      if (alumnos) {
        resumen.alumnos.disponible = true;
        resumen.alumnos.totalActivos = alumnos.activos ?? 0;
        resumen.alumnos.total = alumnos.total ?? 0;
        resumen.alumnos.porTurno = Array.isArray(alumnos.porTurno) ? alumnos.porTurno : [];
      }

      if (Array.isArray(dashSec?.alumnosPorCurso)) {
        resumen.alumnos.divisiones = dashSec.alumnosPorCurso.length;
      }

      if (Array.isArray(dashSec?.alertas)) {
        resumen.alumnos.alertas = dashSec.alertas;
        resumen.alumnos.alumnosEnRiesgo = dashSec.alertas.length;
      }

      if (dashSec?.situacionesAcademicas) {
        resumen.academico.disponible = true;
        resumen.academico.totalMateriasPendientes = dashSec.situacionesAcademicas.totalMateriasPendientes ?? 0;
        resumen.academico.totalMateriasDesaprobadas = dashSec.situacionesAcademicas.totalMateriasDesaprobadas ?? 0;
        resumen.academico.cambiosCursoPendientes = dashSec.situacionesAcademicas.cambiosCursoPendientes ?? 0;
        resumen.academico.casosDestacados = Array.isArray(dashSec.situacionesAcademicas.casosDestacados)
          ? dashSec.situacionesAcademicas.casosDestacados
          : [];
        resumen.alumnos.casosDestacados = resumen.academico.casosDestacados;
      }

      if (dashSec?.inasistencias) {
        /* El tablero de Secretaria todavia no tiene modulo de asistencia: de
           ahi solo sale la cantidad de alumnos en riesgo. */
        resumen.asistencia.alumnosEnRiesgo = dashSec.inasistencias.alumnosEnRiesgo ?? 0;
      }
    } catch {
      // Silencioso: el bloque queda marcado como no disponible.
    }

    /* 2b. Inasistencias: el modulo de asistencia tiene los registros reales.
       Las totales y el detalle pordivision se calculan en el servidor, asi
       que el tablero no inventa ninguna cifra. */
    try {
      const estadisticas = await pedir("/api/v1/inasistencias/estadisticas");
      const totales = estadisticas?.totales;

      if (totales) {
        resumen.asistencia.disponible = true;
        resumen.asistencia.totalInasistencias = totales.total ?? 0;
        resumen.asistencia.justificadas = totales.justificadas ?? 0;
        resumen.asistencia.noJustificadas = totales.noJustificadas ?? 0;
        resumen.asistencia.pendientes = totales.pendientes ?? 0;
      }

      if (Array.isArray(estadisticas?.porDivision)) {
        resumen.asistencia.porDivision = estadisticas.porDivision;
      }
    } catch {
      // Silencioso: el bloque queda marcado como no disponible.
    }

    // 3. Server y Pañol: stock, solicitudes y reservas.
    try {
      const dashServer = await pedir("/api/v1/dashboard/server");
      const stock = dashServer?.resumenStock;

      if (stock) {
        resumen.serverPañol.disponible = true;
        resumen.serverPañol.totalItems = stock.totalMateriales ?? 0;
        resumen.serverPañol.sinStock = stock.sinStock ?? 0;
        resumen.serverPañol.stockBajo = stock.stockBajo ?? 0;
        resumen.serverPañol.reservasActivas = stock.reservados ?? 0;
      }

      if (Array.isArray(dashServer?.solicitudesPendientes)) {
        resumen.serverPañol.solicitudesPendientes = dashServer.solicitudesPendientes.length;
      }

      if (Array.isArray(dashServer?.alertas)) {
        resumen.serverPañol.alertas = dashServer.alertas;
      }
    } catch {
      // Silencioso: el bloque queda marcado como no disponible.
    }

    return resumen;
  },

  /**
   * Lista el personal registrado con filtros opcionales.
   *
   * Devuelve `{ items, paginacion }`: la lista ya normalizada para las vistas
   * y la paginacion que calculo el backend.
   */
  async listarPerfiles(filtros = {}) {
    const params = new URLSearchParams();
    if (filtros.q) params.set("q", filtros.q);
    if (filtros.rol) params.set("rol", filtros.rol);
    if (filtros.estado) params.set("estado", filtros.estado);
    if (filtros.area) params.set("area", filtros.area);
    if (filtros.pagina) params.set("pagina", String(filtros.pagina));
    if (filtros.porPagina) params.set("porPagina", String(filtros.porPagina));

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const envelope = await pedir(`/api/v1/users${queryStr}`, { crudo: true });
    const lista = Array.isArray(envelope) ? envelope : (envelope?.data ?? envelope?.items ?? []);

    return {
      items: lista.map(mapearPerfil),
      paginacion: envelope?.paginacion ?? null
    };
  },

  /**
   * Catalogo institucional de areas por las que se puede asignar personal.
   * Es la unica fuente: el frontend no escribe los sectores a mano.
   */
  async listarAreas() {
    const areas = await pedir("/api/v1/catalogos/areas");
    return Array.isArray(areas) ? areas : [];
  },

  /**
   * Identidad institucional (nombre, dependencia, ciclo lectivo, turno).
   */
  async obtenerInstitucion() {
    return pedir("/api/v1/institucion");
  },

  /**
   * Crea un nuevo perfil de usuario asignando sus roles correspondientes.
   * Devuelve la informacion del usuario creado con la clave temporal, que el
   * backend muestra una sola vez.
   */
  async crearPerfil(datos) {
    const area = String(datos.area || "").trim();
    const payload = {
      nombre: String(datos.nombre || "").trim(),
      apellido: String(datos.apellido || "").trim(),
      email: String(datos.email || "").trim().toLowerCase(),
      dni: String(datos.dni || "").trim().replace(/\D/g, ""),
      telefono: datos.telefono ? String(datos.telefono).trim() : undefined,
      area,
      roles: Array.isArray(datos.roles) ? datos.roles : [datos.roles].filter(Boolean)
    };

    if (area === "docencia") {
      payload.materia = String(datos.materia || "").trim();
      payload.situacion_revista = String(datos.situacion_revista || "").trim();
      payload.suplente_de = datos.suplente_de ? String(datos.suplente_de).trim() : null;
      payload.modulos = Number.parseInt(String(datos.modulos ?? ""), 10);
      payload.dia = String(datos.dia || "").trim();
      payload.hora_desde = String(datos.hora_desde || "").trim();
      payload.hora_hasta = String(datos.hora_hasta || "").trim();
    }

    const res = await pedir("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    return res?.data ?? res?.body?.data ?? res;
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
   * Divisiones del catalogo con el preceptor a cargo de cada una, y los
   * preceptores con cuenta activa. La asignacion vive en el backend y define
   * que cursos ve cada preceptor (pantallas y autorizacion).
   */
  async obtenerAsignacionesPreceptores() {
    const respuesta = await pedir("/api/v1/preceptor/asignaciones", { crudo: true, recurso: "las asignaciones de preceptores" });
    return {
      divisiones: (respuesta?.data ?? []).map(vistaDivisionPreceptor),
      preceptores: (respuesta?.preceptores ?? []).map((preceptor) => ({ ...preceptor, nombreCompleto: preceptor.nombre }))
    };
  },

  async listarAsignacionesPreceptores() {
    return (await this.obtenerAsignacionesPreceptores()).divisiones;
  },

  /**
   * Asigna (o reasigna) el preceptor a cargo de una division "<anio>-<division>".
   * Devuelve el listado actualizado.
   */
  async guardarAsignacionPreceptor(divisionId, preceptorData) {
    await pedir(`/api/v1/preceptor/asignaciones/${encodeURIComponent(divisionId)}`, {
      method: "PUT",
      body: JSON.stringify({ preceptorId: preceptorData.id }),
      crudo: true
    });
    return this.listarAsignacionesPreceptores();
  },

  /**
   * Quita la asignación de preceptor de una división.
   */
  async quitarAsignacionPreceptor(divisionId) {
    await pedir(`/api/v1/preceptor/asignaciones/${encodeURIComponent(divisionId)}`, { method: "DELETE", crudo: true });
    return this.listarAsignacionesPreceptores();
  },

  /**
   * Obtiene el listado de materias y cátedras con sus profesores asignados.
   */
  async listarAsignacionesProfesores() {
    const STORAGE_KEY = "prece_asignaciones_profesores";
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
    const actualizada = lista.map((item) => {
      if (item.id === catedraId) {
        return {
          ...item,
          profesor: {
            id: profesorData.id || `doc-${Date.now()}`,
            nombre: profesorData.nombreCompleto || profesorData.nombre || "Docente Asignado",
            email: profesorData.email || "docente@prece.local",
            avatar: (profesorData.nombreCompleto || profesorData.nombre || "D").charAt(0).toUpperCase()
          },
          estado: "asignado",
          cargaHoraria: profesorData.cargaHoraria || item.cargaHoraria || "4 hs semanales"
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
    const actualizada = lista.map((item) => {
      if (item.id === catedraId) {
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

