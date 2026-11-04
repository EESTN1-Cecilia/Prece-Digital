import { flushSync } from "react-dom";
import { useRef, useState } from "react";
/* Novedades: lo ultimo que se registro en el ciclo (calificaciones e
   inasistencias), ordenado por fecha. No tiene datos propios: sale de los
   mismos endpoints que Mi Boletin y Mis Asistencias. */

import { h, Cargando, Encabezado, ErrorCarga, EstadoBadge, Icono, Vacio, fechaCorta, useDatos } from "./componentes.js";
import { obtenerAsistencias, obtenerBoletin } from "./portal-api.js";

const PERIODOS = [["c1", "1° cuatrimestre"], ["c2", "2° cuatrimestre"], ["final", "Calificación final"]];
const ETIQUETA_MARCA = { tep: "TEP", ted: "TED", debajo_de_6: "Menor a 6" };
const TONO_JUSTIFICACION = { justificada: "ok", no_justificada: "peligro", pendiente: "pendiente" };
const MAXIMO = 20;

const PUBLICACIONES_POR_PAGINA = 3;
const PUBLICACIONES = [
  ["Dirección", "Información institucional", "Canales de comunicación con la escuela", "En esta cartelera se reúnen los avisos de la institución. Para consultas sobre un comunicado, dirigite al área que figura como emisora."],
  ["Jefatura de Área", "Talleres", "Organización de las clases de taller", "Antes de cada clase, confirmá con tu docente el aula, el horario y los materiales indicados para tu grupo."],
  ["Preceptoría", "Asistencia", "Justificación de inasistencias", "Consultá en Mis Asistencias las inasistencias registradas. Si necesitás presentar documentación o consultar por una fecha, acercate a Preceptoría."],
  ["Dirección", "Trayectoria escolar", "Consulta del boletín", "En Mi Boletín se pueden consultar las calificaciones registradas por materia y cuatrimestre. Las consultas sobre los resultados se canalizan con el docente a cargo."],
  ["Jefatura de Área", "Seguridad en taller", "Ingreso y preparación del espacio de trabajo", "Antes de comenzar la actividad, seguí las indicaciones del docente sobre los materiales y elementos de protección correspondientes."],
  ["Preceptoría", "Datos de contacto", "Actualización de los datos familiares", "Si cambió el teléfono o el correo de contacto de tu familia, informalo a Preceptoría para mantener actualizados los canales de comunicación."]
];

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
  const modal = useRef(null);
  const [aviso, setAviso] = useState(null);
  const [pagina, setPagina] = useState(0);
  const [areaFiltro, setAreaFiltro] = useState("");
  const publicaciones = areaFiltro
    ? PUBLICACIONES.filter(([area]) => area === areaFiltro)
    : PUBLICACIONES;
  const totalPaginas = Math.ceil(publicaciones.length / PUBLICACIONES_POR_PAGINA);
  const inicio = pagina * PUBLICACIONES_POR_PAGINA;
  const { cargando, error, datos, recargar } = useDatos(cargarNovedades, []);


  return h(
    "div",
    { className: "pa-pagina" },
    h(Encabezado, { titulo: "Comunicados institucionales", descripcion: "Información de Dirección, Jefatura de Área y Preceptoría para estudiantes y familias." }),
    h("div", { className: "pa-cartelera" },
      h("section", { className: "pa-cartelera__panel", "aria-labelledby": "pa-publicaciones" },
        h("header", { className: "pa-cartelera__cabecera" },
          h("h2", { id: "pa-publicaciones" }, "Cartelera escolar"),
          h("span", null, "Contenido de demostración")
        ),
        publicaciones.slice(inicio, inicio + PUBLICACIONES_POR_PAGINA).map(([area, categoria, titulo, texto], indice) =>
          h("article", { className: indice === 0 ? "pa-publicacion pa-publicacion--destacada" : "pa-publicacion", "data-area": area, key: titulo },
            h("div", { className: "pa-publicacion__metadatos" },
              h("span", { className: "pa-publicacion__categoria" }, area),
              h("span", null, categoria)
            ),
            h("h3", null, h("button", {
              type: "button",
              className: "pa-publicacion__abrir",
              "aria-haspopup": "dialog",
              onClick: () => {
                flushSync(() => setAviso({ area, categoria, titulo, texto }));
                modal.current.showModal();
              }
            }, titulo)),
            h("p", null, texto),
            h("span", { className: "pa-publicacion__leer", "aria-hidden": true }, "Leer comunicado →")
          )
        ),
        h("nav", { className: "pa-cartelera__paginas", "aria-label": "Páginas de novedades" },
          h("button", { type: "button", disabled: pagina === 0, onClick: () => setPagina(pagina - 1) }, "Ver anterior"),
          h("span", { role: "status" }, `Página ${pagina + 1} de ${totalPaginas}`),
          h("button", { type: "button", disabled: pagina + 1 >= totalPaginas, onClick: () => setPagina(pagina + 1) }, "Ver próximo")
        )
      ),
      h("aside", { className: "pa-cartelera__panel" },
        h("label", { className: "pa-cartelera__filtro" },
          h("span", null, "Filtrar por área"),
          h("select", {
            value: areaFiltro,
            onChange: (evento) => {
              setAreaFiltro(evento.target.value);
              setPagina(0);
            }
          },
            h("option", { value: "" }, "Todas las áreas"),
            [...new Set(PUBLICACIONES.map(([area]) => area))].map((area) =>
              h("option", { key: area, value: area }, area)
            )
          )
        ),
        h("h2", null, "Información académica"),
        h("p", null, "Consultá tu información académica y los datos de tu cuenta."),
        h("a", { href: "#/mi-perfil/boletin" }, "Mi Boletín"),
        h("a", { href: "#/mi-perfil/asistencias" }, "Mis Asistencias")
      )
    ),
    h("dialog", {
      ref: modal,
      className: "pa-aviso-modal",
      "aria-labelledby": "pa-aviso-titulo",
      onClick: (evento) => {
        if (evento.target === evento.currentTarget) evento.currentTarget.close();
      }
    }, aviso && h("article", null,
      h("header", null,
        h("span", null, `${aviso.area} · ${aviso.categoria}`),
        h("button", { type: "button", autoFocus: true, onClick: () => modal.current.close() }, "Cerrar")
      ),
      h("h2", { id: "pa-aviso-titulo" }, aviso.titulo),
      h("p", null, aviso.texto)
    )),
    h("details", { className: "pa-cartelera__panel pa-cartelera__actividad" },
      h("summary", null, "Mi actividad académica"),
      cargando && !datos ? h(Cargando)
      : error ? h(ErrorCarga, { error, onReintentar: recargar })
      : datos.items.length === 0
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
    )
  );
}
