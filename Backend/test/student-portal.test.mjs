/* Portal del alumno: acceso con DNI, cambio obligatorio de credenciales,
   aislamiento entre alumnos, calculos academicos y verificacion integral.

   Corre contra los seeds de desarrollo (los mismos alumnos que usa la API) y
   no contra datos de ejemplo propios: los valores esperados se obtienen de los
   repositorios oficiales de cada modulo. */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedDesarrollo } from "../database/seeds/index.mjs";
import studentRepository from "../modules/students/students.repository.mjs";
import gradesRepository from "../modules/grades/grades.repository.mjs";
import inasistenciasRepository from "../modules/inasistencias/inasistencias.repository.mjs";
import attendanceAlertsRepository from "../modules/attendance-alerts/attendance-alerts.repository.mjs";
import academicRecordsRepository from "../modules/academic-records/academic-records.repository.mjs";
import { interpretarValor } from "../modules/grades/catalogo.mjs";
import { verificarPadron } from "../modules/student-portal/student-verification.service.mjs";
import { cicloLectivoActual } from "../modules/student-portal/catalogo.mjs";

const PUERTO = 3994;
const base = `http://127.0.0.1:${PUERTO}`;
const CICLO = cicloLectivoActual();
const CLAVE = "Escuela2026ok";

let servidor;

before(async () => {
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(async () => {
  resetStore();
  await seedDesarrollo();
});

async function pedir(ruta, { metodo = "GET", token, cuerpo } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null };
}

/* El alumno usa el MISMO login general que el personal. */
function loginAlumno(usuario, password) {
  return pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email: usuario, password } });
}

async function loginPersonal(email, password) {
  const { cuerpo } = await pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email, password } });
  return cuerpo.accessToken;
}

/* Primer ingreso + configuracion: devuelve el token de un alumno listo para consultar. */
async function alumnoConfigurado(dni, usuario = undefined) {
  const { cuerpo } = await loginAlumno(dni, dni);
  const token = cuerpo.accessToken;
  const configuracion = await pedir("/api/v1/alumno/cuenta/configuracion", {
    metodo: "POST",
    token,
    cuerpo: { usuario, passwordActual: dni, passwordNueva: CLAVE, confirmacion: CLAVE }
  });
  assert.equal(configuracion.status, 200, JSON.stringify(configuracion.cuerpo));
  return token;
}

const SECCIONES = ["perfil", "boletin", "asistencias", "situacion-academica", "previas"];

/* ---------------- Acceso con DNI ------------------------------------------- */

test("todos los alumnos activos con DNI real pueden hacer el primer ingreso con su DNI", async () => {
  const alumnos = studentRepository.all();
  assert.ok(alumnos.length > 0);

  for (const alumno of alumnos) {
    const { status, cuerpo } = await loginAlumno(alumno.dni, alumno.dni);

    if (alumno.isActive) {
      assert.equal(status, 200, `${alumno.id} (${alumno.dni}) deberia ingresar`);
      assert.equal(cuerpo.debeCambiarPassword, true);
      assert.deepEqual(cuerpo.roles, ["alumno"]);
      assert.equal(cuerpo.user.studentId, alumno.id);
      assert.ok(!JSON.stringify(cuerpo).includes("passwordHash"));
      assert.ok(!JSON.stringify(cuerpo).includes("$2a$"));
    } else {
      assert.equal(status, 401, `${alumno.id} esta inactivo y no deberia ingresar`);
    }
  }
});

test("un segundo ingreso no duplica la cuenta del alumno", async () => {
  await loginAlumno("40123456", "40123456");
  await loginAlumno("40123456", "40123456");
  const informe = await verificarPadron();
  assert.equal(informe.totales.cuentasCreadas, 1);
  assert.ok(!informe.problemasPorCodigo.some((problema) => problema.codigo === "cuenta_multiple"));
});

test("el usuario inicial tiene forma de correo con los datos del alumno y la clave es el DNI", async () => {
  const { status, cuerpo } = await loginAlumno("ana.perez@alumno.prece.local", "40123456");
  assert.equal(status, 200);
  assert.equal(cuerpo.user.username, "ana.perez@alumno.prece.local");
  assert.equal(cuerpo.user.studentId, "alu-1");

  /* Homonimos: ninguno queda con el usuario sin sufijo. */
  studentRepository.create({ id: "alu-hom", escuelaId: "esc-1", apellido: "Pérez", nombre: "Ana María", dni: "41000999", curso: 2, division: "1" });
  assert.equal((await loginAlumno("ana.perez@alumno.prece.local", "41000999")).status, 401);
  assert.equal((await loginAlumno("ana.perez.999@alumno.prece.local", "41000999")).status, 200);

  const informe = await verificarPadron({ incluirSinProblemas: true });
  assert.equal(informe.alumnos.find((alumno) => alumno.id === "alu-2").ingreso.usuario, "carla.gomez@alumno.prece.local");
});

