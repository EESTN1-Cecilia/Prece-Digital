/* Detalle de una planificacion (#/planificaciones/:id).

   Secciones: datos generales, presentacion y revision, contenido (las
   secciones vienen del catalogo de la API) e historial de estados. Las
   acciones visibles (modificar, presentar) son las que informa el backend en
   `planificacion.acciones`.

   Al volver de cargar o modificar llega "?creada=1" o "?guardada=1" en el
   hash para mostrar el aviso de exito; main.js ignora la query al resolver la
   ruta. */

import { useMemo, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import {
  Acciones,
  Alerta,
  Boton,
  BotonEnlace,
  CargandoPantalla,
  Dato,
  ListaDatos,
  MensajeError
} from "../../components/ui/index.js";
import { fecha, textoOGuion } from "../../utils/formato.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import { etiquetaCurso, nombreDeEstado } from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";
import { EstadoPlanificacion } from "./components/estado-planificacion.js";
import { PresentarPlanificacion } from "./components/presentar-planificacion.js";

function avisoInicial() {
  const query = (window.location.hash.split("?")[1] ?? "").split("&");

  if (query.includes("creada=1")) {
    return "Planificación cargada. Queda en borrador hasta que la presentes.";
  }

  if (query.includes("guardada=1")) {
    return "Cambios guardados.";
  }

  return null;
}

function Historial({ entradas }) {
  if (!entradas?.length) {
    return h("p", { className: "data-nota" }, "Sin cambios de estado registrados.");
  }

  /* Cronologico: del mas reciente al mas antiguo. */
  const ordenadas = [...entradas].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  return h(
    "ol",
    { className: "planif-historial" },
    ordenadas.map((entrada, indice) =>
      h(
        "li",
        { key: `${entrada.fecha}-${indice}`, className: "planif-historial__item" },
        h(
          "div",
          { className: "planif-historial__estados" },
          entrada.estadoAnterior ? h(EstadoPlanificacion, { estado: entrada.estadoAnterior }) : null,
          entrada.estadoAnterior ? h("span", { "aria-hidden": "true" }, "→") : null,
          h(EstadoPlanificacion, { estado: entrada.estadoNuevo })
        ),
        h(
          "p",
          { className: "planif-historial__meta" },
          `${fecha(entrada.fecha)} · ${entrada.usuario?.nombre ?? "Usuario no disponible"}`
        ),
        entrada.motivo ? h("p", { className: "planif-historial__motivo" }, entrada.motivo) : null
      )
    )
  );
}

export default function PlanificacionDetalleView({ id }) {
  const [aviso, setAviso] = useState(avisoInicial);
  const [presentando, setPresentando] = useState(null);

  const { catalogos } = useCatalogosPlanificaciones({ incluirInactivas: false });
  const { datos: plan, cargando, error, recargar } = useConsulta(() => PlanificacionesService.obtener(id), [id]);

  const secciones = useMemo(() => catalogos?.secciones ?? [], [catalogos]);

  if (cargando && !plan) {
    return h("section", { className: "data-panel planif" }, h(CargandoPantalla, { texto: "Cargando la planificación..." }));
  }

  if (error) {
    return h(
      "section",
      { className: "data-panel planif" },
      h("div", { className: "data-panel__top" }, h("h1", null, "Planificación"), h(BotonEnlace, { variante: "contorno", href: "#/planificaciones" }, "Volver")),
      h(MensajeError, { error, onReintentar: recargar })
    );
  }

  if (!plan) {
    return null;
  }

  const acciones = plan.acciones ?? [];
  const seccionesConTexto = secciones.filter((seccion) => plan.contenido?.[seccion.valor]);

  return h(
    "section",
    { className: "data-panel planif", "aria-labelledby": "planificacion-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h(
        "h1",
        { id: "planificacion-titulo" },
        h(IconoFigma, { className: "people-icon", nombre: "clipboard" }),
        `Planificación ${plan.id}`
      ),
      h(
        Acciones,
        null,
        h(BotonEnlace, { variante: "contorno", href: "#/planificaciones" }, "Volver al listado"),
        acciones.includes("editar")
          ? h(BotonEnlace, { variante: "contorno", href: `#/planificaciones/${encodeURIComponent(plan.id)}/editar` }, "Modificar")
          : null,
        acciones.includes("presentar")
          ? h(Boton, { variante: "primario", onClick: () => setPresentando(plan) }, plan.estado === "observada" ? "Presentar correcciones" : "Presentar")
          : null
      )
    ),
    aviso ? h(Alerta, { tono: "exito", onCerrar: () => setAviso(null) }, aviso) : null,
    plan.estado === "observada" && plan.motivoRevision
      ? h(Alerta, { tono: "advertencia", titulo: "Observaciones de Jefatura" }, plan.motivoRevision)
      : null,
    plan.estado === "rechazada" && plan.motivoRevision
      ? h(Alerta, { tono: "error", titulo: "Motivo del rechazo" }, plan.motivoRevision)
      : null,
    h(
      "div",
      { className: "planif-detalle" },
      h(
        "section",
        { className: "planif-detalle__bloque", "aria-labelledby": "planif-generales" },
        h("h2", { id: "planif-generales" }, "Datos generales"),
        h(
          ListaDatos,
          null,
          h(Dato, { etiqueta: "Docente" }, plan.docente?.nombreCompleto),
          h(Dato, { etiqueta: "Materia" }, plan.materia?.nombre),
          h(Dato, { etiqueta: "Año" }, plan.curso?.anioNombre),
          h(Dato, { etiqueta: "Curso" }, etiquetaCurso(plan.curso)),
          h(Dato, { etiqueta: "División" }, plan.division?.nombre),
          h(Dato, { etiqueta: "Turno" }, plan.turnoNombre),
          h(Dato, { etiqueta: "Período" }, plan.periodo?.etiqueta),
          h(Dato, { etiqueta: "Estado" }, h(EstadoPlanificacion, { estado: plan.estado }))
        ),
        h(
          "p",
          { className: "planif-detalle__enlaces" },
          h("a", { href: `#/planificaciones/docentes/${encodeURIComponent(plan.docenteId)}` }, "Planificaciones del docente"),
          h("a", { href: `#/planificaciones/materias/${encodeURIComponent(plan.materiaId)}` }, "Planificaciones de la materia"),
          h("a", { href: `#/planificaciones/cursos/${encodeURIComponent(plan.cursoId)}` }, "Planificaciones del curso")
        )
      ),
      h(
        "section",
        { className: "planif-detalle__bloque", "aria-labelledby": "planif-seguimiento" },
        h("h2", { id: "planif-seguimiento" }, "Presentación y revisión"),
        h(
          ListaDatos,
          null,
          h(Dato, { etiqueta: "Estado actual" }, plan.estadoNombre ?? nombreDeEstado(plan.estado)),
          h(Dato, { etiqueta: "Fecha de creación" }, fecha(plan.creadoEn)),
          h(Dato, { etiqueta: "Última modificación" }, fecha(plan.actualizadoEn)),
          h(Dato, { etiqueta: "Fecha de presentación" }, fecha(plan.fechaPresentacion)),
          h(Dato, { etiqueta: "Fecha de revisión" }, fecha(plan.fechaRevision)),
          h(Dato, { etiqueta: "Responsable de revisión" }, textoOGuion(plan.revisor?.nombre)),
          h(Dato, { etiqueta: "Secciones completas" }, `${plan.seccionesCompletas} de ${plan.seccionesTotales}`)
        )
      )
    ),
    h(
      "section",
      { className: "planif-detalle__bloque", "aria-labelledby": "planif-contenido" },
      h("h2", { id: "planif-contenido" }, "Contenido de la planificación"),
      seccionesConTexto.length
        ? seccionesConTexto.map((seccion) =>
            h(
              "article",
              { key: seccion.valor, className: "planif-seccion" },
              h("h3", null, seccion.descripcion),
              h("p", { className: "planif-seccion__texto" }, plan.contenido[seccion.valor])
            )
          )
        : h("p", { className: "data-nota" }, "Todavía no se completó ninguna sección.")
    ),
    h(
      "section",
      { className: "planif-detalle__bloque", "aria-labelledby": "planif-historial" },
      h("h2", { id: "planif-historial" }, "Historial de estados"),
      h(Historial, { entradas: plan.historialEstados })
    ),
    h(PresentarPlanificacion, {
      planificacion: presentando,
      onCerrar: () => setPresentando(null),
      onPresentada: () => {
        setPresentando(null);
        setAviso("Planificación presentada para revisión.");
        recargar();
      }
    })
  );
}
