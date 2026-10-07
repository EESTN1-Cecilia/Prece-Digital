import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";
import { seedAttendanceAlerts } from "../database/seeds/attendance-alerts.seed.mjs";
import attendanceAlertsRepository from "../modules/attendance-alerts/attendance-alerts.repository.mjs";
import notificationsRepository from "../modules/notifications/notifications.repository.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { detectarAlertas, rachaActual } from "../modules/attendance-alerts/deteccion.service.mjs";
import { completarConfiguracion } from "../modules/attendance-alerts/catalogo.mjs";
import { getStore } from "../database/memory-store.mjs";

const PUERTO = 4007;
const base = `http://127.0.0.1:${PUERTO}`;

let servidor;
let director;
let preceptor;
let secretario;
let docente;
let idPreceptor;

async function login(email, password) {
  const respuesta = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (respuesta.status !== 200) {
    throw new Error(`No se pudo autenticar ${email}: ${respuesta.status}`);
  }

  return (await respuesta.json()).accessToken;
}

async function pedir(metodo, ruta, token, cuerpo) {
  const cabeceras = token ? { authorization: `Bearer ${token}` } : {};

  if (cuerpo !== undefined) {
    cabeceras["content-type"] = "application/json";
  }

  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });

  return { status: respuesta.status, cuerpo: await respuesta.json() };
}

function notificacionesDe(alertaId) {
  return notificationsRepository.list().filter((item) => item.referenceId === alertaId);
}

before(async () => {
  await seedAuthData();
  seedAttendanceAlerts();
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
  director = await login("director@prece.local", "Director123!");
  preceptor = await login("preceptor@prece.local", "Preceptor123!");
  secretario = await login("secretaria@prece.local", "Secretaria123!");
  docente = await login("docente@prece.local", "Docente123!");
  const yo = await pedir("GET", "/api/v1/auth/me", preceptor);
  idPreceptor = yo.cuerpo.data.user.id;
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(() => {
  /* Cada test arranca con la configuracion institucional por defecto: si uno la
     cambia, no puede arrastrar el cambio al siguiente. */
  attendanceAlertsRepository.saveConfiguracion(completarConfiguracion({}, "esc-1"));
});

/* ========================================================================== */
/* Motor de deteccion (sin servidor)                                          */
/* ========================================================================== */

const configDePrueba = (extra = {}) => completarConfiguracion({ ...extra }, "esc-1");

test("el motor detecta el periodo cuando se alcanza el umbral de dias lectivos", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false }
  ];

  const periodos = detectarAlertas(inasistencias, configDePrueba({ diasConsecutivos: 3 }), { id: "alu-1" });

  assert.equal(periodos.length, 1);
  assert.equal(periodos[0].periodoDesde, "2026-03-02");
  assert.equal(periodos[0].periodoHasta, "2026-03-04");
  assert.equal(periodos[0].cantidadInasistencias, 3);
  assert.deepEqual(periodos[0].inasistenciaIds, ["i1", "i2", "i3"]);
});

test("el motor no detecta nada si el alumno no llega al umbral", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false }
  ];

  assert.equal(detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" }).length, 0);
});

test("el fin de semana no corta la racha porque no hay clase que falte", () => {
  /* jueves, viernes y lunes: el sabado y el domingo estan en el medio. */
  const inasistencias = [
    { id: "i1", fecha: "2026-03-05", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-06", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-09", tipo: "ausente", justificada: false }
  ];

  const periodos = detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" });

  assert.equal(periodos.length, 1);
  assert.equal(periodos[0].periodoDesde, "2026-03-05");
  assert.equal(periodos[0].periodoHasta, "2026-03-09");
});

test("un dia no habil declarado por la escuela no cuenta como dia de racha", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false }
  ];

  assert.equal(detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" }).length, 1);
  assert.equal(
    detectarAlertas(inasistencias, configDePrueba({ diasNoHabiles: ["2026-03-03"] }), { id: "alu-1" }).length,
    0
  );
});

test("un hueco entre dias lectivos corta la racha", () => {
  /* lunes, martes y jueves: el miercoles no hay inasistencia registrada. */
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-05", tipo: "ausente", justificada: false }
  ];

  assert.equal(detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" }).length, 0);
});

test("una inasistencia justificada no cuenta para el umbral y corta la racha", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: true },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false },
    { id: "i4", fecha: "2026-03-05", tipo: "ausente", justificada: false }
  ];

  assert.equal(detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" }).length, 0);
});

test("una inasistencia justificada cuenta si la institucion lo configura asi", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: true },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false }
  ];

  const periodos = detectarAlertas(
    inasistencias,
    configDePrueba({ justificadasGeneranAlerta: true, justificadasReinicianRacha: false }),
    { id: "alu-1" }
  );

  assert.equal(periodos.length, 1);
  assert.equal(periodos[0].cantidadInasistencias, 3);
});

test("si la inasistencia justificada cuenta, se comporta como cualquier otra", () => {
  /* Cuando `justificadasGeneranAlerta` esta activo, la inasistencia justificada
     integra el periodo: `justificadasReinicianRacha` solo aplica a las que no
     cuentan, porque una no puede a la vez sumar y cortar. */
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: true },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false },
    { id: "i4", fecha: "2026-03-05", tipo: "ausente", justificada: false }
  ];

  const periodos = detectarAlertas(
    inasistencias,
    configDePrueba({ justificadasGeneranAlerta: true, justificadasReinicianRacha: true }),
    { id: "alu-1" }
  );

  assert.equal(periodos.length, 1);
  assert.deepEqual(periodos[0].inasistencias.map((item) => item.justificada), [false, true, false]);
});

test("solo cuentan los tipos de inasistencia que la escuela contabiliza", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "tarde", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "tarde", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "tarde", justificada: false }
  ];

  assert.equal(detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" }).length, 0);
  assert.equal(
    detectarAlertas(inasistencias, configDePrueba({ tiposContabilizados: ["ausente", "tarde"] }), { id: "alu-1" })
      .length,
    1
  );
});

