/* Marco del Portal Preceptor: el mismo del Portal Docente (banda de identidad
   y navegacion corta) con las secciones del preceptor. */

import { useCallback, useEffect, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { MensajeError, SinDatos } from "../../../components/ui/index.js";
import { PortalLayout } from "../../portal-docente/components/portal-layout.js";
import { PortalPreceptorService } from "../portal-preceptor-service.js";

export const SECCIONES_PRECEPTOR = [
  { id: "inicio", href: "#/preceptor", titulo: "Inicio" },
  { id: "cursos", href: "#/preceptor/cursos", titulo: "Mis cursos" },
  { id: "asistencia", href: "#/preceptor/asistencia", titulo: "Asistencia" },
  { id: "historial", href: "#/preceptor/historial", titulo: "Historial" },
  { id: "boletines", href: "#/preceptor/boletines", titulo: "Boletines" }
];

export function PortalPreceptorLayout(props) {
  return h(PortalLayout, { ...props, secciones: SECCIONES_PRECEPTOR, marca: "Portal Preceptor", rol: "Preceptor" });
}

/* Divisiones a cargo del preceptor autenticado (el backend ya filtra). */
export function useCursosPreceptor() {
  const [estado, setEstado] = useState({ cursos: [], restringido: true });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    PortalPreceptorService.misCursos()
      .then((respuesta) => {
        if (vigente) {
          setEstado(respuesta);
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

  return { cursos: estado.cursos, restringido: estado.restringido, cargando, error, recargar };
}

export function etiquetaDivision(curso) {
  return curso ? `${curso.anio}° año · División ${curso.division}` : "";
}

/* Error al pedir datos de una division: una division no asignada (403) se
   explica en lugar de mostrar el mensaje generico. */
export function ErrorDeCurso({ error }) {
  if (error?.status === 403) {
    return h(SinDatos, {
      titulo: "Esta división no está asignada a tu usuario",
      descripcion: "Solo podés ver las divisiones que te asignó Dirección. Volvé a Mis cursos para elegir una."
    });
  }

  return h(MensajeError, { error });
}