test("DNI inexistente, clave incorrecta y legajo inactivo responden el mismo error", async () => {
  const inexistente = await loginAlumno("11111111", "11111111");
  const claveMala = await loginAlumno("40123456", "40123457");
  const inactivo = await loginAlumno("37776666", "37776666");

  for (const respuesta of [inexistente, claveMala, inactivo]) {
    assert.equal(respuesta.status, 401);
    assert.equal(respuesta.cuerpo.error.code, "INVALID_CREDENTIALS");
    assert.equal(respuesta.cuerpo.error.message, inexistente.cuerpo.error.message);
  }
});

test("ya no existe un login separado para alumnos", async () => {
  const { status } = await pedir("/api/v1/auth/alumnos/login", { metodo: "POST", cuerpo: { usuario: "40123456", password: "40123456" } });
  assert.equal(status, 404);
  assert.equal((await loginAlumno("", "")).status, 400);
});

test("el login general sigue funcionando para los demas roles", async () => {
  for (const [email, clave] of [["director@prece.local", "Director123!"], ["docente@prece.local", "Docente123!"], ["preceptor@prece.local", "Preceptor123!"], ["secretario@prece.local", "Secretaria123!"]]) {
    const { status, cuerpo } = await pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email, password: clave } });
    assert.equal(status, 200, email);
    assert.ok(!cuerpo.roles.includes("alumno"));
  }
});

test("un DNI provisorio (nomina sin documento) no sirve como credencial", async () => {
  studentRepository.create({ id: "alu-prov", escuelaId: "esc-1", apellido: "Prueba", nombre: "Provisoria", dni: "99000001", dniProvisorio: true, curso: 1, division: "1" });
  const { status } = await loginAlumno("99000001", "99000001");
  assert.equal(status, 401);
});

test("un DNI cargado en dos legajos no habilita el ingreso", async () => {
  studentRepository.create({ id: "alu-dup", escuelaId: "esc-1", apellido: "Otro", nombre: "Legajo", dni: "40123456", curso: 2, division: "1" });
  const { status } = await loginAlumno("40123456", "40123456");
  assert.equal(status, 401);
});

test("la carga masiva marca como provisorio el DNI que genera cuando la planilla no lo trae", async () => {
  const token = await loginPersonal("director@prece.local", "Director123!");
  const respuesta = await pedir("/api/v1/students/bulk", {
    metodo: "POST",
    token,
    cuerpo: { alumnos: [{ nombre: "SIN DOCUMENTO, ALUMNA", curso: "2° 1°" }, { nombre: "CON DOCUMENTO, ALUMNO", curso: "2° 1°", dni: "47111222" }] }
  });
  assert.equal(respuesta.status, 200);

  const sinDocumento = studentRepository.all().find((alumno) => alumno.apellido === "SIN DOCUMENTO");
  const conDocumento = studentRepository.findByDni("47111222");
  assert.equal(sinDocumento.dniProvisorio, true);
  assert.equal(conDocumento.dniProvisorio, false);
  assert.equal((await loginAlumno(sinDocumento.dni, sinDocumento.dni)).status, 401);
  assert.equal((await loginAlumno("47111222", "47111222")).status, 200);
});

/* ---------------- Cambio obligatorio ---------------------------------------- */

test("sin cambiar la clave inicial no se ve ninguna informacion academica", async () => {
  const { cuerpo } = await loginAlumno("40123456", "40123456");

  for (const seccion of SECCIONES) {
    const respuesta = await pedir(`/api/v1/alumno/${seccion}`, { token: cuerpo.accessToken });
    assert.equal(respuesta.status, 403, seccion);
    assert.equal(respuesta.cuerpo.error.code, "PASSWORD_CHANGE_REQUIRED");
  }

  const cuenta = await pedir("/api/v1/alumno/cuenta", { token: cuerpo.accessToken });
  assert.equal(cuenta.status, 200);
  assert.equal(cuenta.cuerpo.data.debeCambiarPassword, true);
});

test("la configuracion valida la nueva clave, la confirmacion y el usuario", async () => {
  const { cuerpo } = await loginAlumno("40123456", "40123456");
  const token = cuerpo.accessToken;
  const configurar = (datos) => pedir("/api/v1/alumno/cuenta/configuracion", { metodo: "POST", token, cuerpo: datos });

  const casos = [
    [{ passwordActual: "40123456", passwordNueva: "corta1", confirmacion: "corta1" }, "passwordNueva"],
    [{ passwordActual: "40123456", passwordNueva: "solotexto", confirmacion: "solotexto" }, "passwordNueva"],
    [{ passwordActual: "40123456", passwordNueva: "abc40123456", confirmacion: "abc40123456" }, "passwordNueva"],
    [{ passwordActual: "40123456", passwordNueva: CLAVE, confirmacion: "OtraClave99" }, "confirmacion"],
    [{ passwordActual: "00000000", passwordNueva: CLAVE, confirmacion: CLAVE }, "passwordActual"],
    [{ usuario: "42345678", passwordActual: "40123456", passwordNueva: CLAVE, confirmacion: CLAVE }, "usuario"],
    [{ usuario: "a b", passwordActual: "40123456", passwordNueva: CLAVE, confirmacion: CLAVE }, "usuario"]
  ];

  for (const [datos, campo] of casos) {
    const respuesta = await configurar(datos);
    assert.equal(respuesta.status, 422, JSON.stringify(datos));
    assert.ok(respuesta.cuerpo.error.details.some((detalle) => detalle.field === campo), `${campo}: ${JSON.stringify(respuesta.cuerpo)}`);
  }

  /* Nada de lo anterior desbloqueo la cuenta. */
  assert.equal((await pedir("/api/v1/alumno/perfil", { token })).status, 403);
});

