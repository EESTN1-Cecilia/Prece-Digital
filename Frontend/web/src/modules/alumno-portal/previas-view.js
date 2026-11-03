/* Mis Previas: materias pendientes de aprobacion de ciclos anteriores. */

import { useState } from "react";
import { h, Cargando, Encabezado, ErrorCarga, Tarjeta, Vacio, fechaCorta, useDatos } from "./componentes.js";
import { obtenerPrevias } from "./portal-api.js";

function Previa({ previa }) {
  const [abierta, setAbierta] = useState(false);
  const aprobada = previa.estado === "aprobada";

  return h(
    "li",
    { className: `pa-previa ${aprobada ? "pa-previa--aprobada" : ""}` },
    h(
      "div",
      { className: "pa-previa__cabecera" },
      h("div", null, h("p", { className: "pa-previa__materia" }, previa.materia), h("p", { className: "pa-previa__origen" }, `Cursada en ${previa.anioCursada}${previa.cursoOrigen?.etiqueta ? ` · ${previa.cursoOrigen.etiqueta}` : ""}`)),
      h("span", { className: `pa-badge pa-badge--${aprobada ? "ok" : "pendiente"}` }, previa.estadoEtiqueta)
    ),
    h(
      "dl",
      { className: "pa-previa__datos" },
      h("div", null, h("dt", null, "Situación"), h("dd", null, previa.estadoMateriaEtiqueta)),
      h("div", null, h("dt", null, "Última instancia de evaluación"), h("dd", null, previa.fechaUltimaInstancia ? fechaCorta(previa.fechaUltimaInstancia) : "Sin instancias registradas")),
      h("div", null, h("dt", null, "Curso de origen"), h("dd", null, previa.cursoOrigen?.etiqueta ?? "Sin registro"))
    ),
    previa.observaciones ? h("p", { className: "pa-nota" }, previa.observaciones) : null,
    previa.instancias.length
      ? h(
          "div",
          null,
          h(
            "button",
            { type: "button", className: "pa-enlace", "aria-expanded": abierta, onClick: () => setAbierta((valor) => !valor) },
            abierta ? "Ocultar instancias" : `Ver instancias de recuperación (${previa.instancias.length})`
          ),
          abierta
            ? h(
                "ol",
                { className: "pa-instancias" },
                previa.instancias.map((instancia, indice) =>
                  h("li", { key: indice }, h("strong", null, fechaCorta(instancia.fecha)), ` · ${instancia.estadoEtiqueta ?? "Sin estado"}`, instancia.observaciones ? ` · ${instancia.observaciones}` : "")
                )
              )
            : null
        )
      : null
  );
}

export default function PreviasAlumnoView() {
  const { cargando, error, datos, recargar } = useDatos(() => obtenerPrevias(), []);

  if (cargando && !datos) return h(Cargando);
  if (error) return h(ErrorCarga, { error, onReintentar: recargar });

  const { pendientes, aprobadas } = datos;

  return h(
    "div",
    { className: "pa-pagina" },
    h(Encabezado, { titulo: "Mis Previas", descripcion: "Materias pendientes de aprobación de ciclos lectivos anteriores." }),
    h(
      Tarjeta,
      { titulo: `Pendientes (${pendientes.length})` },
      pendientes.length
        ? h("ul", { className: "pa-previas" }, pendientes.map((previa) => h(Previa, { key: previa.id, previa })))
        : h(Vacio, { titulo: "No tenés materias previas pendientes.", descripcion: "Una nota baja durante el año no es una previa." })
    ),
    aprobadas.length
      ? h(Tarjeta, { titulo: `Aprobadas (${aprobadas.length})` }, h("ul", { className: "pa-previas" }, aprobadas.map((previa) => h(Previa, { key: previa.id, previa }))))
      : null,
    h("p", { className: "pa-nota" }, "Las fechas de mesas de examen las informa Secretaría. Una materia deja de figurar como pendiente cuando la aprobación queda registrada.")
  );
}
