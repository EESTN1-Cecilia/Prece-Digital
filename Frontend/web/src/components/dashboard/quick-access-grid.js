import { h, ActionButton } from "../../layouts/site-layout.js";

/**
 * Grilla de accesos rápidos a las funcionalidades institucionales según permisos.
 * Con iconos SVG de Figma y sin emojis.
 */
export function QuickAccessGrid({ userPermissions = ["all"], onOpenMatriz = null }) {
  const handleMatrizClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (typeof onOpenMatriz === "function") {
      onOpenMatriz();
    }
    window.dispatchEvent(new CustomEvent("prece:open_matriz_modal"));
  };

  const handleDocClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    window.dispatchEvent(new CustomEvent("prece:open_document_modal", { detail: { tipo: "alumno_regular" } }));
  };

  const allAccesses = [
    { id: "students", label: "Alumnos", icon: "people", href: "#/alumnos", permission: "students:view" },
    { id: "attendance", label: "Inasistencias", icon: "clipboard", href: "#/asistencias", permission: "attendance:view" },
    { id: "observations", label: "Observaciones", icon: "clipboard", href: "#/preceptoria/observaciones", permission: "observations:view" },
    { id: "grades", label: "Calificaciones", icon: "clipboard", href: "#/calificaciones", permission: "grades:view" },
    { id: "matrix-book", label: "Libro Matriz", icon: "clipboard", onClick: handleMatrizClick, permission: "matrix:view" },
    { id: "documentation", label: "Documentación", icon: "clipboard", onClick: handleDocClick, permission: "documents:view" }
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
