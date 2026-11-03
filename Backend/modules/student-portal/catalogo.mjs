/* Reglas centralizadas del portal del alumno.

   Todo lo que decide como se calcula un numero que ve el alumno vive aca, para
   que el panel, cada seccion y la verificacion integral usen siempre el mismo
   criterio. Ninguna regla recalcula una calificacion oficial: solo clasifica lo
   que el docente registro. */

import { CONCEPTOS_VALIDOS, ESCALA, interpretarValor } from "../grades/catalogo.mjs";
import { DNI_RE } from "../students/catalogo.mjs";

export { DNI_RE };

/* Ciclo lectivo vigente: el mismo criterio que usa el resto del backend
   (matricula y altas con fecha del anio en curso). */
export function cicloLectivoActual(fecha = new Date()) {
  return fecha.getFullYear();
}

/* ---------------- Credenciales ----------------------------------------------- */

/* Usuario inicial del alumno: con forma de correo, como el del personal, pero
   armado con los datos del legajo: nombre.apellido@alumno.prece.local
   (primer nombre y primer apellido, sin tildes ni espacios). La contraseña
   inicial es el DNI. No es una casilla de correo real: solo identifica la cuenta. */
export const DOMINIO_ALUMNOS = "alumno.prece.local";

function parteDeUsuario(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-z0-9]/g, "");
}

export function usuarioBase(alumno) {
  const nombre = parteDeUsuario(alumno.nombre) || "alumno";
  const apellido = parteDeUsuario(alumno.apellido) || "sinapellido";
  return `${nombre}.${apellido}`;
}

/* Usuario inicial de cada alumno del padron (Map alumnoId -> usuario). Si dos
   alumnos comparten nombre y apellido, ninguno queda con el usuario "pelado":
   a ambos se les agregan los ultimos 3 digitos del DNI (y el DNI completo si
   aun asi coinciden), para que nadie entre con la cuenta de otro. */
export function usuariosIniciales(alumnos = []) {
  const porBase = new Map();

  for (const alumno of alumnos) {
    const base = usuarioBase(alumno);
    if (!porBase.has(base)) porBase.set(base, []);
    porBase.get(base).push(alumno);
  }

  const resultado = new Map();

  for (const [base, grupo] of porBase) {
    if (grupo.length === 1) {
      resultado.set(grupo[0].id, `${base}@${DOMINIO_ALUMNOS}`);
      continue;
    }

    const sufijos = grupo.map((alumno) => String(alumno.dni ?? "").slice(-3));
    const repetidos = sufijos.filter((sufijo, indice) => sufijos.indexOf(sufijo) !== indice);

    grupo.forEach((alumno, indice) => {
      const sufijo = repetidos.includes(sufijos[indice]) ? String(alumno.dni ?? alumno.id) : sufijos[indice];
      resultado.set(alumno.id, `${base}.${sufijo}@${DOMINIO_ALUMNOS}`);
    });
  }

  return resultado;
}

/* Usuario elegido por el alumno: minusculas, numeros, punto, guion y guion
   bajo, con o sin el dominio de alumnos. Un usuario solo numerico podria
   hacerse pasar por el DNI de otro alumno, asi que solo se acepta si es el DNI
   propio. */
export const USUARIO_RE = /^[a-z0-9._-]{4,40}(@alumno\.prece\.local)?$/;
export const PASSWORD_MINIMO = 8;
export const PASSWORD_MAXIMO = 72; // limite de bcrypt

export function validarNuevoUsuario(usuario, { dniPropio }) {
  const valor = String(usuario ?? "").trim().toLowerCase();

  if (!USUARIO_RE.test(valor)) {
    return { error: `El usuario debe tener entre 4 y 40 caracteres (letras, números, punto, guion o guion bajo), con o sin @${DOMINIO_ALUMNOS}.` };
  }

  if (/^\d+$/.test(valor.split("@")[0]) && valor.split("@")[0] !== dniPropio) {
    return { error: "Un usuario solo numérico tiene que ser tu propio DNI." };
  }

  return { valor };
}

