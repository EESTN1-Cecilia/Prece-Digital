/* Estado de sesion de la aplicacion.

   Regla central: los roles y permisos NUNCA se deciden aqui. Vienen de
   GET /api/v1/auth/me y solo se usan para mostrar u ocultar pantallas.
   La seguridad sigue estando en el Backend. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { suscribirAEstadoDeSesion } from "../../services/api.js";
import { cerrarSesion, iniciarSesion, obtenerSesion } from "../../services/auth-api.js";
import { biometriaActivada, debeBloquear, desactivarBiometria, estadoBiometria, pedirBiometria } from "../../services/biometria.js";
import { cargarTokensGuardados, leerAccessToken, limpiarTokens } from "../../services/session-tokens.js";

const h = React.createElement;

export const ESTADO_INICIANDO = "iniciando";
export const ESTADO_ANONIMO = "anonimo";
export const ESTADO_AUTENTICADO = "autenticado";
/* Hay sesion guardada, pero falta la biometria para mostrarla. */
export const ESTADO_BLOQUEADO = "bloqueado";

const Contexto = createContext(null);

const SESION_VACIA = { usuario: null, roles: [], permisos: [], alcances: [] };

export function ProveedorDeSesion({ children }) {
  const [estado, setEstado] = useState(ESTADO_INICIANDO);
  const [sesion, setSesion] = useState(SESION_VACIA);
  const [nombreBiometria, setNombreBiometria] = useState("biometría");
  const inicializando = useRef(false);
  const bloqueada = useRef(false);
  const salioEn = useRef(null);

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

      /* Con biometria activada la sesion guardada no se muestra hasta verificarla. */
      if (await biometriaActivada()) {
        const { nombre } = await estadoBiometria(Platform.OS);

        if (vigente) {
          setNombreBiometria(nombre);
          bloqueada.current = true;
          inicializando.current = false;
          setEstado(ESTADO_BLOQUEADO);
        }

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
        bloqueada.current = false;
        setSesion(SESION_VACIA);
        setEstado(ESTADO_ANONIMO);
      }),
    []
  );

  /* Al volver del background se revisa la sesion: si el token vencio o fue
     revocado, el Backend responde 401 y el listener de arriba vuelve al login. */
  useEffect(() => {
    const suscripcion = AppState.addEventListener("change", async (siguiente) => {
      if (siguiente !== "active") {
        if (salioEn.current === null) salioEn.current = Date.now();
        return;
      }

      const segundos = salioEn.current === null ? 0 : (Date.now() - salioEn.current) / 1000;
      salioEn.current = null;

      if (inicializando.current || bloqueada.current || !leerAccessToken()) {
        return;
      }

      /* Tras un rato afuera se vuelve a pedir la biometria (si esta activada). */
      if (debeBloquear({ activada: await biometriaActivada(), segundosEnSegundoPlano: segundos })) {
        const { nombre } = await estadoBiometria(Platform.OS);
        setNombreBiometria(nombre);
        bloqueada.current = true;
        setEstado(ESTADO_BLOQUEADO);
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
      /* Cerrar sesion a proposito tambien apaga la biometria de este equipo. */
      await desactivarBiometria();
      bloqueada.current = false;
      setSesion(SESION_VACIA);
      setEstado(ESTADO_ANONIMO);
    }
  }, []);

  /* Desbloqueo: biometria OK -> se valida la sesion guardada contra /auth/me.
     Devuelve true si se pudo entrar. Si la sesion ya no es valida, vuelve al login. */
  const desbloquear = useCallback(async () => {
    const resultado = await pedirBiometria("Desbloqueá Prece Digital");

    if (!resultado.ok) {
      return false;
    }

    try {
      const actual = await obtenerSesion();
      bloqueada.current = false;
      setSesion(actual);
      setEstado(ESTADO_AUTENTICADO);
      return true;
    } catch {
      bloqueada.current = false;
      setSesion(SESION_VACIA);
      setEstado(ESTADO_ANONIMO);
      return true;
    }
  }, []);

  /* "Usar contraseña": se descarta la sesion guardada y se pide el login completo. */
  const usarPassword = useCallback(async () => {
    try {
      await cerrarSesion();
    } catch {
      /* Si el Backend no responde igual se limpia lo local. */
    }

    await limpiarTokens().catch(() => {});
    await desactivarBiometria();
    bloqueada.current = false;
    setSesion(SESION_VACIA);
    setEstado(ESTADO_ANONIMO);
  }, []);

  /* Solo usabilidad: oculta opciones. No reemplaza la autorizacion del Backend. */
  const puede = useCallback((permiso) => sesion.permisos.includes(permiso), [sesion.permisos]);

  const valor = useMemo(
    () => ({ estado, sesion, iniciarSesion: login, cerrarSesion: logout, puede, desbloquear, usarPassword, nombreBiometria }),
    [estado, sesion, login, logout, puede, desbloquear, usarPassword, nombreBiometria]
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