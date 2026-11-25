import test from "node:test";
import assert from "node:assert/strict";
import { crearPersistencia, tablaDe } from "../database/persistencia.mjs";

/* Base falsa en memoria con la misma interfaz que los adaptadores MySQL / SQL Server. */
function adaptadorFalso() {
  const colecciones = new Map();
  const tablas = new Map();
  const blobs = new Map();
  const log = [];
  return {
    tablas, blobs, log,
    leerColecciones: async () => [...colecciones.values()],
    leerTabla: async (tabla) => [...tablas.get(tabla).filas.values()].sort((a, b) => a.orden - b.orden),
    leerBlobs: async () => [...blobs.entries()].flatMap(([clave, partes]) => partes.map((valor, parte) => ({ clave, parte, valor }))),
    asegurarTabla: async ({ coleccion, tabla, tipo, columnas }) => {
      colecciones.set(coleccion, { coleccion, tabla, tipo });
      if (!tablas.has(tabla)) tablas.set(tabla, { columnas: new Set(), filas: new Map() });
      columnas.forEach((c) => tablas.get(tabla).columnas.add(c));
      blobs.delete(coleccion);
    },
    escribirFilas: async (tabla, _columnas, filas, borrar) => {
      log.push({ tabla, filas: filas.map((f) => f.clave), borrar });
      const t = tablas.get(tabla);
      borrar.forEach((k) => t.filas.delete(k));
      filas.forEach((f) => t.filas.set(f.clave, { ...f }));
    },
    escribirBlob: async (clave, partes) => blobs.set(clave, partes),
    cerrar: async () => {}
  };
}

test("cada coleccion va a su tabla, fila por registro, con columnas clave", async () => {
  const base = adaptadorFalso();
  const grande = "x".repeat(450_000);
  const origen = {
    students: new Map([
      ["alu-1", { id: "alu-1", dni: "40123456", apellido: "Pérez", alta: new Date("2026-03-01T00:00:00Z"), tags: new Set(["a"]) }],
      ["alu-2", { id: "alu-2", dni: "40999999", apellido: "Gómez" }]
    ]),
    gradesAudit: [{ accion: "create", alumnoId: "alu-1" }, { accion: "update", alumnoId: "alu-2" }],
    dismissedAlerts: { x: true, texto: grande }
  };

  await crearPersistencia(base, origen).guardar();

  const alumnos = base.tablas.get(tablaDe("students"));
  assert.equal(tablaDe("students"), "ps_students");
  assert.equal(alumnos.filas.size, 2);
  assert.equal(alumnos.filas.get("alu-1").dni, "40123456");
  assert.ok(alumnos.columnas.has("apellido"));
  assert.equal(base.tablas.get("ps_grades_audit").filas.get("1").alumno_id, "alu-2");
  assert.ok(base.blobs.get("dismissedAlerts").length >= 3, "lo que no es Map/Array va partido a app_store");

  /* Carga en un store vacio, rellenando las colecciones existentes en el lugar. */
  const destino = { students: new Map(), gradesAudit: [] };
  const refAlumnos = destino.students;
  const persistencia = crearPersistencia(base, destino);
  assert.equal(await persistencia.cargar(), 3);
  assert.equal(destino.students, refAlumnos);
  assert.deepEqual([...destino.students.keys()], ["alu-1", "alu-2"]);
  const ana = destino.students.get("alu-1");
  assert.ok(ana.alta instanceof Date && ana.tags.has("a"));
  assert.equal(destino.gradesAudit[1].accion, "update");
  assert.equal(destino.dismissedAlerts.texto, grande);

  /* Solo se escriben las filas que cambiaron o se borraron. */
  base.log.length = 0;
  destino.students.get("alu-2").apellido = "Gómez Ruiz";
  destino.students.set("alu-3", { id: "alu-3", dni: "41000000", cursoId: "cur-1" });
  destino.gradesAudit.push({ accion: "delete" });
  await persistencia.guardar();
  assert.deepEqual(base.log, [
    { tabla: "ps_students", filas: ["alu-2", "alu-3"], borrar: [] },
    { tabla: "ps_grades_audit", filas: ["2"], borrar: [] }
  ]);
  assert.ok(alumnos.columnas.has("curso_id"), "un campo nuevo agrega columna");

  base.log.length = 0;
  destino.students.delete("alu-1");
  await persistencia.guardar();
  assert.deepEqual(base.log[0].borrar, ["alu-1"]);
});
