/* Repositorio activo del portal del alumno.

   - DB_PORTAL=memoria (por defecto): lee del store de cada modulo (persistido en la
     base si DB_CLIENT=mysql o sqlserver), asi ve lo que cargan docentes y preceptores.
   - DB_PORTAL=sqlserver: lee las tablas academicas reales con
     student-portal.repository.sqlserver.mjs (requiere 001_portal_alumno.sql).

   El driver (`mssql`) se importa solo cuando se elige SQL Server, asi el
   proyecto sigue arrancando y pasando los tests sin tenerlo instalado. */

import { appConfig } from "../../config/app.config.mjs";
import repositorioMemoria from "./student-portal.repository.mjs";
import cuentasMemoria from "./cuentas.repository.mjs";

let repositorio = repositorioMemoria;
let cuentas = cuentasMemoria;

if (appConfig.database.portal === "sqlserver") {
  ({ default: repositorio } = await import("./student-portal.repository.sqlserver.mjs"));
  ({ default: cuentas } = await import("./cuentas.repository.sqlserver.mjs"));
}

export { cuentas as cuentasRepository };
export default repositorio;
