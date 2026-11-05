import assert from "node:assert/strict";
import test from "node:test";
import { calcularCursosSinAsignar } from "./jefatura-dashboard-view.js";

test("calcularCursosSinAsignar devuelve lista vacía si todos los cursos tienen grupo de taller asignado", () => {
  const divisiones = [
    { anio: 1, division: "1", clave: "1-1" },
    { anio: 1, division: "2", clave: "1-2" }
  ];
  const alumnos = [
    { id: 1, curso: "1°", division: "1", estado: "Activo", grupoTaller: "1.1" },
    { id: 2, curso: "1°", division: "1", estado: "Activo", grupoTaller: "1.3" },
    { id: 3, curso: "1°", division: "2", estado: "Activo", grupoTaller: "1.2" },
    { id: 4, curso: "1°", division: "2", estado: "Activo", grupoTaller: "1.4" }
  ];

  const pendientes = calcularCursosSinAsignar(divisiones, alumnos);
  assert.deepEqual(pendientes, [], "cuando todos están asignados no debe haber pendientes");
});

test("calcularCursosSinAsignar detecta cursos con alumnos sin grupoTaller", () => {
  const divisiones = [
    { anio: 1, division: "1", clave: "1-1" },
    { anio: 1, division: "3", clave: "1-3" },
    { anio: 1, division: "4", clave: "1-4" },
    { anio: 1, division: "6", clave: "1-6" }
  ];
  const alumnos = [
    { id: 1, curso: "1°", division: "1", estado: "Activo", grupoTaller: "1.1" },
    { id: 2, curso: "1°", division: "3", estado: "Activo", grupoTaller: null },
    { id: 3, curso: "1°", division: "4", estado: "Activo", grupoTaller: null },
    { id: 4, curso: "1°", division: "6", estado: "Activo", grupoTaller: null }
  ];

  const pendientes = calcularCursosSinAsignar(divisiones, alumnos);
  assert.equal(pendientes.length, 3);
  assert.deepEqual(pendientes, [
    { etiqueta: "1°3", clave: "1-3" },
    { etiqueta: "1°4", clave: "1-4" },
    { etiqueta: "1°6", clave: "1-6" }
  ]);
});

test("calcularCursosSinAsignar descuenta los cursos que van siendo asignados hasta desaparecer", () => {
  const divisiones = [
    { anio: 1, division: "3", clave: "1-3" },
    { anio: 1, division: "4", clave: "1-4" }
  ];
  const alumnosPaso1 = [
    { id: 10, curso: "1°", division: "3", estado: "Activo", grupoTaller: null },
    { id: 11, curso: "1°", division: "4", estado: "Activo", grupoTaller: null }
  ];
  assert.equal(calcularCursosSinAsignar(divisiones, alumnosPaso1).length, 2);

  // Paso 2: se asigna 1°3
  const alumnosPaso2 = [
    { id: 10, curso: "1°", division: "3", estado: "Activo", grupoTaller: "1.5" },
    { id: 11, curso: "1°", division: "4", estado: "Activo", grupoTaller: null }
  ];
  const paso2 = calcularCursosSinAsignar(divisiones, alumnosPaso2);
  assert.equal(paso2.length, 1);
  assert.equal(paso2[0].clave, "1-4");

  // Paso 3: se asigna también 1°4
  const alumnosPaso3 = [
    { id: 10, curso: "1°", division: "3", estado: "Activo", grupoTaller: "1.5" },
    { id: 11, curso: "1°", division: "4", estado: "Activo", grupoTaller: "1.6" }
  ];
  const paso3 = calcularCursosSinAsignar(divisiones, alumnosPaso3);
  assert.equal(paso3.length, 0, "al asignar todos los talleres la lista queda vacía para ocultar la alerta");
});

test("ignora alumnos inactivos y tolera respuesta envuelta en { data }", () => {
  const divisiones = { data: [{ anio: 2, division: "1", clave: "2-1" }] };
  const alumnos = {
    data: [
      { id: 20, curso: 2, division: "1", estado: "Inactivo", grupoTaller: null },
      { id: 21, curso: 2, division: "1", estado: "inactivo", grupoTaller: null }
    ]
  };

  const pendientes = calcularCursosSinAsignar(divisiones, alumnos);
  assert.deepEqual(pendientes, [], "los alumnos inactivos no provocan pendientes de taller");
});

