/* Catalogo del modulo de alertas por ausencia consecutiva.

   Este archivo es la unica fuente de verdad de:

   - que es una inasistencia y que tipos admite,
   - que condiciones pueden disparar una alerta,
   - los estados por los que pasa una alerta,
   - la configuracion institucional por defecto (el umbral de la escuela parte
     de aca y se puede ajustar por escuela),
   - los helpers de fecha y dia lectivo que usa el motor de deteccion.

   Agregar un tipo de inasistencia, una condicion o un estado nuevo es agregar
   una entrada en estas listas: el motor, las validaciones y la API los toman de
   aca. */

/* ---------------- Inasistencias ------------------------------------------------ */

export const TIPOS_INASISTENCIA = [
  { valor: "ausente", descripcion: "El alumno no asistio a la escuela", computa: true },
  { valor: "tarde", descripcion: "El alumno ingreso fuera del horario de entrada", computa: true },
  { valor: "media_falta", descripcion: "El alumno retiro antes de terminar la jornada", computa: true }
];

export const TIPOS_INASISTENCIA_VALIDOS = TIPOS_INASISTENCIA.map((tipo) => tipo.valor);

export function descripcionDeTipo(tipo) {
  return TIPOS_INASISTENCIA.find((item) => item.valor === tipo)?.descripcion ?? null;
}

/* ---------------- Condiciones -------------------------------------------------- */

/* Cada condicion describe la regla que se cumplio. La evaluacion es siempre
   server-side: el cliente nunca envia la condicion ni el resultado. */
export const CONDICIONES = [
  {
    valor: "inasistencias_consecutivas",
    nombre: "Inasistencias consecutivas",
    descripcion: "El alumno acumulo la cantidad de inasistencias consecutivas exigida por la escuela."
  }
];

export const CONDICIONES_VALIDAS = CONDICIONES.map((condicion) => condicion.valor);

export function descripcionDeCondicion(condicion) {
  return CONDICIONES.find((item) => item.valor === condicion)?.descripcion ?? null;
}

/* ---------------- Estados de la alerta ---------------------------------------- */

/* `descartada` es el unico estado que libera la clave del periodo: si la
   institucion descarta una alerta como falso positivo, una nueva evaluacion
   puede volver a generar otra para el mismo periodo. */
export const ESTADOS_ALERTA = [
  { valor: "activa", descripcion: "La situacion fue detectada y notificada.", terminal: false },
  { valor: "en_revision", descripcion: "La institucion esta evaluando la situacion.", terminal: false },
  { valor: "resuelta", descripcion: "La situacion fue intervenida.", terminal: true },
  { valor: "descartada", descripcion: "La alerta se descarto por ser un falso positivo.", terminal: true }
];

export const ESTADOS_ALERTA_VALIDOS = ESTADOS_ALERTA.map((estado) => estado.valor);

export function descripcionDeEstado(estado) {
  return ESTADOS_ALERTA.find((item) => item.valor === estado)?.descripcion ?? null;
}

/* Transiciones permitidas. Lo que no esta aca no se puede hacer, y queda
   registrado en la auditoria del modulo. */
export const TRANSICIONES_ALERTA = {
  activa: ["en_revision", "resuelta", "descartada"],
  en_revision: ["activa", "resuelta", "descartada"],
  resuelta: [],
  descartada: []
};

export function transicionPermitida(desde, hacia) {
  return (TRANSICIONES_ALERTA[desde] ?? []).includes(hacia);
}

/* ---------------- Prioridades y canales ---------------------------------------- */

export const PRIORIDADES = ["baja", "normal", "alta"];

export const CANALES_NOTIFICACION = [
  { valor: "notificacion_interna", descripcion: "Notificacion dentro del sistema." },
  { valor: "correo", descripcion: "Correo electronico." },
  { valor: "sms", descripcion: "Mensaje de texto." },
  { valor: "app", descripcion: "Aplicacion movil del docente." }
];