test("una racha mas larga que el umbral genera un solo aviso por periodo completo", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false },
    { id: "i4", fecha: "2026-03-05", tipo: "ausente", justificada: false },
    { id: "i5", fecha: "2026-03-06", tipo: "ausente", justificada: false }
  ];

  const periodos = detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" });

  assert.equal(periodos.length, 1);
  assert.equal(periodos[0].periodoHasta, "2026-03-04");
});

test("un segundo periodo completo genera una alerta nueva con otra clave", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false },
    { id: "i4", fecha: "2026-03-05", tipo: "ausente", justificada: false },
    { id: "i5", fecha: "2026-03-06", tipo: "ausente", justificada: false },
    { id: "i6", fecha: "2026-03-09", tipo: "ausente", justificada: false }
  ];

  const periodos = detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" });

  assert.equal(periodos.length, 2);
  assert.notEqual(periodos[0].clave, periodos[1].clave);
});

test("la clave de deduplicacion depende de la regla con la que se detecto", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false }
  ];

  const conTres = detectarAlertas(inasistencias, configDePrueba({ diasConsecutivos: 3 }), { id: "alu-1" })[0];
  const conDos = detectarAlertas(inasistencias, configDePrueba({ diasConsecutivos: 2 }), { id: "alu-1" })[0];

  assert.notEqual(conTres.clave, conDos.clave);
  assert.ok(conTres.clave.startsWith("esc-1|alu-1|inasistencias_consecutivas|2026-03-02|2026-03-04|3"));
});

test("la deteccion respeta el orden cronologico y no le importa como llegan los datos", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false }
  ];
  const desordenados = [inasistencias[2], inasistencias[0], inasistencias[1]];

  assert.equal(
    detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" })[0].clave,
    detectarAlertas(desordenados, configDePrueba(), { id: "alu-1" })[0].clave
  );
});

test("una evaluacion repetida devuelve el mismo resultado: la deteccion es pura", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false }
  ];

  assert.deepEqual(
    detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" }),
    detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" })
  );
});

test("las inasistencias dadas de baja no cuentan para la deteccion", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false, bajaEn: "2026-03-05T10:00:00.000Z" }
  ];

  assert.equal(detectarAlertas(inasistencias, configDePrueba(), { id: "alu-1" }).length, 0);
});

test("con la deteccion deshabilitada no se generan periodos", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false },
    { id: "i3", fecha: "2026-03-04", tipo: "ausente", justificada: false }
  ];

  assert.equal(detectarAlertas(inasistencias, configDePrueba({ habilitada: false }), { id: "alu-1" }).length, 0);
});

test("el resumen de racha indica cuanto falta para que salte la alerta", () => {
  const inasistencias = [
    { id: "i1", fecha: "2026-03-02", tipo: "ausente", justificada: false },
    { id: "i2", fecha: "2026-03-03", tipo: "ausente", justificada: false }
  ];

  const racha = rachaActual(inasistencias, configDePrueba());

  assert.equal(racha.diasConsecutivos, 2);
  assert.equal(racha.umbralExigido, 3);
  assert.equal(racha.diasQueFaltan, 1);
  assert.equal(racha.completo, false);
  assert.equal(racha.desde, "2026-03-02");
  assert.equal(racha.hasta, "2026-03-03");
});

/* ========================================================================== */
/* Registro de inasistencias                                                  */
/* ========================================================================== */

test("no se puede registrar una inasistencia sin token", async () => {
  const { status } = await pedir("POST", "/api/v1/alertas/inasistencias", null, {
    alumnoId: "alu-7",
    fecha: "2026-04-06",
    tipo: "ausente",
    justificada: false
  });

  assert.equal(status, 401);
});

test("el registro de inasistencias exige permiso de escritura", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", secretario, {
    alumnoId: "alu-7",
    fecha: "2026-04-06",
    tipo: "ausente",
    justificada: false
  });

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "FORBIDDEN");
});

test("se registra una inasistencia y queda disponible para consulta", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-7",
    fecha: "2026-04-06",
    tipo: "ausente",
    justificada: false,
    observaciones: "Prueba de alta."
  });

  assert.equal(status, 201);
  assert.equal(cuerpo.data.alumnoId, "alu-7");
  assert.equal(cuerpo.data.fecha, "2026-04-06");
  assert.equal(cuerpo.data.tipoDescripcion, "El alumno no asistio a la escuela");
  assert.equal(cuerpo.data.baja, false);
  assert.equal(cuerpo.data.escuelaId, "esc-1");
  assert.equal(cuerpo.evaluacion.disparador, "registro_inasistencia");

  const detalle = await pedir("GET", `/api/v1/alertas/inasistencias/${cuerpo.data.id}`, preceptor);

  assert.equal(detalle.status, 200);
  assert.equal(detalle.cuerpo.data.id, cuerpo.data.id);
});

test("rechaza un alumno inexistente", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-9999",
    fecha: "2026-04-06",
    tipo: "ausente",
    justificada: false
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "alumnoId");
});

test("rechaza una fecha con formato invalido", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-7",
    fecha: "2026-02-30",
    tipo: "ausente",
    justificada: false
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "fecha");
});

test("rechaza una fecha futura", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-7",
    fecha: "2099-01-01",
    tipo: "ausente",
    justificada: false
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "fecha");
});

test("rechaza un tipo de inasistencia fuera del catalogo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-7",
    fecha: "2026-04-06",
    tipo: "inventada",
    justificada: false
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "tipo");
});

test("una inasistencia justificada exige motivo", async () => {
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-7",
    fecha: "2026-04-07",
    tipo: "ausente",
    justificada: true
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "motivo");
});

test("no se puede registrar dos inasistencias para el mismo alumno y dia", async () => {
  const primera = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-7",
    fecha: "2026-04-08",
    tipo: "ausente",
    justificada: false
  });

  const segunda = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-7",
    fecha: "2026-04-08",
    tipo: "ausente",
    justificada: false
  });

  assert.equal(primera.status, 201);
  assert.equal(segunda.status, 409);
  assert.equal(segunda.cuerpo.error.code, "CONFLICT");
});

