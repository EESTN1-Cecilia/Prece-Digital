/* Vinculo entre la cuenta de acceso (usuarios) y el registro docente (docentes).

   Una persona con rol Docente tiene UNA cuenta y UN registro docente, ligados
   por docentes.userId. Este servicio es el unico que mantiene ese vinculo:
   - al crear un perfil con rol Docente se crea el registro docente, o se reusa
     el que ya existia para esa persona (mismo DNI o correo);
   - al editar la cuenta se actualiza el registro, y al editar el registro se
     actualiza la cuenta;
   - la baja de una deja inactiva a la otra y cierra las sesiones abiertas.

   Asi el docente aparece en el sector Docentes sin cargarlo dos veces y la
   misma persona se ve igual en todos los modulos. */

import { ROLES } from "../../config/permissions.config.mjs";
import { esAreaValida } from "../../config/areas.config.mjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { conflicto } from "../../utils/api-error.mjs";
import { revokeUserSessions } from "../auth/token.service.mjs";
import teachersRepository from "./teachers.repository.mjs";
import { normalizarTexto } from "./catalogo.mjs";

export function tieneRolDocente(usuario) {
  return (usuario?.assignments ?? []).some((asignacion) => asignacion.role === ROLES.DOCENTE);
}

function nombreVisible({ nombre, apellido, email }) {
  return [nombre, apellido].filter(Boolean).join(" ") || email;
}

/* Registro docente que corresponde a la persona: primero por cuenta, despues
   por DNI o correo. Es un conflicto (409) si el que coincide ya esta ligado a
   otra cuenta, si el DNI y el correo apuntan a dos docentes distintos o si los
   datos no son de la misma persona: no se duplican personas ni se pisan datos
   ajenos. */
export function docenteDePersona({ userId = null, dni, email, nombre, apellido, escuelaId = null }) {
  const porCuenta = userId ? teachersRepository.findDocenteByUserId(userId) : null;

  if (porCuenta) {
    return porCuenta;
  }

  const porDni = dni ? teachersRepository.findDocenteByDocumento(dni, escuelaId) : null;
  const porEmail = email ? teachersRepository.findDocenteByEmail(email, escuelaId) : null;

  if (porDni && porEmail && porDni.id !== porEmail.id) {
    throw conflicto("El DNI y el correo pertenecen a dos docentes distintos ya registrados.");
  }

  const encontrado = porDni ?? porEmail;

  if (!encontrado) {
    return null;
  }

  if (encontrado.userId && encontrado.userId !== userId) {
    throw conflicto("Ese docente ya tiene una cuenta de acceso vinculada.");
  }

  /* Reusar solo si es la misma persona: mismo apellido y nombre, y que el otro
     identificador no contradiga al registro. Si no, es un error de carga y se
     pide verificar en lugar de pisar los datos de otro docente. */
  const mismaPersona =
    normalizarTexto(encontrado.apellido) === normalizarTexto(apellido) &&
    normalizarTexto(encontrado.nombre) === normalizarTexto(nombre) &&
    (!dni || encontrado.documento === dni) &&
    (!email || normalizarTexto(encontrado.email) === normalizarTexto(email));

  if (!mismaPersona) {
    const campo = porDni ? "dni" : "email";
    throw conflicto(
      `Ese ${porDni ? "DNI" : "correo"} ya pertenece al docente ${encontrado.apellido}, ${encontrado.nombre}. Verificá los datos.`,
      [{ field: campo, message: `Ya registrado para ${encontrado.apellido}, ${encontrado.nombre}.` }]
    );
  }

  return encontrado;
}

function datosDesdeCuenta(usuario, actorId) {
  const datos = {
    userId: usuario.id,
    apellido: usuario.apellido,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono ?? null,
    estado: usuario.isActive ? "activo" : "inactivo",
    actualizadoPor: actorId ?? null
  };

  if (usuario.dni) {
    datos.documento = usuario.dni;
  }

  if (esAreaValida(usuario.area)) {
    datos.area = usuario.area;
  }

  return datos;
}

/* La materia de los Datos Academicos de la cuenta se suma a las especialidades
   del docente sin pisar las que ya tenia cargadas. */
function especialidadesConMateria(docente, usuario) {
  const actuales = [...(docente?.especialidades ?? [])];
  const materia = String(usuario.materia ?? "").trim();

  if (materia && !actuales.some((especialidad) => normalizarTexto(especialidad) === normalizarTexto(materia))) {
    actuales.push(materia);
  }

  return actuales;
}

