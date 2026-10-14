/* Logica pura del modulo de planificaciones docentes.

   Sin React ni HTTP: se prueba sola (planificaciones.test.mjs) y la comparten
   el listado, las consultas y el formulario. Las reglas de negocio (que
   combinacion es valida, que acciones hay, que transiciones existen) las
   decide el backend; aca solo se ordena lo que la API devuelve para
   mostrarlo. */

/* ---------------- Estados ------------------------------------------------ */

/* Tono del badge por estado. El texto siempre acompana: el color no es el
   unico portador del significado. Un estado nuevo del backend cae en neutral. */
const TONOS_ESTADO = {
  borrador: "neutral",
  presentada: "info",
  en_revision: "aviso",
  observada: "alerta",
  corregida: "info",
  aprobada: "ok",
  rechazada: "off"
};

export function tonoDeEstado(estado) {
  return TONOS_ESTADO[estado] ?? "neutral";
}

/* Nombre corto para badges y filtros. La descripcion larga del catalogo
   ("Presentada, pendiente de revision") queda para el detalle. Un estado que
   el backend agregue despues se muestra a partir de su valor. */
const NOMBRES_ESTADO = {
  borrador: "Borrador",
  presentada: "Presentada",
  en_revision: "En revisión",
  observada: "Observada",
  corregida: "Corregida",
  aprobada: "Aprobada",
  rechazada: "Rechazada"
};

export function nombreDeEstado(estado) {
  if (!estado) {
    return "—";
  }

  return NOMBRES_ESTADO[estado] ?? capitalizar(String(estado).replace(/_/g, " "));
}

