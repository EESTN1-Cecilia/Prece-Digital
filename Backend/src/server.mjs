import { appConfig } from "../config/app.config.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { createApp } from "./app.mjs";

const { seedAuthData } = await import("../database/seeds/auth.seed.mjs");

const port = appConfig.apiPort;

async function startServer() {
  await seedAuthData();

  const server = createApp(apiRoutes);
  server.listen(port, () => {
    console.log(`API lista en http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("No se pudo iniciar la API", error.message);
  process.exitCode = 1;
});