/* Crea o vincula el registro docente de una cuenta con rol Docente. */
export function vincularDocente(usuario, { escuelaId, actorId = null } = {}) {
  const existente = docenteDePersona({
    userId: usuario.id,
    dni: usuario.dni,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    escuelaId
  });
  const datos = datosDesdeCuenta(usuario, actorId);

  if (existente) {
    const actualizado = teachersRepository.updateDocente(existente.id, {
      ...datos,
      especialidades: especialidadesConMateria(existente, usuario),
      fechaBaja: datos.estado === "inactivo" ? existente.fechaBaja ?? new Date().toISOString() : null
    });
    teachersRepository.registrarAuditoria({
      accion: "docente:link-account",
      actorId,
      entidad: "docente",
      entidadId: existente.id,
      antes: existente,
      despues: actualizado
    });
    return actualizado;
  }

  const creado = teachersRepository.createDocente({
    ...datos,
    tipoDocumento: "dni",
    documento: usuario.dni,
    titulo: null,
    especialidades: especialidadesConMateria(null, usuario),
    area: datos.area ?? null,
    escuelaId,
    creadoPor: actorId
  });
  teachersRepository.registrarAuditoria({
    accion: "docente:create-from-account",
    actorId,
    entidad: "docente",
    entidadId: creado.id,
    antes: null,
    despues: creado
  });
  return creado;
}

/* Antes de cambiar DNI o correo de una cuenta: que no choquen con otro docente. */
export function verificarDatosDocente(usuarioId, { dni, email }) {
  const docente = teachersRepository.findDocenteByUserId(usuarioId);

  if (!docente) {
    return;
  }

  const porDni = dni ? teachersRepository.findDocenteByDocumento(dni, docente.escuelaId) : null;
  const porEmail = email ? teachersRepository.findDocenteByEmail(email, docente.escuelaId) : null;

  if ((porDni && porDni.id !== docente.id) || (porEmail && porEmail.id !== docente.id)) {
    throw conflicto("Esos datos ya pertenecen a otro docente registrado.");
  }
}

/* Despues de editar la cuenta: el registro docente refleja los cambios. Si la
   cuenta dejo de tener el rol Docente, el registro queda inactivo (baja logica). */
export function sincronizarDesdeCuenta(usuario, actorId = null) {
  const docente = teachersRepository.findDocenteByUserId(usuario.id);

  if (!docente) {
    return null;
  }

  const datos = { ...datosDesdeCuenta(usuario, actorId), especialidades: especialidadesConMateria(docente, usuario) };

  if (!tieneRolDocente(usuario)) {
    datos.estado = "inactivo";
  }

  if (datos.estado === "inactivo") {
    datos.fechaBaja = docente.fechaBaja ?? new Date().toISOString();
  }

  return teachersRepository.updateDocente(docente.id, datos);
}

/* Antes de editar un docente con cuenta: el correo y el DNI no pueden ser de
   otra cuenta. */
export function verificarCuentaDisponible(docente, { email, documento }) {
  if (!docente?.userId) {
    return;
  }

  const porEmail = email ? userRepository.findByEmail(email, { includeInactive: true }) : null;
  const porDni = documento ? userRepository.findByDni(documento) : null;

  if ((porEmail && porEmail.id !== docente.userId) || (porDni && porDni.id !== docente.userId)) {
    throw conflicto("Esos datos ya pertenecen a otra cuenta del sistema.");
  }
}

/* Despues de editar o dar de baja a un docente: la cuenta refleja los cambios.
   Una baja desactiva la cuenta y cierra sus sesiones, asi el docente deja de
   poder entrar al portal en el acto. */
export function sincronizarCuenta(docente) {
  if (!docente?.userId) {
    return null;
  }

  const cuenta = userRepository.findById(docente.userId, { includeInactive: true });

  if (!cuenta) {
    return null;
  }

  const cambios = {
    nombre: docente.nombre,
    apellido: docente.apellido,
    email: docente.email,
    telefono: docente.telefono ?? null,
    displayName: nombreVisible(docente)
  };

  if (docente.tipoDocumento === "dni") {
    cambios.dni = docente.documento;
  }

  let actualizada = userRepository.update(cuenta.id, cambios);

  if (docente.estado === "inactivo" && cuenta.isActive) {
    actualizada = userRepository.deactivate(cuenta.id);
    revokeUserSessions(cuenta.id);
  } else if (docente.estado === "activo" && !cuenta.isActive) {
    actualizada = userRepository.activate(cuenta.id);
  }

  return actualizada;
}