/* Estados del catalogo -> opciones { id, nombre } para Select/Filtro. */
export function opcionesDeEstados(catalogos) {
  return (catalogos?.estados ?? []).map((item) => ({ id: item.valor, nombre: nombreDeEstado(item.valor) }));
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* Catalogo { valor, descripcion } -> opciones { id, nombre } para Select/Filtro. */
export function opcionesDeCatalogo(lista = []) {
  return lista.map((item) => ({ id: String(item.valor), nombre: item.descripcion }));
}

/* ---------------- Opciones a partir de las combinaciones ----------------- */

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

function unicas(lista, armar) {
  const mapa = new Map();

  for (const item of lista) {
    const opcion = armar(item);

    if (opcion && !mapa.has(opcion.id)) {
      mapa.set(opcion.id, opcion);
    }
  }

  return [...mapa.values()];
}

export function etiquetaCurso(curso) {
  if (!curso) {
    return "—";
  }

  return [`${curso.anioNombre} año`, curso.orientacion?.nombre].filter(Boolean).join(" · ");
}

function opcionCurso(combinacion) {
  const { curso } = combinacion;
  return { id: curso.id, nombre: curso.etiqueta, anio: curso.anio, turno: curso.turno };
}

function ordenarCursos(cursos) {
  return cursos.sort((a, b) => a.anio - b.anio || collator.compare(a.nombre, b.nombre));
}

/* Opciones de los filtros del listado. Los selects dependientes se acotan con
   lo ya elegido: con un anio o un turno elegidos solo quedan sus cursos, y con
   un curso, sus divisiones. */
export function opcionesDeFiltros(combinaciones = [], filtros = {}) {
  const cursosVisibles = combinaciones.filter(
    (item) =>
      (!filtros.anio || String(item.curso.anio) === String(filtros.anio)) &&
      (!filtros.turno || item.curso.turno === filtros.turno)
  );

  return {
    aniosLectivos: [...new Set(combinaciones.map((item) => item.anioLectivo))]
      .sort((a, b) => b - a)
      .map((anio) => ({ id: String(anio), nombre: String(anio) })),
    docentes: unicas(combinaciones, (item) => ({ id: item.docente.id, nombre: item.docente.nombreCompleto })).sort((a, b) =>
      collator.compare(a.nombre, b.nombre)
    ),
    materias: unicas(combinaciones, (item) => ({ id: item.materia.id, nombre: item.materia.nombre })).sort((a, b) =>
      collator.compare(a.nombre, b.nombre)
    ),
    cursos: ordenarCursos(unicas(cursosVisibles, opcionCurso)),
    divisiones: unicas(
      combinaciones.filter((item) => filtros.cursoId && item.curso.id === filtros.cursoId),
      (item) => ({ id: item.division.id, nombre: item.division.nombre })
    ).sort((a, b) => collator.compare(a.nombre, b.nombre))
  };
}

/* Cambia un filtro y descarta los que dependian de el y ya no aplican. */
export function aplicarFiltro(filtros, campo, valor, combinaciones = []) {
  const proximos = { ...filtros, [campo]: valor };

  if (["anio", "turno"].includes(campo) && proximos.cursoId) {
    const curso = combinaciones.find((item) => item.curso.id === proximos.cursoId)?.curso;
    const sigue =
      curso &&
      (!proximos.anio || String(curso.anio) === String(proximos.anio)) &&
      (!proximos.turno || curso.turno === proximos.turno);

    if (!sigue) {
      proximos.cursoId = "";
      proximos.divisionId = "";
    }
  }

  if (campo === "cursoId") {
    proximos.divisionId = "";
  }

  return proximos;
}

/* ---------------- Cascada del formulario --------------------------------- */

/* Orden de la cascada: cambiar un nivel limpia todos los siguientes. */
export const CASCADA = ["anioLectivo", "cursoId", "divisionId", "materiaId", "docenteId", "periodo"];

export function cambiarEnCascada(seleccion, campo, valor) {
  const proxima = { ...seleccion, [campo]: valor };
  const desde = CASCADA.indexOf(campo);

  if (desde === -1) {
    return proxima;
  }

  for (const siguiente of CASCADA.slice(desde + 1)) {
    proxima[siguiente] = "";
  }

  return proxima;
}

const PERIODOS_POR_DEFECTO = [
  { id: "anual", nombre: "Anual" },
  { id: "1", nombre: "1er cuatrimestre" },
  { id: "2", nombre: "2do cuatrimestre" }
];

/* Opciones de cada nivel segun lo elegido en los anteriores. Una asignacion
   anual admite cualquier periodo; una cuatrimestral, solo el suyo. */
export function opcionesEnCascada(combinaciones = [], seleccion = {}, periodos = PERIODOS_POR_DEFECTO) {
  const delAnio = combinaciones.filter((item) => String(item.anioLectivo) === String(seleccion.anioLectivo));
  const delCurso = delAnio.filter((item) => item.curso.id === seleccion.cursoId);
  const deLaDivision = delCurso.filter((item) => item.division.id === seleccion.divisionId);
  const deLaMateria = deLaDivision.filter((item) => item.materia.id === seleccion.materiaId);
  const delDocente = deLaMateria.filter((item) => item.docente.id === seleccion.docenteId);

  const cuatrimestres = new Set(delDocente.map((item) => item.cuatrimestre ?? "anual"));
  const periodosVisibles = cuatrimestres.has("anual")
    ? periodos
    : periodos.filter((periodo) => cuatrimestres.has(Number(periodo.id)));

  const combinacion = delDocente[0] ?? null;

  return {
    aniosLectivos: [...new Set(combinaciones.map((item) => item.anioLectivo))]
      .sort((a, b) => b - a)
      .map((anio) => ({ id: String(anio), nombre: String(anio) })),
    cursos: ordenarCursos(unicas(delAnio, opcionCurso)),
    divisiones: unicas(delCurso, (item) => ({ id: item.division.id, nombre: item.division.nombre })).sort((a, b) =>
      collator.compare(a.nombre, b.nombre)
    ),
    materias: unicas(deLaDivision, (item) => ({ id: item.materia.id, nombre: item.materia.nombre })).sort((a, b) =>
      collator.compare(a.nombre, b.nombre)
    ),
    docentes: unicas(deLaMateria, (item) => ({ id: item.docente.id, nombre: item.docente.nombreCompleto })).sort((a, b) =>
      collator.compare(a.nombre, b.nombre)
    ),
    periodos: seleccion.docenteId ? periodosVisibles : [],
    turno: delCurso[0]?.curso.turnoNombre ?? "",
    combinacion
  };
}

/* Completa los niveles que tienen una unica opcion posible (por ejemplo, el
   docente cuando quien carga es el propio docente). */
export function completarUnicos(combinaciones, seleccion, periodos) {
  let actual = { ...seleccion };

  for (const campo of CASCADA) {
    if (actual[campo]) {
      continue;
    }

    const opciones = opcionesEnCascada(combinaciones, actual, periodos);
    const lista = {
      anioLectivo: opciones.aniosLectivos,
      cursoId: opciones.cursos,
      divisionId: opciones.divisiones,
      materiaId: opciones.materias,
      docenteId: opciones.docentes,
      periodo: opciones.periodos
    }[campo];

    if (lista.length !== 1) {
      break;
    }

    actual = { ...actual, [campo]: lista[0].id };
  }

  return actual;
}

/* ---------------- Formulario --------------------------------------------- */

export const GENERALES_VACIOS = {
  anioLectivo: "",
  cursoId: "",
  divisionId: "",
  materiaId: "",
  docenteId: "",
  periodo: ""
};

export function formularioDesdePlanificacion(plan) {
  if (!plan) {
    return { generales: { ...GENERALES_VACIOS }, contenido: {} };
  }

  return {
    generales: {
      anioLectivo: String(plan.anioLectivo ?? ""),
      cursoId: plan.cursoId ?? "",
      divisionId: plan.divisionId ?? "",
      materiaId: plan.materiaId ?? "",
      docenteId: plan.docenteId ?? "",
      periodo: plan.periodo?.valor ?? (plan.cuatrimestre ? String(plan.cuatrimestre) : "anual")
    },
    contenido: Object.fromEntries(Object.entries(plan.contenido ?? {}).map(([seccion, texto]) => [seccion, texto ?? ""]))
  };
}

const ETIQUETAS_GENERALES = {
  anioLectivo: "El ciclo lectivo",
  cursoId: "El curso",
  divisionId: "La division",
  materiaId: "La materia",
  docenteId: "El docente",
  periodo: "El periodo"
};

/* Validacion previa al envio: solo campos obligatorios. La validacion
   definitiva (relaciones, duplicados, permisos) la hace el backend. */
export function validarGenerales(generales) {
  const errores = {};

  for (const campo of CASCADA) {
    if (!generales[campo]) {
      errores[campo] = `${ETIQUETAS_GENERALES[campo]} es obligatorio.`;
    }
  }

  return Object.keys(errores).length ? errores : null;
}

export function datosParaEnviar({ generales, contenido }, secciones = []) {
  const claves = secciones.length ? secciones.map((seccion) => seccion.valor) : Object.keys(contenido ?? {});

  return {
    anioLectivo: Number(generales.anioLectivo),
    cursoId: generales.cursoId,
    divisionId: generales.divisionId,
    materiaId: generales.materiaId,
    docenteId: generales.docenteId,
    periodo: generales.periodo,
    contenido: Object.fromEntries(claves.map((clave) => [clave, (contenido?.[clave] ?? "").trim() || null]))
  };
}

/* Errores del backend por campo -> errores del formulario. "contenido.objetivos"
   queda en el bloque de contenido con la clave de la seccion. */
export function separarErrores(campos) {
  const generales = {};
  const contenido = {};

  for (const [campo, mensaje] of Object.entries(campos ?? {})) {
    if (campo.startsWith("contenido.")) {
      contenido[campo.slice("contenido.".length)] = mensaje;
    } else if (campo === "anioLectivo" || campo === "periodo" || campo.endsWith("Id")) {
      generales[campo] = mensaje;
    } else {
      contenido._general = mensaje;
    }
  }

  return { generales, contenido };
}

/* ---------------- Listado: consulta, orden y filtros activos ------------- */

export const FILTROS_VACIOS = {
  docenteId: "",
  materiaId: "",
  anio: "",
  cursoId: "",
  divisionId: "",
  turno: "",
  estado: "",
  anioLectivo: "",
  periodo: ""
};

/* Columna de la tabla -> valor de `orden` de la API. */
const ORDEN_API = {
  id: "id",
  docente: "docente",
  materia: "materia",
  curso: "curso",
  estado: "estado",
  periodo: "periodo",
  creadoEn: "creado",
  actualizadoEn: "actualizado"
};

export const ORDEN_INICIAL = { columna: "actualizadoEn", direccion: "desc" };

export function ordenParaApi(orden) {
  const base = ORDEN_API[orden?.columna];

  if (!base || !orden?.direccion) {
    return "actualizado_desc";
  }

  return orden.direccion === "desc" ? `${base}_desc` : base;
}

export function consultaListado({ busqueda = "", filtros = {}, pagina = 1, porPagina = 20, orden } = {}) {
  return {
    q: busqueda.trim(),
    ...filtros,
    orden: ordenParaApi(orden),
    pagina,
    porPagina
  };
}

const ETIQUETAS_FILTROS = {
  docenteId: "Docente",
  materiaId: "Materia",
  anio: "Año",
  cursoId: "Curso",
  divisionId: "División",
  turno: "Turno",
  estado: "Estado",
  anioLectivo: "Ciclo lectivo",
  periodo: "Período"
};

/* Chips de filtros activos con el nombre legible de cada valor. */
export function filtrosActivos(filtros = {}, opcionesPorCampo = {}) {
  return Object.keys(ETIQUETAS_FILTROS)
    .filter((campo) => filtros[campo])
    .map((campo) => {
      const opcion = (opcionesPorCampo[campo] ?? []).find((item) => String(item.id) === String(filtros[campo]));

      return {
        campo,
        etiqueta: ETIQUETAS_FILTROS[campo],
        valor: opcion?.nombre ?? String(filtros[campo])
      };
    });
}

export function hayCriterios(busqueda, filtros) {
  return Boolean((busqueda ?? "").trim()) || Object.values(filtros ?? {}).some(Boolean);
}

/* ---------------- Criterios guardados ------------------------------------ */

/* Busqueda, filtros y orden sobreviven a ir al detalle y volver. Viven en
   sessionStorage: se pierden al cerrar la pestania y nunca tienen datos
   sensibles. Si el navegador no deja guardar, la pantalla funciona igual. */
export function leerCriterios(clave, almacen = globalThis.sessionStorage) {
  try {
    const crudo = almacen?.getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export function guardarCriterios(clave, criterios, almacen = globalThis.sessionStorage) {
  try {
    almacen?.setItem(clave, JSON.stringify(criterios));
  } catch {
    /* Sin almacenamiento disponible: los criterios duran lo que la pantalla. */
  }
}

/* ---------------- Resumen ------------------------------------------------ */

/* Estados con al menos una planificacion, en el orden del catalogo. */
export function estadosConCantidad(resumen, catalogos) {
  const orden = (catalogos?.estados ?? []).map((item) => item.valor);
  const porEstado = resumen?.porEstado ?? {};
  const claves = orden.length ? orden : Object.keys(porEstado);

  return claves
    .filter((estado) => (porEstado[estado] ?? 0) > 0)
    .map((estado) => ({ estado, cantidad: porEstado[estado] }));
}
