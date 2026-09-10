/* Adaptador de datos del modulo Identidad (usuarios, roles y permisos).

   Endpoints que consume del backend (ver src/modules/identity/README.md):
     GET    /api/v1/me
     GET    /api/v1/users?q&rol&area&estado&page&pageSize
     GET    /api/v1/users/:id
     POST   /api/v1/users
     PATCH  /api/v1/users/:id
     PUT    /api/v1/users/:id/roles
     GET    /api/v1/roles                     (implementado)
     GET    /api/v1/modules                   (implementado)
     GET    /api/v1/permissions               (implementado)
     GET    /api/v1/roles/:id/permissions     (implementado)
     PUT    /api/v1/roles/:id/permissions     (implementado)

   El estado de la sesion vive en estado/, no aca: este archivo solo trae y normaliza
   datos.

   Las lecturas degradan a datos de demostracion cuando el endpoint todavia no existe,
   y lo informan con `origen: "demo"` para que la vista lo muestre.
   Las escrituras nunca degradan: propagan el error del backend (401 / 403 / 404). */

import { ErrorApi, guardarToken, leerToken, pedir } from "./http.js";
import { PERMISOS } from "../utils/permisos.js";

export { ErrorApi };

/* ---------- Normalizacion ---------- */

function primero(objeto, claves) {
  for (const clave of claves) {
    const valor = objeto?.[clave];

    if (valor !== undefined && valor !== null && valor !== "") {
      return valor;
    }
  }

  return null;
}

function normalizarRol(crudo) {
  if (typeof crudo === "string") {
    return { id: crudo, nombre: crudo, alcances: [] };
  }

  const rol = crudo?.rol ?? crudo?.role ?? crudo;

  return {
    id: primero(rol, ["id", "codigo", "code"]),
    nombre: primero(rol, ["nombre", "name", "id"]),
    alcances: rol?.alcances ?? rol?.scopes ?? []
  };
}

function normalizarEstado(crudo) {
  const estado = primero(crudo, ["estado", "status"]);

  if (typeof estado === "string") {
    return estado.toLowerCase();
  }

  const activo = primero(crudo, ["activo", "active", "enabled"]);

  if (activo === null) {
    return "desconocido";
  }

  return activo === 1 || activo === true ? "activo" : "inactivo";
}

/* Lista blanca: solo estos campos llegan a la vista. Si la API devolviera
   password_hash, tokens o credenciales, quedan descartados aca. */
export function normalizarUsuario(crudo) {
  const roles = primero(crudo, ["roles", "usuario_roles", "userRoles"]) ?? [];

  return {
    id: primero(crudo, ["id", "usuario_id", "userId"]),
    nombre: primero(crudo, ["nombre", "firstName", "first_name"]),
    apellido: primero(crudo, ["apellido", "lastName", "last_name"]),
    usuario: primero(crudo, ["usuario", "username", "nombre_usuario"]),
    email: primero(crudo, ["email", "correo"]),
    dni: primero(crudo, ["dni", "documento"]),
    telefono: primero(crudo, ["telefono", "phone"]),
    area: primero(crudo, ["area", "sector", "area_nombre", "sector_nombre"]),
    roles: (Array.isArray(roles) ? roles : [roles]).map(normalizarRol).filter((rol) => rol.id),
    estado: normalizarEstado(crudo),
    creadoEn: primero(crudo, ["creadoEn", "creado_en", "createdAt", "created_at"]),
    actualizadoEn: primero(crudo, ["actualizadoEn", "actualizado_en", "updatedAt", "updated_at"]),
    ultimoAcceso: primero(crudo, ["ultimoAcceso", "ultimo_acceso", "lastLoginAt", "last_login_at"])
  };
}

/* ---------- Consulta, busqueda y paginado ---------- */

export function construirConsulta({ q, rol, area, estado, pagina = 1, porPagina = 10 } = {}) {
  const params = new URLSearchParams();
  const texto = q?.trim();

  if (texto) params.set("q", texto);
  if (rol) params.set("rol", rol);
  if (area) params.set("area", area);
  if (estado) params.set("estado", estado);

  params.set("page", String(pagina));
  params.set("pageSize", String(porPagina));

  return params.toString();
}

