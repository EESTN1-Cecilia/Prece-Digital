import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { LoadingState, EmptyState, ErrorState, StatusBadge } from "../../components/common/state-handlers.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { JefaturaService } from "./jefatura-service.js";

const DIAS = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miércoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sábado" }
];

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function diaActual() {
  const idx = new Date().getDay();
  return ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][idx] ?? "lunes";
}

function formatFechaHora(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(date));
}

function textoDocente(docente) {
  if (!docente) return "Sin docente asignado";
  return `${docente.apellido ?? ""} ${docente.nombre ?? ""}`.trim() || "Sin docente asignado";
}

function textoEspacio(espacio) {
  if (!espacio) return "Sin espacio asignado";
  return `${espacio.nombre ?? ""}${espacio.codigo ? ` · ${espacio.codigo}` : ""}`.trim();
}

function estadoLabel(estado) {
  const mapa = {
    programada: "Programada",
    con_ausencia: "Con ausencia",
    inactiva: "Inactiva",
    libre: "Libre",
    ocupado: "Ocupado",
    reservado: "Reservado",
    no_disponible: "No disponible",
    pendiente: "Pendiente",
    aprobada: "Justificada",
    rechazada: "Rechazada",
    cancelada: "Cancelada"
  };
  return mapa[estado] ?? estado ?? "Sin estado";
}

function SelectField({ label, value, onChange, options = [], disabled = false }) {
  return h(
    "div",
    { className: "jefatura-field" },
    h("span", null, label),
    h(CustomSelect, {
      value: value ?? "",
      options,
      disabled,
      ariaLabel: label,
      onChange: (val) => onChange(val)
    })
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return h(
    "label",
    { className: "jefatura-field" },
    h("span", null, label),
    h("input", { value, placeholder, onChange: (event) => onChange(event.target.value) })
  );
}

function CourseSelector({ cursos, value, onChange, loading }) {
  const options = loading
    ? [{ value: "", label: "Cargando cursos..." }]
    : cursos.length === 0
    ? [{ value: "", label: "Sin cursos disponibles" }]
    : cursos.map((curso) => ({
        value: curso.id,
        label: `${curso.curso} · ${curso.turno}${curso.estado ? ` · ${curso.estado}` : ""}`
      }));

  return h(
    "div",
    { className: "jefatura-course-selector" },
    h(SelectField, {
      label: "Curso / grupo",
      value: value ?? "",
      onChange,
      options,
      disabled: loading || cursos.length === 0
    })
  );
}

function CourseSummary({ curso }) {
  if (!curso) {
    return h(EmptyState, { mensaje: "Seleccioná un curso o grupo para consultar la grilla." });
  }

  const items = [
    ["Año / curso", curso.curso],
    ["División / grupo", curso.division ?? curso.grupo ?? "General"],
    ["Turno", curso.turno],
    ["Alumnos", curso.cantidadAlumnos],
    ["Activos", curso.alumnosActivos],
    ["Estado", curso.estado]
  ];

  return h(
    "div",
    { className: "jefatura-course-summary" },
    items.map(([label, value]) =>
      h(
        "div",
        { key: label, className: "jefatura-course-summary__item" },
        h("span", null, label),
        h("strong", null, value ?? "Sin dato")
      )
    )
  );
}

function GridFilters({ filtros, setFiltro, limpiar, opciones }) {
  return h(
    "div",
    { className: "jefatura-filters" },
    h(SelectField, {
      label: "Día",
      value: filtros.dia,
      onChange: (value) => setFiltro("dia", value),
      options: DIAS.map((dia) => ({ value: dia.id, label: dia.label }))
    }),
    h(SelectField, {
      label: "Turno",
      value: filtros.turno,
      onChange: (value) => setFiltro("turno", value),
      options: [
        { value: "todos", label: "Todos" },
        ...(opciones.turnos ?? []).map((turno) => ({ value: turno, label: turno }))
      ]
    }),
    h(TextField, {
      label: "Docente",
      value: filtros.docente,
      placeholder: "Apellido o nombre",
      onChange: (value) => setFiltro("docente", value)
    }),
    h(TextField, {
      label: "Materia",
      value: filtros.materia,
      placeholder: "Materia",
      onChange: (value) => setFiltro("materia", value)
    }),
    h(TextField, {
      label: "Espacio",
      value: filtros.espacio,
      placeholder: "Aula, taller o código",
      onChange: (value) => setFiltro("espacio", value)
    }),
    h(SelectField, {
      label: "Estado",
      value: filtros.estado,
      onChange: (value) => setFiltro("estado", value),
      options: [
        { value: "todos", label: "Todos" },
        { value: "programada", label: "Programada" },
        { value: "con_ausencia", label: "Con ausencia" },
        { value: "pendiente", label: "Ausencia pendiente" },
        { value: "aprobada", label: "Ausencia justificada" }
      ]
    }),
    h(SelectField, {
      label: "Ausencias",
      value: filtros.ausencias,
      onChange: (value) => setFiltro("ausencias", value),
      options: [
        { value: "todas", label: "Todas" },
        { value: "con", label: "Con ausencia" },
        { value: "sin", label: "Sin ausencia" }
      ]
    }),
    h(
      "button",
      { type: "button", className: "jefatura-clear-btn", onClick: limpiar },
      "Limpiar filtros"
    )
  );
}

function AbsenceIndicator({ ausencia }) {
  if (!ausencia) return h("span", { className: "jefatura-muted" }, "Sin ausencia");
  return h(
    "div",
    { className: `jefatura-absence jefatura-absence--${ausencia.cobertura}` },
    h("strong", null, estadoLabel(ausencia.estado)),
    h("span", null, ausencia.reemplazo ? `Reemplazo: ${textoDocente(ausencia.reemplazo)}` : "Sin cobertura")
  );
}

function ScheduleGrid({ actividades, loading }) {
  if (loading) return h(LoadingState, { mensaje: "Actualizando horarios y asignaciones..." });
  if (!actividades.length) {
    return h(EmptyState, { mensaje: "No hay actividades para el día y filtros seleccionados." });
  }

  return h(
    "div",
    { className: "jefatura-grid-wrap" },
    h(
      "table",
      { className: "jefatura-grid-table" },
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          ["Curso/grupo", "Alumnos", "Docente", "Materia", "Día", "Inicio", "Fin", "Espacio", "Turno", "Estado", "Ausencia"].map((col) =>
            h("th", { key: col }, col)
          )
        )
      ),
      h(
        "tbody",
        null,
        actividades.map((item) =>
          h(
            "tr",
            { key: item.id, className: item.ausencia ? "has-absence" : "" },
            h("td", null, h("strong", null, item.cursoGrupo?.curso ?? "Sin curso")),
            h("td", null, item.cantidadAlumnos ?? 0),
            h("td", null, textoDocente(item.docente)),
            h("td", null, item.materia?.nombre ?? "Sin materia"),
            h("td", null, item.diaLabel ?? item.dia),
            h("td", null, item.inicio ?? "-"),
            h("td", null, item.fin ?? "-"),
            h("td", null, textoEspacio(item.espacio)),
            h("td", null, item.turno ?? "-"),
            h("td", null, h(StatusBadge, { status: item.estado, label: estadoLabel(item.estado) })),
            h("td", null, h(AbsenceIndicator, { ausencia: item.ausencia }))
          )
        )
      )
    )
  );
}

