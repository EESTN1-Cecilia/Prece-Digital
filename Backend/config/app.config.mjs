export const appConfig = {
  env: process.env.APP_ENV ?? "development",
  apiPort: Number.parseInt(process.env.API_PORT ?? "3000", 10),
  databaseClient: process.env.DATABASE_CLIENT ?? "mysql",
  databaseUrl: process.env.DATABASE_URL ?? "",
  productionDatabaseClient: process.env.PRODUCTION_DATABASE_CLIENT ?? "postgres",
  productionDatabaseUrl: process.env.PRODUCTION_DATABASE_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? ""
};
