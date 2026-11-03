/* Nombres legibles de los roles, a partir del catálogo de dominio compartido
   (Shared/src/domain.mjs). Mobile no inventa roles: si el backend devuelve un
   código que no está en el catálogo se muestra el código tal cual. */

import { roles as catalogoRoles } from "../../../../Shared/src/domain.mjs";

const rolesPorId = new Map(catalogoRoles.map((rol) => [rol.id, rol.name]));

/* Devuelve el nombre visible de un rol; tolera objetos ya normalizados. */
export function nombreDeRol(rol) {
  const codigo = typeof rol === "string" ? rol : (rol?.id ?? rol?.nombre ?? rol?.codigo ?? "");
  const normalizado = String(codigo ?? "");

  if (!normalizado) {
    return "";
  }

  return rolesPorId.get(normalizado) ?? normalizado;
}

/* Lista de nombres legibles para mostrar en pantalla. */
export function nombresDeRol(roles = []) {
  return (Array.isArray(roles) ? roles : []).map(nombreDeRol).filter(Boolean);
}
