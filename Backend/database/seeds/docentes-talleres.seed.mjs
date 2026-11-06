/* Seed de asignaciones de profesores a grupos de taller para Jefatura y Dirección.
 * Asigna todos los grupos de taller de la escuela a docentes, EXCEPTO 3 cursos
 * para permitir probar las notificaciones automáticas de talleres/listas pendientes:
 * - 1° Año División 3 (1°3, grupos 1.5 y 1.7)
 * - 1° Año División 4 (1°4, grupos 1.6 y 1.8)
 * - 1° Año División 6 (1°6, grupos 1.9 y 1.11)
 */

import { getStore } from "../memory-store.mjs";

const GRUPOS_PENDIENTES = new Set(["1.5", "1.7", "1.6", "1.8", "1.9", "1.11"]);

const DOCENTES_TALLER = [
  { id: "usr-doc-meza", nombre: "Prof. Meza", email: "meza@prece.local" },
  { id: "usr-doc-flores", nombre: "Prof. Flores", email: "flores@prece.local" },
  { id: "usr-doc-monje", nombre: "Prof. Monje", email: "monje@prece.local" },
  { id: "usr-doc-pena", nombre: "Prof. Peña", email: "pena@prece.local" },
  { id: "usr-doc-olmeda", nombre: "Prof. Olmeda", email: "olmeda@prece.local" },
  { id: "usr-doc-valdez", nombre: "Prof. Valdez", email: "valdez@prece.local" },
  { id: "usr-doc-aguinaga", nombre: "Prof. Aguinaga", email: "aguinaga@prece.local" },
  { id: "usr-doc-luna", nombre: "Prof. Luna", email: "luna@prece.local" },
  { id: "usr-doc-delatorre", nombre: "Prof. De La Torre", email: "delatorre@prece.local" },
  { id: "usr-doc-correia", nombre: "Prof. Correia", email: "correia@prece.local" },
  { id: "usr-doc-callamullo", nombre: "Prof. Callamullo", email: "callamullo@prece.local" },
  { id: "usr-doc-gonzalez", nombre: "Prof. Gonzalez", email: "gonzalez@prece.local" },
  { id: "usr-doc-gareis", nombre: "Prof. Gareis", email: "gareis@prece.local" },
  { id: "usr-doc-aragon", nombre: "Prof. Aragon", email: "aragon@prece.local" },
  { id: "usr-doc-avalos", nombre: "Prof. Avalos", email: "avalos@prece.local" }
];

export function seedDocentesTalleres({ escuelaId = "esc-1" } = {}) {
  const mapa = getStore().tallerDocentes;

  // Lista de todos los grupos conocidos de 1° a 7°
  const todosLosGrupos = [
    // 1° año
    { grupo: "1.1", anio: 1, division: "1" },
    { grupo: "1.3", anio: 1, division: "1" },
    { grupo: "1.2", anio: 1, division: "2" },
    { grupo: "1.4", anio: 1, division: "2" },
    { grupo: "1.5", anio: 1, division: "3" }, // PENDIENTE (1°3)
    { grupo: "1.7", anio: 1, division: "3" }, // PENDIENTE (1°3)
    { grupo: "1.6", anio: 1, division: "4" }, // PENDIENTE (1°4)
    { grupo: "1.8", anio: 1, division: "4" }, // PENDIENTE (1°4)
    { grupo: "1.9", anio: 1, division: "6" }, // PENDIENTE (1°6)
    { grupo: "1.11", anio: 1, division: "6" }, // PENDIENTE (1°6)

    // 2° año
    { grupo: "2.1", anio: 2, division: "1" },
    { grupo: "2.3", anio: 2, division: "1" },
    { grupo: "2.2", anio: 2, division: "2" },
    { grupo: "2.4", anio: 2, division: "2" },
    { grupo: "2.5", anio: 2, division: "3" },
    { grupo: "2.7", anio: 2, division: "3" },
    { grupo: "2.6", anio: 2, division: "4" },
    { grupo: "2.8", anio: 2, division: "4" },
    { grupo: "2.9", anio: 2, division: "5" },
    { grupo: "2.11", anio: 2, division: "5" },
    { grupo: "2.10", anio: 2, division: "6" },
    { grupo: "2.12", anio: 2, division: "6" },

    // 3° año
    { grupo: "3.1", anio: 3, division: "1" },
    { grupo: "3.3", anio: 3, division: "1" },
    { grupo: "3.2", anio: 3, division: "2" },
    { grupo: "3.4", anio: 3, division: "2" },
    { grupo: "3.5", anio: 3, division: "3" },
    { grupo: "3.7", anio: 3, division: "3" },
    { grupo: "3.6", anio: 3, division: "4" },
    { grupo: "3.8", anio: 3, division: "4" },

    // 4° año
    { grupo: "4.1", anio: 4, division: "1" },
    { grupo: "4.3", anio: 4, division: "1" },
    { grupo: "4.2", anio: 4, division: "2" },
    { grupo: "4.4", anio: 4, division: "2" },
    { grupo: "4.5", anio: 4, division: "3" },
    { grupo: "4.7", anio: 4, division: "3" },
    { grupo: "4.6", anio: 4, division: "4" },
    { grupo: "4.8", anio: 4, division: "4" },

    // 5° año
    { grupo: "5.1", anio: 5, division: "1" },
    { grupo: "5.3", anio: 5, division: "1" },
    { grupo: "5.2", anio: 5, division: "2" },
    { grupo: "5.4", anio: 5, division: "2" },
    { grupo: "5.5", anio: 5, division: "3" },
    { grupo: "5.7", anio: 5, division: "3" },
    { grupo: "5.6", anio: 5, division: "4" },
    { grupo: "5.8", anio: 5, division: "4" },

    // 6° año
    { grupo: "6.1", anio: 6, division: "1" },
    { grupo: "6.3", anio: 6, division: "1" },
    { grupo: "6.2", anio: 6, division: "2" },
    { grupo: "6.4", anio: 6, division: "2" },
    { grupo: "6.5", anio: 6, division: "3" },
    { grupo: "6.7", anio: 6, division: "3" },
    { grupo: "6.6", anio: 6, division: "4" },
    { grupo: "6.8", anio: 6, division: "4" },

    // 7° año
    { grupo: "7.1", anio: 7, division: "1" },
    { grupo: "7.2", anio: 7, division: "2" },
    { grupo: "7.3", anio: 7, division: "3" },
    { grupo: "7.4", anio: 7, division: "4" },
    { grupo: "7.6", anio: 7, division: "3" },
    { grupo: "7.8", anio: 7, division: "3" }
  ];

  let docenteIdx = 0;
  for (const item of todosLosGrupos) {
    if (GRUPOS_PENDIENTES.has(item.grupo)) {
      continue; // Queda sin asignar para probar la notificación
    }
    const docente = DOCENTES_TALLER[docenteIdx % DOCENTES_TALLER.length];
    docenteIdx += 1;

    const clave = `${escuelaId}|${item.grupo}`;
    mapa.set(clave, {
      escuelaId,
      grupo: item.grupo,
      anio: item.anio,
      division: item.division,
      docente: {
        id: docente.id,
        nombre: docente.nombre,
        email: docente.email
      },
      actualizadoPor: "seed",
      actualizadoEn: new Date().toISOString()
    });
  }
}

