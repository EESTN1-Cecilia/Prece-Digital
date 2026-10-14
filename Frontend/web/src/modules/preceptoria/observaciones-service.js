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

function aFechaPantalla(valor) {
  const texto = String(valor ?? "").slice(0, 10);
  const [anio, mes, dia] = texto.split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : "-";
}

/* Observacion de la API (GET /api/v1/observations) -> registro de pantalla. */
export function aRegistroVista(observacion) {
  return {
    id: observacion.id,
    alumnoId: observacion.alumnoId,
    alumno: observacion.alumno,
    dni: observacion.dni ?? "",
    tipo: observacion.tipo,
    estado: observacion.estado,
    fecha: aFechaPantalla(observacion.fecha),
    descripcion: observacion.descripcion,
    sector: observacion.sector ?? "",
    responsable: observacion.responsable ?? "",
    creada: aFechaPantalla(observacion.creadoEn),
    modificada: observacion.actualizadoEn && observacion.actualizadoEn !== observacion.creadoEn ? aFechaPantalla(observacion.actualizadoEn) : "-",
    status: observacion.estado
  };
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
