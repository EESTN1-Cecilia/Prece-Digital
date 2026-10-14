/* Confirmacion para presentar una planificacion a revision.

   Hace el pedido por su cuenta, bloquea el doble envio mientras espera y, si
   el backend rechaza (409 por estado, 422 por contenido incompleto, 403), deja
   el modal abierto con el motivo. Lo usan el listado, las consultas y el
   detalle. */

import { useEffect, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { Alerta, Boton, Acciones, Modal } from "../../../components/ui/index.js";
import { PlanificacionesService } from "../planificaciones-service.js";

export function PresentarPlanificacion({ planificacion, onCerrar, onPresentada }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
  }, [planificacion?.id]);

  const confirmar = async () => {
    if (!planificacion || enviando) {
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const actualizada = await PlanificacionesService.presentar(planificacion.id);
      onPresentada?.(actualizada);
    } catch (fallo) {
      setError(fallo);
    } finally {
      setEnviando(false);
    }
  };

  const reentrega = planificacion?.estado === "observada";

  return h(
    Modal,
    {
      abierto: Boolean(planificacion),
      titulo: reentrega ? "Presentar correcciones" : "Presentar planificación",
      tamano: "chico",
      cargando: enviando,
      onCerrar,
      acciones: h(
        Acciones,
        null,
        h(Boton, { variante: "texto", deshabilitado: enviando, onClick: onCerrar }, "Cancelar"),
        h(Boton, { variante: "primario", cargando: enviando, onClick: confirmar }, "Presentar")
      )
    },
    planificacion
      ? h(
          "p",
          { className: "ui-modal__mensaje" },
          `¿Presentar la planificación ${planificacion.id} de ${planificacion.materia?.nombre ?? "la materia"} (${planificacion.curso?.anioNombre ?? ""} ${planificacion.division?.nombre ?? ""})?`
        )
      : null,
    h(
      "p",
      { className: "ui-modal__detalle" },
      reentrega
        ? "Queda como corregida y vuelve a Jefatura para una nueva revisión. Mientras tanto no se puede modificar."
        : "Queda pendiente de revisión de Jefatura. Mientras tanto no se puede modificar."
    ),
    error ? h(Alerta, { tono: "error" }, error.mensaje ?? "No se pudo presentar la planificación.") : null
  );
}
