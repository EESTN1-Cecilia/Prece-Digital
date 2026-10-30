/* Guardias del portal del alumno. Van despues de verifyToken y authorize:

     middlewares: [verifyToken, required(P.STUDENT_PORTAL_READ), alumnoAutenticado, cuentaConfigurada]

   - `alumnoAutenticado` resuelve el legajo SIEMPRE desde la cuenta del token,
     nunca desde la URL, el cuerpo o la query: ningun endpoint del portal recibe
     un id de alumno, asi que no hay parametro que manipular para ver otro perfil.
   - `cuentaConfigurada` bloquea la informacion academica hasta que el alumno
     cambie la contraseña inicial (el DNI). */

import { ROLES } from "../../config/permissions.config.mjs";
import { errorHttp } from "../../utils/api-error.mjs";
import studentPortalRepository from "./repositorio.mjs";

export async function alumnoAutenticado(ctx) {
  const usuario = ctx.user;
  const asignacion = (usuario?.assignments ?? []).find(
    (item) => item.role === ROLES.ALUMNO && item.studentId && item.studentId === usuario.studentId
  );

  if (!asignacion) {
    throw errorHttp(403, "FORBIDDEN", "Esta sección es solo para alumnos.");
  }

  const alumno = await studentPortalRepository.alumno(usuario.studentId);

  if (!alumno || !alumno.isActive) {
    throw errorHttp(403, "STUDENT_INACTIVE", "Tu legajo no está activo. Comunicate con secretaría.");
  }

  ctx.alumno = alumno;
}

export async function cuentaConfigurada(ctx) {
  if (ctx.user?.mustChangePassword) {
    throw errorHttp(403, "PASSWORD_CHANGE_REQUIRED", "Antes de ver tu información tenés que cambiar la contraseña inicial.");
  }
}
