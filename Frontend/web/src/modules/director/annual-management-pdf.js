/* Descarga directa en PDF (A4 vertical) del Informe Institucional Anual de Direccion.
   Evita depender de ventanas emergentes (popups) que el navegador puede bloquear. */

import { ancho, cadena, cargarLogo } from "../../utils/pdf-base.js";
import { armarPdf, dispararDescargaPdf } from "../documents/constancias-pdf.js";

const A4_W = 595.28;
const A4_H = 841.89;
const M = 36;
const CW = A4_W - M * 2;

const BORDO = [0.349, 0.11, 0.137];
const OSCURO = [0.11, 0.16, 0.27];
const GRIS = [0.42, 0.44, 0.48];
const LINEA = [0.76, 0.78, 0.82];
const FONDO_SUAVE = [0.96, 0.93, 0.935];
const ZEBRA = [0.97, 0.975, 0.985];
const BLANCO = [1, 1, 1];

const n = (v) => Number(v.toFixed(2));
const col = (c) => c.map(n).join(" ");

export function generarInformeAnualPdf(report, logo = null) {
  const paginas = [];
  let ops = [];
  const nueva = () => {
    ops = [];
    paginas.push(ops);
  };
  nueva();

  const rect = (x, y, w, h, c) => ops.push(`${col(c)} rg ${n(x)} ${n(A4_H - y - h)} ${n(w)} ${n(h)} re f`);
  const marco = (x, y, w, h, c, g = 0.4) => ops.push(`${col(c)} RG ${g} w ${n(x)} ${n(A4_H - y - h)} ${n(w)} ${n(h)} re S`);
  const linea = (x1, y1, x2, y2, c, g = 0.35) => ops.push(`${col(c)} RG ${g} w ${n(x1)} ${n(A4_H - y1)} m ${n(x2)} ${n(A4_H - y2)} l S`);
  const texto = (val, x, y, tam, { negrita = false, c = OSCURO, alinear = "izq", w = 0, minimo = tam } = {}) => {
    let t = String(val ?? "");
    let s = tam;
    if (w) {
      while (s > minimo && ancho(t, s, negrita) > w) s = Math.max(minimo, +(s - 0.2).toFixed(2));
      if (ancho(t, s, negrita) > w) {
        while (t.length > 1 && ancho(`${t}...`, s, negrita) > w) t = t.slice(0, -1);
        t = `${t.trimEnd()}...`;
      }
    }
    let px = x;
    if (alinear === "centro") px = x + (w - ancho(t, s, negrita)) / 2;
    else if (alinear === "der") px = x + w - ancho(t, s, negrita);
    ops.push(`BT /${negrita ? "F2" : "F1"} ${s} Tf ${col(c)} rg ${n(px)} ${n(A4_H - y)} Td (${cadena(t)}) Tj ET`);
  };

  // Cabecera
  rect(M, M, CW, 54, BORDO);
  if (logo) ops.push(`q 38 0 0 38 ${n(M + 10)} ${n(A4_H - M - 46)} cm /Im1 Do Q`);
  const tx = logo ? M + 58 : M + 12;
  texto('PRECE DIGITAL · E.E.S.T. N° 1 "CECILIA BERDICHEVSKY"', tx, M + 16, 7.5, { c: [0.95, 0.88, 0.89] });
  texto(`INFORME INSTITUCIONAL ANUAL ${report.anio}`, tx, M + 34, 13, { negrita: true, c: BLANCO });
  const filtrosTxt = `${report.filtros?.curso ? `${report.filtros.curso}°` : "Todos los cursos"}${report.filtros?.division ? ` · Division ${report.filtros.division}` : ""}`;
  texto(`Generado: ${new Date(report.generadoEn).toLocaleString("es-AR")}  |  ${filtrosTxt}`, tx, M + 47, 7.5, { c: [0.95, 0.9, 0.9] });

  let y = M + 66;
  const asegurarEspacio = (h) => {
    if (y + h > A4_H - M) {
      nueva();
      y = M;
    }
  };

  // Resumen ejecutivo
  const kpis = [
    ["Matricula", report.matricula?.disponible ? String(report.matricula.total) : "Sin fotografia"],
    ["Inasistencias", String(report.asistencia?.totalInasistencias ?? 0)],
    ["Situaciones academicas", String(report.academico?.totalSituaciones ?? 0)],
    ["Evaluaciones", String(report.academico?.totalEvaluaciones ?? 0)]
  ];
  const kw = (CW - 18) / 4;
  kpis.forEach(([et, val], i) => {
    const kx = M + i * (kw + 6);
    rect(kx, y, kw, 38, FONDO_SUAVE);
    marco(kx, y, kw, 38, LINEA, 0.45);
    texto(et, kx + 6, y + 13, 7, { c: GRIS, w: kw - 12 });
    texto(val, kx + 6, y + 30, 12, { negrita: true, c: BORDO, w: kw - 12, minimo: 8.5 });
  });
  y += 48;

  if (report.resultadosCierre) {
    const rc = report.resultadosCierre;
    texto(
      `Resultados de cierre: Promovidos ${rc.promovido} · Permanecen ${rc.permanece} · Egresados ${rc.egresado} · Retirados ${rc.retirado} · No continuan ${rc.no_continua}`,
      M,
      y + 8,
      8,
      { c: OSCURO, w: CW }
    );
    y += 18;
  }
  if (report.asistencia?.comparacion) {
    const cmp = report.asistencia.comparacion;
    texto(
      `Comparacion de inasistencias: ${cmp.anioAnterior} (${cmp.totalAnterior}) frente a ${report.anio} (${cmp.totalActual})`,
      M,
      y + 8,
      8,
      { c: GRIS, w: CW }
    );
    y += 18;
  }

  const dibujarTabla = (titulo, columnas, filas) => {
    asegurarEspacio(46);
    texto(titulo, M, y + 12, 10, { negrita: true, c: BORDO });
    y += 18;

    const dibujarEnc = () => {
      rect(M, y, CW, 17, BORDO);
      let cx = M;
      columnas.forEach((c) => {
        texto(c.tit, cx + 4, y + 11.5, 7.5, { negrita: true, c: BLANCO, alinear: c.align || "izq", w: c.w - 8 });
        cx += c.w;
      });
      y += 17;
    };
    dibujarEnc();

    if (!filas.length) {
      marco(M, y, CW, 18, LINEA, 0.35);
      texto("Sin datos registrados", M + 6, y + 12, 8, { c: GRIS });
      y += 26;
      return;
    }

    filas.forEach((fila, idx) => {
      if (y + 16 > A4_H - M) {
        nueva();
        y = M;
        dibujarEnc();
      }
      if (idx % 2 === 1) rect(M, y, CW, 16, ZEBRA);
      marco(M, y, CW, 16, LINEA, 0.3);
      let cx = M;
      fila.forEach((val, ci) => {
        if (ci > 0) linea(cx, y, cx, y + 16, LINEA, 0.25);
        texto(String(val ?? "—"), cx + 4, y + 11, 7.5, {
          alinear: columnas[ci].align || "izq",
          w: columnas[ci].w - 8,
          minimo: 6
        });
        cx += columnas[ci].w;
      });
      y += 16;
    });
    y += 12;
  };

  dibujarTabla(
    "Matricula por curso y division",
    [{ tit: "Curso y division", w: CW * 0.7 }, { tit: "Alumnos", w: CW * 0.3, align: "centro" }],
    (report.matricula?.porDivision ?? []).map((item) => [`${item.curso}° ${item.division}`, item.cantidad])
  );

  dibujarTabla(
    "Asistencia: mayores cantidades de inasistencias registradas",
    [
      { tit: "Alumno", w: CW * 0.5 },
      { tit: "Curso", w: CW * 0.16, align: "centro" },
      { tit: "Division", w: CW * 0.17, align: "centro" },
      { tit: "Registros", w: CW * 0.17, align: "centro" }
    ],
    (report.asistencia?.alumnosConMasInasistencias ?? []).map((item) => [item.alumno, item.curso ?? "—", item.division ?? "—", item.cantidad])
  );

  dibujarTabla(
    "Situacion academica por estado",
    [{ tit: "Estado", w: CW * 0.7 }, { tit: "Registros", w: CW * 0.3, align: "centro" }],
    (report.academico?.porEstado ?? []).map((item) => [item.estado, item.cantidad])
  );

  dibujarTabla(
    "Materias con desaprobaciones o condicion libre",
    [
      { tit: "Materia", w: CW * 0.52 },
      { tit: "Desaprobadas", w: CW * 0.16, align: "centro" },
      { tit: "Libres", w: CW * 0.16, align: "centro" },
      { tit: "Total", w: CW * 0.16, align: "centro" }
    ],
    (report.academico?.materiasConDificultades ?? []).map((item) => [item.materia, item.desaprobadas, item.libres, item.total])
  );

  return armarPdf(paginas, logo, { ancho: A4_W, alto: A4_H, sobreBordo: true });
}

export async function descargarInformeAnualPdf(report) {
  const logo = await cargarLogo();
  const bytes = generarInformeAnualPdf(report, logo);
  dispararDescargaPdf(bytes, `informe-institucional-${report.anio}.pdf`);
}
