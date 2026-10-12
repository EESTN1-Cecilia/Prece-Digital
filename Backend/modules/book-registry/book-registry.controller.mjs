import bookRegistryService from "./book-registry.service.mjs";

/* Controlador HTTP del Libro Matriz digital. La autenticacion y los permisos los
   resuelven verifyToken + authorize en routes/index.mjs: aca solo se traduce la
   peticion a llamadas del servicio. */

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

export function catalogos() {
  return bookRegistryService.catalogos();
}

export function crearRegistro({ params, body, user }) {
  return bookRegistryService.crearRegistro(params.studentId, body, user);
}

export function listarRegistros({ url, user }) {
  return bookRegistryService.listarRegistros(query(url), user);
}

export function obtenerDeAlumno({ params }) {
  return bookRegistryService.obtenerDeAlumno(params.studentId ?? params.alumnoId);
}

export function existeDeAlumno({ params }) {
  return bookRegistryService.existeDeAlumno(params.studentId);
}

export function obtenerRegistro({ params }) {
  return bookRegistryService.obtenerRegistro(params.registryId);
}

export function actualizarRegistro({ params, body, user }) {
  return bookRegistryService.actualizarRegistro(params.registryId, body, user);
}

export function historialDeRegistro({ params }) {
  return bookRegistryService.historialDeRegistro(params.registryId);
}
