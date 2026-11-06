import React, { useCallback, useEffect, useRef, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { StudentsService } from "../students/students-service.js";
import { JefaturaService } from "./jefatura-service.js";
import { divisionesVisibles, gruposDeDivision } from "./talleres-cronograma.js";
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

export function calcularCursosSinAsignar(divisiones, alumnos) {
  const mapaCursosConAlumnos = new Map();
  const listaAlumnos = Array.isArray(alumnos) ? alumnos : (alumnos?.data || []);
  const listaDivisiones = Array.isArray(divisiones) ? divisiones : (divisiones?.data || []);

  listaAlumnos.forEach((alu) => {
    const estado = String(alu?.estado ?? "").toLowerCase();
    if (estado === "inactivo") return;
    const anio = String(alu?.curso ?? "").replace(/\D/g, "");
    const division = String(alu?.division ?? "").trim();
    if (!anio || !division) return;
    const clave = `${anio}-${division}`;
    if (!mapaCursosConAlumnos.has(clave)) {
      mapaCursosConAlumnos.set(clave, []);
    }
    mapaCursosConAlumnos.get(clave).push(alu);
  });

  const pendientes = [];
  listaDivisiones.forEach((div) => {
    const anio = String(div?.anio ?? "").replace(/\D/g, "");
    const division = String(div?.division ?? "").trim();
    const clave = div?.clave || `${anio}-${division}`;
    const alumnosDivision = mapaCursosConAlumnos.get(clave) || [];
    if (alumnosDivision.length > 0 && alumnosDivision.some((alu) => !alu.grupoTaller)) {
      pendientes.push({
        etiqueta: `${div.anio ?? anio}°${div.division ?? division}`,
        clave
      });
    }
  });

  return pendientes;
}

export default function JefaturaDashboardView() {
  const user = useUsuarioActual();
  const [activa, setActiva] = useState(pestanaGuardada);
  const [cursosSinAsignar, setCursosSinAsignar] = useState([
    { etiqueta: "1°3", clave: "1-3" },
    { etiqueta: "1°4", clave: "1-4" },
    { etiqueta: "1°6", clave: "1-6" }
  ]);
  const [cursoParaAbrir, setCursoParaAbrir] = useState(null);
  const botones = useRef({});

  const cargarPendientes = useCallback(() => {
    let cancelado = false;
    Promise.all([
      StudentsService.getDivisiones().catch(() => []),
      StudentsService.getTodosLosAlumnos({ estado: "activo" }).catch(() => ({ data: [] }))
    ]).then(([divisionesRaw, respuestaAlumnos]) => {
      if (cancelado) return;
      const divisiones = divisionesVisibles(Array.isArray(divisionesRaw) ? divisionesRaw : (divisionesRaw?.data || []));
      const alumnos = Array.isArray(respuestaAlumnos?.data)
        ? respuestaAlumnos.data
        : (Array.isArray(respuestaAlumnos) ? respuestaAlumnos : []);

      const pendientes = calcularCursosSinAsignar(divisiones, alumnos);
      setCursosSinAsignar(pendientes);
    }).catch(() => {});

    return () => {
      cancelado = true;
    };
  }, []);

  const handleTalleresAsignados = useCallback((eventoOInfo) => {
    const clave = eventoOInfo?.detail?.clave || eventoOInfo?.clave;
    const anio = eventoOInfo?.detail?.anio || eventoOInfo?.anio;
    const division = eventoOInfo?.detail?.division || eventoOInfo?.division;
    const etiqueta = anio && division ? `${anio}°${division}` : null;

    if (clave || etiqueta) {
      setCursosSinAsignar((prev) =>
        prev.filter((item) => {
          const itemClave = typeof item === "string" ? item.replace("°", "-") : item.clave;
          const itemEtiqueta = typeof item === "string" ? item : item.etiqueta;
          if (clave && itemClave === clave) return false;
          if (etiqueta && itemEtiqueta === etiqueta) return false;
          return true;
        })
      );
    }
    cargarPendientes();
  }, [cargarPendientes]);

  useEffect(() => {
    const cancelar = cargarPendientes();
    const handleEvento = (e) => handleTalleresAsignados(e);
    window.addEventListener("prece:talleres-asignados", handleEvento);
    return () => {
      if (typeof cancelar === "function") cancelar();
      window.removeEventListener("prece:talleres-asignados", handleEvento);
    };
  }, [cargarPendientes, handleTalleresAsignados]);

  const elegir = useCallback((id) => {
    setActiva(id);
    try {
      window.sessionStorage.setItem(CLAVE_PESTANA, id);
    } catch {
      /* ignorar */
    }
  }, []);

  const abrirCurso = useCallback((clave) => {
    setCursoParaAbrir(clave);
    elegir("talleres");
  }, [elegir]);

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
          h("span", { className: "jf-eyebrow" }, user?.escuela || "E.E.S.T. N°1 Cecilia Berdichevski")
        ),
        h("h1", null, "Jefatura de Área"),
        h("p", { className: "jf-encabezado__texto" }, `${fechaDelDia()}. Talleres y cursos del Ciclo Básico y del Ciclo Superior en un solo lugar.`)
      )
    ),
    cursosSinAsignar.length > 0
      ? h(
          "aside",
          { className: "jf-aviso-top", role: "alert", "aria-label": "Notificación de listas de taller pendientes" },
          h(
            "div",
            { className: "jf-aviso-top__icono" },
            h(
              "svg",
              { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
              h("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
              h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
              h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
            )
          ),
          h(
            "div",
            { className: "jf-aviso-top__cuerpo" },
            h(
              "div",
              { className: "jf-aviso-top__linea-superior" },
              h("strong", { className: "jf-aviso-top__titulo" }, "Notificación de Jefatura: Listas de taller pendientes de conformación"),
              h(
                "span",
                { className: "jf-aviso-top__contador" },
                `${cursosSinAsignar.length} ${cursosSinAsignar.length === 1 ? "curso sin asignar" : "cursos sin asignar"}`
              )
            ),
            h(
              "p",
              { className: "jf-aviso-top__descripcion" },
              "Existen divisiones con alumnos activos que todavía no tienen asignado su grupo de taller en el legajo. Cursos pendientes (tocá el curso para ir directo a conformar la división):"
            ),
            h(
              "div",
              { className: "jf-aviso-top__cursos-lista" },
              cursosSinAsignar.map((item) => {
                const etiqueta = typeof item === "string" ? item : item.etiqueta;
                const clave = typeof item === "string" ? item.replace("°", "-") : item.clave;
                return h(
                  "button",
                  {
                    key: clave,
                    type: "button",
                    className: "jf-aviso-top__curso-pill jf-aviso-top__curso-pill--clickable",
                    onClick: () => abrirCurso(clave),
                    title: `Ir directo a conformar los talleres de ${etiqueta}`
                  },
                  h("span", { className: "jf-aviso-top__chip-dot" }),
                  etiqueta
                );
              })
            )
          ),
          h(
            "button",
            {
              type: "button",
              className: "jf-aviso-top__boton-accion",
              onClick: () => elegir("talleres")
            },
            "Ir a Cursos y Talleres →"
          )
        )
      : null,
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
      h(pestana.vista, {
        escuela: user?.escuela || "E.E.S.T. N°1 Cecilia Berdichevski",
        cursoSeleccionado: pestana.id === "talleres" ? cursoParaAbrir : null,
        onVolver: () => setCursoParaAbrir(null),
        onAsignacionGuardada: handleTalleresAsignados
      })
    )
  );
}
