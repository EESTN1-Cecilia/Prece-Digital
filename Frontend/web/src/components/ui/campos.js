/* Campos de formulario.

   Cada campo arma por su cuenta la etiqueta, el control, el texto de ayuda y el
   mensaje de error, y conecta el error con el input por aria-describedby. Asi
   ningun formulario tiene que repetir esa estructura ni acordarse de la parte
   de accesibilidad.

   Todos aceptan `valor` + `onChange` (controlado) o ninguno de los dos (no
   controlado, util en las pantallas que todavia no envian datos). */

import { h, IconoFigma } from "../../layouts/site-layout.js";
import { ErrorCampo } from "./avisos.js";

function envoltorio({ id, etiqueta, requerido, error, ayuda, children }) {
  return h(
    "div",
    { className: error ? "ui-campo ui-campo--error" : "ui-campo" },
    etiqueta
      ? h(
          "label",
          { className: "ui-campo__etiqueta", htmlFor: id },
          etiqueta,
          requerido ? h("span", { className: "ui-campo__requerido", "aria-hidden": "true" }, " *") : null
        )
      : null,
    children,
    ayuda && !error ? h("p", { className: "ui-campo__ayuda", id: `${id}-ayuda` }, ayuda) : null,
    h(ErrorCampo, { mensaje: error, id: `${id}-error` })
  );
}

function descripcion({ id, error, ayuda }) {
  if (error) return `${id}-error`;
  if (ayuda) return `${id}-ayuda`;
  return undefined;
}

export function Campo({
  id,
  etiqueta,
  tipo = "text",
  valor,
  onChange,
  placeholder,
  error,
  ayuda,
  requerido = false,
  deshabilitado = false,
  soloLectura = false,
  sufijo,
  autoComplete = "off",
  ...resto
}) {
  const control = h("input", {
    id,
    name: id,
    type: tipo,
    placeholder,
    autoComplete,
    required: requerido || undefined,
    disabled: deshabilitado || undefined,
    readOnly: soloLectura || undefined,
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": descripcion({ id, error, ayuda }),
    /* Sin `valor` el campo queda no controlado: React se queja si se pasa
       value undefined junto a onChange. */
    ...(valor === undefined ? null : { value: valor }),
    ...(onChange ? { onChange: (evento) => onChange(evento.target.value) } : null),
    ...resto
  });

  return envoltorio({
    id,
    etiqueta,
    requerido,
    error,
    ayuda,
    children: h(
      "div",
      { className: sufijo ? "ui-campo__control ui-campo__control--sufijo" : "ui-campo__control" },
      control,
      sufijo ? h("span", { className: "ui-campo__sufijo" }, sufijo) : null
    )
  });
}

export function AreaTexto({
  id,
  etiqueta,
  valor,
  onChange,
  placeholder,
  error,
  ayuda,
  filas = 4,
  requerido = false,
  deshabilitado = false,
  ...resto
}) {
  return envoltorio({
    id,
    etiqueta,
    requerido,
    error,
    ayuda,
    children: h(
      "div",
      { className: "ui-campo__control" },
      h("textarea", {
        id,
        name: id,
        rows: filas,
        placeholder,
        required: requerido || undefined,
        disabled: deshabilitado || undefined,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": descripcion({ id, error, ayuda }),
        ...(valor === undefined ? null : { value: valor }),
        ...(onChange ? { onChange: (evento) => onChange(evento.target.value) } : null),
        ...resto
      })
    )
  });
}

/* Las opciones aceptan `{ id, nombre }` o un texto suelto, que sirve de valor y
   de etiqueta a la vez. */
function normalizarOpcion(opcion) {
  if (opcion === null || opcion === undefined) {
    return null;
  }

  if (typeof opcion === "object") {
    const valor = opcion.id ?? opcion.valor ?? opcion.value;
    return { valor, nombre: opcion.nombre ?? opcion.name ?? String(valor) };
  }

  return { valor: opcion, nombre: String(opcion) };
}

export function Select({
  id,
  etiqueta,
  valor,
  onChange,
  opciones = [],
  placeholder,
  error,
  ayuda,
  requerido = false,
  deshabilitado = false,
  ...resto
}) {
  const lista = opciones.map(normalizarOpcion).filter(Boolean);

  return envoltorio({
    id,
    etiqueta,
    requerido,
    error,
    ayuda,
    children: h(
      "div",
      { className: "ui-campo__control ui-campo__control--select" },
      h(
        "select",
        {
          id,
          name: id,
          required: requerido || undefined,
          disabled: deshabilitado || undefined,
          "aria-invalid": error ? "true" : undefined,
          "aria-describedby": descripcion({ id, error, ayuda }),
          ...(valor === undefined ? { defaultValue: "" } : { value: valor }),
          ...(onChange ? { onChange: (evento) => onChange(evento.target.value) } : null),
          ...resto
        },
        placeholder ? h("option", { value: "" }, placeholder) : null,
        lista.map((opcion) => h("option", { key: opcion.valor, value: opcion.valor }, opcion.nombre))
      )
    )
  });
}

/* Buscador con icono y boton para limpiar. El debounce es responsabilidad de la
   pantalla, que es la que sabe a que API le pega. */
export function Busqueda({
  id = "busqueda",
  valor = "",
  onChange,
  onLimpiar,
  etiqueta = "Buscar",
  placeholder = "Buscar..."
}) {
  return h(
    "div",
    { className: "ui-busqueda" },
    h(IconoFigma, { className: "ui-busqueda__icono", nombre: "user-search" }),
    h("input", {
      id,
      type: "search",
      value: valor,
      "aria-label": etiqueta,
      placeholder,
      onChange: (evento) => onChange?.(evento.target.value)
    }),
    valor
      ? h(
          "button",
          {
            className: "ui-busqueda__limpiar",
            type: "button",
            "aria-label": "Limpiar busqueda",
            onClick: () => (onLimpiar ? onLimpiar() : onChange?.(""))
          },
          "×"
        )
      : null
  );
}

export function Casilla({ id, etiqueta, marcado = false, onChange, deshabilitado = false, descripcion: nota }) {
  return h(
    "label",
    { className: deshabilitado ? "ui-casilla ui-casilla--inactiva" : "ui-casilla", htmlFor: id },
    h("input", {
      id,
      type: "checkbox",
      checked: marcado,
      disabled: deshabilitado || undefined,
      onChange: (evento) => onChange?.(evento.target.checked)
    }),
    h(
      "span",
      null,
      etiqueta,
      nota ? h("span", { className: "ui-casilla__nota" }, nota) : null
    )
  );
}

/* Filtro de listado: un select compacto con "Todos" como opcion vacia. */
export function Filtro({ id, etiqueta, valor, opciones = [], onChange, textoVacio = "Todos" }) {
  const lista = opciones.map(normalizarOpcion).filter(Boolean);

  return h(
    "label",
    { className: "ui-filtro", htmlFor: id },
    etiqueta,
    h(
      "select",
      { id, value: valor ?? "", onChange: (evento) => onChange?.(evento.target.value) },
      h("option", { value: "" }, textoVacio),
      lista.map((opcion) => h("option", { key: opcion.valor, value: opcion.valor }, opcion.nombre))
    )
  );
}
