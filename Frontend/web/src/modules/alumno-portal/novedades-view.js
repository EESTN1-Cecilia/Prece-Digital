/* Novedades: lo ultimo que se registro en el ciclo (calificaciones e
   inasistencias), ordenado por fecha. No tiene datos propios: sale de los
   mismos endpoints que Mi Boletin y Mis Asistencias. */

import { h, Cargando, Encabezado, ErrorCarga, EstadoBadge, Icono, Vacio, fechaCorta, useDatos } from "./componentes.js";
import { obtenerAsistencias, obtenerBoletin } from "./portal-api.js";

const PERIODOS = [["c1", "1° cuatrimestre"], ["c2", "2° cuatrimestre"], ["final", "Calificación final"]];
const ETIQUETA_MARCA = { tep: "TEP", ted: "TED", debajo_de_6: "Menor a 6" };
const TONO_JUSTIFICACION = { justificada: "ok", no_justificada: "peligro", pendiente: "pendiente" };
const MAXIMO = 20;

async function cargarNovedades() {
  const [boletin, asistencias] = await Promise.all([obtenerBoletin(), obtenerAsistencias()]);
  const items = [];

  for (const materia of boletin.materias) {
    for (const [clave, periodo] of PERIODOS) {
      const resultado = materia.periodos[clave]?.resultado;
      if (!resultado?.fecha) continue;
      items.push({
        clave: `nota-${materia.materiaId}-${clave}`,
        fecha: String(resultado.fecha).slice(0, 10),
        icono: "libro",
        titulo: `${materia.materia}: ${resultado.valor}`,
        detalle: `${periodo} · ${String(resultado.tipoEvaluacion ?? "").replace("_", " ")}`,
        marca: ETIQUETA_MARCA[resultado.estado] ? { estado: resultado.estado, etiqueta: ETIQUETA_MARCA[resultado.estado] } : null,
        href: "#/mi-perfil/boletin"
      });
    }
  }

  for (const item of asistencias.detalle) {
    items.push({
      clave: `falta-${item.fecha}-${item.tipo}`,
      fecha: String(item.fecha).slice(0, 10),
      icono: "calendario",
      titulo: item.tipoEtiqueta,
      detalle: "Inasistencia registrada",
      justificacion: { tono: TONO_JUSTIFICACION[item.justificacion] ?? "neutro", etiqueta: item.justificacionEtiqueta },
      href: "#/mi-perfil/asistencias"
    });
  }

  return { cicloLectivo: boletin.cicloLectivo, items: items.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, MAXIMO) };
}

export default function NovedadesAlumnoView() {
  const { cargando, error, datos, recargar } = useDatos(cargarNovedades, []);

  if (cargando && !datos) return h(Cargando);
  if (error) return h(ErrorCarga, { error, onReintentar: recargar });

  return h(
    "div",
    { className: "pa-pagina" },
    h(Encabezado, { titulo: "Novedades", descripcion: `Lo último que se registró en tu ciclo lectivo ${datos.cicloLectivo}` }),
    datos.items.length === 0
      ? h(Vacio, { titulo: "Todavía no hay novedades.", descripcion: "Cuando se registren calificaciones o inasistencias, las vas a ver acá." })
      : h(
          "ul",
          { className: "pa-novedades" },
          datos.items.map((item) =>
            h(
              "li",
              { key: item.clave },
              h(
                "a",
                { className: "pa-novedad", href: item.href },
                h("span", { className: "pa-kpi__icono" }, h(Icono, { nombre: item.icono, tamano: 20 })),
                h("span", { className: "pa-novedad__texto" }, h("strong", null, item.titulo), h("span", null, item.detalle)),
                item.marca ? h(EstadoBadge, { estado: item.marca.estado, etiqueta: item.marca.etiqueta }) : null,
                item.justificacion ? h("span", { className: `pa-badge pa-badge--${item.justificacion.tono}` }, item.justificacion.etiqueta) : null,
                h("time", { className: "pa-novedad__fecha", dateTime: item.fecha }, fechaCorta(item.fecha))
              )
            )
          )
        )
  );
}
