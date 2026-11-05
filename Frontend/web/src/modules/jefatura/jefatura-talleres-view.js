import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/state-handlers.js";
import { StudentsService } from "../students/students-service.js";
import { JefaturaService } from "./jefatura-service.js";
import {
  CRONOGRAMA,
  DIAS_TALLER,
  ETIQUETA_CICLO,
  ETIQUETA_DIA,
  cicloDeAnio,
  divisionesVisibles,
  gruposDeDivision,
  sesionesDeGrupo
} from "./talleres-cronograma.js";
import { categoriaDeDivision } from "./jefatura-resumen-datos.js";
import { createPortal } from "react-dom";
import PlanillaCalificacionesModal from "../documents/planilla-calificaciones-modal.js";
import AsistenciasView from "../attendance/asistencias-view.js";
import {
  alternarGrupo,
  asignarRango,
  construirAsignacion,
  cortePorMitad,
  generoDe,
  ordenarAlumnos,
  resumirGrupos
} from "./talleres-division.js";

const ETIQUETA_GENERO = { F: "Mujer", M: "Varón", X: "Sin dato" };

/* Desde este numero de alumnos la lista se muestra plegada. */
const LIMITE_LISTA = 6;

function textoAlumnos(cantidad) {
  return `${cantidad} ${cantidad === 1 ? "alumno" : "alumnos"}`;
}

const GRUPO_VACIO = { total: 0, F: 0, M: 0, X: 0 };

/* ---------- Guardado de la division ----------
   La API todavia no guarda la division de talleres (y jefatura no tiene permiso
   de escritura sobre alumnos), asi que cada division se recuerda en este navegador. */

function claveGuardado(clave) {
  return `prece.jefatura.talleres.${clave}`;
}

function leerGuardado(clave) {
  try {
    const crudo = window.localStorage.getItem(claveGuardado(clave));
    const dato = crudo ? JSON.parse(crudo) : null;
    if (dato && typeof dato === "object") {
      return {
        modo: dato.modo === "corte" ? "corte" : "equilibrado",
        corte: Number.isInteger(dato.corte) ? dato.corte : null,
        manual: dato.manual && typeof dato.manual === "object" ? dato.manual : {}
      };
    }
  } catch {
    /* sin almacenamiento: se trabaja con los valores por defecto */
  }
  return { modo: "equilibrado", corte: null, manual: {} };
}

function guardar(clave, estado) {
  try {
    window.localStorage.setItem(claveGuardado(clave), JSON.stringify(estado));
  } catch {
    /* el guardado es una comodidad: si falla, la pantalla sigue funcionando */
  }
}

/* ---------- Grilla de cursos ---------- */

const FILTROS_CATEGORIA = [
  ["todos", "Todos los Cursos"],
  ["basico", "Ciclo Básico"],
  ["informatica", "Informática"],
  ["programacion", "Programación"]
];

const ETIQUETA_CATEGORIA = { basico: "Ciclo Básico", informatica: "Informática", programacion: "Programación" };

/* "mañana" / "MANANA" / "Tarde" -> "mañana" | "tarde" | "" */
function turnoNormalizado(turno) {
  const texto = String(turno ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (texto.startsWith("man")) return "mañana";
  if (texto.startsWith("tar")) return "tarde";
  return "";
}

function textoTurno(turno) {
  const normalizado = turnoNormalizado(turno);
  return normalizado ? `Turno ${normalizado.charAt(0).toUpperCase()}${normalizado.slice(1)}` : "Sin turno";
}

function Svg({ children }) {
  return h(
    "svg",
    { className: "jf-icono", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    children
  );
}

const IconoAula = () => h(Svg, null, h("path", { d: "M3 11l9-8 9 8" }), h("path", { d: "M5 10v10h14V10" }), h("path", { d: "M10 20v-6h4v6" }));
const IconoTaller = () =>
  h(
    Svg,
    null,
    h("circle", { cx: 12, cy: 12, r: 3 }),
    h("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" })
  );
const IconoAlumnos = () =>
  h(
    Svg,
    null,
    h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: 9, cy: 7, r: 4 }),
    h("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
    h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
  );

/* Insignias con los codigos de los dos grupos de taller del curso. */
function InsigniasGrupos({ grupos }) {
  return h(
    "span",
    { className: "jf-chips-grupo", "aria-label": `Grupos de taller ${grupos.join(" y ")}` },
    h("span", { className: "jf-chip-codigo jf-chip-codigo--a", title: `Grupo ${grupos[0]}` }, grupos[0]),
    h("span", { className: "jf-chip-codigo jf-chip-codigo--b", title: `Grupo ${grupos[1]}` }, grupos[1])
  );
}

