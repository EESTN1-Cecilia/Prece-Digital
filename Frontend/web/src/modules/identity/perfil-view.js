import React, { useState, useEffect, useRef } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { useSesion } from "../../estado/hooks.js";
import { actualizarUsuario, validarUsuario } from "../../services/identity-api.js";
import { CargandoPantalla } from "../../components/ui/index.js";

// Helper SVG icons
function IconUser({ className = "profile-svg-icon" }) {
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
    h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "12", cy: "7", r: "4" })
  );
}

function IconMail({ className = "profile-svg-icon" }) {
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
    h("rect", { x: "2", y: "4", width: "20", height: "16", rx: "2" }),
    h("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" })
  );
}

function IconPhone({ className = "profile-svg-icon" }) {
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
    h("path", {
      d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
    })
  );
}

function IconLock({ className = "profile-svg-icon" }) {
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
    h("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
    h("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
  );
}

function IconInfo({ className = "profile-svg-icon" }) {
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
    h("circle", { cx: "12", cy: "12", r: "10" }),
    h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
    h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })
  );
}

function IconSave({ className = "profile-svg-icon" }) {
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
    h("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
    h("polyline", { points: "17 21 17 13 7 13 7 21" }),
    h("polyline", { points: "7 3 7 8 15 8" })
  );
}

function IconDashboard({ className = "profile-svg-icon" }) {
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
    h("rect", { x: "3", y: "3", width: "7", height: "7" }),
    h("rect", { x: "14", y: "3", width: "7", height: "7" }),
    h("rect", { x: "14", y: "14", width: "7", height: "7" }),
    h("rect", { x: "3", y: "14", width: "7", height: "7" })
  );
}

function IconSettings({ className = "profile-svg-icon" }) {
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
    h("line", { x1: "4", y1: "21", x2: "4", y2: "14" }),
    h("line", { x1: "4", y1: "10", x2: "4", y2: "3" }),
    h("line", { x1: "12", y1: "21", x2: "12", y2: "12" }),
    h("line", { x1: "12", y1: "8", x2: "12", y2: "3" }),
    h("line", { x1: "20", y1: "21", x2: "20", y2: "16" }),
    h("line", { x1: "20", y1: "12", x2: "20", y2: "3" }),
    h("line", { x1: "1", y1: "14", x2: "7", y2: "14" }),
    h("line", { x1: "9", y1: "8", x2: "15", y2: "8" }),
    h("line", { x1: "17", y1: "16", x2: "23", y2: "16" })
  );
}

function IconStudents({ className = "profile-svg-icon" }) {
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
    h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "9", cy: "7", r: "4" }),
    h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
  );
}

function IconCourses({ className = "profile-svg-icon" }) {
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
    h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
    h("path", { d: "M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" })
  );
}

function IconAttendance({ className = "profile-svg-icon" }) {
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
    h("path", { d: "M9 11l3 3L22 4" }),
    h("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" })
  );
}

function IconObservations({ className = "profile-svg-icon" }) {
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
    h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    h("polyline", { points: "14 2 14 8 20 8" }),
    h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
    h("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
    h("polyline", { points: "10 9 9 9 8 9" })
  );
}

function IconCheckCircle({ className = "profile-svg-icon" }) {
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
    h("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
    h("polyline", { points: "22 4 12 14.01 9 11.01" })
  );
}

const ANCHO_INICIAL = 250;
const ANCHO_MINIMO = 180;
const ANCHO_MAXIMO = 380;

