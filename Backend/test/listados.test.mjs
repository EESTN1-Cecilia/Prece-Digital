


import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { userRepository } from "../database/repositories/user.repository.mjs";
import { signAccessToken } from "../modules/auth/token.service.mjs";
import { setTestPool } from "../database/client.mjs";
import groupsRepository from "../modules/groups/groups.repository.mjs";
import workshopsRepository from "../modules/workshops/workshops.repository.mjs";

const PUERTO = 3999;
const base = `http://127.0.0.1:${PUERTO}`;
let servidor;

const DIRECTOR_USER = userRepository.create({
  id: "usr_director",
  email: "director@listados.test",
  passwordHash: "hash",
  displayName: "Director Test",
  assignments: [{ role: "director", schoolId: "esc-1" }]
});

const DOCENTE_USER = userRepository.create({
  id: "usr_docente",
  email: "docente@listados.test",
  passwordHash: "hash",
  displayName: "Docente Test",
  assignments: [{ role: "docente", schoolId: "esc-1" }]
});

const SIN_PERMISO_USER = userRepository.create({
  id: "usr_operador",
  email: "operador@listados.test",
  passwordHash: "hash",
  displayName: "Operador Test",
  assignments: [{ role: "attendance-operator", schoolId: "esc-1" }]
});

function tokenDe(user) {
  return signAccessToken(user);
}

before(async () => {
  servidor = createApp(apiRoutes);
  await new Promise((listo) => servidor.listen(PUERTO, listo));
});

after(async () => {
  await new Promise((listo) => servidor.close(listo));
});

beforeEach(() => {
  setTestPool(null);
});

async function pedir(ruta, token) {
  const cabeceras = token ? { authorization: `Bearer ${token}` } : {};
  const respuesta = await fetch(`${base}${ruta}`, { headers: cabeceras });
  return { status: respuesta.status, cuerpo: await respuesta.json() };
}





test("un listado sin token devuelve 401", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=1");

  assert.equal(status, 401);
  assert.equal(cuerpo.error.code, "missing_token");
});

test("un token invalido devuelve 401", async () => {
  const { status } = await pedir("/api/v1/students/listas/curso", "token-roto");

  assert.equal(status, 401);
});





test("un rol sin permiso STUDENTS_READ devuelve 403", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=1", tokenDe(SIN_PERMISO_USER));

  assert.equal(status, 403);
  assert.equal(cuerpo.error.code, "forbidden");
});





test("un curso fuera de rango devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=9", tokenDe(DIRECTOR_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.code, "VALIDATION_ERROR");
  assert.equal(cuerpo.error.details[0].field, "anioCurso");
});

test("un orden no permitido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=1&orden=random", tokenDe(DIRECTOR_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "orden");
});

test("una pagina invalida devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/division?anioDivisionId=1&pagina=0", tokenDe(DIRECTOR_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "pagina");
});

test("grupo sin groupId devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/grupo", tokenDe(DIRECTOR_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "groupId");
});

test("taller sin workshopId devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/taller", tokenDe(DIRECTOR_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "workshopId");
});

test("condicion invalida devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=1&condicion=invalida", tokenDe(DIRECTOR_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "condicion");
});

test("periodo invalido devuelve 422", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=1&periodo=abc", tokenDe(DIRECTOR_USER));

  assert.equal(status, 422);
  assert.equal(cuerpo.error.details[0].field, "periodo");
});





test("la respuesta de error es uniforme con el resto de la API", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=1");

  assert.equal(status, 401);
  assert.deepEqual(Object.keys(cuerpo), ["error"]);
  assert.equal(typeof cuerpo.error.message, "string");
});