function TarjetaCurso({ division, grupos, onAbrir }) {
  const categoria = categoriaDeDivision(division);

  return h(
    "article",
    { className: `jf-curso-card jf-curso-card--${categoria}` },
    h(
      "header",
      { className: "jf-curso-card__cabecera" },
      h(
        "div",
        { className: "jf-curso-card__ids" },
        h("span", { className: "jf-curso-card__curso" }, `${division.anio}°${division.division}`),
        h(InsigniasGrupos, { grupos })
      ),
      h("span", { className: `jf-curso-card__etiqueta jf-curso-card__etiqueta--${categoria}` }, ETIQUETA_CATEGORIA[categoria])
    ),
    h("h3", { className: "jf-curso-card__titulo" }, `${division.anio}° Año — División ${division.division}`),
    h(
      "ul",
      { className: "jf-curso-card__datos" },
      h("li", null, h(IconoAula), `Aula: ${textoTurno(division.turnoAula)}`),
      h("li", null, h(IconoTaller), `Taller: ${textoTurno(division.turnoTaller)}`)
    ),
    h(
      "footer",
      { className: "jf-curso-card__pie" },
      h("span", { className: "jf-curso-card__alumnos" }, h(IconoAlumnos), h("strong", null, division.activos ?? 0), division.activos === 1 ? "alumno" : "alumnos"),
      h(
        "button",
        { type: "button", className: "jf-curso-card__ver", onClick: () => onAbrir(division.clave), "aria-label": `Ver alumnos de ${division.anio}°${division.division}` },
        "Ver Alumnos →"
      )
    )
  );
}

/* Opciones de cursos por vez; la primera es la inicial. */
const CURSOS_POR_PAGINA = [6, 10, 20, 30, 50];

function GrillaCursos({ divisiones, onAbrir }) {
  const [categoria, setCategoria] = useState("todos");
  const [anio, setAnio] = useState("todos");
  const [turno, setTurno] = useState("todos");
  /* Cuantos cursos se muestran: arranca en 6; "Ver más" suma otro tanto y se puede elegir 10, 20, 30 o 50 */
  const [paso, setPaso] = useState(CURSOS_POR_PAGINA[0]);
  const [limite, setLimite] = useState(CURSOS_POR_PAGINA[0]);

  const cuenta = useMemo(() => {
    const total = { todos: divisiones.length, basico: 0, informatica: 0, programacion: 0 };
    for (const division of divisiones) total[categoriaDeDivision(division)] += 1;
    return total;
  }, [divisiones]);

  const visibles = useMemo(
    () =>
      divisiones.filter((division) => {
        if (categoria !== "todos" && categoriaDeDivision(division) !== categoria) return false;
        if (anio !== "todos" && division.anio !== anio) return false;
        if (turno !== "todos" && turnoNormalizado(division.turnoAula) !== turno) return false;
        return true;
      }),
    [divisiones, categoria, anio, turno]
  );

  useEffect(() => {
    setLimite(paso);
  }, [categoria, anio, turno, paso]);

  const mostrados = visibles.slice(0, limite);
  const restantes = visibles.length - mostrados.length;

  const boton = (activo, onClick, etiqueta, clase) =>
    h("button", { key: etiqueta, type: "button", className: `${clase} ${activo ? "is-activo" : ""}`, "aria-pressed": activo, onClick }, etiqueta);

  return h(
    "div",
    { className: "jf-cursos-vista" },
    h(
      "div",
      { className: "jf-pildoras", role: "group", "aria-label": "Tipo de curso" },
      FILTROS_CATEGORIA.map(([valor, etiqueta]) => boton(categoria === valor, () => setCategoria(valor), `${etiqueta} (${cuenta[valor]})`, "jf-pildora"))
    ),
    h(
      "div",
      { className: "jf-filtros" },
      h(
        "div",
        { className: "jf-filtros__grupo", role: "group", "aria-label": "Año" },
        h("span", null, "Año:"),
        boton(anio === "todos", () => setAnio("todos"), "Todos", "jf-filtro"),
        [1, 2, 3, 4, 5, 6, 7].map((valor) => boton(anio === valor, () => setAnio(valor), `${valor}°`, "jf-filtro"))
      ),
      h(
        "div",
        { className: "jf-filtros__grupo", role: "group", "aria-label": "Turno" },
        h("span", null, "Turno:"),
        [["todos", "Todos"], ["mañana", "Mañana"], ["tarde", "Tarde"]].map(([valor, etiqueta]) => boton(turno === valor, () => setTurno(valor), etiqueta, "jf-filtro"))
      )
    ),
    visibles.length === 0
      ? h(EmptyState, { mensaje: "No hay cursos para ese filtro." })
      : h(
          "div",
          { className: "jf-curso-grilla" },
          mostrados.map((division) =>
            h(TarjetaCurso, {
              key: division.clave,
              division,
              onAbrir,
              grupos: gruposDeDivision(
                division.anio,
                division.division,
                divisiones.filter((item) => item.anio === division.anio).map((item) => item.division)
              )
            })
          )
        ),
    visibles.length > CURSOS_POR_PAGINA[0]
      ? h(
          "div",
          { className: "jf-paginar" },
          h("span", { className: "jf-paginar__cuenta" }, `Mostrando ${mostrados.length} de ${visibles.length} cursos`),
          h(
            "div",
            { className: "jf-filtros__grupo", role: "group", "aria-label": "Cursos por vez" },
            h("span", null, "Ver:"),
            CURSOS_POR_PAGINA.map((valor) => boton(paso === valor, () => setPaso(valor), String(valor), "jf-filtro"))
          ),
          restantes > 0
            ? h("button", { type: "button", className: "jf-boton jf-boton--secundario", onClick: () => setLimite((actual) => actual + paso) }, `Ver más (${Math.min(paso, restantes)})`)
            : h("button", { type: "button", className: "jf-boton jf-boton--secundario", onClick: () => setLimite(paso) }, "Ver menos")
        )
      : null
  );
}

