import { h, ActionButton } from "../../layouts/site-layout.js";

/**
 * Grilla de accesos rápidos a las funcionalidades institucionales según permisos.
 * Con iconos SVG de Figma y sin emojis.
 */
export function QuickAccessGrid({ userPermissions = ["all"] }) {
  const allAccesses = [
    { id: "students", label: "Alumnos", icon: "people", href: "#/alumnos", permission: "students:view" },
    { id: "attendance", label: "Inasistencias", icon: "clipboard", href: "#/asistencias", permission: "attendance:view" },
    { id: "observations", label: "Observaciones", icon: "clipboard", href: "#/preceptoria/observaciones", permission: "observations:view" },
    { id: "grades", label: "Calificaciones", icon: "clipboard", href: "#/calificaciones", permission: "grades:view" },
    { id: "matrix-book", label: "Libro Matriz", icon: "clipboard", href: "#/libro-matriz", permission: "matrix:view" },
    { id: "documentation", label: "Documentación", icon: "clipboard", href: "#/documentacion", permission: "documents:view" }
  ];

  const allowedAccesses = allAccesses.filter(
    (item) => userPermissions.includes("all") || userPermissions.includes(item.permission)
  );

  return h(
    "div",
    { className: "quick-access-grid" },
    allowedAccesses.map((item) =>
      h(
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
