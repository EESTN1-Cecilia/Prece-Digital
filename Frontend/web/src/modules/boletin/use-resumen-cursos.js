import { useEffect, useMemo, useState } from "react";
import { BoletinOficialService } from "./boletin-oficial-service.js";
import { buscarNota } from "./boletin-oficial-datos.js";

/* Indicadores "calificado / sin calificar" de las pantallas. Salen del backend
   (resumen por curso y division), la misma fuente que la planilla, el boletin
   oficial y el portal del alumno: no dependen de lo que haya en el navegador. */

const digitos = (valor) => String(valor ?? "").replace(/\D/g, "");
export const claveCurso = (curso, division) => `${digitos(curso)}-${digitos(division)}`;

/* `items`: cualquier lista con { curso | anio, division | numDivision }. */
export function useResumenCursos(items) {
  const [resumenes, setResumenes] = useState(() => new Map());
  const [version, setVersion] = useState(0);

  const claves = useMemo(() => {
    const unicas = new Set();
    for (const item of items ?? []) {
      const clave = claveCurso(item?.anio ?? item?.curso, item?.numDivision ?? item?.division);
      if (!clave.startsWith("-") && !clave.endsWith("-")) unicas.add(clave);
    }
    return [...unicas].sort().join("|");
  }, [items]);

  useEffect(() => {
    const alActualizar = () => setVersion((v) => v + 1);
    window.addEventListener("prece:calificaciones-updated", alActualizar);
    window.addEventListener("prece:boletin-updated", alActualizar);
    return () => {
      window.removeEventListener("prece:calificaciones-updated", alActualizar);
      window.removeEventListener("prece:boletin-updated", alActualizar);
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    const lista = claves ? claves.split("|") : [];
    if (lista.length === 0) return undefined;

    Promise.all(
      lista.map(async (clave) => {
        const [curso, division] = clave.split("-");
        try {
          return [clave, await BoletinOficialService.resumenDeCurso({ ciclo: new Date().getFullYear(), curso, division })];
        } catch {
          return [clave, null];
        }
      })
    ).then((pares) => vigente && setResumenes(new Map(pares)));

    return () => {
      vigente = false;
    };
  }, [claves, version]);

  return resumenes;
}

export function alumnoTieneNotas(resumenes, alumno) {
  return Boolean(resumenes.get(claveCurso(alumno?.curso, alumno?.division))?.conNotas?.includes(alumno?.id));
}

/* `clavesMateria`: nombres con los que puede figurar la materia en el plan. */
export function materiaTieneNotas(resumenes, curso, division, clavesMateria) {
  const resumen = resumenes.get(claveCurso(curso, division));
  return Boolean(resumen && clavesMateria.some((clave) => buscarNota(resumen.materias, clave)));
}
