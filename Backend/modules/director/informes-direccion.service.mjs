import { getStore } from "../../database/memory-store.mjs";
import { errorDeValidacion, noEncontrado } from "../../utils/api-error.mjs";

export const DESTINATARIOS = ["alumnos", "preceptores", "ambos"];
export const MAX_TEXTO = 2000;
export const MAX_TITULO = 160;
/* El formulario del director permite hasta 5 MB; en base64 ocupa ~4/3 de eso. */
export const MAX_ARCHIVO_BYTES = 5 * 1024 * 1024;
export const MAX_BODY_INFORME_BYTES = 8 * 1024 * 1024;
const TIPOS_ARCHIVO = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
  "text/plain"
]);

function asegurarInformesIniciales() {
  const store = getStore();
  if (!Array.isArray(store.informesDireccion)) {
    store.informesDireccion = [];
  }
  if (store.informesDireccion.length === 0) {
    const hoyIso = new Date().toISOString().slice(0, 10);
    store.informesDireccion.push(
      {
        id: "inf-1",
        titulo: "Comunicado Institucional de Dirección",
        texto: "Se recuerda a toda la comunidad educativa mantener actualizada la documentación de legajos y el seguimiento diario de asistencia del ciclo lectivo en curso.",
        fecha: hoyIso,
        destinatarios: "ambos",
        archivo: {
          nombre: "Comunicado_Institucional_Direccion.pdf",
          tipo: "application/pdf",
          tamano: 145200
        },
        autor: "Dirección General",
        creadoEn: new Date().toISOString()
      },
      {
        id: "inf-2",
        titulo: "Revisión de planillas y partes diarios",
        texto: "Solicitamos al equipo de preceptoría verificar la carga de partes diarios y novedades de cursos antes del cierre de la jornada de cada turno.",
        fecha: hoyIso,
        destinatarios: "preceptores",
        archivo: {
          nombre: "Instructivo_Partes_Diarios_Preceptoria.pdf",
          tipo: "application/pdf",
          tamano: 98400
        },
        autor: "Dirección General",
        creadoEn: new Date().toISOString()
      }
    );
  }
  return store.informesDireccion;
}

/* Lo que sale por la API: nunca el contenido del adjunto (dataUrl). Quien lo
   necesite lo pide aparte con `obtenerArchivo`, asi las listas siguen livianas. */
function vista(informe) {
  const { archivo, ...resto } = informe;
  return {
    ...resto,
    archivo: archivo?.nombre
      ? {
        nombre: archivo.nombre,
        tipo: archivo.tipo ?? "application/octet-stream",
        tamano: archivo.tamano ?? 0,
        descargable: typeof archivo.dataUrl === "string" && archivo.dataUrl.length > 0
      }
      : null
  };
}

function llegaA(informe, destinatario) {
  return informe.destinatarios === destinatario || informe.destinatarios === "ambos";
}

function ordenarPorFecha(lista) {
  return lista.sort((a, b) => {
    const porFecha = String(b.fecha || "").localeCompare(String(a.fecha || ""));
    return porFecha !== 0 ? porFecha : String(b.creadoEn || "").localeCompare(String(a.creadoEn || ""));
  });
}

export function listarInformes(query = {}) {
  const lista = asegurarInformesIniciales();
  const filtroDest = query.destinatario ? String(query.destinatario).toLowerCase().trim() : null;

  let filtrados = [...lista];
  if (filtroDest === "alumnos" || filtroDest === "preceptores") {
    filtrados = filtrados.filter((i) => llegaA(i, filtroDest));
  } else if (filtroDest && filtroDest !== "todos") {
    filtrados = filtrados.filter((i) => i.destinatarios === filtroDest);
  }

  return ordenarPorFecha(filtrados).map(vista);
}

/* Novedades del portal del alumno: solo lo dirigido a alumnos (o a ambos). */
export function listarParaAlumnos() {
  return listarInformes({ destinatario: "alumnos" });
}

