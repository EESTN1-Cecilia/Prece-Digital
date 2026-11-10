/* Verificacion de punta a punta de permisos y privilegios: Backend <-> Web <-> Mobile.

   1. Backend: cada ruta protegida declara un permiso existente en el catalogo, y
      cada rol recibe solo lo que su catalogo dice (HTTP real contra la API).
   2. Web: los permisos y roles que usa la tabla de rutas existen en el backend, y
      cada rol ve en el menu solo lo que su sesion puede abrir.
   3. Mobile (app del alumno): solo llama a /api/v1/alumno/*, /auth/* y cada
      llamada existe en el backend con el mismo metodo y exige permisos de portal.
   4. El alumno no alcanza ninguna ruta del personal y el personal no entra al portal.

   Corre sin base de datos (store en memoria). */

import assert from "node:assert/strict";
import test, { after, before, beforeEach } from "node:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { createApp } from "../src/app.mjs";
import { apiRoutes } from "../routes/index.mjs";
import { ROLES, ROLE_PERMISSIONS, permisoValido, permissionsForRole } from "../config/permissions.config.mjs";
import { resetStore } from "../database/memory-store.mjs";
import { seedAuthData } from "../database/seeds/auth.seed.mjs";

process.env.ALUMNO_CAMBIO_CLAVE_OBLIGATORIO = "true";

const PUERTO = 4011;
const base = `http://127.0.0.1:${PUERTO}`;
const WEB = fileURLToPath(new URL("../../Frontend/web/src", import.meta.url));
const MOBILE = fileURLToPath(new URL("../../Frontend/mobile/src", import.meta.url));

const PORTAL = ["student-portal.read", "student-portal.update"];
/* Rutas autenticadas que no exigen permiso: solo informan sobre la propia sesion. */
const SOLO_SESION = new Set(["/api/v1/auth/me", "/api/v1/auth/permissions", "/api/v1/authorization/me"]);
/* Rutas autenticadas SIN permiso de catalogo, por diseno:
   - informes-direccion: guardadas por rol (soloPersonal / soloDireccion), se prueban abajo por HTTP.
   - calendario (lectura), calificaciones/periodos (lectura) y devices: informacion institucional
     de solo lectura o del propio usuario (devices filtra por el usuario del token). */
const POR_ROL = /^\/api\/v1\/informes-direccion/;
const ABIERTAS_A_SESION = new Set(["GET /api/v1/calendario/eventos", "GET /api/v1/calendario/avisos", "GET /api/v1/calificaciones/periodos", "POST /api/v1/devices", "GET /api/v1/devices", "DELETE /api/v1/devices/:deviceId"]);

const CUENTAS = {
  admin: ["admin@prece.local", "Admin123!"],
  director: ["director@prece.local", "Director123!"],
  secretario: ["secretario@prece.local", "Secretaria123!"],
  preceptor: ["preceptor@prece.local", "Preceptor123!"],
  docente: ["docente@prece.local", "Docente123!"],
  jefe_area: ["jefearea@prece.local", "JefeArea123!"],
  server: ["server@prece.local", "Server123!"]
};

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
  await seedAuthData();
});

async function pedir(ruta, { metodo = "GET", token, cuerpo } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await respuesta.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* no JSON */ }
  return { status: respuesta.status, cuerpo: json };
}

async function tokenDe(rol) {
  const [email, password] = CUENTAS[rol];
  const { cuerpo, status } = await pedir("/api/v1/auth/login", { metodo: "POST", cuerpo: { email, password } });
  assert.equal(status, 200, `login ${rol}`);
  return cuerpo.accessToken;
}

/* Permiso que exige una ruta (null: publica o solo-sesion). */
function permisoDe(ruta) {
  for (const mw of ruta.middlewares ?? []) if (mw.permiso) return mw.permiso;
  return null;
}
const protegidas = () => apiRoutes.filter((r) => (r.middlewares ?? []).length > 0);
const sinParametros = (ruta) => !ruta.path.includes(":");

/* ------------------------------ 1. Backend -------------------------------- */

test("backend: toda ruta protegida exige un permiso valido del catalogo (salvo las de la propia sesion)", () => {
  const faltan = [];
  for (const ruta of protegidas()) {
    if (SOLO_SESION.has(ruta.path) || POR_ROL.test(ruta.path) || ABIERTAS_A_SESION.has(`${ruta.method} ${ruta.path}`)) continue;
    const permiso = permisoDe(ruta);
    if (!permiso) faltan.push(`${ruta.method} ${ruta.path} (sin permiso)`);
    else if (!permisoValido(permiso)) faltan.push(`${ruta.method} ${ruta.path} (permiso invalido ${permiso})`);
  }
  assert.deepEqual(faltan, []);
});

