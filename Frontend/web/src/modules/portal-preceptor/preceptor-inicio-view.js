/* Inicio del Portal Preceptor: resumen de las divisiones a cargo (con datos
   reales del backend), la asistencia del dia por division y accesos. */

import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { Esqueleto, MensajeError, SinDatos } from "../../components/ui/index.js";
import { Indicador } from "../portal-docente/components/portal-layout.js";
import { etiquetaTurno, hoyLocal } from "../portal-docente/portal-docente-logica.js";
import { PortalPreceptorLayout, etiquetaDivision, useCursosPreceptor } from "./components/portal-preceptor-layout.js";
import { PortalPreceptorService } from "./portal-preceptor-service.js";
import { resumenCursos } from "./portal-preceptor-logica.js";

const ACCESOS = [
  { href: "#/preceptor/cursos", titulo: "Mis cursos", texto: "Tus divisiones, con la lista de alumnos y su asistencia." },
  { href: "#/preceptor/asistencia", titulo: "Planilla de asistencia", texto: "El libro mensual de asistencia de cada división." },
  { href: "#/preceptoria", titulo: "Asistencia del día", texto: "Registrá presentes, ausentes y tardes de hoy." },
  { href: "#/preceptor/historial", titulo: "Historial", texto: "Consultá y corregí la asistencia registrada." },
  { href: "#/preceptor/boletines", titulo: "Boletines", texto: "Imprimí el boletín de un alumno o los de todo el curso." },
  { href: "#/preceptoria/observaciones", titulo: "Observaciones", texto: "Registrá y consultá observaciones de tus alumnos." }
];

export default function PreceptorInicioView() {
  const usuario = useUsuarioActual();
  const { cursos, restringido, cargando, error, recargar } = useCursosPreceptor();
  const [hoy, setHoy] = useState(null);

  useEffect(() => {
    const fecha = hoyLocal();
    PortalPreceptorService.tomas({ desde: fecha, hasta: fecha })
      .then((dias) => setHoy(new Map(dias.map((dia) => [dia.cursoId, dia.resumen]))))
      .catch(() => setHoy(null));
  }, []);

  const datos = resumenCursos(cursos);
  const fecha = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const nombre = usuario?.nombre || usuario?.displayName || "preceptor/a";

  let cuerpo;

  if (error) {
    cuerpo = h(MensajeError, { error, onReintentar: recargar });
  } else if (cargando) {
    cuerpo = h(Esqueleto, { filas: 2, columnas: 4 });
  } else {
    cuerpo = h(
      "div",
      { className: "portal-inicio" },
      h(
        "section",
        { className: "portal-indicadores", "aria-label": "Resumen de tus divisiones" },
        h(Indicador, { etiqueta: "Divisiones a cargo", valor: datos.divisiones, detalle: restringido ? "Asignadas por Dirección" : "Toda la escuela" }),
        h(Indicador, { etiqueta: "Alumnos", valor: datos.alumnos, detalle: "Matrícula activa", tono: "azul" }),
        h(Indicador, {
          etiqueta: "Asistencia de hoy",
          valor: hoy ? `${cursos.filter((curso) => hoy.has(curso.id)).length} / ${cursos.length}` : "—",
          detalle: "Divisiones con asistencia registrada",
          tono: "celeste"
        }),
        h(Indicador, { etiqueta: "Turnos", valor: datos.turnos.map(etiquetaTurno).join(" y ") || "—", tono: "violeta" })
      ),
      h(
        "div",
        { className: "portal-inicio__columnas" },
        h(
          "section",
          { className: "portal-panel", "aria-labelledby": "preceptor-cursos-titulo" },
          h("h2", { id: "preceptor-cursos-titulo", className: "portal-panel__titulo" }, "Tus divisiones"),
          cursos.length
            ? h(
                "ul",
                { className: "portal-clases-lista" },
                cursos.map((curso) => {
                  const resumen = hoy?.get(curso.id);
                  return h(
                    "li",
                    { key: curso.id },
                    h(
                      "div",
                      null,
                      h("strong", null, etiquetaDivision(curso)),
                      h(
                        "span",
                        null,
                        [
                          etiquetaTurno(curso.turno) ? `Turno ${etiquetaTurno(curso.turno)}` : null,
                          `${curso.cantidadAlumnos} alumnos`,
                          resumen ? `Hoy: ${resumen.presente} P · ${resumen.ausente} A · ${resumen.tarde} T` : "Hoy: sin asistencia registrada"
                        ].filter(Boolean).join(" · ")
                      )
                    ),
                    h(
                      "div",
                      { className: "portal-clases-lista__acciones" },
                      h("a", { href: `#/preceptor/cursos/${curso.id}`, className: "portal-enlace" }, "Ver curso"),
                      h("a", { href: `#/preceptor/asistencia?curso=${curso.id}`, className: "portal-boton portal-boton--chico" }, "Asistencia")
                    )
                  );
                })
              )
            : h(SinDatos, {
                titulo: "Todavía no tenés divisiones asignadas",
                descripcion: "Dirección asigna las divisiones a cada preceptor. Cuando lo haga, vas a verlas acá."
              })
        ),
        h(
          "section",
          { className: "portal-panel", "aria-labelledby": "preceptor-accesos-titulo" },
          h("h2", { id: "preceptor-accesos-titulo", className: "portal-panel__titulo" }, "Accesos directos"),
          h(
            "div",
            { className: "portal-accesos" },
            ACCESOS.map((acceso) =>
              h("a", { key: acceso.href, href: acceso.href, className: "portal-acceso" }, h("strong", null, acceso.titulo), h("span", null, acceso.texto))
            )
          )
        )
      )
    );
  }

  return h(
    PortalPreceptorLayout,
    {
      activa: "inicio",
      titulo: `¡Hola, ${nombre}!`,
      bajada: `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)}. Este es el resumen de tus divisiones.`
    },
    cuerpo
  );
}
