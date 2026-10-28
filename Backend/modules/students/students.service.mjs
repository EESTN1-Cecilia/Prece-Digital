import studentRepository from "./students.repository.mjs";
import workshopsRepository from "../workshops/workshops.repository.mjs";
import { conflicto, errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";
import {
  CONDICIONES_VALIDAS,
  CURSOS_VALIDOS,
  DNI_RE,
  EMAIL_RE,
  ESTADOS_VALIDOS,
  ORDENES_VALIDOS,
  TELEFONO_RE,
  TURNOS_VALIDOS,
  DIVISIONES_CATALOGO,
  buscarDivision
} from "./catalogo.mjs";

const POR_PAGINA_MAXIMO = 100;
const POR_PAGINA_DEFECTO = 20;
const EDAD_MAXIMA= 99;
const ESCUELA_DEFECTO = "esc-1";

const CAMPOS_EDITABLES = [
  "nombre",
  "apellido",
  "dni",
  "fechaNacimiento",
  "genero",
  "nacionalidad",
  "provincia",
  "localidad",
  "codigoPostal",
  "direccion",
  "email",
  "telefono",
  "contacto",
  "curso",
  "division",
  "condicion",
  "tallerId",
  "grupoTaller"
];

const CAMPOS_TEXTO = [
  "genero",
  "nacionalidad",
  "provincia",
  "localidad",
  "codigoPostal",
  "direccion"
];

function texto(valor, maximo = 120) {
  if (valor == null) return null;
  const limpio = String(valor).trim();
  return limpio === "" ? null : limpio.slice(0, maximo);
}

function esRequerido(valor) {
  return valor != null && String(valor).trim() !== "";
}

function parEntero(valor, campo, errores, { maximo } = {}) {
  const numero = Number.parseInt(valor, 10);
  const invalido = !Number.isInteger(numero) || numero < 1 || (maximo !== undefined && numero > maximo);
  if (invalido) {
    errores.push({ field: campo, message: `El parametro ${campo} no es valido.` });
    return null;
  }
  return numero;
}

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00`);
  return !Number.isNaN(fecha.getTime());
}

/* Edad en anios cumplidos. Nunca se guarda: se calcula desde la fecha de nacimiento. */
function edadDe(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return null;

  const hoy = new Date();
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const nacUtc = Date.UTC(nacimiento.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  return Math.floor((hoyUtc - nacUtc) / (365.25 * 24 * 60 * 60 * 1000));
}

function vista(registro) {
  return {
    id: registro.id,
    nombre: registro.nombre,
    apellido: registro.apellido,
    nombreCompleto: `${registro.apellido}, ${registro.nombre}`,
    dni: registro.dni,
    edad: edadDe(registro.fechaNacimiento),
    fechaNacimiento: registro.fechaNacimiento,
    genero: registro.genero,
    nacionalidad: registro.nacionalidad,
    provincia: registro.provincia,
    localidad: registro.localidad,
    codigoPostal: registro.codigoPostal,
    direccion: registro.direccion,
    email: registro.email,
    telefono: registro.telefono,
    contacto: registro.contacto,
    curso: registro.curso,
    division: registro.division,
    turno: registro.turno,
    orientacion: registro.orientacion,
    condicion: registro.condicion,
    tallerId: registro.tallerId ?? null,
    grupoTaller: registro.grupoTaller ?? null,
    estado: registro.isActive ? "activo" : "inactivo",
    isActive: Boolean(registro.isActive),
    fechaAlta: registro.fechaAlta,
    fechaBaja: registro.fechaBaja,
    motivoBaja: registro.motivoBaja ?? null,
    motivoAlta: registro.motivoAlta ?? null,
    creadoEn: registro.creadoEn,
    actualizadoEn: registro.actualizadoEn
  };
}

/* Sanitiza las entradas al conjunto permitido y valida formatos por campo. */
function sanitizarEntrada(datos, { creacion }, errores) {
  const salida = {};

  for (const campo of CAMPOS_EDITABLES) {
    if (datos[campo] !== undefined) {
      salida[campo] = datos[campo];
    }
  }

  if (creacion) {
    if (!esRequerido(salida.nombre)) errores.push({ field: "nombre", message: "El campo nombre es obligatorio." });
    if (!esRequerido(salida.apellido)) errores.push({ field: "apellido", message: "El campo apellido es obligatorio." });
    if (!esRequerido(salida.dni)) errores.push({ field: "dni", message: "El campo dni es obligatorio." });
  }

  for (const campo of CAMPOS_TEXTO) {
    if (salida[campo] !== undefined) {
      salida[campo] = texto(salida[campo]);
    }
  }

  if (salida.nombre !== undefined) salida.nombre = texto(salida.nombre);
  if (salida.apellido !== undefined) salida.apellido = texto(salida.apellido);

  if (salida.dni !== undefined) {
    const dni = String(salida.dni).trim();
    if (!esRequerido(salida.dni) && !creacion) {
      salida.dni = null;
    } else if (!DNI_RE.test(dni)) {
      errores.push({ field: "dni", message: "El DNI debe contener entre 7 y 9 digitos." });
    } else {
      salida.dni = dni;
    }
  }

  if (salida.email !== undefined) {
    const email = String(salida.email ?? "").trim().toLowerCase();
    if (email === "") {
      salida.email = null;
    } else if (!EMAIL_RE.test(email)) {
      errores.push({ field: "email", message: "El email no es valido." });
    } else {
      salida.email = email;
    }
  }

  if (salida.telefono !== undefined) {
    const telefono = String(salida.telefono ?? "").trim();
    if (telefono === "") {
      salida.telefono = null;
    } else if (!TELEFONO_RE.test(telefono)) {
      errores.push({ field: "telefono", message: "El telefono no es valido." });
    } else {
      salida.telefono = telefono;
    }
  }

  if (salida.fechaNacimiento !== undefined) {
    const nacimiento = String(salida.fechaNacimiento ?? "").trim();
    if (nacimiento === "") {
      salida.fechaNacimiento = null;
    } else if (!fechaValida(nacimiento) || new Date(`${nacimiento}T00:00:00`).getTime() > Date.now()) {
      errores.push({ field: "fechaNacimiento", message: "La fecha de nacimiento no es valida." });
    } else {
      salida.fechaNacimiento = nacimiento;
    }
  }

  if (salida.condicion !== undefined) {
    if (salida.condicion === null || String(salida.condicion).trim() === "") {
      salida.condicion = null;
    } else if (!CONDICIONES_VALIDAS.includes(salida.condicion)) {
      errores.push({ field: "condicion", message: "La condicion debe ser regular o irregular." });
    }
  }

  if (salida.tallerId !== undefined) {
    const tallerId = texto(salida.tallerId, 60);
    if (tallerId && !workshopsRepository.findById(tallerId)) {
      errores.push({ field: "tallerId", message: "El taller indicado no existe." });
    }
    salida.tallerId = tallerId;
  }

  if (salida.grupoTaller !== undefined) {
    salida.grupoTaller = texto(salida.grupoTaller, 20);
  }

  if (salida.contacto !== undefined && salida.contacto != null) {
    if (typeof salida.contacto !== "object") {
      errores.push({ field: "contacto", message: "El contacto debe ser un objeto con los datos del responsable." });
    } else {
      const contacto = {};

      for (const campo of ["nombre", "apellido", "parentesco"]) {
        if (salida.contacto[campo] !== undefined) contacto[campo] = texto(salida.contacto[campo]);
      }
      if (salida.contacto.telefono !== undefined) contacto.telefono = texto(salida.contacto.telefono, 30);
      if (salida.contacto.email !== undefined) {
        const email = String(salida.contacto.email).trim().toLowerCase();
        if (email !== "" && !EMAIL_RE.test(email)) {
          errores.push({ field: "contacto.email", message: "El email del contacto no es valido." });
        } else {
          contacto.email = email === "" ? null : email;
        }
      }

      salida.contacto = Object.keys(contacto).length > 0 ? contacto : null;
    }
  }

  return salida;
}

/* Valida curso y division juntos, y que existan en el catalogo de la escuela.
   Devuelve null cuando no aplican y errores deja el arreglo cargado. */
function resolverCursoDivision(entrada, errores) {
  const cursoVacio = entrada.curso === undefined || entrada.curso === null || String(entrada.curso).trim() === "";
  const divisionVacia = entrada.division === undefined || entrada.division === null || String(entrada.division).trim() === "";

  if (cursoVacio && divisionVacia) {
    return null;
  }

  if (cursoVacio || divisionVacia) {
    errores.push({ field: "division", message: "Curso y division deben indicarse juntos." });
    return null;
  }

  const curso = Number(entrada.curso);
  if (!Number.isInteger(curso) || !CURSOS_VALIDOS.includes(curso)) {
    errores.push({ field: "curso", message: "El curso debe ser un numero entre 1 y 7." });
    return null;
  }

  const division = String(entrada.division).trim();
  if (!/^\d{1,5}$/.test(division)) {
    errores.push({ field: "division", message: "La division es un numero (por ejemplo 1 o 3)." });
    return null;
  }

  const informacion = buscarDivision(curso, division);
  if (!informacion) {
    errores.push({ field: "division", message: "El curso y la division indicados no existen para esta escuela." });
    return null;
  }

  return { curso, division, turno: informacion.turno, orientacion: informacion.orientacion };
}

function paginacion(total, pagina, porPagina) {
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / porPagina);

  return {
    total,
    pagina,
    porPagina,
    totalPaginas,
    tieneAnterior: pagina > 1,
    tieneSiguiente: pagina < totalPaginas
  };
}

const studentService = {
  create(datos, user) {
    const errores = [];
    const entrada = sanitizarEntrada(datos, { creacion: true }, errores);
    const cursoDivision = resolverCursoDivision(entrada, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = String(user.assignments?.[0]?.schoolId ?? entrada.schoolId ?? ESCUELA_DEFECTO);

    if (studentRepository.findByDni(entrada.dni)) {
      throw conflicto("Ya existe un alumno con ese DNI.");
    }

    const registro = studentRepository.create({
      escuelaId,
      ...entrada,
      ...cursoDivision
    });

    studentRepository.registrarAuditoria({
      accion: "create",
      usuarioId: user.id,
      registroId: registro.id,
      valorNuevo: vista(registro)
    });

    return { statusCode: 201, body: { data: vista(registro) } };
  },

  createBulk(lista, user) {
    const elementos = Array.isArray(lista) ? lista : (lista?.alumnos || lista?.estudiantes || []);
    if (!Array.isArray(elementos) || elementos.length === 0) {
      throw errorDeValidacion([{ field: "alumnos", message: "La lista de alumnos no puede estar vacía." }]);
    }

    const escuelaId = String(user.assignments?.[0]?.schoolId ?? ESCUELA_DEFECTO);
    let importados = 0;
    let actualizados = 0;
    const creados = [];

    for (let i = 0; i < elementos.length; i++) {
      const item = elementos[i];
      let nombreRaw = String(item.nombre || item.nombreCompleto || "").trim();
      if (!nombreRaw) continue;

      let apellido = String(item.apellido || "").trim();
      let nombre = "";

      if (apellido && item.nombre) {
        nombre = String(item.nombre).trim();
      } else if (nombreRaw.includes(",")) {
        const partes = nombreRaw.split(",");
        apellido = partes[0].trim();
        nombre = partes.slice(1).join(" ").trim();
      } else {
        const partes = nombreRaw.split(/\s+/);
        if (partes.length === 1) {
          apellido = partes[0];
          nombre = partes[0];
        } else if (partes.length === 2) {
          apellido = partes[0];
          nombre = partes[1];
        } else {
          apellido = partes.slice(0, 2).join(" ");
          nombre = partes.slice(2).join(" ");
        }
      }

      // Curso y división
      let curso = null;
      let division = null;
      if (item.curso !== undefined && item.curso !== null) {
        const strCurso = String(item.curso);
        const matchC = strCurso.match(/(\d+)/);
        if (matchC) curso = Number(matchC[1]);
        if (item.division) {
          const matchD = String(item.division).match(/(\d+)/);
          if (matchD) division = String(matchD[1]);
        } else if (strCurso.includes("°")) {
          const partes = strCurso.split("°");
          if (partes.length >= 2) {
            const m = partes[1].match(/(\d+)/);
            if (m) division = String(m[1]);
          }
        }
      }
      curso = curso || 1;
      division = division || "1";

      const cursoDivision = resolverCursoDivision({ curso, division }, []);
      const turno = cursoDivision?.turno ?? (item.turno?.toLowerCase() || "mañana");
      const orientacion = cursoDivision?.orientacion ?? (curso <= 3 ? "Ciclo Básico" : "Técnico en Informática");

      // DNI
      let dni = item.dni ? soloDigitos(item.dni) : "";
      if (!dni || dni.length < 7 || dni.length > 9) {
        let hash = 0;
        const str = `${apellido}_${nombre}_${curso}_${division}_${i}`;
        for (let c = 0; c < str.length; c++) {
          hash = (hash << 5) - hash + str.charCodeAt(c);
          hash |= 0;
        }
        const numProv = 80000000 + Math.abs(hash % 9000000);
        dni = String(numProv).padStart(8, "0");
        while (studentRepository.findByDni(dni)) {
          dni = String(Number(dni) + 1);
        }
      }

      const existente = studentRepository.findByDni(dni);
      if (existente) {
        studentRepository.update(existente.id, {
          nombre,
          apellido,
          curso,
          division,
          turno,
          orientacion,
          genero: item.genero || existente.genero || null,
          condicion: item.proviene?.toLowerCase() === "irregular" ? "irregular" : "regular",
          isActive: true
        });
        actualizados++;
        creados.push(existente);
      } else {
        const nuevo = studentRepository.create({
          escuelaId,
          nombre,
          apellido,
          dni,
          genero: item.genero || null,
          curso,
          division,
          turno,
          orientacion,
          condicion: item.proviene?.toLowerCase() === "irregular" ? "irregular" : "regular",
          isActive: true
        });
        importados++;
        creados.push(nuevo);
      }
    }

    studentRepository.registrarAuditoria({
      accion: "bulk_import",
      usuarioId: user.id,
      registroId: "bulk",
      valorNuevo: { total: elementos.length, importados, actualizados }
    });

    return {
      statusCode: 200,
      body: {
        data: {
          total: elementos.length,
          importados,
          actualizados,
          estudiantes: creados.map(vista)
        }
      }
    };
  },

  getById(id) {
    const registro = studentRepository.findById(id);
    if (!registro) {
      throw noEncontrado("El alumno solicitado");
    }
    return { statusCode: 200, body: { data: vista(registro) } };
  },

  list(query, user) {
    const errores = [];

    const pagina = query.pagina ? parEntero(query.pagina, "pagina", errores) ?? 1 : 1;
    const porPagina = query.porPagina
      ? parEntero(query.porPagina, "porPagina", errores, { maximo: POR_PAGINA_MAXIMO }) ?? POR_PAGINA_DEFECTO
      : POR_PAGINA_DEFECTO;

    const orden = query.orden ?? "apellido";
    if (!ORDENES_VALIDOS[orden]) {
      errores.push({ field: "orden", message: "El orden solicitado no esta permitido." });
    }

    const estado = query.estado ?? "activo";
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser activo, inactivo o todos." });
    }

    let condicion = query.condicion ?? null;
    if (condicion && !CONDICIONES_VALIDAS.includes(condicion)) {
      errores.push({ field: "condicion", message: "La condicion debe ser regular o irregular." });
    }

    let curso = null;
    if (query.curso !== undefined && query.curso !== "") {
      curso = Number(query.curso);
      if (!Number.isInteger(curso) || !CURSOS_VALIDOS.includes(curso)) {
        errores.push({ field: "curso", message: "El curso debe ser un numero entre 1 y 7." });
      }
    }

    let division = null;
    if (query.division !== undefined && query.division !== "") {
      division = String(query.division).trim();
      if (!/^\d{1,5}$/.test(division)) {
        errores.push({ field: "division", message: "La division es un numero (por ejemplo 1 o 3)." });
      }
    }

    const dni = query.dni ? String(query.dni).trim() : null;
    if (dni && !DNI_RE.test(dni)) {
      errores.push({ field: "dni", message: "El DNI debe contener entre 7 y 9 digitos." });
    }

    const q = query.q ? String(query.q).trim().toLowerCase().replace(/\./g, "") : null;

    let turno = null;
    if (query.turno !== undefined && query.turno !== "") {
      turno = String(query.turno).trim().toLowerCase();
      if (!TURNOS_VALIDOS.includes(turno)) {
        errores.push({ field: "turno", message: "El turno debe ser mañana o tarde." });
      }
    }

    const apellido = query.apellido ? String(query.apellido).trim().toLowerCase() : null;
    const nombre = query.nombre ? String(query.nombre).trim().toLowerCase() : null;

    let edad = null;
    if (query.edad !== undefined && query.edad !== "") {
      edad = Number.parseInt(query.edad, 10);
      if (!Number.isInteger(edad) || edad < 0 || edad > EDAD_MAXIMA) {
        errores.push({ field: "edad", message: "La edad debe ser un numero entre 0 y 99." });
      }
    }

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const escuelaId = String(user.assignments?.[0]?.schoolId ?? ESCUELA_DEFECTO);

    let registros = studentRepository.search({
      escuelaId,
      criterios: { estado, dni, apellido, nombre, curso, division, condicion, turno, q },
      orden
    });

    if (edad !== null) {
      registros = registros.filter((registro) => edadDe(registro.fechaNacimiento) === edad);
    }

    const total = registros.length;
    const offset = (pagina - 1) * porPagina;
    const datos = registros.slice(offset, offset + porPagina).map(vista);

    return {
      statusCode: 200,
      body: {
        data: datos,
        filtros: { q, dni, apellido, nombre, curso, division, turno, condicion, estado, edad, orden },
        paginacion: paginacion(total, pagina, porPagina)
      }
    };
  },

  update(id, datos, user) {
    const errores = [];
    const entrada = sanitizarEntrada(datos, { creacion: false }, errores);
    const cursoDivision = resolverCursoDivision(entrada, errores);

    if (errores.length > 0) {
      throw errorDeValidacion(errores);
    }

    const antes = studentRepository.findById(id);
    if (!antes) {
      throw noEncontrado("El alumno solicitado");
    }

    if (entrada.dni && entrada.dni !== antes.dni) {
      const duplicado = studentRepository.findByDni(entrada.dni);
      if (duplicado && duplicado.id !== id) {
        throw conflicto("Ya existe un alumno con ese DNI.");
      }
    }

    const cambios = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (entrada[campo] !== undefined) {
        cambios[campo] = entrada[campo];
      }
    }
    if (cursoDivision) {
      cambios.curso = cursoDivision.curso;
      cambios.division = cursoDivision.division;
      cambios.turno = cursoDivision.turno;
      cambios.orientacion = cursoDivision.orientacion;
    }



    const registro = studentRepository.update(id, cambios);

    studentRepository.registrarAuditoria({
      accion: "update",
      usuarioId: user.id,
      registroId: id,
      valorAnterior: vista(antes),
      valorNuevo: vista(registro)
    });

    return { statusCode: 200, body: { data: vista(registro) } };
  },

  /* Desactivacion: baja logica. El alumno sigue existiendo con su historial. */
  deactivate(id, user, datos = {}) {
    const registro = studentRepository.findById(id);
    if (!registro) {
      throw noEncontrado("El alumno solicitado");
    }

    const fechaBaja = datos.fechaBaja ?? datos.fecha ?? new Date().toISOString().slice(0, 10);
    const motivoBaja = datos.motivoBaja ?? datos.motivo ?? null;

    if (!registro.isActive) {
      if (fechaBaja || motivoBaja) {
        studentRepository.update(id, { fechaBaja, motivoBaja });
      }
      return { statusCode: 200, body: { data: vista(studentRepository.findById(id)) } };
    }

    const actualizado = studentRepository.deactivate(id, fechaBaja, motivoBaja);

    studentRepository.registrarAuditoria({
      accion: "deactivate",
      usuarioId: user.id,
      registroId: id,
      valorAnterior: vista(registro),
      valorNuevo: vista(actualizado)
    });

    return { statusCode: 200, body: { data: vista(actualizado) } };
  },

  /* Reactivacion: vuelve a estar activo y limpia datos de baja */
  activate(id, user, datos = {}) {
    const registro = studentRepository.findById(id);
    if (!registro) {
      throw noEncontrado("El alumno solicitado");
    }

    const fechaAlta = datos.fechaAlta ?? datos.fecha ?? new Date().toISOString().slice(0, 10);
    const motivoAlta = datos.motivoAlta ?? datos.motivo ?? null;

    if (registro.isActive) {
      return { statusCode: 200, body: { data: vista(registro) } };
    }

    const actualizado = studentRepository.activate(id, fechaAlta, motivoAlta);

    studentRepository.registrarAuditoria({
      accion: "activate",
      usuarioId: user.id,
      registroId: id,
      valorAnterior: vista(registro),
      valorNuevo: vista(actualizado)
    });

    return { statusCode: 200, body: { data: vista(actualizado) } };
  }
};


/* -------------------------------------------------------------
   Listados por curso, division, taller y grupo de taller.
   Leen el mismo repositorio que el CRUD (una sola fuente de alumnos).
   ------------------------------------------------------------- */

function escuelaDel(user) {
  return String(user.assignments?.[0]?.schoolId ?? ESCUELA_DEFECTO);
}

function leerListado(url, errores) {
  const params = url.searchParams;
  const pagina = parEntero(params.get("pagina") ?? "1", "pagina", errores) ?? 1;
  const porPagina =
    parEntero(params.get("porPagina") ?? String(POR_PAGINA_DEFECTO), "porPagina", errores, { maximo: POR_PAGINA_MAXIMO }) ??
    POR_PAGINA_DEFECTO;
  const orden = params.get("orden") ?? "apellido";

  if (!ORDENES_VALIDOS[orden]) {
    errores.push({ field: "orden", message: "El orden solicitado no esta permitido." });
  }

  const soloActivos = ["true", "1"].includes(params.get("soloActivos"));
  return { pagina, porPagina, orden, soloActivos };
}

function requerido(url, campo, errores) {
  const valor = url.searchParams.get(campo);

  if (valor == null || String(valor).trim() === "") {
    errores.push({ field: campo, message: `El parametro ${campo} es obligatorio.` });
    return null;
  }

  return String(valor).trim();
}

function armarListado({ user, contexto, criterios, opciones }) {
  const registros = studentRepository.search({
    escuelaId: escuelaDel(user),
    criterios: { estado: opciones.soloActivos ? "activo" : "todos", ...criterios },
    orden: opciones.orden
  });
  const filtrados = criterios.filtro ? registros.filter(criterios.filtro) : registros;
  const offset = (opciones.pagina - 1) * opciones.porPagina;

  return {
    data: filtrados.slice(offset, offset + opciones.porPagina).map(vista),
    contexto,
    filtros: { soloActivos: opciones.soloActivos, orden: opciones.orden },
    paginacion: paginacion(filtrados.length, opciones.pagina, opciones.porPagina)
  };
}

export function listarPorCurso({ url, user }) {
  const errores = [];
  const anioCurso = parEntero(url.searchParams.get("anioCurso"), "anioCurso", errores);

  if (anioCurso !== null && !CURSOS_VALIDOS.includes(anioCurso)) {
    errores.push({ field: "anioCurso", message: "El curso debe estar entre 1 y 7." });
  }

  const opciones = leerListado(url, errores);

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  return armarListado({
    user,
    contexto: { tipo: "curso", curso: { anio: anioCurso } },
    criterios: { curso: anioCurso },
    opciones
  });
}

export function listarPorDivision({ url, user }) {
  const errores = [];
  const anioCurso = parEntero(url.searchParams.get("anioCurso"), "anioCurso", errores);
  const division = requerido(url, "division", errores);
  const opciones = leerListado(url, errores);

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  const informacion = buscarDivision(anioCurso, division);

  if (!informacion) {
    throw noEncontrado("La division solicitada");
  }

  return armarListado({
    user,
    contexto: {
      tipo: "division",
      curso: { anio: anioCurso },
      division: { numero: division, turno: informacion.turno, orientacion: informacion.orientacion }
    },
    criterios: { curso: anioCurso, division },
    opciones
  });
}

export function listarPorTaller({ url, user }) {
  const errores = [];
  const tallerId = requerido(url, "tallerId", errores);
  const opciones = leerListado(url, errores);

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  const taller = workshopsRepository.findById(tallerId);

  if (!taller) {
    throw noEncontrado("El taller solicitado");
  }

  return armarListado({
    user,
    contexto: { tipo: "taller", taller: { id: taller.id, nombre: taller.name } },
    criterios: { filtro: (registro) => registro.tallerId === taller.id },
    opciones
  });
}

export function listarPorGrupo({ url, user }) {
  const errores = [];
  const tallerId = requerido(url, "tallerId", errores);
  const grupo = requerido(url, "grupo", errores);
  const opciones = leerListado(url, errores);

  if (errores.length) {
    throw errorDeValidacion(errores);
  }

  const taller = workshopsRepository.findById(tallerId);

  if (!taller) {
    throw noEncontrado("El taller solicitado");
  }

  return armarListado({
    user,
    contexto: { tipo: "grupo", taller: { id: taller.id, nombre: taller.name }, grupo: { nombre: grupo } },
    criterios: { filtro: (registro) => registro.tallerId === taller.id && registro.grupoTaller === grupo },
    opciones
  });
}

/* Catalogo de divisiones de la escuela con la cantidad de alumnos de cada una.
   Es la fuente del directorio de cursos del frontend. */
export function resumenDivisiones(user) {
  const registros = studentRepository.search({ escuelaId: escuelaDel(user), criterios: { estado: "todos" }, orden: "curso" });

  return {
    data: DIVISIONES_CATALOGO.map(({ anio, division, turno, orientacion }) => {
      const propios = registros.filter((registro) => registro.curso === anio && registro.division === division);
      const activos = propios.filter((registro) => registro.isActive).length;

      return {
        id: `${anio}-${division}`,
        anio,
        curso: `${anio}°`,
        division,
        turnoAula: turno,
        turnoTaller: turno === "mañana" ? "tarde" : "mañana",
        orientacion: orientacion ?? "Ciclo Básico",
        cantidad: propios.length,
        activos,
        inactivos: propios.length - activos
      };
    })
  };
}

export { vista as vistaAlumno, edadDe };

export default studentService;