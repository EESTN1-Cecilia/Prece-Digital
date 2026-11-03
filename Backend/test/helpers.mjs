/* Utilidades de los tests.

   `rutas()` arma, a partir de un mapa { "GET /ruta": handler }, la lista de rutas
   con el mismo formato que routes/index.mjs, que es el unico que acepta createApp. */
export function rutas(mapa) {
  return Object.entries(mapa).map(([clave, handler]) => {
    const [method, path] = clave.split(" ");
    return { method, path, handler };
  });
}

/* El seed deja al preceptor general con un solo curso (1° 1°), como lo haria
   la Direccion. Los tests de funcionalidad general (no de alcance) le asignan
   el resto de los cursos, menos 2° 2° y 5° 3° que son de Carlos Ramos. */
export async function asignarCursosAlPreceptorGeneral() {
  const { userRepository } = await import("../database/repositories/user.repository.mjs");
  const { DIVISIONES_CATALOGO } = await import("../modules/students/catalogo.mjs");
  const { default: asignaciones } = await import("../modules/preceptor-assignments/preceptor-assignments.service.mjs");
  const preceptor = userRepository.findByEmail("preceptor@prece.local");
  const divisiones = DIVISIONES_CATALOGO.map(({ anio, division }) => `${anio}-${division}`).filter((clave) => !["2-2", "5-3"].includes(clave));
  asignaciones.asignar({ divisiones, preceptorId: preceptor.id });
}