test("despues de configurar: el DNI deja de ser la clave y el nuevo usuario funciona", async () => {
  await alumnoConfigurado("40123456", "ana.perez");

  assert.equal((await loginAlumno("40123456", "40123456")).status, 401);
  const conUsuario = await loginAlumno("ana.perez", CLAVE);
  assert.equal(conUsuario.status, 200);
  assert.equal(conUsuario.cuerpo.debeCambiarPassword, false);
  assert.equal((await loginAlumno("ANA.PEREZ", CLAVE)).status, 200);

  for (const seccion of SECCIONES) {
    assert.equal((await pedir(`/api/v1/alumno/${seccion}`, { token: conUsuario.cuerpo.accessToken })).status, 200, seccion);
  }
});

test("un usuario ya tomado por otro alumno se rechaza", async () => {
  await alumnoConfigurado("40123456", "ana.perez");
  const { cuerpo } = await loginAlumno("42345678", "42345678");
  const respuesta = await pedir("/api/v1/alumno/cuenta/configuracion", {
    metodo: "POST",
    token: cuerpo.accessToken,
    cuerpo: { usuario: "ana.perez", passwordActual: "42345678", passwordNueva: CLAVE, confirmacion: CLAVE }
  });
  assert.equal(respuesta.status, 422);
  assert.equal(respuesta.cuerpo.error.details[0].field, "usuario");
});

test("Mi Cuenta: cambiar clave cierra las otras sesiones y cambiar usuario exige la clave", async () => {
  const token = await alumnoConfigurado("40123456");
  const cambio = await pedir("/api/v1/alumno/cuenta/password", {
    metodo: "PATCH",
    token,
    cuerpo: { passwordActual: CLAVE, passwordNueva: "Nueva2026clave", confirmacion: "Nueva2026clave" }
  });
  assert.equal(cambio.status, 200);
  assert.ok(cambio.cuerpo.data.sesion.accessToken);
  assert.equal((await loginAlumno("40123456", CLAVE)).status, 401);
  assert.equal((await loginAlumno("40123456", "Nueva2026clave")).status, 200);

  const sinClave = await pedir("/api/v1/alumno/cuenta/usuario", { metodo: "PATCH", token, cuerpo: { usuario: "ana.lopez" } });
  assert.equal(sinClave.status, 422);
  const conClave = await pedir("/api/v1/alumno/cuenta/usuario", { metodo: "PATCH", token, cuerpo: { usuario: "ana.lopez", passwordActual: "Nueva2026clave" } });
  assert.equal(conClave.status, 200);
  assert.equal(conClave.cuerpo.data.usuario, "ana.lopez");
});

test("las claves enviadas no quedan en la auditoria", async () => {
  await alumnoConfigurado("40123456");
  const director = await loginPersonal("director@prece.local", "Director123!");
  const { cuerpo } = await pedir("/api/v1/audit/logs?porPagina=100", { token: director });
  const texto = JSON.stringify(cuerpo);
  assert.ok(!texto.includes(CLAVE));
  assert.ok(!texto.includes("$2a$"));
});

/* ---------------- Aislamiento entre alumnos -------------------------------- */

test("un alumno solo ve su propio legajo aunque manipule la URL o los parametros", async () => {
  const token = await alumnoConfigurado("40123456");

  for (const seccion of SECCIONES) {
    const respuesta = await pedir(`/api/v1/alumno/${seccion}?alumnoId=alu-2&studentId=alu-2&dni=42345678`, { token });
    assert.equal(respuesta.status, 200);
    assert.ok(!JSON.stringify(respuesta.cuerpo).includes("42345678"), `${seccion} no debe exponer datos de alu-2`);
  }

  const perfil = await pedir("/api/v1/alumno/perfil", { token });
  assert.equal(perfil.cuerpo.data.datosPersonales.dni, "40123456");

  /* Las rutas del personal que reciben un id quedan cerradas para el rol alumno. */
  for (const ruta of [
    "/api/v1/students/alu-2",
    "/api/v1/students/alu-1",
    "/api/v1/alumnos/alu-2/calificaciones",
    "/api/v1/alumnos/alu-2/situacion-academica",
    "/api/v1/inasistencias/alumno/alu-2/totales",
    "/api/v1/students",
    "/api/v1/portal-alumnos/verificacion"
  ]) {
    assert.equal((await pedir(ruta, { token })).status, 403, ruta);
  }
});

test("una cuenta del personal no puede usar el portal del alumno", async () => {
  const token = await loginPersonal("director@prece.local", "Director123!");
  assert.equal((await pedir("/api/v1/alumno/perfil", { token })).status, 403);
});

