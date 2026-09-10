/* Encabezado de la aplicacion: migas, notificaciones y menu de usuario.

   Es el mismo en todos los modulos, asi que ninguna pantalla lo redibuja. */

import React, { useEffect, useRef, useState } from "react";
import { IconoFigma } from "./site-layout.js";
import { Badge, Boton } from "../components/ui/index.js";
import { armarMenu, construirMigas, hrefActivo } from "./menu.js";
import { RUTAS } from "../app/rutas.js";
import { useNotificaciones, useSesion } from "../estado/hooks.js";
import { fecha } from "../utils/formato.js";

const h = React.createElement;

/* Cierra un panel al hacer clic afuera o al apretar Escape. */
function usarCierreExterno(abierto, cerrar) {
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) {
      return undefined;
    }

    const alClic = (evento) => {
      if (caja.current && !caja.current.contains(evento.target)) {
        cerrar();
      }
    };

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        cerrar();
      }
    };

    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, cerrar]);

  return caja;
}

/* Migas de la ruta actual. Los nombres salen del titulo declarado en la tabla
   de rutas: nunca se muestran rutas tecnicas. */
export function Migas({ hash }) {
  const sesion = useSesion();
  const migas = construirMigas(hash, RUTAS, sesion);

  if (migas.length < 2) {
    /* Con un solo nivel no aportan nada: se omiten en lugar de repetir el
       titulo de la pantalla. */
    return null;
  }

  return h(
    "nav",
    { className: "migas", "aria-label": "Ubicacion" },
    h(
      "ol",
      null,
      migas.map((miga) =>
        h(
          "li",
          { key: miga.patron },
          miga.href
            ? h("a", { href: miga.href }, miga.titulo)
            : h("span", { "aria-current": miga.actual ? "page" : undefined }, miga.titulo)
        )
      )
    )
  );
}

/* Acceso rapido a las notificaciones. El centro completo es la issue #59; aca
   se muestran las ultimas para no dejar el indicador sin destino. */
function Notificaciones() {
  const { items, noLeidas, cargando, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const caja = usarCierreExterno(abierto, () => setAbierto(false));
  const ultimas = items.slice(0, 5);

  return h(
    "div",
    { className: "notificaciones", ref: caja },
    h(
      "button",
      {
        className: "notificaciones-boton",
        type: "button",
        "aria-expanded": abierto,
        "aria-label": noLeidas
          ? `Notificaciones: ${noLeidas} sin leer`
          : "Notificaciones: ninguna sin leer",
        onClick: () => setAbierto((valor) => !valor)
      },
      h(IconoFigma, { className: "notificaciones-boton__icono", nombre: "support" }),
      noLeidas
        ? h("span", { className: "notificaciones-boton__marca" }, noLeidas > 9 ? "9+" : noLeidas)
        : null
    ),
    abierto
      ? h(
          "div",
          { className: "panel" },
          h(
            "div",
            { className: "panel__cabecera" },
            h("strong", null, "Notificaciones"),
            noLeidas
              ? h(
                  Boton,
                  { variante: "texto", tamano: "chico", onClick: marcarTodasLeidas },
                  "Marcar todas"
                )
              : null
          ),
          cargando ? h("p", { className: "panel__vacio" }, "Cargando...") : null,
          !cargando && !ultimas.length
            ? h("p", { className: "panel__vacio" }, "No tenes notificaciones.")
            : null,
          h(
            "ul",
            { className: "panel__lista" },
            ultimas.map((item) =>
              h(
                "li",
                { key: item.id, className: item.leida ? "panel__item" : "panel__item--nueva" },
                h(
                  "button",
                  {
                    className: "panel__accion",
                    type: "button",
                    onClick: () => {
                      if (!item.leida) {
                        marcarLeida(item.id);
                      }
                      if (item.destino) {
                        window.location.hash = item.destino;
                        setAbierto(false);
                      }
                    }
                  },
                  h("span", { className: "panel__titulo" }, item.titulo),
                  item.detalle ? h("span", { className: "panel__detalle" }, item.detalle) : null,
                  h(
                    "span",
                    { className: "panel__pie" },
                    fecha(item.creadaEn),
                    item.leida ? null : h(Badge, { tono: "info" }, "sin leer")
                  )
                )
              )
            )
          )
        )
      : null
  );
}

/* Datos de la cuenta y cierre de sesion. La pantalla de perfil completa es la
   issue #60; hasta entonces esto muestra lo que ya tiene el estado global. */
function MenuUsuario() {
  const { usuario, roles, permisos, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const caja = usarCierreExterno(abierto, () => setAbierto(false));

  const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || "Sin identificar";

  return h(
    "div",
    { className: "menu-usuario", ref: caja },
    h(
      "button",
      {
        className: "profile-button",
        type: "button",
        "aria-expanded": abierto,
        "aria-label": `Cuenta de ${nombre}`,
        onClick: () => setAbierto((valor) => !valor)
      },
      h(IconoFigma, { className: "avatar-usuario", nombre: "avatar" })
    ),
    abierto
      ? h(
          "div",
          { className: "panel panel--angosto" },
          h(
            "div",
            { className: "panel__cuenta" },
            h("strong", null, nombre),
            usuario?.email ? h("span", null, usuario.email) : null,
            h(
              "div",
              { className: "panel__roles" },
              roles.length
                ? roles.map((rol) => h(Badge, { key: rol.id ?? rol }, rol.nombre ?? rol))
                : h("span", { className: "panel__detalle" }, "Sin roles asignados")
            ),
            h(
              "span",
              { className: "panel__detalle" },
              permisos.includes("*")
                ? "Todos los permisos"
                : `${permisos.length} permiso${permisos.length === 1 ? "" : "s"}`
            )
          ),
          h(
            "div",
            { className: "panel__pie-acciones" },
            h(Boton, { variante: "contorno", tamano: "chico", ancho: true, onClick: cerrarSesion }, "Cerrar sesion")
          )
        )
      : null
  );
}

export function EncabezadoApp({ hash, onAbrirMenu }) {
  const sesion = useSesion();
  const entradas = armarMenu(RUTAS, sesion).flatMap((seccion) => seccion.entradas);
  const activo = hrefActivo(
    hash,
    RUTAS,
    entradas.map((entrada) => entrada.href)
  );

  return h(
    "header",
    { className: "site-header" },
    h(
      "div",
      { className: "site-header__top" },
      h(
        "div",
        { className: "site-header__marca" },
        /* Solo se ve en movil: en escritorio las secciones estan en la barra de
           abajo y el panel lateral no existe. */
        h(
          "button",
          {
            className: "encabezado-app__menu",
            type: "button",
            "aria-label": "Abrir el menu de secciones",
            onClick: onAbrirMenu
          },
          "☰"
        ),
        h(
          "a",
          { href: "#/inicio", "aria-label": "Ir al inicio" },
          h("img", {
            className: "header-logo",
            src: "/assets/prece-logo-horizontal.png",
            alt: "Prece.Digital"
          })
        )
      ),
      h("div", { className: "site-header__acciones" }, h(Notificaciones), h(MenuUsuario))
    ),
    h(
      "nav",
      { className: "main-nav main-nav--app", "aria-label": "Secciones" },
      entradas.map((entrada) =>
        h(
          "a",
          {
            key: entrada.href,
            className: entrada.href === activo ? "active" : undefined,
            href: entrada.href,
            "aria-current": entrada.href === activo ? "page" : undefined
          },
          entrada.titulo
        )
      )
    )
  );
}