/* ---------- Cronograma de un grupo ---------- */

function CronogramaGrupo({ grupo }) {
  const sesiones = CRONOGRAMA.filter((fila) => fila.grupo === grupo).sort(
    (a, b) => DIAS_TALLER.indexOf(a.dia) - DIAS_TALLER.indexOf(b.dia) || a.franja - b.franja
  );

  if (!sesiones.length) {
    return h("p", { className: "jf-grupo__vacio" }, "Este grupo no figura en la planilla de talleres de noviembre.");
  }

  return h(
    "ul",
    { className: "jf-sesiones" },
    sesiones.map((sesion, indice) =>
      h(
        "li",
        { key: `${sesion.dia}-${sesion.franja}-${indice}` },
        h("b", null, ETIQUETA_DIA[sesion.dia]),
        h("span", { className: "jf-sesiones__hora" }, sesion.horario),
        h("span", { className: "jf-sesiones__taller" }, sesion.taller),
        h("small", null, [sesion.aula, sesion.docente].filter(Boolean).join(" · ") || "Sin aula ni docente")
      )
    )
  );
}

function TarjetaGrupo({ letra, codigo, resumen }) {
  const sesiones = CRONOGRAMA.filter((fila) => fila.grupo === codigo);
  const turnos = [...new Set(sesiones.map((fila) => fila.turno))];
  const cupo = Math.max(0, ...sesiones.map((fila) => fila.alumnos ?? 0));

  return h(
    "article",
    { className: `jf-grupo jf-grupo--${letra.toLowerCase()}` },
    h(
      "header",
      null,
      h("span", { className: "jf-grupo__letra", "aria-hidden": "true" }, letra),
      h(
        "div",
        null,
        h("h3", null, `Grupo ${codigo}`),
        h("small", null, turnos.length ? `Taller de ${turnos.join(" y ")}${cupo ? ` · cupo ${cupo}` : ""}` : "Sin cronograma")
      ),
      h("strong", { className: "jf-grupo__total" }, resumen.total)
    ),
    h(
      "p",
      { className: "jf-grupo__generos" },
      h("span", null, `${resumen.F} mujeres`),
      h("span", null, `${resumen.M} varones`),
      resumen.X ? h("span", null, `${resumen.X} sin dato`) : null
    ),
    h(CronogramaGrupo, { grupo: codigo })
  );
}

/* ---------- Detalle del curso ---------- */

/* Estado del vinculo con el sistema: el grupo de cada alumno queda en su legajo. */
function BarraSistema({ grupos, total, pendientes, sync, onGuardar }) {
  const guardando = sync.estado === "guardando";
  const estado = sync.estado === "error" ? "error" : pendientes === 0 ? "ok" : "pendiente";
  const texto =
    estado === "ok"
      ? `Guardada en el sistema: cada alumno figura en el grupo ${grupos[0]} o ${grupos[1]} en su legajo y en los listados.`
      : estado === "error"
        ? sync.mensaje
        : `Todavía no está guardada en el sistema: ${pendientes} de ${total} alumnos sin grupo de taller en su legajo.`;

  return h(
    "div",
    { className: `jf-sync jf-sync--${estado}`, role: "status" },
    h("span", { className: "jf-sync__texto" }, guardando ? "Guardando en el sistema..." : texto),
    estado === "ok" && !guardando
      ? null
      : h("button", { type: "button", className: "jf-boton jf-boton--primario", disabled: guardando, onClick: onGuardar }, estado === "error" ? "Reintentar" : "Guardar en el sistema")
  );
}