export default function PerfilView() {
  const sesion = useSesion();
  const usuario = sesion?.usuario;
  const roles = sesion?.roles || [];
  const permisos = sesion?.permisos || [];
  const refrescarSesion = sesion?.refrescarSesion;
  const cerrarSesion = sesion?.cerrarSesion;

  const [sidebarColapsada, setSidebarColapsada] = useState(false);
  const [anchoSidebar, setAnchoSidebar] = useState(ANCHO_INICIAL);
  const [estaArrastrando, setEstaArrastrando] = useState(false);
  const arrastrandoRef = useRef(false);

  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    usuario: "",
    email: "",
    telefono: ""
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState(null);

  // Redimensionamiento ajustable con arrastre del mouse y límites
  const iniciarRedimension = (e) => {
    e.preventDefault();
    arrastrandoRef.current = true;
    setEstaArrastrando(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const alMoverMouse = (evento) => {
      if (!arrastrandoRef.current) return;
      const nuevoAncho = Math.min(Math.max(evento.clientX, ANCHO_MINIMO), ANCHO_MAXIMO);
      setAnchoSidebar(nuevoAncho);
      if (sidebarColapsada && nuevoAncho > 100) {
        setSidebarColapsada(false);
      }
    };

    const alSoltarMouse = () => {
      arrastrandoRef.current = false;
      setEstaArrastrando(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", alMoverMouse);
      document.removeEventListener("mouseup", alSoltarMouse);
    };

    document.addEventListener("mousemove", alMoverMouse);
    document.addEventListener("mouseup", alSoltarMouse);
  };

  // Doble clic para restablecer al tamaño original (250px)
  const handleResetSidebar = () => {
    setAnchoSidebar(ANCHO_INICIAL);
    setSidebarColapsada(false);
  };

  useEffect(() => {
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  // Cargar datos iniciales del usuario
  useEffect(() => {
    if (usuario) {
      setDatos({
        nombre: usuario.nombre || "",
        apellido: usuario.apellido || "",
        dni: usuario.dni || "",
        usuario: usuario.usuario || "",
        email: usuario.email || "",
        telefono: usuario.telefono || ""
      });
    }
  }, [usuario]);

  const rolPrincipal =
    roles[0]?.nombre ||
    roles[0] ||
    usuario?.roles?.[0]?.nombre ||
    usuario?.roles?.[0] ||
    "Usuario";

  const escuelaAsignada =
    usuario?.area ||
    usuario?.assignments?.[0]?.schoolId === "esc-1"
      ? "E.E.S.T. N° 1 - Monte Grande"
      : "Sede Institucional";

  const divisionAsignada =
    usuario?.assignments?.[0]?.courseId && usuario?.assignments?.[0]?.divisionId
      ? `${usuario.assignments[0].courseId === "cur-1" ? "1°" : usuario.assignments[0].courseId} ${usuario.assignments[0].divisionId === "div-a" ? "A" : usuario.assignments[0].divisionId} - Turno Mañana`
      : null;

  const handleCambio = (campo) => (e) => {
    const valor = e.target.value;
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: undefined }));
    }
  };

  const handleCancelar = () => {
    if (usuario) {
      setDatos({
        nombre: usuario.nombre || "",
        apellido: usuario.apellido || "",
        dni: usuario.dni || "",
        usuario: usuario.usuario || "",
        email: usuario.email || "",
        telefono: usuario.telefono || ""
      });
    }
    setErrores({});
    setAviso(null);
    setErrorGlobal(null);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (guardando) return;

    setAviso(null);
    setErrorGlobal(null);

    const erroresLocales = validarUsuario(datos, { esAlta: false });
    if (erroresLocales) {
      setErrores(erroresLocales);
      return;
    }

    setErrores({});
    setGuardando(true);

    try {
      if (usuario?.id) {
        await actualizarUsuario(usuario.id, {
          nombre: datos.nombre,
          apellido: datos.apellido,
          dni: datos.dni,
          email: datos.email,
          telefono: datos.telefono
        });
      }

      if (typeof refrescarSesion === "function") {
        await refrescarSesion({ silencioso: true });
      }

      setAviso("Tus datos personales fueron actualizados correctamente.");
    } catch (err) {
      if (err?.campos) {
        setErrores(err.campos);
      } else {
        setErrorGlobal(err?.message || "Ocurrió un error al guardar los cambios.");
      }
    } finally {
      setGuardando(false);
    }
  };

  // Dashboard link depending on user role
  const getDashboardHref = () => {
    const rolCodigos = roles.map((r) => (typeof r === "string" ? r : r.id || r.codigo || ""));
    if (rolCodigos.includes("secretario")) return "#/secretaria";
    if (rolCodigos.includes("jefe_area")) return "#/jefatura";
    if (rolCodigos.includes("server")) return "#/server";
    if (rolCodigos.includes("preceptor")) return "#/preceptoria";
    return "#/inicio";
  };

  if (!usuario) {
    return h("div", { className: "profile-page-wrapper" }, h(CargandoPantalla, { texto: "Cargando perfil..." }));
  }

  return h(
    "div",
    { className: `profile-layout-container ${sidebarColapsada ? "profile-layout-container--collapsed" : ""}` },
    
    // Sidebar Lateral del Módulo
    h(
      "aside",
      {
        className: `profile-sidebar ${sidebarColapsada ? "profile-sidebar--collapsed" : ""} ${estaArrastrando ? "profile-sidebar--resizing" : ""}`,
        style: sidebarColapsada ? undefined : { width: `${anchoSidebar}px` },
        "aria-label": "Menú lateral de módulos"
      },
      // Manija de redimensionamiento con soporte para arrastrar y doble clic
      h("div", {
        className: `profile-sidebar__resizer ${estaArrastrando ? "profile-sidebar__resizer--active" : ""}`,
        title: "Arrastrá para ajustar el ancho (Doble clic para restablecer)",
        "aria-label": "Ajustar ancho de barra lateral",
        role: "separator",
        tabIndex: 0,
        onMouseDown: iniciarRedimension,
        onDoubleClick: handleResetSidebar,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleResetSidebar();
          }
        }
      }),
      h(
        "div",
        { className: "profile-sidebar__header" },
        h(
          "a",
          { href: "#/inicio", className: "profile-sidebar__brand", "aria-label": "Ir a Inicio" },
          h("img", {
            src: sidebarColapsada ? "/assets/precelogo.jpeg" : "/assets/prece-logo-horizontal.png",
            alt: "Prece.Digital",
            className: sidebarColapsada
              ? "profile-sidebar__logo-img profile-sidebar__logo-img--collapsed"
              : "profile-sidebar__logo-img"
          })
        ),
        h(
          "button",
          {
            type: "button",
            className: "profile-sidebar__toggle-btn",
            title: sidebarColapsada ? "Expandir menú" : "Colapsar menú",
            "aria-label": sidebarColapsada ? "Expandir menú" : "Colapsar menú",
            onClick: () => setSidebarColapsada((prev) => !prev)
          },
          h(
            "svg",
            {
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.5",
              className: "profile-sidebar__toggle-icon"
            },
            sidebarColapsada
              ? h("polyline", { points: "9 18 15 12 9 6" })
              : h("polyline", { points: "15 18 9 12 15 6" })
          )
        )
      ),

      h(
        "div",
        { className: "profile-sidebar__nav-body" },
        // Grupo Principal
        h(
          "div",
          { className: "profile-sidebar__group" },
          !sidebarColapsada ? h("span", { className: "profile-sidebar__group-title" }, "PRINCIPAL") : null,
          h(
            "ul",
            { className: "profile-sidebar__list" },
            h(
              "li",
              null,
              h(
                "a",
                { href: getDashboardHref(), className: "profile-sidebar__item", title: "Dashboard" },
                h(IconDashboard, { className: "profile-sidebar__item-icon" }),
                !sidebarColapsada ? h("span", { className: "profile-sidebar__item-label" }, "Dashboard") : null
              )
            ),
            h(
              "li",
              null,
              h(
                "a",
                { href: "#/perfil", className: "profile-sidebar__item profile-sidebar__item--active", title: "Configuración", "aria-current": "page" },
                h(IconSettings, { className: "profile-sidebar__item-icon" }),
                !sidebarColapsada ? h("span", { className: "profile-sidebar__item-label" }, "Configuración") : null
              )
            )
          )
        ),

        // Grupo Gestión Académica
        h(
          "div",
          { className: "profile-sidebar__group" },
          !sidebarColapsada ? h("span", { className: "profile-sidebar__group-title" }, "GESTIÓN ACADÉMICA") : null,
          h(
            "ul",
            { className: "profile-sidebar__list" },
            h(
              "li",
              null,
              h(
                "a",
                { href: "#/alumnos", className: "profile-sidebar__item", title: "Alumnos" },
                h(IconStudents, { className: "profile-sidebar__item-icon" }),
                !sidebarColapsada ? h("span", { className: "profile-sidebar__item-label" }, "Alumnos") : null
              )
            ),
            h(
              "li",
              null,
              h(
                "a",
                { href: "#/cursos", className: "profile-sidebar__item", title: "Cursos" },
                h(IconCourses, { className: "profile-sidebar__item-icon" }),
                !sidebarColapsada ? h("span", { className: "profile-sidebar__item-label" }, "Cursos") : null
              )
            ),
            h(
              "li",
              null,
              h(
                "a",
                { href: "#/preceptoria", className: "profile-sidebar__item", title: "Inasistencias" },
                h(IconAttendance, { className: "profile-sidebar__item-icon" }),
                !sidebarColapsada ? h("span", { className: "profile-sidebar__item-label" }, "Inasistencias") : null
              )
            ),
            h(
              "li",
              null,
              h(
                "a",
                { href: "#/preceptoria/observaciones", className: "profile-sidebar__item", title: "Observaciones" },
                h(IconObservations, { className: "profile-sidebar__item-icon" }),
                !sidebarColapsada ? h("span", { className: "profile-sidebar__item-label" }, "Observaciones") : null
              )
            )
          )
        )
      ),

      // Footer del Sidebar
      h(
        "div",
        { className: "profile-sidebar__footer" },
        h(
          "div",
          { className: "profile-sidebar__user-card" },
          h(
            "div",
            { className: "profile-sidebar__user-avatar" },
            h(IconoFigma, { className: "profile-sidebar__user-avatar-icon", nombre: "avatar" })
          ),
          !sidebarColapsada
            ? h(
                "div",
                { className: "profile-sidebar__user-info" },
                h("span", { className: "profile-sidebar__user-role" }, rolPrincipal),
                h("span", { className: "profile-sidebar__user-location" }, escuelaAsignada)
              )
            : null
        ),
        !sidebarColapsada
          ? h(
              "button",
              {
                type: "button",
                className: "profile-sidebar__logout-link",
                onClick: () => {
                  if (typeof cerrarSesion === "function") {
                    cerrarSesion();
                  } else {
                    window.location.hash = "#/login";
                  }
                }
              },
              "Cerrar sesión"
            )
          : null
      )
    ),

    // Área de Contenido Principal
    h(
      "main",
      { className: "profile-main-content", id: "profile-content-area" },
      // Migas de Navegación
      h(
        "nav",
        { className: "profile-breadcrumbs", "aria-label": "Ubicación" },
        h("span", { className: "profile-breadcrumb-item" }, "MI CUENTA"),
        h("span", { className: "profile-breadcrumb-separator" }, "/"),
        h("span", { className: "profile-breadcrumb-item profile-breadcrumb-item--active" }, "CONFIGURACIÓN")
      ),

      // Título y Subtítulo de Cabecera
      h(
        "header",
        { className: "profile-header" },
        h("h1", { className: "profile-header__title" }, "Configuración de perfil"),
        h("p", { className: "profile-header__subtitle" }, "Administrá tu información personal y mantené tus datos actualizados.")
      ),

      // Barra de Pestañas / Categorías
      h(
        "div",
        { className: "profile-tabs-bar" },
        h(
          "button",
          {
            type: "button",
            className: "profile-tab-pill profile-tab-pill--active",
            "aria-current": "page"
          },
          h(IconUser, { className: "profile-tab-icon" }),
          h("span", null, "Información personal")
        )
      ),

      // Rejilla Principal (Formulario a la izquierda, Tarjeta informativa a la derecha)
      h(
        "div",
        { className: "profile-workspace-grid" },
        // Columna Izquierda: Formulario de Perfil
        h(
          "section",
          { className: "profile-card profile-card--form", "aria-labelledby": "profile-form-title" },
          // Header de la tarjeta "Mi perfil"
          h(
            "div",
            { className: "profile-card-header-banner" },
            h(
              "div",
              { className: "profile-card-avatar-box" },
              h(IconoFigma, { className: "profile-card-avatar-svg", nombre: "avatar" })
            ),
            h(
              "div",
              { className: "profile-card-header-text" },
              h("h2", { id: "profile-form-title", className: "profile-card-title" }, "Mi perfil"),
              h("p", { className: "profile-card-subtitle" }, "Datos de tu cuenta")
            )
          ),

          // Alerta de Notificación / Éxito
          aviso
            ? h(
                "div",
                { className: "profile-alert profile-alert--success", role: "alert" },
                h(IconCheckCircle, { className: "profile-alert__icon" }),
                h("span", { className: "profile-alert__text" }, aviso)
              )
            : null,

          // Alerta de Error
          errorGlobal
            ? h(
                "div",
                { className: "profile-alert profile-alert--error", role: "alert" },
                h(IconInfo, { className: "profile-alert__icon" }),
                h("span", { className: "profile-alert__text" }, errorGlobal)
              )
            : null,

          h(
            "form",
            { className: "profile-form", onSubmit: handleGuardar, noValidate: true },
            
            // Sección: Datos personales
            h(
              "fieldset",
              { className: "profile-form-section" },
              h("legend", { className: "profile-form-section__title" }, "Datos personales"),
              h("p", { className: "profile-form-section__subtitle" }, "Información básica de tu cuenta."),

              h(
                "div",
                { className: "profile-form-row" },
                h(
                  "div",
                  { className: "profile-form-group" },
                  h("label", { htmlFor: "perfil-nombre", className: "profile-form-label" }, "Nombre *"),
                  h("input", {
                    id: "perfil-nombre",
                    type: "text",
                    className: `profile-form-input ${errores.nombre ? "profile-form-input--error" : ""}`,
                    placeholder: "Tu nombre",
                    value: datos.nombre,
                    onChange: handleCambio("nombre"),
                    required: true
                  }),
                  errores.nombre ? h("span", { className: "profile-form-error-msg" }, errores.nombre) : null
                ),
                h(
                  "div",
                  { className: "profile-form-group" },
                  h("label", { htmlFor: "perfil-apellido", className: "profile-form-label" }, "Apellido *"),
                  h("input", {
                    id: "perfil-apellido",
                    type: "text",
                    className: `profile-form-input ${errores.apellido ? "profile-form-input--error" : ""}`,
                    placeholder: "Tu apellido",
                    value: datos.apellido,
                    onChange: handleCambio("apellido"),
                    required: true
                  }),
                  errores.apellido ? h("span", { className: "profile-form-error-msg" }, errores.apellido) : null
                )
              ),

              h(
                "div",
                { className: "profile-form-row" },
                h(
                  "div",
                  { className: "profile-form-group" },
                  h("label", { htmlFor: "perfil-dni", className: "profile-form-label" }, "DNI / Documento *"),
                  h("input", {
                    id: "perfil-dni",
                    type: "text",
                    className: `profile-form-input ${errores.dni ? "profile-form-input--error" : ""}`,
                    placeholder: "Tu número de DNI",
                    value: datos.dni,
                    onChange: handleCambio("dni"),
                    required: true
                  }),
                  errores.dni ? h("span", { className: "profile-form-error-msg" }, errores.dni) : null
                ),
                h(
                  "div",
                  { className: "profile-form-group" },
                  h("label", { htmlFor: "perfil-usuario", className: "profile-form-label" }, "Identificador / Usuario"),
                  h("input", {
                    id: "perfil-usuario",
                    type: "text",
                    className: "profile-form-input profile-form-input--readonly",
                    placeholder: "Tu usuario",
                    value: datos.usuario || usuario?.email?.split("@")[0] || "",
                    readOnly: true
                  }),
                  h("span", { className: "profile-form-help-msg" }, "Identificador asignado en el sistema.")
                )
              )
            ),

            h("div", { className: "profile-form-divider" }),

            // Sección: Datos de contacto
            h(
              "fieldset",
              { className: "profile-form-section" },
              h("legend", { className: "profile-form-section__title" }, "Datos de contacto"),
              h("p", { className: "profile-form-section__subtitle" }, "Usamos estos datos para identificarte y comunicarnos con vos."),

              h(
                "div",
                { className: "profile-form-row" },
                h(
                  "div",
                  { className: "profile-form-group" },
                  h("label", { htmlFor: "perfil-email", className: "profile-form-label" }, "Correo electrónico *"),
                  h(
                    "div",
                    { className: "profile-input-with-icon" },
                    h(IconMail, { className: "profile-input-icon" }),
                    h("input", {
                      id: "perfil-email",
                      type: "email",
                      className: `profile-form-input profile-form-input--icon ${errores.email ? "profile-form-input--error" : ""}`,
                      placeholder: "nombre@correo.com",
                      value: datos.email,
                      onChange: handleCambio("email"),
                      required: true
                    })
                  ),
                  errores.email ? h("span", { className: "profile-form-error-msg" }, errores.email) : null
                ),
                h(
                  "div",
                  { className: "profile-form-group" },
                  h("label", { htmlFor: "perfil-telefono", className: "profile-form-label" }, "Teléfono"),
                  h(
                    "div",
                    { className: "profile-input-with-icon" },
                    h(IconPhone, { className: "profile-input-icon" }),
                    h("input", {
                      id: "perfil-telefono",
                      type: "tel",
                      className: `profile-form-input profile-form-input--icon ${errores.telefono ? "profile-form-input--error" : ""}`,
                      placeholder: "Tu número de teléfono",
                      value: datos.telefono,
                      onChange: handleCambio("telefono")
                    })
                  ),
                  errores.telefono ? h("span", { className: "profile-form-error-msg" }, errores.telefono) : null
                )
              )
            ),

            h("div", { className: "profile-form-divider" }),

            // Sección: Información institucional (Solo lectura del sistema)
            h(
              "div",
              { className: "profile-form-section" },
              h("h3", { className: "profile-form-section__title" }, "Información institucional"),
              h("p", { className: "profile-form-section__subtitle" }, "Datos y asignaciones oficiales provistos por la institución."),

              h(
                "div",
                { className: "profile-system-grid" },
                h(
                  "div",
                  { className: "profile-system-item" },
                  h("span", { className: "profile-system-item__label" }, "Rol en el sistema"),
                  h(
                    "div",
                    { className: "profile-system-item__value" },
                    h("span", { className: "profile-badge profile-badge--role" }, rolPrincipal)
                  )
                ),
                h(
                  "div",
                  { className: "profile-system-item" },
                  h("span", { className: "profile-system-item__label" }, "Dependencia / Escuela"),
                  h("span", { className: "profile-system-item__value-text" }, escuelaAsignada)
                ),
                divisionAsignada
                  ? h(
                      "div",
                      { className: "profile-system-item" },
                      h("span", { className: "profile-system-item__label" }, "Curso y Turno asignado"),
                      h("span", { className: "profile-system-item__value-text" }, divisionAsignada)
                    )
                  : null,
                h(
                  "div",
                  { className: "profile-system-item" },
                  h("span", { className: "profile-system-item__label" }, "Estado de la cuenta"),
                  h(
                    "div",
                    { className: "profile-system-item__value" },
                    h("span", { className: "profile-badge profile-badge--active" }, "● Activa")
                  )
                )
              )
            ),

            // Barra de Acciones Inferior
            h(
              "div",
              { className: "profile-form-actions-bar" },
              h(
                "span",
                { className: "profile-form-status-text" },
                aviso ? "Cambios guardados." : "Tus datos están actualizados."
              ),
              h(
                "div",
                { className: "profile-form-buttons-group" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "profile-btn profile-btn--cancel",
                    onClick: handleCancelar,
                    disabled: guardando
                  },
                  "Cancelar"
                ),
                h(
                  "button",
                  {
                    type: "submit",
                    className: "profile-btn profile-btn--save",
                    disabled: guardando
                  },
                  h(IconSave, { className: "profile-btn-icon" }),
                  h("span", null, guardando ? "Guardando..." : "Guardar cambios")
                )
              )
            )
          )
        ),

        // Columna Derecha: Tarjetas informativas
        h(
          "aside",
          { className: "profile-side-column" },
          // Tarjeta Informativa "Tu información, al día"
          h(
            "div",
            { className: "profile-side-card" },
            h(
              "div",
              { className: "profile-side-card__icon-wrap" },
              h(IconInfo, { className: "profile-side-card__info-icon" })
            ),
            h("h3", { className: "profile-side-card__title" }, "Tu información, al día"),
            h(
              "p",
              { className: "profile-side-card__desc" },
              "Mantené tus datos de contacto actualizados para que podamos comunicarnos con vos cuando sea necesario."
            ),
            h("div", { className: "profile-side-card__divider" }),
            h(
              "div",
              { className: "profile-side-card__lock-row" },
              h(IconLock, { className: "profile-side-card__lock-icon" }),
              h("span", { className: "profile-side-card__lock-text" }, "Solo vos podés ver y editar tus datos.")
            )
          ),

          // Tarjeta de Seguridad y Resumen de Sesión
          h(
            "div",
            { className: "profile-side-card profile-side-card--summary" },
            h("h4", { className: "profile-side-card__summary-title" }, "Seguridad y cuenta"),
            h(
              "ul",
              { className: "profile-summary-list" },
              h(
                "li",
                { className: "profile-summary-item" },
                h("span", { className: "profile-summary-label" }, "Identificador interno"),
                h("code", { className: "profile-summary-code" }, usuario?.id || "usr_act")
              ),
              h(
                "li",
                { className: "profile-summary-item" },
                h("span", { className: "profile-summary-label" }, "Permisos habilitados"),
                h("span", { className: "profile-summary-value" }, `${permisos.length} módulos y acciones`)
              ),
              h(
                "li",
                { className: "profile-summary-item" },
                h("span", { className: "profile-summary-label" }, "Sesión actual"),
                h("span", { className: "profile-badge profile-badge--active" }, "Conectado")
              )
            )
          )
        )
      )
    )
  );
}
