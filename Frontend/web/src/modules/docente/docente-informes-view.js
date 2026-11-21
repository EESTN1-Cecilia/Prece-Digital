import React, { useCallback, useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { pedir } from "../../services/http.js";
import { formatearFechaInforme } from "../director/components/informes-section.js";

/* Informes y comunicados que Dirección dirigió a docentes.

   El backend ya recorta la lista: un docente solo recibe lo dirigido a docentes
   (GET /api/v1/informes-direccion) y solo puede bajar esos adjuntos. Esta
   pantalla no filtra nada por su cuenta. Como Dirección emite desde otra
   sesión, la lista se vuelve a pedir al volver a la pestaña y cada minuto. */

const REFRESCO_MS = 60000;

/* El adjunto viaja como data URL; se baja como Blob porque los navegadores
   limitan el tamaño de las data URL en un enlace. */
async function guardarAdjunto({ nombre, dataUrl }) {
  const blob = await (await fetch(dataUrl)).blob();
  const direccion = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = direccion;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(direccion), 10000);
}

function tamanoLegible(bytes) {
  const numero = Number(bytes) || 0;
  if (numero <= 0) return "";
  if (numero < 1024) return `${numero} B`;
  if (numero < 1024 * 1024) return `${(numero / 1024).toFixed(1)} KB`;
  return `${(numero / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocenteInformesView() {
  const [informes, setInformes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [descarga, setDescarga] = useState({ informeId: null, error: "" });

  const cargar = useCallback(async () => {
    try {
      const respuesta = await pedir("/api/v1/informes-direccion");
      const lista = Array.isArray(respuesta) ? respuesta : respuesta?.data;
      setInformes(Array.isArray(lista) ? lista : []);
      setError("");
    } catch (fallo) {
      setError(fallo?.mensaje || "No se pudieron cargar los informes. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = window.setInterval(cargar, REFRESCO_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  const descargar = async (informeId) => {
    setDescarga({ informeId, error: "" });
    try {
      const respuesta = await pedir(`/api/v1/informes-direccion/${encodeURIComponent(informeId)}/archivo`);
      await guardarAdjunto(respuesta?.data ?? respuesta);
      setDescarga({ informeId: null, error: "" });
    } catch (fallo) {
      setDescarga({ informeId: null, error: fallo?.mensaje || "No se pudo descargar el archivo. Intentá de nuevo." });
    }
  };

  return h(
    "div",
    { className: "director-informes-section" },
    h(
      "div",
      { className: "director-informes-header" },
      h(
        "div",
        { className: "director-informes-header__left" },
        h(
          "div",
          null,
          h("h2", { className: "director-informes-header__title" }, "Informes de Dirección"),
          h("p", { className: "director-informes-header__subtitle" }, "Comunicados e informes que Dirección dirigió al cuerpo docente.")
        )
      ),
      h(
        "div",
        { className: "director-informes-header__badges" },
        h("span", { className: "director-informes-count-badge" }, `${informes.length} ${informes.length === 1 ? "informe" : "informes"}`)
      )
    ),
    h(
      "div",
      { className: "director-informes-list-card" },
      descarga.error ? h("div", { className: "director-informes-error", role: "alert" }, descarga.error) : null,
      cargando
        ? h("p", { role: "status" }, "Cargando informes...")
        : error
          ? h(
            "div",
            { className: "director-informes-error", role: "alert" },
            error,
            " ",
            h("button", { type: "button", onClick: cargar }, "Reintentar")
          )
          : informes.length === 0
            ? h("div", { className: "director-informes-empty" }, h("p", null, "Dirección todavía no te envió informes."))
            : h(
              "div",
              { className: "director-informes-items" },
              informes.map((informe) =>
                h(
                  "article",
                  { key: informe.id, className: "director-informe-item" },
                  h(
                    "div",
                    { className: "director-informe-item__top" },
                    h(
                      "div",
                      { className: "director-informe-item__badges" },
                      h("span", { className: "director-informe-badge director-informe-badge--docentes" }, "Para: Docentes"),
                      h("span", { className: "director-informe-date-badge" }, `Fecha: ${formatearFechaInforme(informe.fecha)}`)
                    )
                  ),
                  h("h4", { className: "director-informe-item__title" }, informe.titulo || "Informe de Dirección"),
                  h("p", { className: "director-informe-item__text" }, informe.texto),
                  informe.archivo?.nombre
                    ? h(
                      "div",
                      { className: "director-informe-item__attachment" },
                      h(
                        "div",
                        { className: "director-informe-item__attachment-info" },
                        h("span", { className: "director-informe-item__attachment-name" }, informe.archivo.nombre),
                        informe.archivo.tamano
                          ? h("span", { className: "director-informe-item__attachment-size" }, `(${tamanoLegible(informe.archivo.tamano)})`)
                          : null
                      ),
                      informe.archivo.descargable
                        ? h(
                          "button",
                          { type: "button", disabled: descarga.informeId === informe.id, onClick: () => descargar(informe.id) },
                          descarga.informeId === informe.id ? "Descargando..." : "Descargar"
                        )
                        : null
                    )
                    : null,
                  h("div", { className: "director-informe-item__footer" }, h("span", null, `Emitido por: ${informe.autor || "Dirección General"}`))
                )
              )
            )
    )
  );
}