test("si el legajo se da de baja, la cuenta deja de ver informacion", async () => {
  const token = await alumnoConfigurado("40123456");
  studentRepository.deactivate("alu-1", "2026-10-01");
  const respuesta = await pedir("/api/v1/alumno/perfil", { token });
  assert.equal(respuesta.status, 403);
  assert.equal(respuesta.cuerpo.error.code, "STUDENT_INACTIVE");
});

test("el rol alumno no se puede asignar a mano a una cuenta del personal", async () => {
  const token = await loginPersonal("admin@prece.local", "Admin123!");
  const { status } = await pedir("/api/v1/users", {
    metodo: "POST",
    token,
    cuerpo: { nombre: "X", apellido: "Y", email: "x.y@prece.local", dni: "30111222", roles: ["alumno"] }
  });
  assert.equal(status, 422);
});

test("las cuentas de alumno no aparecen en el listado de usuarios del personal", async () => {
  await loginAlumno("40123456", "40123456");
  const token = await loginPersonal("admin@prece.local", "Admin123!");
  const todos = await pedir("/api/v1/users", { token });
  assert.ok(!todos.cuerpo.data.some((usuario) => usuario.roles.includes("alumno")));
  const alumnos = await pedir("/api/v1/users?rol=alumno", { token });
  assert.equal(alumnos.cuerpo.data.length, 1);
});

/* ---------------- Calculos academicos -------------------------------------- */

test("el total de ausentes coincide con los registros de asistencia de cada alumno", async () => {
  for (const alumno of studentRepository.all().filter((item) => item.isActive)) {
    const token = await alumnoConfigurado(alumno.dni);
    const { cuerpo } = await pedir("/api/v1/alumno/asistencias", { token });

    /* Esperado, leido directo de los dos registros: dias distintos con ausencia
       de jornada completa en el ciclo actual. */
    const dias = new Set(inasistenciasRepository.list({ alumnoId: alumno.id }).filter((r) => r.anio === CICLO).map((r) => r.fecha));
    const registros = attendanceAlertsRepository.listInasistencias({ alumnoId: alumno.id }).filter((r) => r.fecha.startsWith(String(CICLO)));
    for (const registro of registros) if (registro.tipo === "ausente") dias.add(registro.fecha);
    const tardes = registros.filter((r) => r.tipo === "tarde" && !dias.has(r.fecha)).length;

    assert.equal(cuerpo.data.totales.ausentes, dias.size, `${alumno.id}: ausentes`);
    assert.equal(cuerpo.data.totales.llegadasTarde, tardes, `${alumno.id}: tardes`);

    const perfil = await pedir("/api/v1/alumno/perfil", { token });
    assert.equal(perfil.cuerpo.data.resumen.ausentes, dias.size, `${alumno.id}: tarjeta de ausentes`);
  }
});

test("las llegadas tarde no se cuentan como ausentes completos", async () => {
  const token = await alumnoConfigurado("45678901"); // alu-5: tres llegadas tarde registradas
  const { cuerpo } = await pedir("/api/v1/alumno/asistencias", { token });
  assert.equal(cuerpo.data.totales.llegadasTarde, 3);
  assert.equal(cuerpo.data.totales.ausentes, 0);
  assert.equal(cuerpo.data.totales.presentes, null);
  assert.equal(cuerpo.data.totales.presentesDisponible, false);
});

test("TEP y notas inferiores a 6 se identifican desde las calificaciones registradas", async () => {
  for (const alumno of studentRepository.all().filter((item) => item.isActive)) {
    const token = await alumnoConfigurado(alumno.dni);
    const { cuerpo } = await pedir("/api/v1/alumno/situacion-academica", { token });

    const delCiclo = gradesRepository.listCalificaciones({ alumnoId: alumno.id, estado: "activo" }).filter((c) => c.anio === CICLO);
    for (const fila of cuerpo.data.filas.filter((item) => item.estado !== "pendiente")) {
      const info = interpretarValor(fila.calificacion);
      if (fila.estado === "tep") assert.equal(info.concepto, "TEP");
      if (fila.estado === "debajo_de_6") assert.ok(info.nota < 6);
      if (fila.estado === "aprobada") assert.ok(info.concepto === "TEA" || info.nota >= 6);
      assert.ok(delCiclo.some((c) => c.valor === fila.calificacion && c.materiaId === fila.materiaId), `${alumno.id}: la fila sale de una calificacion real`);
    }

    const perfil = await pedir("/api/v1/alumno/perfil", { token });
    assert.equal(perfil.cuerpo.data.resumen.materiasConTep, cuerpo.data.totales.conTep);
    assert.equal(perfil.cuerpo.data.resumen.materiasDebajoDe6, cuerpo.data.totales.debajoDe6);
  }
});