test("las inasistencias se pueden filtrar por alumno, tipo y rango", async () => {
  const { status, cuerpo } = await pedir(
    "GET",
    "/api/v1/alertas/inasistencias?alumnoId=alu-1&tipo=ausente&desde=2026-03-01&hasta=2026-03-31",
    preceptor
  );

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length > 0);
  assert.ok(cuerpo.data.every((item) => item.alumnoId === "alu-1" && item.tipo === "ausente"));
  assert.equal(cuerpo.filtros.alumnoId, "alu-1");
  assert.equal(cuerpo.filtros.desde, "2026-03-01");
});

test("un filtro de fecha invalido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alertas/inasistencias?desde=ayer", preceptor);

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "desde");
});

test("un rango invertido devuelve 422", async () => {
  const { status, cuerpo } = await pedir(
    "GET",
    "/api/v1/alertas/inasistencias?desde=2026-03-31&hasta=2026-03-01",
    preceptor
  );

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "desde");
});

test("las inasistencias dadas de baja no aparecen salvo que se pidan", async () => {
  const sinBajas = await pedir("GET", "/api/v1/alertas/inasistencias?alumnoId=alu-6", preceptor);
  const conBajas = await pedir("GET", "/api/v1/alertas/inasistencias?alumnoId=alu-6&incluirBajas=true", preceptor);

  assert.equal(sinBajas.cuerpo.data.length, 1);
  assert.equal(conBajas.cuerpo.data.length, 2);
  assert.ok(conBajas.cuerpo.data.some((item) => item.baja === true && item.bajaMotivo));
});

test("una baja logica exige motivo y no borra el registro", async () => {
  const alta = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-8",
    fecha: "2026-04-09",
    tipo: "ausente",
    justificada: false
  });

  const sinMotivo = await pedir("DELETE", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, preceptor, { motivo: "x" });

  const conMotivo = await pedir(
    "DELETE",
    `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`,
    preceptor,
    { motivo: "Registro duplicado por error de carga." }
  );

  const detalle = await pedir("GET", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, preceptor);

  assert.equal(sinMotivo.status, 422);
  assert.equal(conMotivo.status, 200);
  assert.equal(detalle.status, 200);
  assert.equal(detalle.cuerpo.data.baja, true);
  assert.equal(detalle.cuerpo.data.bajaMotivo, "Registro duplicado por error de carga.");
});

test("dar de baja dos veces la misma inasistencia devuelve 404", async () => {
  const alta = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-8",
    fecha: "2026-04-10",
    tipo: "ausente",
    justificada: false
  });

  await pedir("DELETE", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, preceptor, {
    motivo: "Correccion del registro."
  });

  const segunda = await pedir("DELETE", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, preceptor, {
    motivo: "Correccion del registro."
  });

  assert.equal(segunda.status, 404);
});

/* ========================================================================== */
/* Deteccion y generacion de la alerta                                        */
/* ========================================================================== */

test("registrar la tercera inasistencia consecutiva genera la alerta y la notificacion", async () => {
  const alumno = "alu-19";
  const fechas = ["2026-05-04", "2026-05-05", "2026-05-06"];
  const respuestas = [];

  for (const fecha of fechas) {
    respuestas.push(
      await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
        alumnoId: alumno,
        fecha,
        tipo: "ausente",
        justificada: false
      })
    );
  }

  assert.equal(respuestas[0].cuerpo.evaluacion.alertasCreadas.length, 0);
  assert.equal(respuestas[1].cuerpo.evaluacion.alertasCreadas.length, 0);
  assert.equal(respuestas[2].cuerpo.evaluacion.alertasCreadas.length, 1);

  const alerta = respuestas[2].cuerpo.evaluacion.alertasCreadas[0];

  assert.equal(alerta.alumnoId, alumno);
  assert.equal(alerta.condicion, "inasistencias_consecutivas");
  assert.equal(alerta.cantidadInasistencias, 3);
  assert.equal(alerta.periodo.desde, "2026-05-04");
  assert.equal(alerta.periodo.hasta, "2026-05-06");
  assert.equal(alerta.estado, "activa");
  assert.equal(alerta.disparador, "registro_inasistencia");
  assert.equal(alerta.notificacion.estadoEnvio, "enviado");
  assert.ok(alerta.notificacion.destinatarios.includes(idPreceptor));
  assert.ok(alerta.fechaDeteccion);
  assert.ok(alerta.generadaEn);
  assert.equal(alerta.configuracionAplicada.diasConsecutivos, 3);
});

test("la alerta registra el evento con los datos que consume el sistema de notificaciones", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.length, 1);

  const evento = cuerpo.data[0].notificacion;

  assert.equal(evento.tipoEvento, "alerta.inasistencia_consecutiva");
  assert.equal(evento.tipoNotificacion, "ausencia");
  assert.equal(evento.prioridad, "alta");
  assert.deepEqual(evento.canales, ["notificacion_interna"]);
  assert.ok(evento.mensaje.includes("inasistencias consecutivas"));
  assert.equal(evento.estadoEnvio, "enviado");
  assert.ok(evento.enviadoEn);
  assert.ok(evento.eventoId);
});

test("la notificacion llega a los preceptores de la escuela con referencia a la alerta", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);
  const alerta = listado.cuerpo.data[0];
  const delAlumno = notificacionesDe(alerta.id);

  assert.ok(delAlumno.length > 0);
  assert.ok(delAlumno.every((item) => item.type === "ausencia"));
  assert.ok(delAlumno.every((item) => item.schoolId === alerta.escuelaId));
  assert.ok(delAlumno.every((item) => item.recipientId === idPreceptor));

  const bandeja = await pedir("GET", "/api/v1/notifications", preceptor);

  assert.equal(bandeja.status, 200);
  assert.ok(bandeja.cuerpo.data.some((item) => item.referenceId === alerta.id));
});

