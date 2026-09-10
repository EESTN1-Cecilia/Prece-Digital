import { useEffect, useState } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { AuthService } from "../../services/auth-service.js";
import { StudentsService } from "../students/students-service.js";
import {
  DEFAULT_OBSERVATION_SECTORS,
  DEFAULT_OBSERVATION_TYPES,
  buildObservationRecord,
  getDefaultObservationForm,
  getStoredObservations,
  resolveResponsibleFromUser,
  saveObservationRecords
} from "./observaciones-service.js";

const STORAGE_KEY = "prece-observaciones-filtros-v1";
const DEFAULT_FILTERS = {
  query: "",
  fechaDesde: "",
  fechaHasta: "",
  tipo: "",
  sector: "",
  responsable: "",
  estado: ""
};

function getSavedFilters() {
  if (typeof window === "undefined") {
    return DEFAULT_FILTERS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FILTERS;
    }

    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

const OBSERVACIONES = [
  {
    alumno: "Gómez, Mateo",
    dni: "4821",
    tipo: "Académica",
    estado: "Activa",
    id: "#OBS-1092",
    fecha: "02/09/2026",
    descripcion: "Se solicita reunión con el tutor pedagógico debido a entregas incompletas en la materia Taller.",
    sector: "Preceptoría",
    responsable: "Prof. Rossi M.",
    creada: "02/09/2026",
    modificada: "-"
  },
  {
    alumno: "Gómez, Mateo",
    dni: "4821",
    tipo: "Convivencia",
    estado: "Modificada",
    id: "#OBS-1081",
    fecha: "15/08/2026",
    descripcion: "Llegada tarde reiterada sin justificación. Se notificó al adulto responsable.",
    sector: "Equipo de Orientación (EOE)",
    responsable: "Lic. Gómez S.",
    creada: "14/08/2026",
    modificada: "15/08/2026"
  },
  {
    alumno: "Pérez, Ana",
    dni: "4798",
    tipo: "Asistencia",
    estado: "Histórica",
    id: "#OBS-1044",
    fecha: "22/07/2026",
    descripcion: "Se justificaron las inasistencias correspondientes al período informado y se cerró el caso de asistencia.",
    sector: "Preceptoría",
    responsable: "Prof. Rossi M.",
    creada: "20/07/2026",
    modificada: "-"
  },
  {
    alumno: "López, Javier",
    dni: "4815",
    tipo: "Convivencia",
    estado: "Activa",
    id: "#OBS-1121",
    fecha: "30/08/2026",
    descripcion: "Se registró una instancia de falta de respeto en el aula y se solicita seguimiento con coordinación.",
    sector: "Coordinación",
    responsable: "Prof. Álvarez L.",
    creada: "30/08/2026",
    modificada: "-"
  }
];

function parseFecha(valor) {
  const [dia, mes, anio] = valor.split("/");
  return new Date(`${anio}-${mes}-${dia}`);
}

function acortarTexto(texto) {
  return texto.length > 120 ? `${texto.slice(0, 120).trim()}...` : texto;
}

function normalizarEstadoClase(estado) {
  return String(estado)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function StatusBadge({ estado }) {
  return h("span", { className: `observation-status observation-status--${normalizarEstadoClase(estado)}` }, estado);
}

function ObservationCard({ observation, onView, onEdit }) {
  return h(
    "article",
    { className: `student-observation student-observation--${observation.estado.toLowerCase()}` },
    h(
      "div",
      { className: "student-observation__body" },
      h(
        "div",
        { className: "student-observation__row" },
        h(
          "div",
          { className: "student-observation__field" },
          h("span", { className: "student-observation__label" }, "Alumno"),
          h("strong", null, observation.alumno)
        ),
        h(
          "div",
          { className: "student-observation__field student-observation__field--compact" },
          h("span", { className: "student-observation__label" }, "Tipo"),
          h("span", { className: "student-observation__pill student-observation__pill--type" }, observation.tipo)
        ),
        h(
          "div",
          { className: "student-observation__field student-observation__field--compact" },
          h("span", { className: "student-observation__label" }, "Estado"),
          h(StatusBadge, { estado: observation.estado })
        ),
        h(
          "div",
          { className: "student-observation__field student-observation__field--compact" },
          h("span", { className: "student-observation__label" }, "ID"),
          h("span", { className: "student-observation__pill student-observation__pill--id" }, observation.id)
        ),
        h(
          "div",
          { className: "student-observation__field" },
          h("span", { className: "student-observation__label" }, "Fecha"),
          h("strong", null, observation.fecha)
        ),
        h(
          "div",
          { className: "student-observation__field" },
          h("span", { className: "student-observation__label" }, "Sector"),
          h("strong", null, observation.sector)
        ),
        h(
          "div",
          { className: "student-observation__field" },
          h("span", { className: "student-observation__label" }, "Responsable"),
          h("strong", null, observation.responsable)
        )
      ),
      h(
        "div",
        { className: "student-observation__footer" },
        h("p", { className: "student-observation__description" }, acortarTexto(observation.descripcion)),
        h(
          "div",
          { className: "student-observation__actions" },
          h("button", { type: "button", onClick: onView }, "Ver"),
          h("button", { type: "button", onClick: onEdit }, "Editar")
        )
      )
    )
  );
}

function CustomSelect({ label, value, options, onChange, placeholder, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [instanceId] = useState(() => Math.random().toString(36).slice(2));

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!event.target.closest(".custom-select-wrapper")) {
        setIsOpen(false);
      }
    };

    const onOtherSelectOpen = (event) => {
      if (event.detail !== instanceId) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", onDocumentClick);
    window.addEventListener("prece-custom-select:open", onOtherSelectOpen);

    return () => {
      document.removeEventListener("click", onDocumentClick);
      window.removeEventListener("prece-custom-select:open", onOtherSelectOpen);
    };
  }, [instanceId]);

  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );

  const selected = normalizedOptions.find((option) => option.value === value) || null;
  const hasSelection = Boolean(
    selected &&
    selected.value !== "" &&
    selected.value !== undefined &&
    selected.value !== placeholder &&
    selected.value !== label
  );

  return h(
    "div",
    { className: `custom-select-wrapper ${className}`.trim() },
    h(
      "button",
      {
        type: "button",
        className: `custom-select__trigger ${isOpen ? "custom-select__trigger--open" : ""} ${hasSelection ? "custom-select__trigger--active" : ""}`,
        onClick: (event) => {
          event.stopPropagation();
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          window.dispatchEvent(new CustomEvent("prece-custom-select:open", { detail: instanceId }));
          setIsOpen(true);
        },
        "aria-expanded": isOpen,
        "aria-label": label
      },
      h(
        "span",
        { className: "custom-select__trigger-text" },
        hasSelection ? selected.label : placeholder || label
      ),
      h(IconoFigma, {
        className: `custom-select__chevron ${isOpen ? "custom-select__chevron--open" : ""}`,
        nombre: "chevron"
      })
    ),
    isOpen
      ? h(
          "div",
          { className: "custom-select__dropdown" },
          h(
            "div",
            { className: "custom-select__options-list" },
            normalizedOptions.map((option) =>
              h(
                "button",
                {
                  key: option.value || option.label,
                  type: "button",
                  className: `custom-select__option ${option.value === value ? "custom-select__option--selected" : ""}`,
                  onClick: () => {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                },
                h("span", { className: "custom-select__option-label" }, option.label),
                option.value === value
                  ? h(
                      "svg",
                      { className: "custom-select__check-icon", viewBox: "0 0 16 16", fill: "currentColor", "aria-hidden": "true" },
                      h("path", { d: "M13.1 3.4 6.3 10.2 2.9 6.8 1.7 8l4.6 4.6 7.6-7.6-1.8-1.6Z" })
                    )
                  : null
              )
            )
          )
        )
      : null
  );
}

