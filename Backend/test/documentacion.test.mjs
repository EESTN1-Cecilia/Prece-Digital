/* La documentacion no puede citar rutas que no existen.

   - docs/ENDPOINTS.md tiene que coincidir con routes/index.mjs (se regenera con
     `npm run docs:endpoints`).
   - Toda ruta /api/v1/... citada en un README del monorepo tiene que existir. */

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiRoutes, matchRoute } from "../routes/index.mjs";
import { generarMarkdown } from "../scripts/generar-endpoints.mjs";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function markdowns(directorio) {
  return readdirSync(directorio).flatMap((nombre) => {
    if (["node_modules", ".git", "dist"].includes(nombre)) return [];
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return markdowns(ruta);
    return nombre.endsWith(".md") ? [ruta] : [];
  });
}

test("docs/ENDPOINTS.md esta al dia con routes/index.mjs", () => {
  const actual = readFileSync(new URL("../docs/ENDPOINTS.md", import.meta.url), "utf8");
  assert.equal(actual, generarMarkdown(), "Correr: npm run docs:endpoints");
});

test("las rutas citadas en los README existen en el backend", () => {
  const inexistentes = [];

  for (const archivo of markdowns(RAIZ)) {
    const texto = readFileSync(archivo, "utf8");

    for (const [, metodo, ruta] of texto.matchAll(/(GET|POST|PUT|PATCH|DELETE)?\s*`?(\/api\/v1\/[A-Za-z0-9_:\-/]*[A-Za-z0-9_])/g)) {
      const ejemplo = ruta.replace(/:[A-Za-z]+/g, "x");
      const candidatos = metodo ? [metodo] : METODOS;

      if (!candidatos.some((candidato) => matchRoute(apiRoutes, candidato, ejemplo))) {
        inexistentes.push(`${metodo ?? "*"} ${ruta} (${archivo.slice(RAIZ.length)})`);
      }
    }
  }

  assert.deepEqual([...new Set(inexistentes)], []);
});
