import React, { useState, useRef, useEffect, useMemo } from "react";
import { h } from "../../layouts/site-layout.js";

/**
 * Normaliza las opciones para aceptar strings ("Opcion"), { value, label }, o { id, nombre }.
 */
function normalizarOpcion(opt) {
  if (opt === null || opt === undefined) return null;
  if (typeof opt === "string" || typeof opt === "number") {
    return { value: String(opt), label: String(opt) };
  }
  if (typeof opt === "object") {
    const value = opt.value ?? opt.id ?? opt.valor ?? "";
    const label = opt.label ?? opt.nombre ?? opt.name ?? String(value);
    return { value: String(value), label: String(label) };
  }
  return { value: String(opt), label: String(opt) };
}

/**
 * Componente Select / Dropdown institucional estilizado para formularios y modales.
 * Reemplaza los <select> nativos del navegador por un desplegable moderno con animaciones,
 * microinteracciones, accesibilidad y compatibilidad con formularios y filtros.
 */
export function CustomSelect({
  label,
  value,
  options = [],
  onChange,
  placeholder,
  className = "",
  disabled = false,
  required = false,
  isFilter = false,
  isSearchable = false,
  ariaLabel,
  id,
  name,
  defaultOpen = false,
  onClose,
  dropUp = false
}) {
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen));
  const [busqueda, setBusqueda] = useState("");
  const [instanceId] = useState(() => Math.random().toString(36).slice(2));
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalizar array de opciones
  const normalizedOptions = useMemo(() => {
    return options.map(normalizarOpcion).filter(Boolean);
  }, [options]);

  const stringValue = value !== undefined && value !== null ? String(value) : "";
  const selectedOption = normalizedOptions.find((opt) => opt.value === stringValue);

  // Determinar si hay un valor seleccionado no vacío / no por defecto
  const hasSelection = Boolean(
    selectedOption &&
    selectedOption.value !== "" &&
    selectedOption.value !== "todos" &&
    selectedOption.value !== "todas"
  );

  // Cerrar al hacer clic fuera del componente o presionar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setBusqueda("");
        if (onClose) onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setBusqueda("");
        if (onClose) onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Cerrar cuando otro CustomSelect se abre en la pantalla
  useEffect(() => {
    const handleOtherSelectOpen = (event) => {
      if (event.detail !== instanceId) {
        setIsOpen(false);
        setBusqueda("");
        if (onClose) onClose();
      }
    };
    window.addEventListener("prece-custom-select:open", handleOtherSelectOpen);
    return () => window.removeEventListener("prece-custom-select:open", handleOtherSelectOpen);
  }, [instanceId]);

  // Enfocar buscador si está abierto
  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, isSearchable]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent("prece-custom-select:open", { detail: instanceId }));
      setIsOpen(true);
    } else {
      setBusqueda("");
      setIsOpen(false);
      if (onClose) onClose();
    }
  };

  const handleSelect = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setBusqueda("");
    if (onClose) onClose();
  };

  // Opciones filtradas por búsqueda con soporte para tildes
  const filteredOptions = useMemo(() => {
    if (!busqueda.trim()) return normalizedOptions;
    const normalizeStr = (str) =>
      String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const q = normalizeStr(busqueda);
    return normalizedOptions.filter((opt) => normalizeStr(opt.label).includes(q));
  }, [normalizedOptions, busqueda]);

  // Determinar texto del disparador
  let triggerContent;
  if (isOpen && isSearchable) {
    const inputPlaceholder = selectedOption
      ? selectedOption.label
      : placeholder || label || "Buscar...";

    triggerContent = h(
      "div",
      { className: "custom-select__trigger-input-wrap" },
      h("input", {
        ref: searchInputRef,
        type: "text",
        className: `custom-select__trigger-input ${hasSelection ? "custom-select__trigger-input--has-selection" : ""}`,
        value: busqueda,
        placeholder: inputPlaceholder,
        autoFocus: true,
        onChange: (e) => setBusqueda(e.target.value),
        onClick: (e) => e.stopPropagation(),
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setIsOpen(false);
            setBusqueda("");
            if (onClose) onClose();
          } else if (e.key === "Enter" && filteredOptions.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(filteredOptions[0].value);
          }
        }
      }),
      busqueda
        ? h(
            "button",
            {
              type: "button",
              className: "custom-select__trigger-clear",
              "aria-label": "Borrar búsqueda",
              onClick: (e) => {
                e.stopPropagation();
                setBusqueda("");
                if (searchInputRef.current) searchInputRef.current.focus();
              }
            },
            h(
              "svg",
              { viewBox: "0 0 20 20", fill: "currentColor", width: 14, height: 14 },
              h("path", {
                fillRule: "evenodd",
                d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
                clipRule: "evenodd"
              })
            )
          )
        : null
    );
  } else if (isFilter) {
    const isDefault = stringValue === "todos" || stringValue === "todas" || !stringValue;
    triggerContent = h(
      "span",
      { className: "custom-select__trigger-text" },
      h("span", { className: "custom-select__label-prefix" }, label),
      !isDefault && selectedOption
        ? h("span", { className: "custom-select__active-val" }, selectedOption.label)
        : null
    );
  } else {
    // Form / Modal mode
    const displayText = selectedOption
      ? selectedOption.label
      : placeholder || label || "Seleccionar...";
    
    const isPlaceholder = !hasSelection && Boolean(placeholder || label);

    triggerContent = h(
      "span",
      {
        className: `custom-select__trigger-text ${isPlaceholder ? "custom-select__trigger-text--placeholder" : ""}`
      },
      displayText
    );
  }

  return h(
    "div",
    {
      ref: containerRef,
      className: `custom-select-wrapper ${isOpen ? "custom-select-wrapper--open" : ""} ${disabled ? "custom-select-wrapper--disabled" : ""} ${dropUp ? "custom-select-wrapper--dropup" : ""} ${className}`.trim()
    },

    // Hidden input for form integrations if needed
    name
      ? h("input", {
          type: "hidden",
          name,
          id,
          value: stringValue,
          required: required || undefined
        })
      : null,

    // Botón / Contenedor disparador (Trigger)
    h(
      isSearchable ? "div" : "button",
      {
        type: !isSearchable ? "button" : undefined,
        id: id ? `${id}-trigger` : undefined,
        tabIndex: disabled ? -1 : 0,
        className: `custom-select__trigger ${isFilter && hasSelection ? "custom-select__trigger--active" : ""} ${isOpen ? "custom-select__trigger--open" : ""} ${disabled ? "is-disabled" : ""} ${isSearchable ? "custom-select__trigger--searchable" : ""}`,
        onClick: handleToggle,
        onKeyDown: (e) => {
          if (!isOpen && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
            e.preventDefault();
            handleToggle();
          }
        },
        disabled: !isSearchable && disabled ? true : undefined,
        "aria-haspopup": "listbox",
        "aria-expanded": isOpen,
        "aria-label": ariaLabel || label || placeholder
      },
      triggerContent,
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

    // Menú flotante con las opciones diseñadas (sin input redundante abajo)
    isOpen && !disabled
      ? h(
          "div",
          {
            className: "custom-select__dropdown",
            role: "listbox",
            "aria-label": label || placeholder
          },
          h(
            "div",
            { className: "custom-select__options-list" },
            filteredOptions.length === 0
              ? h("div", { className: "custom-select__empty" }, "No se encontraron resultados")
              : filteredOptions.map((opt, index) => {
                  const isSelected = opt.value === stringValue;
                  const isFirstAll = opt.value === "todos" || opt.value === "todas";

                  return h(
                    "button",
                    {
                      key: `${opt.value}-${index}`,
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
