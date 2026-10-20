/* Repositorio de dispositivos.

   Cada registro representa una instalacion de la app (un dispositivo fisico)
   asociada a la cuenta del usuario autenticado que la registro. La clave de
   unicidad es `installationId`: una misma instalacion solo puede estar
   presente una vez, y el registro la reasigna si vuelve a registrarse desde
   otra cuenta.

   La persistencia runtime usa memory-store: `store.devices` con init perezoso,
   igual que el resto de los modulos. El modelo relacional objetivo vive en
   database/schema.sql y database/migrations/004_dispositivos.sql.

   Seguridad: el token push se guarda en el record pero nunca sale por el
   repositorio de consulta publica (`vistaPublica` lo reemplaza por
   `hasPushToken`). */

import { getStore } from "../../database/memory-store.mjs";

const devicesRepository = {
  init() {
    const store = getStore();
    if (!store.devices) {
      store.devices = new Map();
    }
  },

  resetData() {
    this.init();
    getStore().devices.clear();
  },

  generateId() {
    return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  },

  create(data) {
    this.init();
    const ahora = new Date().toISOString();
    const record = {
      id: data.id ?? this.generateId(),
      userId: data.userId,
      installationId: data.installationId,
      platform: data.platform,
      pushToken: data.pushToken ?? null,
      isActive: true,
      createdAt: data.createdAt ?? ahora,
      updatedAt: ahora
    };

    getStore().devices.set(record.id, record);
    return { ...record };
  },

  findById(id) {
    this.init();
    const record = getStore().devices.get(id);
    return record ? { ...record } : null;
  },

  findByInstallationId(installationId) {
    this.init();
    for (const record of getStore().devices.values()) {
      if (record.installationId === installationId) {
        return { ...record };
      }
    }
    return null;
  },

  listByUser(userId) {
    this.init();
    return [...getStore().devices.values()]
      .filter((record) => record.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((record) => ({ ...record }));
  },

  /* Solo parchea los campos recibidos: nada de asignacion masiva. Devuelve un
     clon del record modificado. */
  update(id, patch) {
    this.init();
    const record = getStore().devices.get(id);
    if (!record) return null;
    for (const campo of ["platform", "pushToken", "isActive", "userId"]) {
      if (Object.hasOwn(patch, campo)) {
        record[campo] = patch[campo];
      }
    }
    record.updatedAt = new Date().toISOString();
    return { ...record };
  },

  /* Vista para respuestas: nunca expone el token completo. */
  vistaPublica(record) {
    return {
      id: record.id,
      userId: record.userId,
      installationId: record.installationId,
      platform: record.platform,
      isActive: record.isActive,
      hasPushToken: typeof record.pushToken === "string" && record.pushToken.length > 0,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
};

export default devicesRepository;
