import React, { useEffect, useState, useMemo } from "react";
import { h } from "../../layouts/site-layout.js";
import { StudentsService } from "./students-service.js";
import { StudentProfileHero } from "./components/profile/student-profile-hero.js";
import { StudentPersonalTab } from "./components/profile/student-personal-tab.js";
import { StudentAcademicTab } from "./components/profile/student-academic-tab.js";
import { StudentAttendanceTab } from "./components/profile/student-attendance-tab.js";
import { StudentObservationsTab } from "./components/profile/student-observations-tab.js";
import { StudentGradeBookTab } from "./components/profile/student-gradebook-tab.js";
import { StudentDocumentationTab } from "./components/profile/student-documentation-tab.js";
import { StudentHistoryTab } from "./components/profile/student-history-tab.js";
import { StudentActionsBar } from "./components/profile/student-actions-bar.js";
import {
  StudentCertificateModal,
  StudentTransferModal,
  StudentEditModal,
  StudentObservationModal
} from "./components/profile/student-modals.js";
import { AlumnoMatrizModal } from "./alumno-matriz-wiew.js";
import { AlumnoRegularModal } from "./components/constancia-alumno-regular-modal.js";
import { TramitePaseModal } from "./components/certificado-pase-modal.js";
import { SolicitudPaseModal } from "./components/solicitud-pase-modal.js";
import { SituacionAcademicaModal } from "./components/constancia-situacion-academica-modal.js";
import { RiteModal } from "../documents/rite-modal.js";
import { PlanillaCalificacionesModal } from "../documents/planilla-calificaciones-modal.js";

/**
 * AlumnoPerfilView: Vista completa y centralizada del Perfil del Alumno.
 * Incluye todas las secciones requeridas, modales interactivos y gestión de estados de la API.
 */
