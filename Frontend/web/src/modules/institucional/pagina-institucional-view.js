import { h } from "../../layouts/site-layout.js";

/* Paginas publicas del pie del sitio: Sobre Nosotros, Soporte, Privacidad y
   Contacto. Se ven sin iniciar sesion (rutas con `publica: true`). */

const CORREO_SOPORTE = "Prece.Digital.Soporte@gmail.com";
const CORREO_CONTACTO = "Prece.Digital@gmail.com";

const PAGINAS = {
  nosotros: {
    titulo: "Sobre Nosotros",
    intro:
      "Prece.Digital es la plataforma de gestión escolar de la E.E.S.T. Nº 1 \"Cecilia Berdichevski\" de Monte Grande, Esteban Echeverría.",
    bloques: [
      [
        "Qué hacemos",
        "Reunimos en un solo lugar la tarea diaria de preceptoría, secretaría, jefatura y dirección: legajos de alumnos, asistencias, observaciones, calificaciones, boletines y documentación oficial."
      ],
      [
        "Para quién es",
        "Para el personal de la escuela, y para que los alumnos y sus familias consulten su situación académica desde el portal del alumno."
      ]
    ]
  },
  soporte: {
    titulo: "Soporte",
    intro: "Si algo no funciona como esperás o tenés una duda de uso, escribinos.",
    bloques: [
      [
        "Cómo pedir ayuda",
        `Enviá un correo a ${CORREO_SOPORTE} contando qué estabas haciendo, en qué pantalla y, si podés, adjuntá una captura del problema.`
      ],
      [
        "Contraseñas",
        "La contraseña la restablece la Dirección o la Secretaría de la escuela. Pedí que te generen una temporal; en tu próximo ingreso el sistema te va a pedir cambiarla."
      ]
    ],
    correo: CORREO_SOPORTE
  },
  privacidad: {
    titulo: "Privacidad",
    intro:
      "Los datos de alumnos, familias y personal se usan únicamente para la gestión escolar de la institución.",
    bloques: [
      [
        "Acceso",
        "Cada persona ve solo la información que su rol permite. Las acciones sobre los datos quedan registradas en el historial de auditoría."
      ],
      [
        "Documentación",
        "Los documentos oficiales (constancias, certificados, boletines) se emiten únicamente a pedido y a través del personal autorizado."
      ],
      [
        "Consultas",
        `Para consultar, corregir o dar de baja datos personales, escribí a ${CORREO_CONTACTO}.`
      ]
    ]
  },
  contacto: {
    titulo: "Contacto",
    intro: "Podés comunicarte con el equipo de Prece.Digital por estos medios.",
    bloques: [
      ["Consultas generales", CORREO_CONTACTO],
      ["Soporte técnico", CORREO_SOPORTE],
      ["Escuela", "E.E.S.T. Nº 1 \"Cecilia Berdichevski\" · Monte Grande, Esteban Echeverría"]
    ],
    correo: CORREO_CONTACTO
  }
};

export default function PaginaInstitucionalView({ pagina = "nosotros" }) {
  const contenido = PAGINAS[pagina] || PAGINAS.nosotros;

  return h(
    "div",
    { className: "login-page-container" },
    h(
      "div",
      { className: "login-card", style: { maxWidth: "720px" } },
      h(
        "div",
        { className: "login-card__top-bar" },
        h("div", { className: "secretaria-eyebrow login-card__eyebrow" }, "PRECE.DIGITAL")
      ),
      h(
        "div",
        { className: "login-card__header" },
        h("h1", { className: "secretaria-title login-card__title" }, contenido.titulo),
        h("p", { className: "login-card__subtitle" }, contenido.intro)
      ),
      h("div", { className: "login-card__divider", "aria-hidden": "true" }),
      contenido.bloques.map(([titulo, texto]) =>
        h(
          "section",
          { key: titulo, style: { margin: "0 0 16px" } },
          h("h2", { style: { fontSize: "1rem", margin: "0 0 4px" } }, titulo),
          h("p", { style: { margin: 0, lineHeight: 1.5 } }, texto)
        )
      ),
      contenido.correo
        ? h(
            "div",
            { className: "login-links-row" },
            h(
              "a",
              { href: `mailto:${contenido.correo}`, className: "login-action-link login-action-link--support" },
              "Escribir un correo"
            )
          )
        : null,
      h(
        "a",
        { href: "#/inicio", className: "login-submit-button", style: { textDecoration: "none", textAlign: "center" } },
        h("span", { className: "login-btn-content" }, h("span", null, "Volver al inicio"))
      )
    )
  );
}
