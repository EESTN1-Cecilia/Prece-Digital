/* Piezas visuales compartidas por las pantallas del portal del alumno. */

import React, { useCallback, useEffect, useRef, useState } from "react";

export const h = React.createElement;

/* Pide datos al montar y cuando cambian las dependencias. Ignora respuestas
   viejas si el alumno cambia de ciclo antes de que llegue la anterior. */
export function useDatos(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ cargando: true, error: null, datos: null });
  const vigente = useRef(0);

  const recargar = useCallback(() => {
    const pedido = ++vigente.current;
    setEstado((actual) => ({ ...actual, cargando: true, error: null }));
    cargar()
      .then((datos) => pedido === vigente.current && setEstado({ cargando: false, error: null, datos }))
      .catch((error) => pedido === vigente.current && setEstado({ cargando: false, error, datos: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { ...estado, recargar };
}

export function Encabezado({ titulo, descripcion, children }) {
  return h(
    "div",
    { className: "pa-encabezado" },
    h("div", null, h("h1", { className: "pa-titulo" }, titulo), descripcion ? h("p", { className: "pa-descripcion" }, descripcion) : null),
    children ? h("div", { className: "pa-encabezado__acciones" }, children) : null
  );
}

export function Tarjeta({ titulo, children, className = "", acciones }) {
  return h(
    "section",
    { className: `pa-tarjeta ${className}` },
    titulo || acciones
      ? h("div", { className: "pa-tarjeta__cabecera" }, titulo ? h("h2", { className: "pa-tarjeta__titulo" }, titulo) : null, acciones ?? null)
      : null,
    children
  );
}

/* Iconos de trazo (24x24), decorativos: el texto siempre acompana. */
const ICONOS = {
  calendario: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  alerta: "M12 4 2.8 19.5h18.4L12 4zM12 10v4.5M12 17v.5",
  grafico: "M4 20h16M7 20v-7M12 20V6M17 20v-10",
  libro: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM5 17a3 3 0 0 1 3-3h10",
  reloj: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c.6-3.6 3.7-5.5 8-5.5s7.4 1.9 8 5.5",
  calculo: "M4 5h16M4 12h16M4 19h16M9 3v18",
  lengua: "M4 6h16M4 10h10M4 14h16M4 18h8",
  ciencia: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3",
  taller: "M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5z",
  computadora: "M4 5h16v11H4zM9 20h6M12 16v4",
  mundo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  arte: "M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-.5-1.5-.5-2.5S14.5 15 16 15h2a3 3 0 0 0 3-3c0-5-4-9-9-9z",
  deporte: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9c4 0 8 2 9 8M20.5 9c-4 0-8 2-9 8",
  tilde: "M5 12.5l4.5 4.5L19 7.5",
  salir: "M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9",
  tarjeta: "M3 6h18v12H3zM7 11h4M7 14h3M15 10h3M15 13h3",
  grupo: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c.4-3 2.7-4.5 6-4.5s5.6 1.5 6 4.5M16 6a3 3 0 0 1 0 5.5M18 14.8c1.7.6 2.7 1.9 3 4.2",
  sol: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  birrete: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  engranaje: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12c0-.4 0-.8-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.5",
  chevron: "M9 6l6 6-6 6",
  descarga: "M12 4v11M7 11l5 5 5-5M5 20h14",
  impresora: "M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z",
  portapapeles: "M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h6"
};

export function Icono({ nombre, tamano = 20 }) {
  return h(
    "svg",
    { className: "pa-icono", width: tamano, height: tamano, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" },
    h("path", { d: ICONOS[nombre] ?? ICONOS.libro })
  );
}

/* Icono segun el nombre de la materia; si no se reconoce, un libro. */
const MATERIAS_ICONO = [
  [/matem|calcul|anali|algebra|geometr|estad/i, "calculo"],
  [/lengua|literat|ingl|idioma|lectur|comunic/i, "lengua"],
  [/fisic|quim|biolog|ciencias nat|naturales|laborator/i, "ciencia"],
  [/taller|electr|mecan|automat|robot|proyecto|dibujo|tecnolog|instalac|montaje/i, "taller"],
  [/inform|program|sistema|computa|digital|redes/i, "computadora"],
  [/geograf|historia|ciudadan|formaci[oó]n etica|ciencias soc|econom/i, "mundo"],
  [/art|music|plastic|teatro/i, "arte"],
  [/educaci[oó]n f[ií]sica|deporte/i, "deporte"]
];

export function iconoDeMateria(nombre = "") {
  return (MATERIAS_ICONO.find(([patron]) => patron.test(nombre)) ?? [null, "libro"])[1];
}

export function Materia({ nombre }) {
  return h("span", { className: "pa-materia" }, h("span", { className: "pa-materia__icono" }, h(Icono, { nombre: iconoDeMateria(nombre), tamano: 16 })), h("span", null, nombre));
}

export function Indicador({ etiqueta, valor, detalle, tono = "neutro", href, icono }) {
  const contenido = [
    icono ? h("span", { className: "pa-indicador__icono", key: "i" }, h(Icono, { nombre: icono, tamano: 22 })) : null,
    h("span", { className: "pa-indicador__etiqueta", key: "e" }, etiqueta),
    h("strong", { className: `pa-indicador__valor ${typeof valor === "string" && !/^\d+$/.test(valor) ? "pa-indicador__valor--texto" : ""}`, key: "v" }, valor ?? "—"),
    detalle ? h("span", { className: "pa-indicador__detalle", key: "d" }, detalle) : null
  ];

  return href
    ? h("a", { className: `pa-indicador pa-indicador--${tono}`, href }, contenido)
    : h("div", { className: `pa-indicador pa-indicador--${tono}` }, contenido);
}

const TONO_ESTADO = {
  aprobada: "ok",
  tep: "alerta",
  ted: "peligro",
  debajo_de_6: "peligro",
  pendiente: "pendiente",
  sin_calificacion: "neutro"
};

export function EstadoBadge({ estado, etiqueta }) {
  return h("span", { className: `pa-badge pa-badge--${TONO_ESTADO[estado] ?? "neutro"}` }, etiqueta ?? estado);
}

export function Cargando({ texto = "Cargando tu información..." }) {
  return h("div", { className: "pa-cargando", role: "status" }, h("span", { className: "pa-spinner", "aria-hidden": "true" }), texto);
}

export function ErrorCarga({ error, onReintentar }) {
  return h(
    "div",
    { className: "pa-aviso pa-aviso--error", role: "alert" },
    h("p", null, error?.mensaje ?? "No se pudo cargar la información."),
    onReintentar ? h("button", { type: "button", className: "pa-boton pa-boton--secundario", onClick: onReintentar }, "Reintentar") : null
  );
}

export function Vacio({ titulo, descripcion }) {
  return h("div", { className: "pa-vacio" }, h("p", { className: "pa-vacio__titulo" }, titulo), descripcion ? h("p", null, descripcion) : null);
}

export function SelectorCiclo({ anios = [], valor, onCambiar }) {
  if (anios.length <= 1) return null;
  return h(
    "label",
    { className: "pa-selector" },
    h("span", null, "Ciclo lectivo"),
    h(
      "select",
      { value: valor ?? "", onChange: (evento) => onCambiar(Number(evento.target.value)) },
      anios.map((anio) => h("option", { key: anio, value: anio }, anio))
    )
  );
}

export function fechaCorta(valor) {
  if (!valor) return "—";
  const [anio, mes, dia] = String(valor).slice(0, 10).split("-");
  return dia ? `${dia}/${mes}/${anio}` : valor;
}

export function CampoTexto({ id, etiqueta, valor, onCambiar, tipo = "text", error, ayuda, autoComplete, requerido, inputMode, mostrarAlternar }) {
  const [visible, setVisible] = useState(false);
  const esClave = tipo === "password";

  return h(
    "div",
    { className: `pa-campo ${error ? "pa-campo--error" : ""}` },
    h("label", { htmlFor: id, className: "pa-campo__etiqueta" }, etiqueta, requerido ? h("span", { "aria-hidden": "true" }, " *") : null),
    h(
      "div",
      { className: "pa-campo__control" },
      h("input", {
        id,
        type: esClave && visible ? "text" : tipo,
        value: valor,
        autoComplete,
        inputMode,
        required: requerido,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
        onChange: (evento) => onCambiar(evento.target.value)
      }),
      esClave && mostrarAlternar !== false
        ? h(
            "button",
            {
              type: "button",
              className: "pa-campo__alternar",
              onClick: () => setVisible((actual) => !actual),
              "aria-label": visible ? "Ocultar contraseña" : "Mostrar contraseña"
            },
            visible ? "Ocultar" : "Ver"
          )
        : null
    ),
    error
      ? h("p", { id: `${id}-error`, className: "pa-campo__error", role: "alert" }, error)
      : ayuda
        ? h("p", { id: `${id}-ayuda`, className: "pa-campo__ayuda" }, ayuda)
        : null
  );
}

/* Errores por campo que devuelve el backend ({ campo: mensaje }). */
export function erroresDe(fallo) {
  return fallo?.campos ?? {};
}

export function Requisitos({ lista }) {
  return h(
    "ul",
    { className: "pa-requisitos", "aria-label": "Requisitos de la contraseña" },
    lista.map((item) =>
      h("li", { key: item.clave, className: item.cumple ? "pa-requisitos__ok" : "" }, h("span", { "aria-hidden": "true" }, item.cumple ? "✓" : "•"), " ", item.texto)
    )
  );
}
