/* Pedidos que los sectores (Server, Secretaria, Preceptoria, Jefatura) elevan a la
   Direccion para que los habilite o los rechace.

   Viven en la coleccion `pedidosDireccion` del store, que la persistencia guarda
   en SQL Server (tabla ps_pedidos_direccion): el director los ve desde cualquier
   dispositivo y queda registrado quien pidio, quien resolvio y cuando.

   Reglas:
   - Crea cualquier perfil del personal; el sector sale de su rol.
   - Aprueba o rechaza solo Direccion (director o admin). Rechazar exige motivo.
   - Un pedido ya resuelto no se vuelve a resolver (409).
   - Direccion ve todos; el resto ve solo los suyos. */

import { ROLES } from "../../config/permissions.config.mjs";
import { getStore } from "../../database/memory-store.mjs";
import { conflicto, errorDeValidacion, noEncontrado, sinPermisos } from "../../utils/api-error.mjs";

const SECTOR_POR_ROL = {
  [ROLES.SERVER]: "Server",
  [ROLES.SECRETARIO]: "Secretaría",
  [ROLES.PRECEPTOR]: "Preceptoría",
  [ROLES.JEFE_AREA]: "Jefatura de Área",
  [ROLES.DOCENTE]: "Docentes",
  [ROLES.DIRECTOR]: "Dirección",
  [ROLES.ADMIN]: "Dirección"
};
export const TIPOS_PEDIDO = ["actualizacion_planillas", "inventario_hardware", "libro_matriz", "justificacion_asistencia", "otro"];

function coleccion() {
  const store = getStore();
  store.pedidosDireccion ??= new Map();
  return store.pedidosDireccion;
}

function roles(user) {
  return (user?.assignments ?? []).map((asignacion) => asignacion.role);
}

export function esDireccion(user) {
  return roles(user).some((rol) => rol === ROLES.DIRECTOR || rol === ROLES.ADMIN);
}

function nombreDe(user) {
  return [user?.nombre, user?.apellido].filter(Boolean).join(" ") || user?.displayName || user?.email || "Usuario";
}

function texto(valor, maximo) {
  return String(valor ?? "").trim().replace(/\s+/g, " ").slice(0, maximo);
}

function codigoNuevo() {
  const anio = new Date().getFullYear();
  const delAnio = [...coleccion().values()].filter((pedido) => String(pedido.codigo).startsWith(`PED-${anio}-`));
  const siguiente = delAnio.reduce((max, pedido) => Math.max(max, Number(String(pedido.codigo).split("-")[2]) || 0), 0) + 1;
  return `PED-${anio}-${String(siguiente).padStart(3, "0")}`;
}

export function listarPedidos(user) {
  const todos = [...coleccion().values()].sort((a, b) => String(b.creadoEn).localeCompare(String(a.creadoEn)));
  const visibles = esDireccion(user) ? todos : todos.filter((pedido) => pedido.solicitanteId === user?.id);
  return visibles.map((pedido) => structuredClone(pedido));
}

export function crearPedido(body, user) {
  const errores = [];
  const titulo = texto(body?.titulo, 160);
  const detalle = texto(body?.detalle, 2000);
  const tipo = TIPOS_PEDIDO.includes(body?.tipo) ? body.tipo : body?.tipo ? null : "otro";
  if (titulo.length < 5) errores.push({ field: "titulo", message: "Escribí un título de al menos 5 caracteres." });
  if (detalle.length < 10) errores.push({ field: "detalle", message: "Explicá el pedido en al menos 10 caracteres." });
  if (!tipo) errores.push({ field: "tipo", message: `Tipo no válido (${TIPOS_PEDIDO.join(", ")}).` });
  if (errores.length) throw errorDeValidacion(errores);

  const rolPrincipal = roles(user).find((rol) => SECTOR_POR_ROL[rol]) ?? null;
  const ahora = new Date().toISOString();
  const pedido = {
    id: `ped_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    codigo: codigoNuevo(),
    sector: SECTOR_POR_ROL[rolPrincipal] ?? "Otro",
    tipo,
    titulo,
    detalle,
    alcance: texto(body?.alcance, 200) || null,
    impacto: texto(body?.impacto, 200) || null,
    archivo: texto(body?.archivo, 200) || null,
    solicitante: nombreDe(user),
    solicitanteId: user?.id ?? null,
    rolSolicitante: rolPrincipal,
    estado: "pendiente",
    creadoEn: ahora,
    resueltoEn: null,
    resueltoPor: null,
    resueltoPorId: null,
    motivoRechazo: null
  };
  coleccion().set(pedido.id, pedido);
  return structuredClone(pedido);
}

function resolver(id, user, cambios) {
  if (!esDireccion(user)) throw sinPermisos("Solo la Dirección puede habilitar o rechazar pedidos.");
  const pedido = coleccion().get(String(id ?? ""));
  if (!pedido) throw noEncontrado("El pedido");
  if (pedido.estado !== "pendiente") throw conflicto(`El pedido ${pedido.codigo} ya fue ${pedido.estado} por ${pedido.resueltoPor ?? "Dirección"}.`);
  Object.assign(pedido, cambios, { resueltoEn: new Date().toISOString(), resueltoPor: nombreDe(user), resueltoPorId: user?.id ?? null });
  return structuredClone(pedido);
}

export function aprobarPedido(id, user) {
  return resolver(id, user, { estado: "aprobado" });
}

export function rechazarPedido(id, body, user) {
  const motivo = texto(body?.motivo, 500);
  if (motivo.length < 3) throw errorDeValidacion([{ field: "motivo", message: "Indicá el motivo del rechazo." }]);
  return resolver(id, user, { estado: "rechazado", motivoRechazo: motivo });
}

/* Solo para tests. */
export function vaciarPedidos() {
  coleccion().clear();
}
