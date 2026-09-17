import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentActionsBar: Barra de acciones rápidas para el perfil del alumno respetando condiciones y permisos.
 */
export function StudentActionsBar({
  alumno = {},
  permisos = {},
  onOpenCertificateModal,
  onOpenTransferModal,
  onOpenEditModal,
  onOpenObservationModal
}) {
  const isActivo = (alumno.estado || "").toLowerCase() === "activo";
  const puedeConstancia = permisos.puedeGenerarConstancia !== false && isActivo;
  const puedePase = permisos.puedeIniciarPase !== false && isActivo;
  const puedeModificar = permisos.puedeModificar !== false;
  const puedeObservar = permisos.puedeRegistrarObservaciones !== false;

  return h(
    "div",
    { className: "student-actions-bar-container" },
    h(
      "div",
      { className: "student-actions-bar-inner" },
      h(
        "div",
        { className: "actions-bar-info" },
        h("span", { className: "actions-bar-title" }, "Acciones de Gestión"),
        h("span", { className: "actions-bar-desc" }, `Operaciones disponibles para el alumno (${alumno.estado || "Activo"})`)
      ),
      h(
        "div",
        { className: "actions-bar-buttons" },

        // 1. Constancia de Alumno Regular
        h(
          "button",
          {
            type: "button",
            className: `btn-action-outline ${!puedeConstancia ? "disabled" : ""}`,
            onClick: puedeConstancia ? onOpenCertificateModal : null,
            disabled: !puedeConstancia,
            title: puedeConstancia
              ? "Generar constancia de alumno regular"
              : "Disponible solo para alumnos en estado Activo"
          },
          h(
            "svg",
            { className: "btn-action-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M6 9V2h12v7" }),
            h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
            h("rect", { x: "6", y: "14", width: "12", height: "8" })
          ),
          h("span", null, "Constancia Alumno Regular")
        ),

        // 2. Iniciar Cambio de Colegio / Pase
        h(
          "button",
          {
            type: "button",
            className: `btn-action-outline ${!puedePase ? "disabled" : ""}`,
            onClick: puedePase ? onOpenTransferModal : null,
            disabled: !puedePase,
            title: puedePase
              ? "Iniciar trámite de pase a otra institución"
              : "No disponible para alumnos inactivos o con pase en trámite"
          },
          h(
            "svg",
            { className: "btn-action-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M16 17l5-5-5-5" }),
            h("path", { d: "M21 12H9" }),
            h("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" })
          ),
          h("span", null, "Cambio de Colegio")
        ),

        // 3. Registrar Observación
        h(
          "button",
          {
            type: "button",
            className: `btn-action-outline ${!puedeObservar ? "disabled" : ""}`,
            onClick: puedeObservar ? onOpenObservationModal : null,
            disabled: !puedeObservar,
            title: "Registrar una nueva observación institucional"
          },
          h(
            "svg",
            { className: "btn-action-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
            h("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
          ),
          h("span", null, "Nueva Observación")
        ),

        // 4. Modificar Información
        h(
          "button",
          {
            type: "button",
            className: `btn-action-primary ${!puedeModificar ? "disabled" : ""}`,
            onClick: puedeModificar ? onOpenEditModal : null,
            disabled: !puedeModificar,
            title: "Modificar datos personales y de contacto del alumno"
          },
          h(
            "svg",
            { className: "btn-action-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M12 20h9" }),
            h("path", { d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" })
          ),
          h("span", null, "Modificar Información")
        )
      )
    )
  );
}
