import { useCallback, useEffect, useMemo, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { StudentsService } from "../students/students-service.js";
import { LoadingState, EmptyState } from "../../components/common/state-handlers.js";
import {
  ESTADOS_ASISTENCIA,
  PreceptorService,
  agruparAulasPorPlanta,
  calcularResumen,
  calcularResumenAulas,
  claseDeAula,
  estadoDesdeTecla,
  etiquetaEstado,
  fechaDeHoy,
  formatearFechaLarga,
  horaActual,
  textoAula
} from "./preceptor-service.js";

const ACCESOS = [
  {
    id: "planilla",
    titulo: "Planilla de asistencia",
    descripcion: "Abrir el libro mensual del curso seleccionado.",
    icono: "attendance",
    href: (cursoId) => `#/preceptor/asistencia?curso=${cursoId}`
  },
  {
    id: "observaciones",
    titulo: "Observaciones",
    descripcion: "Registrar y consultar observaciones de alumnos.",
    icono: "activity",
    href: () => "#/preceptoria/observaciones"
  },
  {
    id: "alumnos",
    titulo: "Directorio de alumnos",
    descripcion: "Consultar legajos, contactos y situacion academica.",
    icono: "students",
    href: () => "#/alumnos"
  },
  {
    id: "notificaciones",
    titulo: "Notificaciones",
    descripcion: "Revisar alertas y avisos institucionales.",
    icono: "alert",
    href: () => "#/notificaciones"
  }
];

function cursoOrden(a, b) {
  const anio = Number(a.anio) - Number(b.anio);
  if (anio !== 0) return anio;
  return String(a.division).localeCompare(String(b.division), "es", { numeric: true });
}

/* StudentsService.getDivisiones() numera las divisiones en `id` (1, 2, 3...)
   y deja la clave real "<anio>-<division>" en `clave`: el tablero y la API de
   preceptoria trabajan con esa clave. */
function normalizarCurso(division) {
  return {
    id: division.clave || `${division.anio}-${division.division}`,
    anio: Number(division.anio) || 1,
    division: String(division.division ?? ""),
    turno: division.turnoAula || division.turno || "manana",
    orientacion: division.orientacion || "Ciclo Basico",
    activos: Number(division.activos ?? division.cantidad) || 0
  };
}

function nombreDeCurso(curso) {
  if (!curso) return "Seleccionar curso";
  const turno = String(curso.turno).toLowerCase().includes("tarde") ? "Tarde" : "Manana";
  return `${curso.anio}\u00b0 ${curso.division} - ${turno}`;
}

function EstadoBadge({ estado }) {
  return h(
    "span",
    { className: `preceptor-estado-badge preceptor-estado-badge--${estado || "sin"}` },
    etiquetaEstado(estado)
  );
}

function AulaCard({ aula }) {
  const clase = claseDeAula(aula);
  const estadoClase = `preceptor-aula--${aula.estado}`;

  return h(
    "article",
    { className: `preceptor-aula ${estadoClase}` },
    h(
      "div",
      { className: "preceptor-aula__top" },
      h("strong", { className: "preceptor-aula__nombre" }, aula.nombre),
      h("span", { className: `preceptor-aula__estado preceptor-aula__estado--${aula.estado}` },
        aula.estado === "ocupada" ? "Ocupada" : aula.estado === "mantenimiento" ? "Mantenimiento" : "Libre"
      )
    ),
    h("p", { className: "preceptor-aula__detalle" }, textoAula(aula)),
    clase
      ? h(
          "div",
          { className: "preceptor-aula__meta" },
          h("span", null, `${clase.desde} - ${clase.hasta}`),
          clase.docente ? h("span", null, clase.docente.nombre) : null
        )
      : null
  );
}

function Stat({ label, value, tone }) {
  return h(
    "div",
    { className: `preceptor-stat preceptor-stat--${tone}` },
    h("span", { className: "preceptor-stat__value" }, value),
    h("span", { className: "preceptor-stat__label" }, label)
  );
}

export default function PreceptorDashboardView() {
  const user = useUsuarioActual();
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState("");
  const [fecha, setFecha] = useState(fechaDeHoy());
  const [alumnos, setAlumnos] = useState([]);
  const [contexto, setContexto] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [resumenAulas, setResumenAulas] = useState({ total: 0, ocupadas: 0, libres: 0, mantenimiento: 0 });
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [cargandoAulas, setCargandoAulas] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState({});
  const [observaciones, setObservaciones] = useState({});
  const [filtroAulas, setFiltroAulas] = useState("todas");

  const cicloLectivo = user?.cicloLectivo || new Date().getFullYear();
  const nombre = user?.nombre || user?.displayName || "Preceptor";
  const escuela = user?.escuela || "E.E.S.T N\u00b0 1 Monte Grande";

  const cargarAulas = useCallback(async () => {
    setCargandoAulas(true);
    try {
      const respuesta = await PreceptorService.getEstadoAulas({ fecha: fechaDeHoy(), hora: horaActual() });
      const lista = respuesta?.data ?? [];
      setAulas(lista);
      setResumenAulas(respuesta?.resumen ?? calcularResumenAulas(lista));
    } catch (fallo) {
      setError(fallo?.mensaje || "No se pudo consultar el estado de las aulas.");
    } finally {
      setCargandoAulas(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;

    StudentsService.getDivisiones()
      .then((divisiones) => {
        if (!activo) return;
        const lista = (divisiones || []).map(normalizarCurso).sort(cursoOrden);
        setCursos(lista);

        if (lista.length > 0) {
          const asignacion = user?.assignments?.find((item) => item.courseId || item.curso);
          const anioAsignado = Number(String(asignacion?.anio ?? asignacion?.curso ?? "").replace(/\D/g, ""));
          const divisionAsignada = String(asignacion?.division ?? "").trim();
          const propia = lista.find(
            (curso) => curso.anio === anioAsignado && curso.division === divisionAsignada
          );
          const conAlumnos = lista.find((curso) => curso.activos > 0);
          setCursoId((actual) => actual || propia?.id || conAlumnos?.id || lista[0].id);
        }
      })
      .catch((fallo) => {
        if (activo) setError(fallo?.mensaje || "No se pudieron cargar los cursos.");
      })
      .finally(() => {
        if (activo) setCargandoCursos(false);
      });

    return () => {
      activo = false;
    };
  }, [user]);

  const cargarAlumnos = useCallback(async () => {
    if (!cursoId) return;
    setCargandoAlumnos(true);
    setError(null);

    try {
      const respuesta = await PreceptorService.getAlumnosCurso(cursoId, fecha);
      const lista = respuesta?.data ?? [];
      setAlumnos(lista);
      setContexto(respuesta?.contexto ?? null);
      setObservaciones(
        Object.fromEntries(lista.map((alumno) => [alumno.id, alumno.asistencia?.observaciones ?? ""]))
      );
    } catch (fallo) {
      setAlumnos([]);
      setContexto(null);
      setError(fallo?.mensaje || "No se pudieron cargar los alumnos del curso.");
    } finally {
      setCargandoAlumnos(false);
    }
  }, [cursoId, fecha]);

  useEffect(() => {
    cargarAlumnos();
  }, [cargarAlumnos]);

  useEffect(() => {
    cargarAulas();
    const intervalo = window.setInterval(cargarAulas, 60000);
    return () => window.clearInterval(intervalo);
  }, [cargarAulas]);

  useEffect(() => {
    if (!mensaje) return undefined;
    const temporizador = window.setTimeout(() => setMensaje(null), 3200);
    return () => window.clearTimeout(temporizador);
  }, [mensaje]);

  const resumen = useMemo(() => calcularResumen(alumnos), [alumnos]);
  const cursoSeleccionado = cursos.find((curso) => curso.id === cursoId) || null;
  const gruposAulas = useMemo(() => agruparAulasPorPlanta(aulas), [aulas]);
  const aulasFiltradas = useMemo(
    () => gruposAulas
      .map((grupo) => ({
        ...grupo,
        aulas: filtroAulas === "todas" ? grupo.aulas : grupo.aulas.filter((aula) => aula.estado === filtroAulas)
      }))
      .filter((grupo) => grupo.aulas.length > 0),
    [gruposAulas, filtroAulas]
  );

  async function marcarAsistencia(alumno, estado) {
    if (guardando[alumno.id]) return;

    setGuardando((prev) => ({ ...prev, [alumno.id]: true }));
    setError(null);

    try {
      const respuesta = await PreceptorService.registrarAsistencia({
        cursoId,
        fecha,
        alumnoId: alumno.id,
        estado,
        observaciones: observaciones[alumno.id] ?? ""
      });
      const guardado = respuesta?.data?.[0];

      setAlumnos((prev) =>
        prev.map((item) =>
          item.id === alumno.id
            ? {
                ...item,
                asistencia: {
                  estado: guardado?.estado ?? estado,
                  observaciones: guardado?.observaciones ?? observaciones[alumno.id] ?? null,
                  actualizadoEn: guardado?.actualizadoEn ?? new Date().toISOString()
                }
              }
            : item
        )
      );
      setMensaje(`${alumno.nombreCompleto}: ${etiquetaEstado(estado).toLowerCase()} registrado.`);
    } catch (fallo) {
      setError(fallo?.mensaje || "No se pudo registrar la asistencia.");
    } finally {
      setGuardando((prev) => ({ ...prev, [alumno.id]: false }));
    }
  }

  function alPresionarTecla(evento, alumno) {
    if (evento.target !== evento.currentTarget) return;
    const estado = estadoDesdeTecla(evento.key);
    if (!estado) return;
    evento.preventDefault();
    marcarAsistencia(alumno, estado);
  }

  return h(
    "section",
    { className: "preceptor-dashboard" },

    h(
      "div",
      { className: "preceptor-topbar" },
      h("span", { className: "preceptor-eyebrow" }, `${escuela} \u00b7 Preceptoria`),
      h(
        "div",
        { className: "preceptor-topbar__actions" },
        h("span", { className: "preceptor-ciclo" }, `Ciclo lectivo ${cicloLectivo}`),
        h(
          "button",
          {
            type: "button",
            className: "preceptor-refresh",
            onClick: () => {
              cargarAlumnos();
              cargarAulas();
            },
            disabled: cargandoAlumnos || cargandoAulas
          },
          h(IconoFigma, { className: "preceptor-refresh__icon", nombre: "filter" }),
          cargandoAlumnos || cargandoAulas ? "Actualizando..." : "Actualizar tablero"
        )
      )
    ),

    h(
      "header",
      { className: "preceptor-hero" },
      h(
        "div",
        { className: "preceptor-hero__content" },
        h("span", { className: "preceptor-hero__eyebrow" }, `Preceptoria institucional \u00b7 ${cicloLectivo}`),
        h("h1", { className: "preceptor-hero__title" }, `Hola, ${nombre}`),
        h(
          "p",
          { className: "preceptor-hero__subtitle" },
          "Control diario de asistencia, aulas en vivo y seguimiento de los alumnos del curso a cargo."
        ),
        h(
          "div",
          { className: "preceptor-hero__badges" },
          h("span", { className: "preceptor-hero__badge" }, "Rol Preceptor"),
          h("span", { className: "preceptor-hero__badge" }, formatearFechaLarga(fecha))
        )
      ),
      h(
        "div",
        { className: "preceptor-hero__panel" },
        h("span", { className: "preceptor-hero__panel-label" }, "Aulas ocupadas ahora"),
        h("strong", { className: "preceptor-hero__panel-value" }, `${resumenAulas.ocupadas} / ${resumenAulas.total}`),
        h("span", { className: "preceptor-hero__panel-hint" }, `${resumenAulas.libres} libres \u00b7 ${resumenAulas.mantenimiento} en mantenimiento`)
      )
    ),

    h(
      "div",
      { className: "preceptor-coursebar" },
      h(
        "label",
        { className: "preceptor-field" },
        h("span", { className: "preceptor-field__label" }, "Curso"),
        h(
          "select",
          {
            className: "preceptor-field__control",
            value: cursoId,
            onChange: (evento) => setCursoId(evento.target.value),
            disabled: cargandoCursos
          },
          cargandoCursos
            ? h("option", { value: "" }, "Cargando cursos...")
            : cursos.map((curso) =>
                h(
                  "option",
                  { key: curso.id, value: curso.id },
                  `${nombreDeCurso(curso)} (${curso.activos} alumnos)`
                )
              )
        )
      ),
      h(
        "label",
        { className: "preceptor-field preceptor-field--date" },
        h("span", { className: "preceptor-field__label" }, "Fecha"),
        h("input", {
          className: "preceptor-field__control",
          type: "date",
          value: fecha,
          max: fechaDeHoy(),
          onChange: (evento) => setFecha(evento.target.value)
        })
      ),
      h(
        "div",
        { className: "preceptor-coursebar__context" },
        h("strong", null, contexto?.cursoLabel || nombreDeCurso(cursoSeleccionado)),
        h("span", null, `${contexto?.turno ? String(contexto.turno).charAt(0).toUpperCase() + String(contexto.turno).slice(1) : "Turno"} \u00b7 ${contexto?.orientacion || "Ciclo Basico"}`)
      ),
      h(
        "a",
        { className: "preceptor-coursebar__link", href: `#/preceptor/asistencia?curso=${cursoId || ""}` },
        h(IconoFigma, { className: "preceptor-coursebar__icon", nombre: "attendance" }),
        "Ver planilla mensual"
      )
    ),

    h(
      "div",
      { className: "preceptor-quick-grid" },
      ACCESOS.map((acceso) =>
        h(
          "a",
          { key: acceso.id, className: "preceptor-quick-card", href: acceso.href(cursoId) },
          h("span", { className: "preceptor-quick-card__icon" }, h(IconoFigma, { nombre: acceso.icono })),
          h(
            "span",
            { className: "preceptor-quick-card__text" },
            h("strong", null, acceso.titulo),
            h("small", null, acceso.descripcion)
          )
        )
      )
    ),

    !cargandoCursos && cursos.length === 0
      ? h("div", { className: "preceptor-feedback preceptor-feedback--error" }, "No tenés divisiones asignadas. Dirección las asigna desde la sección de asignaciones.")
      : null,
    mensaje ? h("div", { className: "preceptor-feedback preceptor-feedback--ok" }, mensaje) : null,
    error ? h("div", { className: "preceptor-feedback preceptor-feedback--error" }, error) : null,

    h(
      "div",
      { className: "preceptor-layout" },
      h(
        "section",
        { className: "preceptor-panel preceptor-panel--attendance" },
        h(
          "header",
          { className: "preceptor-panel__header" },
          h(
            "div",
            null,
            h("h2", null, "Asistencia diaria"),
            h("p", null, `${contexto?.cursoLabel || nombreDeCurso(cursoSeleccionado)} \u00b7 ${formatearFechaLarga(fecha)}`)
          ),
          h("span", { className: "preceptor-panel__hint" }, "Usa P / A / T en la fila")
        ),
        h(
          "div",
          { className: "preceptor-stats" },
          h(Stat, { label: "Presentes", value: resumen.presentes, tone: "presente" }),
          h(Stat, { label: "Ausentes", value: resumen.ausentes, tone: "ausente" }),
          h(Stat, { label: "Tarde", value: resumen.tarde, tone: "tarde" }),
          h(Stat, { label: "Sin registrar", value: resumen.sinRegistrar, tone: "sin" })
        ),
        cargandoAlumnos
          ? h(LoadingState, { mensaje: "Cargando alumnos del curso..." })
          : alumnos.length === 0
            ? h(EmptyState, { mensaje: "No hay alumnos activos en este curso." })
            : h(
                "div",
                { className: "preceptor-table-wrap" },
                h(
                  "table",
                  { className: "preceptor-table" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", null, "Alumno"),
                      h("th", null, "DNI"),
                      h("th", null, "Estado"),
                      h("th", null, "Observacion"),
                      h("th", { className: "preceptor-table__actions-col" }, "Registrar")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    alumnos.map((alumno) =>
                      h(
                        "tr",
                        {
                          key: alumno.id,
                          className: `preceptor-row preceptor-row--${alumno.asistencia?.estado || "sin"}`,
                          tabIndex: 0,
                          onKeyDown: (evento) => alPresionarTecla(evento, alumno)
                        },
                        h(
                          "td",
                          null,
                          h("strong", { className: "preceptor-row__name" }, alumno.nombreCompleto),
                          h("small", { className: "preceptor-row__sub" }, alumno.condicion || "Regular")
                        ),
                        h("td", { className: "preceptor-row__dni" }, alumno.dni || "-"),
                        h("td", null, h(EstadoBadge, { estado: alumno.asistencia?.estado })),
                        h(
                          "td",
                          null,
                          h("input", {
                            className: "preceptor-obs-input",
                            type: "text",
                            maxLength: 255,
                            placeholder: "Agregar observacion...",
                            value: observaciones[alumno.id] ?? "",
                            onChange: (evento) =>
                              setObservaciones((prev) => ({ ...prev, [alumno.id]: evento.target.value })),
                            "aria-label": `Observacion de ${alumno.nombreCompleto}`
                          })
                        ),
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { className: "preceptor-attendance-actions" },
                            ESTADOS_ASISTENCIA.map((estado) =>
                              h(
                                "button",
                                {
                                  key: estado.valor,
                                  type: "button",
                                  className: `preceptor-attendance-btn preceptor-attendance-btn--${estado.valor} ${alumno.asistencia?.estado === estado.valor ? "is-active" : ""}`,
                                  onClick: () => marcarAsistencia(alumno, estado.valor),
                                  disabled: Boolean(guardando[alumno.id]),
                                  "aria-pressed": alumno.asistencia?.estado === estado.valor,
                                  title: `${estado.etiqueta} (${estado.tecla})`
                                },
                                estado.corto
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
      ),

      h(
        "section",
        { className: "preceptor-panel preceptor-panel--rooms" },
        h(
          "header",
          { className: "preceptor-panel__header" },
          h(
            "div",
            null,
            h("h2", null, "Aulas en vivo"),
            h("p", null, `${horaActual()} \u00b7 Actualizacion automatica cada minuto`)
          ),
          h(
            "div",
            { className: "preceptor-room-filters" },
            ["todas", "ocupada", "libre"].map((filtro) =>
              h(
                "button",
                {
                  key: filtro,
                  type: "button",
                  className: `preceptor-room-filter ${filtroAulas === filtro ? "is-active" : ""}`,
                  onClick: () => setFiltroAulas(filtro)
                },
                filtro === "todas" ? "Todas" : filtro === "ocupada" ? "Ocupadas" : "Libres"
              )
            )
          )
        ),
        cargandoAulas
          ? h(LoadingState, { mensaje: "Consultando aulas..." })
          : aulasFiltradas.length === 0
            ? h(EmptyState, { mensaje: "No hay aulas para el filtro seleccionado." })
            : aulasFiltradas.map((grupo) =>
                h(
                  "div",
                  { key: grupo.planta, className: "preceptor-floor" },
                  h("h3", { className: "preceptor-floor__title" }, grupo.planta),
                  h(
                    "div",
                    { className: "preceptor-rooms-grid" },
                    grupo.aulas.map((aula) => h(AulaCard, { key: aula.id, aula }))
                  )
                )
              )
      )
    )
  );
}
