import { getStore } from "../memory-store.mjs";
import { nombreArea } from "../../config/areas.config.mjs";

function cloneUser(user) {
  return {
    ...user,
    assignments: user.assignments.map((assignment) => ({ ...assignment }))
  };
}

export const userRepository = {
  nextId() {
    let numero = getStore().users.size + 1;

    while (getStore().users.has(`usr_${numero}`)) {
      numero += 1;
    }

    return `usr_${numero}`;
  },

  create(user) {
    const record = {
      id: user.id ?? this.nextId(),
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      nombre: user.nombre ?? null,
      apellido: user.apellido ?? null,
      dni: user.dni ?? null,
      telefono: user.telefono ?? null,
      area: user.area ?? null,
      materia: user.materia ?? null,
      situacion_revista: user.situacion_revista ?? null,
      suplente_de: user.suplente_de ?? null,
      modulos: user.modulos ?? null,
      hora_desde: user.hora_desde ?? null,
      hora_hasta: user.hora_hasta ?? null,
      dia: user.dia ?? null,
      /* Clave provisoria pendiente de cambio (ver auth.service). */
      debeCambiarClave: user.debeCambiarClave ?? false,
      assignments: user.assignments ?? [],
      isActive: user.isActive ?? true,
      deactivatedAt: user.deactivatedAt ?? null,
      createdAt: user.createdAt ?? new Date().toISOString(),
      updatedAt: user.updatedAt ?? new Date().toISOString()
    };

    getStore().users.set(record.id, record);
    return cloneUser(record);
  },

  findById(id, { includeInactive = false } = {}) {
    const user = getStore().users.get(id);

    if (!user) {
      return null;
    }

    if (!includeInactive && !user.isActive) {
      return null;
    }

    return cloneUser(user);
  },

  findByEmail(email, { includeInactive = false } = {}) {
    const normalized = email.toLowerCase();

    for (const user of getStore().users.values()) {
      if (user.email === normalized) {
        if (!includeInactive && !user.isActive) {
          return null;
        }

        return cloneUser(user);
      }
    }

    return null;
  },

  /* El DNI identifica a la persona: no puede haber dos cuentas con el mismo. */
  findByDni(dni, { includeInactive = true } = {}) {
    const buscado = String(dni ?? "").trim();

    if (!buscado) {
      return null;
    }

    for (const user of getStore().users.values()) {
      if (user.dni === buscado && (includeInactive || user.isActive)) {
        return cloneUser(user);
      }
    }

    return null;
  },

  list({ includeInactive = false, area = null } = {}) {
    return [...getStore().users.values()]
      .filter((user) => includeInactive || user.isActive)
      .filter((user) => !area || user.area === area)
      .map(cloneUser);
  },

  update(id, cambios) {
    const user = getStore().users.get(id);

    if (!user) {
      return null;
    }

    Object.assign(user, cambios, { updatedAt: new Date().toISOString() });

    if (cambios.email) {
      user.email = cambios.email.toLowerCase();
    }

    return cloneUser(user);
  },

  activate(id) {
    return this.update(id, { isActive: true, deactivatedAt: null });
  },

  deactivate(id) {
    const user = getStore().users.get(id);

    if (!user) {
      return null;
    }

    user.isActive = false;
    user.deactivatedAt = new Date().toISOString();
    user.updatedAt = user.deactivatedAt;
    return cloneUser(user);
  },

  publicView(user) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      nombre: user.nombre ?? null,
      apellido: user.apellido ?? null,
      dni: user.dni ?? null,
      telefono: user.telefono ?? null,
      area: user.area ?? null,
      areaNombre: nombreArea(user.area),
      materia: user.materia ?? null,
      situacion_revista: user.situacion_revista ?? null,
      suplente_de: user.suplente_de ?? null,
      modulos: user.modulos ?? null,
      hora_desde: user.hora_desde ?? null,
      hora_hasta: user.hora_hasta ?? null,
      dia: user.dia ?? null,
      debeCambiarClave: Boolean(user.debeCambiarClave),
      roles: [...new Set(user.assignments.map((assignment) => assignment.role))],
      assignments: user.assignments,
      isActive: user.isActive,
      estado: user.isActive ? "activo" : "inactivo",
      deactivatedAt: user.deactivatedAt,
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null
    };
  }
};
