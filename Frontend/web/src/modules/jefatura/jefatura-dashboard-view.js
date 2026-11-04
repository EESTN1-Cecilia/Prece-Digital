import React, { useCallback, useRef, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import JefaturaResumenView from "./jefatura-resumen-view.js";
import JefaturaTalleresView from "./jefatura-talleres-view.js";

/* Perfil de Jefatura de Area: resumen con graficos y cursos con la division de
   talleres. Cada pestana carga sus datos cuando se abre. */

const PESTANAS = [
  { id: "resumen", etiqueta: "Resumen", vista: JefaturaResumenView },
  { id: "talleres", etiqueta: "Cursos y talleres", vista: JefaturaTalleresView }
];

const CLAVE_PESTANA = "prece.jefatura.pestana";

function pestanaGuardada() {
  try {
    const id = window.sessionStorage.getItem(CLAVE_PESTANA);
    if (PESTANAS.some((pestana) => pestana.id === id)) return id;
  } catch {
    /* sin almacenamiento: se abre el resumen */
  }
  return PESTANAS[0].id;
}

function fechaDelDia() {
  const texto = new Intl.DateTimeFormat("es-AR", { dateStyle: "full" }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function JefaturaDashboardView() {
  const user = useUsuarioActual();
  const [activa, setActiva] = useState(pestanaGuardada);
  const botones = useRef({});

  const elegir = useCallback((id) => {
    setActiva(id);
    try {
      window.sessionStorage.setItem(CLAVE_PESTANA, id);
    } catch {
      /* ignorar */
    }
  }, []);

  /* Flechas, Inicio y Fin mueven entre pestanas, como en cualquier tablist. */
  const teclado = (evento, indice) => {
    const ultimo = PESTANAS.length - 1;
    const destino =
      evento.key === "ArrowRight" ? (indice === ultimo ? 0 : indice + 1)
      : evento.key === "ArrowLeft" ? (indice === 0 ? ultimo : indice - 1)
      : evento.key === "Home" ? 0
      : evento.key === "End" ? ultimo
      : null;
    if (destino === null) return;
    evento.preventDefault();
    elegir(PESTANAS[destino].id);
    botones.current[PESTANAS[destino].id]?.focus();
  };

  const pestana = PESTANAS.find((item) => item.id === activa) ?? PESTANAS[0];

  return h(
    "main",
    { className: "jf-page" },
    h(
      "header",
      { className: "jf-encabezado" },
      h(
        "div",
        { className: "jf-encabezado__copia" },
        h(
          "div",
          { className: "jf-encabezado__marca" },
          h("img", { src: "/assets/precelogo.jpeg", alt: "", className: "jf-encabezado__logo", "aria-hidden": "true" }),
          h("span", { className: "jf-eyebrow" }, user.escuela || "E.E.S.T. N°1 Cecilia Berdichevski")
        ),
        h("h1", null, "Jefatura de Área"),
        h("p", { className: "jf-encabezado__texto" }, `${fechaDelDia()}. Talleres y cursos del Ciclo Básico y del Ciclo Superior en un solo lugar.`)
      )
    ),
    h(
      "div",
      { className: "jf-pestanas", role: "tablist", "aria-label": "Secciones de jefatura" },
      PESTANAS.map((item, indice) =>
        h(
          "button",
          {
            key: item.id,
            ref: (nodo) => {
              botones.current[item.id] = nodo;
            },
            type: "button",
            role: "tab",
            id: `jf-pestana-${item.id}`,
            "aria-selected": item.id === pestana.id,
            "aria-controls": `jf-panel-${item.id}`,
            tabIndex: item.id === pestana.id ? 0 : -1,
            className: item.id === pestana.id ? "is-activa" : "",
            onClick: () => elegir(item.id),
            onKeyDown: (evento) => teclado(evento, indice)
          },
          item.etiqueta
        )
      )
    ),
    h(
      "div",
      { className: "jf-contenido", role: "tabpanel", id: `jf-panel-${pestana.id}`, "aria-labelledby": `jf-pestana-${pestana.id}` },
      h(pestana.vista, { escuela: user.escuela || "E.E.S.T. N°1 Cecilia Berdichevski" })
    )
  );
}