test("un recuperatorio posterior reemplaza a la nota del periodo sin promediar", async () => {
  const token = await alumnoConfigurado("45678901"); // alu-5: 4 en Matematica 1C
  let { cuerpo } = await pedir("/api/v1/alumno/perfil", { token });
  assert.equal(cuerpo.data.resumen.materiasDebajoDe6, 1);
  assert.equal(cuerpo.data.resumen.previasPendientes, 0, "una nota baja del ciclo no es una previa");

  gradesRepository.createCalificacion({
    escuelaId: "esc-1", alumnoId: "alu-5", materiaId: "mat", cursoId: "cur-1", divisionId: "div-1",
    anio: CICLO, cuatrimestre: 1, tipoEvaluacion: "recuperatorio", valor: "7", fecha: `${CICLO}-05-20`
  });

  ({ cuerpo } = await pedir("/api/v1/alumno/perfil", { token }));
  assert.equal(cuerpo.data.resumen.materiasDebajoDe6, 0);
  const boletin = await pedir("/api/v1/alumno/boletin", { token });
  const matematica = boletin.cuerpo.data.materias.find((materia) => materia.materiaId === "mat");
  assert.equal(matematica.periodos.c1.resultado.valor, "7");
  assert.equal(matematica.periodos.c1.evaluaciones.length, 2, "las dos notas siguen visibles");
});

test("las previas salen de la situacion academica y desaparecen al aprobarse", async () => {
  const token = await alumnoConfigurado("40123456"); // alu-1: Historia 2025 pendiente
  let { cuerpo } = await pedir("/api/v1/alumno/previas", { token });
  assert.deepEqual(cuerpo.data.pendientes.map((previa) => [previa.materiaId, previa.anioCursada]), [["his", 2025]]);
  assert.equal(cuerpo.data.pendientes[0].cursoOrigen.etiqueta, "1° 1°");

  const antes = academicRecordsRepository.findSituacionById("rs-3");
  academicRecordsRepository.updateSituacion("rs-3", { estado: "aprobada" }, antes);

  ({ cuerpo } = await pedir("/api/v1/alumno/previas", { token }));
  assert.equal(cuerpo.data.pendientes.length, 0);
  assert.equal(cuerpo.data.aprobadas.length, 1);
  assert.equal(cuerpo.data.aprobadas[0].instancias.length, 1);
  assert.ok(cuerpo.data.aprobadas[0].fechaUltimaInstancia);

  const perfil = await pedir("/api/v1/alumno/perfil", { token });
  assert.equal(perfil.cuerpo.data.resumen.previasPendientes, 0);
});

test("boletin de alumnos de distintos cursos, divisiones y ciclos lectivos", async () => {
  const casos = [
    ["40123456", 1, "1"], // alu-1: 1° 1°
    ["42345678", 4, "1"], // alu-2: 4° 1° Informatica
    ["46789012", 4, "3"], // alu-6: 4° 3° Programacion
    ["40001111", 7, "2"]  // alu-11: 7° 2°
  ];

  const tokens = {};
  for (const [dni, curso, division] of casos) {
    const token = await alumnoConfigurado(dni);
    tokens[dni] = token;
    const { status, cuerpo } = await pedir("/api/v1/alumno/boletin", { token });
    assert.equal(status, 200);
    assert.equal(cuerpo.data.alumno.dni, dni);
    assert.equal(cuerpo.data.alumno.curso, curso);
    assert.equal(cuerpo.data.alumno.division, division);
    assert.equal(cuerpo.data.cicloLectivo, CICLO);

    const propias = gradesRepository.listCalificaciones({ estado: "activo" }).filter((c) => c.alumnoId === cuerpo.data.alumno.id || studentRepository.findByDni(dni).id === c.alumnoId);
    for (const materia of cuerpo.data.materias) {
      for (const periodo of Object.values(materia.periodos)) {
        for (const evaluacion of periodo.evaluaciones) {
          assert.ok(propias.some((c) => c.id === evaluacion.id), "cada nota del boletin es del alumno autenticado");
        }
      }
    }
  }

  /* Ciclo anterior: alu-1 tiene una calificacion anual 2025. */
  const token = tokens["40123456"];
  const anterior = await pedir("/api/v1/alumno/boletin?anio=2025", { token });
  assert.equal(anterior.status, 200);
  assert.equal(anterior.cuerpo.data.cicloLectivo, 2025);
  assert.ok(anterior.cuerpo.data.aniosDisponibles.includes(2025));
  const matematica = anterior.cuerpo.data.materias.find((materia) => materia.materiaId === "mat");
  assert.equal(matematica.calificacionFinal.valor, "5");

  assert.equal((await pedir(`/api/v1/alumno/boletin?anio=${CICLO + 1}`, { token })).status, 422);
});

/* ---------------- Verificacion integral ------------------------------------ */

test("la verificacion recorre todo el padron y no modifica datos", async () => {
  const antes = JSON.stringify(studentRepository.all());
  const informe = await verificarPadron({ incluirSinProblemas: true });

  assert.equal(informe.totales.alumnosVerificados, studentRepository.all().length);
  assert.equal(informe.alumnos.length, studentRepository.all().length);
  assert.equal(JSON.stringify(studentRepository.all()), antes);

  const director = await loginPersonal("secretario@prece.local", "Secretaria123!");
  const http = await pedir("/api/v1/portal-alumnos/verificacion", { token: director });
  assert.equal(http.status, 200);
  assert.equal(http.cuerpo.data.totales.alumnosVerificados, studentRepository.all().length);

  const docente = await loginPersonal("docente@prece.local", "Docente123!");
  assert.equal((await pedir("/api/v1/portal-alumnos/verificacion", { token: docente })).status, 403);
});

