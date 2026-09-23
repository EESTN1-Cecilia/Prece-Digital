import React, { useState, useEffect, useRef } from "react";
import { DocumentosManagerModal } from "../modules/documents/document-modals.js";
import { useSesion, useNotificaciones } from "../estado/hooks.js";
import { fecha } from "../utils/formato.js";

export const h = React.createElement;

export function IconoFigma({ nombre, className }) {
  return h("img", { className, src: `/assets/icons/${nombre}.svg`, alt: "", "aria-hidden": "true" });
}

export function ActionButton({ tone = "primary", icon, children, onClick, ...props }) {
  return h(
    "button",
    { className: `action-button action-button--${tone}`, type: "button", onClick, ...props },
    h(IconoFigma, { className: "action-button__icon", nombre: icon }),
    h("span", null, children)
  );
}

function UserAvatarMenu() {
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef(null);
  const sesion = useSesion();
  const usuario = sesion?.usuario;
  const cerrarSesion = sesion?.cerrarSesion;

  const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || usuario?.email || "Usuario";
  const rol = sesion?.roles?.[0]?.nombre || sesion?.roles?.[0] || "Cuenta Activa";

  useEffect(() => {
    if (!abierto) return;

    const handleClickFuera = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickFuera);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickFuera);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [abierto]);

  return h(
    "div",
    { className: "header-avatar-container", ref: containerRef },
    h(
      "button",
      {
        className: `header-avatar-btn ${abierto ? "header-avatar-btn--active" : ""}`,
        type: "button",
        "aria-label": "Abrir opciones de perfil",
        "aria-expanded": abierto,
        onClick: () => setAbierto((prev) => !prev)
      },
      h(IconoFigma, { className: "header-avatar-icon", nombre: "avatar" })
    ),
    abierto
      ? h(
          "div",
          { className: "header-user-modal", role: "dialog", "aria-label": "Menú de usuario" },
          h(
            "div",
            { className: "header-user-modal__header" },
            h(
              "div",
              { className: "header-user-modal__avatar-mini" },
              h(IconoFigma, { nombre: "avatar" })
            ),
            h(
              "div",
              { className: "header-user-modal__info" },
              h("strong", { className: "header-user-modal__name" }, nombre),
              h("span", { className: "header-user-modal__email" }, usuario?.email || rol)
            )
          ),
          h("div", { className: "header-user-modal__divider" }),
          h(
            "div",
            { className: "header-user-modal__body" },
            h(
              "button",
              {
                type: "button",
                className: "header-user-modal__item",
                onClick: () => {
                  setAbierto(false);
                }
              },
              h(
                "svg",
                {
                  className: "header-user-modal__icon",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                },
                h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
                h("circle", { cx: "12", cy: "7", r: "4" })
              ),
              h("span", null, "Mi Perfil")
            ),
            h(
              "button",
              {
                type: "button",
                className: "header-user-modal__item",
                onClick: () => {
                  setAbierto(false);
                }
              },
              h(
                "svg",
                {
                  className: "header-user-modal__icon",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                },
                h("circle", { cx: "12", cy: "12", r: "3" }),
                h("path", {
                  d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                })
              ),
              h("span", null, "Configuración")
            )
          ),
          h("div", { className: "header-user-modal__divider" }),
          h(
            "div",
            { className: "header-user-modal__footer" },
            h(
              "button",
              {
                type: "button",
                className: "header-user-modal__item header-user-modal__item--logout",
                onClick: () => {
                  setAbierto(false);
                  if (typeof cerrarSesion === "function") {
                    cerrarSesion();
                  } else {
                    window.location.hash = "#/login";
                  }
                }
              },
              h(
                "svg",
                {
                  className: "header-user-modal__icon",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                },
                h("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }),
                h("polyline", { points: "16 17 21 12 16 7" }),
                h("line", { x1: "21", y1: "12", x2: "9", y2: "12" })
              ),
              h("span", null, "Cerrar Sesión")
            )
          )
        )
      : null
  );
}

