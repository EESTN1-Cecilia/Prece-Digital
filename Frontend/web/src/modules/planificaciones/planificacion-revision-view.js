/* Revision de una planificacion (#/planificaciones/:id/revision).

   La pantalla muestra el contenido completo y permite cambiar estado solo con
   las transiciones que informa la API para el usuario actual. */

import { useMemo, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import {
  Alerta,
  AreaTexto,
  Boton,
  BotonEnlace,
  CargandoPantalla,
  Confirmacion,
  Dato,
  ListaDatos,
  MensajeError,
  Select
} from "../../components/ui/index.js";
import { fecha, textoOGuion } from "../../utils/formato.js";
import { PlanificacionesService } from "./planificaciones-service.js";
import { etiquetaCurso, nombreDeEstado, opcionesDeEstados } from "./planificaciones-helpers.js";
import { useCatalogosPlanificaciones, useConsulta } from "./use-planificaciones.js";
import { EstadoPlanificacion } from "./components/estado-planificacion.js";
import { HistorialEstados } from "./components/historial-estados.js";

function PanelRevision({ planificacion, catalogos, onActualizada }) {
  const transiciones = planificacion.transiciones ?? [];
  const puedeRevisar = (planificacion.acciones ?? []).includes("revisar") && transiciones.length > 0;
  const [estado, setEstado] = useState(transiciones[0] ?? "");
  const [motivo, setMotivo] = useState("");
  const [errorCampo, setErrorCampo] = useState(null);
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, setPendiente] = useState(null);

  const estadosConMotivo = catalogos?.estadosConMotivo ?? [];
  const motivoObligatorio = estadosConMotivo.includes(estado);
  const opciones = opcionesDeEstados({ estados: (catalogos?.estados ?? []).filter((item) => transiciones.includes(item.valor)) });

  const preparar = () => {
    setError(null);

    if (!estado) {
      setErrorCampo("Elegí el nuevo estado.");
      return;
    }

    if (motivoObligatorio && !motivo.trim()) {
      setErrorCampo("El motivo es obligatorio para este estado.");
      return;
    }

    setErrorCampo(null);
    setPendiente({ estado, motivo: motivo.trim() });
  };

  const confirmar = async () => {
    if (!pendiente || confirmando) {
      return;
    }

    setConfirmando(true);
    setError(null);

    try {
      const actualizada = await PlanificacionesService.cambiarEstado(planificacion.id, {
        estado: pendiente.estado,
        motivo: pendiente.motivo || null
      });
      setPendiente(null);
      setMotivo("");
      onActualizada(actualizada);
    } catch (fallo) {
      setError(fallo);
    } finally {
      setConfirmando(false);
    }
  };

  return h(
    "aside",
    { className: "planif-revision-panel", "aria-labelledby": "planif-panel-revision" },
    h("h2", { id: "planif-panel-revision" }, "Cambio de estado"),
    h(
      ListaDatos,
      null,
      h(Dato, { etiqueta: "Estado actual" }, h(EstadoPlanificacion, { estado: planificacion.estado })),
      h(Dato, { etiqueta: "Observaciones registradas" }, planificacion.cantidadObservaciones ?? 0),
      h(Dato, { etiqueta: "Última revisión" }, fecha(planificacion.fechaRevision))
    ),
    puedeRevisar
      ? h(
          "div",
          { className: "planif-revision-panel__form" },
          h(Select, {
            id: "revision-estado",
            etiqueta: "Nuevo estado",
            valor: estado,
            opciones,
            onChange: (valor) => {
              setEstado(valor);
              setErrorCampo(null);
            },
            error: errorCampo && !estado ? errorCampo : null,
            requerido: true
          }),
          h(AreaTexto, {
            id: "revision-motivo",
            etiqueta: motivoObligatorio ? "Motivo" : "Motivo (opcional)",
            valor: motivo,
            onChange: (valor) => {
              setMotivo(valor);
              setErrorCampo(null);
            },
            filas: 5,
            maxLength: 500,
            requerido: motivoObligatorio,
            error: errorCampo && estado ? errorCampo : null,
            ayuda: motivoObligatorio ? "El motivo queda en el historial y lo ve el docente." : "Podés dejar una nota interna del cambio."
          }),
          error ? h(MensajeError, { error }) : null,
          h(Boton, { variante: "primario", onClick: preparar, cargando: confirmando }, "Cambiar estado")
        )
      : h(Alerta, { tono: "info" }, "Esta planificación no tiene transiciones de revisión disponibles para tu usuario."),
    h(Confirmacion, {
      abierto: Boolean(pendiente),
      titulo: "Confirmar cambio de estado",
      mensaje: pendiente ? `¿Cambiar la planificación ${planificacion.id} a ${nombreDeEstado(pendiente.estado)}?` : "",
      detalle: pendiente?.motivo ? `Motivo: ${pendiente.motivo}` : "El cambio quedará registrado en el historial.",
      variante: pendiente?.estado === "rechazada" ? "peligro" : "primario",
      cargando: confirmando,
      onConfirmar: confirmar,
      onCancelar: () => (confirmando ? null : setPendiente(null))
    })
  );
}