function sinAcentos(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/* Busqueda por nombre, apellido, nombre de usuario, email e ID. */
export function coincide(usuario, texto) {
  const buscado = sinAcentos(texto).trim();

  if (!buscado) {
    return true;
  }

  return [usuario.nombre, usuario.apellido, usuario.usuario, usuario.email, usuario.id].some(
    (campo) => sinAcentos(campo).includes(buscado)
  );
}

/* Los filtros se combinan entre si y con la busqueda (AND). */
export function filtrarUsuarios(usuarios, { q, rol, area, estado } = {}) {
  return usuarios.filter(
    (usuario) =>
      coincide(usuario, q) &&
      (!rol || usuario.roles.some((asignado) => asignado.id === rol)) &&
      (!area || usuario.area === area) &&
      (!estado || usuario.estado === estado)
  );
}

export function paginar(usuarios, pagina = 1, porPagina = 10) {
  const total = usuarios.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(Math.max(1, pagina), paginas);
  const desde = (actual - 1) * porPagina;

  return { items: usuarios.slice(desde, desde + porPagina), total, paginas, pagina: actual };
}

/* ---------- Validacion del formulario ----------
   Complementa, nunca reemplaza, la validacion del backend: solo evita enviar
   formularios incompletos. Devuelve { campo: mensaje } o null si esta todo bien. */

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarUsuario(datos = {}, { esAlta = false } = {}) {
  const errores = {};
  const texto = (valor) => String(valor ?? "").trim();

  if (!texto(datos.nombre)) errores.nombre = "Ingresa el nombre.";
  if (!texto(datos.apellido)) errores.apellido = "Ingresa el apellido.";

  if (!texto(datos.email)) {
    errores.email = "Ingresa el correo institucional.";
  } else if (!CORREO.test(texto(datos.email))) {
    errores.email = "El correo no tiene un formato valido.";
  }

  if (!texto(datos.dni)) {
    errores.dni = "Ingresa el DNI.";
  } else if (!/^\d{7,9}$/.test(texto(datos.dni))) {
    errores.dni = "El DNI debe tener entre 7 y 9 numeros, sin puntos.";
  }

  if (texto(datos.telefono) && !/^[\d\s+()-]{6,30}$/.test(texto(datos.telefono))) {
    errores.telefono = "El telefono solo admite numeros, espacios y los signos + ( ) -";
  }

  /* En el alta el rol es obligatorio: un usuario sin rol no puede operar. */
  if (esAlta && !(datos.roles ?? []).length) {
    errores.roles = "Asigna al menos un rol.";
  }

  return Object.keys(errores).length ? errores : null;
}

/* ---------- Catalogos ---------- */

/* Espejo de Shared/src/domain.mjs para poder trabajar sin el monorepo.
   La fuente de verdad es GET /api/v1/roles. */
const ROLES_DEMO = [
  { id: "super-admin", nombre: "Superadministrador", alcances: ["global"] },
  { id: "system-admin", nombre: "Administrador del sistema", alcances: ["school"] },
  { id: "director", nombre: "Directivo", alcances: ["school", "period"] },
  { id: "secretary", nombre: "Secretaria", alcances: ["school", "course", "period"] },
  { id: "area-lead", nombre: "Jefatura de area", alcances: ["school", "area", "subject", "period"] },
  { id: "preceptor", nombre: "Preceptoria", alcances: ["school", "course", "shift", "period"] },
  { id: "teacher", nombre: "Docencia", alcances: ["school", "course", "subject", "period"] },
  {
    id: "attendance-operator",
    nombre: "Responsable operativo de asistencia",
    alcances: ["school", "course", "shift", "period"]
  }
];

const MODULOS_DEMO = [
  { id: "identity", nombre: "Identidad y acceso" },
  { id: "academic-structure", nombre: "Estructura academica" },
  { id: "attendance", nombre: "Asistencia" },
  { id: "students", nombre: "Estudiantes y legajos" },
  { id: "grades", nombre: "Calificaciones" },
  { id: "files", nombre: "Excel y documentos" },
  { id: "audit", nombre: "Auditoria" }
];

/* Acciones definidas por el backend en su issue #13 (Roles y permisos):
   lectura, creacion, modificacion, eliminacion, aprobacion y carga. */
export const ACCIONES = [
  { id: "read", nombre: "Consultar" },
  { id: "create", nombre: "Crear" },
  { id: "update", nombre: "Modificar" },
  { id: "delete", nombre: "Eliminar" },
  { id: "approve", nombre: "Aprobar" },
  { id: "upload", nombre: "Cargar" }
];

/* Catalogo de permisos declarado por el backend: cada entrada trae modulo y accion.
   Es la fuente de verdad de la matriz; ACCIONES solo ordena las columnas. */
export async function listarPermisos() {
  try {
    const data = await pedir("/api/v1/permissions");

    return {
      data: (Array.isArray(data) ? data : []).map((permiso) => ({
        id: primero(permiso, ["id", "codigo", "code"]),
        modulo: primero(permiso, ["modulo", "module"]),
        accion: primero(permiso, ["accion", "action"])
      })),
      origen: "api"
    };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      throw error;
    }

    return { data: [], origen: "demo" };
  }
}

