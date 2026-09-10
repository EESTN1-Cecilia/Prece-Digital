import { useState, useEffect } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { RoleSwitch } from "../../components/common/role-switch.js";
import { AuthService } from "../../services/auth-service.js";
import { Boton, Card } from "../../components/ui/index.js";

function CourseHeader({ title, detail, open, onToggle }) {
  return h(
    "button",
    {
      className: "course-header",
      type: "button",
      onClick: onToggle,
      "aria-expanded": open
    },
    h(IconoFigma, { className: "people-icon", nombre: "people" }),
    h("span", { className: "course-header__title" }, title),
    detail ? h("span", { className: "course-header__detail" }, detail) : null,
    h(IconoFigma, {
      className: `course-header__chevron${open ? " course-header__chevron--open" : ""}`,
      nombre: "chevron"
    })
  );
}

function ActivityList({ items }) {
  return h(
    "div",
    { className: "activity-list" },
    items.map((item, index) =>
      h(
        "div",
        { className: "activity-item", key: `${item.overline}-${index}` },
        h("span", null, item.overline),
        h("strong", null, item.title)
      )
    )
  );
}

function Dashboard() {
  const alerts = [
    { overline: "0 inasistencias consecutivas", title: "Alumno Apellido, División, Grupo" },
    { overline: "0 inasistencias consecutivas", title: "Alumno Apellido, División, Grupo" },
    { overline: "0 inasistencias consecutivas", title: "Alumno Apellido, División, Grupo" }
  ];
  const conflicts = [
    { overline: "Pase de ingreso", title: "Alumno Apellido, División, Grupo" },
    { overline: "Conflicto de taller", title: "Alumno Apellido, División, Grupo" },
    { overline: "Pase de ingreso", title: "Alumno Apellido, División, Grupo" }
  ];
  const files = [
    { overline: "Docente Apellido, Materia", title: "Planilla mensual" },
    { overline: "Docente Apellido, Materia", title: "Carga de asistencias" },
    { overline: "Docente Apellido, Materia", title: "2doCuatrimestre.xlsx" }
  ];

  return h(
    "section",
    { className: "dashboard", "aria-labelledby": "dashboard-title" },
    h(
      "div",
      { className: "dashboard__top" },
      h(
        "h2",
        { id: "dashboard-title" },
        h(IconoFigma, { className: "sliders-icon", nombre: "filter" }),
        "Tablero"
      ),
      h(
        "div",
        { className: "dashboard__actions" },
        h(Boton, { variante: "primario", icono: "clipboard" }, "Tomar Asistencia"),
        h(Boton, { variante: "secundario", icono: "user-search" }, "Buscar Alumno")
      )
    ),
    h(
      "div",
      { className: "metrics" },
      h(Card, { className: "metric", valor: "0% | 0", descripcion: "Asistencias - Inasistencias" }),
      h(Card, { className: "metric", valor: "0", descripcion: "Conflictos pendientes" }),
      h(Card, { className: "metric", valor: "0", descripcion: "Materias cerradas" }),
      h(Card, { className: "metric", valor: "0", descripcion: "Excel en revisión" })
    ),
    h(
      "div",
      { className: "activity-grid" },
      h(ActivityList, { items: alerts }),
      h(ActivityList, { items: conflicts }),
      h(ActivityList, { items: files })
    ),
    h(
      "div",
      { className: "dashboard__footer-actions" },
      h("button", { type: "button" }, "Planilla"),
      h("button", { className: "is-light", type: "button" }, "Materias"),
      h("button", { type: "button" }, "Plantillas")
    )
  );
}

export default function DashboardView() {
  const [gradeOpen, setGradeOpen] = useState(true);
  const [groupOpen, setGroupOpen] = useState(false);
  const [user, setUser] = useState(AuthService.getCurrentUser());

  useEffect(() => {
    const handleRoleChanged = (e) => setUser(e.detail);
    window.addEventListener("auth:role_changed", handleRoleChanged);
    return () => window.removeEventListener("auth:role_changed", handleRoleChanged);
  }, []);

  const handleSwitchRole = (newRole) => {
    AuthService.switchRole(newRole);
    if (newRole === "secretaria") {
      window.location.hash = "#/secretaria";
    }
  };

  return h(
    "section",
    { className: "welcome-panel" },
    h(
      "div",
      { className: "dashboard-top-bar" },
      h("div", { className: "dashboard-top-bar__info" },
        h("span", { className: "institution-tag" }, user.escuela || "E.E.S.T N°1 Monte Grande"),
        h("span", { className: "cycle-tag" }, `Ciclo ${user.cicloLectivo || "2026"}`)
      ),
      h(RoleSwitch, { activeRole: user.rol, onToggle: handleSwitchRole })
    ),
    h(
      "div",
      { className: "welcome-panel__heading" },
      h("h1", null, "Bienvenido Preceptor ", h("span", null, "“Nombre”")),
      h("p", null, "E.E.S.T N°1 Monte Grande")
    ),
    h(
      "p",
      { className: "welcome-panel__intro" },
      "Desde este espacio podés consultar la información de tus cursos, registrar asistencias y encontrar rápidamente a cada estudiante. También vas a ver las novedades, conflictos pendientes y planillas que necesitan revisión."
    ),
    h(
      "div",
      { className: "quick-actions" },
      h(
        "section",
        null,
        h("h2", null, "División: 0°0"),
        h(
          "div",
          null,
          h(Boton, { variante: "primario", icono: "clipboard" }, "Tomar Asistencia"),
          h(Boton, { variante: "secundario", icono: "user-search" }, "Buscar Alumno")
        )
      ),
      h(
        "section",
        null,
        h("h2", null, "Grupo: 0.0"),
        h(
          "div",
          null,
          h(Boton, { variante: "primario", icono: "clipboard" }, "Tomar Asistencia"),
          h(Boton, { variante: "secundario", icono: "user-search" }, "Buscar Alumno")
        )
      )
    ),
    h(
      "div",
      { className: `course-section${gradeOpen ? " course-section--open" : ""}` },
      h(CourseHeader, {
        title: "División: 0°0",
        open: gradeOpen,
        onToggle: () => setGradeOpen((current) => !current)
      }),
      gradeOpen ? h(Dashboard) : null
    ),
    h(
      "div",
      {
        className: `course-section course-section--last${groupOpen ? " course-section--open" : ""}`
      },
      h(CourseHeader, {
        title: "Grupo: 0.0",
        detail: "División: 0°0",
        open: groupOpen,
        onToggle: () => setGroupOpen((current) => !current)
      }),
      groupOpen ? h(Dashboard) : null
    )
  );
}
