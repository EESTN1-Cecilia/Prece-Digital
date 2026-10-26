/* Boletines de una division: vista previa e impresion de a dos boletines
   individuales por hoja Oficio horizontal, en orden de lista. Con
   ?alumno=<id> muestra e imprime solo el boletin de ese alumno.

   El boton "Imprimir" copia las hojas a un documento aislado y lo imprime
   (utils/imprimir-aislado.js): imprimir la pagina completa repetia en cada
   hoja el fondo y los filtros de la aplicacion, la vista previa se trababa y
   el PDF quedaba corrupto. Ctrl+P queda como respaldo: agrega
   `modo-impresion-boletines` a <html> (styles/portal-preceptor/boletines.css).
   Los datos solo viven en memoria: no se guardan en el navegador. */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { Cargando, SinDatos } from "../../components/ui/index.js";
import { PLANES_BOLETIN } from "../students/components/boletin-digital-modal.js";
import { ErrorDeCurso, PortalPreceptorLayout } from "./components/portal-preceptor-layout.js";
import { BoletinImpreso } from "./components/boletin-impreso.js";
import { PortalPreceptorService } from "./portal-preceptor-service.js";
import { contarFaltantes, escalaParaBoletin, filasDelBoletin, paginarDeADos, reglaPaginaBoletines } from "./boletines-logica.js";
import { imprimirAislado } from "../../utils/imprimir-aislado.js";

const CLASE_MODO = "modo-impresion-boletines";
const ID_ESTILO_PAGINA = "estilo-pagina-boletines";

function activarImpresion() {
  document.documentElement.classList.add(CLASE_MODO);
  if (!document.getElementById(ID_ESTILO_PAGINA)) {
    const estilo = document.createElement("style");
    estilo.id = ID_ESTILO_PAGINA;
    estilo.textContent = reglaPaginaBoletines();
    document.head.appendChild(estilo);
  }
}

function desactivarImpresion() {
  document.documentElement.classList.remove(CLASE_MODO);
  document.getElementById(ID_ESTILO_PAGINA)?.remove();
}

/* Escala cada boletin (190 mm de ancho natural) para que entre en su media
   hoja. Sirve igual para la vista previa y para el documento impreso. */
function ajustarBoletines(raiz) {
  for (const boletin of raiz.querySelectorAll(".boletin-oficial")) {
    boletin.style.zoom = "";
    boletin.style.zoom = String(escalaParaBoletin(boletin.offsetWidth, boletin.offsetHeight));
  }
}

const ESTILOS_DOCUMENTO = `${reglaPaginaBoletines()}
html, body { margin: 0; padding: 0; background: #ffffff; }
.boletines-hojas { display: block; }
.boletines-hoja { box-sizing: border-box; width: 320mm; height: 196mm; display: grid; grid-template-columns: 160mm 160mm; column-gap: 0; align-items: start; overflow: hidden; break-after: page; page-break-after: always; break-inside: avoid; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.boletines-hoja:last-child { break-after: auto; page-break-after: auto; }`;

function alumnoDelHash() {
  return new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("alumno");
}

