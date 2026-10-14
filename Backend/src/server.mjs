import { appConfig } from "../config/app.config.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { createApp } from "./app.mjs";

const port = appConfig.apiPort;

async function startServer() {
  /* La API persiste en memoria: fuera de produccion arranca con los datos de
     desarrollo de todos los modulos para que el frontend tenga con que trabajar. */
  if (appConfig.env === "production") {
    await seedAuthData();
  } else {
    await seedDesarrollo();
  }

  const server = createApp(apiRoutes);
  server.listen(port, () => {
    console.log(`API lista en http://localhost:${port} (${appConfig.env})`);
  });

  const shutdown = () => {
    server.close();
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("No se pudo iniciar la API", error.message);
  process.exitCode = 1;
});
