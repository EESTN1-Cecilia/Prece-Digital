import service from "./preceptor-assignments.service.mjs";

export const listar = () => ({ statusCode: 200, body: { data: service.listar() } });
export const asignar = ({ body }) => ({ statusCode: 200, body: { data: service.asignar(body) } });
export const quitar = ({ body }) => ({ statusCode: 200, body: { data: service.quitar(body) } });
export const misCursos = ({ user }) => ({ statusCode: 200, body: { data: service.misCursos(user) } });
