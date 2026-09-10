/* Catalogo de modulos del sistema (GET /api/v1/modules).
   Usa el cliente comun de services/http.js: el manejo de errores es el mismo que
   el del resto de la aplicacion. */

import { useEffect, useState } from "react";
import { pedir } from "./http.js";

export function getModules() {
  return pedir("/api/v1/modules", { recurso: "el catalogo de modulos" });
}

export function useCatalogModules() {
  const [estado, setEstado] = useState({ modules: [], error: null, cargando: true });

  useEffect(() => {
    let vigente = true;

    getModules()
      .then((modules) => {
        if (vigente) {
          setEstado({ modules, error: null, cargando: false });
        }
      })
      .catch((error) => {
        if (vigente) {
          setEstado({ modules: [], error, cargando: false });
        }
      });

    return () => {
      vigente = false;
    };
  }, []);

  return estado;
}