function RoomAvailability({ items }) {
  if (!items?.length) {
    return h(EmptyState, { mensaje: "No hay espacios informados por la API para este contexto." });
  }

  return h(
    "div",
    { className: "jefatura-room-list" },
    items.map((item) =>
      h(
        "article",
        { key: item.espacio.id, className: `jefatura-room jefatura-room--${item.estado}` },
        h(
          "div",
          null,
          h("strong", null, textoEspacio(item.espacio)),
          h("span", null, item.actividad ? `${item.actividad.materia?.nombre ?? "Actividad"} · ${item.actividad.inicio ?? ""}` : "Sin actividad asignada")
        ),
        h("span", { className: "jefatura-room__status" }, estadoLabel(item.estado))
      )
    )
  );
}

function AbsenceList({ ausencias }) {
  if (!ausencias?.length) return h(EmptyState, { mensaje: "No hay ausencias docentes registradas para la fecha." });
  return h(
    "div",
    { className: "jefatura-absence-list" },
    ausencias.map((ausencia) =>
      h(
        "article",
        { key: ausencia.id, className: "jefatura-absence-card" },
        h("strong", null, textoDocente(ausencia.docente)),
        h("span", null, `${estadoLabel(ausencia.estado)} · ${ausencia.tipo ?? "sin tipo"}`),
        h("small", null, ausencia.reemplazo ? `Cobertura: ${textoDocente(ausencia.reemplazo)}` : "Sin cobertura registrada")
      )
    )
  );
}

