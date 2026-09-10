/* Estado global de la aplicacion.

   Una sola fuente de verdad para lo que se comparte entre pantallas: el usuario
   autenticado, la sesion, sus roles y permisos, las notificaciones, el error
   global y las cargas que bloquean el arranque.

   Antes cada vista llamaba a `useSesion()` por su cuenta y disparaba su propio
   GET /api/v1/me: cuatro pedidos para el mismo dato y cuatro copias que podian
   quedar desincronizadas. Ahora el pedido se hace una vez, aca.

   Lo que NO va en el estado global: filtros de una tabla, texto de un input,
   modal abierto, pestana elegida u orden de una columna. Eso es estado local de
   cada pantalla y se resuelve con useState.

   Los permisos que guarda este estado sirven para ocultar o deshabilitar
   controles. La validacion definitiva la hace siempre el backend. */

/* `createElement` se toma de react y no de layouts/site-layout.js: el layout usa
   el estado global, asi que importarlo desde aca cerraria un ciclo. */
import React, { createContext, useCallback, useEffect, useMemo, useReducer, useRef } from "react";

const h = React.createElement;
import { EVENTO_SESION_EXPIRADA, guardarToken, reiniciarSesionExpirada } from "../services/http.js";
import { obtenerSesion, sesionDemo } from "../services/identity-api.js";
import { listarNotificaciones, marcarNotificacionLeida } from "../services/notificaciones-api.js";

export const ContextoEstado = createContext(null);

/* Estados posibles de la sesion. La aplicacion no decide nada mientras esta en
   "cargando": evita el parpadeo de mostrar el login a alguien que si tiene sesion. */
export const SESION = {
  cargando: "cargando",
  autenticada: "autenticada",
  anonima: "anonima",
  expirada: "expirada"
};

/* Fases de la aplicacion. "inicializando" cubre desde el arranque hasta que se
   resolvio la sesion; recien ahi se puede renderizar lo que depende del usuario. */
export const FASE = {
  inicializando: "inicializando",
  lista: "lista",
  error: "error"
};

export const ESTADO_INICIAL = {
  fase: FASE.inicializando,
  sesion: {
    estado: SESION.cargando,
    usuario: null,
    roles: [],
    permisos: [],
    alcances: [],
    origen: null,
    perfilDemo: null
  },
  notificaciones: {
    items: [],
    cargando: false,
    error: null,
    origen: null
  },
  /* Revalidando la sesion en segundo plano, sin bloquear la pantalla. */
  revalidando: false,
  errorGlobal: null,
  /* Cargas globales en curso, por clave, para no encimar indicadores. */
  cargas: []
};

function normalizarSesion(datos, origen) {
  return {
    estado: SESION.autenticada,
    usuario: datos?.usuario ?? null,
    roles: datos?.usuario?.roles ?? [],
    permisos: datos?.permisos ?? [],
    alcances: datos?.alcances ?? [],
    origen,
    perfilDemo: datos?.perfilDemo ?? null
  };
}

export function reducir(estado, accion) {
  switch (accion.tipo) {
    /* Un refresco silencioso revalida sin volver a la pantalla de arranque: la
       aplicacion sigue usable mientras tanto. Solo la carga inicial bloquea. */
    case "sesion/cargando":
      return accion.silencioso
        ? { ...estado, revalidando: true }
        : {
          ...estado,
          fase: FASE.inicializando,
          revalidando: false,
          sesion: { ...estado.sesion, estado: SESION.cargando }
        };

    case "sesion/lista":
      return {
        ...estado,
        fase: FASE.lista,
        revalidando: false,
        sesion: normalizarSesion(accion.datos, accion.origen)
      };

    case "sesion/anonima":
      return {
        ...estado,
        fase: FASE.lista,
        sesion: { ...ESTADO_INICIAL.sesion, estado: SESION.anonima }
      };

    /* La sesion vencio: se limpia todo lo que dependia del usuario para que
       ninguna pantalla siga mostrando datos de una sesion que ya no existe. */
    case "sesion/expirada":
      return {
        ...estado,
        fase: FASE.lista,
        sesion: { ...ESTADO_INICIAL.sesion, estado: SESION.expirada },
        notificaciones: ESTADO_INICIAL.notificaciones,
        errorGlobal: {
          esSesionExpirada: true,
          mensaje: "Tu sesion expiro. Inicia sesion nuevamente para continuar."
        }
      };

    case "notificaciones/cargando":
      return {
        ...estado,
        notificaciones: { ...estado.notificaciones, cargando: true, error: null }
      };

    case "notificaciones/listas":
      return {
        ...estado,
        notificaciones: {
          items: accion.items,
          cargando: false,
          error: null,
          origen: accion.origen
        }
      };

    case "notificaciones/error":
      return {
        ...estado,
        notificaciones: { ...estado.notificaciones, cargando: false, error: accion.error }
      };

    case "notificaciones/leida":
      return {
        ...estado,
        notificaciones: {
          ...estado.notificaciones,
          items: estado.notificaciones.items.map((item) =>
            item.id === accion.id ? { ...item, leida: true } : item
          )
        }
      };

    case "notificaciones/todas-leidas":
      return {
        ...estado,
        notificaciones: {
          ...estado.notificaciones,
          items: estado.notificaciones.items.map((item) => ({ ...item, leida: true }))
        }
      };

    case "error-global/mostrar":
      return { ...estado, errorGlobal: accion.error };

    case "error-global/limpiar":
      return { ...estado, errorGlobal: null };

    case "carga/iniciar":
      return estado.cargas.includes(accion.clave)
        ? estado
        : { ...estado, cargas: [...estado.cargas, accion.clave] };

    case "carga/terminar":
      return { ...estado, cargas: estado.cargas.filter((clave) => clave !== accion.clave) };

    default:
      return estado;
  }
}