/* Pantalla completa para la lista de asistencia del grupo (Escape o "Volver" la cierran). */
function PantallaCompleta({ onCerrar, children }) {
  useEffect(() => {
    const salir = (evento) => evento.key === "Escape" && onCerrar();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", salir);
    return () => {
      window.removeEventListener("keydown", salir);
      document.body.style.overflow = anterior;
    };
  }, [onCerrar]);
  return createPortal(h("div", { className: "jf-pantalla", role: "dialog", "aria-modal": "true" }, children), document.body);
}

function IconoAccion({ trazos }) {
  return h(
    "span",
    { className: "jf-impresion__icono", "aria-hidden": "true" },
    h("svg", { viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }, trazos.map((d, i) => h("path", { key: i, d })))
  );
}

/* Dos accesos por grupo de taller: "Ver calificador" (planilla de calificaciones del
   sistema, editable) y "Ver la lista" (libro de asistencia del sistema). Los dos
   trabajan solo con los alumnos del grupo elegido. */
function PanelCalificador({ division, grupos, ordenados, asignacion, docentesGrupo = {} }) {
  const [abierto, setAbierto] = useState(null); // { tipo: "calificador" | "lista", letra }

  const idsDe = (letra) => ordenados.filter((alumno) => (asignacion[alumno.id] === "B" ? "B" : "A") === letra).map((alumno) => alumno.id);
  const letra = abierto?.letra ?? "A";
  const indice = letra === "B" ? 1 : 0;
  const alumnoIds = useMemo(() => (abierto ? idsDe(abierto.letra) : null), [abierto, ordenados, asignacion]);
  const sesiones = abierto ? sesionesDeGrupo(grupos[indice]) : [];
  const asignado = docentesGrupo[grupos[indice]];
  const docentes = asignado || [...new Set(sesiones.map((sesion) => sesion.docente).filter(Boolean))].join(", ");
  const turno = [...new Set(sesiones.map((sesion) => String(sesion.turno ?? "").toLowerCase()).filter(Boolean))].join(" y ");
  const materia = `Taller · Grupo ${grupos[indice]}`;
  const cerrar = useCallback(() => setAbierto(null), []);

  const tarjeta = (tipo, titulo, texto, trazos) =>
    h(
      "section",
      { className: "jf-impresion", "aria-label": titulo },
      h(IconoAccion, { trazos }),
      h("div", { className: "jf-impresion__texto" }, h("h3", null, titulo), h("p", null, texto)),
      h(
        "div",
        { className: "jf-impresion__botones" },
        ["A", "B"].map((l, i) =>
          h("button", { key: l, type: "button", className: `jf-boton jf-boton--grupo-${l.toLowerCase()}`, onClick: () => setAbierto({ tipo, letra: l }) }, `Grupo ${grupos[i]}`)
        )
      )
    );

  return h(
    "div",
    { className: "jf-acciones" },
    tarjeta("calificador", "Ver calificador", "Planilla de calificaciones del grupo, con las notas editables.", ["M8 4h8l3 3v13H5V4z", "M8 11h8M8 15h8"]),
    tarjeta("lista", "Ver la lista", "Libro de asistencia del grupo para tomar asistencia.", ["M9 6h11M9 12h11M9 18h11", "M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"]),
    abierto?.tipo === "calificador"
      ? h(PlanillaCalificacionesModal, {
          abierto: true,
          onCerrar: cerrar,
          esDocente: true,
          profesorNombre: docentes || null,
          materiaInicial: "Taller",
          tituloMateria: materia,
          soloAlumnosIds: alumnoIds,
          asignacionesDocente: [{ anio: division.anio, curso: `${division.anio}°`, division: String(division.division), materia, turno: turno || undefined }]
        })
      : null,
    abierto?.tipo === "lista"
      ? h(
          PantallaCompleta,
          { onCerrar: cerrar },
          h(AsistenciasView, {
            modoDocente: true,
            onVolver: cerrar,
            grupoTaller: {
              id: `${division.anio}-${division.division}`,
              curso: `${division.anio}°`,
              division: String(division.division),
              turno: turno ? turno.charAt(0).toUpperCase() + turno.slice(1) : undefined,
              materia,
              docentes: docentes || undefined,
              alumnoIds
            }
          })
        )
      : null
  );
}

