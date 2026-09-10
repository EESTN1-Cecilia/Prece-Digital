/* Resolucion de rutas y decision de acceso.

   Logica pura: no conoce React ni las vistas, asi que se puede probar sola y
   reutilizar desde cualquier componente que necesite saber si una ruta esta
   disponible (el guardia, el menu, los enlaces del pie).

   IMPORTANTE: esto es control de navegacion y experiencia de uso, no seguridad.
   La autorizacion real de cada operacion la sigue haciendo el backend, que
   vuelve a validar los permisos antes de ejecutar cualquier accion sensible.
   Ocultar una opcion o tapar una pantalla no protege nada por si solo. */

/* Resultados posibles de evaluar una ruta. */
export const ACCESO = {
  /* Todavia no se sabe quien es el usuario: no se decide nada. */
  esperar: "esperar",
  permitido: "permitido",
  /* Falta iniciar sesion. */
  login: "login",
  /* Hay sesion pero no alcanza el rol o el permiso. */
  denegado: "denegado",
  noEncontrada: "no-encontrada"
};

const PARAMETRO = /^:(.+)$/;

function segmentos(hash) {
  return hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}

/* Compara una ruta con su patron. `:algo` toma cualquier segmento y queda en
   los parametros; el resto tiene que coincidir tal cual. */
export function coincidePatron(patron, hash) {
  const esperados = segmentos(patron);
  const recibidos = segmentos(hash);

  if (esperados.length !== recibidos.length) {
    return null;
  }

  const parametros = {};

  for (let indice = 0; indice < esperados.length; indice += 1) {
    const esperado = esperados[indice];
    const recibido = recibidos[indice];
    const nombre = esperado.match(PARAMETRO);

    if (nombre) {
      parametros[nombre[1]] = decodeURIComponent(recibido);
      continue;
    }

    if (esperado.toLowerCase() !== recibido.toLowerCase()) {
      return null;
    }
  }

  return parametros;
}

/* Devuelve la primera ruta que coincide. El orden de la tabla importa:
   "#/usuarios/nuevo" tiene que estar antes que "#/usuarios/:id". */
export function resolverRuta(hash, rutas = []) {
  for (const ruta of rutas) {
    const parametros = coincidePatron(ruta.patron, hash);

    if (parametros) {
      return { ruta, parametros };
    }
  }

  return null;
}

function tienePermisos(ruta, sesion) {
  const requeridos = ruta.permisos ?? [];

  if (!requeridos.length) {
    return true;
  }

  const permisos = sesion?.permisos ?? [];

  if (permisos.includes("*")) {
    return true;
  }

  /* `todosLosPermisos` exige la lista completa; por defecto alcanza con uno. */
  return ruta.todosLosPermisos
    ? requeridos.every((permiso) => permisos.includes(permiso))
    : requeridos.some((permiso) => permisos.includes(permiso));
}

function tieneRol(ruta, sesion) {
  const requeridos = ruta.roles ?? [];

  if (!requeridos.length) {
    return true;
  }

  const propios = new Set((sesion?.roles ?? []).map((rol) => rol?.id ?? rol));

  return requeridos.some((rol) => propios.has(rol));
}

/* Decide que hacer con una ruta para la sesion actual.

   El orden de las comprobaciones evita el parpadeo y las redirecciones de mas:
   primero se espera a conocer la sesion, y recien despues se decide. Sin eso,
   durante la carga se manda al login a alguien que si tenia sesion. */
export function decidirAcceso(resultado, sesion) {
  if (!resultado) {
    return { tipo: ACCESO.noEncontrada };
  }

  const { ruta } = resultado;

  if (ruta.publica) {
    return { tipo: ACCESO.permitido };
  }

  if (sesion?.cargando) {
    return { tipo: ACCESO.esperar };
  }

  if (!sesion?.autenticado) {
    return { tipo: ACCESO.login, motivo: sesion?.expirada ? "expirada" : "sin-sesion" };
  }

  if (!tieneRol(ruta, sesion)) {
    return { tipo: ACCESO.denegado, roles: ruta.roles };
  }

  if (!tienePermisos(ruta, sesion)) {
    /* Se informa cual falta para que el mensaje sea util a quien administra. */
    return { tipo: ACCESO.denegado, permiso: ruta.permisos?.[0], permisos: ruta.permisos };
  }

  return { tipo: ACCESO.permitido };
}

/* Rutas que la sesion puede abrir hoy. Sirve para armar menus y enlaces sin que
   cada componente repita la comprobacion.

   Ocultar una opcion no reemplaza la proteccion: la ruta sigue evaluandose
   igual si alguien escribe la direccion a mano. */
export function rutasVisibles(rutas = [], sesion) {
  return rutas.filter((ruta) => {
    if (!ruta.enMenu) {
      return false;
    }

    return decidirAcceso({ ruta }, sesion).tipo === ACCESO.permitido;
  });
}

/* Arma el hash de una ruta reemplazando sus parametros. */
export function construirRuta(patron, parametros = {}) {
  return (
    "#/" +
    segmentos(patron)
      .map((segmento) => {
        const nombre = segmento.match(PARAMETRO);
        return nombre ? encodeURIComponent(parametros[nombre[1]] ?? "") : segmento;
      })
      .join("/")
  );
}
