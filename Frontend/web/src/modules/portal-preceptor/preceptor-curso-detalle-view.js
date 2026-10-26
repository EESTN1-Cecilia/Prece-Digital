/* Detalle de una division del preceptor: lista de alumnos (busqueda, orden,
   impresion y boletin de cada alumno) y la asistencia diaria registrada. La
   lista muestra solo lo necesario: sin telefonos, domicilios ni familia.
   Una division no asignada responde 403 en el backend y se informa aca. */

import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { useUsuarioActual } from "../../estado/index.js";
import { AvisoVariasHojas, EncabezadoImpresion } from "../../components/impresion/encabezado-impresion.js";
import { imprimirDocumento } from "../../utils/impresion.js";
import { Busqueda, Cargando, SinDatos, SinResultados } from "../../components/ui/index.js";
import { HistorialTomas } from "../portal-docente/components/historial-tomas.js";
import { etiquetaTurno, filtrarAlumnos } from "../portal-docente/portal-docente-logica.js";
import { ErrorDeCurso, PortalPreceptorLayout, useCursosPreceptor } from "./components/portal-preceptor-layout.js";
import { PortalPreceptorService } from "./portal-preceptor-service.js";

const PESTANAS = [
  { id: "alumnos", titulo: "Lista de alumnos" },
  { id: "asistencias", titulo: "Asistencias" }
];

/* El preceptor corrige la asistencia diaria de sus divisiones (el backend
   vuelve a validar el alcance). */
const puedeCorregirDia = () => true;

export default function PreceptorCursoDetalleView({ cursoId }) {
  const usuario = useUsuarioActual();
  const { cursos } = useCursosPreceptor();
  const curso = cursos.find((item) => item.id === cursoId) ?? null;

  const [pestana, setPestana] = useState("alumnos");
  const [alumnos, setAlumnos] = useState([]);
  const [contexto, setContexto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState("");
  const [orden, setOrden] = useState("asc");

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setAlumnos([]);
    setContexto(null);
    setError(null);

    PortalPreceptorService.alumnos(cursoId)
      .then((respuesta) => {
        if (vigente) {
          setAlumnos(respuesta.alumnos.map((alumno, indice) => ({ ...alumno, orden: indice + 1 })));
          setContexto(respuesta.contexto);
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
  const turno = etiquetaTurno(contexto?.turno ?? curso?.turno);
  const visibles = filtrarAlumnos(alumnos, texto, orden);
  const nombrePreceptor = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || usuario?.displayName;

  const listaAlumnos = () => {
    if (error) {
      return h(ErrorDeCurso, { error });
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
          id: "buscar-alumno-preceptor",
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
          { etiqueta: "Turno", valor: turno },
          { etiqueta: "Preceptor/a", valor: nombrePreceptor }
        ]
      }),
      visibles.length
        ? h(
            "div",
            { className: "ui-tabla__scroll", tabIndex: 0, role: "region", "aria-label": "Lista de alumnos" },
            h(
              "table",
              { className: "ui-tabla portal-tabla" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  ["N°", "Apellido y nombre", "DNI", "Condición"].map((titulo) => h("th", { key: titulo, scope: "col" }, titulo)),
                  h("th", { scope: "col", className: "portal-no-imprimir" }, "Boletín")
                )
              ),
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
                    h("td", null, alumno.condicion ? alumno.condicion.charAt(0).toUpperCase() + alumno.condicion.slice(1) : "—"),
                    h(
                      "td",
                      { className: "portal-no-imprimir" },
                      h(
                        "a",
                        {
                          href: `#/preceptor/cursos/${cursoId}/boletines?alumno=${encodeURIComponent(alumno.id)}`,
                          className: "portal-enlace",
                          "aria-label": `Imprimir el boletín de ${alumno.apellido}, ${alumno.nombre}`
                        },
                        "Imprimir boletín"
                      )
                    )
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
    PortalPreceptorLayout,
    {
      activa: "cursos",
      titulo: `${anio}° año · División ${division}`,
      bajada: error ? null : [turno ? `Turno ${turno}` : null, contexto?.orientacion ?? curso?.orientacion].filter(Boolean).join(" — "),
      acciones: error
        ? null
        : [
            h("a", { key: "boletines", href: `#/preceptor/cursos/${cursoId}/boletines`, className: "portal-boton portal-boton--contorno portal-no-imprimir" }, "Imprimir boletines del curso"),
            h("a", { key: "asistencia", href: `#/preceptor/asistencia?curso=${cursoId}`, className: "portal-boton portal-no-imprimir" }, "Planilla de asistencia")
          ]
    },
    error
      ? null
      : h(
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
      pestana === "alumnos" || error
        ? listaAlumnos()
        : h(HistorialTomas, {
            cursoId,
            clases: curso ? [{ cursoId: curso.id, anio: curso.anio, division: curso.division }] : [],
            servicio: PortalPreceptorService,
            puedeCorregir: puedeCorregirDia
          })
    )
  );
}
