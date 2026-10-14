/* Barra de filtros y chips de filtros activos.

   `campos` elige que filtros se muestran: el listado general usa todos y las
   consultas por docente, materia o curso solo los que tienen sentido ahi.
   Las opciones llegan armadas desde la pantalla (catalogos y combinaciones de
   la API); este componente no conoce reglas de negocio. */

import { h } from "../../../layouts/site-layout.js";
import { Boton, Filtro } from "../../../components/ui/index.js";
import { filtrosActivos } from "../planificaciones-helpers.js";

const DEFINICIONES = {
  anioLectivo: { etiqueta: "Ciclo lectivo", textoVacio: "Todos" },
  docenteId: { etiqueta: "Docente", textoVacio: "Todos" },
  materiaId: { etiqueta: "Materia", textoVacio: "Todas" },
  anio: { etiqueta: "Año", textoVacio: "Todos" },
  turno: { etiqueta: "Turno", textoVacio: "Todos" },
  cursoId: { etiqueta: "Curso", textoVacio: "Todos" },
  divisionId: { etiqueta: "División", textoVacio: "Todas" },
  periodo: { etiqueta: "Período", textoVacio: "Todos" },
  estado: { etiqueta: "Estado", textoVacio: "Todos" }
};

export const TODOS_LOS_FILTROS = Object.keys(DEFINICIONES);

export function FiltrosPlanificaciones({ campos = TODOS_LOS_FILTROS, filtros, opciones, onCambiar, idPrefijo = "planif" }) {
  return h(
    "div",
    { className: "planif-filtros" },
    campos.map((campo) =>
      h(Filtro, {
        key: campo,
        id: `${idPrefijo}-filtro-${campo}`,
        etiqueta: DEFINICIONES[campo].etiqueta,
        textoVacio: DEFINICIONES[campo].textoVacio,
        valor: filtros[campo] ?? "",
        opciones: opciones[campo] ?? [],
        onChange: (valor) => onCambiar(campo, valor)
      })
    )
  );
}

/* Chips removibles de a uno + limpiar todo. La busqueda por texto tambien
   aparece como chip para que se vea que esta aplicada. */
export function FiltrosActivos({ filtros, opciones, busqueda, onQuitar, onQuitarBusqueda, onLimpiar }) {
  const chips = filtrosActivos(filtros, opciones);
  const texto = (busqueda ?? "").trim();

  if (!chips.length && !texto) {
    return null;
  }

  return h(
    "div",
    { className: "planif-chips", role: "group", "aria-label": "Filtros activos" },
    h("span", { className: "planif-chips__titulo" }, "Filtros activos:"),
    texto
      ? h(
          "span",
          { className: "planif-chip" },
          h("span", null, h("strong", null, "Búsqueda: "), texto),
          h(
            "button",
            { type: "button", className: "planif-chip__quitar", "aria-label": "Quitar la búsqueda", onClick: onQuitarBusqueda },
            "×"
          )
        )
      : null,
    chips.map((chip) =>
      h(
        "span",
        { key: chip.campo, className: "planif-chip" },
        h("span", null, h("strong", null, `${chip.etiqueta}: `), chip.valor),
        h(
          "button",
          {
            type: "button",
            className: "planif-chip__quitar",
            "aria-label": `Quitar el filtro ${chip.etiqueta}`,
            onClick: () => onQuitar(chip.campo)
          },
          "×"
        )
      )
    ),
    h(Boton, { variante: "texto", tamano: "chico", onClick: onLimpiar }, "Limpiar todo")
  );
}