function IconBell({ className = "header-notification-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }),
    h("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })
  );
}

function HeaderNotificationsMenu() {
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef(null);
  const { items, noLeidas, alternarLeida, marcarTodasLeidas, descartar } = useNotificaciones();

  const ultimasTres = items.slice(0, 3);

  useEffect(() => {
    if (!abierto) return;

    const handleClickFuera = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickFuera);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickFuera);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [abierto]);

  return h(
    "div",
    { className: "header-notifications-container", ref: containerRef },
    h(
      "button",
      {
        className: `header-notification-btn ${abierto ? "header-notification-btn--active" : ""}`,
        type: "button",
        "aria-label": noLeidas ? `Ver ${noLeidas} notificaciones pendientes` : "Ver notificaciones",
        "aria-expanded": abierto,
        onClick: () => setAbierto((prev) => !prev)
      },
      h(IconBell, null),
      noLeidas > 0
        ? h(
            "span",
            { className: "header-notification-badge" },
            noLeidas > 99 ? "99+" : noLeidas
          )
        : null
    ),
    abierto
      ? h(
          "div",
          { className: "header-notifications-dropdown", role: "dialog", "aria-label": "Notificaciones recientes" },
          h(
            "div",
            { className: "header-notif-dropdown__header" },
            h(
              "div",
              { className: "header-notif-dropdown__title-wrap" },
              h("strong", { className: "header-notif-dropdown__title" }, "Notificaciones"),
              noLeidas > 0
                ? h("span", { className: "header-notif-dropdown__count" }, `${noLeidas} nuevas`)
                : null
            ),
            noLeidas > 0
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "header-notif-dropdown__mark-all",
                    onClick: marcarTodasLeidas
                  },
                  "Marcar todas"
                )
              : null
          ),
          h(
            "div",
            { className: "header-notif-dropdown__body" },
            ultimasTres.length === 0
              ? h(
                  "div",
                  { className: "header-notif-dropdown__empty" },
                  h(IconBell, { className: "header-notif-empty-icon" }),
                  h("p", null, "No tenés notificaciones pendientes.")
                )
              : ultimasTres.map((notif) => {
                  const esUrgente =
                    String(notif.tipo).toLowerCase().includes("urgente") ||
                    String(notif.tipo).toLowerCase().includes("crítico") ||
                    String(notif.tipo).toLowerCase().includes("alerta");

                  return h(
                    "div",
                    {
                      key: notif.id,
                      className: `header-notif-item ${notif.leida ? "header-notif-item--read" : "header-notif-item--unread"} ${esUrgente ? "header-notif-item--urgent" : ""}`,
                      onClick: () => {
                        if (!notif.leida) alternarLeida(notif.id, true);
                        if (notif.destino) {
                          window.location.hash = notif.destino;
                          setAbierto(false);
                        }
                      }
                    },
                    h(
                      "div",
                      { className: "header-notif-item__main" },
                      h(
                        "div",
                        { className: "header-notif-item__title-row" },
                        h("strong", { className: "header-notif-item__title" }, notif.titulo),
                        !notif.leida
                          ? h("span", { className: "header-notif-dot" })
                          : null
                      ),
                      h("p", { className: "header-notif-item__desc" }, notif.detalle),
                      h(
                        "div",
                        { className: "header-notif-item__footer-row" },
                        h("time", { className: "header-notif-item__time" }, fecha(notif.creadaEn)),
                        h(
                          "div",
                          { className: "header-notif-item__quick-actions", onClick: (e) => e.stopPropagation() },
                          h(
                            "button",
                            {
                              type: "button",
                              className: "header-notif-quick-btn",
                              onClick: () => alternarLeida(notif.id, !notif.leida),
                              title: notif.leida ? "Marcar no leída" : "Marcar leída"
                            },
                            notif.leida ? "No leída" : "Leída"
                          ),
                          h(
                            "button",
                            {
                              type: "button",
                              className: "header-notif-quick-btn header-notif-quick-btn--dismiss",
                              onClick: () => descartar(notif.id),
                              title: "Descartar"
                            },
                            "✕"
                          )
                        )
                      )
                    )
                  );
                })
          ),
          h(
            "div",
            { className: "header-notif-dropdown__footer" },
            h(
              "button",
              {
                type: "button",
                className: "header-notif-dropdown__see-all-btn",
                onClick: () => {
                  setAbierto(false);
                  window.location.hash = "#/notificaciones";
                }
              },
              "Ver más notificaciones ➔"
            )
          )
        )
      : null
  );
}

