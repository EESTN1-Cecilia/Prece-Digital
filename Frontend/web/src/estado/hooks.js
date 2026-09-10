/* Acceso al estado global.

   Las pantallas usan estos hooks y no el contexto directamente: si manana cambia
   la implementacion interna, la firma que ve cada modulo sigue igual. */

import { useContext, useMemo } from "react";
import { ContextoEstado, FASE, SESION } from "./proveedor.js";
import { puede as tienePermiso } from "../utils/permisos.js";

function contexto() {
  const valor = useContext(ContextoEstado);

  if (!valor) {
    throw new Error("Falta ProveedorEstado: envolve la aplicacion antes de usar el estado global.");
  }

  return valor;
}

/* Usuario autenticado y estado de la sesion. */
export function useSesion() {
  const { estado, acciones } = contexto();
  const { sesion } = estado;

  return {
    ...sesion,
    /* `cargando` es lo que mira una pantalla para no renderizar todavia. */
    cargando: sesion.estado === SESION.cargando,
    /* Revalidacion en segundo plano: no corresponde tapar la pantalla por esto. */
    revalidando: estado.revalidando,
    autenticado: sesion.estado === SESION.autenticada,
    expirada: sesion.estado === SESION.expirada,
    aplicacionLista: estado.fase === FASE.lista,
    refrescar: acciones.refrescarSesion,
    iniciarSesion: acciones.iniciarSesion,
    cerrarSesion: acciones.cerrarSesion,
    cambiarPerfilDemo: acciones.cambiarPerfilDemo
  };
}

/* Roles y permisos del usuario. Sirve para ocultar controles y armar menus;
   nunca reemplaza la validacion del backend. */
export function usePermisos() {
  const { estado } = contexto();
  const { permisos, roles, alcances, estado: situacion } = estado.sesion;

  return useMemo(() => {
    const codigosDeRol = new Set(roles.map((rol) => rol?.id ?? rol));

    return {
      permisos,
      roles,
      alcances,
      cargando: situacion === SESION.cargando,
      puede: (permiso) => tienePermiso({ permisos }, permiso),
      tieneRol: (rol) => codigosDeRol.has(rol),
      /* Alcanza con uno de la lista: util para menus que abren varias secciones. */
      puedeAlguno: (lista = []) => lista.some((permiso) => tienePermiso({ permisos }, permiso))
    };
  }, [permisos, roles, alcances, situacion]);
}

/* Notificaciones del usuario. El Header las consulta para el indicador de
   pendientes y el centro de notificaciones para el listado. */
export function useNotificaciones() {
  const { estado, acciones } = contexto();
  const { items, cargando, error, origen } = estado.notificaciones;

  const noLeidas = useMemo(() => items.filter((item) => !item.leida).length, [items]);

  return {
    items,
    noLeidas,
    total: items.length,
    cargando,
    error,
    origen,
    refrescar: acciones.refrescarNotificaciones,
    marcarLeida: acciones.marcarNotificacionLeida,
    marcarTodasLeidas: acciones.marcarTodasLeidas
  };
}

/* Error que afecta a toda la aplicacion: sesion caida, servidor inaccesible.
   Los errores de una pantalla los sigue manejando esa pantalla. */
export function useErrorGlobal() {
  const { estado, acciones } = contexto();

  return {
    error: estado.errorGlobal,
    mostrar: acciones.mostrarErrorGlobal,
    limpiar: acciones.limpiarErrorGlobal
  };
}

/* Carga global: solo lo que impide usar la aplicacion. La carga de una seccion
   se resuelve con estado local y los componentes Cargando o Esqueleto, y la de
   una accion con la propiedad `cargando` del boton. */
export function useCarga() {
  const { estado, acciones } = contexto();

  return {
    inicializando: estado.fase === FASE.inicializando,
    global: estado.cargas.length > 0,
    claves: estado.cargas,
    iniciar: acciones.iniciarCarga,
    terminar: acciones.terminarCarga
  };
}
