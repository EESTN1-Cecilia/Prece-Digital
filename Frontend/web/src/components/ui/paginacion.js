/* Paginacion compartida.

   Sirve tanto para listados que pagina el backend como para los que se paginan
   en memoria: recibe la pagina actual y el total de paginas, y avisa a que
   pagina quiere ir el usuario. */

import { h } from "../../layouts/site-layout.js";
import { Boton } from "./boton.js";

/* Ventana de numeros alrededor de la pagina actual, con los extremos siempre
   presentes y "…" donde se corta la secuencia. Devuelve numeros y la cadena
   "…" para los saltos. */
export function paginasVisibles(pagina, paginas, maximo = 7) {
  if (paginas <= 1) {
    return paginas === 1 ? [1] : [];
  }

  if (paginas <= maximo) {
    return Array.from({ length: paginas }, (_, indice) => indice + 1);
  }

  const actual = Math.min(Math.max(1, pagina), paginas);
  /* Se reservan cuatro lugares para el primero, el ultimo y los dos cortes. */
  const alrededor = Math.max(1, Math.floor((maximo - 4) / 2));

  let desde = Math.max(2, actual - alrededor);
  let hasta = Math.min(paginas - 1, actual + alrededor);

  /* Cerca de un extremo la ventana se corre hacia el otro lado para no achicarse. */
  if (actual - alrededor < 2) {
    hasta = Math.min(paginas - 1, hasta + (2 - (actual - alrededor)));
  }

  if (actual + alrededor > paginas - 1) {
    desde = Math.max(2, desde - (actual + alrededor - (paginas - 1)));
  }

  const numeros = [1];

  if (desde > 2) {
    numeros.push("…");
  }

  for (let numero = desde; numero <= hasta; numero += 1) {
    numeros.push(numero);
  }

  if (hasta < paginas - 1) {
    numeros.push("…");
  }

  numeros.push(paginas);

  return numeros;
}

export function Paginacion({
  pagina = 1,
  paginas = 1,
  total,
  etiquetaTotal = "resultados",
  onPagina
}) {
  if (paginas <= 1 && !total) {
    return null;
  }

  const ir = (destino) => {
    if (destino !== pagina && destino >= 1 && destino <= paginas) {
      onPagina?.(destino);
    }
  };

  return h(
    "nav",
    { className: "ui-paginacion", "aria-label": "Paginacion" },
    h(
      "p",
      { className: "ui-paginacion__resumen", role: "status" },
      total === undefined
        ? `Pagina ${pagina} de ${paginas}`
        : `Pagina ${pagina} de ${paginas} · ${total} ${etiquetaTotal}`
    ),
    paginas > 1
      ? h(
          "div",
          { className: "ui-paginacion__controles" },
          h(
            Boton,
            {
              variante: "contorno",
              tamano: "chico",
              deshabilitado: pagina <= 1,
              onClick: () => ir(pagina - 1)
            },
            "Anterior"
          ),
          h(
            "ul",
            { className: "ui-paginacion__numeros" },
            paginasVisibles(pagina, paginas).map((numero, indice) =>
              h(
                "li",
                { key: `${numero}-${indice}` },
                numero === "…"
                  ? h("span", { className: "ui-paginacion__corte", "aria-hidden": "true" }, "…")
                  : h(
                      "button",
                      {
                        className:
                          numero === pagina
                            ? "ui-paginacion__numero ui-paginacion__numero--activo"
                            : "ui-paginacion__numero",
                        type: "button",
                        "aria-label": `Ir a la pagina ${numero}`,
                        "aria-current": numero === pagina ? "page" : undefined,
                        onClick: () => ir(numero)
                      },
                      String(numero)
                    )
              )
            )
          ),
          h(
            Boton,
            {
              variante: "contorno",
              tamano: "chico",
              deshabilitado: pagina >= paginas,
              onClick: () => ir(pagina + 1)
            },
            "Siguiente"
          )
        )
      : null
  );
}
