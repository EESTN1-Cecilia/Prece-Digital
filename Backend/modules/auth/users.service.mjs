/* Gestion de cuentas de usuario (modulo Identidad): alta, consulta, edicion,
   cambio de estado y roles. Las cuentas nunca se borran: la baja es logica. */

import bcrypt from "bcryptjs";
import { userRepository } from "../../database/repositories/user.repository.mjs";
import { transaction } from "../../database/memory-store.mjs";
import { ROL_CATALOGO, ROLES } from "../../config/permissions.config.mjs";
import { AREA_DEFECTO, esAreaValida } from "../../config/areas.config.mjs";
import { conflicto, errorDeValidacion, errorHttp, noEncontrado } from "../../utils/api-error.mjs";
import { revokeUserSessions } from "./token.service.mjs";
import {
  docenteDePersona,
  sincronizarDesdeCuenta,
  tieneRolDocente,
  verificarDatosDocente,
  vincularDocente
} from "../teachers/docente-cuenta.service.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DNI_RE = /^\d{7,9}$/;
const TELEFONO_RE = /^[\d\s+()-]{6,30}$/;
const ESTADOS = ["activo", "inactivo"];
const AREA_DOCENCIA = "docencia";
const SITUACIONES_REVISTA = ["Titular", "Provisional", "Suplente"];
const MODULOS_DOCENTES = [2, 3, 4, 6];
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/* Dias de cursada; se guardan sin tilde (como el ENUM de la base) y se
   muestran con ella en la interfaz. */
const DIAS_CURSADA = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
const CAMPOS_ACADEMICOS = ["materia", "situacion_revista", "suplente_de", "modulos", "dia", "hora_desde", "hora_hasta"];
const PAGINA_DEFECTO = 1;
const POR_PAGINA_DEFECTO = 100;
const POR_PAGINA_MAXIMO = 200;

function texto(valor, maximo = 80) {
  const limpio = String(valor ?? "").trim();
  return limpio ? limpio.slice(0, maximo) : null;
}

function existente(id) {
  const usuario = userRepository.findById(id, { includeInactive: true });

  if (!usuario) {
    throw noEncontrado("El usuario solicitado");
  }

  return usuario;
}

function escuelaDel(actor, cuerpo) {
  return cuerpo?.schoolId ?? actor?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? null;
}

function rolesDelActor(actor) {
  return [...new Set((actor?.assignments ?? []).map((asignacion) => asignacion.role))];
}

/* Un rol administrativo solo puede delegarse si quien lo asigna ya lo tiene.
   Sin esta regla, cualquiera con permiso de gestion de identidad podria
   escalarse a administrador con una peticion manipulada.

   - admin delega todos los roles, incluido admin;
   - director delega todos los roles salvo admin;
   - cualquier otro rol solo delega los roles que ya tiene. */
function rolesAsignables(actor) {
  const roles = rolesDelActor(actor);
  const todos = Object.keys(ROL_CATALOGO);

  if (roles.includes(ROLES.ADMIN)) {
    return todos;
  }

  if (roles.includes(ROLES.DIRECTOR)) {
    return todos.filter((rol) => rol !== ROLES.ADMIN);
  }

  return roles.filter((rol) => rol !== ROLES.ADMIN);
}

function validarRoles(roles, errores, { requerido, actor = null }) {
  if (roles === undefined && !requerido) {
    return undefined;
  }

  if (!Array.isArray(roles) || (requerido && roles.length === 0)) {
    errores.push({ field: "roles", message: "Asigna al menos un rol." });
    return undefined;
  }

  const desconocidos = roles.filter((rol) => !ROL_CATALOGO[rol]);

  if (desconocidos.length) {
    errores.push({ field: "roles", message: `Roles inexistentes: ${desconocidos.join(", ")}.` });
    return undefined;
  }

  const permitidos = rolesAsignables(actor);
  const bloqueados = [...new Set(roles)].filter((rol) => !permitidos.includes(rol));

  if (bloqueados.length) {
    errores.push({
      field: "roles",
      message: `No podes asignar los roles ${bloqueados.join(", ")}: no los tenes asignados.`
    });
    return undefined;
  }

  return [...new Set(roles)];
}