export function ProveedorEstado({ children }) {
  const [estado, despachar] = useReducer(reducir, ESTADO_INICIAL);
  /* Evita aplicar la respuesta de un pedido que quedo viejo. */
  const vigente = useRef(true);

  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);

  const cargarSesion = useCallback(async ({ silencioso = false } = {}) => {
    despachar({ tipo: "sesion/cargando", silencioso });

    const { data, origen } = await obtenerSesion();

    if (vigente.current) {
      despachar({ tipo: "sesion/lista", datos: data, origen });
    }
  }, []);

  /* Arranque: primero la sesion, porque el resto depende de saber quien entra. */
  useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  /* Un 401 de cualquier pantalla llega aca por el evento que emite services/http.js. */
  useEffect(() => {
    const alExpirar = () => {
      despachar({ tipo: "sesion/expirada" });
      window.location.hash = "#/login";
    };

    window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
  }, []);

  const cargarNotificaciones = useCallback(async () => {
    despachar({ tipo: "notificaciones/cargando" });

    try {
      const { data, origen } = await listarNotificaciones();

      if (vigente.current) {
        despachar({ tipo: "notificaciones/listas", items: data, origen });
      }
    } catch (error) {
      if (vigente.current) {
        despachar({ tipo: "notificaciones/error", error });
      }
    }
  }, []);

  /* Las notificaciones se piden una vez resuelta la sesion, no antes: sin usuario
     no hay a quien notificar. */
  useEffect(() => {
    if (estado.sesion.estado === SESION.autenticada) {
      cargarNotificaciones();
    }
  }, [estado.sesion.estado, cargarNotificaciones]);

  /* Al volver a la pestana se relee la sesion. Si mientras tanto le cambiaron los
     permisos, la interfaz deja de mostrar los viejos. */
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible" && estado.sesion.estado === SESION.autenticada) {
        cargarSesion({ silencioso: true });
      }
    };

    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [estado.sesion.estado, cargarSesion]);

  const acciones = useMemo(
    () => ({
      refrescarSesion: cargarSesion,

      cerrarSesion() {
        guardarToken(null);
        reiniciarSesionExpirada();
        despachar({ tipo: "sesion/anonima" });
        window.location.hash = "#/login";
      },

      /* Solo mientras GET /api/v1/me no exista: permite mirar las pantallas con
         distintos permisos sin tocar codigo. */
      cambiarPerfilDemo(perfilId) {
        despachar({ tipo: "sesion/lista", datos: sesionDemo(perfilId), origen: "demo" });
      },

      refrescarNotificaciones: cargarNotificaciones,

      async marcarNotificacionLeida(id) {
        /* Se marca en pantalla y se avisa al backend. Si el backend rechaza, el
           proximo refresco devuelve el estado real: no se pierde nada. */
        despachar({ tipo: "notificaciones/leida", id });

        try {
          await marcarNotificacionLeida(id);
        } catch (error) {
          despachar({ tipo: "notificaciones/error", error });
        }
      },

      marcarTodasLeidas() {
        despachar({ tipo: "notificaciones/todas-leidas" });
      },

      mostrarErrorGlobal(error) {
        despachar({ tipo: "error-global/mostrar", error });
      },

      limpiarErrorGlobal() {
        reiniciarSesionExpirada();
        despachar({ tipo: "error-global/limpiar" });
      },

      iniciarCarga(clave) {
        despachar({ tipo: "carga/iniciar", clave });
      },

      terminarCarga(clave) {
        despachar({ tipo: "carga/terminar", clave });
      }
    }),
    [cargarSesion, cargarNotificaciones]
  );

  const valor = useMemo(() => ({ estado, acciones }), [estado, acciones]);

  return h(ContextoEstado.Provider, { value: valor }, children);
}
