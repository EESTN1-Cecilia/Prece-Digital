import { h, ActionButton } from "../../layouts/site-layout.js";

/**
 * Grilla de accesos rápidos a las funcionalidades institucionales según permisos.
 * Con iconos SVG de Figma y sin emojis.
 */
export function QuickAccessGrid({ userPermissions = ["all"] }) {
  const allAccesses = [
    { id: "students", label: "Alumnos", icon: "user-search", href: "#/alumnos", permission: "students:view" },
    { id: "search-student", label: "Buscar Alumno", icon: "user-search", href: "#/alumnos/buscar", permission: "students:search" },
    { id: "tutors", label: "Tutores", icon: "people", href: "#/tutores", permission: "tutors:view" },
    { id: "attendance", label: "Inasistencias", icon: "clipboard", href: "#/asistencias", permission: "attendance:view" },
    { id: "observations", label: "Observaciones", icon: "clipboard", href: "#/observaciones", permission: "observations:view" },
    { id: "academic-status", label: "Situación Académica", icon: "filter", href: "#/situacion-academica", permission: "academics:view" },
    { id: "grades", label: "Calificaciones", icon: "clipboard", href: "#/calificaciones", permission: "grades:view" },
    { id: "matrix-book", label: "Libro Matriz", icon: "clipboard", href: "#/libro-matriz", permission: "matrix:view" },
    { id: "documentation", label: "Documentación", icon: "clipboard", href: "#/documentacion", permission: "documents:view" },
    { id: "promotion", label: "Promoción y Cursos", icon: "filter", href: "#/promocion", permission: "promotion:view" }
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
