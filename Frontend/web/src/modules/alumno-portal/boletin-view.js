/* Mi Boletin: calificaciones por periodo, final y estado de cada materia del
   ciclo elegido, con impresion en A4. Solo muestra lo que registraron los
   docentes: no promedia ni completa notas. */

import { useState } from "react";
import { h, Cargando, Encabezado, ErrorCarga, Icono, SelectorCiclo, useDatos } from "./componentes.js";
import { BoletinDocumento } from "../boletin/boletin-documento.js";
import { descargarBoletinPdf } from "../boletin/boletin-pdf.js";
import { obtenerBoletin } from "./portal-api.js";

export default function BoletinAlumnoView() {
  const [anio, setAnio] = useState(null);
  const { cargando, error, datos, recargar } = useDatos(() => obtenerBoletin(anio), [anio]);
  const [descargando, setDescargando] = useState(false);
  const [falloDescarga, setFalloDescarga] = useState(false);

  async function descargar() {
    setDescargando(true);
    setFalloDescarga(false);
    try {
      await descargarBoletinPdf(datos);
    } catch {
      setFalloDescarga(true);
    } finally {
      setDescargando(false);
    }
  }

  if (cargando && !datos) return h(Cargando);
  if (error) return h(ErrorCarga, { error, onReintentar: recargar });

  const { cicloLectivo, aniosDisponibles } = datos;

  return h(
    "div",
    { className: "pa-pagina" },
    h(
      Encabezado,
      { titulo: "Mi Boletín", descripcion: `Ciclo lectivo ${cicloLectivo}` },
      h(SelectorCiclo, { anios: aniosDisponibles, valor: cicloLectivo, onCambiar: setAnio }),
      h("button", { type: "button", className: "pa-boton pa-boton--secundario", disabled: descargando, onClick: descargar }, h(Icono, { nombre: "descarga", tamano: 18 }), descargando ? "Generando PDF..." : "Descargar PDF"),
      h("button", { type: "button", className: "pa-boton pa-boton--primario", onClick: () => window.print() }, h(Icono, { nombre: "impresora", tamano: 18 }), "Imprimir boletín")
    ),
    falloDescarga ? h("div", { className: "pa-aviso pa-aviso--error", role: "alert" }, h("p", null, "No se pudo generar el PDF. Probá de nuevo o usá Imprimir boletín y elegí guardar como PDF.")) : null,
    h(BoletinDocumento, { datos })
  );
}
