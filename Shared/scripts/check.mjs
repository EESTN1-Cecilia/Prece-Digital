/* Verifica la sintaxis de todo el JavaScript del monorepo (node --check).
   Uso: npm run check */

import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RAICES = ["Backend", "Frontend/web/src", "Shared"];
const IGNORAR = new Set(["node_modules", "dist", ".git"]);

function archivos(directorio) {
  return readdirSync(directorio).flatMap((nombre) => {
    if (IGNORAR.has(nombre)) return [];
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(mjs|js)$/.test(nombre) ? [ruta] : [];
  });
}

const fallas = [];
const lista = RAICES.flatMap(archivos);

for (const archivo of lista) {
  try {
    execFileSync(process.execPath, ["--check", archivo], { stdio: "pipe" });
  } catch (error) {
    fallas.push(`${archivo}\n${error.stderr?.toString().split("\n").slice(0, 4).join("\n")}`);
  }
}

if (fallas.length) {
  console.error(`Errores de sintaxis en ${fallas.length} archivo(s):\n\n${fallas.join("\n\n")}`);
  process.exit(1);
}

console.log(`Sintaxis OK en ${lista.length} archivos.`);
