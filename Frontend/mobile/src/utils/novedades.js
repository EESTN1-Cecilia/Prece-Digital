/* Novedades: reglas puras (sin React). Mismo contenido y orden que la vista web
   (Frontend/web/src/modules/alumno-portal/novedades-view.js). */

export const PUBLICACIONES_POR_PAGINA = 3;
export const MAXIMO_ACTIVIDAD = 20;
export const AREAS = ["Dirección", "Jefatura de Área", "Preceptoría"];

export const PUBLICACIONES_FIJAS = [
  ["Dirección", "Información institucional", "Canales de comunicación con la escuela", "En esta cartelera se reúnen los avisos de la institución. Para consultas sobre un comunicado, dirigite al área que figura como emisora."],
  ["Jefatura de Área", "Talleres", "Organización de las clases de taller", "Antes de cada clase, confirmá con tu docente el aula, el horario y los materiales indicados para tu grupo."],
  ["Preceptoría", "Asistencia", "Justificación de inasistencias", "Consultá en Mis Asistencias las inasistencias registradas. Si necesitás presentar documentación o consultar por una fecha, acercate a Preceptoría."],
  ["Dirección", "Trayectoria escolar", "Consulta del boletín", "En Mi Boletín se pueden consultar las calificaciones registradas por materia y cuatrimestre. Las consultas sobre los resultados se canalizan con el docente a cargo."],
  ["Jefatura de Área", "Seguridad en taller", "Ingreso y preparación del espacio de trabajo", "Antes de comenzar la actividad, seguí las indicaciones del docente sobre los materiales y elementos de protección correspondientes."],
  ["Preceptoría", "Datos de contacto", "Actualización de los datos familiares", "Si cambió el teléfono o el correo de contacto de tu familia, informalo a Preceptoría para mantener actualizados los canales de comunicación."]
].map(([area, categoria, titulo, texto], indice) => ({ id: `base-${indice}`, area, categoria, titulo, texto, fecha: null, archivo: null }));

/* Informes de Dirección (dinámicos) primero, después los avisos fijos. */
export function construirPublicaciones(informes = [], area = "") {
  const dinamicas = (Array.isArray(informes) ? informes : []).map((informe) => ({
    id: informe.id,
    area: "Dirección",
    categoria: "Comunicado Oficial",
    titulo: informe.titulo || "Informe de Dirección",
    texto: informe.texto || "",
    fecha: informe.fecha || null,
    archivo: informe.archivo || null
  }));
  const todas = [...dinamicas, ...PUBLICACIONES_FIJAS];
  return area ? todas.filter((item) => item.area === area) : todas;
}

export function paginar(lista, pagina, porPagina = PUBLICACIONES_POR_PAGINA) {
  const total = Math.max(1, Math.ceil(lista.length / porPagina));
  const actual = Math.min(Math.max(0, pagina), total - 1);
  return { items: lista.slice(actual * porPagina, actual * porPagina + porPagina), pagina: actual, total };
}

const PERIODOS = [["c1", "1° cuatrimestre"], ["c2", "2° cuatrimestre"], ["final", "Calificación final"]];
const ETIQUETA_MARCA = { tep: "TEP", ted: "TED", debajo_de_6: "Menor a 6" };

/* Actividad académica: calificaciones e inasistencias recientes, la más nueva primero. */
export function armarActividad(boletin, asistencias) {
  const items = [];

  for (const materia of boletin?.materias ?? []) {
    for (const [clave, periodo] of PERIODOS) {
      const resultado = materia.periodos?.[clave]?.resultado;
      if (!resultado?.fecha) continue;
      items.push({
        clave: `nota-${materia.materiaId}-${clave}`,
        fecha: String(resultado.fecha).slice(0, 10),
        titulo: `${materia.materia}: ${resultado.valor}`,
        detalle: `${periodo} · ${String(resultado.tipoEvaluacion ?? "").replace("_", " ")}`,
        marca: ETIQUETA_MARCA[resultado.estado] ? { estado: resultado.estado, etiqueta: ETIQUETA_MARCA[resultado.estado] } : null,
        justificacion: null,
        destino: "boletin"
      });
    }
  }

  for (const item of asistencias?.detalle ?? []) {
    items.push({
      clave: `falta-${item.fecha}-${item.tipo}`,
      fecha: String(item.fecha).slice(0, 10),
      titulo: item.tipoEtiqueta,
      detalle: "Inasistencia registrada",
      marca: null,
      justificacion: { estado: item.justificacion, etiqueta: item.justificacionEtiqueta },
      destino: "asistencias"
    });
  }

  return items.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, MAXIMO_ACTIVIDAD);
}

/* "data:application/pdf;base64,AAAA" -> { mime, base64 } o null. */
export function leerDataUrl(dataUrl) {
  const coincidencia = /^data:([^;,]*)(?:;[^,]*)?;base64,([A-Za-z0-9+/=\s]*)$/.exec(String(dataUrl ?? ""));
  return coincidencia ? { mime: coincidencia[1] || "application/octet-stream", base64: coincidencia[2].replace(/\s/g, "") } : null;
}

/* Nombre seguro para guardar un adjunto: sin rutas ni caracteres raros. */
export function nombreSeguro(nombre) {
  const limpio = String(nombre ?? "").split(/[\\/]/).pop().replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, "_").replace(/^\.+/, "").trim();
  return (limpio || "adjunto").slice(0, 100);
}

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64ABytes(base64) {
  const limpio = base64.replace(/=+$/, "");
  const salida = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let acumulado = 0;
  let bits = 0;
  let posicion = 0;
  for (const caracter of limpio) {
    acumulado = (acumulado << 6) | ALFABETO.indexOf(caracter);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida[posicion++] = (acumulado >> bits) & 0xff;
    }
  }
  return salida.subarray(0, posicion);
}
