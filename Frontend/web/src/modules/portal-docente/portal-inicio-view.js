/* Inicio del Portal Docente: bienvenida, indicadores reales (cursos, divisiones,
   materias, alumnos y asistencias tomadas en el mes) y accesos directos. */

import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { Esqueleto, MensajeError, SinDatos } from "../../components/ui/index.js";
import { PortalLayout, Indicador } from "./components/portal-layout.js";
import { useMisCursos } from "./components/use-mis-cursos.js";
import { PortalDocenteService } from "./portal-docente-service.js";
import { etiquetaCurso, expandirClases, indicadores, primerDiaDelMes } from "./portal-docente-logica.js";

const ACCESOS = [
  { href: "#/docente/cursos", titulo: "Mis Cursos", texto: "Tus divisiones y materias, con su lista de alumnos." },
  { href: "#/docente/asistencias", titulo: "Tomar Asistencia", texto: "Registrá la asistencia de la clase de hoy." },
  { href: "#/docente/historial", titulo: "Historial", texto: "Consultá y corregí las asistencias que tomaste." },
  { href: "#/docente/cursos", titulo: "Calificaciones", texto: "Completá la planilla de tu materia: las notas pasan solas al boletín." }
];

export default function PortalInicioView() {
  const usuario = useUsuarioActual();
  const { cursos, cargando, error, recargar } = useMisCursos();
  const [tomasDelMes, setTomasDelMes] = useState(null);

  useEffect(() => {
    PortalDocenteService.tomas({ desde: primerDiaDelMes() })
      .then((lista) => setTomasDelMes(Array.isArray(lista) ? lista.length : 0))
      .catch(() => setTomasDelMes(null));
  }, []);

  const datos = indicadores(cursos);
  const clases = expandirClases(cursos);
  const horario = cursos.find((curso) => curso.horario)?.horario ?? null;
  const fecha = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

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
        { className: "portal-indicadores", "aria-label": "Resumen de tu actividad" },
        h(Indicador, { etiqueta: "Cursos asignados", valor: datos.clases, detalle: "Combinaciones de división y materia" }),
        h(Indicador, { etiqueta: "Divisiones a cargo", valor: datos.divisiones, tono: "azul" }),
        h(Indicador, { etiqueta: "Materias", valor: datos.materias, tono: "violeta" }),
        h(Indicador, { etiqueta: "Alumnos", valor: datos.alumnos, detalle: "Matrícula activa de tus divisiones", tono: "ambar" }),
        h(Indicador, {
          etiqueta: "Asistencias tomadas este mes",
          valor: tomasDelMes ?? "—",
          tono: "celeste"
        })
      ),
      h(
        "div",
        { className: "portal-inicio__columnas" },
        h(
          "section",
          { className: "portal-panel", "aria-labelledby": "portal-clases-titulo" },
          h("h2", { id: "portal-clases-titulo", className: "portal-panel__titulo" }, "Tus clases"),
          clases.length
            ? h(
                "ul",
                { className: "portal-clases-lista" },
                clases.map((clase) =>
                  h(
                    "li",
                    { key: clase.clave },
                    h(
                      "div",
                      null,
                      h("strong", null, clase.materia ?? "Materia sin especificar"),
                      h("span", null, [etiquetaCurso(clase), clase.turno].filter(Boolean).join(" · "))
                    ),
                    h(
                      "div",
                      { className: "portal-clases-lista__acciones" },
                      h("a", { href: `#/docente/cursos/${clase.cursoId}`, className: "portal-enlace" }, "Lista"),
                      h(
                        "a",
                        {
                          href: `#/docente/asistencias?curso=${clase.cursoId}&materia=${encodeURIComponent(clase.materia ?? "")}`,
                          className: "portal-boton portal-boton--chico"
                        },
                        "Tomar asistencia"
                      )
                    )
                  )
                )
              )
            : h(SinDatos, {
                titulo: "Todavía no tenés cursos asignados",
                descripcion: "Cuando Dirección o Jefatura te asignen divisiones y materias, van a aparecer acá."
              })
        ),
        h(
          "section",
          { className: "portal-panel", "aria-labelledby": "portal-horario-titulo" },
          h("h2", { id: "portal-horario-titulo", className: "portal-panel__titulo" }, "Próximas clases"),
          horario
            ? h("p", { className: "portal-panel__texto" }, `Tu carga horaria registrada es de ${horario}.`)
            : h("p", { className: "portal-panel__texto portal-panel__texto--suave" }, "No hay horarios de cursada registrados para tus clases."),
          h("h2", { className: "portal-panel__titulo portal-panel__titulo--separado" }, "Accesos directos"),
          h(
            "div",
            { className: "portal-accesos" },
            ACCESOS.map((acceso) =>
              h(
                "a",
                { key: acceso.titulo, href: acceso.href, className: "portal-acceso" },
                h("strong", null, acceso.titulo),
                h("span", null, acceso.texto)
              )
            )
          )
        )
      )
    );
  }

  return h(
    PortalLayout,
    {
      activa: "inicio",
      titulo: `¡Hola, ${usuario?.nombre || "docente"}!`,
      bajada: `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)}. Este es el resumen de tus cursos.`
    },
    cuerpo
  );
}
