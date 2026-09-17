import React from "react";
import { h } from "../../layouts/site-layout.js";

// Re-exportar datos y componentes compartidos
export { ALUMNOS_DEMO } from "./document-helpers.js";

// 1. Constancias y Certificados de Alumnos (módulo students/components)
export { SituacionAcademicaModal } from "../students/components/constancia-situacion-academica-modal.js";
export { AlumnoRegularModal } from "../students/components/constancia-alumno-regular-modal.js";
export { TramitePaseModal } from "../students/components/certificado-pase-modal.js";

// 2. Documentos y Planillas Institucionales (módulo documents)
export { RiteModal } from "./rite-modal.js";
export { PlanillaCalificacionesModal } from "./planilla-calificaciones-modal.js";

import { SituacionAcademicaModal } from "../students/components/constancia-situacion-academica-modal.js";
import { AlumnoRegularModal } from "../students/components/constancia-alumno-regular-modal.js";
import { TramitePaseModal } from "../students/components/certificado-pase-modal.js";
import { RiteModal } from "./rite-modal.js";
import { PlanillaCalificacionesModal } from "./planilla-calificaciones-modal.js";

// ============================================================================
// GESTOR CENTRAL DE MODALES DE DOCUMENTOS
// ============================================================================
export function DocumentosManagerModal({ modalActivo, onCerrar, alumnoInicial = null }) {
  if (!modalActivo) return null;

  switch (modalActivo) {
    case "situacion_academica":
      return h(SituacionAcademicaModal, { abierto: true, onCerrar, alumnoInicial });
    case "rite":
      return h(RiteModal, { abierto: true, onCerrar, alumnoInicial });
    case "planilla_calificaciones":
      return h(PlanillaCalificacionesModal, { abierto: true, onCerrar, alumnoInicial });
    case "alumno_regular":
      return h(AlumnoRegularModal, { abierto: true, onCerrar, alumnoInicial });
    case "tramite_pase":
      return h(TramitePaseModal, { abierto: true, onCerrar, alumnoInicial });
    default:
      return null;
  }
}

export default DocumentosManagerModal;
