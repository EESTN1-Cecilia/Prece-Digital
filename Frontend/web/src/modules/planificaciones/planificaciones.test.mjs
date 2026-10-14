/* Logica pura del modulo de planificaciones: node --test src */

import assert from "node:assert/strict";
import test from "node:test";
import {
  aplicarFiltro,
  cambiarEnCascada,
  completarUnicos,
  consultaListado,
  datosParaEnviar,
  estadosConCantidad,
  filtrosActivos,
  formularioDesdePlanificacion,
  guardarCriterios,
  leerCriterios,
  opcionesDeFiltros,
  opcionesEnCascada,
  ordenParaApi,
  rangosInvalidos,
  sinRangosInvalidos,
  separarErrores,
  tonoDeEstado,
  validarGenerales
} from "./planificaciones-helpers.js";

function combinacion({ anio = 2026, curso = "cur-1", cursoAnio = 1, turno = "MANANA", division = "div-1", materia = "mat", docente = "tch-1", cuatrimestre = null }) {
  return {
    asignacionId: `${docente}-${materia}`,
    anioLectivo: anio,
    cuatrimestre,
    docente: { id: docente, nombreCompleto: `Docente ${docente}` },
    materia: { id: materia, nombre: `Materia ${materia}` },
    curso: { id: curso, anio: cursoAnio, anioNombre: `${cursoAnio}ro`, turno, turnoNombre: turno === "MANANA" ? "Mañana" : "Tarde", etiqueta: `${cursoAnio}ro año · ${turno}` },
    division: { id: division, nombre: division }
  };
}

const COMBINACIONES = [
  combinacion({}),
  combinacion({ division: "div-2" }),
  combinacion({ materia: "lng", docente: "tch-4" }),
  combinacion({ curso: "cur-6", cursoAnio: 4, division: "div-10", materia: "prog", docente: "tch-3", cuatrimestre: 1 }),
  combinacion({ anio: 2025, curso: "cur-2", turno: "TARDE", division: "div-4" })
];

test("cada estado conocido tiene tono y uno nuevo cae en neutral", () => {
  assert.equal(tonoDeEstado("aprobada"), "ok");
  assert.equal(tonoDeEstado("observada"), "alerta");
  assert.equal(tonoDeEstado("inventado"), "neutral");
});

test("las opciones de filtros acotan cursos por anio y divisiones por curso", () => {
  const todas = opcionesDeFiltros(COMBINACIONES, {});
  assert.deepEqual(todas.aniosLectivos.map((item) => item.id), ["2026", "2025"]);
  assert.equal(todas.cursos.length, 3);
  assert.deepEqual(todas.divisiones, []);

  const acotadas = opcionesDeFiltros(COMBINACIONES, { anio: "1", turno: "MANANA", cursoId: "cur-1" });
  assert.deepEqual(acotadas.cursos.map((item) => item.id), ["cur-1"]);
  assert.deepEqual(acotadas.divisiones.map((item) => item.id), ["div-1", "div-2"]);
});

test("cambiar el anio descarta un curso que ya no corresponde y el curso limpia la division", () => {
  const conCurso = { anio: "", turno: "", cursoId: "cur-1", divisionId: "div-1" };
  assert.deepEqual(aplicarFiltro(conCurso, "anio", "4", COMBINACIONES), { anio: "4", turno: "", cursoId: "", divisionId: "" });
  assert.equal(aplicarFiltro(conCurso, "anio", "1", COMBINACIONES).cursoId, "cur-1");
  assert.equal(aplicarFiltro(conCurso, "cursoId", "cur-6", COMBINACIONES).divisionId, "");
});

test("la cascada del formulario limpia los niveles siguientes", () => {
  const seleccion = { anioLectivo: "2026", cursoId: "cur-1", divisionId: "div-1", materiaId: "mat", docenteId: "tch-1", periodo: "anual" };
  assert.deepEqual(cambiarEnCascada(seleccion, "cursoId", "cur-6"), {
    anioLectivo: "2026",
    cursoId: "cur-6",
    divisionId: "",
    materiaId: "",
    docenteId: "",
    periodo: ""
  });
});

test("las opciones en cascada siguen anio -> curso -> division -> materia -> docente", () => {
  const opciones = opcionesEnCascada(COMBINACIONES, { anioLectivo: "2026", cursoId: "cur-1", divisionId: "div-1", materiaId: "lng" });
  assert.deepEqual(opciones.cursos.map((item) => item.id), ["cur-1", "cur-6"]);
  assert.deepEqual(opciones.divisiones.map((item) => item.id), ["div-1", "div-2"]);
  assert.deepEqual(opciones.materias.map((item) => item.id), ["lng", "mat"]);
  assert.deepEqual(opciones.docentes.map((item) => item.id), ["tch-4"]);
  assert.equal(opciones.turno, "Mañana");
  assert.deepEqual(opciones.periodos, []);
});

test("una asignacion cuatrimestral solo ofrece su periodo", () => {
  const opciones = opcionesEnCascada(COMBINACIONES, {
    anioLectivo: "2026",
    cursoId: "cur-6",
    divisionId: "div-10",
    materiaId: "prog",
    docenteId: "tch-3"
  });
  assert.deepEqual(opciones.periodos.map((item) => item.id), ["1"]);
  assert.equal(opciones.combinacion.asignacionId, "tch-3-prog");
});

