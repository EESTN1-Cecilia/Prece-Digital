/* Repositorio activo del portal del alumno.

   - DB_CLIENT=memoria (por defecto): lee del store en memoria de cada modulo.
   - DB_CLIENT=sqlserver: lee de SQL Server con student-portal.repository.sqlserver.mjs.

   El driver (`mssql`) se importa solo cuando se elige SQL Server, asi el
   proyecto sigue arrancando y pasando los tests sin tenerlo instalado. */

import { appConfig } from "../../config/app.config.mjs";
import repositorioMemoria from "./student-portal.repository.mjs";
import cuentasMemoria from "./cuentas.repository.mjs";

let repositorio = repositorioMemoria;
let cuentas = cuentasMemoria;

if (appConfig.database.client === "sqlserver") {
  ({ default: repositorio } = await import("./student-portal.repository.sqlserver.mjs"));
  ({ default: cuentas } = await import("./cuentas.repository.sqlserver.mjs"));
}

export { cuentas as cuentasRepository };
export default repositorio;
