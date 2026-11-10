/* Ingreso con biometria (Face ID / huella / reconocimiento facial).

   Que hace: protege la SESION YA INICIADA. Cuando esta activado, al abrir la app
   (o volver tras un rato en segundo plano) se pide la biometria del dispositivo
   antes de mostrar nada. No se guarda la contrasena: se reutiliza la sesion que
   ya esta en el almacen seguro, y el Backend la sigue validando en cada pedido.
   Si la sesion vencio o la biometria falla, se entra con usuario y contrasena.

   Logica pura con un adaptador inyectable (ver adaptador-biometria.js), asi se
   prueba en Node sin el modulo nativo. */

import { borrarSeguro, escribirSeguro, leerSeguro } from "./secure-store.js";

const CLAVE_BIOMETRIA = "prece.biometria";

/* Segundos en segundo plano a partir de los cuales se vuelve a pedir. */
export const SEGUNDOS_PARA_BLOQUEAR = 30;

/* Tipos del adaptador (mismos valores que expo-local-authentication). */
export const TIPO_HUELLA = 1;
export const TIPO_FACIAL = 2;
export const TIPO_IRIS = 3;

let adaptador = null;

export function configurarBiometria(impl) {
  adaptador = impl || null;
}

/* Nombre que se le muestra a la persona segun lo que tiene el equipo. */
export function nombreBiometria(tipos = [], plataforma = "android") {
  const ios = plataforma === "ios";
  if (tipos.includes(TIPO_FACIAL)) return ios ? "Face ID" : "reconocimiento facial";
  if (tipos.includes(TIPO_HUELLA)) return ios ? "Touch ID" : "huella digital";
  if (tipos.includes(TIPO_IRIS)) return "reconocimiento de iris";
  return "biometría";
}

/* { disponible, nombre }: disponible solo si hay sensor Y hay algo enrolado. */
export async function estadoBiometria(plataforma = "android") {
  if (!adaptador) return { disponible: false, nombre: nombreBiometria([], plataforma) };

  try {
    const [hardware, enrolada, tipos] = await Promise.all([
      adaptador.hayHardware(),
      adaptador.hayEnrolada(),
      adaptador.tipos()
    ]);
    return { disponible: Boolean(hardware && enrolada), nombre: nombreBiometria(tipos ?? [], plataforma) };
  } catch {
    return { disponible: false, nombre: nombreBiometria([], plataforma) };
  }
}

/* Pide la biometria. Nunca lanza: devuelve { ok, cancelada }. */
export async function pedirBiometria(mensaje = "Confirmá tu identidad") {
  if (!adaptador) return { ok: false, cancelada: false };

  try {
    const resultado = await adaptador.autenticar(mensaje);
    if (resultado?.success) return { ok: true, cancelada: false };
    const cancelada = ["user_cancel", "system_cancel", "app_cancel", "user_fallback"].includes(resultado?.error);
    return { ok: false, cancelada };
  } catch {
    return { ok: false, cancelada: false };
  }
}

export async function biometriaActivada() {
  try {
    return (await leerSeguro(CLAVE_BIOMETRIA)) === "1";
  } catch {
    return false;
  }
}

/* Solo se activa si la persona se autentica en ese momento. */
export async function activarBiometria(plataforma = "android") {
  const estado = await estadoBiometria(plataforma);
  if (!estado.disponible) return { ok: false, motivo: "no-disponible" };

  const resultado = await pedirBiometria(`Activá el ingreso con ${estado.nombre}`);
  if (!resultado.ok) return { ok: false, motivo: resultado.cancelada ? "cancelada" : "fallida" };

  await escribirSeguro(CLAVE_BIOMETRIA, "1");
  return { ok: true };
}

export async function desactivarBiometria() {
  try {
    await borrarSeguro(CLAVE_BIOMETRIA);
  } catch {
    /* Sin almacen no hay nada que borrar. */
  }
}

/* Vuelve a pedirla solo si estaba activada y paso suficiente tiempo afuera. */
export function debeBloquear({ activada, segundosEnSegundoPlano, umbral = SEGUNDOS_PARA_BLOQUEAR }) {
  return Boolean(activada) && Number(segundosEnSegundoPlano) >= umbral;
}
