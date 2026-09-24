import { h, ActionButton } from "../../layouts/site-layout.js";

/**
 * Grilla de accesos rápidos a las funcionalidades institucionales según permisos.
 * Con iconos SVG de Figma y sin emojis.
 */
export function QuickAccessGrid({ userPermissions = ["all"] }) {
  const allAccesses = [
    { id: "students", label: "Alumnos", icon: "people", href: "#/alumnos", permission: "students:view" },
    { id: "courses", label: "Cursos", icon: "academic", href: "#/cursos", permission: "courses:view" },
    { id: "attendance", label: "Inasistencias", icon: "clipboard", href: "#/asistencias", permission: "attendance:view" },
    { id: "observations", label: "Observaciones", icon: "clipboard", href: "#/preceptoria/observaciones", permission: "observations:view" },
    { id: "grades", label: "Calificaciones", icon: "clipboard", href: "#/calificaciones", permission: "grades:view" }
  ];

  const allowedAccesses = allAccesses;

  return h(
    "div",
    { className: "quick-access-grid" },
    allowedAccesses.map((item) =>
      item.onClick
        ? h(
            "div",
            { key: item.id, className: "quick-access-link" },
            h(
              ActionButton,
              {
                icon: item.icon,
                tone: item.tone || "primary",
                onClick: item.onClick
              },
              item.label
            )
          )
        : h(
            "a",
            { key: item.id, href: item.href, className: "quick-access-link" },
            h(
              ActionButton,
              {
                icon: item.icon,
                tone: item.tone || "primary"
              },
              item.label
            )
          )
    )
  );
}
