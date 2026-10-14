/* Estado de sesion de la aplicacion.

   Regla central: los roles y permisos NUNCA se deciden aqui. Vienen de
   GET /api/v1/auth/me y solo se usan para mostrar u ocultar pantallas.
   La seguridad sigue estando en el Backend. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { suscribirAEstadoDeSesion } from "../../services/api.js";
import { cerrarSesion, iniciarSesion, obtenerSesion } from "../../services/auth-api.js";
import { cargarTokensGuardados, leerAccessToken } from "../../services/session-tokens.js";

const h = React.createElement;

export const ESTADO_INICIANDO = "iniciando";
export const ESTADO_ANONIMO = "anonimo";
export const ESTADO_AUTENTICADO = "autenticado";

const Contexto = createContext(null);

const SESION_VACIA = { usuario: null, roles: [], permisos: [], alcances: [] };

export function ProveedorDeSesion({ children }) {
  const [estado, setEstado] = useState(ESTADO_INICIANDO);
  const [sesion, setSesion] = useState(SESION_VACIA);
  const inicializando = useRef(false);

  /* Al abrir la app se restaura la sesion guardada y se valida contra
     /auth/me. Si no hay access token o el Backend la rechaza, se entra
     al login sin inventar reglas propias. */
  useEffect(() => {
    let vigente = true;
    inicializando.current = true;

    (async () => {
      try {
        await cargarTokensGuardados();
      } catch {
        /* Sin almacen seguro no hay sesion persistente: se entra al login y
           queda claro en el aviso de error al intentar iniciar sesion. */
        if (vigente) {
          inicializando.current = false;
          setEstado(ESTADO_ANONIMO);
        }

        return;
      }

      if (!vigente) {
        return;
      }

      if (!leerAccessToken()) {
        inicializando.current = false;
        setEstado(ESTADO_ANONIMO);
        return;
      }

      try {
        const actual = await obtenerSesion();

        if (vigente) {
          setSesion(actual);
          setEstado(ESTADO_AUTENTICADO);
        }
      } catch {
        if (vigente) {
          setSesion(SESION_VACIA);
          setEstado(ESTADO_ANONIMO);
        }
      } finally {
        inicializando.current = false;
      }
    })();

    return () => {
      vigente = false;
    };
  }, []);

  /* El cliente HTTP invalida la sesion cuando un 401 no se puede renovar. */
  useEffect(
    () =>
      suscribirAEstadoDeSesion(() => {
        setSesion(SESION_VACIA);
        setEstado(ESTADO_ANONIMO);
      }),
    []
  );

  /* Al volver del background se revisa la sesion: si el token vencio o fue
     revocado, el Backend responde 401 y el listener de arriba vuelve al login. */
  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", (siguiente) => {
      if (siguiente !== "active" || inicializando.current) {
        return;
      }

      if (!leerAccessToken()) {
        return;
      }

      obtenerSesion().then(
        (actual) => {
          setSesion(actual);
          setEstado(ESTADO_AUTENTICADO);
        },
        () => {}
      );
    });

    return () => suscripcion.remove();
  }, []);

  const login = useCallback(async (credenciales) => {
    const actual = await iniciarSesion(credenciales);
    setSesion(actual);
    setEstado(ESTADO_AUTENTICADO);
    return actual;
  }, []);

  const logout = useCallback(async () => {
    try {
      await cerrarSesion();
    } finally {
      setSesion(SESION_VACIA);
      setEstado(ESTADO_ANONIMO);
    }
  }, []);

  /* Solo usabilidad: oculta opciones. No reemplaza la autorizacion del Backend. */
  const puede = useCallback((permiso) => sesion.permisos.includes(permiso), [sesion.permisos]);

  const valor = useMemo(
    () => ({ estado, sesion, iniciarSesion: login, cerrarSesion: logout, puede }),
    [estado, sesion, login, logout, puede]
  );

  return h(Contexto.Provider, { value: valor }, children);
}

export function useSesion() {
  const valor = useContext(Contexto);

  if (!valor) {
    throw new Error("useSesion debe usarse dentro de ProveedorDeSesion");
  }

  return valor;
}