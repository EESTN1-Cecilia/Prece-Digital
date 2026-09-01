import { appConfig } from "../config/app.config.mjs";

export function getDatabaseConfig() {
  const isProduction = appConfig.env === "production";

  return {
    client: isProduction ? appConfig.productionDatabaseClient : appConfig.databaseClient,
    url: isProduction ? appConfig.productionDatabaseUrl : appConfig.databaseUrl
  };
}