test("backend: sin token, toda ruta protegida responde 401", async () => {
  const fallas = [];
  for (const ruta of protegidas().filter(sinParametros)) {
    if (ruta.method !== "GET") continue;
    const { status } = await pedir(ruta.path);
    if (status !== 401) fallas.push(`${ruta.method} ${ruta.path} -> ${status}`);
  }
  assert.deepEqual(fallas, []);
});

for (const rol of Object.keys(CUENTAS)) {
  test(`backend (HTTP real): ${rol} recibe 403 en las rutas GET cuyo permiso no tiene y nunca 401 en las que si tiene`, async () => {
    const token = await tokenDe(rol);
    const propios = new Set(permissionsForRole(rol));
    const fallas = [];
    for (const ruta of protegidas().filter((r) => r.method === "GET" && sinParametros(r))) {
      const permiso = permisoDe(ruta);
      if (!permiso) continue;
      const { status } = await pedir(ruta.path, { token });
      if (!propios.has(permiso) && status !== 403) fallas.push(`SIN permiso ${permiso}: ${ruta.path} -> ${status} (esperado 403)`);
      if (propios.has(permiso) && status === 401) fallas.push(`CON permiso ${permiso}: ${ruta.path} -> 401`);
      if (propios.has(permiso) && (rol === "admin" || rol === "director") && status === 403) fallas.push(`${rol} CON permiso ${permiso}: ${ruta.path} -> 403`);
    }
    assert.deepEqual(fallas, []);
  });
}

test("backend: el catalogo de cada rol del personal no incluye permisos del portal del alumno", () => {
  for (const rol of Object.keys(CUENTAS)) {
    const indebidos = permissionsForRole(rol).filter((p) => PORTAL.includes(p));
    assert.deepEqual(indebidos, [], `${rol} tiene permisos de portal`);
  }
});

test("backend (HTTP real): informes de Direccion — el personal lee, solo Direccion emite y borra", async () => {
  for (const rol of Object.keys(CUENTAS)) {
    const token = await tokenDe(rol);
    assert.equal((await pedir("/api/v1/informes-direccion", { token })).status, 200, `${rol} lee`);
    const emitir = await pedir("/api/v1/informes-direccion", { metodo: "POST", token, cuerpo: {} });
    const borrar = await pedir("/api/v1/informes-direccion/x", { metodo: "DELETE", token });
    if (rol === "admin" || rol === "director") {
      assert.notEqual(emitir.status, 403, `${rol} emite`);
    } else {
      assert.equal(emitir.status, 403, `${rol} no debe emitir`);
      assert.equal(borrar.status, 403, `${rol} no debe borrar`);
    }
  }
});

/* ------------------------------ 4. Alumno ---------------------------------- */

test("alumno: su catalogo es solo de portal y ninguna ruta del personal se lo concede", () => {
  const permisos = permissionsForRole(ROLES.ALUMNO);
  assert.ok(permisos.length > 0);
  assert.deepEqual(permisos.filter((p) => !PORTAL.includes(p)), []);

  const abiertas = protegidas()
    .filter((r) => !r.path.startsWith("/api/v1/alumno/"))
    .filter((r) => { const p = permisoDe(r); return p && permisos.includes(p); })
    .map((r) => `${r.method} ${r.path}`);
  assert.deepEqual(abiertas, [], "el alumno alcanzaria rutas que no son del portal");
});

test("alumno: toda ruta /api/v1/alumno/* exige un permiso de portal; ningun rol del personal los tiene", () => {
  const rutas = apiRoutes.filter((r) => r.path.startsWith("/api/v1/alumno/"));
  assert.ok(rutas.length >= 10, "faltan rutas del portal");
  for (const ruta of rutas) assert.ok(PORTAL.includes(permisoDe(ruta)), `${ruta.method} ${ruta.path} -> ${permisoDe(ruta)}`);
  for (const rol of Object.values(ROLES).filter((r) => r !== ROLES.ALUMNO)) {
    assert.deepEqual((ROLE_PERMISSIONS[rol] ?? []).filter((p) => PORTAL.includes(p)), [], rol);
  }
});

test("alumno (HTTP real): el personal recibe 403 en el portal del alumno", async () => {
  for (const rol of Object.keys(CUENTAS)) {
    const token = await tokenDe(rol);
    for (const seccion of ["cuenta", "perfil", "boletin", "asistencias", "situacion-academica", "previas"]) {
      const { status } = await pedir(`/api/v1/alumno/${seccion}`, { token });
      assert.equal(status, 403, `${rol} -> /alumno/${seccion}`);
    }
  }
});

/* ------------------------------ 2. Web ------------------------------------- */

/* Carga la tabla de rutas real (app/rutas.js) sin arrastrar React ni las pantallas:
   los imports de vistas se reemplazan por stubs y solo se conservan los de logica
   pura (utils/permisos.js). Asi el test no depende de que el navegador exista. */
