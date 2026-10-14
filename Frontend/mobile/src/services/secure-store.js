/* Persistencia de los tokens de sesion en el almacen seguro del dispositivo.
   La implementacion real usa expo-secure-store (Keychain en iOS y Keystore
   cifrado en Android). Este modulo no importa nada para poder probarse en Node
   y para que la app falle de forma explicita, nunca en silencio con un
   almacenamiento inseguro, si el modulo nativo no esta disponible. */

let origen = null;
let implementacionResuelta = null;

function resolverImplementacion() {
  if (!origen) {
    throw new Error(
      "No hay un almacen seguro configurado. Instala expo-secure-store o inyecta un adaptador antes de usar los tokens."
    );
  }

  if (typeof origen === "function") {
    if (!implementacionResuelta) {
      implementacionResuelta = origen();
    }

    return implementacionResuelta;
  }

  return origen;
}

/* Acepta un objeto { getItemAsync, setItemAsync, deleteItemAsync } o una
   funcion que lo retorne de forma perezosa. */
export function configurarAlmacenamientoSeguro(impl) {
  origen = impl || null;
  implementacionResuelta = null;
}

export function almacenamientoSeguroConfigurado() {
  return Boolean(origen);
}

export function crearAlmacenamientoEnMemoria() {
  const valores = new Map();

  return {
    async getItemAsync(clave) {
      return valores.has(clave) ? valores.get(clave) : null;
    },
    async setItemAsync(clave, valor) {
      valores.set(clave, valor);
    },
    async deleteItemAsync(clave) {
      valores.delete(clave);
    }
  };
}

export function leerSeguro(clave) {
  return resolverImplementacion().getItemAsync(clave);
}

export function escribirSeguro(clave, valor) {
  return resolverImplementacion().setItemAsync(clave, valor);
}

export function borrarSeguro(clave) {
  return resolverImplementacion().deleteItemAsync(clave);
}