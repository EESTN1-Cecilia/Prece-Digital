import { aprobarPedido, crearPedido, listarPedidos, rechazarPedido } from "./pedidos-direccion.service.mjs";

export function listar({ user }) {
  return { data: listarPedidos(user) };
}

export function crear({ body, user }) {
  return { statusCode: 201, body: { data: crearPedido(body, user) } };
}

export function aprobar({ params, user }) {
  return { data: aprobarPedido(params.pedidoId, user) };
}

export function rechazar({ params, body, user }) {
  return { data: rechazarPedido(params.pedidoId, body, user) };
}
