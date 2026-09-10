export const DEFAULT_OBSERVATION_TYPES = [
  "Académica",
  "Convivencia",
  "Asistencia",
  "Administrativa"
];

export const DEFAULT_OBSERVATION_SECTORS = [
  "Preceptoría",
  "Coordinación",
  "Equipo de Orientación (EOE)",
  "Tutoría",
  "Biblioteca",
  "Secretaría"
];

export function getDefaultObservationForm(initialValues = {}) {
  const base = {
    alumno: "",
    tipo: "",
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "",
    sector: "",
    responsable: "",
    estado: ""
  };

  return {
    ...base,
    ...initialValues,
    descripcion: String(initialValues.descripcion || "").slice(0, 500)
  };
}

export function resolveResponsibleFromUser(user, useAuthenticatedUserAsResponsible = true) {
  if (!useAuthenticatedUserAsResponsible || !user) {
    return "";
  }

  return user.rolNombre || user.nombre || "";
}

export function getStoredObservations() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem("prece_observaciones_registradas_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveObservationRecords(observaciones) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    "prece_observaciones_registradas_v1",
    JSON.stringify(Array.isArray(observaciones) ? observaciones : [])
  );
}

export function buildObservationRecord(data) {
  const alumno = String(data.alumno || "").trim();
  const tipo = String(data.tipo || "").trim();
  const fecha = String(data.fecha || new Date().toISOString().slice(0, 10)).trim();
  const descripcion = String(data.descripcion || "").trim().slice(0, 500);
  const sector = String(data.sector || "").trim();
  const responsable = String(data.responsable || "").trim();
  const estado = String(data.estado || "").trim();

  const id = data.id || `OBS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    alumno,
    tipo,
    fecha,
    descripcion,
    sector,
    responsable,
    estado,
    creada: new Date().toISOString().slice(0, 10),
    modificada: "-",
    dni: data.dni || "",
    status: estado || "Activa"
  };
}