export default function PreceptorBoletinesCursoView({ cursoId }) {
  const [alumnoId, setAlumnoId] = useState(alumnoDelHash);
  const [datos, setDatos] = useState({ boletines: [], contexto: null });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const hojasRef = useRef(null);

  useEffect(() => {
    const alCambiar = () => setAlumnoId(alumnoDelHash());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  useEffect(() => {
    window.addEventListener("beforeprint", activarImpresion);
    window.addEventListener("afterprint", desactivarImpresion);
    return () => {
      window.removeEventListener("beforeprint", activarImpresion);
      window.removeEventListener("afterprint", desactivarImpresion);
      desactivarImpresion();
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    PortalPreceptorService.boletines(cursoId, { alumnoId: alumnoId || undefined })
      .then((respuesta) => {
        if (vigente) {
          setDatos(respuesta);
          setError(null);
        }
      })
      .catch((fallo) => vigente && setError(fallo))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
      /* Al salir no queda ningun boletin en memoria de la vista. */
      setDatos({ boletines: [], contexto: null });
    };
  }, [cursoId, alumnoId]);

  useLayoutEffect(() => {
    if (hojasRef.current) ajustarBoletines(hojasRef.current);
  }, [datos]);

  const imprimir = async () => {
    setImprimiendo(true);
    try {
      await imprimirAislado({
        contenido: hojasRef.current,
        titulo: alumnoId && datos.boletines[0]
          ? `Boletín ${datos.boletines[0].alumno.apellido} ${anio}° ${division}`
          : `Boletines ${anio}° ${division}`,
        fragmentos: ["boletin-", "boletines-"],
        estilosImpresion: ESTILOS_DOCUMENTO,
        ajustar: (documento) => ajustarBoletines(documento)
      });
    } finally {
      setImprimiendo(false);
    }
  };

  const [anio, division] = String(cursoId ?? "").split("-");
  const { boletines, contexto } = datos;
  const hojas = paginarDeADos(boletines);
  const conFaltantes = boletines.filter(
    (boletin) => contarFaltantes(filasDelBoletin({ planes: PLANES_BOLETIN, anio: boletin.anio ?? boletin.alumno.curso, orientacion: contexto?.orientacion, calificaciones: boletin.calificaciones })) > 0
  ).length;
  const individual = Boolean(alumnoId);

  let cuerpo;

  if (error) {
    cuerpo = h(ErrorDeCurso, { error });
  } else if (cargando) {
    cuerpo = h(Cargando, { texto: "Preparando los boletines..." });
  } else if (!boletines.length) {
    cuerpo = h(SinDatos, { titulo: "No hay alumnos activos en la división", descripcion: "Sin alumnos no hay boletines para imprimir." });
  } else {
    cuerpo = h(
      "div",
      { className: "boletines-vista" },
      h(
        "div",
        { className: "boletines-controles portal-panel portal-no-imprimir" },
        h(
          "p",
          { className: "portal-panel__texto" },
          individual
            ? `Boletín de ${boletines[0].alumno.apellido}, ${boletines[0].alumno.nombre}.`
            : `${boletines.length} boletines en orden de lista · ${hojas.length} ${hojas.length === 1 ? "hoja" : "hojas"} Oficio horizontal, dos boletines por hoja${boletines.length % 2 ? " (el último sale solo)" : ""}.`
        ),
        conFaltantes
          ? h(
              "p",
              { className: "portal-panel__texto portal-panel__texto--suave" },
              `${conFaltantes === boletines.length ? "Todos los boletines tienen" : `${conFaltantes} ${conFaltantes === 1 ? "boletín tiene" : "boletines tienen"}`} materias sin calificaciones cargadas: esas celdas salen vacías. Las notas las cargan los docentes desde su planilla o Secretaría desde el Boletín Digital.`
            )
          : null
      ),
      h(
        "div",
        { className: "boletines-impresion" },
        h(
          "div",
          { className: "boletines-hojas", ref: hojasRef },
          hojas.map((hoja, indice) =>
            h(
              "section",
              { key: indice, className: "boletines-hoja", "aria-label": `Hoja ${indice + 1}` },
              hoja.map((boletin) =>
                h("div", { key: boletin.alumno.id, className: "boletines-celda" }, h(BoletinImpreso, { boletin, contexto, planes: PLANES_BOLETIN }))
              )
            )
          )
        )
      )
    );
  }

  return h(
    PortalPreceptorLayout,
    {
      activa: "boletines",
      titulo: individual ? `Boletín · ${anio}° ${division}` : `Boletines de ${anio}° año · División ${division}`,
      bajada: contexto ? `Ciclo lectivo ${contexto.cicloLectivo}. Las notas salen del registro de calificaciones; el preceptor no las modifica.` : null,
      acciones: error
        ? null
        : [
            h("a", { key: "volver", href: `#/preceptor/cursos/${cursoId}`, className: "portal-boton portal-boton--contorno portal-no-imprimir" }, "Volver a la lista"),
            individual
              ? h("a", { key: "curso", href: `#/preceptor/cursos/${cursoId}/boletines`, className: "portal-boton portal-boton--contorno portal-no-imprimir" }, "Todo el curso")
              : null,
            h(
              "button",
              { key: "imprimir", type: "button", className: "portal-boton portal-no-imprimir", disabled: cargando || imprimiendo || !boletines.length, onClick: imprimir },
              imprimiendo ? "Preparando la impresión..." : individual ? "Imprimir boletín" : "Imprimir boletines del curso"
            )
          ]
    },
    cuerpo
  );
}
