const store = {
  users: new Map(),
  refreshTokens: new Map(),
  students: new Map(),
  studentsAudit: [],
  loginAttempts: new Map(),
  auditLogs: new Map(),
  errorLogs: new Map(),
  rolePermissions: new Map(),
  devices: new Map(),
  reports: new Map(),
  reportVersions: new Map()
};

export function getStore() {
  return store;
}

export function resetStore() {
  for (const value of Object.values(store)) {
    if (value instanceof Map || value instanceof Set) {
      value.clear();
    } else if (Array.isArray(value)) {
      value.length = 0;
    }
  }
}

/* Ejecuta `fn` de forma atomica sobre los mapas del store: si la operacion
   falla, el estado anterior se restaura. Sirve para que un alta de usuario (o
   un informe) no quede a medias cuando una validacion posterior falla. */
export function transaction(fn) {
  const respaldo = new Map();

  for (const [clave, valor] of Object.entries(store)) {
    if (valor instanceof Map) {
      respaldo.set(clave, new Map(valor));
    }
  }

  try {
    return fn();
  } catch (error) {
    for (const [clave, copia] of respaldo) {
      const actual = store[clave];
      actual.clear();
      for (const [id, registro] of copia) {
        actual.set(id, registro);
      }
    }

    throw error;
  }
}
