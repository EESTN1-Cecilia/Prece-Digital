import React, { useState, useEffect, useRef } from "react";
import { h, IconoFigma } from "../../../../layouts/site-layout.js";
import { StatusBadge, ConditionBadge } from "../student-badges.js";

/**
 * StudentProfileHero: Banner superior del perfil completo con datos principales y barra de navegación por pestañas.
 */
export function StudentProfileHero({
  alumno = {},
  escolar = {},
  tabActiva = "general",
  onTabChange,
  observacionesCount = 0,
  alertasCount = 0
}) {
  const tabsNavRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = tabsNavRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = tabsNavRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      // Recheck after DOM paint / layout stabilization
      const timer = setTimeout(checkScroll, 100);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
        clearTimeout(timer);
      };
    }
  }, []);

  const handleScroll = (direction) => {
    if (tabsNavRef.current) {
      const scrollAmount = 220;
      tabsNavRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      setTimeout(checkScroll, 250);
    }
  };

  const nombreCompleto =
    alumno.nombreCompleto ||
    `${alumno.apellido || ""}, ${alumno.nombre || ""}`.trim() ||
    "Estudiante";

  const renderTabIcon = (tabId) => {
    switch (tabId) {
      case "general":
        return h(
          "svg",
          { className: "tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
          h("circle", { cx: "12", cy: "7", r: "4" })
        );
      case "academico":
        return h(
          "svg",
          { className: "tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
          h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
        );
      case "asistencias":
        return h(
          "svg",
          { className: "tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
          h("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
          h("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
          h("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
        );
      case "observaciones":
        return h(
          "svg",
          { className: "tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
          h("polyline", { points: "14 2 14 8 20 8" }),
          h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
          h("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
        );
      case "libroMatriz":
        return h(
          "svg",
          { className: "tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
          h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
          h("line", { x1: "12", y1: "6", x2: "12", y2: "14" })
        );
      case "historial":
        return h(
          "svg",
          { className: "tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
          h("circle", { cx: "12", cy: "12", r: "10" }),
          h("polyline", { points: "12 6 12 12 16 14" })
        );
      default:
        return null;
    }
  };

  const tabs = [
    { id: "general", label: "Información General" },
    { id: "academico", label: "Académico y Materias" },
    { id: "asistencias", label: "Inasistencias" },
    {
      id: "observaciones",
      label: "Observaciones y Condiciones",
      badge: observacionesCount > 0 ? observacionesCount : null
    },
    { id: "libroMatriz", label: "Libro Matriz" },
    { id: "historial", label: "Historial de Cambios" }
  ];

  return h(
    "div",
    { className: "student-profile-hero" },
    h(
      "div",
      { className: "student-profile-hero-content" },
      // Avatar
      h(
        "div",
        { className: "student-profile-avatar-box" },
        h(IconoFigma, {
          className: "student-profile-avatar-icon",
          nombre: "avatar"
        })
      ),
      // Datos principales
      h(
        "div",
        { className: "student-profile-main-info" },
        h(
          "div",
          { className: "student-profile-name-row" },
          h("h1", { className: "student-profile-name" }, nombreCompleto),
          h(StatusBadge, {
            status: alumno.estado || escolar.estado || "Activo",
            label: alumno.estado || escolar.estado || "Activo"
          }),
          h(ConditionBadge, {
            condicion: alumno.condicion || escolar.condicion || "Regular"
          })
        ),
        h(
          "div",
          { className: "student-profile-pills-row" },
          h(
            "span",
            { className: "profile-pill" },
            h("span", { className: "pill-label" }, "DNI:"),
            h("span", { className: "pill-value" }, alumno.dni || "S/D")
          ),
          h(
            "span",
            { className: "profile-pill highlight" },
            h("span", { className: "pill-value" }, `${escolar.curso || "1°"} Div. ${escolar.division || "1"} (${escolar.turno || "Mañana"})`)
          ),
          h(
            "span",
            { className: "profile-pill" },
            h("span", { className: "pill-label" }, "Legajo:"),
            h("span", { className: "pill-value font-mono" }, alumno.legajo || (alumno.id ? `LEG-${alumno.id}` : "S/N"))
          ),
          escolar.orientacion
            ? h(
                "span",
                { className: "profile-pill orientation" },
                escolar.orientacion
              )
            : null,
          alumno.fechaIngreso
            ? h(
                "span",
                { className: "profile-pill muted" },
                h("span", { className: "pill-label" }, "Ingreso:"),
                h("span", { className: "pill-value" }, alumno.fechaIngreso)
              )
            : null
        )
      )
    ),

    // Barra de Pestañas de Navegación con flechas laterales
    h(
      "div",
      { className: "student-profile-tabs-wrapper" },
      // Flecha izquierda
      h(
        "button",
        {
          type: "button",
          className: `tabs-scroll-arrow left ${canScrollLeft ? "active" : "disabled"}`,
          onClick: () => handleScroll("left"),
          "aria-label": "Desplazar pestañas a la izquierda",
          tabIndex: canScrollLeft ? 0 : -1
        },
        h(
          "svg",
          { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" },
          h("polyline", { points: "15 18 9 12 15 6" })
        )
      ),

      // Contenedor de pestañas con scroll oculto
      h(
        "nav",
        {
          ref: tabsNavRef,
          className: "student-profile-tabs-nav",
          "aria-label": "Pestañas del Perfil"
        },
        tabs.map((tab) => {
          const isActive = tabActiva === tab.id;
          return h(
            "button",
            {
              key: tab.id,
              type: "button",
              className: `profile-tab-btn ${isActive ? "active" : ""}`,
              onClick: () => onTabChange && onTabChange(tab.id),
              "aria-selected": isActive ? "true" : "false",
              role: "tab"
            },
            renderTabIcon(tab.id),
            h("span", { className: "tab-btn-label" }, tab.label),
            tab.badge !== null && tab.badge !== undefined
              ? h("span", { className: "tab-btn-badge" }, String(tab.badge))
              : null
          );
        })
      ),

      // Flecha derecha
      h(
        "button",
        {
          type: "button",
          className: `tabs-scroll-arrow right ${canScrollRight ? "active" : "disabled"}`,
          onClick: () => handleScroll("right"),
          "aria-label": "Desplazar pestañas a la derecha",
          tabIndex: canScrollRight ? 0 : -1
        },
        h(
          "svg",
          { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" },
          h("polyline", { points: "9 18 15 12 9 6" })
        )
      )
    )
  );
}

