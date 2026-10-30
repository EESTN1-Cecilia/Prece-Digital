/* Cuentas de alumno: primer ingreso con DNI, configuracion obligatoria de
   credenciales y "Mi Cuenta".

   No es un sistema de autenticacion paralelo: la cuenta es un usuario mas del
   repositorio de usuarios (rol `alumno`), con el mismo hash bcrypt, el mismo JWT
   de acceso, el mismo refresh token rotativo y el mismo limite de intentos que
   el login del personal. Lo unico propio es como se identifica (usuario o DNI en
   lugar de correo) y que la clave inicial es el DNI.

   La cuenta se crea la primera vez que el alumno ingresa, y solo si:
     - el DNI existe en el padron de alumnos y pertenece a un unico legajo,
     - el legajo esta activo,
     - el DNI no es provisorio (nomina importada sin documento real),
     - la contraseña enviada es exactamente ese DNI.
   Crear las cuentas al vuelo evita generar ~900 hashes al arrancar y hace que un
   alumno recien matriculado pueda entrar sin pasos manuales. */

import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { errorDeValidacion, errorHttp } from "../../utils/api-error.mjs";
import { createRefreshToken, revokeUserSessions, signAccessToken } from "../auth/token.service.mjs";
import { obtenerIpCliente, registrarFalloLogin, registrarLoginExitoso, revisarLogin } from "../auth/login-throttle.service.mjs";
import { permissionsForRole } from "../../config/permissions.config.mjs";
import studentPortalRepository, { cuentasRepository } from "./repositorio.mjs";
import { DNI_RE, usuariosIniciales, validarNuevaPassword, validarNuevoUsuario } from "./catalogo.mjs";

const COSTO_BCRYPT = 10;
const hashFicticio = bcrypt.hash("__alumno_inexistente__", COSTO_BCRYPT);

/* Mismo mensaje para todo rechazo de credenciales: no permite deducir si el DNI
   existe, si el legajo esta inactivo o si la clave es incorrecta. */
function credencialesInvalidas() {
  return errorHttp(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos.");
}

function soloDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

/* Un DNI sirve como credencial solo si identifica a un unico legajo activo y real. */
export function evaluarHabilitacion(alumno, { dniRepetido = false } = {}) {
  if (!alumno) return { habilitado: false, motivo: "sin_legajo" };
  if (!alumno.isActive) return { habilitado: false, motivo: "legajo_inactivo" };
  if (!DNI_RE.test(String(alumno.dni ?? ""))) return { habilitado: false, motivo: "dni_invalido" };
  if (alumno.dniProvisorio) return { habilitado: false, motivo: "dni_provisorio" };
  if (dniRepetido) return { habilitado: false, motivo: "dni_duplicado" };
  return { habilitado: true, motivo: null };
}

async function dniRepetido(dni) {
  return (await studentPortalRepository.contarAlumnosConDni(dni)) > 1;
}

function sesionDeAlumno(usuario, accessToken, refreshToken) {
  const publico = userRepository.publicView(usuario);
  const roles = [ROLES.ALUMNO];

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    ...publico,
    user: publico,
    usuario: publico,
    roles,
    permisos: permissionsForRole(ROLES.ALUMNO),
    alcances: ["schoolId", "studentId"],
    debeCambiarPassword: Boolean(usuario.mustChangePassword)
  };
}

function cuentaPublica(usuario, alumno) {
  return {
    usuario: usuario.username,
    dni: alumno?.dni ?? null,
    nombre: alumno?.nombre ?? usuario.nombre ?? null,
    apellido: alumno?.apellido ?? usuario.apellido ?? null,
    debeCambiarPassword: Boolean(usuario.mustChangePassword),
    configurada: !usuario.mustChangePassword,
    passwordActualizadaEn: usuario.passwordChangedAt ?? null,
    ultimoIngreso: usuario.lastLoginAt ?? null,
    creadaEn: usuario.createdAt ?? null
  };
}

/* Usuario inicial de un alumno, calculado sobre todo el padron para resolver
   homonimos (ver usuariosIniciales en catalogo.mjs). */
export async function usuarioInicialDe(alumno) {
  return usuariosIniciales(await studentPortalRepository.todosLosAlumnos()).get(alumno.id);
}

