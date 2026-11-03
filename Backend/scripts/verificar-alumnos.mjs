/* Verificacion integral del padron para el portal del alumno.

     npm run verificar:alumnos -w @prece-digital/api
     node scripts/verificar-alumnos.mjs [--json salida.json] [--todos]

   Carga los mismos datos con los que arranca la API fuera de produccion
   (seeds + nomina local data/alumnos.local.json si existe), recorre TODOS los
   alumnos y muestra el resumen. No modifica ningun dato.

   Cuando la API use SQL Server, la verificacion equivalente sobre la base real
   esta en database/sqlserver/verificacion-alumnos.sql. */

import { writeFileSync } from "node:fs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { seedAlumnosLocales } from "../database/seeds/students.seed.mjs";
import { verificarPadron } from "../modules/student-portal/student-verification.service.mjs";

const argumentos = process.argv.slice(2);
const destino = argumentos.includes("--json") ? argumentos[argumentos.indexOf("--json") + 1] : null;
const todos = argumentos.includes("--todos");

await seedDesarrollo();
const locales = seedAlumnosLocales();

const informe = await verificarPadron({ incluirSinProblemas: todos });
const { totales } = informe;

console.log("Verificacion de alumnos - portal del alumno");
console.log(`Ciclo lectivo: ${informe.cicloLectivo}`);
console.log(`Nomina local cargada: ${locales} alumnos`);
console.log("");
console.log(`Alumnos verificados ....... ${totales.alumnosVerificados} (${totales.activos} activos, ${totales.inactivos} inactivos)`);
console.log(`Sin observaciones ......... ${totales.sinProblemas}`);
console.log(`Con observaciones ......... ${totales.conProblemas} (${totales.conErrores} con errores)`);
console.log(`Pueden ingresar con DNI ... ${totales.ingresoHabilitado}`);
console.log(`Ingreso bloqueado ......... ${totales.ingresoBloqueado} ${JSON.stringify(totales.motivosBloqueo)}`);
console.log("");

for (const item of informe.problemasPorCodigo) {
  console.log(`[${item.severidad}] ${item.codigo}: ${item.alumnos} alumno(s) - ${item.descripcion}`);
}

const huerfanos = Object.entries(informe.huerfanos).filter(([, lista]) => lista.length);
if (huerfanos.length) {
  console.log("");
  console.log("Registros que apuntan a alumnos inexistentes:");
  for (const [tipo, lista] of huerfanos) console.log(`  ${tipo}: ${lista.join(", ")}`);
}

if (destino) {
  writeFileSync(destino, JSON.stringify(informe, null, 2));
  console.log("");
  console.log(`Detalle por alumno guardado en ${destino}`);
}