/* Valida y normaliza los datos personales. En el alta los obligatorios son
   nombre, apellido, email y dni; en la edicion solo se valida lo que llega.
   El area siempre sale del catalogo institucional: no se escriben sectores a
   mano desde el cliente. */
function datosPersonales(cuerpo, errores, { alta }) {
  const salida = {};

  for (const campo of ["nombre", "apellido"]) {
    if (cuerpo[campo] !== undefined || alta) {
      salida[campo] = texto(cuerpo[campo]);
      if (!salida[campo]) errores.push({ field: campo, message: `El campo ${campo} es obligatorio.` });
    }
  }

  if (cuerpo.email !== undefined || alta) {
    const email = String(cuerpo.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      errores.push({ field: "email", message: "El correo no tiene un formato valido." });
    }
    salida.email = email;
  }

  if (cuerpo.dni !== undefined || alta) {
    /* Normalizado: sin puntos ni espacios (30.123.456 -> 30123456). Es el que
       se guarda y, en el alta, la clave provisoria. */
    const dni = String(cuerpo.dni ?? "").replace(/[.\s]/g, "");
    if (!DNI_RE.test(dni)) {
      errores.push({ field: "dni", message: "El DNI debe tener entre 7 y 9 numeros, sin puntos." });
    }
    salida.dni = dni;
  }

  if (cuerpo.telefono !== undefined) {
    const telefono = texto(cuerpo.telefono, 30);
    if (telefono && !TELEFONO_RE.test(telefono)) {
      errores.push({ field: "telefono", message: "El telefono solo admite numeros, espacios y los signos + ( ) -" });
    }
    salida.telefono = telefono;
  }

  if (cuerpo.area !== undefined) {
    const area = String(cuerpo.area ?? "").trim();

    if (!area) {
      errores.push({ field: "area", message: "Selecciona un area institucional." });
    } else if (!esAreaValida(area)) {
      errores.push({ field: "area", message: "El area no pertenece al catalogo institucional." });
    } else {
      salida.area = area;
    }
  } else if (alta) {
    /* Sin area explicita se asigna la que agrupa a la mayoria del personal. */
    salida.area = AREA_DEFECTO;
  }

  return salida;
}

/* Datos academicos y carga horaria del area de Docencia. Se guardan en el
   mismo perfil porque el alta crea un unico cargo por persona. */
function tieneCamposAcademicos(cuerpo) {
  return CAMPOS_ACADEMICOS.some((campo) => cuerpo[campo] !== undefined);
}

function academicosVacios() {
  return {
    materia: null,
    situacion_revista: null,
    suplente_de: null,
    modulos: null,
    dia: null,
    hora_desde: null,
    hora_hasta: null
  };
}

function normalizarDia(valor) {
  const limpio = String(valor ?? "").trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return DIAS_CURSADA.find((dia) => dia.toLowerCase() === limpio) ?? null;
}

function datosAcademicos(cuerpo, errores) {
  const materia = texto(cuerpo.materia, 120);
  const situacionRevista = String(cuerpo.situacion_revista ?? "").trim();
  const suplenteDe = texto(cuerpo.suplente_de, 120);
  const modulos = Number.parseInt(String(cuerpo.modulos ?? ""), 10);
  const dia = normalizarDia(cuerpo.dia);
  const horaDesde = String(cuerpo.hora_desde ?? "").trim();
  const horaHasta = String(cuerpo.hora_hasta ?? "").trim();

  if (!materia) {
    errores.push({ field: "materia", message: "La materia es obligatoria para el area de Docencia." });
  }

  if (!SITUACIONES_REVISTA.includes(situacionRevista)) {
    errores.push({
      field: "situacion_revista",
      message: "La situacion de revista debe ser Titular, Provisional o Suplente."
    });
  }

  if (situacionRevista === "Suplente" && !suplenteDe) {
    errores.push({ field: "suplente_de", message: "Indica a quien reemplaza el suplente." });
  }

  if (!MODULOS_DOCENTES.includes(modulos)) {
    errores.push({ field: "modulos", message: "Los modulos deben ser 2, 3, 4 o 6." });
  }

  if (!dia) {
    errores.push({ field: "dia", message: "Selecciona el dia de cursada (lunes a viernes)." });
  }

  if (!HORA_RE.test(horaDesde)) {
    errores.push({ field: "hora_desde", message: "Indica la hora de inicio en formato HH:MM." });
  }

  if (!HORA_RE.test(horaHasta)) {
    errores.push({ field: "hora_hasta", message: "Indica la hora de fin en formato HH:MM." });
  } else if (HORA_RE.test(horaDesde) && horaHasta <= horaDesde) {
    errores.push({ field: "hora_hasta", message: "La hora de fin debe ser posterior a la de inicio." });
  }

  return {
    materia,
    situacion_revista: situacionRevista || null,
    suplente_de: situacionRevista === "Suplente" ? suplenteDe : null,
    modulos: MODULOS_DOCENTES.includes(modulos) ? modulos : null,
    dia,
    hora_desde: horaDesde || null,
    hora_hasta: horaHasta || null
  };
}

