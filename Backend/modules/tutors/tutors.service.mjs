import { errorDeValidacion, noEncontrado, conflicto } from "../../utils/api-error.mjs";
import { CAMPOS_TUTOR, DNI_RE, EMAIL_RE, ESTADOS_VALIDOS, ORDENES_TUTORES, PARENTESCOS_VALIDOS, TELEFONO_RE, normalizarParentesco } from "./validacion.mjs";
import studentsRefRepository from "./students-refs.repository.mjs";
import tutorsRepository from "./tutors.repository.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;

const collator = new Intl.Collator("es", { sensitivity: "base" });

function escuelaDel(user, data) {
  return data?.escuelaId ?? user.assignments?.find((a) => a.schoolId)?.schoolId ?? null;
}

function actorDel(user) {
  return user?.id ?? null;
}

function validarDatosContacto(field, value, errores) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (field === "email" && !EMAIL_RE.test(value)) {
    errores.push({ field, message: "El email no tiene un formato valido." });
  }

  if (field === "telefono" && !TELEFONO_RE.test(value)) {
    errores.push({ field, message: "El telefono no tiene un formato valido." });
  }
}

function validarTutor(data) {
  const errores = [];

  if (!data?.apellido || typeof data.apellido !== "string") {
    errores.push({ field: "apellido", message: "El apellido es obligatorio." });
  }

  if (!data?.nombre || typeof data.nombre !== "string") {
    errores.push({ field: "nombre", message: "El nombre es obligatorio." });
  }

  if (!data?.dni) {
    errores.push({ field: "dni", message: "El DNI es obligatorio." });
  } else if (!DNI_RE.test(String(data.dni))) {
    errores.push({ field: "dni", message: "El DNI debe tener entre 7 y 9 digitos." });
  }

  validarDatosContacto("email", data?.email, errores);
  validarDatosContacto("telefono", data?.telefono, errores);

  return errores;
}

function parseBool(value, field, errores) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  errores.push({ field, message: `El campo ${field} debe ser un booleano.` });
  return undefined;
}

function paginar(lista, query, filtrosActivos) {
  const porPagina = query.porPagina === undefined ? POR_PAGINA_DEFECTO : Number(query.porPagina);
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  const total = lista.length;
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / porPagina);

  const desde = (pagina - 1) * porPagina;
  const items = lista.slice(desde, desde + porPagina);

  return {
    data: items,
    filtros: filtrosActivos,
    paginacion: {
      total,
      pagina,
      porPagina,
      totalPaginas,
      tieneAnterior: pagina > 1,
      tieneSiguiente: pagina < totalPaginas
    }
  };
}

function ordenarTutores(tutores, orden) {
  const config = ORDENES_TUTORES[orden];

  if (!config) {
    return tutores;
  }

  return [...tutores].sort((a, b) => {
    const izquierdo = a[config.campo];
    const derecho = b[config.campo];

    if (config.campo === "dni") {
      const diferencia = Number(izquierdo) - Number(derecho);
      return diferencia * config.sentido;
    }

    return collator.compare(izquierdo, derecho) * config.sentido;
  });
}

