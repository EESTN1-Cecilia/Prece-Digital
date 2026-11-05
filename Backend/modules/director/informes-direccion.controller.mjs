import * as service from "./informes-direccion.service.mjs";

const query = (url) => Object.fromEntries(url.searchParams.entries());

export function listar({ url }) {
  return {
    statusCode: 200,
    body: { data: service.listarInformes(query(url)) }
  };
}

export function crear({ body, user }) {
  return {
    statusCode: 201,
    body: { data: service.crearInforme(body, user) }
  };
}

export function eliminar({ params }) {
  return {
    statusCode: 200,
    body: { data: service.eliminarInforme(params.informeId) }
  };
}

