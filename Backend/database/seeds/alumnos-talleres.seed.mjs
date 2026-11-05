import studentRepository from "../../modules/students/students.repository.mjs";

/* Grupos fijos por curso para el cálculo de grupos de taller A y B */
const GRUPOS_TALLER_POR_CURSO = {
  "1-1": ["1.1", "1.3"],
  "1-2": ["1.2", "1.4"],
  "1-3": ["1.5", "1.7"],
  "1-4": ["1.6", "1.8"],
  "1-6": ["1.9", "1.11"],
  "2-1": ["2.1", "2.3"],
  "2-2": ["2.2", "2.4"],
  "2-3": ["2.3", "2.5"],
  "2-4": ["2.4", "2.6"],
  "3-1": ["3.1", "3.3"],
  "3-4": ["3.2", "3.4"],
  "3-6": ["3.5", "3.7"],
  "4-1": ["4.1", "4.3"],
  "4-2": ["4.2", "4.4"],
  "4-3": ["4.3", "4.5"],
  "5-1": ["5.1", "5.3"],
  "5-3": ["5.3", "5.5"],
  "5-4": ["5.2", "5.4"],
  "6-1": ["6.1", "6.3"],
  "6-3": ["6.3", "6.5"],
  "7-1": ["7.1", "7.3"],
  "7-2": ["7.2", "7.4"]
};

/* Cursos que dejamos expresamente sin asignar alumnos a talleres para probar la notificación: 1°3, 1°4 y 1°6 */
export const CURSOS_TALLER_SIN_ASIGNAR = new Set(["1-3", "1-4", "1-6"]);

/**
 * Asigna grupo de taller en el legajo de los alumnos de todos los cursos
 * excepto los 3 cursos de prueba (1°3, 1°4 y 1°6) para que figuren como nóminas pendientes.
 */
export function seedAlumnosTalleres() {
  const alumnos = studentRepository.all();
  if (!alumnos.length) return 0;

  let asignados = 0;

  // Agrupar alumnos por curso y división
  const porCurso = new Map();
  for (const alumno of alumnos) {
    if (alumno.estado === "inactivo") continue;
    const clave = `${alumno.curso}-${alumno.division}`;
    if (!porCurso.has(clave)) {
      porCurso.set(clave, []);
    }
    porCurso.get(clave).push(alumno);
  }

  for (const [clave, listaAlumnos] of porCurso.entries()) {
    // Si es uno de los 3 cursos que deben quedar sin asignar, aseguramos grupoTaller null
    if (CURSOS_TALLER_SIN_ASIGNAR.has(clave)) {
      for (const alu of listaAlumnos) {
        if (alu.grupoTaller) {
          studentRepository.update(alu.id, { grupoTaller: null });
        }
      }
      continue;
    }

    // Para todos los demás cursos, asignamos a la mitad grupo A y a la otra mitad grupo B
    const grupos = GRUPOS_TALLER_POR_CURSO[clave] || [`${clave}.1`, `${clave}.2`];
    const ordenados = [...listaAlumnos].sort((a, b) =>
      (a.apellido || "").localeCompare(b.apellido || "", "es")
    );
    const mitad = Math.ceil(ordenados.length / 2);

    ordenados.forEach((alu, index) => {
      const grupo = index < mitad ? grupos[0] : (grupos[1] || grupos[0]);
      studentRepository.update(alu.id, { grupoTaller: grupo });
      asignados++;
    });
  }

  return asignados;
}

