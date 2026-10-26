/* Reglas puras del modulo de docentes: formulario, validacion previa al envio,
   orden del listado y presentacion. No dependen de React, asi que se prueban
   con node --test (docentes-validacion.test.mjs).

   Las expresiones replican las del backend (Backend/modules/teachers/catalogo.mjs).
   El backend vuelve a validar todo: esto solo evita un viaje cuando el error
   es evidente. */

export const DOCUMENTO_RE = /^[0-9]{6,12}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TELEFONO_RE = /^[0-9()+\-.\s]{6,20}$/;

export const LIMITES = {
  nombre: 100,
  apellido: 100,
  titulo: 150,
  especialidad: 100,
  especialidades: 20
};

export const VISTAS = { lista: "lista", tarjetas: "tarjetas" };

export function formularioVacio() {
  return {
    nombre: "",
    apellido: "",
    tipoDocumento: "dni",
    documento: "",
    email: "",
    telefono: "",
    area: "",
    titulo: "",
    especialidades: "",
    estado: "activo"
  };
}

/* Carga un docente existente en el formulario de edicion. */
export function desdeDocente(docente = {}) {
  return {
    nombre: docente.nombre ?? "",
    apellido: docente.apellido ?? "",
    tipoDocumento: docente.tipoDocumento ?? "dni",
    documento: docente.documento ?? "",
    email: docente.email ?? "",
    telefono: docente.telefono ?? "",
    area: docente.area ?? "",
    titulo: docente.titulo ?? "",
    especialidades: (docente.especialidades ?? []).join(", "),
    estado: docente.estado ?? "activo"
  };
}

export function formularioSucio(form, original = formularioVacio()) {
  return Object.keys(original).some((campo) => String(form[campo] ?? "").trim() !== String(original[campo] ?? "").trim());
}

/* Las especialidades se escriben separadas por coma. */
export function separarEspecialidades(texto) {
  return [...new Set(String(texto ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}

/* Devuelve { errores, datos }. `datos` es el cuerpo listo para la API; en
   edicion solo lleva los campos que cambiaron respecto de `original`. */
export function validarDocente(form, { original = null, areasValidas = [] } = {}) {
  const errores = {};
  const limpio = (campo) => String(form[campo] ?? "").trim();

  const nombre = limpio("nombre");
  const apellido = limpio("apellido");
  const documento = limpio("documento");
  const email = limpio("email");
  const telefono = limpio("telefono");
  const titulo = limpio("titulo");
  const area = limpio("area");
  const especialidades = separarEspecialidades(form.especialidades);

  if (!nombre) errores.nombre = "El nombre es obligatorio.";
  else if (nombre.length > LIMITES.nombre) errores.nombre = `El nombre no puede superar los ${LIMITES.nombre} caracteres.`;

  if (!apellido) errores.apellido = "El apellido es obligatorio.";
  else if (apellido.length > LIMITES.apellido) errores.apellido = `El apellido no puede superar los ${LIMITES.apellido} caracteres.`;

  if (!documento) errores.documento = "El documento es obligatorio.";
  else if (!DOCUMENTO_RE.test(documento)) errores.documento = "El documento debe tener entre 6 y 12 dígitos, sin puntos.";

  if (!email) errores.email = "El correo electrónico es obligatorio.";
  else if (!EMAIL_RE.test(email)) errores.email = "El correo electrónico no tiene un formato válido.";

  if (telefono && !TELEFONO_RE.test(telefono)) errores.telefono = "El teléfono no tiene un formato válido.";

  if (titulo.length > LIMITES.titulo) errores.titulo = `El título no puede superar los ${LIMITES.titulo} caracteres.`;

  if (area && areasValidas.length && !areasValidas.includes(area)) errores.area = "Elegí un área del catálogo institucional.";

  if (especialidades.length > LIMITES.especialidades) {
    errores.especialidades = `No se pueden cargar más de ${LIMITES.especialidades} especialidades.`;
  } else if (especialidades.some((item) => item.length > LIMITES.especialidad)) {
    errores.especialidades = `Cada especialidad puede tener hasta ${LIMITES.especialidad} caracteres.`;
  }

  const completos = {
    nombre,
    apellido,
    tipoDocumento: form.tipoDocumento || "dni",
    documento,
    email,
    telefono: telefono || null,
    area: area || null,
    titulo: titulo || null,
    especialidades,
    estado: form.estado || "activo"
  };

  if (!original) {
    return { errores, datos: completos };
  }

  const base = validarDocente(original, {}).datos;
  const datos = Object.fromEntries(
    Object.entries(completos).filter(([campo, valor]) => JSON.stringify(valor) !== JSON.stringify(base[campo]))
  );

  return { errores, datos };
}

/* Traduce el orden de la tabla ({ columna, direccion }) al parametro `orden`
   del backend. Las columnas sin orden en el servidor caen al orden por defecto. */
const ORDEN_POR_COLUMNA = {
  docente: "apellido",
  documento: "documento",
  email: "email",
  area: "area",
  estado: "estado"
};

export function ordenAParametro(orden) {
  const clave = ORDEN_POR_COLUMNA[orden?.columna];

  if (!clave) {
    return "apellido";
  }

  return orden.direccion === "desc" ? `${clave}_desc` : clave;
}

/* Opciones para el selector de orden de la vista de tarjetas: los mismos
   criterios que la tabla. El orden por defecto (apellido A-Z) es la opcion
   vacia del selector, por eso no figura aca. */
export const OPCIONES_ORDEN = [
  { id: "docente:desc", nombre: "Apellido (Z-A)" },
  { id: "documento:asc", nombre: "DNI (menor a mayor)" },
  { id: "documento:desc", nombre: "DNI (mayor a menor)" },
  { id: "area:asc", nombre: "Área" },
  { id: "estado:asc", nombre: "Estado" }
];

export function ordenDesdeOpcion(valor) {
  const [columna, direccion] = String(valor || "docente:asc").split(":");
  return { columna, direccion: direccion === "desc" ? "desc" : "asc" };
}

export function opcionDesdeOrden(orden) {
  const opcion = orden?.columna ? `${orden.columna}:${orden.direccion === "desc" ? "desc" : "asc"}` : "";
  return opcion === "docente:asc" ? "" : opcion;
}

/* Iniciales para el avatar cuando no hay foto (el modelo no guarda imagenes). */
export function iniciales(docente = {}) {
  const letra = (texto) => String(texto ?? "").trim().charAt(0).toUpperCase();
  return `${letra(docente.nombre)}${letra(docente.apellido)}` || "?";
}

/* Color estable por docente para el avatar: sale del id, no del azar. */
const TONOS_AVATAR = ["azul", "violeta", "verde", "ambar", "celeste", "rosa"];

export function tonoAvatar(id) {
  const suma = [...String(id ?? "")].reduce((total, caracter) => total + caracter.charCodeAt(0), 0);
  return TONOS_AVATAR[suma % TONOS_AVATAR.length];
}
