/* Estructura comun de las consultas por docente, materia y curso.

   Cada consulta elige una entidad, aplica filtros (ciclo lectivo, periodo,
   estado y los propios de la consulta), muestra una cabecera con los datos de
   la entidad y el resumen por estado, y lista las planificaciones con acceso
   al detalle. La vista concreta solo arma la cabecera y las columnas. */

import { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { Alerta, MensajeError, Select, SinDatos, SinResultados, Boton } from "../../../components/ui/index.js";
import { NavegacionPlanificaciones } from "./navegacion-planificaciones.js";
import { FiltrosActivos, FiltrosPlanificaciones } from "./filtros-planificaciones.js";
import { ResumenEstados } from "./resumen-estados.js";
import { TablaPlanificaciones } from "./tabla-planificaciones.js";
import { PresentarPlanificacion } from "./presentar-planificacion.js";

export function ConsultaPlanificaciones({
  activa,
  titulo,
  icono = "clipboard",
  selector,
  errorOpciones,
  onReintentarOpciones,
  camposFiltro,
  filtros,
  opcionesFiltro,
  onCambiarFiltro,
  onLimpiarFiltros,
  catalogos,
  datos,
  cargando,
  error,
  onReintentar,
  cabecera,
  columnas,
  textoSinSeleccion
}) {
  const [aPresentar, setAPresentar] = useState(null);
  const [aviso, setAviso] = useState(null);
  const conFiltros = Object.values(filtros).some(Boolean);

  return h(
    "section",
    { className: "data-panel planif", "aria-labelledby": `planif-consulta-${activa}` },
    h(
      "div",
      { className: "data-panel__top" },
      h("h1", { id: `planif-consulta-${activa}` }, h(IconoFigma, { className: "people-icon", nombre: icono }), titulo)
    ),
    h(NavegacionPlanificaciones, { activa }),
    errorOpciones ? h(MensajeError, { error: errorOpciones, onReintentar: onReintentarOpciones }) : null,
    h(
      "div",
      { className: "planif-consulta__selector" },
      h(Select, {
        id: selector.id,
        etiqueta: selector.etiqueta,
        placeholder: selector.placeholder,
        valor: selector.valor ?? "",
        opciones: selector.opciones,
        deshabilitado: !selector.opciones.length,
        onChange: selector.onChange
      })
    ),
    selector.valor
      ? h(
          "div",
          null,
          h(FiltrosPlanificaciones, {
            campos: camposFiltro,
            filtros,
            opciones: opcionesFiltro,
            onCambiar: onCambiarFiltro,
            idPrefijo: activa
          }),
          h(FiltrosActivos, {
            filtros,
            opciones: opcionesFiltro,
            busqueda: "",
            onQuitar: (campo) => onCambiarFiltro(campo, ""),
            onQuitarBusqueda: () => {},
            onLimpiar: onLimpiarFiltros
          }),
          aviso ? h(Alerta, { tono: "exito", onCerrar: () => setAviso(null) }, aviso) : null,
          error ? h(MensajeError, { error, onReintentar }) : null,
          datos && !error
            ? h(
                "div",
                { className: "planif-ficha" },
                h("div", { className: "planif-ficha__datos" }, cabecera),
                h(ResumenEstados, { resumen: datos.resumen, catalogos })
              )
            : null,
          error
            ? null
            : h(TablaPlanificaciones, {
                columnas,
                filas: datos?.planificaciones ?? [],
                cargando,
                onPresentar: setAPresentar,
                vacio: conFiltros
                  ? h(SinResultados, {
                      texto: "Ninguna planificación coincide con los filtros aplicados.",
                      accion: h(Boton, { variante: "contorno", onClick: onLimpiarFiltros }, "Limpiar filtros")
                    })
                  : h(SinResultados, { texto: "No hay planificaciones registradas para esta consulta." })
              })
        )
      : h(SinDatos, { titulo: textoSinSeleccion }),
    h(PresentarPlanificacion, {
      planificacion: aPresentar,
      onCerrar: () => setAPresentar(null),
      onPresentada: (planificacion) => {
        setAPresentar(null);
        setAviso(`La planificación ${planificacion.id} quedó lista para revisión.`);
        onReintentar?.();
      }
    })
  );
}