test("repetir la evaluacion no genera una segunda alerta para la misma situacion", async () => {
  const alumno = "alu-20";

  for (const fecha of ["2026-05-11", "2026-05-12", "2026-05-13"]) {
    await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
      alumnoId: alumno,
      fecha,
      tipo: "ausente",
      justificada: false
    });
  }

  const antes = await pedir("GET", "/api/v1/alertas?alumnoId=alu-20", preceptor);

  assert.equal(antes.cuerpo.paginacion.total, 1);

  const primera = await pedir("POST", "/api/v1/alertas/evaluar", preceptor, { alumnoId: alumno });
  const segunda = await pedir("POST", "/api/v1/alertas/evaluar", preceptor, { alumnoId: alumno });

  assert.equal(primera.cuerpo.data.alertasCreadas, 0);
  assert.equal(primera.cuerpo.data.alertasOmitidasPorDuplicado, 1);
  assert.equal(segunda.cuerpo.data.alertasCreadas, 0);
  assert.equal(segunda.cuerpo.data.alertasOmitidasPorDuplicado, 1);

  const despues = await pedir("GET", "/api/v1/alertas?alumnoId=alu-20", preceptor);

  assert.equal(despues.cuerpo.paginacion.total, 1);
  assert.equal(notificacionesDe(despues.cuerpo.data[0].id).length, 1);
});

test("la evaluacion periodica recorre la escuela y la segunda corrida no crea nada nuevo", async () => {
  await pedir("POST", "/api/v1/alertas/evaluar", preceptor, {});

  const repetida = await pedir("POST", "/api/v1/alertas/evaluar", preceptor, {});

  assert.equal(repetida.status, 200);
  assert.equal(repetida.cuerpo.data.disparador, "periodica");
  assert.ok(repetida.cuerpo.data.alumnosEvaluados > 0);
  assert.equal(repetida.cuerpo.data.alertasCreadas, 0);
  assert.ok(repetida.cuerpo.data.alertasOmitidasPorDuplicado > 0);
  assert.ok(repetida.cuerpo.data.iniciadaEn);
  assert.ok(repetida.cuerpo.data.finalizadaEn);
});

test("la evaluacion periodica detecta los periodos que el seed dejo sin alertar", async () => {
  const evaluacion = await pedir("POST", "/api/v1/alertas/evaluar", preceptor, {});

  assert.equal(evaluacion.status, 200);

  /* alu-1 tiene dos periodos completos en el seed y alu-4 uno. */
  const alu1 = await pedir("GET", "/api/v1/alumnos/alu-1/alertas/resumen", preceptor);
  const alu4 = await pedir("GET", "/api/v1/alumnos/alu-4/alertas/resumen", preceptor);

  assert.equal(alu1.status, 200);
  assert.equal(alu1.cuerpo.data.alertasActivas, 2);
  assert.equal(alu1.cuerpo.data.racha.ultimaRachaCerrada.dias, 3);
  assert.equal(alu4.cuerpo.data.alertasActivas, 1);

  /* alu-2 queda por debajo del umbral y alu-3 tiene la racha cortada. */
  const alu2 = await pedir("GET", "/api/v1/alumnos/alu-2/alertas/resumen", preceptor);
  const alu3 = await pedir("GET", "/api/v1/alumnos/alu-3/alertas/resumen", preceptor);
  const alu5 = await pedir("GET", "/api/v1/alumnos/alu-5/alertas/resumen", preceptor);

  assert.equal(alu2.cuerpo.data.alertasActivas, 0);
  assert.equal(alu2.cuerpo.data.racha.diasConsecutivos, 2);
  assert.equal(alu2.cuerpo.data.racha.diasQueFaltan, 1);
  assert.equal(alu3.cuerpo.data.alertasActivas, 0);
  assert.equal(alu5.cuerpo.data.alertasActivas, 0);
});

test("modificar una inasistencia no genera alertas duplicadas", async () => {
  const alumno = "alu-21";
  const altas = [];

  for (const fecha of ["2026-05-18", "2026-05-19", "2026-05-20"]) {
    const respuesta = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
      alumnoId: alumno,
      fecha,
      tipo: "ausente",
      justificada: false
    });
    altas.push(respuesta.cuerpo.data);
  }

  const antes = await pedir("GET", "/api/v1/alertas?alumnoId=alu-21", preceptor);

  assert.equal(antes.cuerpo.paginacion.total, 1);

  /* Justificar la segunda inasistencia corta la racha. La alerta ya registrada no
     se borra, pero tampoco se duplica ninguna. */
  const modificacion = await pedir("PATCH", `/api/v1/alertas/inasistencias/${altas[1].id}`, preceptor, {
    justificada: true,
    motivo: "Turno medico con presentacion previa."
  });

  assert.equal(modificacion.status, 200);
  assert.equal(modificacion.cuerpo.data.justificada, true);
  assert.equal(modificacion.cuerpo.data.motivo, "Turno medico con presentacion previa.");
  assert.equal(modificacion.cuerpo.evaluacion.alertasCreadas.length, 0);

  const despues = await pedir("GET", "/api/v1/alertas?alumnoId=alu-21", preceptor);

  assert.equal(despues.cuerpo.paginacion.total, 1);
});

test("un PATCH sin cambios reales no escribe nada", async () => {
  const alta = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-22",
    fecha: "2026-05-21",
    tipo: "ausente",
    justificada: false
  });

  const { status, cuerpo } = await pedir("PATCH", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, preceptor, {
    fecha: "2026-05-21",
    tipo: "ausente"
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.cambios, false);
});

