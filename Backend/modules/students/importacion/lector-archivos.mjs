/* Lee la carpeta de listas (recursiva) y arma las `listas` que consume analizar().
   Excel y CSV se leen con la libreria `xlsx` que ya usa el frontend; PDF y Word
   no se procesan: se informan como pendientes de revision. */

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { normalizarCurso } from "./listas.mjs";

const LEIBLES = new Set([".xlsx", ".xlsm", ".xls", ".csv"]);
const NO_PROCESABLES = new Set([".pdf", ".doc", ".docx", ".odt"]);

async function archivosDe(carpeta) {
  const salida = [];
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await archivosDe(ruta)));
    else if (!entrada.name.startsWith("~$")) salida.push(ruta);
  }
  return salida.sort();
}

async function cargarXlsx() {
  try {
    return await import("xlsx");
  } catch {
    throw new Error("Falta la libreria xlsx. Ejecutar: npm install xlsx -w @prece-digital/api");
  }
}

export async function leerListas(carpeta) {
  const XLSX = await cargarXlsx();
  const listas = [];
  const omitidos = [];
  const archivos = [];

  for (const ruta of await archivosDe(carpeta)) {
    const extension = path.extname(ruta).toLowerCase();
    const relativo = path.relative(carpeta, ruta);

    if (NO_PROCESABLES.has(extension)) {
      omitidos.push({ archivo: relativo, motivo: "formato_no_procesado", detalle: `${extension}: revisar manualmente` });
      continue;
    }
    if (!LEIBLES.has(extension)) continue;

    try {
      const contenido = await readFile(ruta);
      const libro = XLSX.read(contenido, { type: "buffer", cellDates: false });
      const etiquetaArchivo = path.basename(ruta, extension);
      const curso = normalizarCurso(etiquetaArchivo);
      /* La nomina es la hoja que lleva el nombre del curso; si no hay, la primera. */
      const nomina = libro.SheetNames.find((nombre) => normalizarCurso(nombre)?.etiqueta === curso?.etiqueta) ?? libro.SheetNames[0];
      const hojaDeGrupos = libro.SheetNames.filter((nombre) => nombre !== nomina);

      listas.push({
        archivo: relativo,
        hoja: nomina,
        etiquetaArchivo,
        filas: XLSX.utils.sheet_to_json(libro.Sheets[nomina], { header: 1, defval: null, raw: true, blankrows: true })
      });
      archivos.push({ archivo: relativo, hoja: nomina, hojasDeGrupos: hojaDeGrupos.length, sha256: createHash("sha256").update(contenido).digest("hex") });
    } catch (error) {
      omitidos.push({ archivo: relativo, motivo: "archivo_ilegible", detalle: error.message });
    }
  }

  return { listas, omitidos, archivos };
}
