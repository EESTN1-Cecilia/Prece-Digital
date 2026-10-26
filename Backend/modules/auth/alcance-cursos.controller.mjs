import { cursosConDetalleDocente, esDocenteRestringido } from "./alcance-cursos.service.mjs";

/* GET /api/v1/docente/mis-cursos

   Cursos ("<anio>-<division>") asignados al usuario autenticado como docente.
   `restringido` indica si el backend limita sus consultas de alumnos a esos
   cursos (cuenta solo docente) o si ademas tiene un rol institucional. */
export function misCursos({ user }) {
  return {
    statusCode: 200,
    body: {
      data: cursosConDetalleDocente(user),
      restringido: esDocenteRestringido(user)
    }
  };
}