test("dar de baja una inasistencia no borra la alerta ya generada", async () => {
  const alumno = "alu-23";
  const altas = [];

  for (const fecha of ["2026-05-25", "2026-05-26", "2026-05-27"]) {
    const respuesta = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
      alumnoId: alumno,
      fecha,
      tipo: "ausente",
      justificada: false
    });
    altas.push(respuesta.cuerpo.data);
  }

  const baja = await pedir("DELETE", `/api/v1/alertas/inasistencias/${altas[2].id}`, preceptor, {
    motivo: "El alumno estaba en la institucion equivocada."
  });

  assert.equal(baja.status, 200);
  assert.equal(baja.cuerpo.evaluacion.alertasCreadas.length, 0);

  const alertas = await pedir("GET", "/api/v1/alertas?alumnoId=alu-23", preceptor);

  assert.equal(alertas.cuerpo.paginacion.total, 1);
});

test("un nuevo periodo completo si puede generar una alerta nueva", async () => {
  const alumno = "alu-24";

  for (const fecha of ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-08"]) {
    await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
      alumnoId: alumno,
      fecha,
      tipo: "ausente",
      justificada: false
    });
  }

  const { cuerpo } = await pedir("GET", "/api/v1/alertas?alumnoId=alu-24&orden=periodo_asc", preceptor);

  assert.equal(cuerpo.paginacion.total, 2);
  assert.equal(cuerpo.data[0].periodo.desde, "2026-06-01");
  assert.equal(cuerpo.data[0].periodo.hasta, "2026-06-03");
  assert.equal(cuerpo.data[1].periodo.desde, "2026-06-04");
  assert.equal(cuerpo.data[1].periodo.hasta, "2026-06-08");
  assert.notEqual(cuerpo.data[0].clave, cuerpo.data[1].clave);
});

test("descartar una alerta libera el periodo y permite volver a generarla", async () => {
  const alumno = "alu-25";

  for (const fecha of ["2026-06-15", "2026-06-16", "2026-06-17"]) {
    await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
      alumnoId: alumno,
      fecha,
      tipo: "ausente",
      justificada: false
    });
  }

  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-25", preceptor);
  const alerta = listado.cuerpo.data[0];

  const descartada = await pedir("PATCH", `/api/v1/alertas/${alerta.id}`, preceptor, {
    estado: "descartada",
    observaciones: "Falso positivo: las fechas no corresponden al ciclo."
  });

  assert.equal(descartada.status, 200);
  assert.equal(descartada.cuerpo.data.estado, "descartada");

  /* Con la alerta descartada, el mismo periodo vuelve a ser candidato. */
  const reevaluacion = await pedir("POST", "/api/v1/alertas/evaluar", preceptor, { alumnoId: alumno });

  assert.equal(reevaluacion.cuerpo.data.alertasCreadas, 1);

  const nueva = reevaluacion.cuerpo.data.alertas[0];

  assert.notEqual(nueva.id, alerta.id);
  assert.equal(nueva.clave, alerta.clave);
  assert.equal(nueva.estado, "activa");
});

/* ========================================================================== */
/* Consulta de alertas                                                         */
/* ========================================================================== */

test("las alertas se pueden consultar, filtrar y paginar", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?pagina=1&porPagina=2&orden=alumno", preceptor);

  assert.equal(listado.status, 200);
  assert.ok(listado.cuerpo.data.length <= 2);
  assert.equal(listado.cuerpo.paginacion.porPagina, 2);
  assert.equal(listado.cuerpo.paginacion.pagina, 1);
  assert.equal(listado.cuerpo.filtros.orden, "alumno");
  assert.ok(listado.cuerpo.paginacion.total > 0);
});

test("las alertas se pueden filtrar por estado y por periodo", async () => {
  const activas = await pedir("GET", "/api/v1/alertas?estado=activa", preceptor);
  const porPeriodo = await pedir("GET", "/api/v1/alertas?periodoDesde=2026-05-01&periodoHasta=2026-06-30", preceptor);

  assert.equal(activas.status, 200);
  assert.ok(activas.cuerpo.data.every((item) => item.estado === "activa"));
  assert.equal(porPeriodo.status, 200);
  assert.ok(porPeriodo.cuerpo.data.every((item) => item.periodoHasta <= "2026-06-30"));
});

test("filtrar por estado invalido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alertas?estado=inventado", preceptor);

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "estado");
});

test("consultar una alerta inexistente devuelve 404", async () => {
  const { status } = await pedir("GET", "/api/v1/alertas/alt_no_existe", preceptor);

  assert.equal(status, 404);
});

test("las alertas del alumno y el resumen son consistentes entre si", async () => {
  const alertas = await pedir("GET", "/api/v1/alumnos/alu-19/alertas", preceptor);
  const resumen = await pedir("GET", "/api/v1/alumnos/alu-19/alertas/resumen", preceptor);

  assert.equal(alertas.status, 200);
  assert.equal(resumen.status, 200);
  assert.equal(alertas.cuerpo.data.length, 1);
  assert.equal(
    alertas.cuerpo.data.length,
    resumen.cuerpo.data.alertasActivas + resumen.cuerpo.data.alertasResueltas + resumen.cuerpo.data.alertasDescartadas
  );
  assert.equal(resumen.cuerpo.data.racha.umbralExigido, 3);
  assert.equal(resumen.cuerpo.data.totalInasistencias, 3);
  assert.equal(resumen.cuerpo.data.injustificadas, 3);
  assert.equal(resumen.cuerpo.data.porTipo.ausente, 3);
  assert.ok(resumen.cuerpo.data.ultimaAlerta);
  assert.equal(resumen.cuerpo.data.alumno.id, "alu-19");
});

test("consultar el resumen de un alumno inexistente devuelve 404", async () => {
  const { status } = await pedir("GET", "/api/v1/alumnos/alu-9999/alertas/resumen", preceptor);

  assert.equal(status, 404);
});

test("consultar alertas exige autenticacion", async () => {
  const { status } = await pedir("GET", "/api/v1/alertas", null);

  assert.equal(status, 401);
});

test("un token invalido no habilita la consulta de alertas", async () => {
  const { status } = await pedir("GET", "/api/v1/alertas", "no-es-un-token");

  assert.equal(status, 401);
});