test("la verificacion detecta DNI duplicados, invalidos, perfiles repetidos y registros cruzados", async () => {
  studentRepository.create({ id: "alu-x1", escuelaId: "esc-1", apellido: "Pérez López", nombre: "Ana", dni: "40999999", fechaNacimiento: "2013-05-12", curso: 1, division: "1" });
  studentRepository.create({ id: "alu-x2", escuelaId: "esc-1", apellido: "Copia", nombre: "Dni", dni: "42345678", curso: 9, division: "9" });
  studentRepository.create({ id: "alu-x3", escuelaId: "esc-1", apellido: "Corto", nombre: "Dni", dni: "123", curso: 2, division: "1" });
  gradesRepository.createCalificacion({
    escuelaId: "esc-1", alumnoId: "alu-2", materiaId: "his", cursoId: "cur-1", divisionId: "div-1",
    anio: CICLO, cuatrimestre: 1, tipoEvaluacion: "oral", valor: "8", fecha: `${CICLO}-06-01`
  });

  const informe = await verificarPadron();
  const de = (id) => informe.alumnos.find((alumno) => alumno.id === id)?.problemas.map((problema) => problema.codigo) ?? [];

  assert.ok(de("alu-x1").includes("posible_duplicado"));
  assert.ok(de("alu-1").includes("posible_duplicado"));
  assert.ok(de("alu-x2").includes("dni_duplicado"));
  assert.ok(de("alu-2").includes("dni_duplicado"));
  assert.ok(de("alu-x2").includes("curso_division_inexistente"));
  assert.ok(de("alu-x3").includes("dni_invalido"));
  assert.ok(de("alu-2").includes("calificacion_otro_curso"));
  assert.ok(de("alu-1").includes("asistencia_registros_distintos"));
  assert.ok(de("alu-4").includes("posible_previa_sin_registrar"));
  assert.equal(informe.totales.motivosBloqueo.dni_duplicado, 2);
});

test("con un padron de ~900 alumnos la verificacion y las consultas siguen funcionando", async () => {
  const existentes = studentRepository.all().length;
  const cursos = [[1, "1"], [2, "3"], [3, "6"], [4, "2"], [5, "4"], [6, "1"], [7, "3"]];

  for (let indice = 0; existentes + indice < 900; indice += 1) {
    const [curso, division] = cursos[indice % cursos.length];
    studentRepository.create({
      id: `alu-carga-${indice}`,
      escuelaId: "esc-1",
      apellido: `Carga${indice}`,
      nombre: "Prueba",
      dni: String(50000000 + indice),
      curso,
      division
    });
  }

  const inicio = Date.now();
  const informe = await verificarPadron();
  const duracion = Date.now() - inicio;

  assert.equal(informe.totales.alumnosVerificados, 900);
  assert.ok(duracion < 5000, `la verificacion de 900 alumnos tardo ${duracion} ms`);

  const token = await alumnoConfigurado("50000450");
  const perfil = await pedir("/api/v1/alumno/perfil", { token });
  assert.equal(perfil.status, 200);
  assert.equal(perfil.cuerpo.data.datosPersonales.dni, "50000450");
  assert.deepEqual(perfil.cuerpo.data.resumen, { ausentes: 0,materiasAprobadas: 0, materiasConTep: 0, materiasDebajoDe6: 0, previasPendientes: 0 });
});

/* ---------------- Boletin unico y alcance del preceptor -------------------- */

test("el boletin que ve el alumno es el mismo que ve el preceptor y refleja los cambios", async () => {
  const token = await alumnoConfigurado("40123456");
  const preceptor = await loginPersonal("preceptor@prece.local", "Preceptor123!");

  const delAlumno = await pedir("/api/v1/alumno/boletin", { token });
  const delPreceptor = await pedir("/api/v1/alumnos/alu-1/boletin", { token: preceptor });
  assert.equal(delPreceptor.status, 200);
  assert.deepEqual(delPreceptor.cuerpo.data.materias, delAlumno.cuerpo.data.materias);
  assert.deepEqual(delPreceptor.cuerpo.data.inasistencias, delAlumno.cuerpo.data.inasistencias);

  /* La docente corrige una nota y preceptoria registra una ausencia: el alumno lo ve. */
  const docente = await loginPersonal("docente@prece.local", "Docente123!");
  assert.equal((await pedir("/api/v1/calificaciones/cal-2", { metodo: "PATCH", token: docente, cuerpo: { valor: "4" } })).status, 200);
  const ausencia = await pedir("/api/v1/inasistencias", { metodo: "POST", token: preceptor, cuerpo: { alumnoId: "alu-1", fecha: `${CICLO}-10-05`, anio: CICLO, cuatrimestre: 2, motivo: "personal" } });
  assert.equal(ausencia.status, 201, JSON.stringify(ausencia.cuerpo));

  const despues = await pedir("/api/v1/alumno/boletin", { token });
  const matematica = despues.cuerpo.data.materias.find((materia) => materia.materiaId === "mat");
  assert.ok(matematica.periodos.c1.evaluaciones.some((evaluacion) => evaluacion.id === "cal-2" && evaluacion.valor === "4"));
  assert.equal(despues.cuerpo.data.inasistencias.ausentes, delAlumno.cuerpo.data.inasistencias.ausentes + 1);
  assert.deepEqual((await pedir("/api/v1/alumnos/alu-1/boletin", { token: preceptor })).cuerpo.data.materias, despues.cuerpo.data.materias);
});

