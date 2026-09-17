import { h } from "../../../layouts/site-layout.js";

/**
 * StatusBadge: Badge visual de estado del alumno (Activo, Inactivo, Pase pendiente)
 */
export function StatusBadge({ status, label }) {
  const norm = (status || "").toLowerCase();
  let tone = "info";

  if (norm.includes("activo") || norm.includes("regular") || norm.includes("aprobado")) {
    tone = "success";
  } else if (norm.includes("pase") || norm.includes("pendiente") || norm.includes("seguimiento") || norm.includes("riesgo")) {
    tone = "warning";
  } else if (norm.includes("inactivo") || norm.includes("libre") || norm.includes("desaprobado") || norm.includes("crítico")) {
    tone = "danger";
  }

  return h(
    "span",
    { className: `status-badge status-badge--${tone}` },
    label || status || "No especificado"
  );
}

/**
 * ConditionBadge: Badge para la condición académica (Regular, Libre)
 */
export function ConditionBadge({ condicion }) {
  const isRegular = (condicion || "").toLowerCase() === "regular";
  return h(
    "span",
    { className: `condition-badge ${isRegular ? "condition-badge--regular" : "condition-badge--libre"}` },
    condicion || "Regular"
  );
}

/**
 * AlertBadge: Badge de prioridad para las alertas (Urgente, Alta, Media, Baja)
 */
export function AlertBadge({ prioridad }) {
  const p = (prioridad || "").toLowerCase();
  let modifier = "info";
  let text = "Informativa";

  if (p === "urgente" || p === "critica") {
    modifier = "urgent";
    text = "Urgente";
  } else if (p === "alta") {
    modifier = "high";
    text = "Alta prioridad";
  } else if (p === "media") {
    modifier = "medium";
    text = "Atención requerida";
  } else {
    modifier = "low";
    text = "Informativa";
  }

  return h(
    "span",
    { className: `alert-priority-badge alert-priority-badge--${modifier}` },
    text
  );
}
