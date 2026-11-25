import { appConfig } from "../config/app.config.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedProductionAdmin } from "../database/seeds/auth.seed.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import { seedAlumnosLocales } from "../database/seeds/students.seed.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import calendarioService from "../modules/calendario/calendario.service.mjs";
import { seedAcademiaLocal } from "../database/seeds/alumnos-locales-academia.seed.mjs";
import { seedDatosAlumnos } from "../database/seeds/alumnos-datos.seed.mjs";
import { seedDocentesTalleres } from "../database/seeds/docentes-talleres.seed.mjs";
import { seedAlumnosTalleres } from "../database/seeds/alumnos-talleres.seed.mjs";
import { createApp } from "./app.mjs";
import { buscarDivision } from "../modules/students/catalogo.mjs";
import repositorioPortalAlumno from "../modules/student-portal/repositorio.mjs";
import { iniciarPersistencia } from "../database/persistencia.mjs";

const port = appConfig.apiPort;

async function startServer() {
  /* Con DB_CLIENT=mysql o sqlserver el store se carga de la base y se guarda en ella
     (database/persistencia.mjs). Si la base ya tiene datos no se corren los seeds. */
  const persistencia = await iniciarPersistencia();
  const restauradas = persistencia ? await persistencia.cargar() : 0;

  /* Sin datos guardados, fuera de produccion arranca con los datos de
     desarrollo de todos los modulos para que el frontend tenga con que trabajar. */
  if (restauradas > 0) {
    console.log(`Persistencia: ${restauradas} colecciones cargadas desde ${appConfig.database.client}`);
  } else if (appConfig.env === "production") {
    await seedProductionAdmin();
    /* La nomina de la escuela (database/seeds/data/alumnos.local.json, fuera de git) tambien
       se carga en produccion: los modulos del personal leen los alumnos del store en memoria,
       y sin esto los listados y tableros quedan en cero. Si el archivo no esta, no hace nada;
       si no se puede leer (permisos, JSON roto) se informa y la API arranca igual.
       Se desactiva con NOMINA_LOCAL=false. */
    if (process.env.NOMINA_LOCAL !== "false") {
      try {
        const locales = seedAlumnosLocales();
        if (locales > 0) console.log(`Nomina: ${locales} alumnos cargados desde alumnos.local.json`);
      } catch (error) {
        console.error(`Nomina: no se pudo cargar alumnos.local.json (${error.message})`);
      }
    }
  } else {
    await seedDesarrollo();
    const locales = seedAlumnosLocales();
    if (locales > 0) {
      console.log(`Nomina local: ${locales} alumnos cargados desde alumnos.local.json`);
      /* Con la nomina real cargada, los alumnos ficticios de desarrollo (alu-1, alu-2...)
         quedan dados de baja: asi los listados, cursos y tableros muestran solo la nomina
         de la escuela. Es baja logica: los datos que los referencian se conservan. */
      const ficticios = studentRepository.all().filter((alumno) => /^alu-\d+$/.test(alumno.id) && alumno.isActive !== false);
      ficticios.forEach((alumno) => studentRepository.deactivate(alumno.id));
      if (ficticios.length > 0) console.log(`Nomina local: ${ficticios.length} alumnos de demostracion dados de baja`);
    }
    /* Cuenta de prueba para entrar al portal del alumno (#/login). La nomina real trae DNI
       provisorios, que no sirven como credencial, asi que se agrega un alumno con DNI propio.
       Ingreso: usuario alumno.demo@alumno.prece.local (o 40000001) y contraseña 40000001.
       Se desactiva con ALUMNO_DEMO=false. */
    if (process.env.ALUMNO_DEMO !== "false" && !studentRepository.findByDni("40000001")) {
      const { turno, orientacion } = buscarDivision(1, "1") ?? {};
      studentRepository.create({
        id: "alu-demo",
        escuelaId: "esc-1",
        apellido: "Demo",
        nombre: "Alumno",
        dni: "40000001",
        grupoTaller: "1.3",
        genero: "masculino",
        curso: 1,
        division: "1",
        turno,
        orientacion,
        condicion: "regular",
        fechaNacimiento: "2013-01-01",
        fechaAlta: `${new Date().getFullYear()}-03-01`
      });
      console.log("Alumno de prueba: alumno.demo@alumno.prece.local / 40000001");
    }
    const { notas, ausencias, previas } = seedAcademiaLocal();
    if (notas > 0) {
      console.log(`Nomina local: ${notas} notas, ${ausencias} ausencias y ${previas} previas de prueba cargadas`);
    }
    const datos = seedDatosAlumnos();
    console.log(`Datos de alumnos: ${datos.notas} notas, ${datos.previas} previas y ${datos.inasistencias} inasistencias en ${datos.alumnos} alumnos; ${datos.datosPersonales} legajos completados y ${datos.tutores} tutores`);
    seedDocentesTalleres();
    console.log("Talleres de jefatura asignados (menos 3 cursos de prueba)");
    const alumnosAsignados = seedAlumnosTalleres();
    console.log(`Alumnos asignados a grupos de taller: ${alumnosAsignados} (pendientes: 1°3, 1°4 y 1°6)`);
  }

  const nuevosEventos = calendarioService.cargarIniciales();
  if (nuevosEventos > 0) console.log(`Calendario: ${nuevosEventos} fechas iniciales cargadas (pendientes de verificacion)`);

  /* Consulta periodica de las fuentes oficiales (cada 12 h y al arrancar). Si la
     fuente falla se conservan los datos y queda registrado en el log. */
  if (process.env.CALENDARIO_AUTOMATICO !== "false") {
    const consultar = () => calendarioService.actualizarDesdeFuentes().then(
      (r) => console.log(`Calendario: consulta ${r.ok ? "correcta" : "sin cambios (" + r.motivo + ")"}`),
      (e) => console.error("Calendario: error al consultar", e.message)
    );
    setTimeout(consultar, 5000).unref();
    setInterval(consultar, 12 * 60 * 60 * 1000).unref();
  }

  /* Con DB_CLIENT=sqlserver se valida la conexion y se cargan los catalogos del
     portal del alumno antes de aceptar pedidos. En memoria no hace nada. */
  if (repositorioPortalAlumno.motor !== "memoria") {
    await repositorioPortalAlumno.preparar({ forzar: true });
    console.log(`Portal del alumno conectado a ${repositorioPortalAlumno.motor}`);
  }

  if (persistencia) {
    await persistencia.guardar();
    setInterval(persistencia.guardar, 60 * 1000).unref();
    console.log(`Persistencia: datos guardados en ${appConfig.database.client}`);
  }

  const server = createApp(apiRoutes, { alModificar: persistencia?.programarGuardado });
  server.listen(port, () => {
    console.log(`API lista en http://localhost:${port} (${appConfig.env})`);
  });

  const shutdown = () => {
    server.close();
    persistencia?.cerrar().catch((error) => console.error("Persistencia: error al cerrar", error.message));
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("No se pudo iniciar la API", error.message);
  process.exitCode = 1;
});
