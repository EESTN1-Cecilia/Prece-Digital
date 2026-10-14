import React, { useState, useEffect, useRef } from "react";
import { h } from "../../layouts/site-layout.js";

const CALENDAR_MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const CALENDAR_WEEKDAYS = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

function toDateValue(date) {
  if (!date || isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateValue(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const parts = String(value).split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateValue(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return "";
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function parseTypedDate(value) {
  if (!value) return null;
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

/**
 * CustomDatePicker: Componente selector de fecha con calendario flotante interactivo,
 * formateo automático de tipeo dd/mm/aaaa, y selector rápido de mes y año.
 */
export function CustomDatePicker({
  label,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  required = false,
  className = "",
  id,
  name,
  minYear = 1950,
  maxYear = 2040
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSelector, setOpenSelector] = useState(null); // "month" | "year" | null
  const [viewDate, setViewDate] = useState(() => parseDateValue(value));
  const [typedValue, setTypedValue] = useState(() => (value ? formatDateValue(value) : ""));
  const [draftValue, setDraftValue] = useState(value || "");
  const [instanceId] = useState(() => Math.random().toString(36).slice(2));
  const containerRef = useRef(null);
  const yearMenuRef = useRef(null);

  const selectedDate = value ? parseDateValue(value) : null;

  useEffect(() => {
    if (value) {
      setViewDate(parseDateValue(value));
      setTypedValue(formatDateValue(value));
    } else {
      setTypedValue("");
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setOpenSelector(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setOpenSelector(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  // Scroll year list to current view year
  useEffect(() => {
    if (openSelector === "year" && yearMenuRef.current) {
      const selectedBtn = yearMenuRef.current.querySelector(".is-selected");
      if (selectedBtn) {
        selectedBtn.scrollIntoView({ block: "center" });
      }
    }
  }, [openSelector]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = index - startOffset + 1;
    return day > 0 && day <= daysInMonth ? new Date(year, month, day) : null;
  });

  const yearsCount = Math.max(1, maxYear - minYear + 1);
  const years = Array.from({ length: yearsCount }, (_, index) => minYear + index);

  const toggleCalendar = () => {
    if (disabled) return;
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent("prece-date-picker:open", { detail: instanceId }));
      setDraftValue(value || "");
      if (value) {
        setViewDate(parseDateValue(value));
      }
    }
    setIsOpen((prev) => !prev);
    setOpenSelector(null);
  };

  const moveMonth = (amount) => {
    setViewDate(new Date(year, month + amount, 1));
  };

  const selectDay = (date) => {
    const isoString = toDateValue(date);
    setTypedValue(formatDateValue(isoString));
    if (onChange) onChange(isoString);
    setIsOpen(false);
    setOpenSelector(null);
  };

  const handleTypedValue = (nextValue) => {
    const formatted = formatTypedDateInput(nextValue);
    setTypedValue(formatted);
    const parsed = parseTypedDate(formatted);
    if (parsed) {
      if (onChange) onChange(parsed);
      setViewDate(parseDateValue(parsed));
    } else if (formatted === "") {
      if (onChange) onChange("");
    }
  };

  const handleInputBlur = () => {
    if (typedValue && typedValue !== "dd/mm/aaaa" && !parseTypedDate(typedValue)) {
      setTypedValue(value ? formatDateValue(value) : "");
    }
  };

  const clearDate = () => {
    setTypedValue("");
    if (onChange) onChange("");
    setIsOpen(false);
    setOpenSelector(null);
  };

  const selectToday = () => {
    const today = new Date();
    selectDay(today);
  };

  return h(
    "div",
    {
      ref: containerRef,
      className: `observation-date-picker ${disabled ? "is-disabled" : ""} ${className}`.trim()
    },
    label ? h("span", { className: "observation-date-picker__label" }, label) : null,
    h(
      "div",
      {
        className: `observation-date-picker__trigger ${isOpen ? "is-open" : ""} ${disabled ? "disabled" : ""}`,
        onClick: (e) => {
          if (e.target.tagName !== "INPUT") toggleCalendar();
        },
        "aria-expanded": isOpen
      },
      h("input", {
        id,
        name,
        type: "text",
        value: typedValue,
        placeholder,
        disabled: disabled || undefined,
        required: required || undefined,
        onFocus: () => {
          if (!isOpen && !disabled) toggleCalendar();
        },
        onChange: (e) => handleTypedValue(e.target.value),
        onBlur: handleInputBlur,
        "aria-label": label || placeholder
      }),
      h(
        "button",
        {
          type: "button",
          className: "observation-date-picker__calendar-icon",
          onClick: (e) => {
            e.stopPropagation();
            toggleCalendar();
          },
          disabled: disabled || undefined,
          "aria-label": label ? `Abrir calendario de ${label}` : "Abrir calendario"
        },
        h(
          "svg",
          { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", "aria-hidden": "true" },
          h("rect", { x: "3.5", y: "5.5", width: "17", height: "15", rx: "2" }),
          h("path", { d: "M7.5 3.5v4M16.5 3.5v4M3.5 10h17" })
        )
      )
    ),

    isOpen && !disabled
      ? h(
          "div",
          { className: "observation-calendar" },
          // Header
          h(
            "div",
            { className: "observation-calendar__header" },
            h(
              "button",
              {
                type: "button",
                className: "observation-calendar__nav",
                onClick: () => moveMonth(-1),
                "aria-label": "Mes anterior"
              },
              "‹"
            ),
            h(
              "div",
              { className: "observation-calendar__selectors" },
              // Selector de Mes
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
                  h("span", null, CALENDAR_MONTHS[month]),
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
                      CALENDAR_MONTHS.map((monthName, index) =>
                        h(
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
                        )
                      )
                    )
                  : null
              ),

              // Selector de Año
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
                  h("span", null, String(year)),
                  h(
                    "svg",
                    { className: "observation-calendar__select-arrow", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" },
                    h("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z", clipRule: "evenodd" })
                  )
                ),
                openSelector === "year"
                  ? h(
                      "div",
                      { ref: yearMenuRef, className: "observation-calendar__select-menu observation-calendar__year-menu" },
                      years.map((yearOption) =>
                        h(
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
                          String(yearOption)
                        )
                      )
                    )
                  : null
              )
            ),
            h(
              "button",
              {
                type: "button",
                className: "observation-calendar__nav",
                onClick: () => moveMonth(1),
                "aria-label": "Mes siguiente"
              },
              "›"
            )
          ),

          // Nombres de los Días
          h(
            "div",
            { className: "observation-calendar__weekdays" },
            CALENDAR_WEEKDAYS.map((w) => h("span", { key: w }, w))
          ),

          // Grilla de Días
          h(
            "div",
            { className: "observation-calendar__days" },
            calendarDays.map((date, index) => {
              if (!date) return h("span", { key: `empty-${index}`, className: "observation-calendar__day--empty" });
              const dateVal = toDateValue(date);
              const isSelected = selectedDate && dateVal === value;
              const isToday = dateVal === toDateValue(new Date());
              return h(
                "button",
                {
                  key: dateVal,
                  type: "button",
                  className: `observation-calendar__day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`,
                  onClick: () => selectDay(date)
                },
                String(date.getDate())
              );
            })
          ),

          // Footer
          h(
            "div",
            { className: "observation-calendar__footer" },
            h("button", { type: "button", onClick: clearDate }, "Borrar"),
            h("button", { type: "button", onClick: selectToday }, "Hoy")
          )
        )
      : null
  );
}

export default CustomDatePicker;
