/* Tests del portal del alumno en Mobile: reglas de presentacion y servicios.
   Replican el contrato real de Backend/modules/student-portal. */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { BASE_URL } from "../src/config/env.js";
import { configurarPeticion } from "../src/services/api.js";
import {
  cambiarPassword,
  obtenerAsistencias,
  obtenerBoletin,
  obtenerCuenta
} from "../src/services/alumno-api.js";
import { guardarTokens, leerAccessToken, leerRefreshToken, reiniciarCacheDeTokens } from "../src/services/session-tokens.js";
import { configurarAlmacenamientoSeguro, crearAlmacenamientoEnMemoria } from "../src/services/secure-store.js";
import {
  anioValido,
  contarAprobadas,
  esAlumno,
  fechaCorta,
  filtrarAsistencias,
  filtrarSituacion,
  requisitosPassword,
  textoTaller,
  tonoDeEstado,
  validarCambioDePassword,
  validarUsuario
} from "../src/utils/alumno-reglas.js";

let llamadas;

function crearPeticion(rutas) {
  return async function peticion(url, opciones = {}) {
    const ruta = url.startsWith(BASE_URL) ? url.slice(BASE_URL.length) : url;
    llamadas.push({ ruta, metodo: opciones.method, cabeceras: opciones.headers || {}, cuerpo: opciones.body });
    const regla = rutas[ruta];

    if (!regla) {
      throw new Error(`Ruta no esperada en el test: ${ruta}`);
    }

    return {
      ok: regla.estado >= 200 && regla.estado < 300,
      status: regla.estado,
      async text() {
        return regla.body === undefined ? "" : JSON.stringify(regla.body);
      }
    };
  };
}

beforeEach(async () => {
  llamadas = [];
  configurarAlmacenamientoSeguro(crearAlmacenamientoEnMemoria());
  reiniciarCacheDeTokens();
  await guardarTokens({ accessToken: "acc_1", refreshToken: "ref_1" });
});

afterEach(() => configurarPeticion(null));

describe("reglas del alumno", () => {
  it("reconoce el rol alumno y rechaza el resto", () => {
    assert.equal(esAlumno(["alumno"]), true);
    assert.equal(esAlumno(["preceptor"]), false);
    assert.equal(esAlumno(undefined), false);
  });

  it("requisitos de contrasena iguales a los del Backend", () => {
    const mal = requisitosPassword("40123456", { dni: "40123456", usuario: "ana" });
    assert.equal(mal.find((r) => r.clave === "mezcla").cumple, false);
    assert.equal(mal.find((r) => r.clave === "dni").cumple, false);

    const bien = requisitosPassword("Escuela2026", { dni: "40123456", usuario: "ana" });
    assert.ok(bien.every((r) => r.cumple));

    assert.equal(requisitosPassword("ana12345", { usuario: "ANA12345" }).find((r) => r.clave === "usuario").cumple, false);
  });

  it("valida el usuario propio", () => {
    assert.equal(validarUsuario("ana.perez", { dni: "40123456" }), null);
    assert.equal(validarUsuario("ana.perez@alumno.prece.local", { dni: "40123456" }), null);
    assert.ok(validarUsuario("ab"));
    assert.ok(validarUsuario("ana perez"));
    assert.ok(validarUsuario("99999999", { dni: "40123456" }));
    assert.equal(validarUsuario("40123456", { dni: "40123456" }), null);
  });

  it("valida el formulario de cambio de contrasena", () => {
    const base = { passwordActual: "40123456", passwordNueva: "Escuela2026", confirmacion: "Escuela2026" };
    assert.equal(validarCambioDePassword(base, { dni: "40123456" }), null);
    assert.ok(validarCambioDePassword({ ...base, confirmacion: "otra" }).confirmacion);
    assert.ok(validarCambioDePassword({ ...base, passwordActual: "" }).passwordActual);
    assert.ok(validarCambioDePassword({ ...base, passwordNueva: "corta1", confirmacion: "corta1" }).passwordNueva);
    assert.ok(validarCambioDePassword({ passwordActual: "Escuela2026", passwordNueva: "Escuela2026", confirmacion: "Escuela2026" }).passwordNueva);
  });

  it("formatea fechas sin correr el dia", () => {
    assert.equal(fechaCorta("2026-03-14"), "14/03/2026");
    assert.equal(fechaCorta("2026-03-14T00:00:00.000Z"), "14/03/2026");
    assert.equal(fechaCorta(null), "—");
  });

  it("solo acepta ciclos lectivos enteros", () => {
    assert.equal(anioValido(2026), true);
    assert.equal(anioValido("2025"), true);
    assert.equal(anioValido("2026; drop"), false);
    assert.equal(anioValido(20.5), false);
    assert.equal(anioValido(1800), false);
  });

  it("filtra asistencias, situacion y cuenta aprobadas", () => {
    const detalle = [{ tipo: "ausente" }, { tipo: "tarde" }];
    assert.equal(filtrarAsistencias(detalle, "tarde").length, 1);
    assert.equal(filtrarAsistencias(detalle).length, 2);

    const filas = [{ estado: "tep" }, { estado: "aprobada" }, { estado: "pendiente" }];
    assert.equal(filtrarSituacion(filas, true).length, 2);
    assert.equal(filtrarSituacion(filas, false).length, 3);

    assert.equal(contarAprobadas([{ estadoActual: "aprobada" }, { estadoActual: "tep" }]), 1);
    assert.equal(tonoDeEstado("tep"), "alerta");
    assert.equal(tonoDeEstado("desconocido"), "neutro");
    assert.equal(textoTaller(null), "No corresponde");
    assert.equal(textoTaller({ taller: "Electrónica", grupo: "B" }), "Electrónica · Grupo B");
  });
});

