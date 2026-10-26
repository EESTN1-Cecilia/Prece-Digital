import { getStore } from "../../database/memory-store.mjs";

function clonar(informe) {
  return {
    ...informe,
    versiones: (informe.versiones ?? []).map((version) => ({ ...version }))
  };
}

export const reportsRepository = {
  nextId() {
    let numero = getStore().reports.size + 1;

    while (getStore().reports.has(`rep_${numero}`)) {
      numero += 1;
    }

    return `rep_${numero}`;
  },

  create(informe) {
    const registro = {
      id: informe.id ?? this.nextId(),
      titulo: informe.titulo ?? "",
      asunto: informe.asunto ?? "",
      dirigidoA: informe.dirigidoA ?? "",
      autor: informe.autor ?? "",
      autorCargo: informe.autorCargo ?? "",
      estado: informe.estado ?? "borrador",
      plantilla: informe.plantilla ?? null,
      contenido: informe.contenido ?? "",
      schoolId: informe.schoolId ?? null,
      creadoPor: informe.creadoPor ?? null,
      creadoEn: informe.creadoEn ?? new Date().toISOString(),
      actualizadoEn: informe.actualizadoEn ?? new Date().toISOString(),
      eliminadoEn: informe.eliminadoEn ?? null,
      versiones: informe.versiones ?? []
    };

    getStore().reports.set(registro.id, registro);
    return clonar(registro);
  },

  findById(id) {
    const informe = getStore().reports.get(id);

    if (!informe) {
      return null;
    }

    return clonar(informe);
  },

  list({ includeDeleted = false } = {}) {
    return [...getStore().reports.values()]
      .filter((informe) => includeDeleted || !informe.eliminadoEn)
      .sort((a, b) => String(b.actualizadoEn).localeCompare(String(a.actualizadoEn)))
      .map(clonar);
  },

  update(id, cambios) {
    const informe = getStore().reports.get(id);

    if (!informe) {
      return null;
    }

    Object.assign(informe, cambios, { actualizadoEn: new Date().toISOString() });
    return clonar(informe);
  },

  softDelete(id) {
    return this.update(id, { eliminadoEn: new Date().toISOString() });
  },

  /* El historial guarda una copia de la version anterior en cada guardado. */
  agregarVersion(id, version) {
    const informe = getStore().reports.get(id);

    if (!informe) {
      return null;
    }

    informe.versiones = [...(informe.versiones ?? []), { ...version }].slice(-20);
    return clonar(informe);
  },

  restaurarVersion(id, indice) {
    const informe = getStore().reports.get(id);

    if (!informe) {
      return null;
    }

    const version = (informe.versiones ?? [])[indice];

    if (!version) {
      return null;
    }

    Object.assign(informe, {
      titulo: version.titulo,
      asunto: version.asunto,
      dirigidoA: version.dirigidoA,
      autor: version.autor,
      autorCargo: version.autorCargo,
      estado: version.estado,
      contenido: version.contenido,
      actualizadoEn: new Date().toISOString()
    });

    return clonar(informe);
  }
};