test("la secretaria puede consultar alertas aunque no pueda gestionarlas", async () => {
  const lectura = await pedir("GET", "/api/v1/alertas?porPagina=1", secretario);
  const escritura = await pedir("POST", "/api/v1/alertas/evaluar", secretario, {});

  assert.equal(lectura.status, 200);
  assert.equal(escritura.status, 403);
});

/* ========================================================================== */
/* Estados de la alerta y auditoria                                           */
/* ========================================================================== */

test("una alerta activa se puede pasar a revision y a resuelta", async () => {
  const alumno = "alu-26";

  for (const fecha of ["2026-07-06", "2026-07-07", "2026-07-08"]) {
    await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
      alumnoId: alumno,
      fecha,
      tipo: "ausente",
      justificada: false
    });
  }

  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-26", preceptor);
  const alerta = listado.cuerpo.data[0];

  const revision = await pedir("PATCH", `/api/v1/alertas/${alerta.id}`, preceptor, {
    estado: "en_revision",
    observaciones: "Se contacto a la familia."
  });

  assert.equal(revision.status, 200);
  assert.equal(revision.cuerpo.data.estado, "en_revision");
  assert.equal(revision.cuerpo.data.historial.length, 1);
  assert.equal(revision.cuerpo.data.historial[0].estado, "activa");

  const resuelta = await pedir("PATCH", `/api/v1/alertas/${alerta.id}`, preceptor, {
    estado: "resuelta",
    seguimientoId: "seg-1"
  });

  assert.equal(resuelta.status, 200);
  assert.equal(resuelta.cuerpo.data.estado, "resuelta");
  assert.equal(resuelta.cuerpo.data.seguimientoId, "seg-1");
  assert.ok(resuelta.cuerpo.data.resueltaEn);
  assert.equal(resuelta.cuerpo.data.resueltaPor, (await pedir("GET", "/api/v1/auth/me", preceptor)).cuerpo.data.user.id);
  assert.equal(resuelta.cuerpo.data.historial.length, 2);
  assert.equal(resuelta.cuerpo.data.historial[1].estado, "en_revision");
});

test("una alerta resuelta no vuelve a abrirse", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-26", preceptor);
  const alerta = listado.cuerpo.data[0];

  const invalida = await pedir("PATCH", `/api/v1/alertas/${alerta.id}`, preceptor, { estado: "activa" });

  assert.equal(invalida.status, 422);
  assert.equal(invalida.cuerpo.error.details[0].field, "estado");
});

test("un estado desconocido devuelve 422", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);
  const alerta = listado.cuerpo.data[0];
  const { status, cuerpo } = await pedir("PATCH", `/api/v1/alertas/${alerta.id}`, preceptor, {
    estado: "inventado"
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "estado");
});

test("un PATCH de alerta sin cambios no escribe historial", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);
  const alerta = listado.cuerpo.data[0];
  const { status, cuerpo } = await pedir("PATCH", `/api/v1/alertas/${alerta.id}`, preceptor, {
    estado: alerta.estado
  });

  assert.equal(status, 200);
  assert.equal(cuerpo.cambios, false);
  assert.equal(cuerpo.data.historial.length, alerta.historial.length);
});

test("cambiar el estado de una alerta exige permiso de escritura", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);
  const alerta = listado.cuerpo.data[0];
  const { status } = await pedir("PATCH", `/api/v1/alertas/${alerta.id}`, secretario, { estado: "resuelta" });

  assert.equal(status, 403);
});

test("la generacion, la modificacion y el cambio de estado quedan auditados", async () => {
  const acciones = attendanceAlertsRepository.listarAuditoria().map((item) => item.accion);

  assert.ok(acciones.includes("inasistencia:create"));
  assert.ok(acciones.includes("inasistencia:update"));
  assert.ok(acciones.includes("inasistencia:deactivate"));
  assert.ok(acciones.includes("alerta:create"));
  assert.ok(acciones.includes("alerta:update"));
});

/* ========================================================================== */
/* Configuracion institucional                                                */
/* ========================================================================== */

test("la configuracion por defecto se expone sin haberla guardado", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/configuracion-alertas", director);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.escuelaId, "esc-1");
  assert.equal(cuerpo.data.diasConsecutivos, 3);
  assert.deepEqual(cuerpo.data.tiposContabilizados, ["ausente"]);
  assert.equal(cuerpo.data.habilitada, true);
  assert.equal(cuerpo.data.detalle.esPorDefecto, false);
  assert.equal(cuerpo.data.detalle.camposAjustados.length, 0);
});

test("cambiar el umbral cambia la deteccion en el acto", async () => {
  const actualizacion = await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasConsecutivos: 2 });

  assert.equal(actualizacion.status, 200);
  assert.equal(actualizacion.cuerpo.data.diasConsecutivos, 2);

  const alumno = "alu-27";
  const fechas = ["2026-08-03", "2026-08-04"];
  const respuestas = [];

  for (const fecha of fechas) {
    respuestas.push(
      await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
        alumnoId: alumno,
        fecha,
        tipo: "ausente",
        justificada: false
      })
    );
  }

  /* Con umbral 2, la segunda inasistencia consecutiva ya genera alerta. */
  assert.equal(respuestas[0].cuerpo.evaluacion.alertasCreadas.length, 0);
  assert.equal(respuestas[1].cuerpo.evaluacion.alertasCreadas.length, 1);

  const config = await pedir("GET", "/api/v1/configuracion-alertas", director);

  assert.equal(config.cuerpo.data.detalle.esPorDefecto, false);
  assert.deepEqual(config.cuerpo.data.detalle.camposAjustados, ["diasConsecutivos"]);
});

test("la actualizacion de la configuracion es parcial", async () => {
  await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasNoHabiles: ["2026-09-07"] });
  await pedir("PUT", "/api/v1/configuracion-alertas", director, { prioridadNotificacion: "normal" });

  const { cuerpo } = await pedir("GET", "/api/v1/configuracion-alertas", director);

  assert.equal(cuerpo.data.prioridadNotificacion, "normal");
  assert.deepEqual(cuerpo.data.diasNoHabiles, ["2026-09-07"]);
  assert.equal(cuerpo.data.diasConsecutivos, 3);
});