async function cargarWeb() {
  try {
    const url = (ruta) => pathToFileURL(join(WEB, ruta)).href;
    let fuente = readFileSync(join(WEB, "app/rutas.js"), "utf8");
    fuente = fuente.replace(/^import\s+([\s\S]*?)\s+from\s+"([^"]+)";?$/gm, (_todo, nombres, origen) => {
      if (origen === "../utils/permisos.js") return `import ${nombres} from "${url("utils/permisos.js")}";`;
      const locales = [];
      const llaves = /\{([^}]*)\}/.exec(nombres);
      if (llaves) locales.push(...llaves[1].split(",").map((n) => n.trim().split(/\s+as\s+/).pop()).filter(Boolean));
      const porDefecto = nombres.replace(/\{[^}]*\}/, "").replace(/,/g, "").trim();
      if (porDefecto) locales.push(porDefecto);
      return locales.map((n) => `const ${n} = (..._a) => null;`).join("\n");
    });
    const dir = mkdtempSync(join(tmpdir(), "rutas-"));
    const archivo = join(dir, "rutas.mjs");
    writeFileSync(archivo, fuente);
    const { RUTAS } = await import(pathToFileURL(archivo).href);
    const { decidirAcceso, ACCESO } = await import(url("app/navegacion.js"));
    const { armarMenu } = await import(url("layouts/menu.js"));
    return { RUTAS, decidirAcceso, ACCESO, armarMenu };
  } catch (error) {
    return { error };
  }
}

const sesionDe = (rol) => ({ autenticado: true, roles: [{ id: rol }], permisos: permissionsForRole(rol) });

test("web: permisos y roles de la tabla de rutas existen en el backend", async (t) => {
  const web = await cargarWeb();
  assert.ok(!web.error, `no se pudo cargar la tabla de rutas: ${web.error?.message}`);
  const roles = new Set(Object.values(ROLES));
  const malos = [];
  for (const ruta of web.RUTAS) {
    for (const p of ruta.permisos ?? []) if (!permisoValido(p)) malos.push(`${ruta.patron}: permiso ${p}`);
    for (const r of ruta.roles ?? []) {
      if (roles.has(r)) continue;
      /* "secretaria" es un alias heredado: inocuo mientras la ruta liste tambien el codigo real. */
      if (r === "secretaria" && (ruta.roles ?? []).includes("secretario")) continue;
      malos.push(`${ruta.patron}: rol ${r}`);
    }
  }
  assert.deepEqual(malos, []);
});

test("web: cada rol del personal ve en el menu solo lo que su sesion puede abrir, y el portal no aparece", async (t) => {
  const web = await cargarWeb();
  assert.ok(!web.error, `no se pudo cargar la tabla de rutas: ${web.error?.message}`);
  for (const rol of Object.keys(CUENTAS)) {
    const sesion = sesionDe(rol);
    const menu = web.armarMenu(web.RUTAS, sesion);
    const hrefs = menu.flatMap((s) => s.entradas.map((e) => e.href));
    assert.ok(hrefs.length > 0, `${rol} sin menu`);
    for (const href of hrefs) {
      const ruta = web.RUTAS.find((r) => r.patron === href);
      assert.equal(web.decidirAcceso({ ruta }, sesion).tipo, web.ACCESO.permitido, `${rol} ve ${href} pero no puede abrirlo`);
      assert.ok(!ruta.portalAlumno, `${rol} ve la ruta del portal ${href}`);
      for (const p of ruta.permisos ?? []) void p; // permisos ya validados arriba
    }
  }
});

test("web: el personal no abre rutas del portal y el alumno no abre rutas del personal", async (t) => {
  const web = await cargarWeb();
  assert.ok(!web.error, `no se pudo cargar la tabla de rutas: ${web.error?.message}`);
  const portal = web.RUTAS.filter((r) => r.portalAlumno);
  const personal = web.RUTAS.filter((r) => !r.portalAlumno && !r.publica);
  assert.ok(portal.length >= 5);
  for (const rol of Object.keys(CUENTAS)) {
    for (const ruta of portal) assert.notEqual(web.decidirAcceso({ ruta }, sesionDe(rol)).tipo, web.ACCESO.permitido, `${rol} abre ${ruta.patron}`);
  }
  const alumno = sesionDe(ROLES.ALUMNO);
  const filtradas = personal.filter((r) => web.decidirAcceso({ ruta: r }, alumno).tipo === web.ACCESO.permitido).map((r) => r.patron);
  /* Rutas sin rol ni permiso (p. ej. inicio) son comunes a toda sesion. */
  const exigentes = filtradas.filter((p) => { const r = web.RUTAS.find((x) => x.patron === p); return (r.permisos?.length ?? 0) > 0 || (r.roles?.length ?? 0) > 0; });
  assert.deepEqual(exigentes, [], "el alumno abre pantallas del personal");
});

