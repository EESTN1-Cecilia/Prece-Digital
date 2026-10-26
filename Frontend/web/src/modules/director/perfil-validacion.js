/* Validacion del alta de perfiles de personal.

   Vive aparte del componente para poder probarla sin navegador y para que las
   reglas no esten duplicadas: el mismo modulo valida el formulario de "Crear
   Nuevo Perfil" y normaliza los datos que viajan al backend.

   El backend vuelve a validar todo (el cliente no es la autoridad), pero
   validar aca evita un viaje de ida y vuelta por cada error obvio. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DNI_RE = /^\d{7,9}$/;
const TELEFONO_RE = /^[\d\s+()-]{6,30}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const AREA_POR_DEFECTO = "docencia";
export const AREA_DOCENCIA = "docencia";
export const SITUACIONES_REVISTA = ["Titular", "Provisional", "Suplente"];
export const MODULOS_DOCENTES = [2, 3, 4, 6];
/* Dias de cursada. El valor viaja sin tilde (asi lo guarda el backend) y la
   etiqueta se muestra con ella. */
export const DIAS_CURSADA = [
  { id: "Lunes", nombre: "Lunes" },
  { id: "Martes", nombre: "Martes" },
  { id: "Miercoles", nombre: "Miércoles" },
  { id: "Jueves", nombre: "Jueves" },
  { id: "Viernes", nombre: "Viernes" }
];

export function formularioVacio() {
  return {
    nombre: "",
    apellido: "",
    email: "",
    dni: "",
    telefono: "",
    area: AREA_POR_DEFECTO,
    roles: [],
    materia: "",
    situacion_revista: "",
    suplente_de: "",
    modulos: "",
    dia: "",
    hora_desde: "",
    hora_hasta: ""
  };
}

/* Devuelve `{ errores, datos }`: los errores van por campo (para pintarlos
   debajo del input) y `datos` es la version normalizada que se envia. */
export function validarPerfil(formulario = {}, areasValidas = []) {
  const errores = {};
  const nombre = String(formulario.nombre ?? "").trim();
  const apellido = String(formulario.apellido ?? "").trim();
  const email = String(formulario.email ?? "").trim().toLowerCase();
  const dni = String(formulario.dni ?? "").replace(/\D/g, "");
  const telefono = String(formulario.telefono ?? "").trim();
  const area = String(formulario.area ?? "").trim();
  const roles = Array.isArray(formulario.roles) ? formulario.roles : [];

  if (!nombre) {
    errores.nombre = "El nombre es obligatorio.";
  }

  if (!apellido) {
    errores.apellido = "El apellido es obligatorio.";
  }

  if (!email) {
    errores.email = "El correo institucional es obligatorio.";
  } else if (!EMAIL_RE.test(email)) {
    errores.email = "Ingresa un correo institucional con formato válido.";
  }

  if (!dni) {
    errores.dni = "El DNI es obligatorio.";
  } else if (!DNI_RE.test(dni)) {
    errores.dni = "El DNI debe tener entre 7 y 9 dígitos, sin puntos.";
  }

  if (telefono && !TELEFONO_RE.test(telefono)) {
    errores.telefono = "El teléfono solo admite números, espacios y los signos + ( ) -.";
  }

  if (!area) {
    errores.area = "Selecciona un área institucional.";
  } else if (areasValidas.length && !areasValidas.includes(area)) {
    errores.area = "El área no pertenece al catálogo institucional.";
  }

  if (roles.length === 0) {
    errores.roles = "Selecciona al menos un rol para el perfil.";
  }

  /* Los datos academicos solo aplican al area de Docencia: en el resto de los
     sectores no se piden ni se envian. */
  const academicos = {};

  if (area === AREA_DOCENCIA) {
    const materia = String(formulario.materia ?? "").trim();
    const situacionRevista = String(formulario.situacion_revista ?? "").trim();
    const suplenteDe = String(formulario.suplente_de ?? "").trim();
    const modulos = Number.parseInt(String(formulario.modulos ?? ""), 10);
    const dia = String(formulario.dia ?? "").trim();
    const horaDesde = String(formulario.hora_desde ?? "").trim();
    const horaHasta = String(formulario.hora_hasta ?? "").trim();

    if (!materia) {
      errores.materia = "La materia es obligatoria para el área de Docencia.";
    }

    if (!situacionRevista) {
      errores.situacion_revista = "Selecciona la situación de revista.";
    } else if (!SITUACIONES_REVISTA.includes(situacionRevista)) {
      errores.situacion_revista = "La situación de revista no es válida.";
    }

    if (situacionRevista === "Suplente" && !suplenteDe) {
      errores.suplente_de = "Indica a quién reemplaza el suplente.";
    }

    if (!MODULOS_DOCENTES.includes(modulos)) {
      errores.modulos = "Los módulos deben ser 2, 3, 4 o 6.";
    }

    if (!dia) {
      errores.dia = "Selecciona el día de cursada.";
    } else if (!DIAS_CURSADA.some((opcion) => opcion.id === dia)) {
      errores.dia = "El día debe ser de lunes a viernes.";
    }

    if (!HORA_RE.test(horaDesde)) {
      errores.hora_desde = "Indica la hora de inicio en formato HH:MM.";
    }

    if (!HORA_RE.test(horaHasta)) {
      errores.hora_hasta = "Indica la hora de fin en formato HH:MM.";
    } else if (HORA_RE.test(horaDesde) && horaHasta <= horaDesde) {
      errores.hora_hasta = "La hora de fin debe ser posterior a la de inicio.";
    }

    academicos.materia = materia;
    academicos.situacion_revista = situacionRevista;
    academicos.suplente_de = situacionRevista === "Suplente" ? suplenteDe : null;
    academicos.modulos = modulos;
    academicos.dia = dia;
    academicos.hora_desde = horaDesde;
    academicos.hora_hasta = horaHasta;
  }

  return {
    errores,
    datos: {
      nombre,
      apellido,
      email,
      dni,
      telefono: telefono || undefined,
      area,
      roles: [...new Set(roles)],
      ...academicos
    }
  };
}

/* El formulario esta "sucio" cuando el usuario escribio algo: se usa para
   avisar antes de cerrar el modal y perder lo escrito. */
export function formularioSucio(formulario = {}) {
  const base = formularioVacio();

  return Object.keys(base).some((campo) => {
    if (campo === "roles") {
      return (formulario.roles ?? []).length > 0;
    }

    return String(formulario[campo] ?? "").trim() !== base[campo];
  });
}
