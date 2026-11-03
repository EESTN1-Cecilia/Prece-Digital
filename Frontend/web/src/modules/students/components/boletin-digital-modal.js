/* Boletin de un alumno para el personal (preceptor, secretaria, direccion).

   Muestra el MISMO boletin que el alumno ve en su portal: mismo componente
   (BoletinDocumento) y mismo calculo del backend
   (GET /api/v1/alumnos/:alumnoId/boletin). Las notas las cargan los docentes
   en Calificaciones y las inasistencias se registran en Asistencias: aca no se
   edita nada. El backend solo entrega alumnos de los cursos asignados al
   preceptor. */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { h, Cargando, ErrorCarga, SelectorCiclo, useDatos } from "../../alumno-portal/componentes.js";
import { descargarBoletinPdf } from "../../boletin/boletin-pdf.js";
import { BoletinDocumento } from "../../boletin/boletin-documento.js";
import { pedir } from "../../../services/http.js";

export { PLANES_BOLETIN } from "./planes-boletin.js";

function idDelAlumno(alumno) {
  return alumno?.datosPersonales?.id ?? alumno?.id ?? alumno?.studentId ?? alumno?.alumnoId ?? null;
}

function Contenido({ alumnoId, onCerrar }) {
  const [anio, setAnio] = useState(null);
  const { cargando, error, datos, recargar } = useDatos(
    () => {
      const ruta = `/api/v1/alumnos/${encodeURIComponent(alumnoId)}/boletin`;
      return pedir(anio ? `${ruta}?anio=${anio}` : ruta, { recurso: "el boletín del alumno" });
    },
    [alumnoId, anio]
  );

  function imprimir() {
    document.body.classList.add("pa-imprimiendo-boletin");
    const limpiar = () => {
      document.body.classList.remove("pa-imprimiendo-boletin");
      window.removeEventListener("afterprint", limpiar);
    };
    window.addEventListener("afterprint", limpiar);
    window.print();
  }

  return h(
    "div",
    { className: "pa-modal__panel", role: "dialog", "aria-modal": "true", "aria-label": "Boletín del alumno", onClick: (evento) => evento.stopPropagation() },
    h(
      "div",
      { className: "pa-modal__barra" },
      h("strong", null, "Boletín"),
      h(
        "div",
        { className: "pa-encabezado__acciones" },
        datos ? h(SelectorCiclo, { anios: datos.aniosDisponibles, valor: datos.cicloLectivo, onCambiar: setAnio }) : null,
        datos ? h("button", { type: "button", className: "pa-boton pa-boton--secundario", onClick: () => descargarBoletinPdf(datos).catch(() => {}) }, "Descargar PDF") : null,
        datos ? h("button", { type: "button", className: "pa-boton pa-boton--primario", onClick: imprimir }, "Imprimir") : null,
        h("button", { type: "button", className: "pa-boton pa-boton--secundario", onClick: onCerrar }, "Cerrar")
      )
    ),
    cargando && !datos ? h(Cargando, { texto: "Cargando el boletín..." }) : error ? h(ErrorCarga, { error, onReintentar: recargar }) : h(BoletinDocumento, { datos })
  );
}

export function BoletinDigitalModal({ abierto, onCerrar, alumno }) {
  const alumnoId = idDelAlumno(alumno);

  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (evento) => evento.key === "Escape" && onCerrar?.();
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, onCerrar]);

  if (!abierto || !alumnoId) return null;

  return createPortal(
    h("div", { className: "pa pa--incrustado pa-modal", onClick: onCerrar }, h(Contenido, { alumnoId, onCerrar })),
    document.body
  );
}

export default BoletinDigitalModal;
