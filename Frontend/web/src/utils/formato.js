/* Formato de datos para mostrar en pantalla. Funciones puras, sin estado ni HTTP. */

const SIN_DATO = "—";

/* Fecha y hora en el formato local. Un valor vacio o invalido nunca rompe la
   vista: se muestra el guion o el texto original tal cual llego. */
export function fecha(valor) {
  if (!valor) {
    return SIN_DATO;
  }

  const momento = new Date(valor);

  if (Number.isNaN(momento.getTime())) {
    return String(valor);
  }

  return momento.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* Solo el dia, sin hora. */
export function fechaCorta(valor) {
  if (!valor) {
    return SIN_DATO;
  }

  const momento = new Date(valor);

  if (Number.isNaN(momento.getTime())) {
    return String(valor);
  }

  return momento.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function textoOGuion(valor) {
  return valor === null || valor === undefined || valor === "" ? SIN_DATO : valor;
}