async function crearCuentaInicial(alumno) {
  /* Si el usuario inicial ya lo tomo otra cuenta (por ejemplo, alguien lo eligio
     antes como usuario propio), se usa el DNI para no pisarla. */
  const inicial = await usuarioInicialDe(alumno);
  const ocupado = inicial ? await cuentasRepository.porUsuario(inicial) : null;

  return cuentasRepository.crear({
    email: null,
    username: inicial && !ocupado ? inicial : alumno.dni,
    studentId: alumno.id,
    dni: alumno.dni,
    nombre: alumno.nombre,
    apellido: alumno.apellido,
    displayName: `${alumno.nombre} ${alumno.apellido}`,
    passwordHash: await bcrypt.hash(alumno.dni, COSTO_BCRYPT),
    mustChangePassword: true,
    assignments: [{ role: ROLES.ALUMNO, schoolId: alumno.escuelaId, studentId: alumno.id }]
  });
}

/* Busca la cuenta por usuario y, si no existe, por DNI del legajo. Devuelve
   tambien el alumno para poder crear la cuenta en el primer ingreso. */
async function resolverIdentificador(identificador) {
  const texto = String(identificador ?? "").trim().toLowerCase();
  const porUsuario = await cuentasRepository.porUsuario(texto);

  if (porUsuario?.studentId) {
    return { cuenta: porUsuario, alumno: await studentPortalRepository.alumno(porUsuario.studentId) };
  }

  /* Primer ingreso con el usuario inicial (nombre.apellido@alumno.prece.local):
     se busca a que alumno del padron le corresponde. */
  if (texto.includes("@")) {
    const alumnos = await studentPortalRepository.todosLosAlumnos();
    const iniciales = usuariosIniciales(alumnos);
    const alumno = alumnos.find((item) => iniciales.get(item.id) === texto) ?? null;
    return alumno ? { cuenta: await cuentasRepository.porAlumno(alumno.id), alumno } : { cuenta: null, alumno: null };
  }

  /* Tambien se acepta el DNI como usuario. */
  const dni = soloDigitos(texto);

  if (!DNI_RE.test(dni) || dni !== texto) {
    return { cuenta: null, alumno: null };
  }

  const alumno = await studentPortalRepository.alumnoPorDni(dni);

  if (!alumno) {
    return { cuenta: null, alumno: null };
  }

  return { cuenta: await cuentasRepository.porAlumno(alumno.id), alumno };
}

