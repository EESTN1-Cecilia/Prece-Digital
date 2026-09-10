import React, { useState, useRef, useEffect } from "react";
import { h } from "../../layouts/site-layout.js";

/**
 * Componente Select / Dropdown estilizado para filtros y formularios.
 * Reemplaza los <select> nativos del navegador por un menú desplegable moderno,
 * accesible y con microinteracciones y estilos institucionales.
 *
 * @param {string} label - Título del filtro (ej: "Curso", "División")
 * @param {string} value - Valor actualmente seleccionado
 * @param {Array<{value: string, label: string}>} options - Opciones disponibles
 * @param {Function} onChange - Callback al cambiar la selección (recibe el nuevo valor string)
 * @param {string} [className] - Clases CSS adicionales
 * @param {string} [ariaLabel] - Etiqueta de accesibilidad
 */
export function CustomSelect({
  label,
  value,
  options = [],
  onChange,
  className = "",
  ariaLabel
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Determinar si hay un valor activo diferente al valor por defecto ("todos" / "todas")
  const isDefault = value === "todos" || value === "todas" || !value;
  const selectedOption = options.find((opt) => opt.value === value);

  // Cerrar al hacer clic fuera del componente o presionar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  // Texto a mostrar en el botón trigger
  const displayLabel = isDefault
    ? label
    : `${label}: ${selectedOption ? selectedOption.label : value}`;

  return h(
    "div",
    {
      ref: containerRef,
      className: `custom-select-wrapper ${isOpen ? "custom-select-wrapper--open" : ""} ${className}`
    },

    // Botón disparador (Trigger)
    h(
      "button",
      {
        type: "button",
        className: `custom-select__trigger ${!isDefault ? "custom-select__trigger--active" : ""} ${isOpen ? "custom-select__trigger--open" : ""}`,
        onClick: () => setIsOpen((prev) => !prev),
        "aria-haspopup": "listbox",
        "aria-expanded": isOpen,
        "aria-label": ariaLabel || label
      },
      h(
        "span",
        { className: "custom-select__trigger-text" },
        h("span", { className: "custom-select__label-prefix" }, label),
        !isDefault && selectedOption
          ? h("span", { className: "custom-select__active-val" }, selectedOption.label)
          : null
      ),
      // Icono chevron flecha
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

    // Menú flotante con las opciones diseñadas
    isOpen
      ? h(
          "div",
          {
            className: "custom-select__dropdown",
            role: "listbox",
            "aria-label": label
          },
          h(
            "div",
            { className: "custom-select__options-list" },
            options.map((opt, index) => {
              const isSelected = opt.value === value;
              const isFirstAll = opt.value === "todos" || opt.value === "todas";

              return h(
                "button",
                {
                  key: opt.value || index,
                  type: "button",
                  role: "option",
                  "aria-selected": isSelected,
                  className: `custom-select__option ${isSelected ? "custom-select__option--selected" : ""} ${isFirstAll ? "custom-select__option--all" : ""}`,
                  onClick: () => handleSelect(opt.value)
                },
                h("span", { className: "custom-select__option-label" }, opt.label),
                isSelected
                  ? h(
                      "svg",
                      {
                        className: "custom-select__check-icon",
                        viewBox: "0 0 20 20",
                        fill: "currentColor",
                        "aria-hidden": "true"
                      },
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

export default CustomSelect;
