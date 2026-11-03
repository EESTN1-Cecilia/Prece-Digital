import React, { useCallback, useEffect, useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { LoadingState, ErrorState } from "../../components/common/state-handlers.js";
import { StudentsService } from "../students/students-service.js";
import { ETIQUETA_CICLO, divisionesVisibles } from "./talleres-cronograma.js";
import {
  alumnosPorCategoria,
  resumenAlumnosPorAnio,
  resumenTalleresPorAnio,
  totalesPorCiclo
} from "./jefatura-resumen-datos.js";
import { DistribucionAlumnos, numero } from "./jefatura-graficos.js";

/* Resumen de jefatura: cuatro tarjetas con los numeros clave, un unico grafico
   con la matricula total en tres colores y el detalle por anio. */

function Icono({ children }) {
  return h(
    "svg",
    { className: "jf-kpi__svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    children
  );
}

const ICONOS = {
  alumnos: () =>
    h(
      Icono,
      null,
      h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
      h("circle", { cx: 9, cy: 7, r: 4 }),
      h("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
      h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
    ),
  cursos: () =>
    h(
      Icono,
      null,
      h("path", { d: "M3 7l9-4 9 4-9 4-9-4z" }),
      h("path", { d: "M7 9.5V15c0 1.4 2.2 3 5 3s5-1.6 5-3V9.5" })
    ),
  grupos: () =>
    h(
      Icono,
      null,
      h("rect", { x: 3, y: 3, width: 7, height: 7, rx: 1.5 }),
      h("rect", { x: 14, y: 3, width: 7, height: 7, rx: 1.5 }),
      h("rect", { x: 3, y: 14, width: 7, height: 7, rx: 1.5 }),
      h("rect", { x: 14, y: 14, width: 7, height: 7, rx: 1.5 })
    ),
  talleres: () =>
    h(
      Icono,
      null,
      h("path", { d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" })
    )
};

function Tarjeta({ tono, icono, etiqueta, valor, detalle }) {
  return h(
    "article",
    { className: `jf-kpi jf-kpi--${tono}` },
    h("div", { className: "jf-kpi__icono" }, ICONOS[icono]()),
    h(
      "div",
      { className: "jf-kpi__contenido" },
      h("span", { className: "jf-kpi__etiqueta" }, etiqueta),
      h("strong", { className: "jf-kpi__valor" }, numero(valor)),
      h("span", { className: "jf-kpi__detalle" }, detalle)
    )
  );
}

export default function JefaturaResumenView() {
  const [divisiones, setDivisiones] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(() => {
    let vigente = true;
    setError(null);
    StudentsService.getDivisiones()
      .then((lista) => vigente && setDivisiones(divisionesVisibles(lista ?? [])))
      .catch((err) => vigente && setError(err.mensaje || err.message || "No se pudo consultar la matrícula de los cursos."));
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => cargar(), [cargar]);

  const talleres = useMemo(() => resumenTalleresPorAnio(), []);
  const alumnos = useMemo(() => resumenAlumnosPorAnio(divisiones ?? []), [divisiones]);

  if (error) return h(ErrorState, { mensaje: error, onRetry: cargar });
  if (!divisiones) return h(LoadingState, { mensaje: "Calculando alumnos y talleres..." });

  const alumnosCiclo = totalesPorCiclo(alumnos, "alumnos");
  const cursosCiclo = totalesPorCiclo(alumnos, "cursos");
  const gruposCiclo = totalesPorCiclo(talleres, "grupos");
  const sesionesCiclo = totalesPorCiclo(talleres, "sesiones");
  const cupoCiclo = totalesPorCiclo(talleres, "cupo");
  const reparto = alumnosPorCategoria(alumnos);

  return h(
    "div",
    { className: "jf-resumen" },
    h(
      "div",
      { className: "jf-resumen__capa" },
      h(
        "div",
        { className: "jf-kpis" },
        h(Tarjeta, {
          tono: "azul",
          icono: "alumnos",
          etiqueta: "Alumnos",
          valor: alumnosCiclo.basico + alumnosCiclo.superior,
          detalle: `${numero(alumnosCiclo.basico)} en básico · ${numero(alumnosCiclo.superior)} en superior`
        }),
        h(Tarjeta, {
          tono: "violeta",
          icono: "cursos",
          etiqueta: "Cursos",
          valor: cursosCiclo.basico + cursosCiclo.superior,
          detalle: `${cursosCiclo.basico} en básico · ${cursosCiclo.superior} en superior`
        }),
        h(Tarjeta, {
          tono: "verde",
          icono: "grupos",
          etiqueta: "Grupos de taller",
          valor: gruposCiclo.basico + gruposCiclo.superior,
          detalle: `${gruposCiclo.basico} en básico · ${gruposCiclo.superior} en superior`
        }),
        h(Tarjeta, {
          tono: "ambar",
          icono: "talleres",
          etiqueta: "Talleres por semana",
          valor: sesionesCiclo.basico + sesionesCiclo.superior,
          detalle: `Cupo total: ${numero(cupoCiclo.basico + cupoCiclo.superior)}`
        })
      ),
      h(
        "section",
        { className: "jf-lateral", "aria-label": "Alumnos de la escuela" },
        h("span", { className: "jf-lateral__etiqueta" }, "Distribución de alumnos"),
        h("h2", { className: "jf-lateral__titulo" }, "Básico, Programación e Informática"),
        h(DistribucionAlumnos, {
          partes: [
            { etiqueta: "Ciclo Básico", detalle: "1° a 3° año", valor: reparto.basico, tono: "basico" },
            { etiqueta: "Programación", detalle: "Técnico en Programación · 4° a 7°", valor: reparto.programacion, tono: "programacion" },
            { etiqueta: "Informática", detalle: "Técnico en Informática · 4° a 7°", valor: reparto.informatica, tono: "informatica" }
          ]
        })
      )
    ),
    h(
      "section",
      { className: "jf-panel" },
      h(
        "header",
        { className: "jf-panel__cabecera" },
        h("div", null, h("h2", { className: "jf-panel__titulo" }, "Detalle por año"), h("p", { className: "jf-panel__subtitulo" }, "Alumnos de la matrícula y talleres del cronograma"))
      ),
      h(
        "div",
        { className: "jf-panel__cuerpo jf-panel__cuerpo--tabla" },
        h(
          "div",
          { className: "jf-tabla-wrap" },
          h(
            "table",
            { className: "jf-tabla" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                ["Año", "Ciclo", "Cursos", "Alumnos", "Informática", "Programación", "Grupos de taller", "Talleres por semana", "Cupo en talleres"].map((columna) =>
                  h("th", { key: columna, scope: "col" }, columna)
                )
              )
            ),
            h(
              "tbody",
              null,
              alumnos.map((fila, indice) =>
                h(
                  "tr",
                  { key: fila.anio },
                  h("th", { scope: "row" }, `${fila.anio}°`),
                  h("td", null, h("span", { className: `jf-etiqueta jf-etiqueta--${fila.ciclo}` }, ETIQUETA_CICLO[fila.ciclo])),
                  h("td", null, numero(fila.cursos)),
                  h("td", null, h("strong", null, numero(fila.alumnos))),
                  h("td", null, fila.ciclo === "basico" ? "—" : numero(fila.informatica)),
                  h("td", null, fila.ciclo === "basico" ? "—" : numero(fila.programacion)),
                  h("td", null, numero(talleres[indice].grupos)),
                  h("td", null, numero(talleres[indice].sesiones)),
                  h("td", null, numero(talleres[indice].cupo))
                )
              )
            )
          )
        )
      )
    )
  );
}
