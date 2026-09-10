import React, { useState } from "react";

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

function Header({ ruta }) {
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
        h(
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
      ),
      h(
        "div",
        { className: "site-header__right" },
        h(
          "button",
          { className: "header-avatar-btn", type: "button", "aria-label": "Abrir perfil" },
          h(IconoFigma, { className: "header-avatar-icon", nombre: "avatar" })
        )
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
    links.map(([label, href]) => h("a", { key: href, href }, label))
  );
}

function Footer() {
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
          links: [
            ["Inicio", "#/inicio"],
            ["Observaciones", "#/preceptoria/observaciones"],
            ["Inicio secretaria", "#/secretaria"],
            ["Cargar alumno", "#/alumnos/cargar"],
            ["Usuarios", "#/usuarios"],
            ["Roles y permisos", "#/roles"],
            ["Login", "#/login"],
            ["Activar cuenta", "#/activar"],
            ["Crear cuenta", "#/invitar"],
            ["Sobre Nosotros", "#nosotros"]
          ]
        }),
        h(FooterLinks, {
          title: "Ayuda",
          links: [
            ["Soporte", "#soporte"],
            ["Documentos", "#documentos"],
            ["Privacidad", "#privacidad"],
            ["Contacto", "#contacto"]
          ]
        })
      )
    )
  );
}

export function SiteLayout({ ruta, children }) {
  return h(
    React.Fragment,
    null,
    h(Header, { ruta }),
    h("main", { className: "page", id: "inicio" }, children),
    h(Footer)
  );
}