test("el alumno no puede escribir datos academicos ni ver boletines ajenos", async () => {
  const token = await alumnoConfigurado("40123456");
  const intentos = [
    ["/api/v1/alumnos/alu-2/boletin", "GET"],
    ["/api/v1/alumnos/alu-1/boletin", "GET"],
    ["/api/v1/calificaciones/cal-1", "PATCH", { valor: "10" }],
    ["/api/v1/students/alu-1", "PATCH", { curso: 2, division: "1" }],
    ["/api/v1/students/alu-1/cambio-division", "POST", { divisionNueva: "2" }],
    ["/api/v1/inasistencias", "POST", { alumnoId: "alu-1", fecha: `${CICLO}-10-06`, anio: CICLO, motivo: "personal" }],
    ["/api/v1/preceptores/mis-cursos", "GET"]
  ];
  for (const [ruta, metodo, cuerpo] of intentos) {
    assert.equal((await pedir(ruta, { metodo, token, cuerpo })).status, 403, `${metodo} ${ruta}`);
  }
});

test("un preceptor solo accede a los cursos que le asigno la Direccion", async () => {
  const ramos = await loginPersonal("cramos@prece.local", "Preceptor123!"); // 2° 2° y 5° 3°

  const cursos = await pedir("/api/v1/preceptores/mis-cursos", { token: ramos });
  assert.deepEqual(cursos.cuerpo.data.map((curso) => curso.id).sort(), ["2-2", "5-3"]);

  const alumnos = await pedir("/api/v1/students?porPagina=100", { token: ramos });
  assert.ok(alumnos.cuerpo.data.length > 0);
  assert.ok(alumnos.cuerpo.data.every((alumno) => ["2-2", "5-3"].includes(`${alumno.curso}-${alumno.division}`)));
  assert.deepEqual((await pedir("/api/v1/students/divisions", { token: ramos })).cuerpo.data.map((d) => d.id).sort(), ["2-2", "5-3"]);

  /* Alumno de otro curso por URL, query o cuerpo: bloqueado. */
  for (const [ruta, metodo, cuerpo] of [
    ["/api/v1/students/alu-1", "GET"],
    ["/api/v1/students/alu-1/profile", "GET"],
    ["/api/v1/alumnos/alu-1/boletin", "GET"],
    ["/api/v1/inasistencias?alumnoId=alu-1", "GET"],
    ["/api/v1/students/listas/division?anioCurso=1&division=1", "GET"],
    ["/api/v1/inasistencias", "POST", { alumnoId: "alu-1", fecha: `${CICLO}-10-07`, anio: CICLO, motivo: "personal" }]
  ]) {
    const respuesta = await pedir(ruta, { metodo, token: ramos, cuerpo });
    assert.equal(respuesta.status, 403, `${metodo} ${ruta}`);
    assert.equal(respuesta.cuerpo.error.code, "OUT_OF_SCOPE");
  }

  assert.equal((await pedir("/api/v1/alumnos/alu-13/boletin", { token: ramos })).status, 200); // 2° 2°
  const inasistencias = await pedir("/api/v1/inasistencias?porPagina=100", { token: ramos });
  assert.ok(inasistencias.cuerpo.data.every((registro) => ["2-2", "5-3"].includes(`${registro.curso}-${registro.division}`)));
});

test("al reasignar un curso, el preceptor anterior pierde el acceso en el acto", async () => {
  const director = await loginPersonal("director@prece.local", "Director123!");
  const ramos = await loginPersonal("cramos@prece.local", "Preceptor123!");
  const general = await loginPersonal("preceptor@prece.local", "Preceptor123!");
  const ramosId = (await pedir("/api/v1/auth/me", { token: ramos })).cuerpo.data.id;

  assert.equal((await pedir("/api/v1/students/alu-1", { token: ramos })).status, 403);
  const asignar = await pedir("/api/v1/preceptores/asignaciones", { metodo: "PUT", token: director, cuerpo: { divisiones: ["1-1"], preceptorId: ramosId } });
  assert.equal(asignar.status, 200);
  assert.equal(asignar.cuerpo.data.find((division) => division.id === "1-1").preceptor.id, ramosId);

  assert.equal((await pedir("/api/v1/students/alu-1", { token: ramos })).status, 200);
  assert.equal((await pedir("/api/v1/students/alu-1", { token: general })).status, 403, "el anterior pierde el curso");

  await pedir("/api/v1/preceptores/asignaciones/quitar", { metodo: "POST", token: director, cuerpo: { divisiones: ["1-1", "2-2", "5-3"] } });
  const sinCursos = await pedir("/api/v1/preceptores/mis-cursos", { token: ramos });
  assert.deepEqual(sinCursos.cuerpo.data, []);
  assert.equal((await pedir("/api/v1/students?porPagina=100", { token: ramos })).cuerpo.data.length, 0);

  /* Solo la Direccion asigna. */
  assert.equal((await pedir("/api/v1/preceptores/asignaciones", { metodo: "PUT", token: ramos, cuerpo: { divisiones: ["1-1"], preceptorId: ramosId } })).status, 403);
  assert.equal((await pedir("/api/v1/preceptores/asignaciones", { metodo: "PUT", token: director, cuerpo: { divisiones: ["9-9"], preceptorId: ramosId } })).status, 422);
});

