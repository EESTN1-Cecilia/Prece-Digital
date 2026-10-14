/* Adaptador de datos del modulo Identidad (usuarios, roles y permisos).

   Endpoints que consume del backend:
     POST   /api/v1/auth/login | /auth/logout
     GET    /api/v1/auth/me
     GET    /api/v1/users?q&rol&estado
     GET    /api/v1/users/:id
     POST   /api/v1/users
     PATCH  /api/v1/users/:id
     PUT    /api/v1/users/:id/roles
     GET    /api/v1/authorization/roles
     GET    /api/v1/authorization/modules
     GET    /api/v1/authorization/permissions
     GET    /api/v1/authorization/roles/:id/permissions
     PUT    /api/v1/authorization/roles/:id/permissions

   El estado de la sesion vive en estado/, no aca: este archivo solo trae y normaliza
   datos. No hay datos de demostracion: los errores del backend llegan a la vista. */

import { ErrorApi, guardarCredenciales, leerRefreshToken, leerToken, limpiarCredenciales, pedir } from "./http.js";
import { actions as ACCIONES_DOMINIO, roles as ROLES_DOMINIO } from "../../../../Shared/src/domain.mjs";

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
  const assignments = Array.isArray(crudo?.assignments) ? crudo.assignments : [];
  const roles = primero(crudo, ["roles", "usuario_roles", "userRoles"]) ?? assignments.map((asignacion) => asignacion.role);
  const displayName = primero(crudo, ["displayName", "display_name", "nombreCompleto", "fullName"]);
  const [nombreDisplay, ...apellidoDisplay] = String(displayName ?? "").trim().split(/\s+/).filter(Boolean);
  const email = primero(crudo, ["email", "correo"]);

  return {
    id: primero(crudo, ["id", "usuario_id", "userId"]),
    nombre: primero(crudo, ["nombre", "firstName", "first_name"]) ?? nombreDisplay ?? null,
    apellido: primero(crudo, ["apellido", "lastName", "last_name"]) ?? (apellidoDisplay.length ? apellidoDisplay.join(" ") : null),
    usuario: primero(crudo, ["usuario", "username", "nombre_usuario"]) ?? email?.split("@")[0] ?? null,
    email,
    dni: primero(crudo, ["dni", "documento"]),
    telefono: primero(crudo, ["telefono", "phone"]),
    area: primero(crudo, ["area", "sector", "area_nombre", "sector_nombre"]) ?? primero(assignments[0], ["schoolId", "areaId"]),
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

/* Nombre legible de un rol a partir del catalogo compartido. */
function conNombreDeRol(rol) {
  const catalogo = ROLES_DOMINIO.find((item) => item.id === rol.id);
  return { ...rol, nombre: rol.nombre && rol.nombre !== rol.id ? rol.nombre : (catalogo?.name ?? rol.id) };
}

/* Acciones canonicas (columnas de la matriz de permisos). */
export const ACCIONES = ACCIONES_DOMINIO.filter((accion) => !["write", "manage"].includes(accion.id)).map((accion) => ({
  id: accion.id,
  nombre: accion.name
}));

export async function listarPermisos() {
  const data = await pedir("/api/v1/authorization/permissions");

  return {
    data: (Array.isArray(data) ? data : []).map((permiso) => ({
      id: primero(permiso, ["id", "codigo", "code"]),
      modulo: primero(permiso, ["modulo", "module"]),
      accion: primero(permiso, ["accion", "action"])
    })),
    origen: "api"
  };
}

export async function listarRoles() {
  const data = await pedir("/api/v1/authorization/roles");
  return { data: (Array.isArray(data) ? data : []).map(normalizarRol).map(conNombreDeRol), origen: "api" };
}

export async function listarModulos() {
  const data = await pedir("/api/v1/authorization/modules");

  return {
    data: (Array.isArray(data) ? data : []).map((modulo) => ({
      id: primero(modulo, ["id", "codigo"]),
      nombre: primero(modulo, ["nombre", "name", "id"])
    })),
    origen: "api"
  };
}

/* ---------- Usuarios ---------- */

function alcancesDesdeAsignaciones(asignaciones = []) {
  return [...new Set(asignaciones.flatMap((asignacion) => Object.keys(asignacion).filter((clave) => clave !== "role")))];
}

function normalizarSesionAutenticada(datos = {}) {
  const usuarioCrudo = datos.usuario ?? datos.user ?? datos;
  const usuario = normalizarUsuario(usuarioCrudo);
  const asignaciones = Array.isArray(usuarioCrudo?.assignments) ? usuarioCrudo.assignments : [];
  const roles = (datos.roles ?? usuario.roles).map(normalizarRol).filter((rol) => rol.id).map(conNombreDeRol);

  return {
    usuario: { ...usuario, roles },
    /* Los permisos los calcula siempre el backend. */
    permisos: datos.permisos ?? datos.permissions ?? [],
    alcances: datos.alcances ?? datos.scopes ?? alcancesDesdeAsignaciones(asignaciones)
  };
}

/* Estados posibles de una cuenta (el backend no borra usuarios: los desactiva). */
export function estadosDisponibles() {
  return ["activo", "inactivo"];
}

/* Areas presentes en los usuarios cargados (el backend no las define todavia). */
export function areasDisponibles(usuarios = []) {
  return [...new Set(usuarios.map((usuario) => usuario.area).filter(Boolean))].sort();
}

/* El backend filtra por texto, rol y estado; la paginacion se hace aca. */
export async function listarUsuarios(filtros = {}) {
  const { pagina = 1, porPagina = 10 } = filtros;
  const lista = await pedir(`/api/v1/users?${construirConsulta(filtros)}`);
  const usuarios = filtrarUsuarios((Array.isArray(lista) ? lista : []).map(normalizarUsuario), filtros);

  return { ...paginar(usuarios, pagina, porPagina), origen: "api" };
}

export async function obtenerUsuario(id) {
  const data = await pedir(`/api/v1/users/${encodeURIComponent(id)}`, { recurso: "el usuario solicitado" });
  return { data: normalizarUsuario(data), origen: "api" };
}

export async function obtenerSesion() {
  if (!leerToken()) {
    return { data: null, origen: "anonima" };
  }

  const data = await pedir("/api/v1/auth/me");
  return { data: normalizarSesionAutenticada(data), origen: "api" };
}

export async function iniciarSesion({ email, password }) {
  const data = await pedir("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  if (!data?.accessToken || !data?.refreshToken) {
    throw new ErrorApi(500, "El servidor no devolvio una sesion valida.", { alcance: "global" });
  }

  guardarCredenciales(data);
  return { data: normalizarSesionAutenticada(data), origen: "api" };
}

export async function cerrarSesionRemota() {
  const refreshToken = leerRefreshToken();

  try {
    if (refreshToken) {
      await pedir("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken })
      });
    }
  } finally {
    limpiarCredenciales();
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

/* Baja logica: el backend desactiva la cuenta, nunca borra el registro. */
export function cambiarEstadoUsuario(id, estado) {
  return actualizarUsuario(id, { estado });
}

export async function listarPermisosDeRol(id) {
  const data = await pedir(`/api/v1/authorization/roles/${encodeURIComponent(id)}/permissions`);

  return {
    data: Array.isArray(data) ? data : (data?.permisos ?? data?.permissions ?? []),
    origen: "api"
  };
}

export function guardarPermisosDeRol(id, permisos) {
  return pedir(`/api/v1/authorization/roles/${encodeURIComponent(id)}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permisos })
  });
}