export const CANALES_NOTIFICACION_VALIDOS = CANALES_NOTIFICACION.map((canal) => canal.valor);

/* ---------------- Configuracion por defecto ------------------------------------ */

export const DIAS_CONSECUTIVOS_MINIMO = 1;
export const DIAS_CONSECUTIVOS_MAXIMO = 30;

export const MOTOR_DE_ALERTA = "attendance-alerts";

/* La institucion fija la regla: 3 inasistencias en dias lectivos corridos. Las
   justificadas no cuentan para la racha pero la cortan, porque lo que interesa es
   que el alumno retome la asistencia. */
export const CONFIGURACION_POR_DEFECTO = {
  habilitada: true,
  diasConsecutivos: 3,
  tiposContabilizados: ["ausente"],
  justificadasGeneranAlerta: false,
  justificadasReinicianRacha: true,
  prioridadNotificacion: "alta",
  canales: ["notificacion_interna"],
  diasNoHabiles: [],
  umbralAlertaInasistencias: 15
};

export function configuracionPorDefecto(escuelaId) {
  return { ...CONFIGURACION_POR_DEFECTO, escuelaId, esPorDefecto: true };
}

/* Completa lo que falte con el valor por defecto del sistema, para que un
   guardado parcial de configuracion nunca deje un campo indefinido. */
export function completarConfiguracion(parcial, escuelaId) {
  return {
    ...CONFIGURACION_POR_DEFECTO,
    ...(parcial ?? {}),
    escuelaId,
    tiposContabilizados: [...(parcial?.tiposContabilizados ?? CONFIGURACION_POR_DEFECTO.tiposContabilizados)],
    canales: [...(parcial?.canales ?? CONFIGURACION_POR_DEFECTO.canales)],
    diasNoHabiles: [...(parcial?.diasNoHabiles ?? [])],
    esPorDefecto: false
  };
}

/* ---------------- Fechas y dias lectivos --------------------------------------- */

export const FECHA_CORTA = /^\d{4}-\d{2}-\d{2}$/;

export function esFecha(valor) {
  if (typeof valor !== "string" || !FECHA_CORTA.test(valor)) {
    return false;
  }

  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  );
}

export function normalizarFecha(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const corta = valor.slice(0, 10);

  return esFecha(corta) ? corta : null;
}

export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export function sumarDias(fecha, dias) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const desplazada = new Date(Date.UTC(anio, mes - 1, dia + dias));

  return desplazada.toISOString().slice(0, 10);
}

/* Sabado y domingo no son dias lectivos, y tampoco los que la escuela declara
   como no habiles (feriados, feriados puente, dias decianato). */
export function esDiaLectivo(fecha, diasNoHabiles = []) {
  if (!esFecha(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();

  if (diaSemana === 0 || diaSemana === 6) {
    return false;
  }

  return !diasNoHabiles.includes(fecha);
}

/* Siguiente dia lectivo a una fecha dada. `tope` evita el bucle infinito si
   `diasNoHabiles` dejara la semana entera sin dias utiles. */
export function siguienteDiaLectivo(fecha, diasNoHabiles = [], tope = 40) {
  let cursor = fecha;

  for (let avance = 0; avance < tope; avance += 1) {
    cursor = sumarDias(cursor, 1);

    if (esDiaLectivo(cursor, diasNoHabiles)) {
      return cursor;
    }
  }

  return null;
}

/* `desde` y `hasta` son dias lectivos consecutivos a falta de un dia no habil en
   el medio. Es lo que define que las inasistencias formen una racha. */
export function sonDiasLectivosConsecutivos(desde, hasta, diasNoHabiles = []) {
  if (desde === hasta) {
    return esDiaLectivo(desde, diasNoHabiles);
  }

  const siguiente = siguienteDiaLectivo(desde, diasNoHabiles);

  return siguiente !== null && siguiente === hasta;
}

/* ---------------- Normalizacion de texto ---------------------------------------- */

export function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
