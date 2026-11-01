/* Boletin Digital de Calificaciones - vista del PERSONAL (Direccion, Secretaria,
   Preceptoria). Es el formulario oficial del colegio: se ve y se imprime como el
   boletin en papel, con pestañas por año, notas editables y firmas en blanco.
   No es la vista del alumno (esa vive en el portal del alumno). */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import {
  anioDelAlumno,
  armarBoletinOficial,
  planDelAnio,
  promedioGeneral,
  recalcularNota,
  PERIODOS_PENDIENTES
} from "../../boletin/boletin-oficial-datos.js";
import { abrirBoletinesOficial } from "../../boletin/boletin-oficial-pdf.js";
import { BoletinOficialService } from "../../boletin/boletin-oficial-service.js";

const ANIOS = [1, 2, 3, 4, 5, 6, 7];

const ESTILOS = `
.bof-overlay{position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px}
.bof-panel{background:#eef1f6;width:min(1000px,100%);max-height:100%;border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.35)}
.bof-barra{background:#1e2a44;color:#fff;display:flex;align-items:center;gap:14px;padding:12px 18px;flex-wrap:wrap}
.bof-barra-titulo{flex:1;min-width:220px}
.bof-barra-titulo strong{display:block;font-size:16px}
.bof-barra-titulo span{font-size:12px;opacity:.85}
.bof-chip{background:rgba(255,255,255,.16);border-radius:6px;padding:1px 7px;font-size:11px;margin:0 4px}
.bof-acciones{display:flex;gap:8px;flex-wrap:wrap}
.bof-btn{border:1px solid #cbd5e1;background:#fff;color:#1e2a44;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer}
.bof-btn:disabled{opacity:.55;cursor:default}
.bof-btn--ok{background:#15803d;border-color:#15803d;color:#fff}
.bof-btn--x{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}
.bof-tabs{display:flex;gap:8px;padding:10px 18px;background:#fff;border-bottom:1px solid #dbe1ea;overflow-x:auto}
.bof-tab{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:5px 11px;font-size:12px;font-weight:600;color:#1e2a44;cursor:pointer;white-space:nowrap}
.bof-tab small{margin-left:5px;font-size:9px;background:#e2e8f0;border-radius:4px;padding:1px 4px;color:#475569;text-transform:uppercase}
.bof-tab--on{border-color:#1e2a44;box-shadow:inset 0 0 0 1px #1e2a44}
.bof-cuerpo{overflow:auto;padding:18px}
.bof-hoja{background:#fff;border:1.5px solid #7a1f2b;max-width:800px;margin:0 auto;padding:22px 26px 26px;color:#1f2937;font-size:11px}
.bof-cab{text-align:center;border-bottom:2px solid #7a1f2b;padding-bottom:8px;display:flex;align-items:center;gap:14px}
.bof-cab img{width:64px;height:64px;object-fit:contain}
.bof-cab div{flex:1}
.bof-cab small{display:block;color:#6b7280;font-weight:700;font-size:9.5px;letter-spacing:.02em}
.bof-cab h2{margin:2px 0;color:#7a1f2b;font-size:19px;font-weight:800}
.bof-cab b{font-size:11px}
.bof-datos{display:grid;grid-template-columns:2fr 1fr;border:1px dotted #6b7280;margin:12px 0}
.bof-datos div{padding:6px 9px;border-bottom:1px dotted #9ca3af}
.bof-datos b{font-size:9.5px;color:#4b5563;margin-right:6px}
.bof-datos3{display:grid;grid-template-columns:2fr 1.2fr 1.2fr;border:1px dotted #6b7280;border-top:0;margin-top:-12px;margin-bottom:12px}
.bof-datos3 div{padding:6px 9px;border-bottom:1px dotted #9ca3af}
.bof-datos3 b{font-size:9.5px;color:#4b5563;margin-right:6px}
.bof-tabla{width:100%;border-collapse:collapse;table-layout:fixed}
.bof-tabla th{background:#7a1f2b;color:#fff;font-size:9.5px;padding:6px 3px;border:1px solid #e5c9cd;text-transform:uppercase}
.bof-tabla td{border:1px solid #c7c9cf;padding:0;height:25px;text-align:center}
.bof-tabla td.bof-mat{text-align:left;padding:0 8px;font-weight:700;font-size:10px;text-transform:uppercase}
.bof-tabla tr.bof-sec td{background:#5c121c;color:#fff;font-weight:800;font-size:10px;text-align:left;padding:4px 8px;height:auto}
.bof-tabla tbody tr:nth-child(even) td{background:#f1f1f3}
.bof-tabla td.bof-calc{background:#f6e3e5!important;font-weight:700}
.bof-tabla td.bof-def{background:#efd6d9!important;font-weight:800}
.bof-nota{width:100%;height:100%;border:0;background:transparent;text-align:center;font:inherit;font-size:12px;padding:4px 0;color:#111827}
.bof-nota:focus{outline:2px solid #1e2a44;background:#fff}
.bof-pie td{background:#f3f4f6!important;height:28px;font-weight:700}
.bof-pie input{width:46px;border:1px solid #9ca3af;border-radius:4px;text-align:center;font:inherit;padding:2px}
.bof-pend-t{background:#5c121c;color:#fff;font-weight:800;padding:5px 8px;margin-top:16px;font-size:10px}
.bof-pend th{background:#8c262e}
.bof-pend input{width:100%;border:0;background:transparent;font:inherit;font-size:11px;padding:5px 4px;text-align:center}
.bof-pend input.bof-izq{text-align:left}
.bof-firmas{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:46px;text-align:center}
.bof-firmas div{border-top:1px solid #111;padding-top:4px;font-size:10px}
.bof-firmas small{display:block;color:#6b7280;font-size:8.5px}
.bof-aviso{max-width:800px;margin:0 auto 10px;font-size:12px;color:#166534;background:#dcfce7;border-radius:8px;padding:7px 12px}
.bof-aviso--err{color:#991b1b;background:#fee2e2}
@media (max-width:700px){.bof-hoja{padding:12px}.bof-tabla{font-size:9px}.bof-cab h2{font-size:15px}}
`;