test("listado por curso devuelve formato uniforme con contexto y paginacion", async () => {
  const mockPool = {
    async query(sql, params = []) {
      const consulta = sql.replace(/\s+/g, " ").trim();

      if (consulta.includes("FROM anios_divisiones ad") && consulta.includes("GROUP BY")) {
        return [[{ anio_curso: 4, periodo: 2026, ciclo_lectivo_id: 1 }]];
      }

      if (consulta.includes("COUNT(*)")) {
        return [[{ total: 2 }]];
      }

      if (consulta.includes("e.id AS alumno_id")) {
        return [
          [
            { alumno_id: 1, nombre: "Ana", apellido: "Garcia", dni: "11111111", condicion: "regular", alumno_activo: 1, anio_division_id: 1, anio_curso: 4, division: "1", turno_aula: "manana", turno_taller: "tarde", orientacion: null, ciclo_lectivo_id: 1, periodo: 2026, escuela_id: 1 },
            { alumno_id: 2, nombre: "Luis", apellido: "Lopez", dni: "22222222", condicion: null, alumno_activo: 1, anio_division_id: 1, anio_curso: 4, division: "1", turno_aula: "manana", turno_taller: "tarde", orientacion: null, ciclo_lectivo_id: 1, periodo: 2026, escuela_id: 1 }
          ]
        ];
      }

      return [[]];
    }
  };

  setTestPool(mockPool);

  const { status, cuerpo } = await pedir("/api/v1/students/listas/curso?anioCurso=4", tokenDe(DIRECTOR_USER));

  assert.equal(status, 200);
  assert.ok(cuerpo.contexto, "debe tener contexto");
  assert.equal(cuerpo.contexto.tipo, "curso");
  assert.ok(cuerpo.contexto.fechaConsulta, "debe tener fechaConsulta");
  assert.equal(cuerpo.contexto.curso.anio, 4);
  assert.ok(Array.isArray(cuerpo.data), "data debe ser un array");
  assert.equal(cuerpo.data.length, 2);
  assert.equal(cuerpo.paginacion.total, 2);
  assert.equal(typeof cuerpo.paginacion.pagina, "number");
  assert.equal(typeof cuerpo.paginacion.porPagina, "number");
  assert.equal(typeof cuerpo.paginacion.totalPaginas, "number");
  assert.ok(cuerpo.filtros, "debe tener filtros");

  const alumno = cuerpo.data[0];
  assert.equal(alumno.id, "1");
  assert.equal(alumno.nombre, "Ana");
  assert.equal(alumno.curso, 4);
  assert.equal(alumno.estado, "activo");
  assert.equal(alumno.condicion, "regular");
});