function nombreVisible(usuario) {
  return [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") || usuario.email;
}

function entero(valor, porDefecto, maximo) {
  const numero = Number.parseInt(String(valor ?? ""), 10);
  if (!Number.isFinite(numero) || numero < 1) {
    return porDefecto;
  }
  return maximo ? Math.min(numero, maximo) : numero;
}

export const usersService = {
  /* Devuelve la lista paginada y filtrada del personal. El controller expone
     `data` como arreglo (contrato que ya usa el frontend) y la paginacion como
     dato hermano. */
  list(query = {}) {
    const q = String(query.q ?? "").trim().toLowerCase();
    const rol = query.rol || null;
    const estado = query.estado || null;
    const area = query.area || null;
    const pagina = entero(query.pagina, PAGINA_DEFECTO);
    const porPagina = entero(query.porPagina ?? query.limite, POR_PAGINA_DEFECTO, POR_PAGINA_MAXIMO);

    const filtrados = userRepository
      .list({ includeInactive: true })
      .map((usuario) => userRepository.publicView(usuario))
      .filter((usuario) => !rol || usuario.roles.includes(rol))
      .filter((usuario) => !estado || usuario.estado === estado)
      .filter((usuario) => !area || usuario.area === area)
      .filter(
        (usuario) =>
          !q ||
          [usuario.nombre, usuario.apellido, usuario.email, usuario.displayName, usuario.areaNombre, usuario.id]
            .filter(Boolean)
            .some((campo) => campo.toLowerCase().includes(q))
      );

    const total = filtrados.length;
    const desde = (pagina - 1) * porPagina;
    const items = filtrados.slice(desde, desde + porPagina);

    return {
      items,
      paginacion: {
        pagina,
        porPagina,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
        desde: total === 0 ? 0 : desde + 1,
        hasta: Math.min(desde + porPagina, total)
      }
    };
  },

  get(id) {
    return userRepository.publicView(existente(id));
  },

  async create(actor, cuerpo = {}) {
    const errores = [];
    const datos = datosPersonales(cuerpo, errores, { alta: true });
    const academicos = cuerpo.area === AREA_DOCENCIA ? datosAcademicos(cuerpo, errores) : {};
    const roles = validarRoles(cuerpo.roles, errores, { requerido: true, actor });

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    if (userRepository.findByEmail(datos.email, { includeInactive: true })) {
      throw conflicto("Ya existe un usuario con ese correo.", [{ field: "email", message: "Ya existe una cuenta registrada con ese correo." }]);
    }

    if (userRepository.findByDni(datos.dni)) {
      throw conflicto("Ya existe una persona registrada con ese DNI.", [{ field: "dni", message: "Ya existe una persona registrada con ese DNI." }]);
    }

    /* Clave provisoria: el DNI normalizado (solo digitos, ya validado). Se
       guarda unicamente su hash y la cuenta queda marcada para cambiarla en el
       primer ingreso; mientras tanto la API solo permite cambiarla. */
    const passwordHash = await bcrypt.hash(datos.dni, 10);
    const schoolId = escuelaDel(actor, cuerpo);
    const esDocente = roles.includes(ROLES.DOCENTE);

    /* Con rol Docente se reusa el registro docente de la persona si ya existia
       (sin cuenta); si pertenece a otra cuenta es un conflicto. Se valida antes
       de crear nada. */
    if (esDocente) {
      docenteDePersona({ dni: datos.dni, email: datos.email, nombre: datos.nombre, apellido: datos.apellido, escuelaId: schoolId });
    }

    const { usuario, docente } = transaction(() => {
      const creado = userRepository.create({
        ...datos,
        ...academicos,
        displayName: nombreVisible(datos),
        passwordHash,
        debeCambiarClave: true,
        assignments: roles.map((role) => (schoolId ? { role, schoolId } : { role }))
      });

      return {
        usuario: creado,
        docente: esDocente && schoolId ? vincularDocente(creado, { escuelaId: schoolId, actorId: actor?.id }) : null
      };
    });

    /* La clave no viaja en la respuesta: el director ya conoce el DNI. */
    return { ...userRepository.publicView(usuario), docenteId: docente?.id ?? null, claveProvisoria: "dni" };
  },

  update(actor, id, cuerpo = {}) {
    const usuario = existente(id);
    const errores = [];
    const datos = datosPersonales(cuerpo, errores, { alta: false });
    const areaResultante = datos.area ?? usuario.area;
    const estado = cuerpo.estado;

    let academicos = {};

    if (areaResultante === AREA_DOCENCIA && (cuerpo.area === AREA_DOCENCIA || tieneCamposAcademicos(cuerpo))) {
      academicos = datosAcademicos(cuerpo, errores);
    } else if (datos.area && datos.area !== AREA_DOCENCIA) {
      academicos = academicosVacios();
    }

    if (estado !== undefined && !ESTADOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo o inactivo." });
    }

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    if (datos.email && datos.email !== usuario.email) {
      const otro = userRepository.findByEmail(datos.email, { includeInactive: true });
      if (otro && otro.id !== id) {
        throw conflicto("Ya existe un usuario con ese correo.");
      }
    }

    if (datos.dni && datos.dni !== usuario.dni) {
      const otro = userRepository.findByDni(datos.dni);
      if (otro && otro.id !== id) {
        throw conflicto("Ya existe una persona registrada con ese DNI.", [{ field: "dni", message: "Ya existe una persona registrada con ese DNI." }]);
      }
    }

    verificarDatosDocente(id, { dni: datos.dni, email: datos.email });

    if (estado === "inactivo" && actor?.id === id) {
      throw errorHttp(403, "FORBIDDEN", "No puede desactivar su propia cuenta.");
    }

    let actualizado = transaction(() => {
      let registro = userRepository.update(id, { ...datos, ...academicos });
      registro = userRepository.update(id, { displayName: nombreVisible(registro) });

      if (estado === "inactivo" && usuario.isActive) {
        registro = userRepository.deactivate(id);
      } else if (estado === "activo" && !usuario.isActive) {
        registro = userRepository.activate(id);
      }

      sincronizarDesdeCuenta(registro, actor?.id);
      return registro;
    });

    if (estado === "inactivo" && usuario.isActive) {
      revokeUserSessions(id);
    }

    return userRepository.publicView(actualizado);
  },

  replaceRoles(actor, id, cuerpo = {}) {
    const usuario = existente(id);
    const errores = [];
    const roles = validarRoles(cuerpo.roles, errores, { requerido: true, actor });

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const schoolId = usuario.assignments.find((asignacion) => asignacion.schoolId)?.schoolId ?? escuelaDel(actor, cuerpo);
    /* Un rol que se mantiene conserva sus asignaciones (las divisiones del
       preceptor o del docente); un rol nuevo entra sin alcance de curso. */
    const assignments = roles.flatMap((role) => {
      const previas = usuario.assignments.filter((asignacion) => asignacion.role === role);
      return previas.length ? previas : [schoolId ? { role, schoolId } : { role }];
    });
    const actualizado = transaction(() => {
      const registro = userRepository.update(id, { assignments });

      /* Sumar el rol Docente da de alta (o vincula) su registro docente; quitarlo
         lo deja inactivo. */
      if (tieneRolDocente(registro) && schoolId) {
        vincularDocente(registro, { escuelaId: schoolId, actorId: actor?.id });
      } else {
        sincronizarDesdeCuenta(registro, actor?.id);
      }

      return registro;
    });

    /* Los roles viajan en el access token: se cierran las sesiones abiertas para
       que el cambio aplique en el proximo inicio de sesion. */
    revokeUserSessions(id);
    return userRepository.publicView(actualizado);
  }
};
