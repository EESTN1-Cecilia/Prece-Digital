import { getStore } from "../../database/memory-store.mjs";

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

export function listarInformes(query = {}) {
  const lista = asegurarInformesIniciales();
  const filtroDest = query.destinatario ? String(query.destinatario).toLowerCase().trim() : null;

  let filtrados = [...lista];
  if (filtroDest === "alumnos") {
    filtrados = filtrados.filter((i) => i.destinatarios === "alumnos" || i.destinatarios === "ambos");
  } else if (filtroDest === "preceptores") {
    filtrados = filtrados.filter((i) => i.destinatarios === "preceptores" || i.destinatarios === "ambos");
  } else if (filtroDest && filtroDest !== "todos") {
    filtrados = filtrados.filter((i) => i.destinatarios === filtroDest);
  }

  return filtrados.sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
}

export function crearInforme(datos = {}, user = null) {
  const lista = asegurarInformesIniciales();
  const autor = user?.nombre && user?.apellido
    ? `${user.nombre} ${user.apellido}`
    : (user?.nombre || "Dirección General");

  const nuevo = {
    id: `inf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    titulo: datos?.titulo ? String(datos.titulo).trim() : "Informe de Dirección",
    texto: String(datos?.texto || "").trim(),
    fecha: datos?.fecha || new Date().toISOString().slice(0, 10),
    destinatarios: datos?.destinatarios || "ambos",
    archivo: datos?.archivo || null,
    autor: datos?.autor || autor,
    creadoEn: new Date().toISOString()
  };

  lista.unshift(nuevo);
  return nuevo;
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

