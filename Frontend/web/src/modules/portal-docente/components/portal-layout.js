/* Marco comun de las pantallas del Portal Docente: banda de identidad con el
   nombre del docente autenticado y una navegacion corta y fija (Inicio, Mis
   Cursos, Tomar Asistencia, Historial). Es distinto a los tableros de
   Direccion, Secretaria y Preceptoria a proposito: el docente trabaja en clase
   y necesita pocas opciones, grandes y claras. */

import { h } from "../../../layouts/site-layout.js";
import { useUsuarioActual } from "../../../estado/index.js";

export const SECCIONES = [
  { id: "inicio", href: "#/docente", titulo: "Inicio" },
  { id: "cursos", href: "#/docente/cursos", titulo: "Mis Cursos" },
  { id: "asistencia", href: "#/docente/asistencias", titulo: "Tomar Asistencia" },
  { id: "historial", href: "#/docente/historial", titulo: "Historial" }
];

function nombreDe(usuario, rol) {
  return [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || usuario?.displayName || usuario?.email || rol;
}

/* El Portal Preceptor usa el mismo marco con sus secciones, su marca y su rol
   (modules/portal-preceptor). */
export function PortalLayout({ activa, titulo, bajada, acciones, children, secciones = SECCIONES, marca = "Portal Docente", rol = "Docente" }) {
  const usuario = useUsuarioActual();

  return h(
    "div",
    { className: "portal" },
    h(
      "header",
      { className: "portal__banda" },
      h(
        "div",
        { className: "portal__identidad" },
        h("span", { className: "portal__eyebrow" }, `${marca} · E.E.S.T. N°1`),
        h("span", { className: "portal__docente" }, nombreDe(usuario, rol))
      ),
      h(
        "nav",
        { className: "portal__nav", "aria-label": `Secciones del ${marca}` },
        secciones.map((seccion) =>
          h(
            "a",
            {
              key: seccion.id,
              href: seccion.href,
              className: `portal__nav-item${activa === seccion.id ? " portal__nav-item--activo" : ""}`,
              "aria-current": activa === seccion.id ? "page" : undefined
            },
            seccion.titulo
          )
        )
      )
    ),
    h(
      "main",
      { className: "portal__contenido" },
      titulo
        ? h(
            "div",
            { className: "portal__cabecera" },
            h("div", null, h("h1", { className: "portal__titulo" }, titulo), bajada ? h("p", { className: "portal__bajada" }, bajada) : null),
            acciones ? h("div", { className: "portal__acciones" }, acciones) : null
          )
        : null,
      children
    )
  );
}

/* Tarjeta indicadora del inicio. */
export function Indicador({ etiqueta, valor, detalle, tono = "verde" }) {
  return h(
    "article",
    { className: `portal-indicador portal-indicador--${tono}` },
    h("span", { className: "portal-indicador__etiqueta" }, etiqueta),
    h("strong", { className: "portal-indicador__valor" }, valor),
    detalle ? h("span", { className: "portal-indicador__detalle" }, detalle) : null
  );
}