function validarArchivo(archivo) {
  if (archivo == null) return null;

  const detalles = [];
  const nombre = typeof archivo.nombre === "string" ? archivo.nombre.trim().slice(0, 200) : "";
  if (!nombre) detalles.push({ field: "archivo.nombre", message: "El archivo necesita un nombre." });

  const tipo = typeof archivo.tipo === "string" && archivo.tipo ? archivo.tipo : "application/octet-stream";
  if (!TIPOS_ARCHIVO.has(tipo)) detalles.push({ field: "archivo.tipo", message: "Tipo de archivo no permitido." });

  const dataUrl = typeof archivo.dataUrl === "string" && archivo.dataUrl.startsWith("data:") ? archivo.dataUrl : null;
  /* Tamano real a partir del base64; no se confia en el numero que informa el cliente. */
  const base64 = dataUrl ? dataUrl.slice(dataUrl.indexOf(",") + 1) : "";
  const relleno = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const tamano = dataUrl ? Math.floor((base64.length * 3) / 4) - relleno : Math.max(0, Number(archivo.tamano) || 0);
  if (tamano > MAX_ARCHIVO_BYTES) detalles.push({ field: "archivo", message: "El archivo supera el máximo de 5 MB." });

  if (detalles.length) throw errorDeValidacion(detalles);

  return { nombre, tipo, tamano, dataUrl };
}

export function crearInforme(datos = {}, user = null) {
  const lista = asegurarInformesIniciales();
  const autor = user?.nombre && user?.apellido
    ? `${user.nombre} ${user.apellido}`
    : (user?.nombre || "Dirección General");

  const titulo = datos?.titulo ? String(datos.titulo).trim() : "";
  const texto = String(datos?.texto || "").trim();
  const destinatarios = datos?.destinatarios || "ambos";
  const fecha = datos?.fecha ? String(datos.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10);

  const detalles = [];
  if (!texto) detalles.push({ field: "texto", message: "El informe necesita un texto." });
  if (texto.length > MAX_TEXTO) detalles.push({ field: "texto", message: `El texto no puede superar los ${MAX_TEXTO} caracteres.` });
  if (titulo.length > MAX_TITULO) detalles.push({ field: "titulo", message: `El título no puede superar los ${MAX_TITULO} caracteres.` });
  if (!DESTINATARIOS.includes(destinatarios)) detalles.push({ field: "destinatarios", message: "Elegí alumnos, preceptores o ambos." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) detalles.push({ field: "fecha", message: "La fecha no es válida." });
  if (detalles.length) throw errorDeValidacion(detalles);

  const nuevo = {
    id: `inf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    titulo: titulo || "Informe de Dirección",
    texto,
    fecha,
    destinatarios,
    archivo: validarArchivo(datos?.archivo),
    /* El autor sale de la sesion, no del cliente. */
    autor,
    creadoEn: new Date().toISOString()
  };

  lista.unshift(nuevo);
  return vista(nuevo);
}

export function eliminarInforme(informeId) {
  const lista = asegurarInformesIniciales();
  const idStr = String(informeId);
  const indice = lista.findIndex((item) => item.id === idStr);
  if (indice !== -1) {
    lista.splice(indice, 1);
    return { id: idStr, eliminado: true };
  }
  return { id: idStr, eliminado: false };
}

/* Adjunto de un informe. Con `destinatario` solo lo entrega si el informe le llega
   a ese publico: un alumno no puede bajar adjuntos de informes para preceptores. */
export function obtenerArchivo(informeId, { destinatario = null } = {}) {
  const informe = asegurarInformesIniciales().find((item) => item.id === String(informeId));

  if (!informe || (destinatario && !llegaA(informe, destinatario)) || !informe.archivo?.dataUrl) {
    throw noEncontrado("El archivo adjunto");
  }

  const { nombre, tipo, dataUrl } = informe.archivo;
  return { nombre, tipo, dataUrl };
}
