/* Filtros del listado de personal.

   El listado de la pestana "Gestion de Personal y Roles" se muestra de dos
   formas (lista y tarjetas) pero sale siempre de la misma fuente: el arreglo
   de personal que cargo el panel. El filtrado vive aca, en funciones puras,
   para que las dos vistas queden siempre coherentes entre si y se pueda
   probar sin navegador. */

export const TODOS = "todos";

function valorFiltro(filtros, campo) {
  const valor = filtros?.[campo];
  return valor && valor !== TODOS ? valor : null;
}

export function filtrarPersonal(personal = [], filtros = {}) {
  const q = String(filtros.q ?? "").trim().toLowerCase();
  const rol = valorFiltro(filtros, "rol");
  const estado = valorFiltro(filtros, "estado");
  const area = valorFiltro(filtros, "area");

  return (personal ?? []).filter((persona) => {
    if (estado && persona.estado !== estado) {
      return false;
    }

    if (rol && !(persona.roles ?? []).some((rolAsignado) => rolAsignado.id === rol)) {
      return false;
    }

    if (area && persona.area !== area) {
      return false;
    }

    if (q) {
      const campos = [
        persona.nombre,
        persona.apellido,
        persona.nombreCompleto,
        persona.email,
        persona.dni,
        persona.area,
        persona.areaNombre
      ];

      const coincide = campos.some((campo) => String(campo ?? "").toLowerCase().includes(q));

      if (!coincide) {
        return false;
      }
    }

    return true;
  });
}

/* Texto del contador: dice cuantos miembros quedan de los que hay. */
export function resumenFiltro(cantidad, total, hayFiltros) {
  if (!hayFiltros) {
    return `${total} ${total === 1 ? "miembro" : "miembros"}`;
  }

  return `${cantidad} de ${total} ${total === 1 ? "miembro" : "miembros"}`;
}
