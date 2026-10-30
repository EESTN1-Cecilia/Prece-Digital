/* Mis Asistencias: totales y detalle por fecha. Solo lectura. */

import { useState } from "react";
import { h, Cargando, Encabezado, ErrorCarga, Indicador, SelectorCiclo, Tarjeta, Vacio, fechaCorta, useDatos } from "./componentes.js";
import { obtenerAsistencias } from "./portal-api.js";

const FILTROS = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "ausente", etiqueta: "Ausentes" },
  { valor: "ausente_parcial", etiqueta: "Parciales" },
  { valor: "tarde", etiqueta: "Tardes" }
];

const TONO_JUSTIFICACION = { justificada: "ok", no_justificada: "peligro", pendiente: "pendiente" };
const MOTIVOS = { salud: "Salud", personal: "Personal", institucional: "Institucional", otra: "Otro" };

export default function AsistenciasAlumnoView() {
  const [anio, setAnio] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const { cargando, error, datos, recargar } = useDatos(() => obtenerAsistencias(anio), [anio]);

  if (cargando && !datos) return h(Cargando);
  if (error) return h(ErrorCarga, { error, onReintentar: recargar });

  const { totales, detalle, cicloLectivo, aniosDisponibles, cursoDivision, reglaComputo } = datos;
  const filas = filtro === "todos" ? detalle : detalle.filter((item) => item.tipo === filtro);

  return h(
    "div",
    { className: "pa-pagina" },
    h(
      Encabezado,
      { titulo: "Mis Asistencias", descripcion: `${cursoDivision ?? ""} · Ciclo lectivo ${cicloLectivo}` },
      h(SelectorCiclo, { anios: aniosDisponibles, valor: cicloLectivo, onCambiar: setAnio })
    ),
    h(
      "div",
      { className: "pa-indicadores pa-indicadores--seis" },
      h(Indicador, { icono: "calendario", etiqueta: "Ausentes", valor: totales.ausentes, detalle: "Jornadas completas", tono: totales.ausentes ? "alerta" : "neutro" }),
      h(Indicador, { icono: "tilde", etiqueta: "Justificadas", valor: totales.ausentesJustificados, detalle: totales.ausentesPendientes ? `${totales.ausentesPendientes} pendiente(s)` : "De los ausentes", tono: "ok" }),
      h(Indicador, { icono: "alerta", etiqueta: "Injustificadas", valor: totales.ausentesInjustificados, detalle: "De los ausentes", tono: totales.ausentesInjustificados ? "peligro" : "neutro" }),
      h(Indicador, { icono: "reloj", etiqueta: "Llegadas tarde", valor: totales.llegadasTarde, detalle: "No suman como ausentes", tono: "neutro" }),
      h(Indicador, { icono: "calendario", etiqueta: "Ausentes parciales", valor: totales.ausentesParciales, detalle: "Retiros anticipados", tono: "neutro" }),
      h(Indicador, { icono: "usuario", etiqueta: "Presentes", valor: totales.presentesDisponible ? totales.presentes : "Sin registro", detalle: "El sistema registra solo inasistencias", tono: "neutro" })
    ),
    h(
      Tarjeta,
      {
        titulo: "Detalle por fecha",
        acciones: h(
          "div",
          { className: "pa-filtros", role: "group", "aria-label": "Filtrar por tipo" },
          FILTROS.map((item) =>
            h(
              "button",
              {
                key: item.valor,
                type: "button",
                className: `pa-chip ${filtro === item.valor ? "pa-chip--activo" : ""}`,
                "aria-pressed": filtro === item.valor,
                onClick: () => setFiltro(item.valor)
              },
              item.etiqueta
            )
          )
        )
      },
      filas.length === 0
        ? h(Vacio, { titulo: detalle.length ? "No hay registros de este tipo." : "No tenés inasistencias registradas en este ciclo." })
        : h(
            "div",
            { className: "pa-tabla-envoltorio" },
            h(
              "table",
              { className: "pa-tabla" },
              h("thead", null, h("tr", null, h("th", { scope: "col" }, "Fecha"), h("th", { scope: "col" }, "Tipo"), h("th", { scope: "col" }, "Justificación"), h("th", { scope: "col" }, "Motivo"), h("th", { scope: "col" }, "Curso"))),
              h(
                "tbody",
                null,
                filas.map((item) =>
                  h(
                    "tr",
                    { key: `${item.fecha}-${item.tipo}` },
                    h("td", { "data-titulo": "Fecha" }, fechaCorta(item.fecha)),
                    h("td", { "data-titulo": "Tipo" }, item.tipoEtiqueta),
                    h("td", { "data-titulo": "Justificación" }, h("span", { className: `pa-badge pa-badge--${TONO_JUSTIFICACION[item.justificacion] ?? "neutro"}` }, item.justificacionEtiqueta)),
                    h("td", { "data-titulo": "Motivo" }, MOTIVOS[item.motivo] ?? item.motivo ?? "—"),
                    h("td", { "data-titulo": "Curso" }, item.curso ? `${item.curso}° ${item.division ?? ""}°` : "—")
                  )
                )
              )
            )
          ),
      h("p", { className: "pa-nota" }, reglaComputo, " Para justificar una inasistencia, presentá la documentación en Preceptoría.")
    )
  );
}