test("completarUnicos elige los niveles con una sola opcion", () => {
  const propias = COMBINACIONES.filter((item) => item.docente.id === "tch-3");
  assert.deepEqual(completarUnicos(propias, { anioLectivo: "", cursoId: "", divisionId: "", materiaId: "", docenteId: "", periodo: "" }), {
    anioLectivo: "2026",
    cursoId: "cur-6",
    divisionId: "div-10",
    materiaId: "prog",
    docenteId: "tch-3",
    periodo: "1"
  });
});

test("valida los datos generales obligatorios", () => {
  assert.equal(validarGenerales({ anioLectivo: "2026", cursoId: "c", divisionId: "d", materiaId: "m", docenteId: "t", periodo: "anual" }), null);
  assert.deepEqual(Object.keys(validarGenerales({ anioLectivo: "2026" })), ["cursoId", "divisionId", "materiaId", "docenteId", "periodo"]);
});

test("arma el cuerpo a enviar y vuelve a cargarlo desde la API", () => {
  const secciones = [{ valor: "objetivos" }, { valor: "contenidos" }];
  const cuerpo = datosParaEnviar(
    {
      generales: { anioLectivo: "2026", cursoId: "cur-1", divisionId: "div-1", materiaId: "mat", docenteId: "tch-1", periodo: "anual" },
      contenido: { objetivos: "  Leer  ", contenidos: "" }
    },
    secciones
  );
  assert.equal(cuerpo.anioLectivo, 2026);
  assert.deepEqual(cuerpo.contenido, { objetivos: "Leer", contenidos: null });

  const formulario = formularioDesdePlanificacion({ ...cuerpo, periodo: { valor: "anual" }, contenido: { objetivos: "Leer", contenidos: null } });
  assert.equal(formulario.generales.anioLectivo, "2026");
  assert.equal(formulario.contenido.contenidos, "");
});

test("separa los errores del backend entre datos generales y secciones", () => {
  assert.deepEqual(separarErrores({ materiaId: "x", "contenido.objetivos": "y", contenido: "z" }), {
    generales: { materiaId: "x" },
    contenido: { objetivos: "y", _general: "z" }
  });
});

test("la consulta del listado traduce el orden de la tabla a la API", () => {
  assert.equal(ordenParaApi({ columna: "materia", direccion: "desc" }), "materia_desc");
  assert.equal(ordenParaApi({ columna: null, direccion: null }), "actualizado_desc");

  const consulta = consultaListado({ busqueda: " rios ", filtros: { estado: "borrador" }, pagina: 2, porPagina: 10, orden: { columna: "creadoEn", direccion: "asc" } });
  assert.deepEqual(consulta, { q: "rios", estado: "borrador", orden: "creado", pagina: 2, porPagina: 10 });
});

test("la bandeja de revision pide al backend el orden por prioridad", () => {
  assert.equal(ordenParaApi({ columna: "prioridad", direccion: "asc" }), "revision");
});

test("los filtros activos muestran el nombre legible de cada valor", () => {
  const chips = filtrosActivos({ docenteId: "tch-1", estado: "aprobada", turno: "" }, {
    docenteId: [{ id: "tch-1", nombre: "Villatoro, María" }],
    estado: [{ id: "aprobada", nombre: "Aprobada" }]
  });
  assert.deepEqual(chips, [
    { campo: "docenteId", etiqueta: "Docente", valor: "Villatoro, María" },
    { campo: "estado", etiqueta: "Estado", valor: "Aprobada" }
  ]);
});

test("los criterios se guardan y se leen sin romper si no hay almacenamiento", () => {
  const memoria = new Map();
  const almacen = { getItem: (clave) => memoria.get(clave) ?? null, setItem: (clave, valor) => memoria.set(clave, valor) };
  guardarCriterios("clave", { pagina: 2 }, almacen);
  assert.deepEqual(leerCriterios("clave", almacen), { pagina: 2 });

  const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(leerCriterios("clave", roto), null);
  assert.doesNotThrow(() => guardarCriterios("clave", {}, roto));
});

test("el resumen lista solo los estados con planificaciones, en el orden del catalogo", () => {
  const catalogos = { estados: [{ valor: "borrador" }, { valor: "presentada" }, { valor: "aprobada" }] };
  assert.deepEqual(estadosConCantidad({ porEstado: { aprobada: 2, borrador: 1, presentada: 0 } }, catalogos), [
    { estado: "borrador", cantidad: 1 },
    { estado: "aprobada", cantidad: 2 }
  ]);
});

test("detecta y descarta rangos de fechas invertidos", () => {
  const filtros = { fechaRevisionDesde: "2026-03-12", fechaRevisionHasta: "2026-03-01", fechaPresentacionDesde: "2026-03-01" };
  assert.deepEqual(rangosInvalidos(filtros).map((rango) => rango.nombre), ["revisión"]);
  assert.deepEqual(sinRangosInvalidos(filtros), { fechaPresentacionDesde: "2026-03-01" });
});
