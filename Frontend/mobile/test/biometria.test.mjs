/* Biometria: activacion, nombre segun el equipo y regla de re-bloqueo. */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  TIPO_FACIAL,
  TIPO_HUELLA,
  activarBiometria,
  biometriaActivada,
  configurarBiometria,
  debeBloquear,
  desactivarBiometria,
  estadoBiometria,
  nombreBiometria,
  pedirBiometria
} from "../src/services/biometria.js";
import { configurarAlmacenamientoSeguro, crearAlmacenamientoEnMemoria } from "../src/services/secure-store.js";

function adaptador({ hardware = true, enrolada = true, tipos = [TIPO_FACIAL], resultado = { success: true } } = {}) {
  return { hayHardware: async () => hardware, hayEnrolada: async () => enrolada, tipos: async () => tipos, autenticar: async () => resultado };
}

beforeEach(() => {
  configurarAlmacenamientoSeguro(crearAlmacenamientoEnMemoria());
  configurarBiometria(null);
});

describe("nombre", () => {
  it("Face ID en iPhone, reconocimiento facial en Android", () => {
    assert.equal(nombreBiometria([TIPO_FACIAL], "ios"), "Face ID");
    assert.equal(nombreBiometria([TIPO_FACIAL], "android"), "reconocimiento facial");
    assert.equal(nombreBiometria([TIPO_HUELLA], "ios"), "Touch ID");
    assert.equal(nombreBiometria([TIPO_HUELLA], "android"), "huella digital");
    assert.equal(nombreBiometria([], "ios"), "biometría");
  });
});

describe("disponibilidad", () => {
  it("sin adaptador (web) no esta disponible", async () => {
    assert.equal((await estadoBiometria("ios")).disponible, false);
  });
  it("exige sensor Y biometria enrolada", async () => {
    configurarBiometria(adaptador({ enrolada: false }));
    assert.equal((await estadoBiometria("ios")).disponible, false);
    configurarBiometria(adaptador({ hardware: false }));
    assert.equal((await estadoBiometria("ios")).disponible, false);
    configurarBiometria(adaptador());
    const estado = await estadoBiometria("ios");
    assert.deepEqual(estado, { disponible: true, nombre: "Face ID" });
  });
  it("si el modulo nativo falla no rompe: queda no disponible", async () => {
    configurarBiometria({ hayHardware: async () => { throw new Error("x"); }, hayEnrolada: async () => true, tipos: async () => [] });
    assert.equal((await estadoBiometria("ios")).disponible, false);
  });
});

describe("activacion", () => {
  it("se activa solo si la persona se autentica", async () => {
    configurarBiometria(adaptador());
    assert.equal(await biometriaActivada(), false);
    assert.deepEqual(await activarBiometria("ios"), { ok: true });
    assert.equal(await biometriaActivada(), true);
  });
  it("si falla o cancela no se activa", async () => {
    configurarBiometria(adaptador({ resultado: { success: false, error: "authentication_failed" } }));
    assert.deepEqual(await activarBiometria("ios"), { ok: false, motivo: "fallida" });
    configurarBiometria(adaptador({ resultado: { success: false, error: "user_cancel" } }));
    assert.deepEqual(await activarBiometria("ios"), { ok: false, motivo: "cancelada" });
    assert.equal(await biometriaActivada(), false);
  });
  it("no se activa si el equipo no la tiene", async () => {
    configurarBiometria(adaptador({ enrolada: false }));
    assert.deepEqual(await activarBiometria("ios"), { ok: false, motivo: "no-disponible" });
    assert.equal(await biometriaActivada(), false);
  });
  it("se puede desactivar", async () => {
    configurarBiometria(adaptador());
    await activarBiometria("ios");
    await desactivarBiometria();
    assert.equal(await biometriaActivada(), false);
  });
  it("pedirBiometria nunca lanza", async () => {
    configurarBiometria({ autenticar: async () => { throw new Error("boom"); } });
    assert.deepEqual(await pedirBiometria(), { ok: false, cancelada: false });
  });
});

describe("re-bloqueo", () => {
  it("solo bloquea si esta activada y paso el umbral", () => {
    assert.equal(debeBloquear({ activada: true, segundosEnSegundoPlano: 31 }), true);
    assert.equal(debeBloquear({ activada: true, segundosEnSegundoPlano: 5 }), false);
    assert.equal(debeBloquear({ activada: false, segundosEnSegundoPlano: 999 }), false);
  });
});
