import React, { useMemo, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { CustomDatePicker } from "../../../components/common/custom-datepicker.js";

function hoyIsoLocal() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatearFechaInforme(fechaIso) {
  if (!fechaIso || typeof fechaIso !== "string") return "Sin fecha";
  const partes = fechaIso.slice(0, 10).split("-");
  if (partes.length !== 3) return fechaIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export const OPCIONES_DESTINATARIOS = [
  {
    id: "alumnos",
    label: "Solo Alumnos",
    sublabel: "Aparece en el Portal del Alumno",
    badge: "Alumnos",
    colorClass: "director-informe-dest--alumnos"
  },
  {
    id: "preceptores",
    label: "Solo Preceptores",
    sublabel: "Aparece en Preceptoría",
    badge: "Preceptores",
    colorClass: "director-informe-dest--preceptores"
  },
  {
    id: "ambos",
    label: "Alumnos y Preceptores",
    sublabel: "Aparece a ambos sectores",
    badge: "Alumnos y Preceptores",
    colorClass: "director-informe-dest--ambos"
  }
];

function IconSend({ width = "16", height = "16" }) {
  return h(
    "svg",
    { width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
    h("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })
  );
}

function IconFileText({ width = "18", height = "18" }) {
  return h(
    "svg",
    { width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    h("polyline", { points: "14 2 14 8 20 8" }),
    h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
    h("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
    h("line", { x1: "10", y1: "9", x2: "8", y2: "9" })
  );
}

function IconUsers({ width = "16", height = "16" }) {
  return h(
    "svg",
    { width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "9", cy: "7", r: "4" }),
    h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
  );
}

function IconTrash({ width = "15", height = "15" }) {
  return h(
    "svg",
    { width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("polyline", { points: "3 6 5 6 21 6" }),
    h("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
  );
}

function IconPaperclip({ width = "15", height = "15" }) {
  return h(
    "svg",
    { width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
    h("path", { d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" })
  );
}

function formatearTamanoArchivo(bytes) {
  const num = Number(bytes) || 0;
  if (num <= 0) return "";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export function InformesSection({ informes = [], alEnviar, alEliminar }) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState(hoyIsoLocal);
  const [destinatarios, setDestinatarios] = useState("ambos");
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [filtroHistorial, setFiltroHistorial] = useState("todos");

  const informesFiltrados = useMemo(() => {
    if (filtroHistorial === "todos") return informes;
    return informes.filter((item) => item.destinatarios === filtroHistorial);
  }, [informes, filtroHistorial]);

  const handleSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorForm("El archivo supera el tamaño máximo permitido de 5 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setArchivo({
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        tamano: file.size,
        dataUrl: typeof reader.result === "string" ? reader.result : null
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorForm("");

    if (!texto.trim()) {
      setErrorForm("Por favor, escriba el texto del informe antes de enviarlo.");
      return;
    }

    if (!fecha) {
      setErrorForm("Por favor, seleccione una fecha para el informe.");
      return;
    }

    setEnviando(true);
    try {
      await alEnviar({
        titulo: titulo.trim() || "Informe de Dirección",
        texto: texto.trim(),
        fecha,
        destinatarios,
        archivo
      });
      setTitulo("");
      setTexto("");
      setArchivo(null);
    } catch (error) {
      /* El servidor explica el motivo (texto vacío, adjunto muy grande, sin permiso...). */
      const detalle = Object.values(error?.campos ?? {})[0] || error?.mensaje;
      setErrorForm(detalle || "No se pudo enviar el informe. Intente nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  const opcionSeleccionada = OPCIONES_DESTINATARIOS.find((o) => o.id === destinatarios) || OPCIONES_DESTINATARIOS[2];

  return h(
    "div",
    { className: "director-informes-section" },

    // Encabezado de la sección
    h(
      "div",
      { className: "director-informes-header" },
      h(
        "div",
        { className: "director-informes-header__left" },
        h(
          "div",
          { className: "director-informes-header__icon" },
          h(IconFileText, { width: "20", height: "20" })
        ),
        h(
          "div",
          null,
          h("h2", { className: "director-informes-header__title" }, "Informes y Comunicados de Dirección"),
          h(
            "p",
            { className: "director-informes-header__subtitle" },
            "Redacte un informe institucional, indique la fecha y asigne si se envía a los alumnos, a los preceptores o a ambos."
          )
        )
      ),
      h(
        "div",
        { className: "director-informes-header__badges" },
        h("span", { className: "director-informes-count-badge" }, `${informes.length} ${informes.length === 1 ? "informe enviado" : "informes enviados"}`)
      )
    ),

    // Grilla principal: Formulario a la izquierda + Historial a la derecha
    h(
      "div",
      { className: "director-informes-grid" },

      // Columna 1: Formulario de envío
      h(
        "form",
        { className: "director-informes-form-card", onSubmit: handleSubmit },
        h(
          "div",
          { className: "director-informes-card-top" },
          h("h3", { className: "director-informes-card-title" }, "Nuevo Informe Institucional"),
          h("span", { className: "director-informes-card-tag" }, "Envío Directo")
        ),

        // 1. Selector de Destinatarios
        h(
          "div",
          { className: "director-informes-field" },
          h("label", { className: "director-informes-label" }, "1. Asignar destinatarios"),
          h(
            "div",
            { className: "director-informes-dest-grid", role: "radiogroup", "aria-label": "Destinatarios del informe" },
            OPCIONES_DESTINATARIOS.map((op) => {
              const activo = destinatarios === op.id;
              return h(
                "button",
                {
                  key: op.id,
                  type: "button",
                  role: "radio",
                  "aria-checked": activo,
                  className: `director-informes-dest-btn ${activo ? "director-informes-dest-btn--active" : ""} ${op.colorClass}`,
                  onClick: () => setDestinatarios(op.id)
                },
                h(
                  "div",
                  { className: "director-informes-dest-btn__top" },
                  h(IconUsers, { width: "15", height: "15" }),
                  h("span", { className: "director-informes-dest-btn__title" }, op.label)
                ),
                h("span", { className: "director-informes-dest-btn__sub" }, op.sublabel)
              );
            })
          )
        ),

        // 2. Fecha y Asunto/Título en fila
        h(
          "div",
          { className: "director-informes-row" },
          h(
            "div",
            { className: "director-informes-field director-informes-field--date" },
            h("label", { className: "director-informes-label" }, "2. Fecha del informe"),
            h(CustomDatePicker, {
              value: fecha,
              onChange: (nuevaFecha) => setFecha(nuevaFecha)
            })
          ),
          h(
            "div",
            { className: "director-informes-field director-informes-field--title" },
            h("label", { className: "director-informes-label", htmlFor: "director-informe-titulo" }, "Asunto o título (opcional)"),
            h("input", {
              id: "director-informe-titulo",
              type: "text",
              className: "director-informes-input",
              placeholder: "Ej: Comunicado de Dirección / Mesas de examen",
              maxLength: 160,
              value: titulo,
              onChange: (e) => setTitulo(e.target.value)
            })
          )
        ),

        // 3. Texto del informe
        h(
          "div",
          { className: "director-informes-field" },
          h(
            "div",
            { className: "director-informes-label-row" },
            h("label", { className: "director-informes-label", htmlFor: "director-informe-texto" }, "3. Texto del informe *"),
            h("span", { className: "director-informes-char-count" }, `${texto.length}/2000`)
          ),
          h("textarea", {
            id: "director-informe-texto",
            className: "director-informes-textarea",
            rows: 5,
            maxLength: 2000,
            placeholder: "Escriba aquí el informe o comunicado que verán los destinatarios seleccionados...",
            value: texto,
            onChange: (e) => {
              setTexto(e.target.value);
              if (errorForm) setErrorForm("");
            }
          })
        ),

        // 4. Archivo adjunto del informe
        h(
          "div",
          { className: "director-informes-field" },
          h("label", { className: "director-informes-label", htmlFor: "director-informe-archivo" }, "4. Archivo de informe (opcional)"),
          archivo
            ? h(
              "div",
              { className: "director-informes-file-selected" },
              h(
                "div",
                { className: "director-informes-file-selected__info" },
                h(IconPaperclip, { width: "15", height: "15" }),
                h("strong", { className: "director-informes-file-selected__name" }, archivo.nombre),
                archivo.tamano
                  ? h("span", { className: "director-informes-file-selected__size" }, `(${formatearTamanoArchivo(archivo.tamano)})`)
                  : null
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "director-informes-file-remove",
                  onClick: () => setArchivo(null)
                },
                "Quitar archivo"
              )
            )
            : h(
              "label",
              { className: "director-informes-file-upload", htmlFor: "director-informe-archivo" },
              h("input", {
                id: "director-informe-archivo",
                type: "file",
                accept: ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt",
                className: "director-informes-file-input",
                onChange: handleSeleccionarArchivo
              }),
              h(IconPaperclip, { width: "16", height: "16" }),
              h("span", null, "Seleccionar o adjuntar archivo de informe (PDF, Word, Excel o imagen)")
            )
        ),

        errorForm
          ? h("div", { className: "director-informes-error", role: "alert" }, errorForm)
          : null,

        // Botón de enviar
        h(
          "div",
          { className: "director-informes-actions" },
          h(
            "div",
            { className: "director-informes-preview-pill" },
            h("span", null, `Se enviará a: `),
            h("strong", null, opcionSeleccionada.label),
            h("span", null, ` · Fecha: ${formatearFechaInforme(fecha)}`)
          ),
          h(
            "button",
            {
              type: "submit",
              className: "director-informes-submit-btn",
              disabled: enviando
            },
            h(IconSend, { width: "16", height: "16" }),
            h("span", null, enviando ? "Enviando..." : `Enviar Informe`)
          )
        )
      ),

      // Columna 2: Archivo / Historial de informes enviados
      h(
        "div",
        { className: "director-informes-list-card" },
        h(
          "div",
          { className: "director-informes-card-top" },
          h("h3", { className: "director-informes-card-title" }, "Archivo de Informes Emitidos"),
          h(
            "div",
            { className: "director-informes-filter-pills" },
            [
              { id: "todos", label: "Todos" },
              { id: "alumnos", label: "Alumnos" },
              { id: "preceptores", label: "Preceptores" },
              { id: "ambos", label: "Ambos" }
            ].map((f) =>
              h(
                "button",
                {
                  key: f.id,
                  type: "button",
                  className: `director-informes-filter-pill ${filtroHistorial === f.id ? "director-informes-filter-pill--active" : ""}`,
                  onClick: () => setFiltroHistorial(f.id)
                },
                f.label
              )
            )
          )
        ),

        informesFiltrados.length === 0
          ? h(
            "div",
            { className: "director-informes-empty" },
            h("p", null, "No hay informes registrados para este filtro.")
          )
          : h(
            "div",
            { className: "director-informes-items" },
            informesFiltrados.map((inf) => {
              const metaDest = OPCIONES_DESTINATARIOS.find((o) => o.id === inf.destinatarios) || OPCIONES_DESTINATARIOS[2];
              return h(
                "article",
                { key: inf.id, className: "director-informe-item" },
                h(
                  "div",
                  { className: "director-informe-item__top" },
                  h(
                    "div",
                    { className: "director-informe-item__badges" },
                    h(
                      "span",
                      { className: `director-informe-badge director-informe-badge--${inf.destinatarios || "ambos"}` },
                      `Para: ${metaDest.badge}`
                    ),
                    h(
                      "span",
                      { className: "director-informe-date-badge" },
                      `Fecha: ${formatearFechaInforme(inf.fecha)}`
                    )
                  ),
                  alEliminar
                    ? h(
                      "button",
                      {
                        type: "button",
                        className: "director-informe-delete-btn",
                        title: "Eliminar informe",
                        onClick: () => alEliminar(inf.id)
                      },
                      h(IconTrash, { width: "14", height: "14" })
                    )
                    : null
                ),
                h("h4", { className: "director-informe-item__title" }, inf.titulo || "Informe de Dirección"),
                h("p", { className: "director-informe-item__text" }, inf.texto),
                inf.archivo && inf.archivo.nombre
                  ? h(
                    "div",
                    { className: "director-informe-item__attachment" },
                    h(
                      "div",
                      { className: "director-informe-item__attachment-info" },
                      h(IconPaperclip, { width: "14", height: "14" }),
                      h("span", { className: "director-informe-item__attachment-name" }, inf.archivo.nombre),
                      inf.archivo.tamano
                        ? h("span", { className: "director-informe-item__attachment-size" }, `(${formatearTamanoArchivo(inf.archivo.tamano)})`)
                        : null
                    )
                  )
                  : null,
                h(
                  "div",
                  { className: "director-informe-item__footer" },
                  h("span", null, `Emitido por: ${inf.autor || "Dirección General"}`)
                )
              );
            })
          )
      )
    )
  );
}

