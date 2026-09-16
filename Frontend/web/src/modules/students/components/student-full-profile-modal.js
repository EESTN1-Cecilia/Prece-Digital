import { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { StatusBadge, ConditionBadge } from "./student-badges.js";

const SECCIONES = [
  { id: "personales", label: "Datos Personales", icon: "people" },
  { id: "escolar", label: "Información Escolar", icon: "clipboard" },
  { id: "tutores", label: "Tutores y Contacto", icon: "people" },
  { id: "academica", label: "Situación Académica", icon: "clipboard" },
  { id: "calificaciones", label: "Calificaciones", icon: "filter" },
  { id: "asistencia", label: "Asistencia Detallada", icon: "calendar" },
  { id: "observaciones", label: "Observaciones", icon: "support" },
  { id: "documentacion", label: "Documentación y Legajo", icon: "clipboard" },
  { id: "libro_matriz", label: "Libro Matriz", icon: "filter" },
  { id: "promocion", label: "Promoción e Historial", icon: "check" }
];

/**
 * StudentFullProfileModal: Vista modal interactiva con el perfil y legajo completo del alumno
 */
export function StudentFullProfileModal({ alumno, resumen, onClose }) {
  const [activeTab, setActiveTab] = useState("personales");

  if (!resumen && !alumno) return null;

  const datos = resumen?.datosPersonales || alumno || {};
  const escolar = resumen?.informacionEscolar || {};
  const academico = resumen?.estadoAcademico || {};
  const inasistencias = resumen?.inasistencias || {};

  const nombreCompleto = datos.nombreCompleto || `${datos.apellido}, ${datos.nombre}`;

  return h(
    "div",
    { className: "full-profile-overlay", role: "dialog", "aria-modal": "true" },
    h(
      "div",
      { className: "full-profile-modal" },
      // Encabezado del modal
      h(
        "div",
        { className: "full-profile-header" },
        h(
          "div",
          { className: "full-profile-header__title-wrap" },
          h("h2", { className: "full-profile-title" }, `Perfil Completo: ${nombreCompleto}`),
          h(
            "span",
            { className: "full-profile-subtitle" },
            `DNI ${datos.dni} · ${escolar.curso || "1°"} ${escolar.division || "1"} (${escolar.turno || "Mañana"}) · Legajo ${datos.legajo || "S/N"}`
          )
        ),
        h(
          "button",
          {
            type: "button",
            className: "full-profile-close-btn",
            onClick: onClose,
            "aria-label": "Cerrar perfil completo"
          },
          "✕"
        )
      ),

      // Navegación de pestañas
      h(
        "nav",
        { className: "full-profile-tabs", "aria-label": "Secciones del perfil" },
        SECCIONES.map((sec) =>
          h(
            "button",
            {
              key: sec.id,
              type: "button",
              className: `full-profile-tab-btn ${activeTab === sec.id ? "active" : ""}`,
              onClick: () => setActiveTab(sec.id),
              "aria-selected": activeTab === sec.id
            },
            h(IconoFigma, { className: "tab-icon", nombre: sec.icon }),
            h("span", null, sec.label)
          )
        )
      ),

      // Contenido de la pestaña activa
      h(
        "div",
        { className: "full-profile-body" },
        activeTab === "personales"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Datos Personales y de Filiación"),
              h(
                "div",
                { className: "profile-data-grid" },
                h("div", { className: "profile-data-item" }, h("span", null, "Nombre:"), h("strong", null, datos.nombre)),
                h("div", { className: "profile-data-item" }, h("span", null, "Apellido:"), h("strong", null, datos.apellido)),
                h("div", { className: "profile-data-item" }, h("span", null, "DNI:"), h("strong", null, datos.dni)),
                h("div", { className: "profile-data-item" }, h("span", null, "Fecha de Nacimiento:"), h("strong", null, datos.fechaNacimiento || "15/04/2009")),
                h("div", { className: "profile-data-item" }, h("span", null, "Género:"), h("strong", null, datos.genero || "No especificado")),
                h("div", { className: "profile-data-item" }, h("span", null, "Nacionalidad:"), h("strong", null, "Argentina")),
                h("div", { className: "profile-data-item" }, h("span", null, "Domicilio:"), h("strong", null, datos.direccion || "Av. Pedro Dreyer 1200, Monte Grande")),
                h("div", { className: "profile-data-item" }, h("span", null, "Email Institucional:"), h("strong", null, datos.email || `${datos.nombre?.[0]?.toLowerCase()}.${datos.apellido?.toLowerCase()}@eest1.edu.ar`)),
                h("div", { className: "profile-data-item" }, h("span", null, "Teléfono:"), h("strong", null, datos.telefono || "11-4290-3344"))
              )
            )
          : null,

        activeTab === "escolar"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Trayectoria e Información Escolar"),
              h(
                "div",
                { className: "profile-data-grid" },
                h("div", { className: "profile-data-item" }, h("span", null, "Curso actual:"), h("strong", null, escolar.curso || "1°")),
                h("div", { className: "profile-data-item" }, h("span", null, "División:"), h("strong", null, escolar.division || "1")),
                h("div", { className: "profile-data-item" }, h("span", null, "Turno Aula:"), h("strong", null, escolar.turno || "Mañana")),
                h("div", { className: "profile-data-item" }, h("span", null, "Turno Taller:"), h("strong", null, escolar.turnoTaller || "Tarde")),
                h("div", { className: "profile-data-item" }, h("span", null, "Orientación:"), h("strong", null, escolar.orientacion || "Ciclo Básico")),
                h("div", { className: "profile-data-item" }, h("span", null, "Condición:"), h(ConditionBadge, { condicion: escolar.condicion })),
                h("div", { className: "profile-data-item" }, h("span", null, "Estado:"), h(StatusBadge, { status: escolar.estado, label: escolar.estado })),
                h("div", { className: "profile-data-item" }, h("span", null, "Ciclo Lectivo:"), h("strong", null, String(escolar.anioLectivo || 2026)))
              )
            )
          : null,

        activeTab === "tutores"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Contactos Responsables y Tutores"),
              h(
                "div",
                { className: "tutors-list" },
                h(
                  "div",
                  { className: "tutor-card" },
                  h("h4", { className: "tutor-name" }, "Responsable Principal: Familiar / Tutor"),
                  h("p", null, "Parentesco: Madre / Padre"),
                  h("p", null, "Teléfono de Urgencias: 11-5544-3322"),
                  h("p", null, "Email: contacto.familiar@gmail.com"),
                  h("p", null, "Autorizado a retiro: Sí")
                )
              )
            )
          : null,

        activeTab === "academica"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Situación Académica General"),
              h(
                "div",
                { className: "profile-data-grid" },
                h("div", { className: "profile-data-item" }, h("span", null, "Estado General:"), h("strong", null, academico.estadoGeneral || "Regular al día")),
                h("div", { className: "profile-data-item" }, h("span", null, "Materias Aprobadas:"), h("strong", null, String(academico.materiasAprobadas || 10))),
                h("div", { className: "profile-data-item" }, h("span", null, "Materias Pendientes:"), h("strong", null, String(academico.materiasPendientes || 0))),
                h("div", { className: "profile-data-item" }, h("span", null, "Materias Desaprobadas:"), h("strong", null, String(academico.materiasDesaprobadas || 0))),
                h("div", { className: "profile-data-item" }, h("span", null, "Situación de Promoción:"), h("strong", null, academico.situacionPromocion || "Promoción directa"))
              )
            )
          : null,

        activeTab === "calificaciones"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Calificaciones por Materia (Ciclo 2026)"),
              h(
                "div",
                { className: "table-responsive" },
                h(
                  "table",
                  { className: "custom-table" },
                  h(
                    "thead",
                    null,
                    h("tr", null, h("th", null, "Materia"), h("th", null, "1° Cuatrimestre"), h("th", null, "2° Cuatrimestre"), h("th", null, "Calificación Final"), h("th", null, "Condición"))
                  ),
                  h(
                    "tbody",
                    null,
                    [
                      { nombre: "Matemática", c1: "8", c2: "-", final: "8", condicion: "Aprobada" },
                      { nombre: "Prácticas del Lenguaje", c1: "7", c2: "-", final: "7", condicion: "Aprobada" },
                      { nombre: "Ciencias Naturales / Física", c1: "9", c2: "-", final: "9", condicion: "Aprobada" },
                      { nombre: "Taller Técnico Institucional", c1: "10", c2: "-", final: "10", condicion: "Aprobada" },
                      { nombre: "Inglés", c1: "8", c2: "-", final: "8", condicion: "Aprobada" },
                      { nombre: "Educación Física", c1: "9", c2: "-", final: "9", condicion: "Aprobada" }
                    ].map((m, idx) =>
                      h(
                        "tr",
                        { key: idx },
                        h("td", null, h("strong", null, m.nombre)),
                        h("td", null, m.c1),
                        h("td", null, m.c2),
                        h("td", null, h("strong", null, m.final)),
                        h("td", null, h(StatusBadge, { status: "aprobado", label: m.condicion }))
                      )
                    )
                  )
                )
              )
            )
          : null,

        activeTab === "asistencia"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Registro Detallado de Asistencia"),
              h(
                "div",
                { className: "profile-data-grid" },
                h("div", { className: "profile-data-item" }, h("span", null, "Total Inasistencias:"), h("strong", null, String(inasistencias.total || 0))),
                h("div", { className: "profile-data-item" }, h("span", null, "Justificadas:"), h("strong", null, String(inasistencias.justificadas || 0))),
                h("div", { className: "profile-data-item" }, h("span", null, "Injustificadas:"), h("strong", null, String(inasistencias.injustificadas || 0))),
                h("div", { className: "profile-data-item" }, h("span", null, "% Asistencia:"), h("strong", null, `${inasistencias.porcentajeAsistencia || 95}%`)),
                h("div", { className: "profile-data-item" }, h("span", null, "Período:"), h("strong", null, inasistencias.periodo || "Ciclo Lectivo 2026"))
              )
            )
          : null,

        activeTab === "observaciones"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Observaciones del Preceptor y Docentes"),
              h(
                "div",
                { className: "observations-list" },
                h(
                  "div",
                  { className: "observation-item" },
                  h("strong", null, "Observación de Preceptoría (Ciclo 2026)"),
                  h("p", null, "Alumno con excelente conducta y participación activa en los talleres institucionales.")
                )
              )
            )
          : null,

        activeTab === "documentacion"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Documentación y Legajo Digital"),
              h(
                "div",
                { className: "doc-list" },
                h("p", null, "✓ Fotocopia DNI Alumno (Presentado)"),
                h("p", null, "✓ Fotocopia DNI Tutores (Presentado)"),
                h("p", null, "✓ Certificado de Vacunación y Ficha Médica (Presentado)"),
                h("p", null, "✓ Certificado de Estudios Primarios / Pase Legalizado (Presentado)")
              )
            )
          : null,

        activeTab === "libro_matriz"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Libro Matriz y Registro Oficial"),
              h("p", null, `Folio Matriz: ${datos.id ? `LM-2026-${datos.id}` : "LM-2026-001"}`),
              h("p", null, "Tomo: IV · Folio: 88 · Acta N° 124")
            )
          : null,

        activeTab === "promocion"
          ? h(
              "div",
              { className: "tab-pane-content" },
              h("h3", { className: "tab-section-title" }, "Historial de Promoción y Cambios de Curso"),
              h("p", null, "2026: Inscripción y cursada regular activa en ciclo correspondiente."),
              h("p", null, "2025: Promovido al curso superior en término regular.")
            )
          : null
      ),

      // Pie del modal con botón de cierre
      h(
        "div",
        { className: "full-profile-footer" },
        h(
          "button",
          {
            type: "button",
            className: "action-button action-button--secondary",
            onClick: onClose
          },
          "Cerrar"
        )
      )
    )
  );
}
