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

/* Falla rapido si en produccion faltan los secretos: no se arranca sin claves. */
assertValidSecrets({ env: environment });

function parseIntEnv(valor, defecto) {
  const numero = Number.parseInt(process.env[valor] ?? String(defecto), 10);
  return Number.isFinite(numero) && numero > 0 ? numero : defecto;
}

export const appConfig = {
  env: environment,
  apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
  databaseClient: process.env.DATABASE_CLIENT ?? "mysql",
  databaseUrl: process.env.DATABASE_URL ?? "",
  productionDatabaseClient: process.env.PRODUCTION_DATABASE_CLIENT ?? "postgres",
  productionDatabaseUrl: process.env.PRODUCTION_DATABASE_URL ?? "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.SESSION_SECRET ?? "change-me-access",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  loginMaxEmailAttempts: parseIntEnv("LOGIN_MAX_EMAIL_ATTEMPTS", 5),
  loginMaxIpAttempts: parseIntEnv("LOGIN_MAX_IP_ATTEMPTS", 20),
  loginWindowMs: parseIntEnv("LOGIN_WINDOW_MS", 15 * 60 * 1000),
  loginLockMs: parseIntEnv("LOGIN_LOCK_MS", 15 * 60 * 1000),
  authDevUserId: process.env.AUTH_DEV_USER_ID ?? ""
};
