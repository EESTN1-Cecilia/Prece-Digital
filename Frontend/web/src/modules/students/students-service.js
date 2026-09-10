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
  }
};