export default function AlumnoPerfilView({ id, ruta }) {
  const getStudentId = () => {
    if (id) return String(id);
    if (ruta?.parametros?.id) return String(ruta.parametros.id);
    const hash = window.location.hash || "";
    const match = hash.match(/#\/alumnos\/([^/?]+)/);
    if (match && match[1] && match[1] !== "cargar" && match[1] !== "nuevo" && match[1] !== "buscar") {
      return decodeURIComponent(match[1]);
    }
    return "";
  };

  const studentId = getStudentId();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Estados para Modales Oficiales de Documentación y Acciones
  const [alumnoRegularOpen, setAlumnoRegularOpen] = useState(false);
  const [tramitePaseOpen, setTramitePaseOpen] = useState(false);
  const [solicitudPaseOpen, setSolicitudPaseOpen] = useState(false);
  const [situacionAcademicaOpen, setSituacionAcademicaOpen] = useState(false);
  const [riteOpen, setRiteOpen] = useState(false);
  const [planillaCalificacionesOpen, setPlanillaCalificacionesOpen] = useState(false);

  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [matrizModalOpen, setMatrizModalOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchProfile = async (isSilentRefresh = false) => {
    const currentId = getStudentId();
    if (!currentId) {
      setError({ message: "No se proporcionó el identificador del alumno.", status: 400 });
      setLoading(false);
      return;
    }

    if (isSilentRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await StudentsService.getAlumnoProfile(studentId);
      if (response && response.data) {
        setProfileData(response.data);
        setError(null);
      } else {
        throw new Error("No se pudo obtener la información completa del alumno.");
      }
    } catch (err) {
      setError({
        status: err.status || err.statusCode || 500,
        message: err.message || "Error al conectar con la base de datos institucional."
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [studentId]);

  // Manejo de Acción: Generar Constancia
  const handleOpenCertificate = async () => {
    setActionSubmitting(true);
    try {
      const certRes = await StudentsService.generateCertificate(studentId);
      setCertificateData(certRes.data || certRes);
      setCertificateModalOpen(true);
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "No se pudo generar la constancia." });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Manejo de Acción: Iniciar Pase / Cambio de Colegio
  const handleTransferSubmit = async (payload) => {
    setActionSubmitting(true);
    try {
      const res = await StudentsService.requestSchoolTransfer(studentId, payload);
      setTransferModalOpen(false);
      setFeedbackMessage({
        type: "success",
        text: res.message || "Trámite de cambio de colegio iniciado correctamente."
      });
      await fetchProfile(true);
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "Error al iniciar el cambio de colegio." });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Manejo de Acción: Modificar Información
  const handleEditSubmit = async (formData) => {
    setActionSubmitting(true);
    try {
      const res = await StudentsService.updateAlumno(studentId, formData);
      setEditModalOpen(false);
      setFeedbackMessage({
        type: "success",
        text: res.message || "Datos del alumno actualizados correctamente."
      });
      await fetchProfile(true);
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "Error al actualizar la información del alumno." });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Manejo de Acción: Registrar Observación
  const handleObservationSubmit = async (obsData) => {
    setActionSubmitting(true);
    try {
      const res = await StudentsService.addObservacion(studentId, obsData);
      setObservationModalOpen(false);
      setFeedbackMessage({
        type: "success",
        text: res.message || "Observación registrada exitosamente."
      });
      await fetchProfile(true);
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "Error al registrar la observación." });
    } finally {
      setActionSubmitting(false);
    }
  };

  // Render Estado: Loading
  if (loading) {
    return h(
      "div",
      { className: "student-profile-page-wrapper" },
      h(
        "div",
        { className: "loading-state-container" },
        h("div", { className: "loading-spinner-large" }),
        h("h3", { className: "loading-title" }, "Cargando perfil completo del alumno..."),
        h("p", { className: "loading-subtitle" }, "Consultando registros académicos y antecedentes institucionales")
      )
    );
  }

  // Render Estado: Error / 404 / 403
  if (error) {
    const is404 = error.status === 404;
    const is403 = error.status === 403;
    const is401 = error.status === 401;

    return h(
      "div",
      { className: "student-profile-page-wrapper" },
      h(
        "div",
        { className: "error-state-container" },
        h(
          "div",
          { className: "error-icon-box" },
          h(
            "svg",
            { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("circle", { cx: "12", cy: "12", r: "10" }),
            h("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
            h("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
          )
        ),
        h(
          "h2",
          { className: "error-title" },
          is404
            ? "Alumno no encontrado"
            : is403
            ? "Acceso Denegado"
            : is401
            ? "Sesión Expirada"
            : "Error al cargar el perfil"
        ),
        h(
          "p",
          { className: "error-description" },
          is404
            ? `No se encontró ningún estudiante registrado con el identificador #${studentId}.`
            : is403
            ? "No posee los permisos necesarios para consultar el legajo completo de este alumno."
            : error.message
        ),
        h(
          "div",
          { className: "error-actions" },
          h(
            "button",
            {
              type: "button",
              className: "btn-secondary",
              onClick: () => { window.location.hash = "#/alumnos"; }
            },
            "Volver al Listado"
          ),
          !is404 && !is403
            ? h(
                "button",
                {
                  type: "button",
                  className: "btn-primary",
                  onClick: () => fetchProfile()
                },
                "Reintentar Conexión"
              )
            : null
        )
      )
    );
  }

  if (!profileData) return null;

  const {
    datosPersonales = {},
    contacto = {},
    tutores = [],
    situacionAcademica = {},
    materias = [],
    inasistencias = {},
    observaciones = [],
    condicionesParticulares = {},
    libroMatriz = [],
    historialCambios = [],
    permisosAcciones = {}
  } = profileData;

  const alumnoCompleto = useMemo(() => {
    return {
      ...datosPersonales,
      ...situacionAcademica,
      id: datosPersonales.id || studentId || 1,
      apellido: datosPersonales.apellido || "",
      nombre: datosPersonales.nombre || "",
      dni: datosPersonales.dni || "",
      curso: situacionAcademica.curso || datosPersonales.curso || "1°",
      division: String(situacionAcademica.division || datosPersonales.division || "1"),
      turno: situacionAcademica.turno || datosPersonales.turno || "Mañana",
      orientacion: situacionAcademica.orientacion || datosPersonales.orientacion || "Ciclo Básico",
      legajo: datosPersonales.legajo || situacionAcademica.legajo || "S/N"
    };
  }, [datosPersonales, situacionAcademica, studentId]);

  return h(
    "div",
    { className: "student-profile-page-wrapper" },

    // Barra de Navegación Superior (Volver + Acciones)
    h(
      "div",
      { className: "student-profile-top-bar" },
      h(
        "div",
        { className: "top-bar-left" },
        h(
          "button",
          {
            type: "button",
            className: "btn-volver-atras",
            onClick: () => { window.location.hash = `#/alumnos/${studentId}`; },
            title: "Volver a la ficha resumida",
            "aria-label": "Volver a la ficha resumida"
          },
          h(
            "svg",
            { className: "btn-volver-atras__icon", viewBox: "0 0 20 20", fill: "currentColor" },
            h("path", { fillRule: "evenodd", d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z", clipRule: "evenodd" })
          ),
          h("span", null, "Volver a Ficha")
        ),
        h(
          "button",
          {
            type: "button",
            className: "btn-link-crumb",
            onClick: () => { window.location.hash = "#/alumnos"; }
          },
          "Listado General"
        )
      ),

      h(
        "div",
        { className: "top-bar-right" },
        h(
          "button",
          {
            type: "button",
            className: `btn-refresh-data ${refreshing ? "spinning" : ""}`,
            onClick: () => fetchProfile(true),
            disabled: refreshing,
            title: "Sincronizar información con el servidor"
          },
          h(
            "svg",
            { className: "refresh-icon", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" })
          ),
          h("span", null, refreshing ? "Actualizando..." : "Actualizar")
        )
      )
    ),

    // Mensaje de feedback de acciones (Éxito o Error)
    feedbackMessage
      ? h(
          "div",
          { className: `feedback-toast ${feedbackMessage.type}` },
          h("span", null, feedbackMessage.text),
          h(
            "button",
            {
              type: "button",
              className: "feedback-close-btn",
              onClick: () => setFeedbackMessage(null)
            },
            "✕"
          )
        )
      : null,

    // Hero Banner con información resumida y Pestañas
    h(StudentProfileHero, {
      alumno: datosPersonales,
      escolar: situacionAcademica,
      tabActiva: activeTab,
      onTabChange: (newTab) => setActiveTab(newTab),
      observacionesCount: observaciones.length
    }),

    // Barra de Acciones Principales (Constancia, Pase, Edición, Observación, Libro Matriz)
    h(StudentActionsBar, {
      alumno: datosPersonales,
      permisos: permisosAcciones,
      onOpenCertificateModal: () => setAlumnoRegularOpen(true),
      onOpenTransferModal: () => setSolicitudPaseOpen(true),
      onOpenEditModal: () => setEditModalOpen(true),
      onOpenObservationModal: () => setObservationModalOpen(true),
      onOpenMatrizModal: () => setMatrizModalOpen(true)
    }),

    // Renderizado condicional del contenido según la Pestaña Activa
    h(
      "div",
      { className: "student-profile-tab-viewport" },
      activeTab === "general"
        ? h(StudentPersonalTab, {
            datosPersonales,
            contacto,
            tutores
          })
        : null,

      activeTab === "academico"
        ? h(StudentAcademicTab, {
            situacionAcademica,
            materias
          })
        : null,

      activeTab === "asistencias"
        ? h(StudentAttendanceTab, {
            inasistencias
          })
        : null,

      activeTab === "observaciones"
        ? h(StudentObservationsTab, {
            observaciones,
            condicionesParticulares,
            onOpenObservationModal: () => setObservationModalOpen(true),
            puedeRegistrar: permisosAcciones.puedeRegistrarObservaciones !== false
          })
        : null,

      activeTab === "documentacion"
        ? h(StudentDocumentationTab, {
            alumno: alumnoCompleto,
            escolar: situacionAcademica,
            onOpenAlumnoRegular: () => setAlumnoRegularOpen(true),
            onOpenTramitePase: () => setTramitePaseOpen(true),
            onOpenSolicitudPase: () => setSolicitudPaseOpen(true),
            onOpenSituacionAcademica: () => setSituacionAcademicaOpen(true),
            onOpenRite: () => setRiteOpen(true),
            onOpenPlanillaCalificaciones: () => setPlanillaCalificacionesOpen(true),
            onOpenMatriz: () => setMatrizModalOpen(true)
          })
        : null,


      activeTab === "historial"
        ? h(StudentHistoryTab, {
            historial: historialCambios
          })
        : null
    ),

    // Modales Oficiales Digitalizados
    h(AlumnoRegularModal, {
      abierto: alumnoRegularOpen,
      onCerrar: () => setAlumnoRegularOpen(false),
      alumnoInicial: alumnoCompleto
    }),

    h(TramitePaseModal, {
      abierto: tramitePaseOpen,
      onCerrar: () => setTramitePaseOpen(false),
      alumnoInicial: alumnoCompleto
    }),

    h(SolicitudPaseModal, {
      abierto: solicitudPaseOpen,
      onCerrar: () => setSolicitudPaseOpen(false),
      alumnoInicial: alumnoCompleto
    }),

    h(SituacionAcademicaModal, {
      abierto: situacionAcademicaOpen,
      onCerrar: () => setSituacionAcademicaOpen(false),
      alumnoInicial: alumnoCompleto
    }),

    h(RiteModal, {
      abierto: riteOpen,
      onCerrar: () => setRiteOpen(false),
      alumnoInicial: alumnoCompleto
    }),

    h(PlanillaCalificacionesModal, {
      abierto: planillaCalificacionesOpen,
      onCerrar: () => setPlanillaCalificacionesOpen(false),
      alumnoInicial: alumnoCompleto
    }),

    // Modales de Acciones
    h(StudentCertificateModal, {
      certificado: certificateData,
      isOpen: certificateModalOpen,
      onClose: () => setCertificateModalOpen(false)
    }),

    h(StudentTransferModal, {
      alumno: datosPersonales,
      isOpen: transferModalOpen,
      onClose: () => setTransferModalOpen(false),
      onSubmit: handleTransferSubmit,
      isSubmitting: actionSubmitting
    }),

    h(StudentEditModal, {
      alumno: datosPersonales,
      isOpen: editModalOpen,
      onClose: () => setEditModalOpen(false),
      onSubmit: handleEditSubmit,
      isSubmitting: actionSubmitting
    }),

    h(StudentObservationModal, {
      alumno: datosPersonales,
      isOpen: observationModalOpen,
      onClose: () => setObservationModalOpen(false),
      onSubmit: handleObservationSubmit,
      isSubmitting: actionSubmitting
    }),

    h(AlumnoMatrizModal, {
      abierto: matrizModalOpen,
      onCerrar: () => setMatrizModalOpen(false),
      alumnoInicial: alumnoCompleto
    })
  );
}
