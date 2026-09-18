import { pedir } from "../../services/http.js";

/* Adaptador del modulo de alumnos. Todo sale del backend:

     GET    /api/v1/students                      listado con filtros y paginacion
     GET    /api/v1/students/divisions            catalogo de divisiones con cantidades
     POST   /api/v1/students                      alta de legajo
     PATCH  /api/v1/students/:id                  modificacion
     DELETE /api/v1/students/:id                  baja logica
     GET    /api/v1/students/:id/summary          ficha resumida
     GET    /api/v1/students/:id/profile          perfil completo
     POST   /api/v1/students/:id/observations     observacion
     POST   /api/v1/students/:id/transfers        inicio de pase
     POST   /api/v1/students/:id/certificate      constancia de alumno regular
     POST   /api/v1/tutors, /students/:id/tutors  tutores del alta

   Las vistas trabajan con textos de pantalla ("1°", "Mañana", "Regular"); este
   archivo traduce entre ese formato y el de la API. No hay datos de respaldo:
   si la API falla, el error llega a la vista. */

const POR_PAGINA_MAXIMO = 100;

function capitalizar(texto) {
  if (!texto) return texto ?? null;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function soloDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

export function formatDni(dni) {
  const str = soloDigitos(dni);
  if (str.length === 8) return `${str.slice(0, 2)}.${str.slice(2, 5)}.${str.slice(5)}`;
  if (str.length === 7) return `${str.slice(0, 1)}.${str.slice(1, 4)}.${str.slice(4)}`;
  return String(dni ?? "");
}

function anioDeCurso(curso) {
  const numero = Number.parseInt(soloDigitos(curso), 10);
  return Number.isInteger(numero) ? numero : null;
}

function filtroTexto(valor) {
  return valor && !["todos", "todas"].includes(String(valor).toLowerCase()) ? String(valor) : null;
}

/* Alumno de la API -> fila de pantalla. */
export function aVistaAlumno(item) {
  return {
    id: item.id,
    legajo: item.id,
    apellido: item.apellido,
    nombre: item.nombre,
    nombreCompleto: item.nombreCompleto,
    dni: formatDni(item.dni),
    curso: item.curso ? `${item.curso}°` : "-",
    division: item.division ?? "-",
    turno: capitalizar(item.turno) ?? "-",
    orientacion: item.orientacion ?? "Ciclo Básico",
    condicion: capitalizar(item.condicion) ?? "-",
    estado: capitalizar(item.estado),
    email: item.email,
    telefono: item.telefono,
    fechaNacimiento: item.fechaNacimiento,
    edad: item.edad
  };
}

function consultaListado(params = {}) {
  const consulta = new URLSearchParams();
  const set = (clave, valor) => {
    if (valor !== null && valor !== undefined && valor !== "") consulta.set(clave, valor);
  };

  set("q", params.q?.trim());
  set("dni", soloDigitos(params.dni) || null);
  set("apellido", params.apellido?.trim());
  set("nombre", params.nombre?.trim());
  set("curso", filtroTexto(params.curso) ? anioDeCurso(params.curso) : null);
  set("division", filtroTexto(params.division));
  set("turno", filtroTexto(params.turno)?.toLowerCase());
  set("condicion", filtroTexto(params.condicion)?.toLowerCase());
  set("estado", filtroTexto(params.estado)?.toLowerCase() ?? "todos");

  const campo = ["apellido", "nombre", "dni", "curso"].includes(params.sortBy) ? params.sortBy : "apellido";
  set("orden", params.sortOrder === "desc" ? `${campo}_desc` : campo);
  set("pagina", Math.max(1, Number.parseInt(params.page, 10) || 1));
  set("porPagina", Math.min(POR_PAGINA_MAXIMO, Math.max(1, Number.parseInt(params.limit, 10) || 10)));

  return consulta.toString();
}

async function pedirCompleto(ruta, opciones) {
  /* `pedir` devuelve `data`; para listados hace falta tambien la paginacion. */
  const respuesta = await pedir(ruta, { ...opciones, crudo: true });
  return respuesta;
}

function aPaginacion(meta, porDefecto) {
  return {
    total: meta?.total ?? 0,
    page: meta?.pagina ?? porDefecto.page,
    limit: meta?.porPagina ?? porDefecto.limit,
    totalPages: Math.max(1, meta?.totalPaginas ?? 1),
    hasNextPage: Boolean(meta?.tieneSiguiente),
    hasPrevPage: Boolean(meta?.tieneAnterior)
  };
}

/* Datos del formulario de alta -> legajo de la API. */
function aLegajo(formData) {
  const direccion = [formData.calle, formData.altura].filter(Boolean).join(" ").trim();

  return {
    nombre: formData.nombre?.trim(),
    apellido: formData.apellido?.trim(),
    dni: soloDigitos(formData.dni),
    fechaNacimiento: formData.fechaNacimiento || null,
    genero: formData.genero || null,
    nacionalidad: formData.pais || null,
    provincia: formData.provincia || null,
    localidad: formData.localidad || null,
    codigoPostal: formData.codigoPostal || null,
    direccion: direccion || null,
    email: formData.emailParticular || null,
    telefono: formData.telefono || null,
    curso: anioDeCurso(formData.curso),
    division: String(formData.division ?? "").trim(),
    contacto: formData.tutorNombre
      ? {
          nombre: formData.tutorNombre,
          apellido: formData.tutorApellido,
          parentesco: formData.tutorParentesco,
          telefono: formData.tutorTelefono,
          email: formData.tutorEmail
        }
      : null
  };
}

async function vincularTutor(alumnoId, tutor, principal) {
  if (!tutor.nombre || !tutor.apellido || !soloDigitos(tutor.dni)) {
    return;
  }

  const datos = {
    nombre: tutor.nombre,
    apellido: tutor.apellido,
    dni: soloDigitos(tutor.dni),
    telefono: tutor.telefono || undefined,
    email: tutor.email || undefined
  };

  let tutorId;

  try {
    tutorId = (await pedir("/api/v1/tutors", { method: "POST", body: JSON.stringify(datos) })).id;
  } catch (error) {
    if (error.status !== 409) throw error;
    const existentes = await pedir(`/api/v1/tutors?dni=${datos.dni}`);
    tutorId = existentes?.[0]?.id;
  }

  if (tutorId) {
    await pedir(`/api/v1/students/${encodeURIComponent(alumnoId)}/tutors`, {
      method: "POST",
      body: JSON.stringify({
        tutorId,
        parentesco: String(tutor.parentesco ?? "tutor").toLowerCase(),
        responsablePrincipal: principal
      })
    });
  }
}

export const StudentsService = {
  /* Listado con filtros, busqueda, orden y paginacion. */
  async getAlumnos(params = {}) {
    const respuesta = await pedirCompleto(`/api/v1/students?${consultaListado(params)}`);

    return {
      data: (respuesta.data ?? []).map(aVistaAlumno),
      pagination: aPaginacion(respuesta.paginacion, { page: 1, limit: params.limit ?? 10 })
    };
  },

  /* Todos los alumnos que cumplen el filtro, recorriendo las paginas de la API. */
  async getTodosLosAlumnos(params = {}) {
    const todos = [];
    let pagina = 1;
    let total = Infinity;

    while (todos.length < total) {
      const { data, pagination } = await this.getAlumnos({ ...params, page: pagina, limit: POR_PAGINA_MAXIMO });
      todos.push(...data);
      total = pagination.total;
      if (!pagination.hasNextPage) break;
      pagina += 1;
    }

    return { data: todos, pagination: { total: todos.length, page: 1, limit: todos.length, totalPages: 1 } };
  },

  /* Directorio de cursos: divisiones de la escuela con cantidad de alumnos. */
  async getDivisiones() {
    const divisiones = await pedir("/api/v1/students/divisions");

    return divisiones.map((division, indice) => ({
      ...division,
      id: indice + 1,
      clave: division.id,
      turnoAula: capitalizar(division.turnoAula),
      turnoTaller: capitalizar(division.turnoTaller)
    }));
  },

  /* Alta del legajo y de sus tutores. */
  async createAlumno(formData) {
    const alumno = await pedir("/api/v1/students", { method: "POST", body: JSON.stringify(aLegajo(formData)) });

    await vincularTutor(
      alumno.id,
      {
        nombre: formData.tutorNombre,
        apellido: formData.tutorApellido,
        dni: formData.tutorDni,
        parentesco: formData.tutorParentesco,
        telefono: formData.tutorTelefono,
        email: formData.tutorEmail
      },
      true
    );

    if (formData.tieneSegundoTutor) {
      await vincularTutor(
        alumno.id,
        {
          nombre: formData.tutor2Nombre,
          apellido: formData.tutor2Apellido,
          dni: formData.tutor2Dni,
          parentesco: formData.tutor2Parentesco,
          telefono: formData.tutor2Telefono
        },
        false
      );
    }

    const vista = aVistaAlumno(alumno);
    return {
      success: true,
      data: vista,
      message: `Alumno ${vista.apellido}, ${vista.nombre} registrado con legajo ${vista.legajo}.`
    };
  },

  async getAlumnoSummary(studentId) {
    const data = await pedir(`/api/v1/students/${encodeURIComponent(studentId)}/summary`, { recurso: "el alumno solicitado" });
    return { success: true, data };
  },

  async getAlumnoProfile(studentId) {
    const data = await pedir(`/api/v1/students/${encodeURIComponent(studentId)}/profile`, { recurso: "el alumno solicitado" });
    return { success: true, data };
  },

  /* Modificacion de datos. "estado: Inactivo" se resuelve con la baja logica. */
  async updateAlumno(studentId, payload = {}) {
    const ruta = `/api/v1/students/${encodeURIComponent(studentId)}`;
    const cambios = {
      nombre: payload.nombre,
      apellido: payload.apellido,
      dni: payload.dni !== undefined ? soloDigitos(payload.dni) : undefined,
      email: payload.email,
      telefono: payload.telefono,
      direccion: payload.domicilio ?? payload.direccion,
      localidad: payload.localidad,
      codigoPostal: payload.codigoPostal,
      genero: payload.genero === "No especificado" ? null : payload.genero
    };

    let data = await pedir(ruta, { method: "PATCH", body: JSON.stringify(cambios) });

    if (String(payload.estado ?? "").toLowerCase() === "inactivo" && data.estado === "activo") {
      data = await pedir(ruta, { method: "DELETE" });
    }

    return { success: true, data: aVistaAlumno(data), message: "Datos del alumno actualizados correctamente." };
  },

  async addObservacion(studentId, payload = {}) {
    const data = await pedir(`/api/v1/students/${encodeURIComponent(studentId)}/observations`, {
      method: "POST",
      body: JSON.stringify({
        tipo: payload.tipo,
        descripcion: payload.descripcion,
        sector: payload.sector,
        fecha: payload.fecha,
        estado: payload.estado
      })
    });

    return { success: true, data, message: "Observación registrada exitosamente." };
  },

  async requestSchoolTransfer(studentId, payload = {}) {
    const data = await pedir(`/api/v1/students/${encodeURIComponent(studentId)}/transfers`, {
      method: "POST",
      body: JSON.stringify({ motivo: payload.motivo, colegioDestino: payload.colegioDestino })
    });

    return { success: true, data, message: "Trámite de cambio de colegio iniciado correctamente." };
  },

  async generateCertificate(studentId) {
    const data = await pedir(`/api/v1/students/${encodeURIComponent(studentId)}/certificate`, { method: "POST" });
    return { success: true, data, message: "Constancia de alumno regular generada con éxito." };
  },

  /* Todas las observaciones (tablero de preceptoria). */
  async getObservaciones() {
    return pedir("/api/v1/observations");
  }
};