export default function JefaturaGrillaView() {
  const [cursos, setCursos] = useState([]);
  const [cursosLoading, setCursosLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filtros, setFiltros] = useState({
    cursoGrupoId: "",
    fecha: hoyIso(),
    dia: DIAS.some((d) => d.id === diaActual()) ? diaActual() : "lunes",
    turno: "todos",
    docente: "",
    materia: "",
    espacio: "",
    estado: "todos",
    ausencias: "todas",
    pagina: 1,
    porPagina: 25
  });

  const cargarCursos = useCallback(async () => {
    setCursosLoading(true);
    try {
      const lista = await JefaturaService.listarCursosGrupos();
      setCursos(lista);
      setFiltros((prev) => ({ ...prev, cursoGrupoId: prev.cursoGrupoId || lista[0]?.id || "" }));
    } finally {
      setCursosLoading(false);
    }
  }, []);

  const cargarGrilla = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await JefaturaService.obtenerGrilla(filtros);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.mensaje || err.message || "No se pudo consultar la grilla de Jefatura.");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarCursos().catch((err) => {
      setError(err.mensaje || err.message || "No se pudieron consultar los cursos y grupos.");
      setCursosLoading(false);
      setLoading(false);
    });
  }, [cargarCursos]);

  useEffect(() => {
    if (!cursosLoading) {
      cargarGrilla();
    }
  }, [cursosLoading, cargarGrilla]);

  const setFiltro = useCallback((key, value) => {
    setFiltros((prev) => ({
      ...prev,
      [key]: value,
      pagina: key === "pagina" ? value : 1
    }));
  }, []);

  const limpiar = useCallback(() => {
    setFiltros((prev) => ({
      ...prev,
      turno: "todos",
      docente: "",
      materia: "",
      espacio: "",
      estado: "todos",
      ausencias: "todas",
      pagina: 1
    }));
  }, []);

  const paginacion = data?.paginacion ?? {};
  const opciones = useMemo(() => data?.opciones ?? { turnos: [] }, [data]);

  return h(
    "section",
    { className: "jf-grilla" },
    h(
      "div",
      { className: "jf-barra" },
      h("p", { className: "jf-barra__texto" }, lastUpdated ? `Última actualización: ${formatFechaHora(lastUpdated)}` : "Consultá horarios, aulas y ausencias por curso."),
      h(
        "button",
        { type: "button", className: "jf-boton jf-boton--primario", onClick: cargarGrilla, disabled: loading || cursosLoading },
        loading ? "Actualizando..." : "Actualizar datos"
      )
    ),
    error ? h(ErrorState, { mensaje: error, onRetry: cargarGrilla }) : null,
    !error
      ? h(
          Fragment,
          null,
          h(
            DashboardCard,
            { title: "Selección de curso/grupo", icon: "academic", className: "dashboard-card--highlight" },
            h(CourseSelector, {
              cursos,
              value: filtros.cursoGrupoId,
              loading: cursosLoading,
              onChange: (value) => setFiltro("cursoGrupoId", value)
            }),
            h(CourseSummary, { curso: data?.cursoGrupo })
          ),
          h(
            DashboardCard,
            { title: "Filtros de consulta", icon: "filter" },
            h(GridFilters, { filtros, setFiltro, limpiar, opciones })
          ),
          h(
            DashboardCard,
            {
              title: "Grilla principal",
              icon: "attendance",
              badge: `${paginacion.total ?? 0} registros`
            },
            h(ScheduleGrid, { actividades: data?.data ?? [], loading }),
            paginacion.totalPaginas > 1
              ? h(
                  "div",
                  { className: "jefatura-pagination" },
                  h(
                    "button",
                    { type: "button", disabled: !paginacion.tieneAnterior, onClick: () => setFiltro("pagina", Number(filtros.pagina) - 1) },
                    "Anterior"
                  ),
                  h("span", null, `Página ${paginacion.pagina} de ${paginacion.totalPaginas}`),
                  h(
                    "button",
                    { type: "button", disabled: !paginacion.tieneSiguiente, onClick: () => setFiltro("pagina", Number(filtros.pagina) + 1) },
                    "Siguiente"
                  )
                )
              : null
          ),
          h(
            "div",
            { className: "jf-dos-columnas" },
            h(
              "div",
              { className: "jf-columna" },
              h(
                DashboardCard,
                { title: "Disponibilidad de espacios", icon: "rooms", badge: `${data?.disponibilidad?.length ?? 0} espacios` },
                h(RoomAvailability, { items: data?.disponibilidad ?? [] })
              )
            ),
            h(
              "div",
              { className: "jf-columna" },
              h(
                DashboardCard,
                { title: "Ausencias docentes", icon: "alert", badge: `${data?.ausencias?.length ?? 0}` },
                h(AbsenceList, { ausencias: data?.ausencias ?? [] })
              )
            )
          )
        )
      : null
  );
}
