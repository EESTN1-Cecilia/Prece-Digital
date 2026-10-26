import { useCallback, useEffect, useState } from "react";
import { PortalDocenteService } from "../portal-docente-service.js";

/* Cursos asignados al docente autenticado, con carga y error. */
export function useMisCursos() {
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    PortalDocenteService.misCursos()
      .then((lista) => {
        if (vigente) {
          setCursos(lista);
          setError(null);
        }
      })
      .catch((fallo) => vigente && setError(fallo))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [recarga]);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);

  return { cursos, cargando, error, recargar };
}