export async function listarRoles() {
  try {
    const data = await pedir("/api/v1/roles");
    return { data: (Array.isArray(data) ? data : []).map(normalizarRol), origen: "api" };
  } catch {
    return { data: ROLES_DEMO, origen: "demo" };
  }
}

export async function listarModulos() {
  try {
    const data = await pedir("/api/v1/modules");

    return {
      data: (Array.isArray(data) ? data : []).map((modulo) => ({
        id: primero(modulo, ["id", "codigo"]),
        nombre: primero(modulo, ["nombre", "name", "id"])
      })),
      origen: "api"
    };
  } catch {
    return { data: MODULOS_DEMO, origen: "demo" };
  }
}

/* ---------- Usuarios ---------- */

const USUARIOS_DEMO = [
  ["Lucia", "Gimenez", "lgimenez", "Direccion", ["director"], "activo", "2026-08-28T12:40:00"],
  ["Martin", "Sosa", "msosa", "Secretaria", ["secretary"], "activo", "2026-09-01T09:15:00"],
  [
    "Ana",
    "Perez",
    "aperez",
    "Jefatura de Area",
    ["area-lead", "teacher"],
    "activo",
    "2026-09-02T18:05:00"
  ],
  ["Diego", "Molina", "dmolina", "Preceptoria", ["preceptor"], "activo", "2026-09-03T07:50:00"],
  [
    "Sofia",
    "Ramirez",
    "sramirez",
    "Preceptoria",
    ["preceptor", "attendance-operator"],
    "suspendido",
    null
  ],
  ["Carlos", "Ibarra", "cibarra", "Matematica", ["teacher"], "activo", "2026-08-30T14:20:00"],
  ["Valeria", "Ortiz", "vortiz", "Lengua", ["teacher"], "inactivo", "2026-06-11T10:00:00"],
  [
    "Julian",
    "Ferreyra",
    "jferreyra",
    "Informatica",
    ["system-admin"],
    "activo",
    "2026-09-03T08:30:00"
  ],
  ["Rocio", "Benitez", "rbenitez", "Taller", ["teacher"], "activo", "2026-08-25T16:45:00"],
  ["Pablo", "Acosta", "pacosta", "Jefatura de Area", ["area-lead"], "activo", "2026-09-01T11:10:00"],
  ["Camila", "Nunez", "cnunez", "Historia", ["teacher"], "pendiente", null],
  [
    "Nicolas",
    "Vera",
    "nvera",
    "Preceptoria",
    ["attendance-operator"],
    "activo",
    "2026-08-29T13:05:00"
  ],
  ["Florencia", "Cabrera", "fcabrera", "Secretaria", ["secretary"], "inactivo", "2026-05-02T09:40:00"],
  ["Gonzalo", "Diaz", "gdiaz", "Informatica", ["super-admin"], "activo", "2026-09-03T06:20:00"]
].map(([nombre, apellido, usuario, area, roles, estado, ultimoAcceso], indice) =>
  normalizarUsuario({
    id: indice + 1,
    nombre,
    apellido,
    usuario,
    email: `${usuario}@abc.gob.ar`,
    area,
    roles: roles.map((id) => ROLES_DEMO.find((rol) => rol.id === id)),
    estado,
    creado_en: `2026-0${(indice % 8) + 1}-1${indice % 9}T08:00:00`,
    actualizado_en: "2026-09-02T10:00:00",
    ultimo_acceso: ultimoAcceso
  })
);

