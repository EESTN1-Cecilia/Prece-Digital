import React from "react";
import { useSesion } from "../estado/hooks.js";
import { ACCESO, decidirAcceso } from "../app/navegacion.js";
import { RUTAS } from "../app/rutas.js";

export const h = React.createElement;

export function IconoFigma({ nombre, className }) {
  return h("img", { className, src: `/assets/icons/${nombre}.svg`, alt: "", "aria-hidden": "true" });
}

function Header({ ruta }) {
  const enlaces = [
    ["Sobre Nosotros", "#nosotros"],
    ["Inicio", "#/inicio"],
    ["Menú", "#menu"]
  ];

  return h(
    "header",
    { className: "site-header" },
    h(
      "div",
      { className: "site-header__top" },
      h(
        "a",
        { href: "#/inicio", "aria-label": "Ir al inicio" },
        h("img", {
          className: "header-logo",
          src: "/assets/prece-logo-horizontal.png",
          alt: "Prece.Digital"
        })
      ),
      h(
        "a",
        { className: "profile-button", href: "#/login", "aria-label": "Iniciar sesion" },
        h(IconoFigma, { className: "avatar-usuario", nombre: "avatar" })
      )
    ),
    h(
      "nav",
      { className: "main-nav", "aria-label": "Navegación principal" },
      enlaces.map(([label, href]) => {
        const activo = href === ruta;

        return h(
          "a",
          {
            key: href,
            className: activo ? "active" : undefined,
            href,
            "aria-current": activo ? "page" : undefined
          },
          label
        );
      })
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

/* Enlaces del pie filtrados por la sesion: no se ofrece lo que no se puede
   abrir. Ocultar una opcion no protege la ruta, que sigue evaluandose igual si
   alguien escribe la direccion a mano. */
function enlacesDisponibles(links, sesion) {
  return links.filter(([, href]) => {
    const ruta = RUTAS.find((candidata) => candidata.patron === href);

    if (!ruta) {
      /* Anclas de la pagina publica: no pasan por la tabla de rutas. */
      return true;
    }

    return decidirAcceso({ ruta }, sesion).tipo === ACCESO.permitido;
  });
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
  const sesion = useSesion();

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
          links: enlacesDisponibles(
            [
              ["Inicio", "#/inicio"],
              ["Usuarios", "#/usuarios"],
              ["Roles y permisos", "#/roles"],
              ["Login", "#/login"],
              ["Activar cuenta", "#/activar"],
              ["Crear cuenta", "#/invitar"],
              ["Sobre Nosotros", "#nosotros"]
            ],
            sesion
          )
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