function Header({ ruta, esLogin }) {
  const enlaces = [
    ["Inicio", "#/inicio"],
    ["Sobre Nosotros", "#nosotros"],
    ["Menú", "#menu"]
  ];

  return h(
    "header",
    { className: "site-header" },
    h(
      "div",
      { className: "site-header__top" },
      h(
        "div",
        { className: "site-header__left" },
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
      h(
        "div",
        { className: "site-header__center" },
        !esLogin
          ? h(
              "nav",
              { className: "main-nav", "aria-label": "Navegación principal" },
              enlaces.map(([label, href]) => {
                const activo =
                  href === ruta ||
                  (href === "#/inicio" &&
                    (!ruta ||
                      ruta === "#/inicio" ||
                      ruta === "#/secretaria" ||
                      ruta === "#/preceptoria" ||
                      ruta === "#/alumnos" ||
                      ruta === "#/alumnos/cargar" ||
                      ruta === "#/alumnos/nuevo"));

                return h(
                  "a",
                  {
                    key: href,
                    className: `nav-pill-btn ${activo ? "active" : ""}`,
                    href,
                    "aria-current": activo ? "page" : undefined
                  },
                  label
                );
              })
            )
          : null
      ),
      h(
        "div",
        { className: "site-header__right" },
        h(HeaderNotificationsMenu),
        h(UserAvatarMenu)
      )
    )
  );
}

function ContactLink({ icon, href, children }) {
  return h(
    "a",
    { href },
    h(IconoFigma, { className: "contact-icon", nombre: icon }),
    h("span", null, children)
  );
}

function FooterLinks({ title, links }) {
  return h(
    "section",
    null,
    h("h2", null, title),
    links.map(([label, action]) => {
      if (typeof action === "function") {
        return h(
          "button",
          {
            key: label,
            type: "button",
            className: "footer-link-btn",
            onClick: (e) => {
              e.preventDefault();
              action();
            }
          },
          label
        );
      }
      return h("a", { key: action, href: action }, label);
    })
  );
}

function Footer({ esLogin, onOpenDocumento }) {
  const linksNavegacion = esLogin
    ? [
        ["Inicio", "#/inicio"],
        ["Sobre Nosotros", "#nosotros"]
      ]
    : [
        ["Inicio", "#/inicio"],
        ["Alumnos", "#/alumnos"],
        ["Observaciones", "#/preceptoria/observaciones"],
        ["Sobre Nosotros", "#nosotros"]
      ];

  return h(
    "footer",
    { className: "site-footer" },
    h(
      "div",
      { className: "site-footer__inner" },
      h(
        "section",
        { className: "footer-brand" },
        h("img", {
          className: "footer-logo",
          src: "/assets/prece-logotipo-vertical.png",
          alt: "Prece.Digital"
        }),
        h(
          "div",
          { className: "social-links" },
          [
            ["youtube", "YouTube"],
            ["x", "X"],
            ["facebook", "Facebook"],
            ["instagram", "Instagram"]
          ].map(([name, label]) =>
            h(
              "a",
              { key: name, href: `#${name}`, "aria-label": label },
              h(IconoFigma, { nombre: name })
            )
          )
        ),
        h(
          "address",
          null,
          h(
            ContactLink,
            { icon: "support", href: "mailto:Prece.Digital.Soporte@gmail.com" },
            "Prece.Digital.Soporte@gmail.com"
          ),
          h(
            ContactLink,
            { icon: "email", href: "mailto:Prece.Digital@gmail.com" },
            "Prece.Digital@gmail.com"
          ),
          h(ContactLink, { icon: "phone", href: "tel:+012345678" }, "+0 1234-5678")
        )
      ),
      h(
        "div",
        { className: "footer-nav" },
        h(FooterLinks, {
          title: "Links",
          links: linksNavegacion
        }),
        h(FooterLinks, {
          title: "Ayuda",
          links: [
            ["Soporte", "#soporte"],
            ["Privacidad", "#privacidad"],
            ["Contacto", "#contacto"]
          ]
        })
      )
    )
  );
}

/* Modal de documentacion oficial: cualquier pantalla lo abre con el evento
   "prece:open_document_modal". Lo montan los dos layouts. */
export function ModalDocumentosGlobal() {
  const [modalDocumento, setModalDocumento] = useState(null);

  useEffect(() => {
    const handleAbrirDoc = (e) => {
      if (e.detail && e.detail.tipo) {
        setModalDocumento(e.detail.tipo);
      }
    };
    window.addEventListener("prece:open_document_modal", handleAbrirDoc);
    return () => window.removeEventListener("prece:open_document_modal", handleAbrirDoc);
  }, []);

  return h(DocumentosManagerModal, {
    modalActivo: modalDocumento,
    onCerrar: () => setModalDocumento(null)
  });
}

/* Layout de las rutas publicas (login, activar cuenta). Las pantallas internas
   usan AppLayout (layouts/app-layout.js). */
export function SiteLayout({ ruta, children }) {
  const esLogin =
    ruta === "#/login" ||
    ruta === "#/activar" ||
    ruta?.startsWith("#/login") ||
    ruta?.startsWith("#/activar");

  return h(
    React.Fragment,
    null,
    h(Header, { ruta, esLogin }),
    h("main", { className: `page ${esLogin ? "page--login" : ""}`, id: "inicio" }, children),
    h(Footer, { esLogin }),
    h(ModalDocumentosGlobal)
  );
}