test("un dia no habil declarado evita generar la alerta de ese periodo", async () => {
  await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasNoHabiles: ["2026-08-05"] });

  const alumno = "alu-28";

  for (const fecha of ["2026-08-04", "2026-08-05", "2026-08-06"]) {
    await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
      alumnoId: alumno,
      fecha,
      tipo: "ausente",
      justificada: false
    });
  }

  const alertas = await pedir("GET", "/api/v1/alertas?alumnoId=alu-28", preceptor);

  assert.equal(alertas.cuerpo.paginacion.total, 0);
});

test("un umbral fuera de rango devuelve 422", async () => {
  const { status, cuerpo } = await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasConsecutivos: 0 });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "diasConsecutivos");
});

test("un tipo de inasistencia que no existe en el catalogo se rechaza", async () => {
  const { status, cuerpo } = await pedir("PUT", "/api/v1/configuracion-alertas", director, {
    tiposContabilizados: ["ausente", "inventado"]
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "tiposContabilizados");
});

test("un dia no habil invalido o en fin de semana se rechaza", async () => {
  const invalido = await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasNoHabiles: ["2026-13-45"] });
  const finde = await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasNoHabiles: ["2026-09-05"] });

  assert.equal(invalido.status, 422);
  assert.equal(finde.status, 422);
  assert.equal(finde.cuerpo.error.details[0].field, "diasNoHabiles");
});

test("un canal desconocido se rechaza", async () => {
  const { status, cuerpo } = await pedir("PUT", "/api/v1/configuracion-alertas", director, { canales: ["palomas"] });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "canales");
});

test("un campo que no se puede configurar se rechaza", async () => {
  const { status, cuerpo } = await pedir("PUT", "/api/v1/configuracion-alertas", director, { esPorDefecto: false });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "esPorDefecto");
});

test("un cuerpo vacio se rechaza", async () => {
  const { status, cuerpo } = await pedir("PUT", "/api/v1/configuracion-alertas", director, {});

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "configuracion");
});

test("configurar la regla es potestad de la direccion, no de quien carga inasistencias", async () => {
  const preceptorNoPuede = await pedir("PUT", "/api/v1/configuracion-alertas", preceptor, { diasConsecutivos: 5 });
  const docenteNoPuede = await pedir("PUT", "/api/v1/configuracion-alertas", docente, { diasConsecutivos: 5 });
  const directorSiPuede = await pedir("GET", "/api/v1/configuracion-alertas", director);

  assert.equal(preceptorNoPuede.status, 403);
  assert.equal(docenteNoPuede.status, 403);
  assert.equal(directorSiPuede.status, 200);
});

test("el cambio de configuracion queda auditado", async () => {
  await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasConsecutivos: 4 });

  const auditoria = attendanceAlertsRepository
    .listarAuditoria()
    .filter((item) => item.accion === "configuracion:update");

  assert.ok(auditoria.length > 0);

  const ultima = auditoria[auditoria.length - 1];

  assert.equal(ultima.entidadId, "esc-1");
  assert.ok(ultima.antes);
  assert.ok(ultima.despues);
  assert.equal(ultima.despues.diasConsecutivos, 4);
});

test("deshabilitar la deteccion detiene la generacion de alertas", async () => {
  await pedir("PUT", "/api/v1/configuracion-alertas", director, { habilitada: false });

  const alumno = "alu-29";
  const respuestas = [];

  for (const fecha of ["2026-08-10", "2026-08-11", "2026-08-12"]) {
    respuestas.push(
      await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
        alumnoId: alumno,
        fecha,
        tipo: "ausente",
        justificada: false
      })
    );
  }

  assert.equal(respuestas[2].status, 201);
  assert.equal(respuestas[2].cuerpo.evaluacion.alertasCreadas.length, 0);
  assert.equal(respuestas[2].cuerpo.evaluacion.periodosDetectados, 0);
});

/* ========================================================================== */
/* Aislamiento por escuela                                                     */
/* ========================================================================== */

/* El seed de alumnos es de una sola escuela, asi que para probar el aislamiento se
   agrega un alumno y un usuario de otra escuela y se comprueba que no se ven. */
async function prepararSegundaEscuela() {
  if (!attendanceAlertsRepository.findStudentRefById("alu-otra")) {
    studentRepository.create({
      id: "alu-otra",
      escuelaId: "esc-2",
      apellido: "Sosa",
      nombre: "Otra",
      dni: "30000001",
      curso: 1,
      division: "1"
    });

    userRepository.create({
      email: "otro-preceptor@prece.local",
      passwordHash: await bcrypt.hash("Preceptor123!", 10),
      displayName: "Preceptor Escuela 2",
      assignments: [{ role: "preceptor", schoolId: "esc-2" }]
    });
  }

  return login("otro-preceptor@prece.local", "Preceptor123!");
}

test("un usuario de otra escuela no puede registrar inasistencias de un alumno ajeno", async () => {
  const otro = await prepararSegundaEscuela();
  const { status, cuerpo } = await pedir("POST", "/api/v1/alertas/inasistencias", otro, {
    alumnoId: "alu-19",
    fecha: "2026-04-20",
    tipo: "ausente",
    justificada: false
  });

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "alumnoId");

  const registrados = await pedir(
    "GET",
    "/api/v1/alertas/inasistencias?alumnoId=alu-19&desde=2026-04-20&hasta=2026-04-20",
    preceptor
  );

  assert.equal(registrados.cuerpo.data.length, 0);
});

