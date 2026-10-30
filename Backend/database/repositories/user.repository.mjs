import { getStore } from "../memory-store.mjs";

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
      /* Las cuentas de alumno no tienen correo: se identifican por `username`. */
      email: user.email ? user.email.toLowerCase() : null,
      username: user.username ? user.username.toLowerCase() : null,
      studentId: user.studentId ?? null,
      passwordHash: user.passwordHash,
      mustChangePassword: user.mustChangePassword ?? false,
      passwordChangedAt: user.passwordChangedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      displayName: user.displayName,
      nombre: user.nombre ?? null,
      apellido: user.apellido ?? null,
      dni: user.dni ?? null,
      telefono: user.telefono ?? null,
      cargoDocente: user.cargoDocente ?? null,
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
    if (!email) {
      return null;
    }

    const normalized = String(email).toLowerCase();

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

  /* Cuenta de alumno por nombre de usuario (sin distinguir mayusculas). */
  findByUsername(username, { includeInactive = false } = {}) {
    const normalized = String(username ?? "").trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    for (const user of getStore().users.values()) {
      if (user.username === normalized) {
        return !includeInactive && !user.isActive ? null : cloneUser(user);
      }
    }

    return null;
  },

  /* Cuenta vinculada a un legajo de alumno: a lo sumo una por alumno. */
  findByStudentId(studentId, { includeInactive = false } = {}) {
    if (!studentId) {
      return null;
    }

    for (const user of getStore().users.values()) {
      if (user.studentId === studentId) {
        return !includeInactive && !user.isActive ? null : cloneUser(user);
      }
    }

    return null;
  },

  list({ includeInactive = false } = {}) {
    return [...getStore().users.values()]
      .filter((user) => includeInactive || user.isActive)
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

    if (cambios.username) {
      user.username = cambios.username.toLowerCase();
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
      email: user.email ?? null,
      username: user.username ?? null,
      studentId: user.studentId ?? null,
      /* Nunca se expone el hash: solo si la cuenta todavia debe cambiar la clave inicial. */
      debeCambiarPassword: Boolean(user.mustChangePassword),
      displayName: user.displayName,
      nombre: user.nombre ?? null,
      apellido: user.apellido ?? null,
      dni: user.dni ?? null,
      telefono: user.telefono ?? null,
      cargoDocente: user.cargoDocente ?? null,
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
