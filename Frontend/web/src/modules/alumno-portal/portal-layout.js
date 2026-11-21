/* Marco de todas las pantallas del portal del alumno: encabezado con el logo
   institucional, nombre del alumno, navegacion por secciones y salida.

   Si la cuenta todavia tiene la contraseña inicial, en lugar de la seccion
   pedida muestra la configuracion obligatoria (el backend igual rechaza los
   datos academicos hasta que se complete). */

import { useEffect, useState } from "react";
import { h, Cargando, ErrorCarga, Icono } from "./componentes.js";
import { obtenerCuenta } from "./portal-api.js";
import ConfigurarCuentaView from "./configurar-cuenta-view.js";
import { useSesion } from "../../estado/index.js";

export const SECCIONES_PORTAL = [
  { clave: "inicio", titulo: "Inicio", href: "#/mi-perfil", icono: "usuario" },
  { clave: "boletin", titulo: "Mi Boletín", href: "#/mi-perfil/boletin", icono: "libro" },
  { clave: "asistencias", titulo: "Mis Asistencias", href: "#/mi-perfil/asistencias", icono: "calendario" },
  { clave: "novedades", titulo: "Novedades", href: "#/mi-perfil/novedades", icono: "info" },
  { clave: "situacion", titulo: "Mi Situación Académica", href: "#/mi-perfil/situacion-academica", oculta: true, icono: "grafico" }, // se llega desde Mis Reportes e Inicio
  { clave: "reportes", titulo: "Mis Reportes", href: "#/mi-perfil/reportes", icono: "grafico" },
  { clave: "previas", titulo: "Mis Previas", href: "#/mi-perfil/previas", oculta: true, icono: "portapapeles" }, // se llega desde Mis Reportes
  { clave: "cuenta", titulo: "Mi Cuenta", href: "#/mi-perfil/cuenta", icono: "engranaje" }
];

/* La cuenta se conserva entre secciones para no parpadear al navegar. */
let cuentaEnMemoria = null;

