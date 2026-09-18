import { useEffect, useRef, useState } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
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
      h(
        "svg",
        {
          className: `custom-select__arrow ${isOpen ? "custom-select__arrow--open" : ""}`,
          viewBox: "0 0 20 20",
          fill: "currentColor",
          "aria-hidden": "true"
        },
        h("path", {
          fillRule: "evenodd",
          d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
          clipRule: "evenodd"
        })
      )
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

function SearchableSelect({ label, value, options, onChange, placeholder, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectOption = (option) => {
    onChange(option);
    setIsOpen(false);
    setQuery("");
  };

  return h(
    "div",
    { ref: wrapperRef, className: "custom-select-wrapper searchable-select" },
    h(
      "button",
      {
        type: "button",
        className: `custom-select__trigger ${value ? "custom-select__trigger--active" : ""}`,
        onClick: () => setIsOpen((previous) => !previous),
        disabled,
        "aria-expanded": isOpen,
        "aria-label": label
      },
      h("span", { className: "custom-select__trigger-text" }, value || placeholder || label),
      h(
        "svg",
        { className: `custom-select__arrow ${isOpen ? "custom-select__arrow--open" : ""}`, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" },
        h("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z", clipRule: "evenodd" })
      )
    ),
    isOpen
      ? h(
        "div",
        { className: "custom-select__dropdown searchable-select__dropdown" },
        h("input", {
          className: "searchable-select__input",
          type: "search",
          value: query,
          onChange: (event) => setQuery(event.target.value),
          placeholder: `Buscar ${label.toLowerCase()}...`,
          autoFocus: true
        }),
        h(
          "div",
          { className: "custom-select__options-list" },
          filteredOptions.length
            ? filteredOptions.map((option) => h(
              "button",
              {
                key: option,
                type: "button",
                className: `custom-select__option ${option === value ? "custom-select__option--selected" : ""}`,
                onClick: () => selectOption(option)
              },
              option
            ))
            : h("span", { className: "searchable-select__empty" }, "Sin resultados")
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
  filtrosActivos = [],
  filtros,
  onFiltroChange,
  onFiltroClear,
  onFiltrosClear,
  tipos,
  estados,
  onNewObservation
}) {
  return h(
    "section",
    { className: "student-detail" },
    h(
      "div",
      { className: "student-detail__topbar" },
      h(
        "div",
        { className: "student-detail__info" },
        h(
          "button",
          { type: "button", className: "btn-volver-atras", onClick: onBack },
          h(
            "svg",
            { className: "btn-volver-atras__icon", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" },
            h("path", {
              fillRule: "evenodd",
              d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
              clipRule: "evenodd"
            })
          ),
          "Volver a Observaciones"
        ),
        h("h1", null, alumno),
        h(
          "p",
          null,
          "División: 4°1° | Grupo: 1.0",
          h("span", { className: "student-detail__observation-count" }, `${observations.length} ${observations.length === 1 ? "observación" : "observaciones"}`)
        )
      ),
      h(
        ActionButton,
        { icon: "clipboard", onClick: onNewObservation },
        "Nueva observación"
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
          h("h2", null, "Historial")
        ),
        h(ObservationFilters, {
          filtros,
          onChange: onFiltroChange,
          onClear: onFiltroClear,
          onClearAll: onFiltrosClear,
          tipos,
          sectores,
          responsables,
          estados,
          showSearch: false,
          className: "student-history__filters"
        })
      ),
      h(
        "div",
        { className: "history-list" },
        observations.length
          ? observations.map((observation) =>
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
          : h("p", { className: "observations-empty" }, "Ninguna observacion")
      )
    )
  );
}

const CALENDAR_MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const CALENDAR_WEEKDAYS = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

function toDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateValue(value) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateValue(value) {
  if (!value) return "dd/mm/aaaa";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function parseTypedDate(value) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
    ? toDateValue(date)
    : null;
}

function formatTypedDateInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function DatePicker({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSelector, setOpenSelector] = useState(null);
  const [viewDate, setViewDate] = useState(() => parseDateValue(value));
  const [typedValue, setTypedValue] = useState(() => value ? formatDateValue(value) : "");
  const [draftValue, setDraftValue] = useState(value || "");
  const selectedDate = value ? parseDateValue(value) : null;
  const [instanceId] = useState(() => Math.random().toString(36).slice(2));

  useEffect(() => {
    if (value) setViewDate(parseDateValue(value));
    setTypedValue(value ? formatDateValue(value) : "");
  }, [value]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (!event.target.closest(".observation-date-picker")) {
        setIsOpen(false);
        setOpenSelector(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const closeOtherCalendar = (event) => {
      if (event.detail !== instanceId) {
        setIsOpen(false);
        setOpenSelector(null);
      }
    };
    window.addEventListener("prece-date-picker:open", closeOtherCalendar);
    return () => window.removeEventListener("prece-date-picker:open", closeOtherCalendar);
  }, [instanceId]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = index - startOffset + 1;
    return day > 0 && day <= daysInMonth ? new Date(year, month, day) : null;
  });
  const years = Array.from({ length: 51 }, (_, index) => 2000 + index);

  const toggleCalendar = () => {
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent("prece-date-picker:open", { detail: instanceId }));
      setDraftValue(value || "");
      setTypedValue("");
      onChange("");
    }
    setIsOpen((previous) => !previous);
    setOpenSelector(null);
  };

  const moveMonth = (amount) => {
    setViewDate(new Date(year, month + amount, 1));
  };

  const selectDay = (date) => {
    onChange(toDateValue(date));
    setIsOpen(false);
    setOpenSelector(null);
  };

  const handleTypedValue = (nextValue) => {
    const formattedValue = formatTypedDateInput(nextValue);
    setTypedValue(formattedValue);
    const parsedValue = parseTypedDate(formattedValue);
    if (parsedValue) {
      onChange(parsedValue);
      setViewDate(parseDateValue(parsedValue));
      setIsOpen(false);
      setOpenSelector(null);
    }
  };

  const cancelCalendar = () => {
    setTypedValue(draftValue ? formatDateValue(draftValue) : "");
    onChange(draftValue);
    setIsOpen(false);
    setOpenSelector(null);
  };

  return h(
    "div",
    { className: "observation-date-picker" },
    h("span", { className: "observation-date-picker__label" }, label),
    h(
      "div",
      {
        className: `observation-date-picker__trigger ${isOpen ? "is-open" : ""}`,
        onClick: (event) => {
          if (event.target.tagName !== "INPUT") toggleCalendar();
        },
        "aria-expanded": isOpen
      },
      h("input", {
        type: "text",
        value: typedValue,
        placeholder: "dd/mm/aaaa",
        onFocus: () => {
          if (!isOpen) toggleCalendar();
        },
        onChange: (event) => handleTypedValue(event.target.value),
        onBlur: () => {
          if (typedValue && typedValue !== "dd/mm/aaaa" && !parseTypedDate(typedValue)) {
            setTypedValue(formatDateValue(value));
          }
        },
        "aria-label": label
      }),
      h(
        "button",
        {
          type: "button",
          className: "observation-date-picker__calendar-icon",
          onClick: (event) => {
            event.stopPropagation();
            toggleCalendar();
          },
          "aria-label": `Abrir ${label}`
        },
        h(
          "svg",
          { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", "aria-hidden": "true" },
          h("rect", { x: "3.5", y: "5.5", width: "17", height: "15", rx: "2" }),
          h("path", { d: "M7.5 3.5v4M16.5 3.5v4M3.5 10h17" })
        )
      )
    ),
    isOpen
      ? h(
        "div",
        { className: "observation-calendar" },
        h(
          "div",
          { className: "observation-calendar__header" },
          h(
            "button",
            { type: "button", className: "observation-calendar__nav", onClick: () => moveMonth(-1), "aria-label": "Mes anterior" },
            "‹"
          ),
          h(
            "div",
            { className: "observation-calendar__selectors" },
            h(
              "div",
              { className: "observation-calendar__select observation-calendar__select--month" },
              h(
                "button",
                {
                  type: "button",
                  className: "observation-calendar__select-trigger",
                  onClick: () => setOpenSelector(openSelector === "month" ? null : "month"),
                  "aria-expanded": openSelector === "month"
                },
                CALENDAR_MONTHS[month],
                h(
                  "svg",
                  { className: "observation-calendar__select-arrow", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" },
                  h("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z", clipRule: "evenodd" })
                )
              ),
              openSelector === "month"
                ? h(
                  "div",
                  { className: "observation-calendar__select-menu observation-calendar__month-menu" },
                  CALENDAR_MONTHS.map((monthName, index) => h(
                    "button",
                    {
                      key: monthName,
                      type: "button",
                      className: index === month ? "is-selected" : "",
                      onClick: () => {
                        setViewDate(new Date(year, index, 1));
                        setOpenSelector(null);
                      }
                    },
                    monthName
                  ))
                )
                : null
            ),
            h(
              "div",
              { className: "observation-calendar__select observation-calendar__select--year" },
              h(
                "button",
                {
                  type: "button",
                  className: "observation-calendar__select-trigger",
                  onClick: () => setOpenSelector(openSelector === "year" ? null : "year"),
                  "aria-expanded": openSelector === "year"
                },
                year,
                h(
                  "svg",
                  { className: "observation-calendar__select-arrow", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" },
                  h("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z", clipRule: "evenodd" })
                )
              ),
              openSelector === "year"
                ? h(
                  "div",
                  { className: "observation-calendar__select-menu observation-calendar__year-menu" },
                  years.map((yearOption) => h(
                    "button",
                    {
                      key: yearOption,
                      type: "button",
                      className: yearOption === year ? "is-selected" : "",
                      onClick: () => {
                        setViewDate(new Date(yearOption, month, 1));
                        setOpenSelector(null);
                      }
                    },
                    yearOption
                  ))
                )
                : null
            )
          ),
          h(
            "button",
            { type: "button", className: "observation-calendar__nav", onClick: () => moveMonth(1), "aria-label": "Mes siguiente" },
            "›"
          )
        ),
        h(
          "div",
          { className: "observation-calendar__weekdays" },
          CALENDAR_WEEKDAYS.map((weekday) => h("span", { key: weekday }, weekday))
        ),
        h(
          "div",
          { className: "observation-calendar__days" },
          calendarDays.map((date, index) => {
            if (!date) return h("span", { key: `empty-${index}` });
            const dateValue = toDateValue(date);
            const isSelected = selectedDate && dateValue === value;
            const isToday = dateValue === toDateValue(new Date());
            return h(
              "button",
              {
                key: dateValue,
                type: "button",
                className: `observation-calendar__day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`,
                onClick: () => selectDay(date)
              },
              date.getDate()
            );
          })
        ),
        h(
          "div",
          { className: "observation-calendar__footer" },
          h("button", { type: "button", onClick: cancelCalendar }, "Cancelar"),
          h("button", { type: "button", onClick: () => selectDay(new Date()) }, "Hoy")
        )
      )
      : null
  );
}

function ObservationFilters({ filtros, onChange, onClear, onClearAll, tipos, sectores, responsables, estados, showSearch = true, className = "" }) {
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
    { className: `alumnos-toolbar observations-toolbar ${className}`.trim() },
    showSearch
      ? h(
        "div",
        { className: "search-input-wrapper observations-toolbar__search" },
        h(IconoFigma, { className: "search-input-icon", nombre: "search" }),
        h("input", {
          type: "search",
          className: "search-input",
          value: filtros.query,
          onChange: (event) => onChange("query", event.target.value),
          placeholder: "Ingrese apellido, nombre o DNI....",
          "aria-label": "Buscar alumno"
        }),
      )
      : null,
    h(
      "div",
      { className: "filters-group observations-toolbar__filters" },
      filtersConfig.map(({ key, label, type, options }) => {
        const value = filtros[key];
        const control = type === "select"
          ? h(CustomSelect, {
            label,
            value: value || "",
            placeholder: label,
            options: [{ value: "", label }, ...options.map((option) => ({ value: option, label: option }))],
            onChange: (nextValue) => onChange(key, nextValue)
          })
          : h("input", {
            type,
            className: "select-filter observation-date-filter",
            value: value || "",
            onChange: (event) => onChange(key, event.target.value),
            "aria-label": label
          });

        return h(
          "div",
          { className: `observations-toolbar__field${type === "select" ? "" : " observations-toolbar__date-field"}`, key },
          type === "select" ? control : h(DatePicker, { label, value: value || "", onChange: (nextValue) => onChange(key, nextValue) })
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
  const responsibleOptions = [...new Set([
    resolveResponsibleFromUser(currentUser, true),
    ...OBSERVACIONES.map((observation) => observation.responsable),
    ...getStoredObservations().map((observation) => observation.responsable)
  ].filter(Boolean))].sort();

  return h(
    "section",
    { className: "cargar-alumno-page secretaria-dashboard observations-form-page" },
    h(
      "div",
      { className: "secretaria-top-bar" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: onClose,
          title: "Volver a observaciones",
          "aria-label": "Volver a observaciones"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver a Observaciones")
      ),
      h(
        "div",
        { className: "secretaria-eyebrow" },
        `${currentUser?.escuela || "E.E.S.T N°1 MONTE GRANDE"} · CICLO ${currentUser?.cicloLectivo || 2026}`
      )
    ),
    h(
      "div",
      { className: "secretaria-title-row" },
      h(
        "div",
        null,
        h("h1", { className: "secretaria-title" }, "Cargar Observación"),
        h("p", { className: "secretaria-subtitle" }, "Registrá una observación para el seguimiento institucional del estudiante.")
      )
    ),
    h(
      DashboardCard,
      {
        title: "Datos de la Observación",
        icon: "clipboard",
        className: "dashboard-card--highlight cargar-alumno-card observations-form-card",
        collapsible: false
      },
      h(
        "form",
        { className: "wizard-form-body", onSubmit: handleSubmit },
        h("div", { className: "form-section-header" },
          h("h3", { className: "form-section-title" }, "Información del seguimiento"),
          h("span", { className: "form-section-desc" }, "Toda la información necesaria para registrar la situación")
        ),
        error ? h("p", { className: "form-error-message" }, error) : null,
        h(
          "div",
          { className: "observation-form__grid" },
          h(
            "div",
            { className: "observation-form-row" },
            h(
              "div",
              { className: "form-field-group" },
              h(SearchableSelect, {
                label: "Alumno",
                value: form.alumno,
                placeholder: "Seleccionar alumno",
                options: studentOptions.map((option) => option.value),
                onChange: (value) => setField("alumno", value),
                disabled: Boolean(initialAlumno)
              })
            ),
            h(
              "div",
              { className: "form-field-group" },
              h(CustomSelect, {
                label: "Tipo de observación",
                value: form.tipo,
                placeholder: "Seleccionar tipo",
                options: [{ value: "", label: "Seleccionar tipo" }, ...DEFAULT_OBSERVATION_TYPES.map((tipo) => ({ value: tipo, label: tipo }))],
                onChange: (value) => setField("tipo", value)
              })
            ),
          ),
          h(
            "div",
            { className: "observation-form-row" },
            h(
              "div",
              { className: "form-field-group" },
              h(DatePicker, { label: "Fecha", value: form.fecha, onChange: (value) => setField("fecha", value) })
            ),
            h(
              "div",
              { className: "form-field-group" },
              h(CustomSelect, {
                label: "Sector",
                value: form.sector,
                placeholder: "Seleccionar sector",
                options: [{ value: "", label: "Seleccionar sector" }, ...DEFAULT_OBSERVATION_SECTORS.map((sector) => ({ value: sector, label: sector }))],
                onChange: (value) => setField("sector", value)
              })
            ),
          ),
          h(
            "div",
            { className: "observation-form-row" },
            h(
              "div",
              { className: "form-field-group" },
              h(SearchableSelect, {
                label: "Responsable",
                value: form.responsable,
                placeholder: "Seleccionar responsable",
                options: responsibleOptions,
                onChange: (value) => setField("responsable", value)
              })
            ),
            h(
              "div",
              { className: "form-field-group" },
              h(CustomSelect, {
                label: "Estado",
                value: form.estado,
                placeholder: "Sin estado",
                options: [{ value: "", label: "Sin estado" }, "Activa", "Modificada", "Histórica"],
                onChange: (value) => setField("estado", value)
              })
            )
          )
        ),
        h(
          "div",
          { className: "form-field-group form-field--full" },
          h("label", { className: "form-field-label" }, "Descripción"),
          h("textarea", {
            className: "form-field-textarea observation-form__textarea",
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
          { className: "wizard-footer-actions" },
          h("button", { type: "button", className: "btn-wizard-anterior", onClick: onClose }, "Cancelar y volver"),
          h("button", { type: "submit", className: "btn-wizard-submit", disabled: saving }, saving ? "Guardando..." : "Guardar observación")
        )
      )
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
  const [queryHistorial, setQueryHistorial] = useState("");
  const [fechaDesdeHistorial, setFechaDesdeHistorial] = useState("");
  const [fechaHastaHistorial, setFechaHastaHistorial] = useState("");
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
      const query = queryHistorial.trim().toLowerCase();
      const fechaObservacion = parseFecha(observation.fecha || "01/01/2000");
      const fechaDesde = fechaDesdeHistorial ? new Date(`${fechaDesdeHistorial}T00:00:00`) : null;
      const fechaHasta = fechaHastaHistorial ? new Date(`${fechaHastaHistorial}T23:59:59`) : null;
      const coincideTipo = tipoHistorial === "Tipo de observación" || observation.tipo === tipoHistorial;
      const coincideEstado = estadoHistorial === "Estado" || observation.estado === estadoHistorial;
      const coincideSector = !sectorHistorial || observation.sector === sectorHistorial;
      const coincideResponsable = !responsableHistorial || observation.responsable === responsableHistorial;
      const coincideBusqueda = !query || `${observation.tipo} ${observation.descripcion} ${observation.id}`.toLowerCase().includes(query);
      const coincideFechaDesde = !fechaDesde || fechaObservacion >= fechaDesde;
      const coincideFechaHasta = !fechaHasta || fechaObservacion <= fechaHasta;
      return coincideBusqueda && coincideFechaDesde && coincideFechaHasta && coincideTipo && coincideEstado && coincideSector && coincideResponsable;
    }).sort((a, b) => parseFecha(b.fecha || "01/01/2000") - parseFecha(a.fecha || "01/01/2000"));
    const sectoresAlumno = [...new Set(historialBase.map((observation) => observation.sector).filter(Boolean))].sort();
    const responsablesAlumno = [...new Set(historialBase.map((observation) => observation.responsable).filter(Boolean))].sort();

    const filtrosActivosHistorial = [
      queryHistorial ? { key: "query", label: `Búsqueda: ${queryHistorial}`, onRemove: () => setQueryHistorial("") } : null,
      fechaDesdeHistorial ? { key: "fechaDesde", label: `Fecha desde: ${fechaDesdeHistorial}`, onRemove: () => setFechaDesdeHistorial("") } : null,
      fechaHastaHistorial ? { key: "fechaHasta", label: `Fecha hasta: ${fechaHastaHistorial}`, onRemove: () => setFechaHastaHistorial("") } : null,
      tipoHistorial !== "Tipo de observación" ? { key: "tipo", label: `Tipo: ${tipoHistorial}`, onRemove: () => setTipoHistorial("Tipo de observación") } : null,
      estadoHistorial !== "Estado" ? { key: "estado", label: `Estado: ${estadoHistorial}`, onRemove: () => setEstadoHistorial("Estado") } : null,
      sectorHistorial ? { key: "sector", label: `Sector: ${sectorHistorial}`, onRemove: () => setSectorHistorial("") } : null,
      responsableHistorial ? { key: "responsable", label: `Responsable: ${responsableHistorial}`, onRemove: () => setResponsableHistorial("") } : null
    ].filter(Boolean);

    if (showObservationForm) {
      return h(ObservationFormInline, {
        initialAlumno: alumnoSeleccionado,
        onSave: handleObservationSaved,
        students: studentsForObservation,
        currentUser: AuthService.getCurrentUser(),
        onClose: () => setShowObservationForm(false)
      });
    }

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
        filtrosActivos: filtrosActivosHistorial,
        filtros: {
          query: queryHistorial,
          fechaDesde: fechaDesdeHistorial,
          fechaHasta: fechaHastaHistorial,
          tipo: tipoHistorial === "Tipo de observación" ? "" : tipoHistorial,
          sector: sectorHistorial,
          responsable: responsableHistorial,
          estado: estadoHistorial === "Estado" ? "" : estadoHistorial
        },
        onFiltroChange: (key, value) => {
          const handlers = {
            query: setQueryHistorial,
            fechaDesde: setFechaDesdeHistorial,
            fechaHasta: setFechaHastaHistorial,
            tipo: (nextValue) => setTipoHistorial(nextValue || "Tipo de observación"),
            sector: setSectorHistorial,
            responsable: setResponsableHistorial,
            estado: (nextValue) => setEstadoHistorial(nextValue || "Estado")
          };
          handlers[key]?.(value);
        },
        onFiltroClear: (key) => {
          const handlers = {
            query: () => setQueryHistorial(""),
            fechaDesde: () => setFechaDesdeHistorial(""),
            fechaHasta: () => setFechaHastaHistorial(""),
            tipo: () => setTipoHistorial("Tipo de observación"),
            sector: () => setSectorHistorial(""),
            responsable: () => setResponsableHistorial(""),
            estado: () => setEstadoHistorial("Estado")
          };
          handlers[key]?.();
        },
        onFiltrosClear: () => {
          setQueryHistorial("");
          setFechaDesdeHistorial("");
          setFechaHastaHistorial("");
          setTipoHistorial("Tipo de observación");
          setSectorHistorial("");
          setResponsableHistorial("");
          setEstadoHistorial("Estado");
        },
        tipos,
        estados,
        onNewObservation: () => openObservationForm(alumnoSeleccionado)
      }),
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

  if (showObservationForm) {
    return h(ObservationFormInline, {
      initialAlumno: "",
      onSave: handleObservationSaved,
      students: studentsForObservation,
      currentUser: AuthService.getCurrentUser(),
      onClose: () => setShowObservationForm(false)
    });
  }

  return h(
    "section",
    { className: "observations-panel" },
    h(
      "div",
      { className: "dashboard-top-bar alumnos-top-nav observations-top-nav" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            window.location.hash = "#/inicio-secretaria";
          },
          title: "Volver al dashboard de secretaría",
          "aria-label": "Volver al dashboard de secretaría"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver al Dashboard")
      )
    ),
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
        : h("p", { className: "observations-empty" }, "Ninguna observacion")
    )
  );
}