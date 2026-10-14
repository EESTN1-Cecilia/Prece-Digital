/* Catalogo y validaciones del modulo "Padres y tutores".

   El parentesco se modela como en el esquema de base (estudiante_contacto.parentesco)
   pero con lista cerrada: el cliente solo puede usar estos valores, sin texto libre. */

export const PARENTESCOS_VALIDOS = [
  "padre",
  "madre",
  "tutor",
  "responsable_legal",
  "abuelo",
  "abuela",
  "hermano",
  "hermana",
  "otro"
];

export const DNI_RE = /^\d{7,9}$/;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TELEFONO_RE = /^[+\d][\d\s()-]{6,19}$/;

/* Ordenes permitidos para listar: la clave llega por query y enmarcada a una
   lista cerrada para no permitir ordenar por campos arbitrarios. */
export const ORDENES_TUTORES = {
  apellido: { campo: "apellido", sentido: 1 },
  apellido_desc: { campo: "apellido", sentido: -1 },
  nombre: { campo: "nombre", sentido: 1 },
  nombre_desc: { campo: "nombre", sentido: -1 },
  dni: { campo: "dni", sentido: 1 },
  dni_desc: { campo: "dni", sentido: -1 }
};

export const ORDENES_VALIDOS = Object.keys(ORDENES_TUTORES);

/* Campos del tutor que pueden venir del cliente. Todo lo demas se ignora. */
export const CAMPOS_TUTOR = ["nombre", "apellido", "dni", "telefono", "email", "direccion", "escuelaId"];

/* Campos de la relacion tutor/alumno editables. */
export const CAMPOS_RELACION = ["parentesco", "responsablePrincipal", "autorizadoRetiro"];

export const ESTADOS_VALIDOS = ["activo", "inactivo", "todos"];

export function normalizarParentesco(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const normalizado = valor.trim().toLowerCase().replace(/\s+/g, "_");

  return PARENTESCOS_VALIDOS.includes(normalizado) ? normalizado : null;
}

export function esEntero(valor) {
  return /^\d+$/.test(String(valor ?? ""));
}