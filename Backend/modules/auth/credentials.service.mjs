/* Credenciales de todos los perfiles: asignar usuario y restablecer contraseña.

   Solo lo usa el superadmin (permiso identity.credentials, validado en la ruta).
   Cubre al personal (cuentas con correo) y a los alumnos (cuenta propia del
   portal, que se crea al restablecer si el alumno todavia no ingreso nunca).

   Las contraseñas se guardan siempre con bcrypt. Una contraseña generada por el
   sistema se devuelve UNA sola vez en la respuesta para entregarla a la persona;
   una contraseña elegida por el superadmin nunca se devuelve. Al cambiar la
   clave se cierran las sesiones abiertas de esa cuenta. */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { conflicto, errorDeValidacion, noEncontrado, solicitudInvalida } from "../../utils/api-error.mjs";
import { revokeUserSessions } from "./token.service.mjs";
import studentPortalRepository, { cuentasRepository } from "../student-portal/repositorio.mjs";
import { DNI_RE, PASSWORD_MAXIMO, PASSWORD_MINIMO, validarNuevaPassword, validarNuevoUsuario } from "../student-portal/catalogo.mjs";

const COSTO_BCRYPT = 10;
const TIPOS = ["personal", "alumno"];
const LIMITE_ALUMNOS = 50;
/* Usuario de acceso del personal: sin espacios, 4 a 60 caracteres (puede ser un correo). */
const USUARIO_PERSONAL_RE = /^\S{4,60}$/;

function esCuentaDeAlumno(usuario) {
  return Boolean(usuario.studentId) || usuario.assignments.some((asignacion) => asignacion.role === ROLES.ALUMNO);
}

