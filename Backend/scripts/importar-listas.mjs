/* Importa las listas de alumnos del ciclo lectivo desde una carpeta de planillas.

     node scripts/importar-listas.mjs --carpeta "C:\ruta\LISTAS 2026"                 (simulacion, no escribe la nomina)
     node scripts/importar-listas.mjs --carpeta ... --nomina-local                     (genera database/seeds/data/alumnos.local.json)

   Opciones: --ciclo 2026  --informe ruta.json  --forzar (reemplaza la nomina local)

   La API carga esa nomina al arrancar (students.seed.mjs). Por defecto es una simulacion. El informe por consola solo muestra cantidades;
   el detalle con nombres se guarda en un archivo local (data/*.local.json, fuera de git). */

import { existsSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analizar } from "../modules/students/importacion/listas.mjs";
import { leerListas } from "../modules/students/importacion/lector-archivos.mjs";

const args = process.argv.slice(2);
const opcion = (nombre) => (args.includes(nombre) ? args[args.indexOf(nombre) + 1] : null);
const bandera = (nombre) => args.includes(nombre);

const carpeta = opcion("--carpeta") ?? process.env.IMPORT_CARPETA;
const ciclo = Number(opcion("--ciclo") ?? process.env.IMPORT_CICLO_LECTIVO ?? new Date().getFullYear());
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const informeRuta = path.resolve(opcion("--informe") ?? path.join(raiz, "data", "importacion-listas.local.json"));
const nominaRuta = path.join(raiz, "database", "seeds", "data", "alumnos.local.json");

if (!carpeta) {
  console.error('Falta --carpeta "ruta de las listas" (o IMPORT_CARPETA).');
  process.exit(1);
}

const { listas, omitidos, archivos } = await leerListas(carpeta);
const analisis = analizar(listas);
const pendientes = [...omitidos.map((o) => ({ ...o })), ...analisis.pendientes];

console.log(`Importacion de listas - ciclo lectivo ${ciclo}`);
console.log(`Archivos leidos ........ ${archivos.length}  (omitidos/ilegibles: ${omitidos.length})`);
console.log(`Hojas de grupos de taller no importadas: ${archivos.reduce((s, a) => s + a.hojasDeGrupos, 0)}`);
console.log(`Alumnos importables .... ${analisis.alumnos.length}`);
console.log(`Pendientes de revision . ${pendientes.length}`);
const porMotivo = Object.entries(pendientes.reduce((acc, p) => ({ ...acc, [p.motivo]: (acc[p.motivo] ?? 0) + 1 }), {}));
porMotivo.forEach(([motivo, n]) => console.log(`   ${motivo}: ${n}`));
analisis.advertencias.forEach((a) => console.log(`Advertencia: ${a.detalle} (${a.archivo})`));
console.log("Por curso (importables / pendientes):");
for (const [curso, r] of Object.entries(analisis.porCurso).sort()) console.log(`   ${curso}: ${r.importables} / ${r.pendientes}`);

mkdirSync(path.dirname(informeRuta), { recursive: true });
writeFileSync(informeRuta, JSON.stringify({ ciclo, generado: new Date().toISOString(), archivos, resumen: analisis.porCurso, pendientes, advertencias: analisis.advertencias }, null, 2));
console.log(`Detalle guardado en ${informeRuta}`);

if (bandera("--nomina-local")) {
  if (existsSync(nominaRuta)) {
    if (!bandera("--forzar")) {
      console.error(`Ya existe ${nominaRuta}. Usar --forzar para reemplazarla (se guarda una copia .bak.local.json).`);
      process.exit(1);
    }
    copyFileSync(nominaRuta, nominaRuta.replace(/\.local\.json$/, ".bak.local.json"));
  }
  mkdirSync(path.dirname(nominaRuta), { recursive: true });
  writeFileSync(nominaRuta, JSON.stringify(analisis.alumnos.map(({ apellido, nombre, curso, division, genero }) => ({ apellido, nombre, curso, division, genero })), null, 2));
  console.log(`Nomina local escrita (${analisis.alumnos.length} alumnos) para DB_CLIENT=memoria.`);
}
