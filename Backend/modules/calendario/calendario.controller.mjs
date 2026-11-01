import service from "./calendario.service.mjs";

const query = (url) => Object.fromEntries(url.searchParams.entries());

export const listar = ({ url }) => ({ statusCode: 200, body: { data: service.listar(query(url)) } });
export const avisos = ({ url }) => ({ statusCode: 200, body: { data: service.avisos(query(url)) } });
export const estado = () => ({ statusCode: 200, body: { data: service.estado() } });
export const historial = ({ params }) => ({ statusCode: 200, body: { data: service.historial(params.id) } });
export const crear = ({ body, user }) => ({ statusCode: 201, body: { data: service.crearInstitucional(body, user) } });
export const actualizar = ({ params, body }) => ({ statusCode: 200, body: { data: service.actualizarInstitucional(params.id, body) } });
export const eliminar = ({ params }) => ({ statusCode: 200, body: { data: service.eliminarInstitucional(params.id) } });
export const verificar = ({ params, user }) => ({ statusCode: 200, body: { data: service.verificar(params.id, user) } });
export async function actualizarDesdeFuentes({ body, user }) {
  const anio = body?.anio ? Number(body.anio) : undefined;
  return { statusCode: 200, body: { data: await service.actualizarDesdeFuentes({ anio, usuario: user }) } };
}