export const studentAccountsService = {
  async login({ usuario, password, request }) {
    const identificador = String(usuario ?? "").trim();
    const clave = typeof password === "string" ? password : "";

    if (!identificador || !clave) {
      throw errorDeValidacion(
        [
          ...(!identificador ? [{ field: "usuario", message: "Ingresá tu usuario o DNI." }] : []),
          ...(!clave ? [{ field: "password", message: "Ingresá tu contraseña." }] : [])
        ],
        "Usuario y contraseña son obligatorios."
      );
    }

    const ip = obtenerIpCliente(request);
    const claveThrottle = `alumno:${identificador.toLowerCase()}`;
    revisarLogin(claveThrottle, ip);

    const { cuenta, alumno } = await resolverIdentificador(identificador);
    const habilitacion = evaluarHabilitacion(alumno, { dniRepetido: alumno ? await dniRepetido(alumno.dni) : false });

    /* Primer ingreso: no hay cuenta todavia y la clave debe ser el DNI del legajo. */
    if (!cuenta) {
      const coincide = habilitacion.habilitado && clave === alumno.dni;
      await bcrypt.compare(clave, await hashFicticio); // tiempo de respuesta parejo

      if (!coincide) {
        registrarFalloLogin(claveThrottle, ip, { trackEmail: Boolean(alumno) });
        throw credencialesInvalidas();
      }

      const nueva = await crearCuentaInicial(alumno);
      registrarLoginExitoso(claveThrottle);
      const conIngreso = await cuentasRepository.actualizar(nueva.id, { lastLoginAt: new Date().toISOString() });
      return sesionDeAlumno(conIngreso, signAccessToken(conIngreso), createRefreshToken(conIngreso.id));
    }

    const coincide = await bcrypt.compare(clave, cuenta.passwordHash);

    if (!coincide || !cuenta.isActive || !habilitacion.habilitado) {
      registrarFalloLogin(claveThrottle, ip, { trackEmail: true });
      throw credencialesInvalidas();
    }

    registrarLoginExitoso(claveThrottle);
    const actualizada = await cuentasRepository.actualizar(cuenta.id, { lastLoginAt: new Date().toISOString() });
    return sesionDeAlumno(actualizada, signAccessToken(actualizada), createRefreshToken(actualizada.id));
  },

  async obtenerCuenta(user) {
    return cuentaPublica(user, await studentPortalRepository.alumno(user.studentId));
  },

  /* Primer ingreso: cambia la clave inicial (obligatorio) y, si quiere, el
     usuario. Recien despues el alumno ve su informacion academica. */
  async configurar(user, cuerpo = {}) {
    const alumno = await studentPortalRepository.alumno(user.studentId);
    const errores = [];
    let usuarioNuevo = user.username;

    if (cuerpo.usuario !== undefined && cuerpo.usuario !== null && String(cuerpo.usuario).trim() !== "") {
      const resultado = validarNuevoUsuario(cuerpo.usuario, { dniPropio: alumno.dni });

      if (resultado.error) {
        errores.push({ field: "usuario", message: resultado.error });
      } else {
        usuarioNuevo = resultado.valor;
        const ocupado = await cuentasRepository.porUsuario(usuarioNuevo);
        if (ocupado && ocupado.id !== user.id) {
          errores.push({ field: "usuario", message: "Ese usuario ya está en uso. Probá con otro." });
        }
      }
    }

    errores.push(...this.validarCambioDePassword(user, cuerpo, { alumno, usuario: usuarioNuevo }));

    if (!(await bcrypt.compare(String(cuerpo.passwordActual ?? ""), user.passwordHash))) {
      errores.push({ field: "passwordActual", message: "La contraseña actual no es correcta." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores, "Revisá los datos de tu cuenta.");
    }

    const actualizado = await cuentasRepository.actualizar(user.id, {
      username: usuarioNuevo,
      passwordHash: await bcrypt.hash(cuerpo.passwordNueva, COSTO_BCRYPT),
      mustChangePassword: false,
      passwordChangedAt: new Date().toISOString()
    });

    return cuentaPublica(actualizado, alumno);
  },

  async cambiarPassword(user, cuerpo = {}) {
    const alumno = await studentPortalRepository.alumno(user.studentId);
    const errores = this.validarCambioDePassword(user, cuerpo, { alumno, usuario: user.username });

    if (!(await bcrypt.compare(String(cuerpo.passwordActual ?? ""), user.passwordHash))) {
      errores.push({ field: "passwordActual", message: "La contraseña actual no es correcta." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores, "No se pudo cambiar la contraseña.");
    }

    const actualizado = await cuentasRepository.actualizar(user.id, {
      passwordHash: await bcrypt.hash(cuerpo.passwordNueva, COSTO_BCRYPT),
      mustChangePassword: false,
      passwordChangedAt: new Date().toISOString()
    });

    /* Cierra las otras sesiones abiertas: si alguien conocia la clave anterior, deja de entrar. */
    revokeUserSessions(user.id);
    return {
      ...cuentaPublica(actualizado, alumno),
      sesion: { accessToken: signAccessToken(actualizado), refreshToken: createRefreshToken(actualizado.id) }
    };
  },

  async cambiarUsuario(user, cuerpo = {}) {
    const alumno = await studentPortalRepository.alumno(user.studentId);
    const resultado = validarNuevoUsuario(cuerpo.usuario, { dniPropio: alumno.dni });
    const errores = [];

    if (resultado.error) {
      errores.push({ field: "usuario", message: resultado.error });
    } else {
      const ocupado = await cuentasRepository.porUsuario(resultado.valor);
      if (ocupado && ocupado.id !== user.id) {
        errores.push({ field: "usuario", message: "Ese usuario ya está en uso. Probá con otro." });
      }
    }

    if (!(await bcrypt.compare(String(cuerpo.passwordActual ?? ""), user.passwordHash))) {
      errores.push({ field: "passwordActual", message: "La contraseña actual no es correcta." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores, "No se pudo cambiar el usuario.");
    }

    return cuentaPublica(await cuentasRepository.actualizar(user.id, { username: resultado.valor }), alumno);
  },

  validarCambioDePassword(user, cuerpo, { alumno, usuario }) {
    const errores = [];
    const nueva = cuerpo.passwordNueva;

    if (typeof nueva !== "string" || !nueva) {
      errores.push({ field: "passwordNueva", message: "Ingresá una contraseña nueva." });
      return errores;
    }

    for (const mensaje of validarNuevaPassword(nueva, { dni: alumno?.dni, usuario })) {
      errores.push({ field: "passwordNueva", message: mensaje });
    }

    if (cuerpo.confirmacion !== nueva) {
      errores.push({ field: "confirmacion", message: "La confirmación no coincide con la contraseña nueva." });
    }

    if (cuerpo.passwordActual && cuerpo.passwordActual === nueva) {
      errores.push({ field: "passwordNueva", message: "La contraseña nueva tiene que ser distinta de la actual." });
    }

    return errores;
  }
};

export default studentAccountsService;