export function areasDemo() {
  return [...new Set(USUARIOS_DEMO.map((usuario) => usuario.area))].sort();
}

export function estadosDemo() {
  return [...new Set(USUARIOS_DEMO.map((usuario) => usuario.estado))].sort();
}

export async function listarUsuarios(filtros = {}) {
  const { pagina = 1, porPagina = 10 } = filtros;

  try {
    const cuerpo = await pedir(`/api/v1/users?${construirConsulta(filtros)}`);
    const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo?.items ?? []);
    const total = Array.isArray(cuerpo) ? lista.length : (cuerpo?.total ?? lista.length);

    return {
      items: lista.map(normalizarUsuario),
      total,
      paginas: cuerpo?.paginas ?? cuerpo?.pages ?? Math.max(1, Math.ceil(total / porPagina)),
      pagina,
      origen: "api"
    };
  } catch (error) {
    if ((error.status === 401 || error.status === 403) && leerToken()) {
      throw error;
    }

    /* El endpoint todavia no existe o no hay token: filtramos y paginamos en memoria. */
    return {
      ...paginar(filtrarUsuarios(USUARIOS_DEMO, filtros), pagina, porPagina),
      origen: "demo"
    };
  }
}

export async function obtenerUsuario(id) {
  try {
    const data = await pedir(`/api/v1/users/${encodeURIComponent(id)}`, {
      recurso: "el usuario solicitado"
    });
    return { data: normalizarUsuario(data), origen: "api" };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      throw error;
    }

    const usuario = USUARIOS_DEMO.find((candidato) => String(candidato.id) === String(id));

    if (!usuario) {
      throw new ErrorApi(404, "El usuario no existe.");
    }

    return { data: usuario, origen: "demo" };
  }
}

/* Perfiles de prueba mientras GET /api/v1/me no exista: permiten revisar el
   ocultamiento de controles con distintos permisos. No sustituyen la validacion
   del backend, que sigue respondiendo 401/403 ante cada escritura. */
export const PERFILES_DEMO = [
  { id: "super-admin", nombre: "Superadministrador", permisos: ["*"] },
  {
    id: "system-admin",
    nombre: "Administrador del sistema",
    permisos: [
      ...new Set([
        PERMISOS.usuariosLeer,
        PERMISOS.usuariosCrear,
        PERMISOS.usuariosEditar,
        PERMISOS.rolesLeer,
        PERMISOS.rolesEditar
      ])
    ]
  },
  {
    id: "director",
    nombre: "Directivo (solo consulta)",
    permisos: [...new Set([PERMISOS.usuariosLeer, PERMISOS.rolesLeer])]
  },
  { id: "teacher", nombre: "Docencia (sin acceso)", permisos: [] }
];

export function sesionDemo(perfilId = PERFILES_DEMO[1].id) {
  const perfil = PERFILES_DEMO.find((candidato) => candidato.id === perfilId) ?? PERFILES_DEMO[1];

  return {
    usuario: { nombre: "Perfil", apellido: "de prueba", roles: [{ id: perfil.id, nombre: perfil.nombre }] },
    permisos: perfil.permisos,
    alcances: ["school"],
    perfilDemo: perfil.id
  };
}