describe("servicios del alumno", () => {
  it("consulta la cuenta con Bearer y sin id de alumno", async () => {
    configurarPeticion(
      crearPeticion({
        "/api/v1/alumno/cuenta": { estado: 200, body: { data: { usuario: "ana.perez@alumno.prece.local", debeCambiarPassword: false } } }
      })
    );

    const cuenta = await obtenerCuenta();

    assert.equal(cuenta.debeCambiarPassword, false);
    assert.equal(llamadas[0].cabeceras.Authorization, "Bearer acc_1");
    assert.equal(llamadas[0].metodo, "GET");
  });

  it("arma la query del ciclo y rechaza anios invalidos antes de llamar", async () => {
    configurarPeticion(
      crearPeticion({
        "/api/v1/alumno/boletin?anio=2025": { estado: 200, body: { data: { materias: [] } } },
        "/api/v1/alumno/asistencias": { estado: 200, body: { data: { detalle: [] } } }
      })
    );

    await obtenerBoletin(2025);
    await obtenerAsistencias();
    assert.equal(llamadas.length, 2);
    await assert.rejects(() => obtenerBoletin("2025&x=1"), RangeError);
    assert.equal(llamadas.length, 2);
  });

  it("al cambiar la contrasena guarda los tokens nuevos y no los devuelve", async () => {
    configurarPeticion(
      crearPeticion({
        "/api/v1/alumno/cuenta/password": {
          estado: 200,
          body: { data: { usuario: "ana", debeCambiarPassword: false, sesion: { accessToken: "acc_2", refreshToken: "ref_2" } } }
        }
      })
    );

    const cuenta = await cambiarPassword({ passwordActual: "a", passwordNueva: "b", confirmacion: "b" });

    assert.equal(leerAccessToken(), "acc_2");
    assert.equal(leerRefreshToken(), "ref_2");
    assert.equal("sesion" in cuenta, false);
    assert.equal(JSON.stringify(cuenta).includes("acc_2"), false);
  });

  it("muestra el aviso de cambio obligatorio como error de API", async () => {
    configurarPeticion(
      crearPeticion({
        "/api/v1/alumno/perfil": {
          estado: 403,
          body: { error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Antes de ver tu información tenés que cambiar la contraseña inicial." } }
        }
      })
    );

    const { obtenerPerfil } = await import("../src/services/alumno-api.js");
    await assert.rejects(() => obtenerPerfil(), (fallo) => fallo.codigo === "PASSWORD_CHANGE_REQUIRED" && fallo.estado === 403);
  });
});

describe("configuracion segura", () => {
  it("solo considera segura una URL https", async () => {
    const { esUrlSegura } = await import("../src/config/env.js");
    assert.equal(esUrlSegura("https://api.escuela.edu.ar"), true);
    assert.equal(esUrlSegura("http://192.168.0.15:3000"), false);
    assert.equal(esUrlSegura(undefined), false);
  });
});

describe("direccion de la API", () => {
  it("permite apuntar al Backend de la PC y rechaza URLs invalidas", async () => {
    const { baseUrlActual, configurarBaseUrl, endpoint, BASE_URL } = await import("../src/config/env.js");

    configurarBaseUrl("http://192.168.0.15:3000/");
    assert.equal(baseUrlActual(), "http://192.168.0.15:3000");
    assert.equal(endpoint("/api/v1/auth/login"), "http://192.168.0.15:3000/api/v1/auth/login");
    assert.throws(() => configurarBaseUrl("javascript:alert(1)"));
    assert.throws(() => configurarBaseUrl("192.168.0.15:3000"));

    configurarBaseUrl(BASE_URL);
  });
});

describe("tiempo limite del cliente HTTP", () => {
  it("no aborta al instante: una respuesta rapida llega aunque fetch respete la senal", async () => {
    configurarPeticion(async (url, opciones) => {
      assert.ok(opciones.signal, "debe recibir una senal de aborto");
      assert.equal(opciones.signal.aborted, false);
      assert.equal("tiempoLimiteMs" in opciones, false, "el limite no se pasa a fetch");
      await new Promise((resolver) => setTimeout(resolver, 20));
      assert.equal(opciones.signal.aborted, false);
      return { ok: true, status: 200, async text() { return JSON.stringify({ data: { ok: 1 } }); } };
    });

    assert.deepEqual(await obtenerCuenta(), { ok: 1 });
  });

  it("aborta cuando se agota el tiempo limite y informa TIMEOUT", async () => {
    const { pedir } = await import("../src/services/api.js");
    configurarPeticion((url, opciones) =>
      new Promise((resolver, rechazar) => {
        opciones.signal.addEventListener("abort", () => rechazar(Object.assign(new Error("abortado"), { name: "AbortError" })));
      })
    );

    await assert.rejects(() => pedir("/api/v1/alumno/cuenta", { tiempoLimiteMs: 30 }), (fallo) => fallo.codigo === "TIMEOUT");
  });
});
