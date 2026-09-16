import { httpClient } from "../../services/http-client.js";

/**
 * Catálogo de respaldo completo con las 27 divisiones institucionales de la E.E.S.T N°1 Monte Grande.
 */
const BACKUP_ALUMNOS = [
  { id: 1, legajo: "LEG-2026-001", apellido: "González", nombre: "Lucas Agustín", dni: "46.123.456", curso: "1°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "l.gonzalez@eest1.edu.ar", telefono: "11-4290-1122" },
  { id: 2, legajo: "LEG-2026-002", apellido: "Rodríguez", nombre: "Martina Sol", dni: "46.234.567", curso: "1°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "m.rodriguez@eest1.edu.ar", telefono: "11-4290-3344" },
  { id: 3, legajo: "LEG-2026-003", apellido: "Pérez", nombre: "Camila Belén", dni: "46.345.678", curso: "1°", division: "2", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "c.perez@eest1.edu.ar", telefono: "11-4290-5566" },
  { id: 4, legajo: "LEG-2026-004", apellido: "Fernández", nombre: "Tomás Ignacio", dni: "46.456.789", curso: "1°", division: "2", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Pase pendiente", email: "t.fernandez@eest1.edu.ar", telefono: "11-4290-7788" },
  { id: 5, legajo: "LEG-2026-005", apellido: "López", nombre: "Julieta Nair", dni: "46.567.890", curso: "1°", division: "3", turno: "Tarde", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "j.lopez@eest1.edu.ar", telefono: "11-4290-9900" },
  { id: 6, legajo: "LEG-2026-006", apellido: "Martínez", nombre: "Mateo Ezequiel", dni: "46.678.901", curso: "1°", division: "3", turno: "Tarde", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Inactivo", email: "m.martinez@eest1.edu.ar", telefono: "11-4290-1234" },
  { id: 7, legajo: "LEG-2026-007", apellido: "Gómez", nombre: "Valentina Lucía", dni: "46.789.012", curso: "1°", division: "4", turno: "Tarde", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "v.gomez@eest1.edu.ar", telefono: "11-4290-2345" },
  { id: 8, legajo: "LEG-2026-008", apellido: "Díaz", nombre: "Joaquín Lautaro", dni: "46.890.123", curso: "1°", division: "6", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "j.diaz@eest1.edu.ar", telefono: "11-4290-3456" },
  { id: 9, legajo: "LEG-2025-009", apellido: "Alvarez", nombre: "Nicolás Daniel", dni: "45.112.233", curso: "2°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "n.alvarez@eest1.edu.ar", telefono: "11-4290-4567" },
  { id: 10, legajo: "LEG-2025-010", apellido: "Romero", nombre: "Agustín Gabriel", dni: "45.223.344", curso: "2°", division: "2", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "a.romero@eest1.edu.ar", telefono: "11-4290-5678" },
  { id: 11, legajo: "LEG-2025-011", apellido: "Benítez", nombre: "Sofía Valentina", dni: "45.334.455", curso: "2°", division: "3", turno: "Tarde", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "s.benitez@eest1.edu.ar", telefono: "11-4290-6789" },
  { id: 12, legajo: "LEG-2025-012", apellido: "Sosa", nombre: "Franco Damián", dni: "45.445.566", curso: "2°", division: "4", turno: "Tarde", orientacion: "Ciclo Básico", condicion: "Libre", estado: "Inactivo", email: "f.sosa@eest1.edu.ar", telefono: "11-4290-7890" },
  { id: 13, legajo: "LEG-2025-013", apellido: "Torres", nombre: "Milagros Micaela", dni: "45.556.677", curso: "2°", division: "6", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "m.torres@eest1.edu.ar", telefono: "11-4290-8901" },
  { id: 14, legajo: "LEG-2024-014", apellido: "Ruiz", nombre: "Santiago Joel", dni: "44.123.987", curso: "3°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "s.ruiz@eest1.edu.ar", telefono: "11-4290-9012" },
  { id: 15, legajo: "LEG-2024-015", apellido: "Ramírez", nombre: "Florencia Aylén", dni: "44.234.876", curso: "3°", division: "2", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "f.ramirez@eest1.edu.ar", telefono: "11-4290-0123" },
  { id: 16, legajo: "LEG-2024-016", apellido: "Flores", nombre: "Facundo Iván", dni: "44.345.765", curso: "3°", division: "3", turno: "Tarde", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Pase pendiente", email: "f.flores@eest1.edu.ar", telefono: "11-4290-1357" },
  { id: 17, legajo: "LEG-2024-017", apellido: "Acosta", nombre: "Candela Rocío", dni: "44.456.654", curso: "3°", division: "4", turno: "Tarde", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "c.acosta@eest1.edu.ar", telefono: "11-4290-2468" },
  { id: 18, legajo: "LEG-2024-018", apellido: "Silva", nombre: "Benjamín Elías", dni: "44.567.543", curso: "3°", division: "6", turno: "Mañana", orientacion: "Ciclo Básico", condicion: "Regular", estado: "Activo", email: "b.silva@eest1.edu.ar", telefono: "11-4290-3579" },
  { id: 19, legajo: "LEG-2023-019", apellido: "Medina", nombre: "Lautaro Nahuel", dni: "43.111.222", curso: "4°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", condicion: "Regular", estado: "Activo", email: "l.medina@eest1.edu.ar", telefono: "11-4290-4680" },
  { id: 20, legajo: "LEG-2023-020", apellido: "Herrera", nombre: "Zoe Abigail", dni: "43.222.333", curso: "4°", division: "2", turno: "Tarde", orientacion: "Técnico en Informática", condicion: "Regular", estado: "Activo", email: "z.herrera@eest1.edu.ar", telefono: "11-4290-5791" },
  { id: 21, legajo: "LEG-2023-021", apellido: "Aguirre", nombre: "Thiago Valentín", dni: "43.333.444", curso: "4°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", condicion: "Regular", estado: "Activo", email: "t.aguirre@eest1.edu.ar", telefono: "11-4290-6802" },
  { id: 22, legajo: "LEG-2023-022", apellido: "Castro", nombre: "Brisa Morena", dni: "43.444.555", curso: "4°", division: "4", turno: "Tarde", orientacion: "Técnico en Programación", condicion: "Regular", estado: "Activo", email: "b.castro@eest1.edu.ar", telefono: "11-4290-7913" },
  { id: 23, legajo: "LEG-2022-023", apellido: "Gutiérrez", nombre: "Matías Alejandro", dni: "42.555.666", curso: "5°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", condicion: "Regular", estado: "Activo", email: "m.gutierrez@eest1.edu.ar", telefono: "11-4290-8024" },
  { id: 24, legajo: "LEG-2022-024", apellido: "Molina", nombre: "Kiara Denise", dni: "42.666.777", curso: "5°", division: "2", turno: "Tarde", orientacion: "Técnico en Informática", condicion: "Regular", estado: "Activo", email: "k.molina@eest1.edu.ar", telefono: "11-4290-9135" },
  { id: 25, legajo: "LEG-2022-025", apellido: "Navarro", nombre: "Ignacio David", dni: "42.777.888", curso: "5°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", condicion: "Regular", estado: "Activo", email: "i.navarro@eest1.edu.ar", telefono: "11-4290-0246" },
  { id: 26, legajo: "LEG-2022-026", apellido: "Ríos", nombre: "Luciana Paula", dni: "42.888.999", curso: "5°", division: "4", turno: "Tarde", orientacion: "Técnico en Programación", condicion: "Regular", estado: "Activo", email: "l.rios@eest1.edu.ar", telefono: "11-4290-1358" },
  { id: 27, legajo: "LEG-2021-027", apellido: "Peralta", nombre: "Brian Emanuel", dni: "41.123.456", curso: "6°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", condicion: "Regular", estado: "Activo", email: "b.peralta@eest1.edu.ar", telefono: "11-4290-2469" },
  { id: 28, legajo: "LEG-2021-028", apellido: "Ortiz", nombre: "Constanza Guadalupe", dni: "41.234.567", curso: "6°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", condicion: "Regular", estado: "Activo", email: "c.ortiz@eest1.edu.ar", telefono: "11-4290-3580" },
  { id: 29, legajo: "LEG-2020-029", apellido: "Vargas", nombre: "Maximiliano Gastón", dni: "40.345.678", curso: "7°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", condicion: "Regular", estado: "Activo", email: "m.vargas@eest1.edu.ar", telefono: "11-4290-4691" },
  { id: 30, legajo: "LEG-2020-030", apellido: "Cabrera", nombre: "Antonella Solange", dni: "40.456.789", curso: "7°", division: "2", turno: "Tarde", orientacion: "Técnico en Programación", condicion: "Regular", estado: "Activo", email: "a.cabrera@eest1.edu.ar", telefono: "11-4290-5802" }
];

function formatDni(dni) {
  const str = String(dni || "").replace(/\D/g, "");
  if (str.length === 8) {
    return `${str.slice(0, 2)}.${str.slice(2, 5)}.${str.slice(5)}`;
  }
  if (str.length === 7) {
    return `${str.slice(0, 1)}.${str.slice(1, 4)}.${str.slice(4)}`;
  }
  return String(dni || "");
}

export const StudentsService = {
  /**
   * Consulta alumnos con soporte completo de filtros, búsqueda, orden y paginación.
   */
  async getAlumnos(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && val !== "todos" && val !== "todas") {
        queryParams.set(key, val);
      }
    });

    const endpoint = `/api/v1/alumnos${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    try {
      const response = await httpClient(endpoint);
      if (response && response.data && response.pagination) {
        const mappedData = response.data.map((item) => ({
          id: item.id || item.alumnoId,
          legajo: item.legajo || `LEG-${item.id}`,
          apellido: item.apellido,
          nombre: item.nombre,
          dni: formatDni(item.dni),
          curso: typeof item.curso === "object" ? `${item.curso?.anio}°` : item.curso || "1°",
          division: typeof item.division === "object" ? String(item.division?.numero) : String(item.division || "1"),
          turno: item.turno || (typeof item.division === "object" ? item.division?.turnoAula : "Mañana"),
          orientacion: item.orientacion || "Ciclo Básico",
          condicion: item.condicion === "irregular" ? "Libre" : (item.condicion || "Regular"),
          estado: item.estado === "inactivo" ? "Inactivo" : item.estado === "activo" ? "Activo" : (item.estado || "Activo"),
          email: item.email || `${item.nombre?.[0]?.toLowerCase()}.${item.apellido?.toLowerCase()}@eest1.edu.ar`,
          telefono: item.telefono || "11-4290-0000"
        }));

        return {
          ...response,
          data: mappedData
        };
      }
      return this._fallbackGetAlumnos(params);
    } catch {
      return this._fallbackGetAlumnos(params);
    }
  },

  /**
   * Fallback de procesamiento local cuando la API no esté disponible o responda con error.
   */
  _fallbackGetAlumnos(params = {}) {
    let {
      q = "",
      dni = "",
      apellido = "",
      nombre = "",
      curso = "",
      division = "",
      turno = "",
      condicion = "",
      estado = "",
      sortBy = "apellido",
      sortOrder = "asc",
      page = 1,
      limit = 10
    } = params;

    page = Math.max(1, Number.parseInt(page, 10) || 1);
    limit = Math.max(1, Number.parseInt(limit, 10) || 10);

    let custom = [];
    try {
      custom = JSON.parse(localStorage.getItem("prece_alumnos_custom") || "[]");
    } catch {}
    const existingIds = new Set(BACKUP_ALUMNOS.map((a) => a.id));
    const newCustom = custom.filter((c) => !existingIds.has(c.id));
    let results = [...newCustom, ...BACKUP_ALUMNOS];

    if (q && q.trim()) {
      const query = q.trim().toLowerCase().replace(/\./g, "");
      results = results.filter((alumno) => {
        const cleanDni = String(alumno.dni || "").replace(/\./g, "").toLowerCase();
        const cleanApellido = String(alumno.apellido || "").toLowerCase();
        const cleanNombre = String(alumno.nombre || "").toLowerCase();
        const fullName = `${cleanApellido} ${cleanNombre}`;
        const reverseName = `${cleanNombre} ${cleanApellido}`;

        return (
          cleanDni.includes(query) ||
          cleanApellido.includes(query) ||
          cleanNombre.includes(query) ||
          fullName.includes(query) ||
          reverseName.includes(query)
        );
      });
    }

    if (dni && dni.trim()) {
      const cleanDni = dni.trim().replace(/\./g, "").toLowerCase();
      results = results.filter((al) => String(al.dni || "").replace(/\./g, "").toLowerCase().includes(cleanDni));
    }

    if (apellido && apellido.trim()) {
      const cleanAp = apellido.trim().toLowerCase();
      results = results.filter((al) => String(al.apellido || "").toLowerCase().includes(cleanAp));
    }

    if (nombre && nombre.trim()) {
      const cleanNom = nombre.trim().toLowerCase();
      results = results.filter((al) => String(al.nombre || "").toLowerCase().includes(cleanNom));
    }

    if (curso && curso !== "todos" && curso !== "todas") {
      const c = curso.toLowerCase().replace("°", "");
      results = results.filter((al) => String(al.curso || "").toLowerCase().replace("°", "") === c);
    }

    if (division && division !== "todos" && division !== "todas") {
      results = results.filter((al) => String(al.division || "").toLowerCase() === division.toLowerCase());
    }

    if (turno && turno !== "todos" && turno !== "todas") {
      results = results.filter((al) => String(al.turno || "").toLowerCase() === turno.toLowerCase());
    }

    if (condicion && condicion !== "todas" && condicion !== "todos") {
      results = results.filter((al) => String(al.condicion || "").toLowerCase() === condicion.toLowerCase());
    }

    if (estado && estado !== "todos" && estado !== "todas") {
      results = results.filter((al) => String(al.estado || "").toLowerCase() === estado.toLowerCase());
    }

    // Sorting
    results.sort((a, b) => {
      let fieldA = a[sortBy] ?? "";
      let fieldB = b[sortBy] ?? "";

      if (typeof fieldA === "string") fieldA = fieldA.toLowerCase();
      if (typeof fieldB === "string") fieldB = fieldB.toLowerCase();

      if (fieldA < fieldB) return sortOrder === "desc" ? 1 : -1;
      if (fieldA > fieldB) return sortOrder === "desc" ? -1 : 1;
      return 0;
    });

    const total = results.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * limit;
    const paginatedData = results.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      pagination: {
        total,
        page: currentPage,
        limit,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    };
  },

  /**
   * Registra un nuevo alumno (con persistencia en localStorage y fallback en memoria).
   */
  async createAlumno(formData) {
    const nextId = Date.now();
    const legajo = `LEG-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    
    const newStudent = {
      id: nextId,
      legajo,
      apellido: formData.apellido?.trim() || "Estudiante",
      nombre: formData.nombre?.trim() || "Nuevo",
      dni: formatDni(formData.dni),
      cuil: formData.cuil || "",
      genero: formData.genero || "No especificado",
      fechaNacimiento: formData.fechaNacimiento || "",
      curso: formData.curso ? (formData.curso.includes("°") ? formData.curso : `${formData.curso}°`) : "1°",
      division: String(formData.division || "1"),
      turno: formData.turno || "Mañana",
      orientacion: formData.orientacion || (Number(String(formData.curso).replace(/\D/g, "")) >= 4 ? "Técnico en Programación" : "Ciclo Básico"),
      condicion: "Regular",
      estado: formData.estado || "Activo",
      email: `${(formData.nombre?.[0] || "e").toLowerCase()}.${(formData.apellido || "alumno").toLowerCase().replace(/\s+/g, "")}@eest1.edu.ar`,
      telefono: formData.telefono || formData.tutorTelefono || "11-4290-0000",
      fechaIngreso: formData.fechaIngreso || new Date().toISOString().split("T")[0],
      // Datos adicionales
      lugarNacimiento: {
        pais: formData.pais || "Argentina",
        provincia: formData.provincia || "Buenos Aires",
        distrito: formData.distrito || "Esteban Echeverría",
        localidad: formData.localidad || "Monte Grande",
        codigoPostal: formData.codigoPostal || ""
      },
      tutores: formData.tutores || [
        {
          nombre: formData.tutorNombre || "",
          apellido: formData.tutorApellido || "",
          dni: formData.tutorDni || "",
          parentesco: formData.tutorParentesco || "Tutor",
          telefono: formData.tutorTelefono || ""
        }
      ],
      domicilio: {
        calle: formData.calle || "",
        altura: formData.altura || "",
        piso: formData.piso || "",
        torre: formData.torre || "",
        depto: formData.depto || "",
        entreCalles: formData.entreCalles || "",
        localidad: formData.domicilioLocalidad || formData.localidad || "Monte Grande"
      },
      salud: {
        obraSocial: formData.obraSocial || "",
        numeroAfiliado: formData.numeroAfiliado || "",
        grupoSanguineo: formData.grupoSanguineo || "No especificado",
        observaciones: formData.observacionesSalud || ""
      },
      documentos: formData.documentos || []
    };

    // Agregar al catálogo en memoria
    BACKUP_ALUMNOS.unshift(newStudent);

    // Persistir en localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("prece_alumnos_custom") || "[]");
      stored.unshift(newStudent);
      localStorage.setItem("prece_alumnos_custom", JSON.stringify(stored));
    } catch {
      // Ignorar errores de localStorage
    }

    return {
      success: true,
      data: newStudent,
      message: `Alumno ${newStudent.apellido}, ${newStudent.nombre} registrado exitosamente con legajo ${newStudent.legajo}.`
    };
  },

  /**
   * Obtiene la ficha resumida completa de un alumno por ID.
   * Prioriza el endpoint del backend y fallback a datos enriquecidos si está offline.
   */
  async getAlumnoSummary(studentId) {
    if (!studentId) {
      throw new Error("Identificador de alumno no proporcionado");
    }

    try {
      const response = await httpClient(`/api/v1/students/${studentId}/summary`);
      if (response && response.data) {
        return response;
      }
    } catch (apiError) {
      // Si el backend devolvió 401, 403 o 404 explícito, propagar el error para control de acceso
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404) {
        throw apiError;
      }
    }

    // Procesamiento y fallback con cálculo real para el catálogo local
    return this._generateLocalSummary(studentId);
  },

  /**
   * Genera la ficha resumida estructurada para un alumno del padrón.
   */
  _generateLocalSummary(studentId) {
    let custom = [];
    try {
      custom = JSON.parse(localStorage.getItem("prece_alumnos_custom") || "[]");
    } catch {}

    const all = [...custom, ...BACKUP_ALUMNOS];
    const alumno = all.find((a) => String(a.id) === String(studentId) || String(a.legajo) === String(studentId));

    if (!alumno) {
      const error = new Error("Alumno no encontrado");
      error.status = 404;
      error.statusCode = 404;
      throw error;
    }

    const idNum = Number.parseInt(alumno.id, 10) || 1;
    // Cálculos deterministas según el ID del alumno
    const inasistenciasTotal = (idNum * 3.5) % 22;
    const injustificadas = Math.round((inasistenciasTotal * 0.4) * 10) / 10;
    const justificadas = Math.round((inasistenciasTotal - injustificadas) * 10) / 10;
    const porcentajeAsistencia = Math.max(70, Math.min(99, Math.round(((90 - inasistenciasTotal) / 90) * 100)));
    const alertaInasistencias = inasistenciasTotal >= 15;

    // Estado académico
    const materiasDesaprobadas = alumno.estado === "Inactivo" ? 4 : idNum % 5 === 0 ? 2 : idNum % 7 === 0 ? 1 : 0;
    const materiasPendientes = idNum % 3 === 0 ? 1 : 0;
    const totalMaterias = 12;
    const materiasAprobadas = totalMaterias - materiasDesaprobadas - materiasPendientes;

    let estadoGeneral = "Regular al día";
    let situacionPromocion = "En condiciones de promoción directa";

    if (materiasDesaprobadas >= 3) {
      estadoGeneral = "En riesgo pedagógico";
      situacionPromocion = "Requiere intensificación en período complementario";
    } else if (materiasDesaprobadas > 0 || materiasPendientes > 0) {
      estadoGeneral = "Con materias a intensificar";
      situacionPromocion = "Promoción condicionada a mesa de examen";
    }

    // Alertas asociadas
    const alertas = [];
    if (alertaInasistencias) {
      alertas.push({
        id: "alt-ina-1",
        tipo: "Inasistencias",
        titulo: "Límite de inasistencias superado",
        descripcion: `El alumno acumula ${inasistenciasTotal} inasistencias registradas (${injustificadas} sin justificar).`,
        prioridad: inasistenciasTotal >= 20 ? "urgente" : "alta",
        fecha: new Date().toISOString().split("T")[0],
        estado: "activa",
        recursoRelacionado: `#/alumnos/${alumno.id}`
      });
    }

    if (materiasDesaprobadas > 0) {
      alertas.push({
        id: "alt-acad-1",
        tipo: "Académica",
        titulo: `${materiasDesaprobadas} materia(s) con desempeño a intensificar`,
        descripcion: "Presenta materias en condición desaprobada o pendiente en el cuatrimestre vigente.",
        prioridad: materiasDesaprobadas >= 3 ? "alta" : "media",
        fecha: new Date().toISOString().split("T")[0],
        estado: "activa",
        recursoRelacionado: `#/alumnos/${alumno.id}`
      });
    }

    if (idNum % 4 === 0) {
      alertas.push({
        id: "alt-doc-1",
        tipo: "Documentación",
        titulo: "Ficha de Salud y Apto Físico pendiente",
        descripcion: "Falta entrega del certificado médico y aptitud física anual para Educación Física.",
        prioridad: "media",
        fecha: new Date().toISOString().split("T")[0],
        estado: "activa",
        recursoRelacionado: `#/alumnos/${alumno.id}`
      });
    }

    return {
      success: true,
      data: {
        datosPersonales: {
          id: alumno.id,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          nombreCompleto: `${alumno.apellido}, ${alumno.nombre}`,
          dni: formatDni(alumno.dni),
          legajo: alumno.legajo || `LEG-2026-${alumno.id}`,
          fotoPerfil: null,
          email: alumno.email || `${alumno.nombre?.[0]?.toLowerCase()}.${alumno.apellido?.toLowerCase()}@eest1.edu.ar`,
          telefono: alumno.telefono || "11-4290-0000",
          fechaNacimiento: alumno.fechaNacimiento || "15/04/2009",
          genero: alumno.genero || "No especificado",
          direccion: alumno.domicilio?.calle ? `${alumno.domicilio.calle} ${alumno.domicilio.altura}` : "Monte Grande, Esteban Echeverría"
        },
        informacionEscolar: {
          curso: alumno.curso ? (alumno.curso.includes("°") ? alumno.curso : `${alumno.curso}°`) : "1°",
          division: String(alumno.division || "1"),
          turno: alumno.turno || "Mañana",
          turnoTaller: alumno.turno === "Mañana" ? "Tarde" : "Mañana",
          condicion: alumno.condicion || "Regular",
          estado: alumno.estado || "Activo",
          anioLectivo: 2026,
          orientacion: alumno.orientacion || (Number(String(alumno.curso).replace(/\D/g, "")) >= 4 ? "Técnico en Programación" : "Ciclo Básico")
        },
        estadoAcademico: {
          estadoGeneral,
          materiasAprobadas,
          materiasPendientes,
          materiasDesaprobadas,
          evaluacionesPendientes: idNum % 3 === 0 ? 1 : 0,
          situacionPromocion,
          promedioGeneral: Math.round((7.0 + (idNum % 3) * 0.8) * 10) / 10,
          totalMaterias
        },
        inasistencias: {
          total: inasistenciasTotal,
          justificadas,
          injustificadas,
          porcentajeAsistencia,
          inasistenciasRelevantes: injustificadas,
          periodo: "Ciclo Lectivo 2026 - 1° Cuatrimestre",
          alertaInasistencias,
          umbralAlerta: 15
        },
        alertas,
        perfilCompletoUrl: `#/alumnos/${alumno.id}/perfil`,
        actualizadoEn: new Date().toISOString()
      }
    };
  },

  /**
   * Obtiene el perfil completo y detallado de un alumno por ID.
   * Prioriza el endpoint del backend /api/v1/students/:id/profile.
   */
  async getAlumnoProfile(studentId) {
    if (!studentId) {
      throw new Error("Identificador de alumno no proporcionado");
    }

    try {
      const response = await httpClient(`/api/v1/students/${studentId}/profile`);
      if (response && response.data) {
        return response;
      }
    } catch (apiError) {
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404) {
        throw apiError;
      }
    }

    // Fallback completo enriquecido
    return this._generateLocalProfile(studentId);
  },

  /**
   * Actualiza los datos de un alumno existente (PATCH).
   */
  async updateAlumno(studentId, payload) {
    if (!studentId) {
      throw new Error("Identificador de alumno no proporcionado");
    }

    try {
      const response = await httpClient(`/api/v1/students/${studentId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      if (response && response.data) {
        return response;
      }
    } catch (apiError) {
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404 || apiError.status === 422) {
        throw apiError;
      }
    }

    // Fallback local update
    return this._localUpdateAlumno(studentId, payload);
  },

  /**
   * Registra una nueva observación para el alumno (POST).
   */
  async addObservacion(studentId, payload) {
    if (!studentId) {
      throw new Error("Identificador de alumno no proporcionado");
    }

    try {
      const response = await httpClient(`/api/v1/students/${studentId}/observations`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (response && response.data) {
        return response;
      }
    } catch (apiError) {
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404 || apiError.status === 422) {
        throw apiError;
      }
    }

    // Fallback local observation
    return this._localAddObservation(studentId, payload);
  },

  /**
   * Inicia el trámite de cambio de colegio / pase (POST).
   */
  async requestSchoolTransfer(studentId, payload) {
    if (!studentId) {
      throw new Error("Identificador de alumno no proporcionado");
    }

    try {
      const response = await httpClient(`/api/v1/students/${studentId}/transfers`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (response && response.data) {
        return response;
      }
    } catch (apiError) {
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404 || apiError.status === 422) {
        throw apiError;
      }
    }

    // Fallback local transfer
    return this._localTransferAlumno(studentId, payload);
  },

  /**
   * Genera o valida la constancia de alumno regular (POST).
   */
  async generateCertificate(studentId) {
    if (!studentId) {
      throw new Error("Identificador de alumno no proporcionado");
    }

    try {
      const response = await httpClient(`/api/v1/students/${studentId}/certificate`, {
        method: "POST"
      });
      if (response && response.data) {
        return response;
      }
    } catch (apiError) {
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404 || apiError.status === 422) {
        throw apiError;
      }
    }

    // Fallback local certificate
    return this._localGenerateCertificate(studentId);
  },

  /**
   * Genera el objeto de perfil completo para el entorno local/offline.
   */
  _generateLocalProfile(studentId) {
    let custom = [];
    try {
      custom = JSON.parse(localStorage.getItem("prece_alumnos_custom") || "[]");
    } catch {}

    const all = [...custom, ...BACKUP_ALUMNOS];
    const alumno = all.find((a) => String(a.id) === String(studentId) || String(a.legajo) === String(studentId));

    if (!alumno) {
      const error = new Error("Alumno no encontrado");
      error.status = 404;
      error.statusCode = 404;
      throw error;
    }

    const idNum = Number.parseInt(alumno.id, 10) || 1;
    const anioCurso = Number.parseInt(String(alumno.curso || "1").replace(/\D/g, ""), 10) || 1;
    const divisionStr = String(alumno.division || "1");
    const turnoStr = alumno.turno || "Mañana";

    // Inasistencias
    const totalInasistencias = (idNum * 3.5) % 22;
    const injustificadas = Math.round((totalInasistencias * 0.4) * 10) / 10;
    const justificadas = Math.round((totalInasistencias - injustificadas) * 10) / 10;
    const porcentajeAsistencia = Math.max(70, Math.min(99, Math.round(((90 - totalInasistencias) / 90) * 100)));

    // Materias según curso
    const nombresMaterias = anioCurso <= 3
      ? ["Matemática", "Prácticas del Lenguaje", "Ciencias Naturales", "Ciencias Sociales", "Inglés", "Educación Física", "Educación Artística", "Procedimientos Técnicos", "Lenguajes Tecnológicos", "Sistemas Tecnológicos"]
      : ["Análisis Matemático", "Literatura", "Inglés Técnico", "Programación I", "Bases de Datos", "Laboratorio de Algoritmos", "Sistemas Digitales", "Educación Física", "Física Aplicada", "Química"];

    const materias = nombresMaterias.map((nombreMat, idx) => {
      const nota1 = 6 + ((idNum + idx * 2) % 5);
      const nota2 = 6 + ((idNum + idx * 3) % 5);
      const prom = Math.round(((nota1 + nota2) / 2) * 10) / 10;
      const estadoMat = prom >= 7 ? "Aprobada" : prom >= 4 ? "En curso" : "Pendiente";
      return {
        id: `mat-${idx + 1}`,
        nombre: nombreMat,
        curso: `${anioCurso}°`,
        division: divisionStr,
        anio: 2026,
        docente: `Prof. ${["Gómez", "Rodríguez", "Pérez", "Fernández", "López", "Martínez", "Sosa", "Torres"][idx % 8]}`,
        periodo: "Anual 2026",
        calificaciones: {
          primerCuatrimestre: nota1,
          segundoCuatrimestre: nota2,
          definitiva: prom >= 7 ? prom : null
        },
        promedio: prom,
        estado: estadoMat,
        instanciasPendientes: estadoMat === "Pendiente" ? ["Diciembre 2026"] : [],
        observaciones: prom < 7 ? "Requiere afianzar contenidos prácticos" : "Excelente desempeño"
      };
    });

    const materiasAprobadas = materias.filter((m) => m.estado === "Aprobada").length;
    const materiasPendientes = materias.filter((m) => m.estado === "Pendiente").length;
    const materiasDesaprobadas = alumno.estado === "Inactivo" ? 3 : 0;
    const promedioGeneral = Math.round((materias.reduce((acc, m) => acc + m.promedio, 0) / materias.length) * 10) / 10;

    // Observaciones guardadas en localStorage para este alumno
    let localObs = [];
    try {
      const storedObs = JSON.parse(localStorage.getItem(`prece_obs_${alumno.id}`) || "[]");
      localObs = storedObs;
    } catch {}

    const defaultObs = [
      {
        id: "obs-1",
        fecha: "2026-03-10",
        tipo: "Pedagógica",
        descripcion: "El alumno manifiesta gran interés y compromiso en las actividades técnicas grupales.",
        sector: "Preceptoría",
        usuarioResponsable: "Preceptor Turno Mañana",
        estado: "Activa",
        creadoEn: "2026-03-10T08:30:00Z",
        actualizadoEn: "2026-03-10T08:30:00Z"
      },
      {
        id: "obs-2",
        fecha: "2026-04-18",
        tipo: "Administrativa",
        descripcion: "Presentó fotocopia de DNI y constancia de CUIL actualizada.",
        sector: "Secretaría",
        usuarioResponsable: "Secretaría Académica",
        estado: "Activa",
        creadoEn: "2026-04-18T10:15:00Z",
        actualizadoEn: "2026-04-18T10:15:00Z"
      }
    ];

    const observaciones = [...localObs, ...defaultObs];

    // Historial de cambios
    const historialCambios = [
      {
        id: "hist-1",
        tipoCambio: "Alta de alumno",
        descripcion: "Inscripción inicial y asignación de vacante institucional.",
        fecha: "2026-02-15T09:00:00Z",
        usuario: "admin_secretaria",
        sector: "Secretaría",
        anterior: null,
        nuevo: `Curso ${anioCurso}° Div ${divisionStr} Turno ${turnoStr}`
      },
      {
        id: "hist-2",
        tipoCambio: "Actualización de domicilio",
        descripcion: "Declaración jurada de domicilio y teléfono de contacto.",
        fecha: "2026-03-01T11:20:00Z",
        usuario: "preceptor_guardia",
        sector: "Preceptoría",
        anterior: "Domicilio sin declarar",
        nuevo: alumno.domicilio?.calle ? `${alumno.domicilio.calle} ${alumno.domicilio.altura}` : "Av. Enrique Santamarina 500"
      }
    ];

    // Libro Matriz Histórico
    const libroMatriz = [
      {
        anioLectivo: 2026,
        curso: `${anioCurso}°`,
        division: divisionStr,
        condicion: alumno.condicion || "Regular",
        resultadoFinal: "En curso",
        promedioFinal: promedioGeneral,
        materias: materias.map((m) => ({
          materia: m.nombre,
          calificacionFinal: m.promedio,
          estado: m.estado,
          folio: "142",
          libro: "12-B"
        }))
      }
    ];

    if (anioCurso > 1) {
      libroMatriz.unshift({
        anioLectivo: 2025,
        curso: `${anioCurso - 1}°`,
        division: divisionStr,
        condicion: "Regular",
        resultadoFinal: "Promovido",
        promedioFinal: 8.2,
        materias: [
          { materia: "Matemática", calificacionFinal: 8, estado: "Aprobada", folio: "098", libro: "11-A" },
          { materia: "Prácticas del Lenguaje", calificacionFinal: 9, estado: "Aprobada", folio: "098", libro: "11-A" },
          { materia: "Ciencias Naturales", calificacionFinal: 8, estado: "Aprobada", folio: "098", libro: "11-A" },
          { materia: "Ciencias Sociales", calificacionFinal: 8, estado: "Aprobada", folio: "098", libro: "11-A" },
          { materia: "Educación Física", calificacionFinal: 9, estado: "Aprobada", folio: "098", libro: "11-A" }
        ]
      });
    }

    return {
      success: true,
      data: {
        datosPersonales: {
          id: alumno.id,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          nombreCompleto: `${alumno.apellido}, ${alumno.nombre}`,
          dni: formatDni(alumno.dni),
          cuil: alumno.cuil || `20-${alumno.dni.replace(/\D/g, "")}-7`,
          fechaNacimiento: alumno.fechaNacimiento || "2009-04-15",
          lugarNacimiento: {
            pais: alumno.lugarNacimiento?.pais || "Argentina",
            provincia: alumno.lugarNacimiento?.provincia || "Buenos Aires",
            localidad: alumno.lugarNacimiento?.localidad || "Monte Grande"
          },
          nacionalidad: "Argentina",
          genero: alumno.genero || "Masculino",
          domicilio: alumno.domicilio?.calle
            ? `${alumno.domicilio.calle} ${alumno.domicilio.altura}${alumno.domicilio.piso ? ` Piso ${alumno.domicilio.piso}` : ""}`
            : "Av. Santamarina 500",
          localidad: alumno.domicilio?.localidad || "Monte Grande",
          codigoPostal: alumno.lugarNacimiento?.codigoPostal || "1842",
          estado: alumno.estado || "Activo",
          condicion: alumno.condicion || "Regular",
          fechaIngreso: alumno.fechaIngreso || "2024-03-01",
          anioLectivoActual: 2026,
          legajo: alumno.legajo || `LEG-2026-${alumno.id}`
        },
        contacto: {
          telefono: alumno.telefono || "11-4290-1234",
          telefonoAlternativo: "11-5544-3322",
          email: alumno.email || `${alumno.nombre?.[0]?.toLowerCase()}.${alumno.apellido?.toLowerCase()}@eest1.edu.ar`,
          domicilio: alumno.domicilio?.calle ? `${alumno.domicilio.calle} ${alumno.domicilio.altura}` : "Av. Santamarina 500",
          localidad: alumno.domicilio?.localidad || "Monte Grande",
          observacionesContacto: "Horario preferente de contacto por la tarde."
        },
        tutores: (alumno.tutores && alumno.tutores.length > 0)
          ? alumno.tutores.map((t, idx) => ({
              id: `tut-${idx + 1}`,
              nombre: t.nombre || `${alumno.apellido} Padre`,
              apellido: t.apellido || alumno.apellido,
              dni: formatDni(t.dni || "25.123.456"),
              parentesco: t.parentesco || (idx === 0 ? "Madre" : "Padre"),
              telefono: t.telefono || "11-4290-9988",
              email: `${(t.nombre || "tutor").toLowerCase()}@gmail.com`,
              domicilio: "Mismo que el alumno",
              tutorPrincipal: idx === 0,
              estadoVinculo: "Activo",
              autorizadoRetiro: true
            }))
          : [
              {
                id: "tut-1",
                nombre: `María`,
                apellido: alumno.apellido,
                dni: "27.456.789",
                parentesco: "Madre",
                telefono: "11-4290-9988",
                email: `maria.${alumno.apellido.toLowerCase()}@gmail.com`,
                domicilio: "Mismo que el alumno",
                tutorPrincipal: true,
                estadoVinculo: "Activo",
                autorizadoRetiro: true
              },
              {
                id: "tut-2",
                nombre: `Carlos`,
                apellido: alumno.apellido,
                dni: "25.123.456",
                parentesco: "Padre",
                telefono: "11-4290-8877",
                email: `carlos.${alumno.apellido.toLowerCase()}@gmail.com`,
                domicilio: "Mismo que el alumno",
                tutorPrincipal: false,
                estadoVinculo: "Activo",
                autorizadoRetiro: true
              }
            ],
        situacionAcademica: {
          estadoGeneral: materiasDesaprobadas >= 3 ? "En riesgo pedagógico" : materiasPendientes > 0 ? "Con materias a intensificar" : "Regular al día",
          anioLectivo: 2026,
          curso: `${anioCurso}°`,
          division: divisionStr,
          turno: turnoStr,
          orientacion: alumno.orientacion || (anioCurso >= 4 ? "Técnico en Programación" : "Ciclo Básico"),
          materiasAprobadas,
          materiasPendientes,
          materiasDesaprobadas,
          evaluacionesPendientes: idNum % 3 === 0 ? 1 : 0,
          promedioGeneral,
          estadoPromocion: materiasDesaprobadas >= 3 ? "Requiere intensificación" : "En condiciones de promoción directa",
          observacionesAcademicas: "Seguimiento pedagógico regular en el ciclo actual."
        },
        materias,
        inasistencias: {
          resumen: {
            total: totalInasistencias,
            justificadas,
            injustificadas,
            porcentajeAsistencia,
            periodo: "Ciclo Lectivo 2026 - 1° Cuatrimestre",
            situacionActual: totalInasistencias >= 15 ? "Límite de inasistencias excedido" : "Asistencia regular",
            alertaInasistencias: totalInasistencias >= 15
          },
          detalle: [
            {
              id: "ina-1",
              fecha: "2026-03-20",
              tipo: "Injustificada",
              estado: "Registrada",
              justificacion: null,
              motivo: "Sin aviso",
              observacion: "Ausente en turno mañana",
              usuarioRegistro: "Preceptoría 1° Año",
              fechaRegistro: "2026-03-20T09:15:00Z"
            },
            {
              id: "ina-2",
              fecha: "2026-04-05",
              tipo: "Justificada",
              estado: "Aprobada",
              justificacion: "Certificado Médico",
              motivo: "Consulta médica odontológica",
              observacion: "Presentó certificado en tiempo y forma",
              usuarioRegistro: "Preceptoría 1° Año",
              fechaRegistro: "2026-04-05T11:00:00Z"
            }
          ]
        },
        observaciones,
        condicionesParticulares: {
          salud: [
            {
              tipo: "Alergia / Salud",
              descripcion: alumno.salud?.observaciones || "Alergia a la penicilina y asma leve estacional.",
              estado: "Vigente",
              fechaRegistro: "2026-03-01",
              actualizadoEn: "2026-03-01",
              usuarioResponsable: "Enfermería / Secretaría",
              observaciones: "Dispone de inhalador en su mochila en caso de requerirlo."
            }
          ],
          pedagogicas: [
            {
              tipo: "Adecuación Curricular",
              descripcion: "Sin adaptaciones pedagógicas requeridas a la fecha.",
              estado: "Activa",
              fechaRegistro: "2026-03-01",
              actualizadoEn: "2026-03-01",
              usuarioResponsable: "Equipo de Orientación Escolar (EOE)",
              observaciones: "Seguimiento bimestral ordinario."
            }
          ]
        },
        libroMatriz,
        historialCambios,
        permisosAcciones: {
          puedeModificar: true,
          puedeGenerarConstancia: (alumno.estado || "Activo") === "Activo",
          puedeIniciarPase: (alumno.estado || "Activo") === "Activo",
          puedeRegistrarObservaciones: true
        },
        actualizadoEn: new Date().toISOString()
      }
    };
  },

  _localUpdateAlumno(studentId, payload) {
    let custom = [];
    try {
      custom = JSON.parse(localStorage.getItem("prece_alumnos_custom") || "[]");
    } catch {}

    const indexCustom = custom.findIndex((a) => String(a.id) === String(studentId));
    if (indexCustom >= 0) {
      custom[indexCustom] = { ...custom[indexCustom], ...payload };
      localStorage.setItem("prece_alumnos_custom", JSON.stringify(custom));
      return { success: true, data: custom[indexCustom], message: "Alumno actualizado correctamente." };
    }

    const indexBackup = BACKUP_ALUMNOS.findIndex((a) => String(a.id) === String(studentId));
    if (indexBackup >= 0) {
      const updated = { ...BACKUP_ALUMNOS[indexBackup], ...payload };
      custom.push(updated);
      localStorage.setItem("prece_alumnos_custom", JSON.stringify(custom));
      return { success: true, data: updated, message: "Alumno actualizado correctamente." };
    }

    throw new Error("Alumno no encontrado para modificar");
  },

  _localAddObservation(studentId, payload) {
    const newObs = {
      id: `obs-${Date.now()}`,
      fecha: payload.fecha || new Date().toISOString().split("T")[0],
      tipo: payload.tipo || "Pedagógica",
      descripcion: payload.descripcion || "",
      sector: payload.sector || "Preceptoría",
      usuarioResponsable: payload.usuarioResponsable || "Preceptor",
      estado: "Activa",
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };

    try {
      const stored = JSON.parse(localStorage.getItem(`prece_obs_${studentId}`) || "[]");
      stored.unshift(newObs);
      localStorage.setItem(`prece_obs_${studentId}`, JSON.stringify(stored));
    } catch {}

    return {
      success: true,
      data: newObs,
      message: "Observación registrada exitosamente."
    };
  },

  _localTransferAlumno(studentId, payload) {
    this._localUpdateAlumno(studentId, { estado: "Pase pendiente" });
    return {
      success: true,
      data: {
        tramiteId: `TR-${Date.now()}`,
        alumnoId: studentId,
        motivo: payload.motivo,
        colegioDestino: payload.colegioDestino,
        estado: "Iniciado",
        fechaInicio: new Date().toISOString()
      },
      message: "Trámite de cambio de colegio iniciado correctamente."
    };
  },

  _localGenerateCertificate(studentId) {
    const profile = this._generateLocalProfile(studentId);
    const alumno = profile.data.datosPersonales;
    const escolar = profile.data.situacionAcademica;

    return {
      success: true,
      data: {
        certificadoId: `CERT-${Date.now()}`,
        alumnoId: alumno.id,
        nombreCompleto: alumno.nombreCompleto,
        dni: alumno.dni,
        curso: escolar.curso,
        division: escolar.division,
        turno: escolar.turno,
        orientacion: escolar.orientacion,
        institucion: "E.E.S.T N° 1 Monte Grande",
        fechaEmision: new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        validoHasta: "30 días corridos a partir de su emisión",
        textoOficial: `Por la presente se certifica que ${alumno.nombreCompleto}, DNI N° ${alumno.dni}, es alumno/a REGULAR del ${escolar.curso} año, División ${escolar.division}°, Turno ${escolar.turno}, de la especialidad ${escolar.orientacion}, durante el Ciclo Lectivo 2026 en esta institución educativa.`
      },
      message: "Constancia de alumno regular generada con éxito."
    };
  }
};