test("el tablero y las respuestas del preceptor solo traen datos de sus cursos", async () => {
  const ramos = await loginPersonal("cramos@prece.local", "Preceptor123!"); // 2° 2° y 5° 3°
  const propios = (alumno) => ["2-2", "5-3"].includes(`${alumno.curso}-${alumno.division}`);

  const tablero = (await pedir("/api/v1/dashboard/secretaria", { token: ramos })).cuerpo.data;
  const alumnos = (await pedir("/api/v1/students?porPagina=100", { token: ramos })).cuerpo.data;
  assert.equal(tablero.resumenAlumnos.total, alumnos.length);
  assert.deepEqual(tablero.alumnosPorCurso.map((curso) => curso.id).sort(), ["2-2", "5-3"]);
  assert.equal(tablero.asistenciaHoy.matricula, alumnos.filter((alumno) => alumno.isActive !== false).length);
  assert.ok(alumnos.every(propios));

  /* Un alumno de otro curso por id: 403 tambien en rutas que no lo nombran por URL. */
  for (const ruta of ["/api/v1/students/alu-1", "/api/v1/students/alu-1/observations", "/api/v1/alumnos/alu-1/boletin"]) {
    assert.equal((await pedir(ruta, { token: ramos })).status, 403, ruta);
  }

  /* Listados generales: ningun registro atribuible a otro curso. */
  const alumnosAjenos = new Set((await pedir("/api/v1/students?porPagina=100", { token: await loginPersonal("director@prece.local", "Director123!") })).cuerpo.data.filter((a) => !propios(a)).map((a) => a.id));
  for (const ruta of ["/api/v1/observations", "/api/v1/inasistencias", "/api/v1/tutors", "/api/v1/attendance/alerts", "/api/v1/particular-conditions"]) {
    const respuesta = await pedir(ruta, { token: ramos });
    if (respuesta.status !== 200) continue;
    const texto = JSON.stringify(respuesta.cuerpo);
    for (const id of alumnosAjenos) assert.ok(!texto.includes(`"${id}"`), `${ruta} filtra ${id}`);
  }
});

test("un preceptor sin cursos asignados no recibe ningun dato de alumnos ni de cursos", async () => {
  const { recortarRespuesta } = await import("../modules/preceptor-assignments/alcance.mjs");
  const sinCursos = { assignments: [{ role: "preceptor", schoolId: "esc-1", cursos: [] }] };
  const payload = {
    data: { resumenAlumnos: { total: 3 }, alumnosPorCurso: [{ id: "2-2", anio: 2, division: "2" }], actividadReciente: [] }
  };
  const recortado = recortarRespuesta(sinCursos, payload);
  assert.deepEqual(recortado.data.alumnosPorCurso, []);
  assert.deepEqual(recortado.data.resumenAlumnos, { total: 3 });
  assert.equal(recortarRespuesta(sinCursos, { data: [] }).data.length, 0);
});
test("el preceptor no puede modificar registros de alumnos fuera de sus cursos, aunque conozca el id", async () => {
  const ramos = await loginPersonal("cramos@prece.local", "Preceptor123!");
  const intentos = [
    ["/api/v1/observations/obs-1", "PATCH", { descripcion: "cambiada por otro curso" }],
    ["/api/v1/observations/obs-1/seguimientos", "POST", { accion: "x", observaciones: "x" }],
    ["/api/v1/particular-conditions/cond-1", "PATCH", { descripcion: "cambiada por otro curso" }],
    ["/api/v1/inasistencias/ina-1/justify", "POST", { motivo: "x" }],
    ["/api/v1/inasistencias/ina-1", "PATCH", { motivo: "x" }]
  ];
  for (const [ruta, metodo, cuerpo] of intentos) {
    assert.equal((await pedir(ruta, { metodo, token: ramos, cuerpo })).status, 403, `${metodo} ${ruta}`);
  }
  const sigue = (await pedir("/api/v1/observations/obs-1", { token: await loginPersonal("preceptor@prece.local", "Preceptor123!") })).cuerpo.data;
  assert.notEqual(sigue.descripcion, "cambiada por otro curso");
});
