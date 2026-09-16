import mysql from "mysql2/promise";
import { getDatabaseConfig } from "./connection.config.mjs";

let pool;
let testPool;

export function setTestPool(mockPool) {
  testPool = mockPool;
}

export function getDatabasePool() {
  if (testPool) {
    return testPool;
  }

  if (pool) {
    return pool;
  }

  const { client, url } = getDatabaseConfig();

  if (client !== "mysql") {
    throw new Error(`Cliente de base de datos no soportado: ${client}`);
  }

  if (!url) {
    throw new Error("DATABASE_URL es obligatorio");
  }

  pool = mysql.createPool(url);
  return pool;
}

export async function checkDatabaseConnection() {
  const databasePool = getDatabasePool();
  await databasePool.query("SELECT 1");
}

export async function closeDatabaseConnection() {
  if (testPool) {
    testPool = undefined;
    return;
  }

  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
}