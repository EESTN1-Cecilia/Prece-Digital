/* Conexion a SQL Server (pool unico para toda la API).

   Usa el paquete `mssql` (driver tedious). Se importa recien al primer uso, asi
   el proyecto arranca y corre los tests sin tenerlo instalado mientras
   DB_CLIENT no sea "sqlserver". Para instalarlo:

     npm install mssql -w @prece-digital/api

   Configuracion: variables DB_* de Backend/.env (ver .env.example). */

import { appConfig } from "../../config/app.config.mjs";

let promesaPool = null;
let sql = null;

function configuracion() {
  const db = appConfig.database;

  return {
    server: db.server,
    port: db.instanceName ? undefined : db.port,
    database: db.database,
    user: db.user ?? undefined,
    password: db.password ?? undefined,
    pool: { max: db.poolMax, min: 0, idleTimeoutMillis: 30000 },
    options: {
      encrypt: db.encrypt,
      trustServerCertificate: db.trustServerCertificate,
      instanceName: db.instanceName ?? undefined,
      useUTC: true
    }
  };
}

export async function obtenerPool() {
  if (!promesaPool) {
    promesaPool = (async () => {
      try {
        ({ default: sql } = await import("mssql"));
      } catch {
        throw new Error('Falta el driver de SQL Server. Ejecutar: npm install mssql -w @prece-digital/api');
      }

      const pool = new sql.ConnectionPool(configuracion());
      pool.on("error", (error) => console.error("[sqlserver]", error.message));
      return pool.connect();
    })();

    /* Si la conexion falla, el proximo pedido vuelve a intentar. */
    promesaPool.catch(() => {
      promesaPool = null;
    });
  }

  return promesaPool;
}

/* Ejecuta una consulta parametrizada y devuelve las filas. Los valores SIEMPRE
   viajan como parametros (@nombre): nunca se concatenan al texto SQL. */
export async function consultar(texto, parametros = {}) {
  const pool = await obtenerPool();
  const pedido = pool.request();

  for (const [nombre, valor] of Object.entries(parametros)) {
    pedido.input(nombre, valor);
  }

  const resultado = await pedido.query(texto);
  return resultado.recordset ?? [];
}

/* Ejecuta varias operaciones en una transaccion: si una falla, no queda nada a medias. */
export async function enTransaccion(trabajo) {
  const pool = await obtenerPool();
  const transaccion = new sql.Transaction(pool);
  await transaccion.begin();

  const consultarEnTransaccion = async (texto, parametros = {}) => {
    const pedido = new sql.Request(transaccion);
    for (const [nombre, valor] of Object.entries(parametros)) pedido.input(nombre, valor);
    return (await pedido.query(texto)).recordset ?? [];
  };

  try {
    const resultado = await trabajo(consultarEnTransaccion);
    await transaccion.commit();
    return resultado;
  } catch (error) {
    await transaccion.rollback().catch(() => {});
    throw error;
  }
}

export async function cerrarPool() {
  if (promesaPool) {
    const pool = await promesaPool.catch(() => null);
    promesaPool = null;
    await pool?.close();
  }
}
