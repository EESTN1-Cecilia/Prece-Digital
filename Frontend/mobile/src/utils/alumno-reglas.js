/* Reglas de presentacion del portal del alumno (funciones puras, sin React).
   La validez real de usuario y contrasena la decide el Backend: estas reglas
   solo adelantan los mismos requisitos para dar un aviso inmediato. */

export const ROL_ALUMNO = "alumno";
export const USUARIO_RE = /^[a-z0-9._-]{4,40}(@alumno\.prece\.local)?$/;

export function esAlumno(roles = []) {
  return Array.isArray(roles) && roles.includes(ROL_ALUMNO);
}

/* Mismos requisitos que Backend/modules/student-portal/catalogo.mjs. */
export function requisitosPassword(password, { dni, usuario } = {}) {
  const valor = typeof password === "string" ? password : "";

  return [
    { clave: "largo", texto: "Al menos 8 caracteres", cumple: valor.length >= 8 && valor.length <= 72 },
    { clave: "mezcla", texto: "Letras y números", cumple: /[a-zA-Z]/.test(valor) && /\d/.test(valor) },
    { clave: "dni", texto: "No contiene tu DNI", cumple: !dni || !valor.includes(dni) },
    {
      clave: "usuario",
      texto: "Distinta de tu usuario",
      cumple: !usuario || valor.toLowerCase() !== String(usuario).toLowerCase()
    }
  ];
}

export function validarUsuario(usuario, { dni } = {}) {
  const valor = String(usuario ?? "").trim().toLowerCase();

  if (!USUARIO_RE.test(valor)) {
    return "Entre 4 y 40 caracteres: letras, números, punto, guion o guion bajo.";
  }

  const parteLocal = valor.split("@")[0];

  if (/^\d+$/.test(parteLocal) && parteLocal !== dni) {
    return "Un usuario solo numérico tiene que ser tu DNI.";
  }

  return null;
}

/* Valida el formulario de primer ingreso / cambio de contrasena. Devuelve
   { campo: mensaje } o null. */
export function validarCambioDePassword(datos, { dni, usuario } = {}) {
  const errores = {};

  if (!datos.passwordActual) {
    errores.passwordActual = "Ingresá tu contraseña actual.";
  }

  if (!requisitosPassword(datos.passwordNueva, { dni, usuario }).every((item) => item.cumple)) {
    errores.passwordNueva = "La contraseña nueva no cumple los requisitos.";
  } else if (datos.passwordNueva === datos.passwordActual) {
    errores.passwordNueva = "Tiene que ser distinta de la actual.";
  }

  if (datos.confirmacion !== datos.passwordNueva) {
    errores.confirmacion = "La confirmación no coincide.";
  }

  return Object.keys(errores).length ? errores : null;
}

/* Ciclo lectivo para la query: solo enteros razonables, nunca texto libre. */
export function anioValido(anio) {
  const numero = Number(anio);
  return Number.isInteger(numero) && numero >= 1990 && numero <= 2200;
}

/* "2026-03-14" o "2026-03-14T10:00:00Z" -> "14/03/2026". Sin Date para no
   correr el dia por la zona horaria. */
export function fechaCorta(valor) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor ?? ""));
  return coincidencia ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}` : "—";
}

export function mayuscula(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : null;
}

/* Tono visual de cada estado de calificacion o justificacion. */
const TONOS = {
  aprobada: "ok",
  justificada: "ok",
  tep: "alerta",
  ted: "peligro",
  debajo_de_6: "peligro",
  no_justificada: "peligro",
  pendiente: "pendiente",
  sin_calificacion: "neutro"
};

export function tonoDeEstado(estado) {
  return TONOS[estado] ?? "neutro";
}

export const MOTIVOS = { salud: "Salud", personal: "Personal", institucional: "Institucional", otra: "Otro" };

export function etiquetaMotivo(motivo) {
  return MOTIVOS[motivo] ?? motivo ?? "—";
}

export function filtrarAsistencias(detalle = [], filtro = "todos") {
  return filtro === "todos" ? detalle : detalle.filter((item) => item.tipo === filtro);
}

export const ESTADOS_A_REVISAR = ["tep", "ted", "debajo_de_6", "pendiente"];

export function filtrarSituacion(filas = [], soloRevisar = true) {
  return soloRevisar ? filas.filter((fila) => ESTADOS_A_REVISAR.includes(fila.estado)) : filas;
}

export function textoTaller(grupoTaller) {
  if (!grupoTaller) {
    return "No corresponde";
  }

  return [grupoTaller.taller, grupoTaller.grupo ? `Grupo ${grupoTaller.grupo}` : null].filter(Boolean).join(" · ") || "No corresponde";
}

export function contarAprobadas(materias = []) {
  return materias.filter((materia) => materia.estadoActual === "aprobada").length;
}