function StudentDetail({
  alumno,
  observations,
  onBack,
  tipoFiltro,
  estadoFiltro,
  sectorFiltro,
  responsableFiltro,
  onTipoChange,
  onEstadoChange,
  onSectorChange,
  onResponsableChange,
  sectores,
  responsables,
  filtrosActivos = []
}) {
  const limpiarTodosHistorial = () => {
    onTipoChange("Tipo de observación");
    onEstadoChange("Estado");
    onSectorChange("");
    onResponsableChange("");
  };

  return h(
    "section",
    { className: "student-detail" },
    h(
      "div",
      { className: "student-detail__topbar" },
      h(
        "div",
        { className: "student-detail__info" },
        h("span", { className: "student-detail__eyebrow" }, "Perfil del alumno"),
        h("h1", null, alumno),
        h("p", null, "División: 4°1° | Grupo: 1.0")
      ),
      h(
        "button",
        { className: "student-detail__back", type: "button", onClick: onBack, "aria-label": "Volver" },
        h(IconoFigma, { className: "student-detail__back-icon", nombre: "chevron" })
      )
    ),
    h(
      "section",
      { className: "student-history" },
      h(
        "div",
        { className: "student-history__header" },
        h(
          "div",
          { className: "student-history__heading" },
          h("h2", null, "Historial"),
          h("span", { className: "student-history__count" }, `${observations.length} registros`)
        ),
        h(
          "div",
          { className: "student-history__controls" },
          h(
            "div",
            { className: "student-history__select" },
            h(CustomSelect, {
              label: "Tipo de observación",
              value: tipoFiltro,
              placeholder: "Tipo de observación",
              options: [
                { value: "Tipo de observación", label: "Tipo de observación" },
                { value: "Académica", label: "Académica" },
                { value: "Convivencia", label: "Convivencia" },
                { value: "Asistencia", label: "Asistencia" }
              ],
              onChange: onTipoChange
            })
          ),
          h(
            "div",
            { className: "student-history__select" },
            h(CustomSelect, {
              label: "Estado",
              value: estadoFiltro,
              placeholder: "Estado",
              options: [
                { value: "Estado", label: "Estado" },
                { value: "Activa", label: "Activa" },
                { value: "Modificada", label: "Modificada" },
                { value: "Histórica", label: "Histórica" }
              ],
              onChange: onEstadoChange
            })
          ),
          h(
            "div",
            { className: "student-history__select" },
            h(CustomSelect, {
              label: "Sector",
              value: sectorFiltro,
              placeholder: "Sector",
              options: [{ value: "", label: "Sector" }, ...sectores.map((sector) => ({ value: sector, label: sector }))],
              onChange: onSectorChange
            })
          ),
          h(
            "div",
            { className: "student-history__select" },
            h(CustomSelect, {
              label: "Responsable",
              value: responsableFiltro,
              placeholder: "Responsable",
              options: [{ value: "", label: "Responsable" }, ...responsables.map((responsable) => ({ value: responsable, label: responsable }))],
              onChange: onResponsableChange
            })
          ),
          h(ActionButton, { icon: "clipboard" }, "Nueva observación")
        )
      ),
      filtrosActivos.length
        ? h(
            "div",
            { className: "active-filters-bar" },
            h("span", { className: "active-filters-label" }, "Filtros activos:"),
            h(
              "div",
              { className: "active-filters-list" },
              filtrosActivos.map((filtro) =>
                h(
                  "span",
                  { key: filtro.key, className: "active-filter-chip" },
                  filtro.label,
                  h(
                    "button",
                    {
                      type: "button",
                      className: "active-filter-chip__remove",
                      onClick: filtro.onRemove,
                      title: `Quitar filtro ${filtro.key}`
                    },
                    "×"
                  )
                )
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "clear-all-filters-btn",
                  onClick: limpiarTodosHistorial
                },
                "Limpiar todos"
              )
            )
          )
        : null,
      h(
        "div",
        { className: "history-list" },
        observations.map((observation) =>
          h(
            "article",
            { className: "history-item", key: observation.id },
            h("div", { className: "history-item__main" },
              h("div", { className: "history-item__top-grid" },
                h("div", { className: "history-item__field" },
                  h("dt", null, "Tipo"),
                  h("dd", null, h("span", { className: "history-item__value history-item__value--type" }, observation.tipo))
                ),
                h("div", { className: "history-item__field" },
                  h("dt", null, "Estado"),
                  h("dd", null, h(StatusBadge, { estado: observation.estado }))
                ),
                h("div", { className: "history-item__field" },
                  h("dt", null, "ID"),
                  h("dd", null, h("span", { className: "history-item__value history-item__value--id" }, observation.id))
                ),
                h("div", { className: "history-item__field" },
                  h("dt", null, "Fecha"),
                  h("dd", null, observation.fecha)
                )
              ),
              h("div", { className: "history-item__content" },
                h("div", { className: "history-item__details" },
                  h("div", { className: "history-item__field history-item__field--full" },
                    h("dt", null, "Descripción"),
                    h("dd", null, observation.descripcion)
                  ),
                  h("div", { className: "history-item__field" },
                    h("dt", null, "Sector"),
                    h("dd", null, observation.sector)
                  ),
                  h("div", { className: "history-item__field" },
                    h("dt", null, "Responsable"),
                    h("dd", null, observation.responsable)
                  )
                ),
                h("div", { className: "history-item__audit" },
                  h("div", { className: "history-item__field" },
                    h("dt", null, "Creada"),
                    h("dd", null, observation.creada)
                  ),
                  h("div", { className: "history-item__field" },
                    h("dt", null, "Modificada"),
                    h("dd", null, observation.modificada || "-")
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}

function ObservationFilters({ filtros, onChange, onClear, onClearAll, tipos, sectores, responsables, estados }) {
  const filtersConfig = [
    { key: "fechaDesde", label: "Fecha desde", type: "date" },
    { key: "fechaHasta", label: "Fecha hasta", type: "date" },
    { key: "tipo", label: "Tipo", type: "select", options: tipos },
    { key: "sector", label: "Sector", type: "select", options: sectores },
    { key: "responsable", label: "Responsable", type: "select", options: responsables },
    { key: "estado", label: "Estado", type: "select", options: estados }
  ];

  const activeFilters = Object.entries({
    query: filtros.query,
    fechaDesde: filtros.fechaDesde,
    fechaHasta: filtros.fechaHasta,
    tipo: filtros.tipo,
    sector: filtros.sector,
    responsable: filtros.responsable,
    estado: filtros.estado
  }).filter(([, value]) => value && String(value).trim() !== "");

  return h(
    "div",
    { className: "observations-toolbar" },
    h(
      "div",
      { className: "observations-toolbar__search" },
      h("input", {
        type: "search",
        value: filtros.query,
        onChange: (event) => onChange("query", event.target.value),
        placeholder: "Ingrese apellido, nombre o DNI...",
        "aria-label": "Buscar alumno"
      }),
    ),
    h(
      "div",
      { className: "observations-toolbar__filters" },
      filtersConfig.map(({ key, label, type, options }) => {
        const value = filtros[key];
        const control = type === "select"
          ? h(CustomSelect, {
              label,
              value: value || "",
              placeholder: label,
              options: [{ value: "", label }, ...options.map((option) => ({ value: option, label: option }))],
              onChange: (nextValue) => onChange(key, nextValue),
              className: "observations-toolbar__custom-select"
            })
          : h("input", {
              type,
              value: value || "",
              onChange: (event) => onChange(key, event.target.value),
              "aria-label": label
            });

        return h(
          "div",
          { className: "observations-toolbar__field", key },
          h("label", { className: "observations-toolbar__label" }, label),
          h(
            "div",
            {
              className: `observations-toolbar__control${type === "select" ? " observations-toolbar__control--select" : ""}`
            },
            control
          )
        );
      })
    ),
    activeFilters.length
      ? h(
          "div",
          { className: "active-filters-bar observations-toolbar__active" },
          h("span", { className: "active-filters-label" }, "Filtros activos:"),
          h(
            "div",
            { className: "active-filters-list" },
            activeFilters.map(([key, value]) =>
              h(
                "span",
                { key, className: "active-filter-chip" },
                `${key === "query" ? "Búsqueda" : key === "fechaDesde" ? "Fecha desde" : key === "fechaHasta" ? "Fecha hasta" : key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`,
                h(
                  "button",
                  {
                    type: "button",
                    className: "active-filter-chip__remove",
                    onClick: () => onClear(key),
                    title: `Quitar filtro ${key}`
                  },
                  "×"
                )
              )
            ),
            h(
              "button",
              {
                type: "button",
                className: "clear-all-filters-btn",
                onClick: onClearAll
              },
              "Limpiar todos"
            )
          )
        )
      : null
  );
}

function ObservationFormInline({ initialAlumno = "", onSave, students = [], currentUser, onClose }) {
  const [form, setForm] = useState(() =>
    getDefaultObservationForm({
      alumno: initialAlumno,
      responsable: resolveResponsibleFromUser(currentUser, true)
    })
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      getDefaultObservationForm({
        alumno: initialAlumno,
        responsable: resolveResponsibleFromUser(currentUser, true)
      })
    );
    setError("");
  }, [initialAlumno, currentUser]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedAlumno = form.alumno.trim();
    const trimmedTipo = form.tipo.trim();
    const trimmedFecha = form.fecha.trim();
    const trimmedDescripcion = form.descripcion.trim();
    const trimmedSector = form.sector.trim();
    const trimmedResponsable = form.responsable.trim();

    if (!trimmedAlumno || !trimmedTipo || !trimmedFecha || !trimmedDescripcion || !trimmedSector || !trimmedResponsable) {
      setError("Completá todos los campos obligatorios para registrar la observación.");
      return;
    }

    setSaving(true);

    const record = buildObservationRecord({
      ...form,
      alumno: trimmedAlumno,
      tipo: trimmedTipo,
      fecha: trimmedFecha,
      descripcion: trimmedDescripcion,
      sector: trimmedSector,
      responsable: trimmedResponsable,
      estado: form.estado || "Activa"
    });

    const stored = getStoredObservations();
    saveObservationRecords([record, ...stored]);

    setSaving(false);
    onSave?.(record);
    onClose?.();
  };

  const studentOptions = students.length
    ? students.map((student) => {
        const nombreCompleto = `${student.apellido || ""}, ${student.nombre || ""}`.replace(/,\s*$/, "").trim();
        const curso = student.curso ? String(student.curso).replace(/\s+$/, "") : "";
        const division = student.division ? String(student.division).replace(/\s+$/, "") : "";
        return {
          value: nombreCompleto,
          label: `${nombreCompleto}${curso || division ? ` · ${curso}${division ? ` ${division}` : ""}` : ""}`
        };
      })
    : [];

  return h(
    "form",
    { className: "observation-form-card", onSubmit: handleSubmit },
    h("div", { className: "observation-form__header" },
      h("div", null,
        h("span", { className: "student-detail__eyebrow" }, "Nueva observación"),
        h("h3", null, "Registrar observación")
      )
    ),
    h("div", { className: "form-section-header" },
      h("h4", { className: "form-section-title" }, "Datos de la observación"),
      h("span", { className: "form-section-desc" }, "Toda la información necesaria para el seguimiento")
    ),
    error ? h("p", { className: "form-error-message" }, error) : null,
    h(
      "div",
      { className: "form-grid-2col observation-form__grid" },
      h(
        "div",
        { className: "form-field" },
        h("label", null, "Alumno"),
        h(
          "div",
          { className: "form-control" },
          h(
            "select",
            {
              value: form.alumno,
              onChange: (event) => setField("alumno", event.target.value),
              disabled: Boolean(initialAlumno),
              required: true
            },
            h("option", { value: "" }, "Seleccionar alumno"),
            ...studentOptions.map((option) => h("option", { key: option.value, value: option.value }, option.label))
          )
        )
      ),
      h(
        "div",
        { className: "form-field" },
        h("label", null, "Tipo de observación"),
        h(
          "div",
          { className: "form-control" },
          h(
            "select",
            {
              value: form.tipo,
              onChange: (event) => setField("tipo", event.target.value),
              required: true
            },
            h("option", { value: "" }, "Seleccionar tipo"),
            ...DEFAULT_OBSERVATION_TYPES.map((tipo) => h("option", { key: tipo, value: tipo }, tipo))
          )
        )
      ),
      h(
        "div",
        { className: "form-field" },
        h("label", null, "Fecha"),
        h(
          "div",
          { className: "form-control" },
          h("input", {
            type: "date",
            value: form.fecha,
            onChange: (event) => setField("fecha", event.target.value),
            required: true
          })
        )
      ),
      h(
        "div",
        { className: "form-field" },
        h("label", null, "Sector"),
        h(
          "div",
          { className: "form-control" },
          h(
            "select",
            {
              value: form.sector,
              onChange: (event) => setField("sector", event.target.value),
              required: true
            },
            h("option", { value: "" }, "Seleccionar sector"),
            ...DEFAULT_OBSERVATION_SECTORS.map((sector) => h("option", { key: sector, value: sector }, sector))
          )
        )
      ),
      h(
        "div",
        { className: "form-field" },
        h("label", null, "Responsable"),
        h(
          "div",
          { className: "form-control" },
          h("input", {
            type: "text",
            value: form.responsable,
            onChange: (event) => setField("responsable", event.target.value),
            placeholder: "Responsable",
            required: true
          })
        )
      ),
      h(
        "div",
        { className: "form-field" },
        h("label", null, "Estado"),
        h(
          "div",
          { className: "form-control" },
          h(
            "select",
            { value: form.estado, onChange: (event) => setField("estado", event.target.value) },
            h("option", { value: "" }, "Sin estado"),
            h("option", { value: "Activa" }, "Activa"),
            h("option", { value: "Modificada" }, "Modificada"),
            h("option", { value: "Histórica" }, "Histórica")
          )
        )
      )
    ),
    h(
      "div",
      { className: "form-field form-field--full" },
      h("label", null, "Descripción"),
      h("textarea", {
        className: "observation-form__textarea",
        value: form.descripcion,
        maxLength: 500,
        placeholder: "Describí la situación observada...",
        onChange: (event) => setField("descripcion", event.target.value),
        required: true
      }),
      h("small", { className: "observation-form__counter" }, `${form.descripcion.length}/500`)
    ),
    h(
      "div",
      { className: "form-actions-row" },
      h("button", { type: "button", className: "btn-secundario", onClick: onClose }, "Cancelar"),
      h("button", { type: "submit", className: "btn-primario", disabled: saving }, saving ? "Guardando..." : "Guardar observación")
    )
  );
}

export default function ObservacionesView() {
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState(() => getSavedFilters());
  const [tipoHistorial, setTipoHistorial] = useState("Tipo de observación");
  const [estadoHistorial, setEstadoHistorial] = useState("Estado");
  const [sectorHistorial, setSectorHistorial] = useState("");
  const [responsableHistorial, setResponsableHistorial] = useState("");
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [studentsForObservation, setStudentsForObservation] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtros));
    }
  }, [filtros]);

  useEffect(() => {
    let isCancelled = false;
    const loadStudents = async () => {
      try {
        const res = await StudentsService.getAlumnos({ limit: 500, sortBy: "apellido", sortOrder: "asc" });
        if (!isCancelled) {
          setStudentsForObservation(Array.isArray(res?.data) ? res.data : []);
        }
      } catch {
        if (!isCancelled) {
          setStudentsForObservation([]);
        }
      }
    };

    loadStudents();
    return () => {
      isCancelled = true;
    };
  }, []);

  const updateFiltro = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  const clearFiltro = (key) => {
    setFiltros((prev) => ({ ...prev, [key]: "" }));
  };

  const clearAllFilters = () => {
    setFiltros(DEFAULT_FILTERS);
  };

  const tipos = [...new Set([...OBSERVACIONES, ...getStoredObservations()].map((observation) => observation.tipo).filter(Boolean))];
  const sectores = [...new Set([...OBSERVACIONES, ...getStoredObservations()].map((observation) => observation.sector).filter(Boolean))].sort();
  const responsables = [...new Set([...OBSERVACIONES, ...getStoredObservations()].map((observation) => observation.responsable).filter(Boolean))].sort();
  const estados = [...new Set([...OBSERVACIONES, ...getStoredObservations()].map((observation) => observation.estado).filter(Boolean))];

  const observaciones = [...OBSERVACIONES, ...getStoredObservations()].filter((observation) => {
    const query = (filtros.query || "").trim().toLowerCase();
    const coincideBusqueda =
      !query ||
      (observation.alumno || "").toLowerCase().includes(query) ||
      (observation.dni || "").toLowerCase().includes(query);

    const fechaObservacion = parseFecha(observation.fecha || "01/01/2000");
    const fechaDesde = filtros.fechaDesde ? new Date(`${filtros.fechaDesde}T00:00:00`) : null;
    const fechaHasta = filtros.fechaHasta ? new Date(`${filtros.fechaHasta}T23:59:59`) : null;

    const coincideFechaDesde = !fechaDesde || fechaObservacion >= fechaDesde;
    const coincideFechaHasta = !fechaHasta || fechaObservacion <= fechaHasta;
    const coincideTipo = !filtros.tipo || observation.tipo === filtros.tipo;
    const coincideSector = !filtros.sector || observation.sector === filtros.sector;
    const coincideResponsable = !filtros.responsable || observation.responsable === filtros.responsable;
    const coincideEstado = !filtros.estado || observation.estado === filtros.estado;

    return (
      coincideBusqueda &&
      coincideFechaDesde &&
      coincideFechaHasta &&
      coincideTipo &&
      coincideSector &&
      coincideResponsable &&
      coincideEstado
    );
  })
    .sort((a, b) => parseFecha(b.fecha || "01/01/2000") - parseFecha(a.fecha || "01/01/2000"))
    .filter((observation, index, collection) => index === collection.findIndex((item) => item.alumno === observation.alumno));

  const openObservationForm = (alumno = alumnoSeleccionado) => {
    setShowObservationForm(true);
  };

  const handleObservationSaved = (record) => {
    if (record?.alumno) {
      setAlumnoSeleccionado(record.alumno);
    }
  };

  if (alumnoSeleccionado) {
    const historialBase = [...OBSERVACIONES, ...getStoredObservations()].filter((observation) => observation.alumno === alumnoSeleccionado);
    const historial = historialBase.filter((observation) => {
      const coincideTipo = tipoHistorial === "Tipo de observación" || observation.tipo === tipoHistorial;
      const coincideEstado = estadoHistorial === "Estado" || observation.estado === estadoHistorial;
      const coincideSector = !sectorHistorial || observation.sector === sectorHistorial;
      const coincideResponsable = !responsableHistorial || observation.responsable === responsableHistorial;
      return coincideTipo && coincideEstado && coincideSector && coincideResponsable;
    }).sort((a, b) => parseFecha(b.fecha || "01/01/2000") - parseFecha(a.fecha || "01/01/2000"));
    const sectoresAlumno = [...new Set(historialBase.map((observation) => observation.sector).filter(Boolean))].sort();
    const responsablesAlumno = [...new Set(historialBase.map((observation) => observation.responsable).filter(Boolean))].sort();

    const filtrosActivosHistorial = [
      tipoHistorial !== "Tipo de observación" ? { key: "tipo", label: `Tipo: ${tipoHistorial}`, onRemove: () => setTipoHistorial("Tipo de observación") } : null,
      estadoHistorial !== "Estado" ? { key: "estado", label: `Estado: ${estadoHistorial}`, onRemove: () => setEstadoHistorial("Estado") } : null,
      sectorHistorial ? { key: "sector", label: `Sector: ${sectorHistorial}`, onRemove: () => setSectorHistorial("") } : null,
      responsableHistorial ? { key: "responsable", label: `Responsable: ${responsableHistorial}`, onRemove: () => setResponsableHistorial("") } : null
    ].filter(Boolean);

    return h(
      "section",
      { className: "observations-panel" },
      h(StudentDetail, {
        alumno: alumnoSeleccionado,
        observations: historial,
        onBack: () => setAlumnoSeleccionado(null),
        tipoFiltro: tipoHistorial,
        estadoFiltro: estadoHistorial,
        sectorFiltro: sectorHistorial,
        responsableFiltro: responsableHistorial,
        onTipoChange: setTipoHistorial,
        onEstadoChange: setEstadoHistorial,
        onSectorChange: setSectorHistorial,
        onResponsableChange: setResponsableHistorial,
        sectores: sectoresAlumno,
        responsables: responsablesAlumno,
        filtrosActivos: filtrosActivosHistorial
      }),
      h(ActionButton, {
        icon: "clipboard",
        onClick: () => openObservationForm(alumnoSeleccionado)
      }, "Nueva observación"),
      showObservationForm
        ? h(ObservationFormInline, {
            initialAlumno: alumnoSeleccionado || "",
            onSave: handleObservationSaved,
            students: studentsForObservation,
            currentUser: AuthService.getCurrentUser(),
            onClose: () => setShowObservationForm(false)
          })
        : null
    );
  }

  return h(
    "section",
    { className: "observations-panel" },
    h(
      "div",
      { className: "observations-panel__top" },
      h(
        "div",
        { className: "observations-panel__title" },
        h("h2", null, "Observaciones"),
        h("p", null, "Última observación por alumno")
      ),
      h(ActionButton, { icon: "clipboard", onClick: () => openObservationForm() }, "Nueva observación")
    ),
    h(ObservationFilters, {
      filtros,
      onChange: updateFiltro,
      onClear: clearFiltro,
      onClearAll: clearAllFilters,
      tipos,
      sectores,
      responsables,
      estados
    }),
    showObservationForm
      ? h(ObservationFormInline, {
          initialAlumno: alumnoSeleccionado || "",
          onSave: handleObservationSaved,
          students: studentsForObservation,
          currentUser: AuthService.getCurrentUser(),
          onClose: () => setShowObservationForm(false)
        })
      : null,
    h(
      "div",
      { className: "observations-list" },
      observaciones.length
        ? observaciones.map((observation) =>
            h(ObservationCard, {
              key: `${observation.id || observation.alumno}-${observation.fecha || Math.random()}`,
              observation,
              onView: () => setAlumnoSeleccionado(observation.alumno),
              onEdit: () => setAlumnoSeleccionado(observation.alumno)
            })
          )
        : h("p", { className: "observations-empty" }, "No hay observaciones para los filtros seleccionados.")
    )
  );
}