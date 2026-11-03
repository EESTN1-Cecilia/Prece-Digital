import studentPortalRepository from "./repositorio.mjs";
import { noEncontrado } from "../../utils/api-error.mjs";
import studentAccountsService from "./student-accounts.service.mjs";
import studentPortalService from "./student-portal.service.mjs";
import { verificarPadron } from "./student-verification.service.mjs";

function query(url) {
  return Object.fromEntries(url.searchParams.entries());
}

/* ---------------- Acceso ------------------------------------------------- */


/* ---------------- Mi Cuenta ---------------------------------------------- */

export async function obtenerCuenta({ user }) {
  return { statusCode: 200, body: { data: await studentAccountsService.obtenerCuenta(user) } };
}

export async function configurarCuenta({ user, body }) {
  return { statusCode: 200, body: { data: await studentAccountsService.configurar(user, body) } };
}

export async function cambiarPassword({ user, body }) {
  return { statusCode: 200, body: { data: await studentAccountsService.cambiarPassword(user, body) } };
}

export async function cambiarUsuario({ user, body }) {
  return { statusCode: 200, body: { data: await studentAccountsService.cambiarUsuario(user, body) } };
}

/* ---------------- Informacion academica (siempre del alumno del token) --- */

export async function perfil({ alumno }) {
  return { statusCode: 200, body: { data: await studentPortalService.perfil(alumno) } };
}

export async function boletin({ alumno, url }) {
  return { statusCode: 200, body: { data: await studentPortalService.boletin(alumno, query(url)) } };
}

export async function asistencias({ alumno, url }) {
  return { statusCode: 200, body: { data: await studentPortalService.asistencias(alumno, query(url)) } };
}

export async function situacionAcademica({ alumno }) {
  return { statusCode: 200, body: { data: await studentPortalService.situacionAcademica(alumno) } };
}

export async function previas({ alumno }) {
  return { statusCode: 200, body: { data: await studentPortalService.previas(alumno) } };
}

/* Boletin de un alumno pedido por el personal: mismo servicio, mismos datos. */
export async function boletinDeAlumno({ params, url }) {
  const alumno = await studentPortalRepository.alumno(params.alumnoId);
  if (!alumno) throw noEncontrado("El alumno");
  return { statusCode: 200, body: { data: await studentPortalService.boletin(alumno, query(url)) } };
}

/* ---------------- Verificacion integral (secretaria / direccion) --------- */

export async function verificacion({ url }) {
  const { detalle } = query(url);
  return { statusCode: 200, body: { data: await verificarPadron({ incluirSinProblemas: detalle === "todos" }) } };
}
