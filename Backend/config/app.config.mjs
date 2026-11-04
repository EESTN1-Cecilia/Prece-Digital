import "dotenv/config";

const environment = process.env.APP_ENV ?? "development";

/* Valida que en produccion los JWT se firmen con variables de entorno reales y
   nunca con los valores de desarrollo que figuran en el codigo. */
export function assertValidSecrets({ env = environment, jwtAccessSecret, jwtRefreshSecret } = {}) {
  const access = jwtAccessSecret ?? process.env.JWT_ACCESS_SECRET ?? process.env.SESSION_SECRET ?? "change-me-access";
  const refresh = jwtRefreshSecret ?? process.env.JWT_REFRESH_SECRET ?? "change-me-refresh";

  if (env !== "production") {
    return;
  }

  if (!access || access.length < 16 || access.includes("change-me")) {
    throw new Error("En produccion JWT_ACCESS_SECRET debe ser una variable de entorno de 16 caracteres o mas");
  }

  if (!refresh || refresh.length < 16 || refresh.includes("change-me")) {
    throw new Error("En produccion JWT_REFRESH_SECRET debe ser una variable de entorno de 16 caracteres o mas");
  }
}

function listaEnv(nombre) {
  return (process.env[nombre] ?? "").split(",").map((valor) => valor.trim()).filter(Boolean);
}

/* En produccion la configuracion insegura impide arrancar. */
export function assertProductionConfig({ env = environment, corsOrigins = listaEnv("CORS_ORIGINS"), database = process.env } = {}) {
  if (env !== "production") {
    return;
  }

  if (corsOrigins.length === 0 || corsOrigins.includes("*")) {
    throw new Error("En produccion CORS_ORIGINS debe listar los origenes autorizados, sin *");
  }

  if ((database.DB_CLIENT ?? "memoria").toLowerCase() === "sqlserver" && (!database.DB_USER || !database.DB_PASSWORD)) {
    throw new Error("Con DB_CLIENT=sqlserver en produccion DB_USER y DB_PASSWORD son obligatorios");
  }

  /* Solo aviso: una base en el mismo host puede no tener TLS. */
  if ((database.DB_CLIENT ?? "memoria").toLowerCase() === "sqlserver" && database.DB_ENCRYPT !== "true") {
    console.warn("Aviso: DB_ENCRYPT no esta activo; la conexion con la base viaja sin cifrar");
  }
}

/* Falla rapido si en produccion faltan los secretos: no se arranca sin claves. */
assertValidSecrets({ env: environment });
assertProductionConfig({ env: environment });

function parseIntEnv(valor, defecto) {
  const numero = Number.parseInt(process.env[valor] ?? String(defecto), 10);
  return Number.isFinite(numero) && numero > 0 ? numero : defecto;
}

export const appConfig = {
  env: environment,
  apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.SESSION_SECRET ?? "change-me-access",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  loginMaxEmailAttempts: parseIntEnv("LOGIN_MAX_EMAIL_ATTEMPTS", 5),
  loginMaxIpAttempts: parseIntEnv("LOGIN_MAX_IP_ATTEMPTS", 20),
  loginWindowMs: parseIntEnv("LOGIN_WINDOW_MS", 15 * 60 * 1000),
  loginLockMs: parseIntEnv("LOGIN_LOCK_MS", 15 * 60 * 1000),
  corsOrigins: listaEnv("CORS_ORIGINS"),
  trustProxy: process.env.TRUST_PROXY === "true",
  /* Solicitudes por IP y por ventana. Una escuela suele salir por una sola IP,
     por eso los limites son holgados. */
  rateLimit: {
    ventanaMs: parseIntEnv("RATE_LIMIT_WINDOW_MS", 60 * 1000),
    auth: parseIntEnv("RATE_LIMIT_AUTH", 300),
    lectura: parseIntEnv("RATE_LIMIT_READ", 3000),
    escritura: parseIntEnv("RATE_LIMIT_WRITE", 1000)
  },
  /* Base de datos. Mientras DB_CLIENT no sea "sqlserver" la API sigue en el
     store en memoria. Ver database/sqlserver/README.md. */
  database: {
    client: (process.env.DB_CLIENT ?? "memoria").toLowerCase(),
    server: process.env.DB_SERVER ?? "localhost",
    port: parseIntEnv("DB_PORT", 1433),
    database: process.env.DB_NAME ?? "prece_digital",
    user: process.env.DB_USER ?? null,
    password: process.env.DB_PASSWORD ?? null,
    instanceName: process.env.DB_INSTANCE || null,
    encrypt: (process.env.DB_ENCRYPT ?? "false") === "true",
    trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE ?? "true") === "true",
    poolMax: parseIntEnv("DB_POOL_MAX", 10)
  }
};
