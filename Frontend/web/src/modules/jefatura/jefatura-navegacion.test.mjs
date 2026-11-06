/* Integracion del perfil Jefatura de Area con la tabla de rutas real.
 *
 * A diferencia de app/navegacion.test.mjs (que usa una tabla de prueba), aca se
 * cruza la tabla real de app/rutas.js con los permisos reales del rol tomados
 * de Backend/config/permissions.config.mjs: es el contrato entre el backend y
 * la navegacion del perfil. */

import assert from "node:assert/strict";
import test from "node:test";
import { permissionsForRole } from "../../../../../Backend/config/permissions.config.mjs";
import { roles as ROLES_CATALOGO } from "../../../../../Shared/src/domain.mjs";
import { ACCESO, decidirAcceso, resolverRuta, rutasVisibles } from "../../app/navegacion.js";
import { RUTAS } from "../../app/rutas.js";

const PERMISOS_JEFE = permissionsForRole("jefe_area");

const jefe = {
  cargando: false,
  autenticado: true,
  permisos: PERMISOS_JEFE,
  roles: [{ id: "jefe_area", nombre: "Jefatura de Área" }]
};

const preceptorConPermisoDeAlta = {
  cargando: false,
  autenticado: true,
  permisos: [...permissionsForRole("preceptor"), "students.write"],
  roles: [{ id: "preceptor", nombre: "Preceptor" }]
};

function acceso(hash) {
  return decidirAcceso(resolverRuta(hash, RUTAS), jefe).tipo;
}

function visibleEnMenu(titulo) {
  return rutasVisibles(RUTAS, jefe).some((ruta) => ruta.titulo === titulo);
}

test("el catalogo compartido muestra el nombre visible Jefatura de Area", () => {
  const rol = ROLES_CATALOGO.find((item) => item.id === "jefe_area");

  assert.ok(rol, "el rol jefe_area debe existir en Shared/src/domain.mjs");
  assert.equal(rol.name, "Jefatura de Área");
  assert.ok(rol.description.length > 0);
});

test("el rol conserva los permisos definidos en el backend", () => {
  assert.equal(PERMISOS_JEFE.length, 42);
  assert.ok(PERMISOS_JEFE.includes("identity.update"));
  assert.ok(!PERMISOS_JEFE.includes("identity.manage"));
  assert.ok(PERMISOS_JEFE.includes("planning.review"));
  assert.ok(PERMISOS_JEFE.includes("planning.manage"));
  assert.ok(PERMISOS_JEFE.includes("observations.write"));
  assert.ok(PERMISOS_JEFE.includes("students.read"));
  assert.ok(PERMISOS_JEFE.includes("academics.read"));
  assert.ok(PERMISOS_JEFE.includes("notifications.update"));
});

test("abre su tablero, el inicio, el perfil y las pantallas generales", () => {
  assert.equal(acceso("#/inicio"), ACCESO.permitido);
  assert.equal(acceso("#/jefatura"), ACCESO.permitido);
  assert.equal(acceso("#/perfil"), ACCESO.permitido);
  assert.equal(acceso("#/configuracion"), ACCESO.permitido);
  assert.equal(acceso("#/calendario"), ACCESO.permitido);
  assert.equal(acceso("#/notificaciones"), ACCESO.permitido);
});

test("puede consultar alumnos y legajos (students.read)", () => {
  assert.equal(acceso("#/alumnos"), ACCESO.permitido);
  assert.equal(acceso("#/alumnos/buscar"), ACCESO.permitido);
  assert.equal(acceso("#/alumnos/alu-1"), ACCESO.permitido);
  assert.equal(acceso("#/alumnos/alu-1/ficha"), ACCESO.permitido);
  assert.equal(acceso("#/alumnos/alu-1/perfil"), ACCESO.permitido);
});

test("puede leer y registrar observaciones", () => {
  assert.equal(acceso("#/preceptoria/observaciones"), ACCESO.permitido);
});

test("Preceptor no puede abrir la carga de alumnos por URL aunque tenga students.write", () => {
  for (const hash of ["#/alumnos/cargar", "#/alumnos/nuevo"]) {
    assert.equal(
      decidirAcceso(resolverRuta(hash, RUTAS), preceptorConPermisoDeAlta).tipo,
      ACCESO.denegado,
      `${hash} debe seguir restringido al rol Preceptor`
    );
  }
});

test("no puede dar de alta alumnos (students.write ausente)", () => {
  assert.equal(acceso("#/alumnos/nuevo"), ACCESO.denegado);
  assert.equal(acceso("#/alumnos/cargar"), ACCESO.denegado);
});

test("no abre tableros ni pantallas exclusivas de otros perfiles", () => {
  for (const hash of [
    "#/director",
    "#/inicio-director",
    "#/secretaria",
    "#/inicio-secretaria",
    "#/preceptoria",
    "#/docente",
    "#/docente/cursos",
    "#/docente/asistencias",
    "#/server",
    "#/inventario",
    "#/asistencias",
    "#/boletines",
    "#/cursos"
  ]) {
    assert.equal(acceso(hash), ACCESO.denegado, `${hash} no deberia abrirse para jefe_area`);
  }
});

test("no gestiona usuarios, roles ni permisos", () => {
  for (const hash of ["#/usuarios", "#/usuarios/nuevo", "#/usuarios/usr-1/editar", "#/invitar", "#/roles"]) {
    assert.equal(acceso(hash), ACCESO.denegado, `${hash} no deberia abrirse para jefe_area`);
  }
});

test("el menu solo ofrece las secciones que puede abrir", () => {
  assert.deepEqual(
    rutasVisibles(RUTAS, jefe).map((ruta) => ruta.titulo),
    ["Inicio", "Panel de jefatura", "Observaciones", "Calendario", "Alumnos", "Configuración"]
  );
  assert.ok(visibleEnMenu("Panel de jefatura"));
  assert.ok(visibleEnMenu("Configuración"));
  assert.ok(!visibleEnMenu("Tablero de Dirección"));
  assert.ok(!visibleEnMenu("Usuarios"));
  assert.ok(!visibleEnMenu("Inventario"));
  assert.ok(!visibleEnMenu("Tablero de secretaria"));
});
