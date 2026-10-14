/* Genera docs/ENDPOINTS.md a partir de routes/index.mjs: la referencia de
   endpoints nunca queda desactualizada respecto del codigo.

   Uso: npm run docs:endpoints   (el test test/documentacion.test.mjs falla si
   el archivo no coincide con las rutas actuales). */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apiRoutes } from "../routes/index.mjs";

export function permisoDe(ruta) {
  const middlewares = ruta.middlewares ?? [];

  if (!middlewares.length) return "publica";

  const permisos = middlewares.map((middleware) => middleware.permiso).filter(Boolean);
  return permisos.length ? permisos.map((permiso) => `\`${permiso}\``).join(", ") : "sesion valida";
}

export function generarMarkdown() {
  const grupos = new Map();

  for (const ruta of apiRoutes) {
    const recurso = ruta.path.split("/").filter(Boolean).find((segmento, indice, lista) => indice === 2 || lista.length < 3) ?? ruta.path;
    if (!grupos.has(recurso)) grupos.set(recurso, []);
    grupos.get(recurso).push(ruta);
  }

  const lineas = [
    "# Endpoints de la API",
    "",
    "<!-- Archivo generado por `npm run docs:endpoints` desde routes/index.mjs. No editar a mano. -->",
    "",
    `Total: ${apiRoutes.length} endpoints. Autenticacion: \`Authorization: Bearer <accessToken>\` salvo las rutas publicas.`,
    ""
  ];

  for (const [recurso, rutas] of grupos) {
    lineas.push(`## ${recurso}`, "", "| Metodo | Ruta | Permiso |", "| --- | --- | --- |");

    for (const ruta of rutas) {
      lineas.push(`| ${ruta.method} | \`${ruta.path}\` | ${permisoDe(ruta)} |`);
    }

    lineas.push("");
  }

  return lineas.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const destino = fileURLToPath(new URL("../docs/ENDPOINTS.md", import.meta.url));
  writeFileSync(destino, generarMarkdown());
  console.log(`Generado ${destino}`);
}
