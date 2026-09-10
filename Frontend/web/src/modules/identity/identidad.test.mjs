/* Chequeo de la logica pura del modulo: node --test src */

import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  coincide,
  construirConsulta,
  filtrarUsuarios,
  iniciarSesion,
  listarUsuarios,
  normalizarUsuario,
  obtenerSesion,
  paginar,
  validarUsuario
} from "../../services/identity-api.js";
import { PERMISOS, puede } from "../../utils/permisos.js";

const fetchOriginal = globalThis.fetch;
const windowOriginal = globalThis.window;

function crearStorage() {
  const datos = new Map();

  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave)
  };
}

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  globalThis.window = windowOriginal;
});
const usuarios = [
  normalizarUsuario({
    id: 1,
    nombre: "Ana",
    apellido: "Pérez",
    usuario: "aperez",
    email: "aperez@abc.gob.ar",
    area: "Jefatura de Area",
    roles: [{ id: "area-lead", nombre: "Jefatura de area" }],
    activo: 1
  }),
  normalizarUsuario({
    id: 2,
    nombre: "Diego",
    apellido: "Molina",
    username: "dmolina",
    correo: "dmolina@abc.gob.ar",
    sector: "Preceptoria",
    roles: ["preceptor"],
    estado: "Suspendido"
  })
];

test("construirConsulta omite filtros vacios y siempre pagina", () => {
  assert.equal(construirConsulta({}), "page=1&pageSize=10");
  assert.equal(
    construirConsulta({ q: "  perez  ", rol: "teacher", estado: "activo", pagina: 3, porPagina: 25 }),
    "q=perez&rol=teacher&estado=activo&page=3&pageSize=25"
  );
});

test("la busqueda cubre nombre, apellido, usuario, email e ID", () => {
  assert.ok(coincide(usuarios[0], "ana"));
  assert.ok(coincide(usuarios[0], "perez"), "debe ignorar acentos");
  assert.ok(coincide(usuarios[0], "APEREZ@ABC"));
  assert.ok(coincide(usuarios[1], "2"));
  assert.ok(coincide(usuarios[1], ""), "sin texto no filtra");
  assert.ok(!coincide(usuarios[1], "ana"));
});

test("los filtros se combinan con la busqueda", () => {
  assert.equal(filtrarUsuarios(usuarios, { estado: "activo" }).length, 1);
  assert.equal(filtrarUsuarios(usuarios, { rol: "preceptor" })[0].id, 2);
  assert.equal(filtrarUsuarios(usuarios, { area: "Preceptoria", estado: "activo" }).length, 0);
  assert.equal(filtrarUsuarios(usuarios, { q: "molina", rol: "preceptor" }).length, 1);
});

test("paginar acota la pagina pedida", () => {
  assert.deepEqual(paginar(usuarios, 9, 1), { items: [usuarios[1]], total: 2, paginas: 2, pagina: 2 });
});

test("normalizarUsuario descarta campos sensibles y unifica alias", () => {
  const usuario = normalizarUsuario({
    id: 7,
    first_name: "Sofia",
    last_name: "Ramirez",
    username: "sramirez",
    password_hash: "$2b$10$secreto",
    token: "eyJhbGciOi",
    api_key: "clave",
    active: false,
    last_login_at: "2026-09-01T10:00:00"
  });

  assert.deepEqual(Object.keys(usuario).sort(), [
    "actualizadoEn",
    "apellido",
    "area",
    "creadoEn",
    "dni",
    "email",
    "estado",
    "id",
    "nombre",
    "roles",
    "telefono",
    "ultimoAcceso",
    "usuario"
  ]);
  assert.equal(usuario.nombre, "Sofia");
  assert.equal(usuario.estado, "inactivo");
  assert.equal(usuario.ultimoAcceso, "2026-09-01T10:00:00");
});

test("puede no autoriza sin permiso explicito", () => {
  assert.ok(puede({ permisos: ["*"] }, PERMISOS.usuariosEditar));
  assert.ok(puede({ permisos: [PERMISOS.usuariosLeer] }, PERMISOS.usuariosLeer));
  assert.ok(!puede({ permisos: [PERMISOS.usuariosLeer] }, PERMISOS.usuariosEditar));
  assert.ok(!puede(null, PERMISOS.usuariosLeer));
});

test("listarUsuarios degrada a demo cuando el endpoint no existe", async () => {
  const resultado = await listarUsuarios({ q: "gimenez" });

  assert.equal(resultado.origen, "demo");
  assert.equal(resultado.total, 1);
  assert.equal(resultado.items[0].usuario, "lgimenez");
});

test("validarUsuario exige los campos obligatorios y valida formatos", () => {
  const errores = validarUsuario({ email: "sin-arroba", dni: "12.345.678" }, { esAlta: true });

  assert.deepEqual(Object.keys(errores).sort(), ["apellido", "dni", "email", "nombre", "roles"]);
  assert.match(errores.dni, /7 y 9/);

  assert.equal(
    validarUsuario({
      nombre: "Ana",
      apellido: "Perez",
      email: "aperez@abc.gob.ar",
      dni: "30111222",
      roles: ["teacher"]
    }, { esAlta: true }),
    null
  );
});

test("fuera del alta el rol no es obligatorio y el telefono se valida solo si viene", () => {
  const base = { nombre: "Ana", apellido: "Perez", email: "a@b.gob.ar", dni: "30111222" };

  assert.equal(validarUsuario(base), null);
  assert.equal(validarUsuario({ ...base, telefono: "+54 221 555-0000" }), null);
  assert.match(validarUsuario({ ...base, telefono: "no-es-telefono" }).telefono, /telefono/i);
});

test("obtenerSesion queda anonima cuando no hay token guardado", async () => {
  globalThis.window = { localStorage: crearStorage() };

  const resultado = await obtenerSesion();

  assert.equal(resultado.origen, "anonima");
  assert.equal(resultado.data, null);
});

test("iniciarSesion llama al backend, guarda tokens y normaliza la sesion", async () => {
  const storage = crearStorage();
  globalThis.window = { localStorage: storage };
  globalThis.fetch = async (url, opciones) => {
    assert.equal(String(url), "http://localhost:3000/api/v1/auth/login");
    assert.equal(opciones.method, "POST");
    assert.deepEqual(JSON.parse(opciones.body), {
      email: "admin@prece.local",
      password: "Admin123!"
    });

    return {
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: "access.demo",
        refreshToken: "refresh.demo",
        user: {
          id: "usr_1",
          email: "admin@prece.local",
          displayName: "Administrador General",
          assignments: [{ role: "admin", schoolId: "esc-1" }]
        },
        roles: ["admin"],
        permisos: ["*"],
        alcances: ["schoolId"]
      })
    };
  };

  const resultado = await iniciarSesion({ email: "admin@prece.local", password: "Admin123!" });

  assert.equal(storage.getItem("prece.token"), "access.demo");
  assert.equal(storage.getItem("prece.refreshToken"), "refresh.demo");
  assert.equal(resultado.origen, "api");
  assert.equal(resultado.data.usuario.email, "admin@prece.local");
  assert.deepEqual(resultado.data.usuario.roles.map((rol) => rol.id), ["admin"]);
  assert.deepEqual(resultado.data.permisos, ["*"]);
});