function DetalleCurso({ division, grupos, escuela, docentesGrupo, onAsignacionGuardada }) {
  const [alumnos, setAlumnos] = useState(null);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState({ modo: "equilibrado", corte: null, manual: {} });
  const [rango, setRango] = useState({ desde: null, hasta: null });
  const [desplegada, setDesplegada] = useState(false);
  /* Grupo de taller que ya figura en el legajo de cada alumno ({ [id]: "1.1" | null }) */
  const [guardadoApi, setGuardadoApi] = useState({});
  const [sync, setSync] = useState({ estado: "ok", mensaje: null });
  const tocado = useRef(false);
  const clave = division.clave;

  const cargar = useCallback(() => {
    let vigente = true;
    setAlumnos(null);
    setError(null);
    StudentsService.getTodosLosAlumnos({ curso: `${division.anio}°`, division: division.division, estado: "activo" })
      .then(({ data }) => {
        if (!vigente) return;
        setGuardadoApi(Object.fromEntries(data.map((alumno) => [alumno.id, alumno.grupoTaller ?? null])));
        setAlumnos(data);
      })
      .catch((err) => vigente && setError(err.mensaje || err.message || "No se pudo consultar la lista del curso."));
    return () => {
      vigente = false;
    };
  }, [division.anio, division.division]);

  useEffect(() => cargar(), [cargar]);

  useEffect(() => {
    setConfig(leerGuardado(clave));
    setRango({ desde: null, hasta: null });
    setDesplegada(false);
    tocado.current = false;
    setSync({ estado: "ok", mensaje: null });
  }, [clave]);

  const configRef = useRef(config);
  configRef.current = config;

  const actualizar = useCallback(
    (cambios) => {
      tocado.current = true;
      setConfig((anterior) => {
        const siguiente = { ...anterior, ...cambios };
        guardar(clave, siguiente);
        return siguiente;
      });
    },
    [clave]
  );

  const ordenados = useMemo(() => ordenarAlumnos(alumnos ?? []), [alumnos]);
  const total = ordenados.length;
  const corteActual = Math.max(0, Math.min(total, config.corte ?? cortePorMitad(total)));

  const asignacion = useMemo(
    () => construirAsignacion({ alumnos: ordenados, modo: config.modo, corte: corteActual, manual: config.manual }),
    [ordenados, config.modo, corteActual, config.manual]
  );
  const resumen = useMemo(() => resumirGrupos(ordenados, asignacion), [ordenados, asignacion]);

  const visibles = desplegada ? total : Math.min(total, LIMITE_LISTA);
  const ocultos = total - visibles;

  const hayCambiosManuales = Object.keys(config.manual).length > 0;

  /* ---- Vinculo con el sistema: el grupo de taller vive en el legajo de cada alumno ---- */
  const codigoDe = (letra) => grupos[letra === "B" ? 1 : 0];

  /* Al abrir el curso, lo que ya esta guardado en el sistema manda sobre lo recordado en este navegador. */
  useEffect(() => {
    if (!alumnos) return;
    const letraGuardada = (alumno) => (alumno.grupoTaller === grupos[0] ? "A" : alumno.grupoTaller === grupos[1] ? "B" : null);
    if (!alumnos.some(letraGuardada)) return;

    const actual = configRef.current;
    const lista = ordenarAlumnos(alumnos);
    const corteInicial = Math.max(0, Math.min(lista.length, actual.corte ?? cortePorMitad(lista.length)));
    const base = construirAsignacion({ alumnos: lista, modo: actual.modo, corte: corteInicial, manual: {} });
    const manual = {};
    for (const alumno of lista) {
      const letra = letraGuardada(alumno);
      if (letra && letra !== base[alumno.id]) manual[alumno.id] = letra;
    }
    const igual = JSON.stringify(Object.entries(manual).sort()) === JSON.stringify(Object.entries(actual.manual).sort());
    if (igual) return;
    const siguiente = { ...actual, manual };
    setConfig(siguiente);
    guardar(clave, siguiente);
  }, [alumnos]);

  const pendientes = useMemo(
    () => ordenados.filter((alumno) => (guardadoApi[alumno.id] ?? null) !== codigoDe(asignacion[alumno.id])).length,
    [ordenados, asignacion, guardadoApi, grupos]
  );

  const guardarEnSistema = useCallback(async () => {
    setSync({ estado: "guardando", mensaje: null });
    try {
      await JefaturaService.guardarDivisionTalleres({
        anio: division.anio,
        division: String(division.division),
        grupos: { A: grupos[0], B: grupos[1] },
        asignaciones: Object.fromEntries(ordenados.map((alumno) => [alumno.id, asignacion[alumno.id] === "B" ? "B" : "A"]))
      });
      setGuardadoApi(Object.fromEntries(ordenados.map((alumno) => [alumno.id, codigoDe(asignacion[alumno.id])])));
      setSync({ estado: "ok", mensaje: null });

      const detalleEvento = {
        clave: division.clave,
        anio: division.anio,
        division: division.division
      };
      if (typeof onAsignacionGuardada === "function") {
        onAsignacionGuardada(detalleEvento);
      }
      try {
        window.dispatchEvent(new CustomEvent("prece:talleres-asignados", { detail: detalleEvento }));
      } catch {}
    } catch (err) {
      const texto = err?.mensaje || err?.message || "";
      setSync({
        estado: "error",
        mensaje: /^No se encontr/i.test(texto)
          ? "El servidor que está corriendo todavía no tiene el guardado de talleres. Reiniciá la API (cerrá la terminal de npm run dev y volvé a abrirla) y tocá Reintentar."
          : texto || "No se pudo guardar la división en el sistema."
      });
    }
  }, [division.anio, division.division, division.clave, grupos, ordenados, asignacion, onAsignacionGuardada]);

  /* Cada cambio hecho por la jefatura se guarda solo en el sistema. */
  useEffect(() => {
    if (!tocado.current || pendientes === 0 || sync.estado === "guardando") return undefined;
    const espera = setTimeout(guardarEnSistema, 700);
    return () => clearTimeout(espera);
  }, [asignacion]);
  const enRango = (indice) =>
    rango.desde !== null && rango.hasta !== null && indice >= Math.min(rango.desde, rango.hasta) && indice <= Math.max(rango.desde, rango.hasta);

  const marcarPunto = (indice) => {
    setRango((actual) =>
      actual.desde === null || actual.hasta !== null ? { desde: indice, hasta: null } : { desde: actual.desde, hasta: indice }
    );
  };

  const pasarRango = (letra) => {
    if (rango.desde === null) return;
    const hasta = rango.hasta ?? rango.desde;
    actualizar({ manual: asignarRango(asignacion, ordenados, rango.desde, hasta, letra) });
    setRango({ desde: null, hasta: null });
  };

  const encabezado = h(
    "header",
    { className: "jf-detalle__cabecera" },
    h(
      "div",
      null,
      h("p", { className: "jf-eyebrow" }, [ETIQUETA_CICLO[cicloDeAnio(division.anio)], division.orientacion !== "Ciclo Básico" ? division.orientacion : null].filter(Boolean).join(" · ")),
      h("div", { className: "jf-detalle__titulo" }, h("h2", null, `${division.anio}°${division.division}`), h(InsigniasGrupos, { grupos })),
      h("p", { className: "jf-detalle__meta" }, `Aula de ${division.turnoAula} · ${textoAlumnos(division.activos)} ${division.activos === 1 ? "activo" : "activos"}`)
    )
  );

  if (error) return h("div", { className: "jf-detalle" }, encabezado, h(ErrorState, { mensaje: error, onRetry: cargar }));
  if (!alumnos) return h("div", { className: "jf-detalle" }, encabezado, h(LoadingState, { mensaje: "Cargando la lista del curso..." }));
  if (!total) {
    return h(
      "div",
      { className: "jf-detalle" },
      encabezado,
      h(PanelCalificador, { division, grupos, ordenados, asignacion, docentesGrupo }),
      h(
        "div",
        { className: "jf-grupos" },
        h(TarjetaGrupo, { letra: "A", codigo: grupos[0], resumen: GRUPO_VACIO }),
        h(TarjetaGrupo, { letra: "B", codigo: grupos[1], resumen: GRUPO_VACIO })
      ),
      h(EmptyState, { mensaje: "Este curso todavía no tiene alumnos activos cargados. Cuando se carguen vas a poder dividir la lista acá." })
    );
  }

  return h(
    "div",
    { className: "jf-detalle" },
    encabezado,
    h(BarraSistema, { grupos, total, pendientes, sync, onGuardar: guardarEnSistema }),
    h(PanelCalificador, { division, grupos, ordenados, asignacion, docentesGrupo }),
    h(
      "div",
      { className: "jf-grupos" },
      h(TarjetaGrupo, { letra: "A", codigo: grupos[0], resumen: resumen.A }),
      h(TarjetaGrupo, { letra: "B", codigo: grupos[1], resumen: resumen.B })
    ),
    h(
      "section",
      { className: "jf-herramientas", "aria-label": "Dividir la lista" },
      h(
        "div",
        { className: "jf-herramientas__bloque" },
        h("h3", null, "Cómo dividir"),
        h(
          "div",
          { className: "jf-segmentos", role: "group", "aria-label": "Modo de división" },
          h(
            "button",
            {
              type: "button",
              className: config.modo === "equilibrado" && !hayCambiosManuales ? "is-activo" : "",
              onClick: () => {
                actualizar({ modo: "equilibrado", corte: null, manual: {} });
                setRango({ desde: null, hasta: null });
              }
            },
            "Parejo por género"
          ),
          h(
            "button",
            {
              type: "button",
              className: config.modo === "corte" && !hayCambiosManuales ? "is-activo" : "",
              onClick: () => {
                actualizar({ modo: "corte", corte: cortePorMitad(total), manual: {} });
                setRango({ desde: null, hasta: null });
              }
            },
            "Mitades de la lista"
          )
        ),
        h(
          "label",
          { className: "jf-corte" },
          h("span", null, `Corte: los primeros ${corteActual} van al grupo ${grupos[0]}`),
          h("input", {
            type: "range",
            min: 0,
            max: total,
            value: corteActual,
            onChange: (evento) => actualizar({ modo: "corte", corte: Number(evento.target.value), manual: {} })
          })
        )
      ),
      h(
        "div",
        { className: "jf-herramientas__bloque" },
        h("h3", null, "Mover un tramo"),
        h(
          "p",
          { className: "jf-ayuda" },
          rango.desde === null
            ? "Tocá el número del primer alumno del tramo y después el del último."
            : rango.hasta === null
              ? `Desde el n.º ${rango.desde + 1}. Ahora tocá el número donde termina el tramo.`
              : `Tramo del n.º ${Math.min(rango.desde, rango.hasta) + 1} al n.º ${Math.max(rango.desde, rango.hasta) + 1}.`
        ),
        h(
          "div",
          { className: "jf-herramientas__botones" },
          ["A", "B"].map((letra, indice) =>
            h(
              "button",
              {
                key: letra,
                type: "button",
                className: `jf-boton jf-boton--grupo-${letra.toLowerCase()}`,
                disabled: rango.desde === null,
                onClick: () => pasarRango(letra)
              },
              `Pasar a grupo ${grupos[indice]}`
            )
          ),
          h(
            "button",
            {
              type: "button",
              className: "jf-boton jf-boton--texto",
              disabled: rango.desde === null,
              onClick: () => setRango({ desde: null, hasta: null })
            },
            "Quitar selección"
          )
        )
      ),
      hayCambiosManuales
        ? h(
            "div",
            { className: "jf-herramientas__aviso", role: "status" },
            h("span", null, "Hay cambios manuales sobre la división base."),
            h(
              "button",
              {
                type: "button",
                className: "jf-boton jf-boton--texto",
                onClick: () => actualizar({ manual: {} })
              },
              "Volver a la división base"
            )
          )
        : null
    ),
    h(
      "div",
      { className: "jf-tabla-wrap" },
      h(
        "table",
        { className: "jf-tabla jf-lista" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", { scope: "col", className: "jf-lista__n" }, "N.º"),
            h("th", { scope: "col" }, "Apellido y nombre"),
            h("th", { scope: "col" }, "Género"),
            h("th", { scope: "col" }, "Grupo de taller"),
            h("th", { scope: "col", className: "jf-lista__accion" }, "Corte")
          )
        ),
        h(
          "tbody",
          null,
          ordenados.slice(0, visibles).map((alumno, indice) => {
            const letra = asignacion[alumno.id] === "B" ? "B" : "A";
            const genero = generoDe(alumno.genero);
            const esPunto = indice === rango.desde || indice === rango.hasta;
            const hayCorteDespues = config.modo === "corte" && !hayCambiosManuales && indice + 1 === corteActual && corteActual < total;

            return h(
              "tr",
              {
                key: alumno.id,
                className: [`jf-lista__fila--${letra.toLowerCase()}`, enRango(indice) || esPunto ? "is-en-rango" : "", hayCorteDespues ? "jf-lista__fila--corte" : ""]
                  .filter(Boolean)
                  .join(" ")
              },
              h(
                "td",
                { className: "jf-lista__n" },
                h(
                  "button",
                  {
                    type: "button",
                    className: `jf-numero ${esPunto ? "is-punto" : ""}`,
                    "aria-pressed": esPunto,
                    "aria-label": `Marcar al alumno n.º ${indice + 1} como límite del tramo`,
                    onClick: () => marcarPunto(indice)
                  },
                  indice + 1
                )
              ),
              h("td", null, h("strong", null, alumno.apellido), `, ${alumno.nombre}`),
              h("td", null, h("span", { className: `jf-genero jf-genero--${genero.toLowerCase()}` }, ETIQUETA_GENERO[genero])),
              h(
                "td",
                null,
                h(
                  "button",
                  {
                    type: "button",
                    className: `jf-chip-grupo jf-chip-grupo--${letra.toLowerCase()}`,
                    title: "Cambiar de grupo",
                    onClick: () => actualizar({ manual: alternarGrupo(asignacion, alumno.id) })
                  },
                  `Grupo ${grupos[letra === "A" ? 0 : 1]}`
                )
              ),
              h(
                "td",
                { className: "jf-lista__accion" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "jf-boton jf-boton--texto jf-boton--chico",
                    title: `Cortar la lista después de ${alumno.apellido}`,
                    onClick: () => {
                      actualizar({ modo: "corte", corte: indice + 1, manual: {} });
                      setRango({ desde: null, hasta: null });
                    }
                  },
                  "Cortar acá"
                )
              )
            );
          })
        )
      )
    ),
    total > LIMITE_LISTA
      ? h(
          "button",
          { type: "button", className: "jf-desplegar", "aria-expanded": desplegada, onClick: () => setDesplegada((valor) => !valor) },
          desplegada ? "Mostrar menos" : `Ver los ${ocultos} alumnos restantes`,
          h("span", { className: `jf-desplegar__flecha ${desplegada ? "is-abierta" : ""}`, "aria-hidden": "true" }, "▾")
        )
      : null,
    h(
      "p",
      { className: "jf-nota" },
      "La división queda guardada en este navegador. Todavía no se envía a los legajos de los alumnos."
    )
  );
}

