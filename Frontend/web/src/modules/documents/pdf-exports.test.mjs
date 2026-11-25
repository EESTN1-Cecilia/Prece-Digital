import test from "node:test";
import assert from "node:assert/strict";
import {
  generarAlumnoRegularPdf,
  generarSituacionAcademicaPdf,
  generarTramitePasePdf,
  generarSolicitudPasePdf,
  generarRitePdf
} from "./constancias-pdf.js";
import { generarAsistenciasPdf } from "../attendance/asistencias-export.js";
import { generarMatrizPdf } from "../students/matriz-pdf.js";
import { generarNominaPdf } from "../students/nomina-pdf.js";
import { generarInformeAnualPdf } from "../director/annual-management-pdf.js";

const textoPdf = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

const alumno = {
  apellido: "Perez",
  nombre: "Ana",
  dni: "45123456",
  curso: "3°",
  division: "1",
  turno: "Mañana",
  orientacion: "Programación"
};

function validarPdf(bytes, textoEsperado) {
  assert.ok(bytes instanceof Uint8Array && bytes.length > 300);
  const txt = textoPdf(bytes);
  assert.ok(txt.startsWith("%PDF-1.4"), "debe iniciar con cabecera PDF-1.4");
  assert.ok(txt.endsWith("%%EOF"), "debe terminar con %%EOF");
  if (textoEsperado) assert.ok(txt.includes(textoEsperado), `debe contener "${textoEsperado}"`);
}

test("constancias, pases y RITE generan PDF valido", () => {
  validarPdf(generarAlumnoRegularPdf({ alumno }), "CONSTANCIA DE ALUMNO REGULAR");
  validarPdf(generarSituacionAcademicaPdf({ alumno, materiasAdeudadas: ["MATEMATICA", "FISICA"] }), "MATEMATICA");
  validarPdf(generarTramitePasePdf({ alumno, materiasAdeudadas: "NINGUNA" }), "CERTIFICADO DE ESTUDIO EN TRAMITE");
  validarPdf(generarSolicitudPasePdf({ alumno, establecimientoDestino: "EEST N° 2" }), "SOLICITUD DE PASES");
  validarPdf(
    generarRitePdf({
      alumno,
      materias: [{ tipo: "C", nombre: "Matematica", nota1C: "8", nota2C: "9", dic: "-", feb: "-", final: "9 (NUEVE)" }],
      inasistencias: { c1: 2, c2: 1, total: "3" }
    }),
    "Matematica"
  );
});

test("asistencias, matriz, nomina e informe anual generan PDF valido", () => {
  const diasMes = [
    { numero: 1, letra: "LU", esFinDeSemana: false },
    { numero: 2, letra: "MA", esFinDeSemana: false }
  ];
  validarPdf(
    generarAsistenciasPdf({
      cursoActual: { curso: "2°", division: "1", turno: "Mañana" },
      mesNombre: "Marzo",
      anio: 2026,
      diasMes,
      alumnos: [{ orden: 1, apellido: "Gomez", nombre: "Luis" }],
      registros: { 1: { 1: "P", 2: "A" } },
      balanceMensual: { diasHabiles: 20, asistenciaMedia: "95%", porcentajeAsistencia: "95%" }
    }),
    "REGISTRO DE ASISTENCIA"
  );

  validarPdf(
    generarMatrizPdf({
      datosEstudiante: alumno,
      orientacionNombre: "Programacion",
      anios: [{ clave: "primero", titulo: "PRIMERO", materias: [{ espacio: "Matematica", calificacion: "8", condicion: "REGULAR" }] }],
      promedio: { promedioNumerico: "8.00", promedioTexto: "OCHO" }
    }),
    "LIBRO MATRIZ"
  );

  validarPdf(generarNominaPdf([alumno], "Curso: 3°"), "NOMINA DE ALUMNOS");

  validarPdf(
    generarInformeAnualPdf({
      anio: 2026,
      generadoEn: new Date().toISOString(),
      filtros: { curso: null, division: null },
      matricula: { disponible: true, total: 120, porDivision: [{ curso: 1, division: "1", cantidad: 30 }] },
      asistencia: { totalInasistencias: 45, comparacion: { anioAnterior: 2025, totalAnterior: 50, totalActual: 45 }, alumnosConMasInasistencias: [] },
      academico: { totalSituaciones: 10, alumnosConSituacionesNoAprobadas: 2, totalEvaluaciones: 80, porEstado: [], materiasConDificultades: [] }
    }),
    "INFORME INSTITUCIONAL ANUAL 2026"
  );
});
