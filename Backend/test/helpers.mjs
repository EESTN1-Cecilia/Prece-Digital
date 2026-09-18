/* Utilidades de los tests.

   `rutas()` arma, a partir de un mapa { "GET /ruta": handler }, la lista de rutas
   con el mismo formato que routes/index.mjs, que es el unico que acepta createApp. */
export function rutas(mapa) {
  return Object.entries(mapa).map(([clave, handler]) => {
    const [method, path] = clave.split(" ");
    return { method, path, handler };
  });
}