/* ---------- Vista ---------- */

export default function JefaturaTalleresView({ escuela = "E.E.S.T. N°1 Cecilia Berdichevski", cursoSeleccionado = null, onVolver = null, onAsignacionGuardada = null } = {}) {
  const [divisiones, setDivisiones] = useState(null);
  const [error, setError] = useState(null);
  const [seleccion, setSeleccion] = useState(cursoSeleccionado);
  const [docentesGrupo, setDocentesGrupo] = useState({});

  useEffect(() => {
    if (cursoSeleccionado) {
      setSeleccion(cursoSeleccionado);
    }
  }, [cursoSeleccionado]);

  /* Profes que la direccion asigno a cada grupo; si falla, se usan los de la planilla de horarios. */
  useEffect(() => {
    let vigente = true;
    JefaturaService.listarDocentesTalleres()
      .then((lista) => {
        if (!vigente) return;
        setDocentesGrupo(Object.fromEntries((lista ?? []).map((item) => [item.grupo, item.docente?.nombre]).filter(([, nombre]) => nombre)));
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [seleccion]);

  const cargar = useCallback(() => {
    let vigente = true;
    setError(null);
    StudentsService.getDivisiones()
      .then((lista) => {
        if (!vigente) return;
        const ordenadas = divisionesVisibles(lista ?? []).sort((a, b) => a.anio - b.anio || Number(a.division) - Number(b.division));
        setDivisiones(ordenadas);
      })
      .catch((err) => vigente && setError(err.mensaje || err.message || "No se pudieron consultar los cursos."));
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => cargar(), [cargar]);

  if (error) return h(ErrorState, { mensaje: error, onRetry: cargar });
  if (!divisiones) return h(LoadingState, { mensaje: "Cargando cursos..." });
  if (!divisiones.length) return h(EmptyState, { mensaje: "No hay cursos cargados." });

  const division = divisiones.find((item) => item.clave === seleccion);

  if (!division) {
    return h("div", { className: "jf-talleres" }, h(GrillaCursos, { divisiones, onAbrir: setSeleccion }));
  }

  const grupos = gruposDeDivision(
    division.anio,
    division.division,
    divisiones.filter((item) => item.anio === division.anio).map((item) => item.division)
  );

  return h(
    "div",
    { className: "jf-talleres" },
    h("button", { type: "button", className: "jf-volver", onClick: () => { setSeleccion(null); if (onVolver) onVolver(); } }, "← Volver a los cursos"),
    h(DetalleCurso, { key: division.clave, division, grupos, escuela, docentesGrupo, onAsignacionGuardada })
  );
}
