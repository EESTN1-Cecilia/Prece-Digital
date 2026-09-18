/* Contrato Frontend <-> Backend.

   Recorre el codigo del frontend web, junta cada ruta /api/v1/... que usa y
   verifica que exista en routes/index.mjs con el mismo metodo. Si alguien agrega
   una llamada a un endpoint que no existe (o renombra una ruta del backend),
   este test falla en el CI antes del merge. */

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiRoutes, matchRoute } from "../routes/index.mjs";

const RAIZ_FRONTEND = fileURLToPath(new URL("../../Frontend/web/src", import.meta.url));

function archivos(directorio) {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.js$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });
}

/* Texto completo de la llamada, respetando parentesis anidados. */
function argumentos(codigo, desde) {
  let profundidad = 0;

  for (let indice = desde; indice < codigo.length; indice += 1) {
    if (codigo[indice] === "(") profundidad += 1;
    if (codigo[indice] === ")") {
      profundidad -= 1;
      if (profundidad === 0) return codigo.slice(desde, indice + 1);
    }
  }

  return codigo.slice(desde);
}

/* Llamadas a pedir("/api/v1/...", { method }) y pedirCompleto(...). */
function llamadas() {
  const encontradas = [];

  for (const archivo of archivos(RAIZ_FRONTEND)) {
    const codigo = readFileSync(archivo, "utf8");

    for (const inicio of codigo.matchAll(/\bpedir(?:Completo)?(?=\()/g)) {
      const texto = argumentos(codigo, inicio.index + inicio[0].length);
      const ruta = /^\(\s*[`"](\/api\/v1\/[^`"?]*)/.exec(texto)?.[1];

      if (!ruta) continue;

      encontradas.push({
        archivo: archivo.slice(RAIZ_FRONTEND.length + 1),
        /* ${expresion} -> segmento de ejemplo */
        ruta: ruta.replace(/\$\{[^}]+\}/g, "x"),
        metodo: /method:\s*"([A-Z]+)"/.exec(texto)?.[1] ?? "GET"
      });
    }
  }

  return encontradas;
}

test("el frontend encuentra llamadas a la API para verificar", () => {
  assert.ok(llamadas().length >= 20);
});

test("cada endpoint que usa el frontend existe en el backend", () => {
  const faltantes = llamadas().filter(({ ruta, metodo }) => !matchRoute(apiRoutes, metodo, ruta));

  assert.deepEqual(
    faltantes.map(({ metodo, ruta, archivo }) => `${metodo} ${ruta} (${archivo})`),
    [],
    "El frontend llama a rutas que el backend no expone"
  );
});
