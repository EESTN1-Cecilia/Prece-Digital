/* Detalle de un curso del docente: datos basicos, lista de alumnos (con
   busqueda, orden e impresion) y asistencias registradas. La lista muestra solo
   lo que necesita la tarea docente: sin telefonos, domicilios ni familia. */

import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { AvisoVariasHojas, EncabezadoImpresion } from "../../components/impresion/encabezado-impresion.js";
import { imprimirDocumento } from "../../utils/impresion.js";
import { Busqueda, Cargando, MensajeError, SinDatos, SinResultados } from "../../components/ui/index.js";
import { PortalLayout } from "./components/portal-layout.js";
import { useMisCursos } from "./components/use-mis-cursos.js";
import { HistorialTomas } from "./components/historial-tomas.js";
import { PortalDocenteService } from "./portal-docente-service.js";
import { etiquetaTurno, expandirClases, filtrarAlumnos } from "./portal-docente-logica.js";
import { usePlanillaCalificaciones } from "./components/planilla-calificaciones-portal.js";

const PESTANAS = [
  { id: "alumnos", titulo: "Lista de alumnos" },
  { id: "asistencias", titulo: "Asistencias" }
];

export default function CursoDetalleView({ cursoId }) {
  const usuario = useUsuarioActual();
  const { cursos } = useMisCursos();
  const curso = cursos.find((item) => item.id === cursoId) ?? null;
  const clases = expandirClases(curso ? [curso] : []);
  const planilla = usePlanillaCalificaciones(expandirClases(cursos));

  const [pestana, setPestana] = useState("alumnos");
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState("");
  const [orden, setOrden] = useState("asc");

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    PortalDocenteService.alumnos(cursoId)
      .then((respuesta) => {
        if (vigente) {
          setAlumnos(respuesta.alumnos);
          setError(null);
        }
      })
      .catch((fallo) => vigente && setError(fallo))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [cursoId]);

  const [anio, division] = String(cursoId ?? "").split("-");
  const visibles = filtrarAlumnos(alumnos, texto, orden);

  const listaAlumnos = () => {
    if (error) {
      return h(MensajeError, { error });
    }

    if (cargando) {
      return h(Cargando, { texto: "Cargando la lista..." });
    }

    if (!alumnos.length) {
      return h(SinDatos, { titulo: "La división no tiene alumnos activos", descripcion: "Cuando Secretaría registre inscripciones, van a aparecer acá." });
    }

    return h(
      "div",
      null,
      h(
        "div",
        { className: "portal-filtros portal-no-imprimir", role: "search" },
        h(Busqueda, {
          id: "buscar-alumno",
          valor: texto,
          onChange: setTexto,
          etiqueta: "Buscar por apellido, nombre o DNI",
          placeholder: "Apellido, nombre o DNI"
        }),
        h(
          "label",
          { className: "portal-filtros__campo" },
          "Orden",
          h(
            "select",
            { value: orden, onChange: (evento) => setOrden(evento.target.value) },
            h("option", { value: "asc" }, "A → Z"),
            h("option", { value: "desc" }, "Z → A")
          )
        ),
        h("button", { type: "button", className: "portal-boton portal-boton--contorno", onClick: imprimirDocumento }, "Imprimir lista")
      ),
      h(EncabezadoImpresion, {
        titulo: "Lista de alumnos",
        datos: [
          { etiqueta: "Año", valor: `${anio}°` },
          { etiqueta: "División", valor: `${division}°` },
          { etiqueta: "Turno", valor: etiquetaTurno(curso?.turno) },
          { etiqueta: clases.filter((clase) => clase.materia).length > 1 ? "Materias" : "Materia", valor: clases.map((clase) => clase.materia).filter(Boolean).join(", ") },
          { etiqueta: "Docente", valor: [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") }
        ]
      }),
      visibles.length
        ? h(
            "div",
            { className: "ui-tabla__scroll", tabIndex: 0, role: "region", "aria-label": "Lista de alumnos" },
            h(
              "table",
              { className: "ui-tabla portal-tabla" },
              h("thead", null, h("tr", null, ["N°", "Apellido y nombre", "DNI", "Condición"].map((titulo) => h("th", { key: titulo, scope: "col" }, titulo)))),
              h(
                "tbody",
                null,
                visibles.map((alumno) =>
                  h(
                    "tr",
                    { key: alumno.id },
                    h("td", null, alumno.orden),
                    h("td", null, `${alumno.apellido}, ${alumno.nombre}`),
                    h("td", null, alumno.dni ?? "—"),
                    h("td", null, alumno.condicion ? alumno.condicion.charAt(0).toUpperCase() + alumno.condicion.slice(1) : "—")
                  )
                )
              )
            )
          )
        : h(SinResultados, { texto: "Ningún alumno coincide con la búsqueda." }),
      h("p", { className: "portal-panel__texto--suave portal-no-imprimir" }, `${alumnos.length} alumnos activos.`),
      h(
        "p",
        { className: "portal-lista-total solo-impresion" },
        texto.trim()
          ? `Total impreso: ${visibles.length} de ${alumnos.length} alumnos (búsqueda: “${texto.trim()}”).`
          : `Total: ${visibles.length} alumnos.`
      ),
      h(AvisoVariasHojas, { texto: "La lista ocupa más de una hoja: se mantuvo un tamaño de letra legible." })
    );
  };

  return h(
    PortalLayout,
    {
      activa: "cursos",
      titulo: `${anio}° año · División ${division}`,
      bajada: [
        clases.map((clase) => clase.materia).filter(Boolean).join(" · ") || null,
        etiquetaTurno(curso?.turno) ? `Turno ${etiquetaTurno(curso.turno)}` : null,
        curso?.horario ? `Horario ${curso.horario}` : null
      ].filter(Boolean).join(" — "),
      acciones: clases.flatMap((clase) => [
        h(
          "button",
          { key: `calificaciones-${clase.clave}`, type: "button", className: "portal-boton portal-boton--contorno portal-no-imprimir", onClick: () => planilla.abrir(clase) },
          clases.length > 1 ? `Calificaciones: ${clase.materia}` : "Cargar calificaciones"
        ),
        h(
          "a",
          {
            key: clase.clave,
            href: `#/docente/asistencias?curso=${clase.cursoId}&materia=${encodeURIComponent(clase.materia ?? "")}`,
            className: "portal-boton portal-no-imprimir"
          },
          clases.length > 1 ? `Tomar asistencia: ${clase.materia}` : "Tomar asistencia"
        )
      ])
    },
    h(
      "div",
      { className: "portal-pestanas portal-no-imprimir", role: "tablist", "aria-label": "Secciones del curso" },
      PESTANAS.map((item) =>
        h(
          "button",
          {
            key: item.id,
            type: "button",
            role: "tab",
            "aria-selected": pestana === item.id,
            className: `portal-pestanas__btn${pestana === item.id ? " portal-pestanas__btn--activa" : ""}`,
            onClick: () => setPestana(item.id)
          },
          item.titulo
        )
      )
    ),
    h(
      "section",
      { className: `portal-panel${pestana === "alumnos" ? " documento-oficio portal-lista-impresa" : ""}`, role: "tabpanel" },
      pestana === "alumnos" ? listaAlumnos() : h(HistorialTomas, { cursoId, clases })
    ),
    planilla.modal
  );
}
