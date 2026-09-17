import { useState, useEffect, useRef } from "react";
import { h } from "../../layouts/site-layout.js";

// Datos de Alumnos institucionales de muestra
export const ALUMNOS_DEMO = [
  { id: 1, apellido: "González", nombre: "Lucas Agustín", dni: "46.123.456", curso: "7°", division: "2", turno: "Tarde", orientacion: "Técnico en Programación", legajo: "LEG-2026-081" },
  { id: 19, apellido: "Medina", nombre: "Lautaro Nahuel", dni: "43.111.222", curso: "7°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", legajo: "LEG-2026-019" },
  { id: 24, apellido: "Molina", nombre: "Kiara Denise", dni: "42.666.777", curso: "5°", division: "2", turno: "Tarde", orientacion: "Técnico en Informática", legajo: "LEG-2026-024" },
  { id: 21, apellido: "Aguirre", nombre: "Thiago Valentín", dni: "43.333.444", curso: "4°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", legajo: "LEG-2026-021" },
  { id: 23, apellido: "Gutiérrez", nombre: "Matías Alejandro", dni: "42.555.666", curso: "5°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", legajo: "LEG-2026-023" },
  { id: 28, apellido: "Ortiz", nombre: "Constanza Guadalupe", dni: "41.234.567", curso: "6°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", legajo: "LEG-2026-028" },
  { id: 29, apellido: "Vargas", nombre: "Maximiliano Gastón", dni: "40.345.678", curso: "3°", division: "3", turno: "Mañana", orientacion: "Ciclo Básico", legajo: "LEG-2026-029" },
  { id: 30, apellido: "Cabrera", nombre: "Antonella Solange", dni: "40.456.789", curso: "3°", division: "1", turno: "Tarde", orientacion: "Ciclo Básico", legajo: "LEG-2026-030" }
];

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function getFechaActual() {
  const d = new Date();
  return {
    dia: String(d.getDate()).padStart(2, "0"),
    mes: MESES[d.getMonth()],
    mesNumero: String(d.getMonth() + 1).padStart(2, "0"),
    anio: String(d.getFullYear())
  };
}

// Componente Desplegable Estilizado para Barra Superior (Idéntico a AlumnoMatrizModal)
export function DarkCustomDropdown({
  label,
  value,
  opciones = [],
  onSelect,
  placeholder = "Seleccionar...",
  isSearchable = false,
  searchValue = "",
  onSearchChange = null
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [abierto]);

  const opcionSeleccionada = opciones.find((o) => String(o.value) === String(value));
  const textoMostrado = opcionSeleccionada ? opcionSeleccionada.label : placeholder;

  return h(
    "div",
    { className: "custom-dark-dropdown", ref },
    h(
      "button",
      {
        type: "button",
        className: `custom-dark-dropdown__btn ${abierto ? "custom-dark-dropdown__btn--open" : ""}`,
        onClick: () => setAbierto(!abierto),
        "aria-expanded": abierto
      },
      h("span", { className: "custom-dark-dropdown__label-title" }, label ? `${label}: ` : ""),
      h("span", { className: "custom-dark-dropdown__btn-text" }, textoMostrado),
      h(
        "svg",
        {
          className: `custom-dark-dropdown__chevron ${abierto ? "custom-dark-dropdown__chevron--open" : ""}`,
          viewBox: "0 0 20 20",
          fill: "currentColor"
        },
        h("path", {
          fillRule: "evenodd",
          d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
          clipRule: "evenodd"
        })
      )
    ),

    abierto
      ? h(
          "div",
          { className: "custom-dark-dropdown__menu" },
          isSearchable
            ? h(
                "div",
                { className: "custom-dark-dropdown__search-wrap" },
                h("input", {
                  type: "text",
                  className: "custom-dark-dropdown__search-input",
                  placeholder: "Buscar por nombre, apellido o DNI...",
                  value: searchValue,
                  onChange: (e) => onSearchChange && onSearchChange(e.target.value),
                  autoFocus: true,
                  onClick: (e) => e.stopPropagation()
                })
              )
            : null,
          h(
            "div",
            { className: "custom-dark-dropdown__list" },
            opciones.length === 0
              ? h("div", { className: "custom-dark-dropdown__item custom-dark-dropdown__item--empty" }, "No se encontraron resultados")
              : opciones.map((opcion) => {
                  const estaActiva = String(opcion.value) === String(value);
                  return h(
                    "button",
                    {
                      key: opcion.value,
                      type: "button",
                      className: `custom-dark-dropdown__item ${estaActiva ? "custom-dark-dropdown__item--active" : ""}`,
                      onClick: () => {
                        onSelect(opcion.value);
                        setAbierto(false);
                      }
                    },
                    h("span", { className: "custom-dark-dropdown__item-text" }, opcion.label),
                    estaActiva
                      ? h(
                          "svg",
                          { className: "custom-dark-dropdown__check-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                          h("path", {
                            fillRule: "evenodd",
                            d: "M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z",
                            clipRule: "evenodd"
                          })
                        )
                      : null
                  );
                })
          )
        )
      : null
  );
}

// Sello Institucional Circular
export function SelloInstitucionalCircular() {
  return h(
    "div",
    { className: "doc-sello-circular" },
    h("div", { className: "doc-sello-inner" },
      h("span", { className: "doc-sello-top" }, "DIR. GRAL. DE CULTURA Y EDUCACIÓN"),
      h("span", { className: "doc-sello-center" }, "E.E.S.T. Nº 1"),
      h("span", { className: "doc-sello-sub" }, "SECRETARÍA"),
      h("span", { className: "doc-sello-bottom" }, "PROV. DE BUENOS AIRES")
    )
  );
}

// Botón de Cierre en la barra superior que permanece fijo al scrollear
export function BotonCerrarBarra({ onCerrar }) {
  if (!onCerrar) return null;
  return h(
    "button",
    {
      type: "button",
      className: "matriz-close-btn-topright no-print",
      onClick: onCerrar,
      "aria-label": "Cerrar modal",
      title: "Cerrar"
    },
    h(
      "svg",
      { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", width: "18", height: "18" },
      h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
      h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
    )
  );
}
