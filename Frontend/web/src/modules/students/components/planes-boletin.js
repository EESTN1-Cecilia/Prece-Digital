/* Plan de materias por año y orientación (Matriz.xlsx y resoluciones PBA).
   Lo usan la planilla de calificaciones y el RITE. */

// Definición oficial de materias según Matriz.xlsx y Resoluciones Provinciales PBA
export const PLANES_BOLETIN = {
  1: {
    nombreAnio: "1° Año",
    ciclo: "Ciclo Básico",
    formacionGeneral: [
      "CIENCIAS NATURALES",
      "CIENCIAS SOCIALES",
      "EDUCACION ARTISTICA",
      "EDUCACION FISICA",
      "INGLES",
      "MATEMATICAS",
      "PRACTICAS DEL LENGUAJE",
      "CONSTRUCCION CUIDADANA"
    ],
    tcoEspecifica: [
      "PROCEDIMIENTOS TECNICOS",
      "LENGUAJE TECNOLOGICOS",
      "SISTEMAS TECNOLOGICOS"
    ]
  },
  2: {
    nombreAnio: "2° Año",
    ciclo: "Ciclo Básico",
    formacionGeneral: [
      "BIOLOGÍA",
      "CONSTRUCCIÓN DE CIUDADANÍA",
      "EDUCACIÓN ARTÍSTICA",
      "EDUCACIÓN FÍSICA",
      "FÍSICO QUÍMICA",
      "GEOGRAFÍA",
      "HISTORIA",
      "INGLÉS",
      "MATEMÁTICA",
      "PRÁCTICAS DEL LENGUAJE"
    ],
    tcoEspecifica: [
      "PROCEDIMIENTOS TÉCNICOS",
      "LENGUAJES TECNOLÓGICOS",
      "SISTEMAS TECNOLÓGICOS"
    ]
  },
  3: {
    nombreAnio: "3° Año",
    ciclo: "Ciclo Básico",
    formacionGeneral: [
      "BIOLOGÍA",
      "CONSTRUCCIÓN DE CIUDADANÍA",
      "EDUCACIÓN ARTÍSTICA",
      "EDUCACIÓN FÍSICA",
      "FÍSICO QUÍMICA",
      "GEOGRAFÍA",
      "HISTORIA",
      "INGLÉS",
      "MATEMÁTICA",
      "PRÁCTICAS DEL LENGUAJE"
    ],
    tcoEspecifica: [
      "PROCEDIMIENTOS TÉCNICOS",
      "LENGUAJES TECNOLÓGICOS",
      "SISTEMAS TECNOLÓGICOS"
    ]
  },
  4: {
    nombreAnio: "4° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "SALUD Y ADOLESCENCIA",
      "HISTORIA",
      "GEOGRAFÍA",
      "MATEMÁTICA CICLO SUPERIOR",
      "FÍSICA",
      "QUÍMICA"
    ],
    orientaciones: {
      programacion: [
        "TECNOLOGÍAS ELECTRÓNICAS",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ],
      informatica: [
        "TECNOLOGÍAS ELECTRÓNICAS",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ]
    }
  },
  5: {
    nombreAnio: "5° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "POLÍTICA Y CIUDADANÍA",
      "HISTORIA",
      "GEOGRAFÍA",
      "ANÁLISIS MATEMÁTICO"
    ],
    orientaciones: {
      programacion: [
        "SISTEMAS DIGITALES",
        "BASES DE DATOS",
        "MODELOS Y SISTEMAS",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE REDES INFORMÁTICAS",
        "LABORATORIO DE DISEÑO WEB",
        "LABORATORIO DE DISEÑO DE BASES DE DATOS"
      ],
      informatica: [
        "SISTEMAS DIGITALES",
        "TELEINFORMÁTICA",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ]
    }
  },
  6: {
    nombreAnio: "6° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "FILOSOFÍA",
      "ARTE",
      "MATEMÁTICA DISCRETA",
      "DERECHOS DEL TRABAJO"
    ],
    orientaciones: {
      programacion: [
        "SISTEMAS DIGITALES",
        "SISTEMAS DE GESTIÓN Y AUTOGESTIÓN",
        "SEGURIDAD INFORMÁTICA",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE PROCESOS INDUSTRIALES",
        "DESARROLLO DE APLICACIONES WEB ESTÁTICAS",
        "DESARROLLO DE APLICACIONES WEB DINÁMICAS"
      ],
      informatica: [
        "SISTEMAS DIGITALES",
        "INVESTIGACIÓN OPERATIVA",
        "SEGURIDAD INFORMÁTICA",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ]
    }
  },
  7: {
    nombreAnio: "7° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "EMPRENDIMIENTOS PRODUCTIVOS Y DESARROLLO LOCAL",
      "EVALUACIÓN DE PROYECTOS",
      "MODELOS Y SISTEMAS",
      "ORGANIZACIÓN Y MÉTODOS"
    ],
    orientaciones: {
      programacion: [
        "PRÁCTICAS PROFESIONALIZANTES DEL SECTOR INFORMÁTICA",
        "PROYECTO, DISEÑO E IMPLEMENTACIÓN DE SISTEMAS COMPUTACIONALES",
        "PROYECTO DE DESARROLLO DE SOFTWARE PARA PLATAFORMAS MÓVILES",
        "PROYECTOS DE IMPLEMENTACIÓN DE SITIOS WEB DINÁMICOS"
      ],
      informatica: [
        "PRÁCTICAS PROFESIONALIZANTES DEL SECTOR INFORMÁTICA",
        "BASES DE DATOS",
        "PROYECTO, DISEÑO E IMPLEMENTACIÓN DE SISTEMAS COMPUTACIONALES",
        "INSTALACIÓN, MANTENIMIENTO Y REPARACIÓN DE SISTEMAS COMPUTACIONALES",
        "INSTALACIÓN, MANTENIMIENTO Y REPARACIÓN DE REDES INFORMÁTICAS"
      ]
    }
  }
};