const tutorsService = {
  create(data, user) {
    const errores = validarTutor(data);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = escuelaDel(user, data);

    if (!escuelaId) {
      throw errorDeValidacion([{ field: "escuelaId", message: "La escuela es obligatoria." }]);
    }

    const existente = tutorsRepository.findTutorByDni(String(data.dni), escuelaId);

    if (existente) {
      throw conflicto("Ya existe un tutor con ese DNI en la escuela.");
    }

    const soloPermitidos = {};
    for (const campo of CAMPOS_TUTOR) {
      if (data[campo] !== undefined) {
        soloPermitidos[campo] = data[campo];
      }
    }

    const tutor = tutorsRepository.createTutor({ ...soloPermitidos, escuelaId, createdBy: actorDel(user) });
    tutorsRepository.registrarAuditoria({
      accion: "tutor:create",
      actorId: actorDel(user),
      entidad: "tutor",
      entidadId: tutor.id,
      antes: null,
      despues: tutor
    });

    return { statusCode: 201, body: { data: tutor } };
  },

  getById(id) {
    if (!id) {
      throw noEncontrado("El tutor");
    }

    const tutor = tutorsRepository.findTutorById(id);

    if (!tutor) {
      throw noEncontrado("El tutor");
    }

    const { isActive, createdBy, ...publico } = tutor;
    return { statusCode: 200, body: { data: { ...publico, estado: isActive ? "activo" : "inactivo" } } };
  },

  list(query, user) {
    const errores = [];

    const estado = query.estado ?? "activo";

    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "Estado invalido. Use activo, inactivo o todos." });
    }

    const orden = query.orden ?? "apellido";

    if (!ORDENES_TUTORES[orden]) {
      errores.push({ field: "orden", message: "Orden invalido." });
    }

    const porPagina = query.porPagina === undefined ? POR_PAGINA_DEFECTO : Number(query.porPagina);

    if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > POR_PAGINA_MAXIMO) {
      errores.push({ field: "porPagina", message: "porPagina debe ser un entero entre 1 y 100." });
    }

    const pagina = query.pagina === undefined ? 1 : Number(query.pagina);

    if (!Number.isInteger(pagina) || pagina < 1) {
      errores.push({ field: "pagina", message: "pagina debe ser un entero mayor a 0." });
    }

    if (query.dni && !DNI_RE.test(String(query.dni))) {
      errores.push({ field: "dni", message: "El DNI debe tener entre 7 y 9 digitos." });
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = user.assignments?.find((a) => a.schoolId)?.schoolId ?? query.schoolId;
    const tutores = ordenarTutores(
      tutorsRepository.listTutors({
        escuelaId,
        apellido: query.apellido,
        nombre: query.nombre,
        dni: query.dni,
        estado
      }),
      orden
    );

    const filtrosActivos = {
      apellido: query.apellido ?? null,
      nombre: query.nombre ?? null,
      dni: query.dni ?? null,
      estado,
      orden
    };

    return { statusCode: 200, body: paginar(tutores, query, filtrosActivos) };
  },

  update(id, data, user) {
    const actual = tutorsRepository.findTutorById(id);

    if (!actual) {
      throw noEncontrado("El tutor");
    }

    const errores = [];

    if (data?.apellido !== undefined && (!data.apellido || typeof data.apellido !== "string")) {
      errores.push({ field: "apellido", message: "El apellido no es valido." });
    }

    if (data?.nombre !== undefined && (!data.nombre || typeof data.nombre !== "string")) {
      errores.push({ field: "nombre", message: "El nombre no es valido." });
    }

    if (data?.dni !== undefined) {
      if (!DNI_RE.test(String(data.dni))) {
        errores.push({ field: "dni", message: "El DNI debe tener entre 7 y 9 digitos." });
      } else {
        const duplicado = tutorsRepository.findTutorByDni(String(data.dni), actual.escuelaId);

        if (duplicado && duplicado.id !== id) {
          throw conflicto("Ya existe un tutor con ese DNI en la escuela.");
        }
      }
    }

    validarDatosContacto("email", data?.email, errores);
    validarDatosContacto("telefono", data?.telefono, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cambios = {};
    for (const campo of CAMPOS_TUTOR) {
      if (campo === "escuelaId") {
        continue;
      }

      if (data[campo] !== undefined) {
        cambios[campo] = data[campo];
      }
    }

    const actualizado = tutorsRepository.updateTutor(id, cambios);
    tutorsRepository.registrarAuditoria({
      accion: "tutor:update",
      actorId: actorDel(user),
      entidad: "tutor",
      entidadId: id,
      antes: actual,
      despues: actualizado
    });

    return { statusCode: 200, body: { data: actualizado } };
  },

  deactivate(id, user) {
    const actual = tutorsRepository.findTutorById(id);

    if (!actual) {
      throw noEncontrado("El tutor");
    }

    const actualizado = tutorsRepository.deactivateTutor(id);
    tutorsRepository.registrarAuditoria({
      accion: "tutor:deactivate",
      actorId: actorDel(user),
      entidad: "tutor",
      entidadId: id,
      antes: actual,
      despues: actualizado
    });

    return { statusCode: 200, body: { data: actualizado } };
  },

  associate(studentId, data, user) {
    const estudiante = studentsRefRepository.findById(studentId);

    if (!estudiante) {
      throw noEncontrado("El alumno");
    }

    const tutor = tutorsRepository.findTutorById(data?.tutorId);

    if (!tutor) {
      throw noEncontrado("El tutor");
    }

    const errores = [];
    const parentesco = normalizarParentesco(data?.parentesco);

    if (!parentesco) {
      errores.push({
        field: "parentesco",
        message: `El parentesco debe ser uno de: ${PARENTESCOS_VALIDOS.join(", ")}.`
      });
    }

    const responsablePrincipal = parseBool(data?.responsablePrincipal, "responsablePrincipal", errores);
    const autorizadoRetiro = parseBool(data?.autorizadoRetiro, "autorizadoRetiro", errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const existente = tutorsRepository.findRelationByPair(studentId, data.tutorId);

    if (existente) {
      throw conflicto("Este tutor ya esta asociado a ese alumno.");
    }

    const relacion = tutorsRepository.createRelation({
      studentId,
      tutorId: data.tutorId,
      parentesco,
      responsablePrincipal,
      autorizadoRetiro,
      createdBy: actorDel(user)
    });
    tutorsRepository.registrarAuditoria({
      accion: "relacion:create",
      actorId: actorDel(user),
      entidad: "relacion",
      entidadId: relacion.id,
      antes: null,
      despues: relacion
    });

    return { statusCode: 201, body: { data: relacion } };
  },

  listStudentTutors(studentId, query) {
    const estudiante = studentsRefRepository.findById(studentId);

    if (!estudiante) {
      throw noEncontrado("El alumno");
    }

    const estado = query?.estado ?? "activo";

    if (!ESTADOS_VALIDOS.includes(estado)) {
      throw errorDeValidacion([{ field: "estado", message: "Estado invalido. Use activo, inactivo o todos." }]);
    }

    const relaciones = tutorsRepository
      .listRelations({ studentId, estado })
      .map((relacion) => {
        const tutor = tutorsRepository.findTutorById(relacion.tutorId);
        return {
          ...relacion,
          tutor: tutor
            ? {
                id: tutor.id,
                apellido: tutor.apellido,
                nombre: tutor.nombre,
                dni: tutor.dni,
                email: tutor.email,
                telefono: tutor.telefono,
                estado: tutor.isActive ? "activo" : "inactivo"
              }
            : null
        };
      })
      .filter((relacion) => relacion.tutor);

    return { statusCode: 200, body: { data: relaciones } };
  },

  listTutorStudents(tutorId, query) {
    const tutor = tutorsRepository.findTutorById(tutorId);

    if (!tutor) {
      throw noEncontrado("El tutor");
    }

    const estado = query?.estado ?? "activo";

    if (!ESTADOS_VALIDOS.includes(estado)) {
      throw errorDeValidacion([{ field: "estado", message: "Estado invalido. Use activo, inactivo o todos." }]);
    }

    const alumnos = tutorsRepository
      .listRelations({ tutorId, estado })
      .map((relacion) => {
        const estudiante = studentsRefRepository.findById(relacion.studentId);
        return {
          ...relacion,
          alumno: estudiante
            ? {
                id: estudiante.id,
                apellido: estudiante.apellido,
                nombre: estudiante.nombre,
                dni: estudiante.dni
              }
            : null
        };
      })
      .filter((relacion) => relacion.alumno);

    return { statusCode: 200, body: { data: alumnos } };
  },

  updateRelation(relationId, data, user) {
    const actual = tutorsRepository.findRelationById(relationId);

    if (!actual) {
      throw noEncontrado("La relacion");
    }

    const errores = [];
    let parentesco = undefined;

    if (data?.parentesco !== undefined) {
      parentesco = normalizarParentesco(data.parentesco);

      if (!parentesco) {
        errores.push({
          field: "parentesco",
          message: `El parentesco debe ser uno de: ${PARENTESCOS_VALIDOS.join(", ")}.`
        });
      }
    }

    const responsablePrincipal = parseBool(data?.responsablePrincipal, "responsablePrincipal", errores);
    const autorizadoRetiro = parseBool(data?.autorizadoRetiro, "autorizadoRetiro", errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const cambios = {};

    if (parentesco !== undefined) {
      cambios.parentesco = parentesco;
    }

    if (responsablePrincipal !== undefined) {
      cambios.responsablePrincipal = responsablePrincipal;
    }

    if (autorizadoRetiro !== undefined) {
      cambios.autorizadoRetiro = autorizadoRetiro;
    }

    const actualizado = tutorsRepository.updateRelation(relationId, cambios);
    tutorsRepository.registrarAuditoria({
      accion: "relacion:update",
      actorId: actorDel(user),
      entidad: "relacion",
      entidadId: relationId,
      antes: actual,
      despues: actualizado
    });

    return { statusCode: 200, body: { data: actualizado } };
  },

  unlink(relationId, user) {
    const actual = tutorsRepository.findRelationById(relationId);

    if (!actual) {
      throw noEncontrado("La relacion");
    }

    const actualizado = tutorsRepository.unlinkRelation(relationId);
    tutorsRepository.registrarAuditoria({
      accion: "relacion:unlink",
      actorId: actorDel(user),
      entidad: "relacion",
      entidadId: relationId,
      antes: actual,
      despues: actualizado
    });

    return { statusCode: 200, body: { data: actualizado } };
  }
};

export default tutorsService;