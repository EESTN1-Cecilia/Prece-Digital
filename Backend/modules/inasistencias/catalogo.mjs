/* Catalogo del modulo de inasistencias de alumnos: motivos, estados de
   justificacion, periodos academicos, ordenes y reglas centralizadas.

   Todas las reglas de calculo (totales, justificadas, no justificadas,
   pendientes y acumulados) viven aca para que el registro, las consultas, las
   estadisticas y las futuras alertas usen SIEMPRE los mismos criterios. */

import { CURSOS_VALIDOS } from "../students/catalogo.mjs";

export const MOTIVOS = [
  { codigo: "personal", nombre: "Motivo personal", descripcion: "Inasistencia por motivos personales del alumno." },
  { codigo: "salud", nombre: "Motivo de salud", descripcion: "Inasistencia por enfermedad o tratamiento medico." },
  { codigo: "institucional", nombre: "Motivo institucional", descripcion: "Actividad, viaje u otra razon dispuesta por la institucion." },
  { codigo: "otra", nombre: "Otro motivo", descripcion: "Otras causas no contempladas en los motivos anteriores." }
];

export const MOTIVOS_VALIDOS = MOTIVOS.map((motivo) => motivo.codigo);

export const ESTADOS_JUSTIFICACION = [
  { codigo: "no_justificada", descripcion: "La inasistencia no fue justificada." },
  { codigo: "pendiente", descripcion: "La justificacion esta pendiente de resolucion o de la presentacion de documentacion." },
  { codigo: "justificada", descripcion: "La inasistencia fue justificada." }
];

export const ESTADOS_VALIDOS = ESTADOS_JUSTIFICACION.map((estado) => estado.codigo);

/* Estado con el que nace una inasistencia recien registrada. */
export const ESTADO_INICIAL = "no_justificada";

export const CUATRIMESTRES = [1, 2];

/* Periodos lectivos admitidos (anio + cuatrimestre opcional). */
export const ANIOS_LECTIVOS = Array.from({ length: 21 }, (_, i) => 2015 + i);

export const ORDENES_VALIDOS = {
  fecha: { campo: "fecha", direccion: 1 },
  fecha_desc: { campo: "fecha", direccion: -1 },
  creado: { campo: "createdAt", direccion: 1 },
  creado_desc: { campo: "createdAt", direccion: -1 }
};

export function esAnioLectivo(anio) {
  return Number.isInteger(anio) && ANIOS_LECTIVOS.includes(anio);
}

export function esCuatrimestreValido(cuatrimestre) {
  return cuatrimestre === null || cuatrimestre === undefined || CUATRIMESTRES.includes(Number(cuatrimestre));
}

export function etiquetaPeriodo({ anio, cuatrimestre }) {
  return cuatrimestre ? `${anio} - ${cuatrimestre}C` : String(anio);
}

/* Valida que la fecha tenga formato YYYY-MM-DD y sea una fecha real del
   calendario (por ejemplo, rechaza 2026-02-30). */
export function validarFechaFirme(fecha) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return null;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaReal = new Date(Date.UTC(anio, mes - 1, dia));

  if (fechaReal.getUTCFullYear() !== anio || fechaReal.getUTCMonth() !== mes - 1 || fechaReal.getUTCDate() !== dia) {
    return null;
  }

  return fecha;
}

/* ---------------- Reglas centralizadas de calculo ------------------------- */

/* Totales derivados SIEMPRE de los registros almacenados: nunca se guarda un
   valor manual que pueda quedar desactualizado. */
export function calcularTotales(registros) {
  const porEstado = Object.fromEntries(ESTADOS_VALIDOS.map((estado) => [estado, 0]));
  const porMotivo = Object.fromEntries(MOTIVOS_VALIDOS.map((motivo) => [motivo, 0]));

  for (const registro of registros) {
    if (porEstado[registro.estadoJustificacion] !== undefined) {
      porEstado[registro.estadoJustificacion] += 1;
    }

    if (porMotivo[registro.motivo] !== undefined) {
      porMotivo[registro.motivo] += 1;
    }
  }

  return {
    total: registros.length,
    justificadas: porEstado.justificada,
    noJustificadas: porEstado.no_justificada,
    pendientes: porEstado.pendiente,
    porEstado,
    porMotivo
  };
}

export function calcularTotalesPorDivision(registros) {
  const porDivision = new Map();

  for (const registro of registros) {
    const clave = `${registro.curso}-${registro.division}`;
    const actual = porDivision.get(clave) ?? { curso: registro.curso, division: registro.division, total: 0, justificadas: 0, noJustificadas: 0, pendientes: 0 };

    actual.total += 1;
    actual[registro.estadoJustificacion] += 1;
    porDivision.set(clave, actual);
  }

  return [...porDivision.values()].sort((a, b) => a.curso - b.curso || a.division.localeCompare(b.division));
}

export function calcularTotalesPorCuatrimestre(registros) {
  const porCuatrimestre = new Map();

  for (const registro of registros) {
    const clave = `${registro.anio}-${registro.cuatrimestre ?? 0}`;
    const actual = porCuatrimestre.get(clave) ?? { anio: registro.anio, cuatrimestre: registro.cuatrimestre, total: 0, justificadas: 0, noJustificadas: 0, pendientes: 0 };

    actual.total += 1;
    actual[registro.estadoJustificacion] += 1;
    porCuatrimestre.set(clave, actual);
  }

  return [...porCuatrimestre.values()].sort((a, b) => a.anio - b.anio || (a.cuatrimestre ?? 0) - (b.cuatrimestre ?? 0));
}

/* Reglas institucionales: limites y condiciones que la escuela pueda definir.
   Todo calculo o alerta debe pasar por aca para que un futuro cambio se aplique
   en un solo lugar. Por ahora no hay limites definidos (null). */
export const REGLAS_INSTITUCIONALES = {
  topeParcialNoJustificadas: null,
  topeParcialTotal: null
};

export function evaluarReglaDeTope(totales, campo) {
  const tope = REGLAS_INSTITUCIONALES[campo];

  if (!tope) {
    return { aplica: false, superado: false, limite: null, actual: totales.total };
  }

  const actual = totales[campo] ?? totales.total;

  return { aplica: true, limite: tope, actual, superado: actual > tope };
}

export { CURSOS_VALIDOS };