export function PortalLayout({ seccion, children }) {
  const { cerrarSesion, usuario } = useSesion();
  const [cuenta, setCuenta] = useState(cuentaEnMemoria);
  const [error, setError] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerCuenta()
      .then((datos) => {
        if (!vigente) return;
        cuentaEnMemoria = datos;
        setCuenta(datos);
      })
      .catch((fallo) => vigente && setError(fallo));
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => setMenuAbierto(false), [seccion]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") setMenuAbierto(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [menuAbierto]);

  async function salir() {
    cuentaEnMemoria = null;
    await cerrarSesion(); // vuelve al login general
  }

  const nombre = cuenta ? `${cuenta.nombre ?? ""} ${cuenta.apellido ?? ""}`.trim() : [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ");
  const actual = SECCIONES_PORTAL.find((item) => item.clave === seccion);

  let contenido;
  if (error) contenido = h(ErrorCarga, { error, onReintentar: () => window.location.reload() });
  else if (!cuenta) contenido = h(Cargando);
  else if (cuenta.debeCambiarPassword)
    contenido = h(ConfigurarCuentaView, {
      cuenta,
      onConfigurada: (actualizada) => {
        cuentaEnMemoria = actualizada;
        setCuenta(actualizada);
        window.location.hash = "#/mi-perfil";
      }
    });
  else contenido = children;

  const navegacionVisible = cuenta && !cuenta.debeCambiarPassword;

  const navegacionDesktop = navegacionVisible
    ? h(
        "nav",
        { id: "pa-navegacion", className: "pa-navegacion", "aria-label": "Secciones del portal" },
        SECCIONES_PORTAL.filter((item) => !item.oculta).map((item) => {
          const activo = item.clave === seccion || (item.clave === "reportes" && (seccion === "previas" || seccion === "situacion"));
          return h("a", { key: item.clave, href: item.href, className: `pa-navegacion__enlace ${activo ? "pa-navegacion__enlace--activo" : ""}`, "aria-current": activo ? "page" : undefined }, item.titulo);
        })
      )
    : null;

  return h(
    "div",
    { className: "pa" },
    h(
      "header",
      { className: "pa-cabecera" },
      h(
        "div",
        { className: "pa-cabecera__fila" },
        navegacionVisible
          ? h(
              "button",
              {
                type: "button",
                className: "pa-cabecera__menu-btn",
                "aria-label": "Abrir menú lateral",
                "aria-expanded": menuAbierto,
                "aria-controls": "pa-sidebar",
                onClick: () => setMenuAbierto(true)
              },
              h(
                "svg",
                {
                  className: "pa-cabecera__menu-icon",
                  width: "22",
                  height: "22",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  "aria-hidden": "true"
                },
                h("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
                h("line", { x1: "3", y1: "12", x2: "21", y2: "12" }),
                h("line", { x1: "3", y1: "18", x2: "21", y2: "18" })
              )
            )
          : null,
        h(
          "a",
          { className: "pa-cabecera__marca", href: "#/mi-perfil", "aria-label": "Inicio del portal del alumno" },
          h("img", { src: "/assets/tecnica-n1-monte-grande.png", alt: "", className: "pa-cabecera__logo" }),
          h("span", { className: "pa-cabecera__textos" }, h("span", { className: "pa-cabecera__escuela" }, "E.E.S. TÉCNICA N°1"), h("span", { className: "pa-cabecera__portal" }, "Portal del alumno"))
        ),
        navegacionDesktop,
        h(
          "div",
          { className: "pa-cabecera__usuario" },
          nombre ? h("span", { className: "pa-cabecera__nombre" }, nombre) : null,
          h("button", { type: "button", className: "pa-boton pa-boton--claro pa-cabecera__salir", onClick: salir }, h(Icono, { nombre: "salir", tamano: 18 }), "Salir")
        )
      )
    ),
    navegacionVisible
      ? h(
          "div",
          {
            className: `pa-sidebar-wrapper ${menuAbierto ? "pa-sidebar-wrapper--abierto" : ""}`,
            "aria-hidden": !menuAbierto
          },
          h("div", {
            className: "pa-sidebar-backdrop",
            onClick: () => setMenuAbierto(false)
          }),
          h(
            "aside",
            {
              id: "pa-sidebar",
              className: `pa-sidebar ${menuAbierto ? "pa-sidebar--abierto" : ""}`,
              "aria-label": "Menú del portal del alumno"
            },
            h(
              "div",
              { className: "pa-sidebar__cabecera" },
              h(
                "div",
                { className: "pa-sidebar__marca" },
                h("img", { src: "/assets/tecnica-n1-monte-grande.png", alt: "", className: "pa-sidebar__logo" }),
                h(
                  "div",
                  { className: "pa-sidebar__textos" },
                  h("span", { className: "pa-sidebar__escuela" }, "E.E.S. TÉCNICA N°1"),
                  h("span", { className: "pa-sidebar__subtitulo" }, "Portal del alumno")
                )
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "pa-sidebar__cerrar",
                  "aria-label": "Cerrar menú",
                  onClick: () => setMenuAbierto(false)
                },
                "×"
              )
            ),
            h(
              "nav",
              { className: "pa-sidebar__nav" },
              h("p", { className: "pa-sidebar__seccion-titulo" }, "Secciones"),
              h(
                "ul",
                { className: "pa-sidebar__lista" },
                SECCIONES_PORTAL.filter((item) => !item.oculta).map((item) => {
                  const activo = item.clave === seccion || (item.clave === "reportes" && (seccion === "previas" || seccion === "situacion"));
                  return h(
                    "li",
                    { key: item.clave },
                    h(
                      "a",
                      {
                        href: item.href,
                        className: `pa-sidebar__enlace ${activo ? "pa-sidebar__enlace--activo" : ""}`,
                        "aria-current": activo ? "page" : undefined,
                        onClick: () => setMenuAbierto(false)
                      },
                      h(
                        "span",
                        { className: "pa-sidebar__icono-box" },
                        h(Icono, { nombre: item.icono || "libro", tamano: 18 })
                      ),
                      h("span", { className: "pa-sidebar__texto" }, item.titulo)
                    )
                  );
                })
              )
            ),
            h(
              "div",
              { className: "pa-sidebar__pie" },
              nombre
                ? h(
                    "div",
                    { className: "pa-sidebar__usuario" },
                    h("span", { className: "pa-sidebar__avatar" }, h(Icono, { nombre: "usuario", tamano: 18 })),
                    h(
                      "div",
                      { className: "pa-sidebar__usuario-info" },
                      h("strong", { className: "pa-sidebar__usuario-nombre" }, nombre),
                      h("span", { className: "pa-sidebar__usuario-rol" }, "Alumno / Estudiante")
                    )
                  )
                : null,
              h(
                "button",
                {
                  type: "button",
                  className: "pa-sidebar__boton-salir",
                  onClick: () => {
                    setMenuAbierto(false);
                    salir();
                  }
                },
                h(Icono, { nombre: "salir", tamano: 18 }),
                h("span", null, "Cerrar sesión")
              )
            )
          )
        )
      : null,
    h("main", { className: "pa-contenido", id: "contenido", "aria-label": actual?.titulo }, contenido)
  );
}

/* Arma la vista de una ruta: seccion del portal dentro del marco. */
export function conPortal(Vista, seccion) {
  function VistaPortal(props) {
    return h(PortalLayout, { seccion }, h(Vista, props));
  }
  VistaPortal.displayName = `Portal(${seccion})`;
  return VistaPortal;
}