test("un usuario de otra escuela no ve alertas ni inasistencias ajenas", async () => {
  const otro = await prepararSegundaEscuela();
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);
  const alerta = listado.cuerpo.data[0];

  const alertas = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", otro);
  const detalle = await pedir("GET", `/api/v1/alertas/${alerta.id}`, otro);
  const resumen = await pedir("GET", "/api/v1/alumnos/alu-19/alertas/resumen", otro);
  const porAlumno = await pedir("GET", "/api/v1/alumnos/alu-19/alertas", otro);

  assert.equal(alertas.cuerpo.paginacion.total, 0);
  assert.equal(detalle.status, 404);
  assert.equal(resumen.status, 404);
  assert.equal(porAlumno.status, 404);
});

test("un usuario de otra escuela no puede modificar ni dar de baja una inasistencia ajena", async () => {
  const otro = await prepararSegundaEscuela();
  const alta = await pedir("POST", "/api/v1/alertas/inasistencias", preceptor, {
    alumnoId: "alu-19",
    fecha: "2026-04-21",
    tipo: "ausente",
    justificada: false
  });

  const modificacion = await pedir("PATCH", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, otro, {
    justificada: true,
    motivo: "Intento fuera de la escuela."
  });

  const baja = await pedir("DELETE", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, otro, {
    motivo: "Intento fuera de la escuela."
  });

  const detalle = await pedir("GET", `/api/v1/alertas/inasistencias/${alta.cuerpo.data.id}`, preceptor);

  assert.equal(modificacion.status, 404);
  assert.equal(baja.status, 404);
  assert.equal(detalle.cuerpo.data.baja, false);
  assert.equal(detalle.cuerpo.data.justificada, false);
});

test("cada escuela tiene su propia configuracion institucional", async () => {
  const otro = await prepararSegundaEscuela();

  await pedir("PUT", "/api/v1/configuracion-alertas", director, { diasConsecutivos: 2 });

  const deEscuela1 = await pedir("GET", "/api/v1/configuracion-alertas", director);
  const deEscuela2 = await pedir("GET", "/api/v1/configuracion-alertas", otro);

  assert.equal(deEscuela1.cuerpo.data.escuelaId, "esc-1");
  assert.equal(deEscuela1.cuerpo.data.diasConsecutivos, 2);
  assert.equal(deEscuela2.cuerpo.data.escuelaId, "esc-2");
  assert.equal(deEscuela2.cuerpo.data.diasConsecutivos, 3);
});

test("la evaluacion periodica solo recorre la escuela de quien la pide", async () => {
  const otro = await prepararSegundaEscuela();
  const evaluacion = await pedir("POST", "/api/v1/alertas/evaluar", otro, {});

  assert.equal(evaluacion.status, 200);
  assert.equal(evaluacion.cuerpo.data.escuelaId, "esc-2");
  assert.equal(evaluacion.cuerpo.data.alumnosEvaluados, 0);
});

/* ========================================================================== */
/* Catalogo, evaluaciones y aislamiento del store                             */
/* ========================================================================== */

test("el catalogo expone los tipos, condiciones, estados y limites", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alertas/catalogos", preceptor);

  assert.equal(status, 200);
  assert.equal(cuerpo.data.tiposInasistencia.length, 3);
  assert.equal(cuerpo.data.condiciones[0].valor, "inasistencias_consecutivas");
  assert.deepEqual(
    cuerpo.data.estadosAlerta.map((item) => item.valor),
    ["activa", "en_revision", "resuelta", "descartada"]
  );
  assert.deepEqual(cuerpo.data.limites.diasConsecutivos, [1, 30]);
  assert.ok(cuerpo.data.camposConfigurables.includes("diasConsecutivos"));
  assert.equal(cuerpo.data.configuracionPorDefecto.diasConsecutivos, 3);
  assert.deepEqual(cuerpo.data.prioridades, ["baja", "normal", "alta"]);
});

test("se puede consultar el historial de evaluaciones", async () => {
  await pedir("POST", "/api/v1/alertas/evaluar", preceptor, {});

  const { status, cuerpo } = await pedir("GET", "/api/v1/alertas/evaluaciones?limite=5", preceptor);

  assert.equal(status, 200);
  assert.ok(cuerpo.data.length > 0);
  assert.ok(cuerpo.data[0].alumnosEvaluados >= 0);
  assert.equal(cuerpo.data[0].disparador, "periodica");
});

test("un limite de evaluaciones invalido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("GET", "/api/v1/alertas/evaluaciones?limite=0", preceptor);

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "limite");
});

test("reenviar un evento ya enviado no duplica notificaciones", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);
  const alerta = listado.cuerpo.data[0];
  const antes = notificacionesDe(alerta.id).length;

  const { status } = await pedir("POST", `/api/v1/alertas/${alerta.id}/reenviar`, preceptor);

  assert.equal(status, 200);
  assert.equal(notificacionesDe(alerta.id).length, antes);
});

test("reenviar una alerta inexistente devuelve 404", async () => {
  const { status } = await pedir("POST", "/api/v1/alertas/alt_inexistente/reenviar", preceptor);

  assert.equal(status, 404);
});

test("reenviar exige permiso de escritura", async () => {
  const listado = await pedir("GET", "/api/v1/alertas?alumnoId=alu-19", preceptor);
  const alerta = listado.cuerpo.data[0];
  const { status } = await pedir("POST", `/api/v1/alertas/${alerta.id}/reenviar`, secretario);

  assert.equal(status, 403);
});

test("el store del modulo se reinicia sin tocar alumnos ni usuarios", () => {
  const store = getStore();
  const alumnos = store.students.size;
  const usuarios = store.users.size;

  attendanceAlertsRepository.resetData();

  assert.equal(attendanceAlertsRepository.listInasistencias({ incluirBajas: true }).length, 0);
  assert.equal(attendanceAlertsRepository.listAlertas({}).length, 0);
  assert.equal(attendanceAlertsRepository.listarAuditoria().length, 0);
  assert.equal(attendanceAlertsRepository.listEvaluaciones({ limite: 10 }).length, 0);
  assert.equal(store.students.size, alumnos);
  assert.equal(store.users.size, usuarios);
});
