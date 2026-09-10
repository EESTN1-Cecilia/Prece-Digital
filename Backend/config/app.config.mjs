import "dotenv/config";

export const appConfig = {
  env: process.env.APP_ENV ?? "development",
  apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
  databaseClient: process.env.DATABASE_CLIENT ?? "mysql",
  databaseUrl: process.env.DATABASE_URL ?? "",
  productionDatabaseClient: process.env.PRODUCTION_DATABASE_CLIENT ?? "postgres",
  productionDatabaseUrl: process.env.PRODUCTION_DATABASE_URL ?? "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.SESSION_SECRET ?? "change-me-access",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  authDevUserId: process.env.AUTH_DEV_USER_ID ?? ""
};
