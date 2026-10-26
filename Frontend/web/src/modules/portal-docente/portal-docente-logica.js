/* Reglas puras del Portal Docente (sin React): se prueban con node --test
   (portal-docente-logica.test.mjs). */

/* Estados del catalogo institucional (los mismos que valida el backend). */
export const ESTADOS = [
  { valor: "presente", nombre: "Presente", corto: "P" },
  { valor: "ausente", nombre: "Ausente", corto: "A" },
  { valor: "tarde", nombre: "Tardanza", corto: "T" }
];

const TURNOS = { manana: "Mañana", mañana: "Mañana", tarde: "Tarde", noche: "Noche", vespertino: "Vespertino" };

export function etiquetaTurno(turno) {
  if (!turno) {
    return null;
  }

  return TURNOS[String(turno).toLowerCase()] ?? String(turno);
}

export function etiquetaCurso({ anio, division } = {}) {
  return `${anio}° año · División ${division}`;
}

/* Un docente puede dictar varias materias en la misma division: cada
   combinacion division + materia es una "clase" distinta (su propia lista de
   asistencia). Sin materia cargada, la division cuenta como una sola clase. */
export function expandirClases(cursos = []) {
  return cursos.flatMap((curso) => {
    const materias = (curso.materias ?? []).filter(Boolean);
    const lista = materias.length ? materias : [null];

    return lista.map((materia) => ({
      clave: `${curso.id}|${materia ?? ""}`,
      cursoId: curso.id,
      anio: curso.anio,
      division: String(curso.division),
      materia,
      turno: etiquetaTurno(curso.turno),
      cantidadAlumnos: curso.cantidadAlumnos ?? null,
      horario: curso.horario ?? null
    }));
  });
}

export function indicadores(cursos = []) {
  const clases = expandirClases(cursos);
  const materias = new Set(clases.map((clase) => clase.materia).filter(Boolean));

  return {
    clases: clases.length,
    divisiones: cursos.length,
    materias: materias.size,
    alumnos: cursos.reduce((total, curso) => total + (curso.cantidadAlumnos ?? 0), 0)
  };
}

/* Fecha local de hoy (AAAA-MM-DD), no la UTC. */
export function hoyLocal(ahora = new Date()) {
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function primerDiaDelMes(ahora = new Date()) {
  return `${hoyLocal(ahora).slice(0, 8)}01`;
}

export function fechaLegible(iso) {
  if (!iso) {
    return "—";
  }

  const [anio, mes, dia] = String(iso).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(anio, mes - 1, dia));
}

/* Busqueda por apellido, nombre o DNI y orden alfabetico. */
export function filtrarAlumnos(alumnos = [], texto = "", orden = "asc") {
  const buscado = normalizar(texto);
  const filtrados = buscado
    ? alumnos.filter((alumno) => normalizar(`${alumno.apellido} ${alumno.nombre} ${alumno.dni ?? ""}`).includes(buscado))
    : [...alumnos];

  const signo = orden === "desc" ? -1 : 1;
  return filtrados.sort(
    (uno, otro) => signo * `${uno.apellido} ${uno.nombre}`.localeCompare(`${otro.apellido} ${otro.nombre}`, "es")
  );
}

function normalizar(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/* registros: { [alumnoId]: estado } */
export function resumenRegistros(alumnos = [], registros = {}) {
  const resumen = { total: alumnos.length, presente: 0, ausente: 0, tarde: 0, sinMarcar: 0 };

  for (const alumno of alumnos) {
    const estado = registros[alumno.id];

    if (estado && estado in resumen) {
      resumen[estado] += 1;
    } else {
      resumen.sinMarcar += 1;
    }
  }

  return resumen;
}


/* ---------------- Planilla mensual ---------------------------------------
   La planilla institucional trabaja con letras por dia (P, A, T); el backend
   guarda una toma por dia con estados presente / ausente / tarde. Estas
   funciones traducen entre ambos sin inventar datos: un dia sin toma queda
   vacio ("") y no suma en los totales. */

const LETRA_POR_ESTADO = { presente: "P", ausente: "A", tarde: "T" };
const ESTADO_POR_LETRA = { P: "presente", A: "ausente", T: "tarde" };

function dosCifras(numero) {
  return String(numero).padStart(2, "0");
}

export function fechaDeDia(anio, mes, dia) {
  return `${anio}-${dosCifras(mes)}-${dosCifras(dia)}`;
}

export function rangoDelMes(anio, mes) {
  return { desde: fechaDeDia(anio, mes, 1), hasta: fechaDeDia(anio, mes, new Date(anio, mes, 0).getDate()) };
}

/* alumnos: lista del backend (ya ordenada); tomas: con sus registros. */
export function planillaDesdeTomas({ cursoId, materia, mes, anio, alumnos = [], tomas = [] }) {
  const lista = alumnos.map((alumno, indice) => ({
    id: alumno.id,
    orden: alumno.orden ?? indice + 1,
    genero: alumno.genero ?? null,
    apellido: String(alumno.apellido ?? "").toUpperCase(),
    nombre: alumno.nombre ?? "",
    dni: alumno.dni ?? ""
  }));
  const ordenPorId = new Map(lista.map((alumno) => [alumno.id, alumno.orden]));
  const registros = Object.fromEntries(lista.map((alumno) => [alumno.orden, {}]));
  const tomasPorDia = {};
  const prefijo = `${anio}-${dosCifras(mes)}-`;

  for (const toma of tomas) {
    if (!String(toma.fecha).startsWith(prefijo)) {
      continue;
    }

    const dia = Number(toma.fecha.slice(8, 10));
    tomasPorDia[dia] = toma.id;

    for (const item of toma.registros ?? []) {
      const orden = ordenPorId.get(item.alumnoId);
      const letra = LETRA_POR_ESTADO[item.estado];

      if (orden !== undefined && letra) {
        registros[orden][dia] = letra;
      }
    }
  }

  return {
    cursoId,
    materia,
    mes,
    anio,
    alumnos: lista,
    registros,
    tomasPorDia,
    observacionesPorAlumno: {},
    observacionesMes: [],
    matriculaInicial: lista.length,
    entradas: 0,
    salidas: 0
  };
}

/* Dias en los que algun alumno cambio respecto de lo guardado. */
export function diasModificados(planilla, original) {
  const dias = new Set();

  for (const alumno of planilla?.alumnos ?? []) {
    const actuales = planilla.registros?.[alumno.orden] ?? {};
    const previos = original?.registros?.[alumno.orden] ?? {};

    for (const dia of new Set([...Object.keys(actuales), ...Object.keys(previos)])) {
      if ((actuales[dia] ?? "") !== (previos[dia] ?? "")) {
        dias.add(Number(dia));
      }
    }
  }

  return [...dias].sort((uno, otro) => uno - otro);
}

/* Cuerpo para PUT /api/v1/asistencia-clases/planilla. Cada dia modificado se
   envia completo; los dias con alumnos sin marcar se informan en `incompletos`
   y no se envian. */
export function tomasParaGuardar(planilla, original) {
  const tomas = [];
  const incompletos = [];

  for (const dia of diasModificados(planilla, original)) {
    const registros = planilla.alumnos.map((alumno) => ({
      alumnoId: alumno.id,
      estado: ESTADO_POR_LETRA[planilla.registros?.[alumno.orden]?.[dia]] ?? null
    }));

    if (registros.some((item) => !item.estado)) {
      incompletos.push(dia);
    } else {
      tomas.push({ fecha: fechaDeDia(planilla.anio, planilla.mes, dia), registros });
    }
  }

  return { tomas, incompletos };
}
