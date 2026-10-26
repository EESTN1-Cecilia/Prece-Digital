import { userRepository } from "../database/repositories/user.repository.mjs";
import preceptorAsignacionesService from "../modules/preceptor/preceptor-asignaciones.service.mjs";
import { DIVISIONES_CATALOGO } from "../modules/students/catalogo.mjs";

/* Utilidades de los tests.

   `rutas()` arma, a partir de un mapa { "GET /ruta": handler }, la lista de rutas
   con el mismo formato que routes/index.mjs, que es el unico que acepta createApp. */
export function rutas(mapa) {
  return Object.entries(mapa).map(([clave, handler]) => {
    const [method, path] = clave.split(" ");
    return { method, path, handler };
  });
}

/* El preceptor de prueba ve solo las divisiones que le asigna Direccion. Las
   pruebas que no tratan el alcance por curso (observaciones, condiciones,
   alertas...) usan alumnos de varios cursos: se le asignan todas, por el mismo
   servicio que usa Direccion. */
export function asignarTodasLasDivisiones(email = "preceptor@prece.local") {
  const preceptor = userRepository.findByEmail(email);

  for (const { anio, division } of DIVISIONES_CATALOGO) {
    preceptorAsignacionesService.asignar({
      params: { cursoId: `${anio}-${division}` },
      body: { preceptorId: preceptor.id },
      user: preceptor
    });
  }
}