/* Contraseña segura: largo minimo, letras y numeros, y nunca el DNI ni el usuario. */
export function validarNuevaPassword(password, { dni, usuario }) {
  const valor = typeof password === "string" ? password : "";
  const errores = [];

  if (valor.length < PASSWORD_MINIMO) {
    errores.push(`Debe tener al menos ${PASSWORD_MINIMO} caracteres.`);
  }

  if (valor.length > PASSWORD_MAXIMO) {
    errores.push(`No puede superar los ${PASSWORD_MAXIMO} caracteres.`);
  }

  if (!/[a-zA-Z]/.test(valor) || !/\d/.test(valor)) {
    errores.push("Debe combinar letras y números.");
  }

  if (dni && valor.includes(dni)) {
    errores.push("No puede contener tu DNI.");
  }

  if (usuario && valor.toLowerCase() === String(usuario).toLowerCase()) {
    errores.push("No puede ser igual a tu usuario.");
  }

  return errores;
}

/* ---------------- Calificaciones --------------------------------------------- */

/* Estados con los que el alumno ve cada materia o calificacion. */
export const ESTADOS_CALIFICACION = {
  aprobada: { valor: "aprobada", etiqueta: "Aprobada" },
  tep: { valor: "tep", etiqueta: "TEP" },
  ted: { valor: "ted", etiqueta: "TED" },
  debajoDe6: { valor: "debajo_de_6", etiqueta: "Nota inferior a 6" },
  pendiente: { valor: "pendiente", etiqueta: "Pendiente de aprobación" },
  sinCalificacion: { valor: "sin_calificacion", etiqueta: "Sin calificación" }
};

/* Clasifica un valor tal como lo cargo el docente, con la escala vigente del
   modulo de calificaciones (aprobacion desde ESCALA.aprobacion y conceptos
   TEA/TEP/TED). No redondea ni promedia. */
export function clasificarValor(valor) {
  const info = interpretarValor(valor);

  if (!info) {
    return ESTADOS_CALIFICACION.sinCalificacion.valor;
  }

  if (info.tipoValor === "conceptual") {
    if (info.concepto === "TEP") return ESTADOS_CALIFICACION.tep.valor;
    if (info.concepto === "TED") return ESTADOS_CALIFICACION.ted.valor;
    return ESTADOS_CALIFICACION.aprobada.valor; // TEA
  }

  return info.nota >= ESCALA.aprobacion ? ESTADOS_CALIFICACION.aprobada.valor : ESTADOS_CALIFICACION.debajoDe6.valor;
}

export function etiquetaEstado(valor) {
  return Object.values(ESTADOS_CALIFICACION).find((estado) => estado.valor === valor)?.etiqueta ?? valor;
}

/* Periodos del boletin. `null` es el registro anual (calificacion final). */
export const PERIODOS_BOLETIN = [
  { cuatrimestre: 1, clave: "c1", etiqueta: "1° cuatrimestre" },
  { cuatrimestre: 2, clave: "c2", etiqueta: "2° cuatrimestre" },
  { cuatrimestre: null, clave: "final", etiqueta: "Calificación final" }
];

export function etiquetaCuatrimestre(cuatrimestre) {
  return PERIODOS_BOLETIN.find((periodo) => periodo.cuatrimestre === (cuatrimestre ?? null))?.etiqueta ?? "Anual";
}

/* Resultado de un periodo: la ULTIMA calificacion registrada en ese periodo
   (por fecha y, a igual fecha, por momento de carga). Asi un recuperatorio
   posterior reemplaza a la nota que recupera, sin promediar ni redondear. */
export function ultimaCalificacion(calificaciones = []) {
  return [...calificaciones].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return String(b.creadoEn ?? "").localeCompare(String(a.creadoEn ?? ""));
  })[0] ?? null;
}

export { CONCEPTOS_VALIDOS, ESCALA };

/* ---------------- Asistencia ------------------------------------------------- */

/* Tipos con los que el alumno ve su asistencia. Las llegadas tarde y los
   retiros anticipados NO se suman como ausentes completos: el backend no tiene
   configurada ninguna equivalencia institucional (por ejemplo "3 tardes = 1
   falta"), asi que se informan por separado y sin convertir. */
export const TIPOS_ASISTENCIA = {
  ausente: { valor: "ausente", etiqueta: "Ausente completo" },
  parcial: { valor: "ausente_parcial", etiqueta: "Ausente parcial (retiro anticipado)" },
  tarde: { valor: "tarde", etiqueta: "Llegada tarde" }
};

export const JUSTIFICACIONES = {
  justificada: "Justificada",
  no_justificada: "Injustificada",
  pendiente: "Justificación pendiente"
};

export const REGLA_COMPUTO_ASISTENCIA =
  "El total de ausentes cuenta solo ausencias de jornada completa. Las llegadas tarde y los retiros anticipados se informan aparte y no se convierten en faltas, porque el sistema no tiene cargada una equivalencia institucional.";