/* Contraseña generada: 12 caracteres que siempre combinan letras y numeros. */
export function generarPasswordTemporal() {
  let clave = "";

  while (!/[a-zA-Z]/.test(clave) || !/\d/.test(clave)) {
    clave = crypto.randomBytes(9).toString("base64url");
  }

  return clave;
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function tipoValido(tipo) {
  if (!TIPOS.includes(tipo)) {
    throw solicitudInvalida(`El tipo de cuenta debe ser ${TIPOS.join(" o ")}.`);
  }
}

/* Lee el cuerpo: contraseña elegida, o generar una, y si se obliga a cambiarla. */
function leerCuerpo(cuerpo = {}) {
  const password = cuerpo.password === undefined || cuerpo.password === null || cuerpo.password === "" ? null : String(cuerpo.password);
  const usuario = cuerpo.usuario === undefined || cuerpo.usuario === null || String(cuerpo.usuario).trim() === "" ? null : String(cuerpo.usuario).trim();

  return {
    password,
    usuario,
    generar: cuerpo.generar === true,
    obligarCambio: cuerpo.obligarCambio !== false
  };
}

export const credentialsService = {
  /* Personal: filtra por nombre, usuario o rol. Alumnos: busca en el padron y exige
     al menos 2 letras (hay cientos de legajos). */
  async listar({ tipo = "personal", q = "" } = {}) {
    tipoValido(tipo);
    const texto = normalizar(q);

    if (tipo === "personal") {
      const cuentas = userRepository
        .list({ includeInactive: true })
        .filter((usuario) => !esCuentaDeAlumno(usuario))
        .map((usuario) => ({
          tipo: "personal",
          id: usuario.id,
          nombre: usuario.displayName,
          usuario: usuario.email ?? usuario.username ?? null,
          roles: [...new Set(usuario.assignments.map((asignacion) => asignacion.role))],
          estado: usuario.isActive ? "activo" : "inactivo",
          debeCambiarPassword: Boolean(usuario.mustChangePassword),
          passwordActualizadaEn: usuario.passwordChangedAt ?? null
        }))
        .filter(
          (cuenta) =>
            !texto ||
            [cuenta.nombre, cuenta.usuario, ...cuenta.roles].some((campo) => normalizar(campo).includes(texto))
        );

      return { cuentas, total: cuentas.length, limitado: false };
    }

    if (texto.length < 2) {
      return { cuentas: [], total: 0, limitado: false, mensaje: "Escribí al menos 2 letras del apellido, nombre o DNI." };
    }

    const alumnos = (await studentPortalRepository.todosLosAlumnos()).filter((alumno) =>
      [`${alumno.apellido} ${alumno.nombre}`, alumno.dni].some((campo) => normalizar(campo).includes(texto))
    );

    const cuentas = [];

    for (const alumno of alumnos.slice(0, LIMITE_ALUMNOS)) {
      const cuenta = await cuentasRepository.porAlumno(alumno.id);

      cuentas.push({
        tipo: "alumno",
        id: alumno.id,
        nombre: `${alumno.apellido} ${alumno.nombre}`,
        usuario: cuenta?.username ?? null,
        dni: alumno.dni ?? null,
        dniProvisorio: Boolean(alumno.dniProvisorio),
        estado: alumno.isActive === false ? "inactivo" : "activo",
        tieneCuenta: Boolean(cuenta),
        debeCambiarPassword: Boolean(cuenta?.mustChangePassword),
        passwordActualizadaEn: cuenta?.passwordChangedAt ?? null
      });
    }

    return { cuentas, total: alumnos.length, limitado: alumnos.length > LIMITE_ALUMNOS };
  },

  /* Asigna usuario y/o contraseña. Devuelve passwordTemporal solo si la genero el sistema. */
  async asignar(actor, tipo, id, cuerpo = {}) {
    tipoValido(tipo);
    const { password, usuario, generar, obligarCambio } = leerCuerpo(cuerpo);

    if (!password && !generar && !usuario) {
      throw errorDeValidacion([{ field: "password", message: "Indicá una contraseña, pedí que se genere una o elegí un usuario nuevo." }]);
    }

    return tipo === "personal"
      ? this.asignarPersonal(id, { password, usuario, generar, obligarCambio })
      : this.asignarAlumno(id, { password, usuario, generar, obligarCambio });
  },

  async asignarPersonal(id, { password, usuario, generar, obligarCambio }) {
    const cuenta = userRepository.findById(id, { includeInactive: true });

    if (!cuenta || esCuentaDeAlumno(cuenta)) {
      throw noEncontrado("La cuenta del personal");
    }

    const errores = [];

    if (password !== null && (password.length < PASSWORD_MINIMO || password.length > PASSWORD_MAXIMO)) {
      errores.push({ field: "password", message: `La contraseña debe tener entre ${PASSWORD_MINIMO} y ${PASSWORD_MAXIMO} caracteres.` });
    }

    const usuarioNuevo = usuario ? usuario.toLowerCase() : null;

    if (usuarioNuevo && !USUARIO_PERSONAL_RE.test(usuarioNuevo)) {
      errores.push({ field: "usuario", message: "El usuario debe tener entre 4 y 60 caracteres, sin espacios." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    if (usuarioNuevo && usuarioNuevo !== cuenta.email) {
      const otro = userRepository.findByEmail(usuarioNuevo, { includeInactive: true });

      if (otro && otro.id !== cuenta.id) {
        throw conflicto("Ese usuario ya está en uso por otra cuenta.");
      }
    }

    const cambios = {};
    let passwordTemporal = null;

    if (usuarioNuevo) {
      cambios.email = usuarioNuevo;
    }

    if (password !== null || generar) {
      passwordTemporal = password === null ? generarPasswordTemporal() : null;
      cambios.passwordHash = await bcrypt.hash(password ?? passwordTemporal, COSTO_BCRYPT);
      cambios.passwordChangedAt = new Date().toISOString();
      cambios.mustChangePassword = obligarCambio;
    }

    const actualizada = userRepository.update(cuenta.id, cambios);

    if (cambios.passwordHash) {
      revokeUserSessions(cuenta.id);
    }

    return {
      tipo: "personal",
      id: actualizada.id,
      usuario: actualizada.email ?? actualizada.username,
      debeCambiarPassword: Boolean(actualizada.mustChangePassword),
      ...(passwordTemporal ? { passwordTemporal } : {})
    };
  },

  async asignarAlumno(id, { password, usuario, generar, obligarCambio }) {
    const alumno = await studentPortalRepository.alumno(id);

    if (!alumno) {
      throw noEncontrado("El alumno");
    }

    const cuenta = await cuentasRepository.porAlumno(alumno.id);
    const errores = [];
    let usuarioNuevo = cuenta?.username ?? null;

    if (usuario) {
      const resultado = validarNuevoUsuario(usuario, { dniPropio: alumno.dni });

      if (resultado.error) {
        errores.push({ field: "usuario", message: resultado.error });
      } else {
        usuarioNuevo = resultado.valor;
        const ocupado = await cuentasRepository.porUsuario(usuarioNuevo);

        if (ocupado && ocupado.id !== cuenta?.id) {
          errores.push({ field: "usuario", message: "Ese usuario ya está en uso por otra cuenta." });
        }
      }
    }

    /* Un alumno sin cuenta necesita una clave si se le va a crear el acceso. */
    if (!cuenta && password === null && !generar) {
      errores.push({ field: "password", message: "El alumno todavía no tiene cuenta: indicá una contraseña o pedí que se genere una." });
    }

    if (!cuenta && !usuarioNuevo) {
      if (DNI_RE.test(String(alumno.dni ?? ""))) {
        usuarioNuevo = String(alumno.dni);
      } else {
        errores.push({ field: "usuario", message: "El alumno no tiene un DNI válido: elegí un usuario para crear la cuenta." });
      }
    }

    if (password !== null) {
      for (const mensaje of validarNuevaPassword(password, { dni: alumno.dni, usuario: usuarioNuevo })) {
        errores.push({ field: "password", message: mensaje });
      }
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const cambiaClave = password !== null || generar;
    const passwordTemporal = cambiaClave && password === null ? generarPasswordTemporal() : null;
    const passwordHash = cambiaClave ? await bcrypt.hash(password ?? passwordTemporal, COSTO_BCRYPT) : null;
    const ahora = new Date().toISOString();

    let resultante;

    if (cuenta) {
      resultante = await cuentasRepository.actualizar(cuenta.id, {
        ...(usuarioNuevo ? { username: usuarioNuevo } : {}),
        ...(cambiaClave ? { passwordHash, passwordChangedAt: ahora, mustChangePassword: obligarCambio } : {})
      });
      if (cambiaClave) {
        revokeUserSessions(cuenta.id);
      }
    } else {
      resultante = await cuentasRepository.crear({
        email: null,
        username: usuarioNuevo,
        studentId: alumno.id,
        dni: alumno.dni,
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        displayName: `${alumno.nombre} ${alumno.apellido}`,
        passwordHash,
        passwordChangedAt: ahora,
        mustChangePassword: obligarCambio,
        assignments: [{ role: ROLES.ALUMNO, schoolId: alumno.escuelaId, studentId: alumno.id }]
      });
    }

    /* Con DNI provisorio el portal no deja entrar aunque la clave sea correcta. */
    const advertencia = alumno.dniProvisorio
      ? "El alumno tiene un DNI provisorio: no va a poder ingresar al portal hasta que se cargue su DNI real."
      : alumno.isActive === false
        ? "El legajo del alumno está inactivo: no va a poder ingresar al portal."
        : null;

    return {
      tipo: "alumno",
      id: alumno.id,
      usuario: resultante.username,
      debeCambiarPassword: Boolean(resultante.mustChangePassword),
      cuentaCreada: !cuenta,
      ...(passwordTemporal ? { passwordTemporal } : {}),
      ...(advertencia ? { advertencia } : {})
    };
  }
};

export default credentialsService;