const COLS_NOTA = [
  ["informe1", true],
  ["informe2", true],
  ["promedioAnual", false],
  ["diciembre", true],
  ["febrero", true],
  ["definitiva", false]
];

export function BoletinOficialModal({ abierto, onCerrar, alumno }) {
  const anioAlumno = anioDelAlumno(alumno);
  const [anio, setAnio] = useState(anioAlumno);
  const [boletin, setBoletin] = useState(null);
  const [sinGuardar, setSinGuardar] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [preparando, setPreparando] = useState(false);

  useEffect(() => {
    if (abierto) setAnio(anioAlumno);
  }, [abierto, alumno?.id, anioAlumno]);

  /* Las notas vienen del backend: son las mismas que carga el docente en la
     planilla y las mismas que ve el alumno en su portal. */
  useEffect(() => {
    if (!abierto || !alumno) return undefined;
    let vigente = true;
    setBoletin(null);
    setSinGuardar(false);
    setMensaje(null);
    BoletinOficialService.obtener(alumno, anio)
      .then((registro) => vigente && setBoletin(armarBoletinOficial(alumno, anio, { registro })))
      .catch((error) => {
        if (!vigente) return;
        setBoletin(armarBoletinOficial(alumno, anio));
        setMensaje({ ok: false, texto: `No se pudieron cargar las notas: ${error?.mensaje ?? "intentá de nuevo."}` });
      });
    return () => {
      vigente = false;
    };
  }, [abierto, alumno, anio]);

  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const alTeclear = (e) => e.key === "Escape" && onCerrar?.();
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, onCerrar]);

  const materias = useMemo(() => (boletin ? [...boletin.plan.general, ...boletin.plan.taller] : []), [boletin]);

  if (!abierto || !alumno) return null;

  const cambiar = (fn) => {
    setBoletin((previo) => fn(previo));
    setSinGuardar(true);
    setMensaje(null);
  };
  const editarNota = (materia, campo, valor) =>
    cambiar((b) => ({ ...b, notas: { ...b.notas, [materia]: recalcularNota({ ...b.notas[materia], [campo]: valor }) } }));
  const editarPendiente = (indice, campo, valor) =>
    cambiar((b) => ({ ...b, pendientes: b.pendientes.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)) }));

  const guardar = async () => {
    try {
      const guardado = await BoletinOficialService.guardarBoletin(boletin, alumno);
      setBoletin(armarBoletinOficial(alumno, anio, { registro: guardado }));
      window.dispatchEvent(new CustomEvent("prece:boletin-updated"));
      window.dispatchEvent(new CustomEvent("prece:calificaciones-updated"));
      setSinGuardar(false);
      setMensaje({ ok: true, texto: "✓ Notas guardadas: ya las ven la planilla del docente y el portal del alumno." });
    } catch (error) {
      setMensaje({ ok: false, texto: `No se pudieron guardar las notas: ${error?.mensaje ?? "intentá de nuevo."}` });
    }
  };

  const imprimir = async () => {
    const ventana = window.open("", "_blank");
    setPreparando(true);
    try {
      await abrirBoletinesOficial([boletin], ventana);
    } catch {
      ventana?.close();
      setMensaje({ ok: false, texto: "No se pudo preparar el PDF del boletín." });
    } finally {
      setPreparando(false);
    }
  };

  const cambiarAnio = (nuevo) => {
    if (nuevo === anio) return;
    if (sinGuardar && !window.confirm("Hay notas sin guardar en este año. ¿Cambiar de año y descartarlas?")) return;
    setAnio(nuevo);
  };

  const celdaNota = (materia, [campo, editable]) => {
    const valor = boletin.notas[materia]?.[campo] ?? "";
    const clase = campo === "promedioAnual" ? "bof-calc" : campo === "definitiva" ? "bof-def" : "";
    return h(
      "td",
      { key: campo, className: clase },
      editable
        ? h("input", {
            className: "bof-nota",
            value: valor,
            inputMode: "decimal",
            maxLength: 5,
            "aria-label": `${campo} de ${materia}`,
            onChange: (e) => editarNota(materia, campo, e.target.value)
          })
        : valor || "—"
    );
  };

  const filaSeccion = (titulo) => h("tr", { className: "bof-sec", key: `s-${titulo}` }, h("td", { colSpan: 8 }, titulo));
  const filasMaterias = (lista) =>
    lista.map((materia) =>
      h("tr", { key: materia }, h("td", { className: "bof-mat" }, materia), ...COLS_NOTA.map((c) => celdaNota(materia, c)), h("td", null, ""))
    );

  const contenido = boletin
    ? h(
        "div",
        { className: "bof-hoja" },
        h(
          "div",
          { className: "bof-cab" },
          h("img", { src: "/assets/tecnica-n1-monte-grande.png", alt: "", onError: (e) => (e.currentTarget.style.display = "none") }),
          h(
            "div",
            null,
            h("small", null, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN • PROVINCIA DE BUENOS AIRES"),
            h("h2", null, 'E.E.S.T. N° 1 "CECILIA BERDICHEVSKI"'),
            h("b", null, `BOLETÍN DE CALIFICACIONES • ${boletin.anio}° AÑO`)
          ),
          h("span", { style: { width: "64px" } })
        ),
        h(
          "div",
          { className: "bof-datos", style: { marginBottom: 0, borderBottom: 0 } },
          h("div", null, h("b", null, "APELLIDO Y NOMBRE:"), boletin.alumno.nombreCompleto),
          h("div", null, h("b", null, "AÑO/DIV:"), boletin.alumno.cursoDivision)
        ),
        h(
          "div",
          { className: "bof-datos3", style: { marginTop: 0 } },
          h("div", null, h("b", null, "LEGAJO:"), boletin.alumno.legajo),
          h("div", null, h("b", null, "D.N.I.:"), boletin.alumno.dni),
          h("div", null, h("b", null, "CICLO LECTIVO:"), boletin.cicloLectivo),
          h("div", null, h("b", null, "FOLIO:"), boletin.alumno.folio),
          h("div", null, h("b", null, "LIBRO:"), boletin.alumno.libro),
          h("div", null, h("b", null, "TURNO:"), boletin.alumno.turno || "—")
        ),
        h(
          "table",
          { className: "bof-tabla" },
          h(
            "colgroup",
            null,
            ...[26, 9, 9, 10, 9, 9, 11, 17].map((p, i) => h("col", { key: i, style: { width: `${p}%` } }))
          ),
          h(
            "thead",
            null,
            h("tr", null, ...["Materias", "1° Informe", "2° Informe", "Promedio anual", "Diciembre", "Febrero", "Calif. definitiva", "Firmas"].map((t) => h("th", { key: t }, t)))
          ),
          h(
            "tbody",
            null,
            filaSeccion("FORMACIÓN GENERAL"),
            ...filasMaterias(boletin.plan.general),
            boletin.plan.taller.length ? filaSeccion(boletin.plan.tituloTaller) : null,
            ...filasMaterias(boletin.plan.taller),
            h(
              "tr",
              { className: "bof-pie" },
              h(
                "td",
                { colSpan: 3, style: { textAlign: "left", padding: "0 8px" } },
                "INASISTENCIA TOTAL: ",
                h("input", { value: boletin.inasistencias, inputMode: "numeric", maxLength: 3, "aria-label": "Inasistencia total", onChange: (e) => cambiar((b) => ({ ...b, inasistencias: e.target.value.replace(/\D/g, "") })) }),
                " días"
              ),
              h("td", { colSpan: 3, style: { textAlign: "right", padding: "0 8px" } }, "PROMEDIO GENERAL ANUAL:"),
              h("td", { className: "bof-def" }, promedioGeneral(boletin.notas, materias) || "—"),
              h("td", null, "")
            )
          )
        ),
        h("div", { className: "bof-pend-t" }, "MATERIAS PENDIENTES DE ACREDITACIÓN / REGULARIZACIÓN"),
        h(
          "table",
          { className: "bof-tabla bof-pend" },
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              h("th", { rowSpan: 2, style: { width: "30%" } }, "Materias pendientes"),
              h("th", { rowSpan: 2, style: { width: "8%" } }, "Año"),
              ...PERIODOS_PENDIENTES.map(([k, etiqueta]) => h("th", { key: k, colSpan: 2 }, etiqueta))
            ),
            h("tr", null, ...PERIODOS_PENDIENTES.flatMap(([k]) => [h("th", { key: `${k}c` }, "Calif"), h("th", { key: `${k}l` }, "L/F")]))
          ),
          h(
            "tbody",
            null,
            ...boletin.pendientes.map((p, i) =>
              h(
                "tr",
                { key: i },
                h("td", null, h("input", { className: "bof-izq", value: p.materia, placeholder: "Escriba materia previa...", "aria-label": "Materia pendiente", onChange: (e) => editarPendiente(i, "materia", e.target.value) })),
                h("td", null, h("input", { value: p.anio, maxLength: 4, "aria-label": "Año de la materia pendiente", onChange: (e) => editarPendiente(i, "anio", e.target.value) })),
                ...PERIODOS_PENDIENTES.flatMap(([k]) => [
                  h("td", { key: `${k}c` }, h("input", { value: p[`${k}C`], maxLength: 4, "aria-label": `${k} calificación`, onChange: (e) => editarPendiente(i, `${k}C`, e.target.value) })),
                  h("td", { key: `${k}l` }, h("input", { value: p[`${k}LF`], maxLength: 4, "aria-label": `${k} libro y folio`, onChange: (e) => editarPendiente(i, `${k}LF`, e.target.value) }))
                ])
              )
            )
          )
        ),
        h(
          "div",
          { className: "bof-firmas" },
          h("div", null, "AUTORIDAD ESCOLAR", h("small", null, "Firma y Sello Dirección")),
          h("div", null, "PRECEPTOR", h("small", null, "Firma Preceptor a Cargo")),
          h("div", null, "ADULTO RESPONSABLE", h("small", null, "Firma Padre / Madre / Tutor"))
        )
      )
    : null;

  return createPortal(
    h(
      "div",
      { className: "bof-overlay", onClick: onCerrar },
      h("style", null, ESTILOS),
      h(
        "div",
        { className: "bof-panel", role: "dialog", "aria-modal": "true", "aria-label": "Boletín digital de calificaciones", onClick: (e) => e.stopPropagation() },
        h(
          "div",
          { className: "bof-barra" },
          h(
            "div",
            { className: "bof-barra-titulo" },
            h("strong", null, "Boletín Digital de Calificaciones"),
            h("span", null, `${alumno.apellido}, ${alumno.nombre}`, h("span", { className: "bof-chip" }, `DNI: ${alumno.dni ?? "—"}`), boletin ? `Legajo: ${boletin.alumno.legajo}` : "")
          ),
          h(
            "div",
            { className: "bof-acciones" },
            h("button", { type: "button", className: "bof-btn bof-btn--ok", onClick: guardar, disabled: !sinGuardar }, "Guardar Notas"),
            h("button", { type: "button", className: "bof-btn", onClick: imprimir, disabled: preparando || !boletin }, preparando ? "Preparando…" : "Imprimir / PDF"),
            h("button", { type: "button", className: "bof-btn bof-btn--x", onClick: onCerrar, "aria-label": "Cerrar" }, "✕")
          )
        ),
        h(
          "div",
          { className: "bof-tabs", role: "tablist" },
          ...ANIOS.map((n) =>
            h(
              "button",
              { key: n, type: "button", role: "tab", "aria-selected": n === anio, className: `bof-tab${n === anio ? " bof-tab--on" : ""}`, onClick: () => cambiarAnio(n) },
              `${n}° Año`,
              h("small", null, planDelAnio(n).ciclo.slice(0, 8))
            )
          )
        ),
        h(
          "div",
          { className: "bof-cuerpo" },
          mensaje ? h("div", { className: `bof-aviso${mensaje.ok ? "" : " bof-aviso--err"}`, role: "status" }, mensaje.texto) : null,
          contenido
        )
      )
    ),
    document.body
  );
}

export default BoletinOficialModal;
