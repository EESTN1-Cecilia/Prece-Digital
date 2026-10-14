import React, { useState, useEffect, useCallback } from "react";
import { h } from "../../layouts/site-layout.js";
import { LoadingState, EmptyState, ErrorState, AccessDeniedState } from "../../components/common/state-handlers.js";
import { StudentSummary } from "./components/student-summary.js";
import { StudentsService } from "./students-service.js";

/**
 * AlumnoResumenView: Vista del perfil resumido del alumno (Ficha de Alumno)
 * Maneja los estados Loading, Alumno Encontrado, Información Incompleta, Inexistente, Error y Acceso Denegado (401/403).
 */
export default function AlumnoResumenView({ id }) {
  const [studentId, setStudentId] = useState(id);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Extraer el ID desde la URL si no viene por props
  useEffect(() => {
    if (!id) {
      const hash = window.location.hash || "";
      const match = hash.match(/#\/alumnos\/([^/?]+)/);
      if (match && match[1] && match[1] !== "cargar" && match[1] !== "nuevo" && match[1] !== "buscar") {
        setStudentId(match[1]);
      }
    } else {
      setStudentId(id);
    }
  }, [id]);

  // Carga de la información del alumno desde la API
  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (!studentId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    setAccessDenied(false);
    setNotFound(false);

    try {
      const res = await StudentsService.getAlumnoSummary(studentId);
      if (res && res.data) {
        setResumen(res.data);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      const status = err.status || err.statusCode || (err.message?.includes("401") ? 401 : err.message?.includes("403") ? 403 : err.message?.includes("404") ? 404 : null);

      if (status === 401 || status === 403) {
        setAccessDenied(true);
      } else if (status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || "Ocurrió un error al obtener la ficha del alumno desde el servidor.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return h(
    "section",
    { className: "welcome-panel alumno-resumen-panel" },

    // 1. Estado de Carga
    loading
      ? h(LoadingState, { mensaje: "Cargando ficha resumida del alumno..." })
      : null,

    // 2. Estado de Acceso Denegado (401 / 403)
    !loading && accessDenied
      ? h(AccessDeniedState, { rolRequerido: "Secretaría / Preceptoría / Directivo" })
      : null,

    // 3. Estado de Alumno Inexistente (404)
    !loading && !accessDenied && notFound
      ? h(EmptyState, {
          mensaje: `El alumno con identificador "${studentId}" no existe o ya no se encuentra disponible.`,
          action: h(
            "button",
            {
              type: "button",
              className: "action-button action-button--primary",
              onClick: () => {
                window.location.hash = "#/alumnos";
              }
            },
            "Volver al Listado de Alumnos"
          )
        })
      : null,

    // 4. Estado de Error (con botón de reintentar)
    !loading && !accessDenied && !notFound && error
      ? h(ErrorState, {
          mensaje: error,
          onRetry: () => fetchSummary(false)
        })
      : null,

    // 5. Estado Alumno Encontrado (Renderizado completo)
    !loading && !accessDenied && !notFound && !error && resumen
      ? h(StudentSummary, {
          resumen,
          onRefresh: () => fetchSummary(true),
          refreshing,
          onBack: () => {
            window.location.hash = "#/alumnos";
          }
        })
      : null
  );
}
