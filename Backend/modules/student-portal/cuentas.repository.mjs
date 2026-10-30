/* Cuentas de alumno (implementacion en memoria).

   Las cuentas son usuarios del repositorio de usuarios del sistema (rol
   `alumno`): verifyToken, refresh y logout las encuentran ahi como a cualquier
   otro usuario. Este archivo solo agrega las busquedas propias del portal.

   La version SQL Server (cuentas.repository.sqlserver.mjs) guarda la cuenta en
   la tabla `usuarios` y la deja ademas en este repositorio al iniciar sesion,
   para que el resto de la autenticacion (que todavia vive en memoria) la vea.
   Todos los metodos se llaman con await. */

import { userRepository } from "../../database/repositories/user.repository.mjs";
import { ROLES } from "../../config/permissions.config.mjs";

const cuentasRepository = {
  motor: "memoria",

  porUsuario(username) {
    return userRepository.findByUsername(username, { includeInactive: true });
  },

  porAlumno(studentId) {
    return userRepository.findByStudentId(studentId, { includeInactive: true });
  },

  crear(datos) {
    return userRepository.create(datos);
  },

  actualizar(id, cambios) {
    return userRepository.update(id, cambios);
  },

  listarCuentasDeAlumnos() {
    return userRepository
      .list({ includeInactive: true })
      .filter((usuario) => usuario.studentId || usuario.assignments.some((asignacion) => asignacion.role === ROLES.ALUMNO));
  }
};

export default cuentasRepository;
