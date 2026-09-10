/* Armado del menu lateral y de las migas de navegacion.

   Logica pura, sin React: se prueba sola y la usan tanto el sidebar como el
   encabezado.

   Todo sale de la misma tabla de rutas que usa el guardia (app/rutas.js). Asi
   no hay dos listas que mantener en paralelo ni enlaces que apunten a pantallas
   que no existen o que la sesion no puede abrir. */

import { ACCESO, coincidePatron, construirRuta, decidirAcceso } from "../app/navegacion.js";

/* Secciones del menu, en el orden en que se muestran. Una ruta sin seccion
   declarada cae en "General". */
const ORDEN_SECCIONES = ["General", "Identidad y acceso"];

function ordenDeSeccion(nombre) {
  const posicion = ORDEN_SECCIONES.indexOf(nombre);
  return posicion === -1 ? ORDEN_SECCIONES.length : posicion;
}

/* Menu de la sesion: solo las rutas marcadas para el menu que ademas puede
   abrir, agrupadas por seccion.

   Ocultar una opcion no protege la ruta: el guardia la evalua igual si alguien
   escribe la direccion a mano. */
export function armarMenu(rutas = [], sesion) {
  const secciones = new Map();

  for (const ruta of rutas) {
    if (!ruta.enMenu) {
      continue;
    }

    if (decidirAcceso({ ruta }, sesion).tipo !== ACCESO.permitido) {
      continue;
    }

    const nombre = ruta.seccion ?? "General";

    if (!secciones.has(nombre)) {
      secciones.set(nombre, { nombre, entradas: [] });
    }

    secciones.get(nombre).entradas.push({
      titulo: ruta.titulo,
      href: ruta.patron,
      icono: ruta.icono
    });
  }

  return [...secciones.values()].sort(
    (una, otra) => ordenDeSeccion(una.nombre) - ordenDeSeccion(otra.nombre)
  );
}

/* Entrada del menu que corresponde a la ruta actual.

   Se sube por la cadena de `padre` y gana la primera entrada del menu que se
   encuentra, es decir la mas cercana. Estando en el detalle de un usuario queda
   marcado "Usuarios", y no tambien "Inicio" solo porque el listado cuelgue de
   el para armar las migas. */
export function hrefActivo(hash, rutas = [], hrefsMenu = []) {
  const enElMenu = new Set(hrefsMenu);

  let actual = rutas.find((ruta) => coincidePatron(ruta.patron, hash));
  const vistas = new Set();

  while (actual && !vistas.has(actual.patron)) {
    vistas.add(actual.patron);

    if (enElMenu.has(actual.patron)) {
      return actual.patron;
    }

    actual = actual.padre ? rutas.find((ruta) => ruta.patron === actual.padre) : null;
  }

  return null;
}

/* Migas de la ruta actual, del ancestro mas lejano al mas cercano.

   Se arman siguiendo la cadena de `padre` de la tabla de rutas, y los nombres
   salen del titulo declarado ahi: nunca se muestran rutas tecnicas ni nombres
   internos de componentes. La ultima miga es la pantalla actual y no enlaza a
   ningun lado. */
export function construirMigas(hash, rutas = [], sesion) {
  const resultado = rutas
    .map((ruta) => ({ ruta, parametros: coincidePatron(ruta.patron, hash) }))
    .find((candidata) => candidata.parametros);

  if (!resultado) {
    return [];
  }

  const migas = [];
  let actual = resultado.ruta;
  /* Corta cualquier cadena mal armada que se cierre sobre si misma. */
  const vistas = new Set();

  while (actual && !vistas.has(actual.patron)) {
    vistas.add(actual.patron);

    migas.unshift({
      titulo: actual.titulo ?? actual.patron,
      /* Los parametros de la ruta actual sirven para los ancestros que los
         compartan: "#/usuarios/:id/editar" cuelga de "#/usuarios/:id". */
      href: construirRuta(actual.patron, resultado.parametros),
      patron: actual.patron
    });

    actual = actual.padre ? rutas.find((ruta) => ruta.patron === actual.padre) : null;
  }

  /* Un ancestro que la sesion no puede abrir se muestra sin enlace, para no
     ofrecer un camino que despues termina en acceso denegado. */
  return migas.map((miga, indice) => {
    const ruta = rutas.find((candidata) => candidata.patron === miga.patron);
    const esActual = indice === migas.length - 1;
    const disponible = ruta && decidirAcceso({ ruta }, sesion).tipo === ACCESO.permitido;

    return { ...miga, actual: esActual, href: esActual || !disponible ? null : miga.href };
  });
}
