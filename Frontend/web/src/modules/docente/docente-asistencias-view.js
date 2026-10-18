import React from "react";
import AsistenciasView from "../attendance/asistencias-view.js";

/**
 * Vista de Asistencia Oficial para el rol Docente.
 * Reutiliza exactamente el mismo diseño, controles matriciales (días 1..31),
 * estadísticas y funciones del Libro de Asistencia Oficial (Preceptoría/Secretaría),
 * pero acotado a los cursos y materias a cargo del docente y almacenando
 * sus registros de forma independiente.
 */
export default function DocenteAsistenciasView() {
  return React.createElement(AsistenciasView, { modoDocente: true });
}