test("web: cada permiso de una pantalla esta concedido a algun rol (no hay pantallas inalcanzables)", async (t) => {
  const web = await cargarWeb();
  assert.ok(!web.error, `no se pudo cargar la tabla de rutas: ${web.error?.message}`);
  const inalcanzables = [];
  for (const ruta of web.RUTAS.filter((r) => !r.publica)) {
    const alguien = Object.values(ROLES).some((rol) => web.decidirAcceso({ ruta }, sesionDe(rol)).tipo === web.ACCESO.permitido);
    if (!alguien) inalcanzables.push(ruta.patron);
  }
  assert.deepEqual(inalcanzables, []);
});

/* ------------------------------ 3. Mobile ---------------------------------- */

function archivosJs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivosJs(join(dir, e.name)) : /\.js$/.test(e.name) ? [join(dir, e.name)] : []));
}

function llamadasMobile() {
  const servicios = join(MOBILE, "services");
  const encontradas = [];
  for (const archivo of archivosJs(servicios)) {
    const codigo = readFileSync(archivo, "utf8");
    const base = /const BASE = "([^"]+)"/.exec(codigo)?.[1] ?? "";
    for (const m of codigo.matchAll(/pedir\(\s*(?:conAnio\(\s*)?`\$\{BASE\}([^`?]*)`/g)) {
      const resto = codigo.slice(m.index);
      const trozo = resto.slice(0, Math.min(...[resto.indexOf("\nexport"), resto.indexOf("\nconst "), resto.length].filter((n) => n > 0)));
      const metodo = /metodo:\s*"([A-Z]+)"/.exec(trozo)?.[1] ?? "GET";
      encontradas.push({ archivo, metodo, ruta: (base + m[1]).replace(/\$\{[^}]+\}/g, "x") });
    }
    for (const m of codigo.matchAll(/const RUTA_\w+ = "([^"]+)"/g)) {
      const nombre = /const (RUTA_\w+) = "/.exec(m[0])[1];
      const metodo = nombre === "RUTA_ME" ? "GET" : "POST";
      encontradas.push({ archivo, metodo, ruta: m[1] });
    }
  }
  return encontradas;
}

test("mobile: solo usa endpoints del alumno y de autenticacion, y todos existen en el backend con el mismo metodo", (t) => {
  if (!existsSync(join(MOBILE, "services"))) return t.skip("Frontend/mobile no esta en el arbol");
  const llamadas = llamadasMobile();
  assert.ok(llamadas.length >= 10, `se esperaban >=10 llamadas, hay ${llamadas.length}`);
  const fuera = llamadas.filter((l) => !l.ruta.startsWith("/api/v1/alumno") && !l.ruta.startsWith("/api/v1/auth/"));
  assert.deepEqual(fuera.map((l) => l.ruta), [], "la app del alumno llama a rutas del personal");

  const inexistentes = [];
  for (const l of llamadas) {
    const patrones = apiRoutes.filter((r) => r.method === l.metodo);
    const ok = patrones.some((r) => {
      const a = r.path.split("/").filter(Boolean), b = l.ruta.split("/").filter(Boolean);
      return a.length === b.length && a.every((seg, i) => seg.startsWith(":") || seg === b[i]);
    });
    if (!ok) inexistentes.push(`${l.metodo} ${l.ruta}`);
  }
  assert.deepEqual(inexistentes, []);
});

test("mobile: cada endpoint del portal que usa exige permisos de portal en el backend", (t) => {
  if (!existsSync(join(MOBILE, "services"))) return t.skip("Frontend/mobile no esta en el arbol");
  for (const l of llamadasMobile().filter((x) => x.ruta.startsWith("/api/v1/alumno"))) {
    const ruta = apiRoutes.find((r) => r.method === l.metodo && (() => { const a = r.path.split("/"), b = l.ruta.split("/"); return a.length === b.length && a.every((s, i) => s.startsWith(":") || s === b[i]); })());
    assert.ok(ruta, `${l.metodo} ${l.ruta}`);
    assert.ok(PORTAL.includes(permisoDe(ruta)), `${l.metodo} ${l.ruta} exige ${permisoDe(ruta)}`);
  }
});

test("mobile: la app cierra el acceso a cuentas que no son de alumno", (t) => {
  const app = join(MOBILE, "app/App.js");
  if (!existsSync(app)) return t.skip("App.js no esta en el arbol");
  const codigo = readFileSync(app, "utf8");
  assert.match(codigo, /esAlumno\(sesion\.roles\)/, "App.js debe comprobar el rol alumno");
  assert.match(codigo, /SoloAlumnos/, "App.js debe mostrar la pantalla de acceso restringido");
});
