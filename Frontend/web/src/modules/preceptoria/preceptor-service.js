import { pedir } from "../../services/http.js";

const PREFIJO = "/api/v1/preceptor";

export const ESTADOS_ASISTENCIA = [
  { valor: "presente", tecla: "P", etiqueta: "Presente", corto: "P" },
  { valor: "ausente", tecla: "A", etiqueta: "Ausente", corto: "A" },
  { valor: "tarde", tecla: "T", etiqueta: "Tarde", corto: "T" }
];

export const ESTADO_POR_TECLA = {
  p: "presente",
  a: "ausente",
  t: "tarde"
};

export function estadoDesdeTecla(tecla) {
  return ESTADO_POR_TECLA[String(tecla ?? "").trim().toLowerCase()] ?? null;
}

export function etiquetaEstado(estado) {
  return ESTADOS_ASISTENCIA.find((item) => item.valor === estado)?.etiqueta ?? "Sin registrar";
}

export function calcularResumen(alumnos = []) {
  const resumen = { total: alumnos.length, presentes: 0, ausentes: 0, tarde: 0, sinRegistrar: 0 };

  for (const alumno of alumnos) {
    const estado = alumno?.asistencia?.estado;
    if (estado === "presente") resumen.presentes++;
    else if (estado === "ausente") resumen.ausentes++;
    else if (estado === "tarde") resumen.tarde++;
    else resumen.sinRegistrar++;
  }

  return resumen;
}

export function calcularResumenAulas(aulas = []) {
  return {
    total: aulas.length,
    ocupadas: aulas.filter((aula) => aula.estado === "ocupada").length,
    libres: aulas.filter((aula) => aula.estado === "libre").length,
    mantenimiento: aulas.filter((aula) => aula.estado === "mantenimiento").length
  };
}

export function agruparAulasPorPlanta(aulas = []) {
  const grupos = new Map();

  for (const aula of aulas) {
    const planta = aula.planta || "Sin piso";
    if (!grupos.has(planta)) grupos.set(planta, []);
    grupos.get(planta).push(aula);
  }

  return [...grupos.entries()].map(([planta, items]) => ({ planta, aulas: items }));
}

export function fechaDeHoy() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function horaActual() {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
}

export function formatearFechaLarga(fecha) {
  if (!fecha) return "";
  const [anio, mes, dia] = String(fecha).split("-").map(Number);
  const fechaObjeto = new Date(anio, mes - 1, dia);

  if (Number.isNaN(fechaObjeto.getTime())) return String(fecha);

  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(fechaObjeto);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatearFechaCorta(fecha) {
  if (!fecha) return "-";
  const [anio, mes, dia] = String(fecha).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : String(fecha);
}

export function claseDeAula(aula) {
  return aula?.claseActual ?? aula?.proximaClase ?? null;
}

export function textoAula(aula) {
  if (aula.estado === "mantenimiento") return "Fuera de servicio";
  if (aula.estado === "ocupada" && aula.claseActual) {
    return `${aula.claseActual.materia || "Clase"} - ${aula.claseActual.curso || "Curso"}`;
  }
  if (aula.proximaClase) {
    return `Proxima: ${aula.proximaClase.desde} - ${aula.proximaClase.materia || "Clase"}`;
  }
  return "Disponible";
}

function consulta(params) {
  const search = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor != null && String(valor).trim() !== "") search.set(clave, valor);
  }
  const texto = search.toString();
  return texto ? `?${texto}` : "";
}

export const PreceptorService = {
  async getAlumnosCurso(cursoId, fecha) {
    return pedir(`${PREFIJO}/curso/${encodeURIComponent(cursoId)}/alumnos${consulta({ fecha })}`, {
      crudo: true,
      recurso: "el curso solicitado"
    });
  },

  async getEstadoAulas({ fecha, hora } = {}) {
    return pedir(`${PREFIJO}/estado-aulas${consulta({ fecha, hora })}`, {
      crudo: true,
      recurso: "el estado de aulas"
    });
  },

  async registrarAsistencia({ cursoId, fecha, alumnoId, estado, observaciones }) {
    return pedir(`${PREFIJO}/asistencia`, {
      method: "POST",
      crudo: true,
      body: JSON.stringify({ cursoId, fecha, alumnoId, estado, observaciones })
    });
  },

  async registrarAsistenciaMasiva({ cursoId, fecha, registros }) {
    return pedir(`${PREFIJO}/asistencia`, {
      method: "POST",
      crudo: true,
      body: JSON.stringify({ cursoId, fecha, registros })
    });
  }
};
