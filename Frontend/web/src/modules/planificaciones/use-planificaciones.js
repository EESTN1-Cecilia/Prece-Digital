/* Hooks del modulo de planificaciones.

   Concentran la carga de catalogos y consultas para que cada pantalla no
   repita el patron cargando/error/reintento ni descarte mal una respuesta
   que llega tarde (la bandera `vigente` ignora pedidos ya reemplazados). */

import { useCallback, useEffect, useState } from "react";
import { PlanificacionesService } from "./planificaciones-service.js";

/* Catalogo (estados, secciones, turnos, periodos) + combinaciones planificables.
   `incluirInactivas` suma asignaciones dadas de baja: sirve para filtrar y
   consultar planificaciones historicas, no para cargar nuevas. */
export function useCatalogosPlanificaciones({ incluirInactivas = true } = {}) {
  const [estado, setEstado] = useState({ catalogos: null, combinaciones: [], cargando: true, error: null });
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado((actual) => ({ ...actual, cargando: true, error: null }));

    Promise.all([
      PlanificacionesService.obtenerCatalogos(),
      PlanificacionesService.obtenerOpciones(incluirInactivas ? { incluirInactivas: "true" } : {})
    ])
      .then(([catalogos, opciones]) => {
        if (vigente) {
          setEstado({ catalogos, combinaciones: opciones?.combinaciones ?? [], cargando: false, error: null });
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setEstado({ catalogos: null, combinaciones: [], cargando: false, error: fallo });
        }
      });

    return () => {
      vigente = false;
    };
  }, [incluirInactivas, recarga]);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { ...estado, recargar };
}

/* Consulta generica: vuelve a pedir cuando cambian las dependencias y expone
   `recargar` para despues de una operacion. Sin `habilitada` no pide nada
   (por ejemplo, mientras no se eligio un docente). */
export function useConsulta(cargar, dependencias, { habilitada = true } = {}) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(habilitada);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!habilitada) {
      setDatos(null);
      setCargando(false);
      setError(null);
      return undefined;
    }

    let vigente = true;
    setCargando(true);

    cargar()
      .then((respuesta) => {
        if (vigente) {
          setDatos(respuesta);
          setError(null);
        }
      })
      .catch((fallo) => {
        if (vigente) {
          /* No se dejan en pantalla datos de una consulta anterior. */
          setDatos(null);
          setError(fallo);
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, habilitada, recarga]);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { datos, cargando, error, recargar };
}