test("listado por division devuelve contexto con division", async () => {
  const mockPool = {
    async query(sql, params = []) {
      const consulta = sql.replace(/\s+/g, " ").trim();

      if (consulta.includes("FROM anios_divisiones ad") && !consulta.includes("e.id AS alumno_id")) {
        if (consulta.includes("GROUP BY")) {
          return [[]];
        }
        return [[{ anio_curso: 4, division: "1", turno_aula: "manana", turno_taller: "tarde", orientacion: null, periodo: 2026, ciclo_lectivo_id: 1 }]];
      }

      if (consulta.includes("COUNT(*)")) return [[{ total: 0 }]];
      if (consulta.includes("e.id AS alumno_id")) return [[]];

      return [[]];
    }
  };

  setTestPool(mockPool);

  const { status, cuerpo } = await pedir("/api/v1/students/listas/division?anioDivisionId=1", tokenDe(DIRECTOR_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.contexto.tipo, "division");
  assert.equal(cuerpo.contexto.division.id, "1");
  assert.equal(cuerpo.contexto.division.numero, "1");
  assert.equal(cuerpo.data.length, 0);
});

test("listado por grupo inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/grupo?groupId=grp_no_existe", tokenDe(DIRECTOR_USER));

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("listado por taller inexistente devuelve 404", async () => {
  const { status, cuerpo } = await pedir("/api/v1/students/listas/taller?workshopId=wrk_no_existe", tokenDe(DIRECTOR_USER));

  assert.equal(status, 404);
  assert.equal(cuerpo.error.code, "NOT_FOUND");
});

test("listado por grupo con datos reales devuelve formato correcto", async () => {
  const group = groupsRepository.createGroup({
    name: "Grupo A",
    type: "curso",
    courseId: "cur-1",
    schoolId: "esc-1",
    createdBy: "usr_director"
  });

  groupsRepository.addMember({ groupId: group.id, studentId: "1", schoolId: "esc-1", createdBy: "usr_director" });
  groupsRepository.addMember({ groupId: group.id, studentId: "2", schoolId: "esc-1", createdBy: "usr_director" });

  const mockPool = {
    async query(sql, params = []) {
      const consulta = sql.replace(/\s+/g, " ").trim();

      if (consulta.includes("COUNT(*)")) return [[{ total: 2 }]];

      if (consulta.includes("e.id AS alumno_id")) {
        return [
          [
            { alumno_id: 1, nombre: "Ana", apellido: "Garcia", dni: "11111111", condicion: "regular", alumno_activo: 1, anio_division_id: 1, anio_curso: 4, division: "1", turno_aula: "manana", turno_taller: "tarde", orientacion: null, ciclo_lectivo_id: 1, periodo: 2026, escuela_id: 1 },
            { alumno_id: 2, nombre: "Luis", apellido: "Lopez", dni: "22222222", condicion: null, alumno_activo: 1, anio_division_id: 1, anio_curso: 4, division: "1", turno_aula: "manana", turno_taller: "tarde", orientacion: null, ciclo_lectivo_id: 1, periodo: 2026, escuela_id: 1 }
          ]
        ];
      }

      return [[]];
    }
  };

  setTestPool(mockPool);

  const { status, cuerpo } = await pedir(`/api/v1/students/listas/grupo?groupId=${group.id}`, tokenDe(DIRECTOR_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.contexto.tipo, "grupo");
  assert.equal(cuerpo.contexto.grupo.id, group.id);
  assert.equal(cuerpo.contexto.grupo.nombre, "Grupo A");
  assert.equal(cuerpo.data.length, 2);
  assert.equal(cuerpo.data[0].grupo.id, group.id);
  assert.equal(cuerpo.data[0].grupo.nombre, "Grupo A");
  assert.ok(cuerpo.contexto.fechaConsulta, "debe tener fechaConsulta");
  assert.ok(typeof cuerpo.paginacion.total === "number");
});

test("listado por taller con datos reales devuelve formato correcto", async () => {
  const workshop = workshopsRepository.create({
    name: "Taller Mecanica",
    code: "MEC",
    careerId: "car-1",
    spaceId: "sp-1",
    teacherId: "usr_docente",
    schoolId: "esc-1"
  });

  const group = groupsRepository.createGroup({
    name: "Grupo Mec A",
    type: "taller",
    workshopId: workshop.id,
    courseId: "cur-1",
    schoolId: "esc-1",
    createdBy: "usr_director"
  });

  groupsRepository.addMember({ groupId: group.id, studentId: "3", schoolId: "esc-1", createdBy: "usr_director" });

  const mockPool = {
    async query(sql, params = []) {
      const consulta = sql.replace(/\s+/g, " ").trim();

      if (consulta.includes("COUNT(*)")) return [[{ total: 1 }]];

      if (consulta.includes("e.id AS alumno_id")) {
        return [
          [
            { alumno_id: 3, nombre: "Maria", apellido: "Torres", dni: "33333333", condicion: "irregular", alumno_activo: 1, anio_division_id: 2, anio_curso: 5, division: "2", turno_aula: "tarde", turno_taller: "manana", orientacion: "informatica", ciclo_lectivo_id: 1, periodo: 2026, escuela_id: 1 }
          ]
        ];
      }

      return [[]];
    }
  };

  setTestPool(mockPool);

  const { status, cuerpo } = await pedir(`/api/v1/students/listas/taller?workshopId=${workshop.id}`, tokenDe(DIRECTOR_USER));

  assert.equal(status, 200);
  assert.equal(cuerpo.contexto.tipo, "taller");
  assert.equal(cuerpo.contexto.taller.id, workshop.id);
  assert.equal(cuerpo.contexto.taller.nombre, "Taller Mecanica");
  assert.equal(cuerpo.data.length, 1);
  assert.equal(cuerpo.data[0].taller.id, workshop.id);
  assert.equal(cuerpo.data[0].condicion, "irregular");
  assert.ok(cuerpo.contexto.fechaConsulta, "debe tener fechaConsulta");
});

test("un docente con STUDENTS_READ puede acceder al listado", async () => {
  const mockPool = {
    async query(sql, params = []) {
      const consulta = sql.replace(/\s+/g, " ").trim();
      if (consulta.includes("GROUP BY")) return [[{ anio_curso: 1, periodo: 2026, ciclo_lectivo_id: 1 }]];
      if (consulta.includes("COUNT(*)")) return [[{ total: 0 }]];
      if (consulta.includes("e.id AS alumno_id")) return [[]];
      return [[]];
    }
  };

  setTestPool(mockPool);

  const { status } = await pedir("/api/v1/students/listas/curso?anioCurso=1", tokenDe(DOCENTE_USER));
  assert.equal(status, 200);
});