export default function PlanificacionRevisionView({ id }) {
  const [aviso, setAviso] = useState(null);
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
      h("div", { className: "data-panel__top" }, h("h1", null, "Revisión"), h(BotonEnlace, { variante: "contorno", href: "#/planificaciones/revision" }, "Volver")),
      h(MensajeError, { error, onReintentar: recargar })
    );
  }

  if (!plan) {
    return null;
  }

  const seccionesContenido = secciones.filter((seccion) => plan.contenido?.[seccion.valor]);

  return h(
    "section",
    { className: "data-panel planif", "aria-labelledby": "revision-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h(
        "h1",
        { id: "revision-titulo" },
        h(IconoFigma, { className: "people-icon", nombre: "clipboard" }),
        `Revisión ${plan.id}`
      ),
      h(BotonEnlace, { variante: "contorno", href: "#/planificaciones/revision" }, "Volver a revisión")
    ),
    aviso ? h(Alerta, { tono: "exito", onCerrar: () => setAviso(null) }, aviso) : null,
    h(
      "div",
      { className: "planif-revision-layout" },
      h(
        "div",
        { className: "planif-revision-layout__principal" },
        h(
          "section",
          { className: "planif-detalle__bloque", "aria-labelledby": "revision-generales" },
          h("h2", { id: "revision-generales" }, "Datos generales"),
          h(
            ListaDatos,
            null,
            h(Dato, { etiqueta: "Docente" }, plan.docente?.nombreCompleto),
            h(Dato, { etiqueta: "Materia" }, plan.materia?.nombre),
            h(Dato, { etiqueta: "Curso" }, etiquetaCurso(plan.curso)),
            h(Dato, { etiqueta: "División" }, plan.division?.nombre),
            h(Dato, { etiqueta: "Turno" }, plan.turnoNombre),
            h(Dato, { etiqueta: "Período" }, plan.periodo?.etiqueta),
            h(Dato, { etiqueta: "Fecha de presentación" }, fecha(plan.fechaPresentacion)),
            h(Dato, { etiqueta: "Responsable de revisión" }, textoOGuion(plan.revisor?.nombre))
          )
        ),
        h(
          "section",
          { className: "planif-detalle__bloque", "aria-labelledby": "revision-contenido" },
          h("h2", { id: "revision-contenido" }, "Contenido por secciones"),
          seccionesContenido.length
            ? seccionesContenido.map((seccion) =>
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
          { className: "planif-detalle__bloque", "aria-labelledby": "revision-historial" },
          h("h2", { id: "revision-historial" }, "Historial de estados"),
          h(HistorialEstados, { entradas: plan.historialEstados })
        )
      ),
      h(PanelRevision, {
        key: `${plan.id}-${plan.estado}`,
        planificacion: plan,
        catalogos,
        onActualizada: (actualizada) => {
          setAviso(`La planificación quedó ${nombreDeEstado(actualizada.estado).toLowerCase()}.`);
          recargar();
        }
      })
    )
  );
}