const MAPA_PERMISOS_ROL = {
  admin: ["*"],
  "super-admin": ["*"],
  "system-admin": [
    PERMISOS.usuariosLeer,
    PERMISOS.usuariosCrear,
    PERMISOS.usuariosEditar,
    PERMISOS.rolesLeer,
    PERMISOS.rolesEditar
  ],
  director: ["*"],
  secretario: [
    PERMISOS.usuariosLeer,
    PERMISOS.usuariosCrear,
    PERMISOS.usuariosEditar,
    PERMISOS.rolesLeer
  ],
  secretary: [
    PERMISOS.usuariosLeer,
    PERMISOS.usuariosCrear,
    PERMISOS.usuariosEditar,
    PERMISOS.rolesLeer
  ],
  preceptor: [PERMISOS.usuariosLeer],
  "area-lead": [PERMISOS.usuariosLeer],
  jefe_area: [PERMISOS.usuariosLeer],
  docente: [],
  teacher: []
};

export async function iniciarSesion({ email, password }) {
  const respuesta = await pedir("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  const token = respuesta?.accessToken ?? respuesta?.token;
  if (token) {
    guardarToken(token);
  }

  const { data, origen } = await obtenerSesion();
  return { token, data, origen };
}

export async function obtenerSesion() {
  const token = leerToken();

  if (!token) {
    return { data: null, origen: "sin-token" };
  }

  try {
    const raw = await pedir("/api/v1/auth/me");
    const data = raw?.data ?? raw;

    if (!data || (!data.id && !data.email)) {
      return { data: null, origen: "sin-token" };
    }

    const assignments = data?.assignments ?? [];
    const codigosRoles = assignments.map((a) => a.role ?? a.rol ?? a).filter(Boolean);
    const roles = codigosRoles.map((codigo) => {
      const demo = ROLES_DEMO.find((r) => r.id === codigo || r.id === codigo.replace("_", "-"));
      return normalizarRol(demo ? { ...demo, id: codigo } : { id: codigo, nombre: codigo });
    });

    const permisosCalculados = [
      ...new Set(codigosRoles.flatMap((r) => MAPA_PERMISOS_ROL[r] ?? MAPA_PERMISOS_ROL[r.replace("_", "-")] ?? []))
    ];

    const alcances = [
      ...new Set(assignments.map((a) => a.schoolId ?? a.escuela_id).filter(Boolean))
    ];

    const usuario = normalizarUsuario({
      id: data.id,
      nombre: data.displayName ?? data.nombre ?? data.email.split("@")[0],
      apellido: data.apellido ?? "",
      email: data.email,
      roles,
      activo: data.isActive ?? true
    });

    return {
      data: {
        usuario,
        roles,
        permisos: data?.permisos ?? data?.permissions ?? (permisosCalculados.length ? permisosCalculados : ["*"]),
        alcances: alcances.length ? alcances : ["school"]
      },
      origen: "api"
    };
  } catch (error) {
    if (error.status === 401) {
      guardarToken(null);
      return { data: null, origen: "expirada" };
    }
    return { data: null, origen: "error", error };
  }
}

/* ---------- Escrituras: sin fallback, el backend decide ---------- */

export function guardarRolesDeUsuario(id, roles) {
  return pedir(`/api/v1/users/${encodeURIComponent(id)}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roles })
  });
}

export function crearUsuario(datos) {
  return pedir("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(datos)
  });
}

export function actualizarUsuario(id, datos) {
  return pedir(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(datos),
    recurso: "el usuario que intentas modificar"
  });
}

/* Baja logica: el backend desactiva la cuenta, nunca borra el registro
   (issue #2 del backend). */
export function cambiarEstadoUsuario(id, estado) {
  return actualizarUsuario(id, { estado });
}

export async function listarPermisosDeRol(id) {
  try {
    const data = await pedir(`/api/v1/roles/${encodeURIComponent(id)}/permissions`);

    return {
      data: Array.isArray(data) ? data : (data?.permisos ?? data?.permissions ?? []),
      origen: "api"
    };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      throw error;
    }

    return { data: [], origen: "demo" };
  }
}

export function guardarPermisosDeRol(id, permisos) {
  return pedir(`/api/v1/roles/${encodeURIComponent(id)}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permisos })
  });
}
