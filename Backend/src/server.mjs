import { appConfig } from "../config/app.config.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { seedAlumnosLocales } from "../database/seeds/students.seed.mjs";
import { createApp } from "./app.mjs";
import repositorioPortalAlumno from "../modules/student-portal/repositorio.mjs";

const port = appConfig.apiPort;

async function startServer() {
  /* La API persiste en memoria: fuera de produccion arranca con los datos de
     desarrollo de todos los modulos para que el frontend tenga con que trabajar. */
  if (appConfig.env === "production") {
    await seedAuthData();
  } else {
    await seedDesarrollo();
    const locales = seedAlumnosLocales();
    if (locales > 0) {
      console.log(`Nomina local: ${locales} alumnos cargados desde alumnos.local.json`);
    }
  }

  /* Con DB_CLIENT=sqlserver se valida la conexion y se cargan los catalogos del
     portal del alumno antes de aceptar pedidos. En memoria no hace nada. */
  if (repositorioPortalAlumno.motor !== "memoria") {
    await repositorioPortalAlumno.preparar({ forzar: true });
    console.log(`Portal del alumno conectado a ${repositorioPortalAlumno.motor}`);
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
