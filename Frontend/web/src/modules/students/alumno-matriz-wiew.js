import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import { StudentsService } from "./students-service.js";

// Planes de estudio según Resoluciones Provinciales PBA (Res. 302/12, 284/12 y 3828/09)
export const MATERIAS_COMUNES = {
  primero: [
    "CIENCIAS NATURALES",
    "CIENCIAS SOCIALES",
    "EDUCACIÓN ARTÍSTICA",
    "EDUCACIÓN FÍSICA",
    "INGLÉS",
    "MATEMÁTICA",
    "PRÁCTICAS DEL LENGUAJE",
    "CONSTRUCCIÓN CIUDADANA",
    "TALLER"
  ],
  segundo: [
    "BIOLOGÍA",
    "CONSTRUCCIÓN DE CIUDADANÍA",
    "EDUCACIÓN ARTÍSTICA",
    "EDUCACIÓN FÍSICA",
    "FÍSICO QUÍMICA",
    "GEOGRAFÍA",
    "HISTORIA",
    "INGLÉS",
    "MATEMÁTICA",
    "PRÁCTICAS DEL LENGUAJE",
    "TALLER"
  ],
  tercero: [
    "BIOLOGÍA",
    "CONSTRUCCIÓN DE CIUDADANÍA",
    "EDUCACIÓN ARTÍSTICA",
    "EDUCACIÓN FÍSICA",
    "FÍSICO QUÍMICA",
    "GEOGRAFÍA",
    "HISTORIA",
    "INGLÉS",
    "MATEMÁTICA",
    "PRÁCTICAS DEL LENGUAJE",
    "TALLER"
  ]
};

export const MATERIAS_ORIENTACION = {
  programacion: {
    nombreTitulo: "TÉCNICO EN PROGRAMACIÓN",
    resolucion: "RESOLUCIÓN Nº 302/12 Y 284/12",
    observaciones: "R.E Nº 941",
    cuarto: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "SALUD Y ADOLESCENCIA",
      "HISTORIA",
      "GEOGRAFÍA",
      "MATEMÁTICA CICLO SUPERIOR",
      "FÍSICA",
      "QUÍMICA",
      "TECNOLOGÍAS ELECTRÓNICAS",
      "LABORATORIO DE PROGRAMACIÓN",
      "LABORATORIO DE HARDWARE",
      "LABORATORIO DE SISTEMAS OPERATIVOS",
      "LABORATORIO DE APLICACIONES"
    ],
    quinto: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "POLÍTICA Y CIUDADANÍA",
      "HISTORIA",
      "GEOGRAFÍA",
      "ANÁLISIS MATEMÁTICO",
      "SISTEMAS DIGITALES",
      "BASES DE DATOS",
      "MODELOS Y SISTEMAS",
      "LABORATORIO DE PROGRAMACIÓN",
      "LABORATORIO DE REDES INFORMÁTICAS",
      "LABORATORIO DE DISEÑO WEB",
      "LABORATORIO DE DISEÑO DE BASES DE DATOS"
    ],
    sexto: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "FILOSOFÍA",
      "ARTE",
      "MATEMÁTICA DISCRETA",
      "SISTEMAS DIGITALES",
      "SISTEMAS DE GESTIÓN Y AUTOGESTIÓN",
      "SEGURIDAD INFORMÁTICA",
      "DERECHOS DEL TRABAJO",
      "LABORATORIO DE PROGRAMACIÓN",
      "LABORATORIO DE PROCESOS INDUSTRIALES",
      "DESARROLLO DE APLICACIONES WEB ESTÁTICAS",
      "DESARROLLO DE APLICACIONES WEB DINÁMICAS"
    ],
    septimo: [
      "PRÁCTICAS PROFESIONALIZANTES DEL SECTOR INFORMÁTICA",
      "EMPRENDIMIENTOS PRODUCTIVOS Y DESARROLLO LOCAL",
      "EVALUACIÓN DE PROYECTOS",
      "MODELOS Y SISTEMAS",
      "ORGANIZACIÓN Y MÉTODOS",
      "PROYECTO, DISEÑO E IMPLEMENTACIÓN DE SISTEMAS COMPUTACIONALES",
      "PROYECTO DE DESARROLLO DE SOFTWARE PARA PLATAFORMAS MÓVILES",
      "PROYECTOS DE IMPLEMENTACIÓN DE SITIOS WEB DINÁMICOS"
    ]
  },
  informatica: {
    nombreTitulo: "TÉCNICO EN INFORMÁTICA PERSONAL Y PROFESIONAL",
    resolucion: "RESOLUCIÓN Nº 302/12",
    observaciones: "R.E Nº 954",
    cuarto: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "SALUD Y ADOLESCENCIA",
      "HISTORIA",
      "GEOGRAFÍA",
      "MATEMÁTICA CICLO SUPERIOR",
      "FÍSICA",
      "QUÍMICA",
      "TECNOLOGÍAS ELECTRÓNICAS",
      "LABORATORIO DE PROGRAMACIÓN",
      "LABORATORIO DE HARDWARE",
      "LABORATORIO DE SISTEMAS OPERATIVOS",
      "LABORATORIO DE APLICACIONES"
    ],
    quinto: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "POLÍTICA Y CIUDADANÍA",
      "HISTORIA",
      "GEOGRAFÍA",
      "ANÁLISIS MATEMÁTICO",
      "SISTEMAS DIGITALES",
      "TELEINFORMÁTICA",
      "LABORATORIO DE PROGRAMACIÓN",
      "LABORATORIO DE HARDWARE",
      "LABORATORIO DE SISTEMAS OPERATIVOS",
      "LABORATORIO DE APLICACIONES"
    ],
    sexto: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "FILOSOFÍA",
      "ARTE",
      "MATEMÁTICA APLICADA",
      "SISTEMAS DIGITALES",
      "INVESTIGACIÓN OPERATIVA",
      "SEGURIDAD INFORMÁTICA",
      "DERECHOS DEL TRABAJO",
      "LABORATORIO DE PROGRAMACIÓN",
      "LABORATORIO DE HARDWARE",
      "LABORATORIO DE SISTEMAS OPERATIVOS",
      "LABORATORIO DE APLICACIONES"
    ],
    septimo: [
      "PRÁCTICAS PROFESIONALIZANTES DEL SECTOR INFORMÁTICA",
      "EMPRENDIMIENTOS PRODUCTIVOS Y DESARROLLO LOCAL",
      "EVALUACIÓN DE PROYECTOS",
      "MODELOS Y SISTEMAS",
      "BASES DE DATOS",
      "PROYECTO, DISEÑO E IMPLEMENTACIÓN DE SISTEMAS COMPUTACIONALES",
      "INSTALACIÓN, MANTENIMIENTO Y REPARACIÓN DE SISTEMAS COMPUTACIONALES",
      "INSTALACIÓN, MANTENIMIENTO Y REPARACIÓN DE REDES INFORMÁTICAS"
    ]
  }
};

const NUMEROS_A_LETRAS = {
  1: "UNO",
  2: "DOS",
  3: "TRES",
  4: "CUATRO",
  5: "CINCO",
  6: "SEIS",
  7: "SIETE",
  8: "OCHO",
  9: "NUEVE",
  10: "DIEZ"
};

export function convertirNotaALetras(valor) {
  if (valor === undefined || valor === null || valor === "") return "";
  const str = String(valor).trim().replace(",", ".");
  const num = parseFloat(str);
  if (isNaN(num)) return valor;

  const parteEntera = Math.floor(num);
  const parteDecimal = Math.round((num - parteEntera) * 100);
  const enteroLetras = NUMEROS_A_LETRAS[parteEntera] || String(parteEntera);

  if (parteDecimal > 0) {
    return `${num.toFixed(2)} (${enteroLetras} CON ${parteDecimal}/100)`;
  }
  return `${num.toFixed(2)} (${enteroLetras})`;
}

// Generador de filas iniciales para un año
function generarFilasPorDefecto(materias, anioBase) {
  return materias.map((materia) => ({
    materia,
    calificacion: "7.00",
    calificacionTexto: "7.00 (SIETE)",
    condicion: "REGULAR",
    mes: "DIC",
    anio: String(anioBase),
    establecimiento: "ESTE ESTABLECIMIENTO"
  }));
}

// Alumnos de muestra institucionales para pruebas inmediatas de cambio de orientación y materias
const SAMPLE_ALUMNOS = [
  { id: 1, apellido: "González", nombre: "Lucas Agustín", dni: "46.123.456", curso: "7°", division: "2", turno: "Tarde", orientacion: "Técnico en Programación" },
  { id: 19, apellido: "Medina", nombre: "Lautaro Nahuel", dni: "43.111.222", curso: "7°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática" },
  { id: 24, apellido: "Molina", nombre: "Kiara Denise", dni: "42.666.777", curso: "5°", division: "2", turno: "Tarde", orientacion: "Técnico en Informática" },
  { id: 21, apellido: "Aguirre", nombre: "Thiago Valentín", dni: "43.333.444", curso: "4°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación" },
  { id: 23, apellido: "Gutiérrez", nombre: "Matías Alejandro", dni: "42.555.666", curso: "5°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática" },
  { id: 28, apellido: "Ortiz", nombre: "Constanza Guadalupe", dni: "41.234.567", curso: "6°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación" },
  { id: 29, apellido: "Vargas", nombre: "Maximiliano Gastón", dni: "40.345.678", curso: "7°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática" },
  { id: 30, apellido: "Cabrera", nombre: "Antonella Solange", dni: "40.456.789", curso: "7°", division: "2", turno: "Tarde", orientacion: "Técnico en Programación" }
];

// Componente Desplegable Estilizado para Barra Superior (Matching image 2 with dark theme)
function DarkCustomDropdown({
  label,
  value,
  opciones = [],
  onSelect,
  placeholder = "Seleccionar...",
  isSearchable = false,
  searchValue = "",
  onSearchChange = null
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [abierto]);

  const opcionSeleccionada = opciones.find((o) => String(o.value) === String(value));
  const textoMostrado = opcionSeleccionada ? opcionSeleccionada.label : placeholder;

  return h(
    "div",
    { className: "custom-dark-dropdown", ref },
    h(
      "button",
      {
        type: "button",
        className: `custom-dark-dropdown__btn ${abierto ? "custom-dark-dropdown__btn--open" : ""}`,
        onClick: () => setAbierto(!abierto),
        "aria-expanded": abierto
      },
      h("span", { className: "custom-dark-dropdown__label-title" }, label ? `${label}: ` : ""),
      h("span", { className: "custom-dark-dropdown__btn-text" }, textoMostrado),
      h(
        "svg",
        {
          className: `custom-dark-dropdown__chevron ${abierto ? "custom-dark-dropdown__chevron--open" : ""}`,
          viewBox: "0 0 20 20",
          fill: "currentColor"
        },
        h("path", {
          fillRule: "evenodd",
          d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
          clipRule: "evenodd"
        })
      )
    ),

    abierto
      ? h(
          "div",
          { className: "custom-dark-dropdown__menu" },
          isSearchable
            ? h(
                "div",
                { className: "custom-dark-dropdown__search-wrap" },
                h("input", {
                  type: "text",
                  className: "custom-dark-dropdown__search-input",
                  placeholder: "Buscar por nombre, apellido o DNI...",
                  value: searchValue,
                  onChange: (e) => onSearchChange && onSearchChange(e.target.value),
                  autoFocus: true,
                  onClick: (e) => e.stopPropagation()
                })
              )
            : null,
          h(
            "div",
            { className: "custom-dark-dropdown__list" },
            opciones.length === 0
              ? h("div", { className: "custom-dark-dropdown__item custom-dark-dropdown__item--empty" }, "No se encontraron resultados")
              : opciones.map((opcion) => {
                  const estaActiva = String(opcion.value) === String(value);
                  return h(
                    "button",
                    {
                      key: opcion.value,
                      type: "button",
                      className: `custom-dark-dropdown__item ${estaActiva ? "custom-dark-dropdown__item--active" : ""}`,
                      onClick: () => {
                        onSelect(opcion.value);
                        setAbierto(false);
                      }
                    },
                    h("span", { className: "custom-dark-dropdown__item-text" }, opcion.label),
                    estaActiva
                      ? h(
                          "svg",
                          { className: "custom-dark-dropdown__check-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                          h("path", {
                            fillRule: "evenodd",
                            d: "M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z",
                            clipRule: "evenodd"
                          })
                        )
                      : null
                  );
                })
          )
        )
      : null
  );
}

// Componente Desplegable Estilizado para Celdas de Tabla en Modo Edición (Matching sleek dropdown design)
function TableCustomDropdown({ value, opciones = [], onChange }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [abierto]);

  return h(
    "div",
    { className: "table-custom-dropdown", ref },
    h(
      "button",
      {
        type: "button",
        className: `table-custom-dropdown__btn ${abierto ? "table-custom-dropdown__btn--open" : ""}`,
        onClick: (e) => {
          e.stopPropagation();
          setAbierto(!abierto);
        },
        "aria-expanded": abierto
      },
      h("span", { className: "table-custom-dropdown__btn-text" }, value || "Seleccionar"),
      h(
        "svg",
        {
          className: `table-custom-dropdown__chevron ${abierto ? "table-custom-dropdown__chevron--open" : ""}`,
          viewBox: "0 0 20 20",
          fill: "currentColor"
        },
        h("path", {
          fillRule: "evenodd",
          d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
          clipRule: "evenodd"
        })
      )
    ),
    abierto
      ? h(
          "div",
          { className: "table-custom-dropdown__menu" },
          opciones.map((op) => {
            const estaActiva = String(op) === String(value);
            return h(
              "button",
              {
                key: op,
                type: "button",
                className: `table-custom-dropdown__item ${estaActiva ? "table-custom-dropdown__item--active" : ""}`,
                onClick: (e) => {
                  e.stopPropagation();
                  onChange(op);
                  setAbierto(false);
                }
              },
              h("span", { className: "table-custom-dropdown__item-text" }, op),
              estaActiva
                ? h(
                    "svg",
                    { className: "table-custom-dropdown__check-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                    h("path", {
                      fillRule: "evenodd",
                      d: "M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z",
                      clipRule: "evenodd"
                    })
                  )
                : null
            );
          })
        )
      : null
  );
}

export function AlumnoMatrizModal({
  abierto = true,
  onCerrar,
  alumnoInicial = null
}) {
  const [alumnosList, setAlumnosList] = useState(SAMPLE_ALUMNOS);
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState("");
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [orientacion, setOrientacion] = useState("programacion"); // 'programacion' | 'informatica'
  const [modoEdicion, setModoEdicion] = useState(false);
  const [matrizBackup, setMatrizBackup] = useState(null); // Para cancelar edición
  const [anioActivo, setAnioActivo] = useState("todos"); // 'todos' o '1'..'7'

  // Estado de colapso/despliegue por cada año
  const [aniosColapsados, setAniosColapsados] = useState({
    primero: false,
    segundo: false,
    tercero: false,
    cuarto: false,
    quinto: false,
    sexto: false,
    septimo: false
  });

  const toggleAnioColapso = (claveAnio) => {
    setAniosColapsados((prev) => ({
      ...prev,
      [claveAnio]: !prev[claveAnio]
    }));
  };

  // Bloquear el scroll del body cuando el modal está abierto para evitar que se desplace el fondo
  useEffect(() => {
    if (abierto) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [abierto]);

  // Datos del Encabezado y Certificado
  const [datosEstudiante, setDatosEstudiante] = useState({
    apellido: "GONZÁLEZ",
    nombre: "LUCAS AGUSTÍN",
    lugarNacimiento: "EZEIZA (ARGENTINA)",
    fechaNacimiento: "15 DE OCTUBRE DE 2005",
    dni: "46.123.456",
    numeroCertificado: "06-00095487-2025",
    libroMatriz: "77",
    folio: "5",
    fechaEgreso: "20 de DICIEMBRE del año 2024",
    fechaEmision: "25 del mes de MARZO del año 2025",
    localidad: "MONTE GRANDE",
    provincia: "BUENOS AIRES",
    establecimientoNombre: "ESCUELA DE EDUCACIÓN SECUNDARIA TÉCNICA Nº 1",
    cue: "0615476-00",
    domicilioEstablecimiento: "GÜEMES Nº 2051",
    validezNacional: "RM Nº1466/18-RM Nº2206/22-DISP Nº723/22",
    responsableInstitucional: "MELGAREJO ROMINA VANESA",
    agenteLegalizador: "LLERAL Máxima Andre"
  });

  // Estructura de materias por año
  const [matriz, setMatriz] = useState({
    primero: [],
    segundo: [],
    tercero: [],
    cuarto: [],
    quinto: [],
    sexto: [],
    septimo: []
  });

  // Cargar lista de alumnos disponibles
  useEffect(() => {
    StudentsService.getAlumnos({ limit: 100 })
      .then((res) => {
        if (res?.data && res.data.length > 0) {
          setAlumnosList(res.data);
        } else {
          setAlumnosList(SAMPLE_ALUMNOS);
        }
      })
      .catch(() => {
        setAlumnosList(SAMPLE_ALUMNOS);
      });
  }, []);

  // Si se provee alumnoInicial al montar o cambiar
  useEffect(() => {
    if (alumnoInicial) {
      handleSeleccionarAlumno(alumnoInicial.id, alumnoInicial);
    }
  }, [alumnoInicial]);

  // Inicializar o sincronizar datos de la matriz según orientación
  useEffect(() => {
    const infoOrientacion = MATERIAS_ORIENTACION[orientacion];
    const anioActual = new Date().getFullYear();
    const anio7 = anioActual - 1;

    setMatriz({
      primero: [
        { materia: "CIENCIAS NATURALES", calificacion: "7.66", calificacionTexto: "7.66 (SIETE CON 66/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "CIENCIAS SOCIALES", calificacion: "9.00", calificacionTexto: "9.00 (NUEVE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "EDUCACIÓN ARTÍSTICA", calificacion: "10.00", calificacionTexto: "10.00 (DIEZ)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "EDUCACIÓN FÍSICA", calificacion: "9.00", calificacionTexto: "9.00 (NUEVE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "INGLÉS", calificacion: "8.66", calificacionTexto: "8.66 (OCHO CON 66/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "MATEMÁTICA", calificacion: "8.66", calificacionTexto: "8.66 (OCHO CON 66/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "PRÁCTICAS DEL LENGUAJE", calificacion: "8.00", calificacionTexto: "8.00 (OCHO)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "CONSTRUCCIÓN CIUDADANA", calificacion: "8.33", calificacionTexto: "8.33 (OCHO CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "TALLER", calificacion: "8.00", calificacionTexto: "8.00 (OCHO)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 6), establecimiento: "ESTE ESTABLECIMIENTO" }
      ],
      segundo: [
        { materia: "BIOLOGÍA", calificacion: "8.33", calificacionTexto: "8.33 (OCHO CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "CONSTRUCCIÓN DE CIUDADANÍA", calificacion: "8.33", calificacionTexto: "8.33 (OCHO CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "EDUCACIÓN ARTÍSTICA", calificacion: "8.00", calificacionTexto: "8.00 (OCHO)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "EDUCACIÓN FÍSICA", calificacion: "8.33", calificacionTexto: "8.33 (OCHO CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "FÍSICO QUÍMICA", calificacion: "7.33", calificacionTexto: "7.33 (SIETE CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "GEOGRAFÍA", calificacion: "8.00", calificacionTexto: "8.00 (OCHO)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "HISTORIA", calificacion: "8.33", calificacionTexto: "8.33 (OCHO CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "INGLÉS", calificacion: "8.33", calificacionTexto: "8.33 (OCHO CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "MATEMÁTICA", calificacion: "9.66", calificacionTexto: "9.66 (NUEVE CON 66/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "PRÁCTICAS DEL LENGUAJE", calificacion: "9.33", calificacionTexto: "9.33 (NUEVE CON 33/100)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "TALLER", calificacion: "10.00", calificacionTexto: "10.00 (DIEZ)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 5), establecimiento: "ESTE ESTABLECIMIENTO" }
      ],
      tercero: [
        { materia: "BIOLOGÍA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "CONSTRUCCIÓN DE CIUDADANÍA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "EDUCACIÓN ARTÍSTICA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "EDUCACIÓN FÍSICA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "FÍSICO QUÍMICA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "GEOGRAFÍA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "HISTORIA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "INGLÉS", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "MATEMÁTICA", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "PRÁCTICAS DEL LENGUAJE", calificacion: "7.00", calificacionTexto: "7.00 (SIETE)", condicion: "REGULAR", mes: "DIC", anio: String(anio7 - 4), establecimiento: "ESTE ESTABLECIMIENTO" },
        { materia: "TALLER", calificacion: "4.00", calificacionTexto: "4.00 (CUATRO)", condicion: "REGULAR", mes: "OCT", anio: String(anio7), establecimiento: "ESTE ESTABLECIMIENTO" }
      ],
      cuarto: generarFilasPorDefecto(infoOrientacion.cuarto, anio7 - 3),
      quinto: generarFilasPorDefecto(infoOrientacion.quinto, anio7 - 2),
      sexto: generarFilasPorDefecto(infoOrientacion.sexto, anio7 - 1),
      septimo: generarFilasPorDefecto(infoOrientacion.septimo, anio7)
    });
  }, [orientacion]);

  // Selección automática de alumno y orientación
  const handleSeleccionarAlumno = (alumnoId, alumnoObj = null) => {
    setAlumnoSeleccionadoId(alumnoId);
    const alumno = alumnoObj || alumnosList.find((a) => String(a.id) === String(alumnoId)) || SAMPLE_ALUMNOS.find((a) => String(a.id) === String(alumnoId));
    if (alumno) {
      const orientacionStr = (alumno.orientacion || "").toLowerCase();
      const orientacionCalculada =
        orientacionStr.includes("informát") || orientacionStr.includes("informat")
          ? "informatica"
          : "programacion";

      setOrientacion(orientacionCalculada);

      setDatosEstudiante((prev) => ({
        ...prev,
        apellido: (alumno.apellido || "").toUpperCase(),
        nombre: (alumno.nombre || "").toUpperCase(),
        dni: alumno.dni || "",
        lugarNacimiento: "EZEIZA (ARGENTINA)",
        fechaNacimiento: "15 DE OCTUBRE DE 2005",
        libroMatriz: String(Math.floor(Math.random() * 50) + 50),
        folio: String(Math.floor(Math.random() * 30) + 1)
      }));
    }
  };

  // Manejo de Inicio, Guardado y Cancelación de Edición
  const handleIniciarEdicion = () => {
    setMatrizBackup(JSON.parse(JSON.stringify(matriz)));
    setModoEdicion(true);
  };

  const handleGuardarEdicion = () => {
    setMatrizBackup(null);
    setModoEdicion(false);
  };

  const handleCancelarEdicion = () => {
    if (matrizBackup) {
      setMatriz(matrizBackup);
    }
    setMatrizBackup(null);
    setModoEdicion(false);
  };

  // Calcular Promedio General
  const { promedioNumerico, promedioTexto, totalMateriasCalificadas } = useMemo(() => {
    let suma = 0;
    let cantidad = 0;

    Object.values(matriz).forEach((filas) => {
      filas.forEach((fila) => {
        const val = parseFloat(String(fila.calificacion).replace(",", "."));
        if (!isNaN(val) && val > 0) {
          suma += val;
          cantidad++;
        }
      });
    });

    if (cantidad === 0) {
      return { promedioNumerico: "0.00", promedioTexto: "CERO", totalMateriasCalificadas: 0 };
    }

    const prom = suma / cantidad;
    const promNum = prom.toFixed(2);
    const texto = convertirNotaALetras(promNum);
    return {
      promedioNumerico: promNum,
      promedioTexto: texto,
      totalMateriasCalificadas: cantidad
    };
  }, [matriz]);

  // Manejar cambio en celda de materia
  const handleFilaChange = (anioClave, index, campo, nuevoValor) => {
    setMatriz((prev) => {
      const anioFilas = [...prev[anioClave]];
      const fila = { ...anioFilas[index], [campo]: nuevoValor };

      if (campo === "calificacion") {
        fila.calificacionTexto = convertirNotaALetras(nuevoValor);
      }

      anioFilas[index] = fila;
      return { ...prev, [anioClave]: anioFilas };
    });
  };

  // Filtrado de alumnos para el dropdown con buscador
  const alumnosFiltrados = useMemo(() => {
    if (!busquedaAlumno.trim()) return alumnosList;
    const q = busquedaAlumno.toLowerCase().trim();
    return alumnosList.filter(
      (a) =>
        (a.apellido && a.apellido.toLowerCase().includes(q)) ||
        (a.nombre && a.nombre.toLowerCase().includes(q)) ||
        (a.dni && String(a.dni).includes(q))
    );
  }, [alumnosList, busquedaAlumno]);

  const opcionesAlumnos = useMemo(() => {
    return alumnosFiltrados.map((a) => ({
      value: a.id,
      label: `${a.apellido}, ${a.nombre} (${a.curso || ""}${a.division ? ` ${a.division}°` : ""}) - [${a.orientacion || "Ciclo Básico"}] - DNI: ${a.dni}`
    }));
  }, [alumnosFiltrados]);

  const opcionesAnios = [
    { value: "todos", label: "Todos (1° a 7°)" },
    { value: "1", label: "1° Año" },
    { value: "2", label: "2° Año" },
    { value: "3", label: "3° Año" },
    { value: "4", label: "4° Año" },
    { value: "5", label: "5° Año" },
    { value: "6", label: "6° Año" },
    { value: "7", label: "7° Año" }
  ];

  const opcionesCondicion = ["REGULAR", "PREVIA", "LIBRE", "EQUIVALENCIA"];
  const opcionesMes = ["DIC", "FEB", "MAR", "JUL", "AGO", "OCT"];

  // Función para imprimir / guardar en PDF con estilo fiel oficial
  const handleImprimir = () => {
    window.print();
  };

  if (!abierto) return null;

  const anios = [
    { clave: "primero", titulo: "PRIMERO", materias: matriz.primero },
    { clave: "segundo", titulo: "SEGUNDO", materias: matriz.segundo },
    { clave: "tercero", titulo: "TERCERO", materias: matriz.tercero },
    { clave: "cuarto", titulo: "CUARTO", materias: matriz.cuarto },
    { clave: "quinto", titulo: "QUINTO", materias: matriz.quinto },
    { clave: "sexto", titulo: "SEXTO", materias: matriz.sexto },
    { clave: "septimo", titulo: "SÉPTIMO", materias: matriz.septimo }
  ];

  const aniosAMostrar = anioActivo === "todos"
    ? anios
    : anios.filter((_, idx) => String(idx + 1) === anioActivo);

  const infoOrientacionActiva = MATERIAS_ORIENTACION[orientacion];

  const modalContent = h(
    "div",
    { className: "matriz-modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget && onCerrar) onCerrar(); } },
    h(
      "div",
      { className: "matriz-modal-container", role: "dialog", "aria-modal": "true" },

      // BARRA DE HERRAMIENTAS SUPERIOR ESTÁTICA / FIJA AL SCROLLEAR (no se imprime)
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left" },
          h("h2", { className: "matriz-toolbar__title" }, "Libro Matriz y Certificado Analítico"),
          h(
            "span",
            { className: "matriz-toolbar__badge" },
            `Orientación: ${infoOrientacionActiva.nombreTitulo}`
          )
        ),
        h(
          "div",
          { className: "matriz-toolbar__controls" },

          // Desplegable de Alumno con buscador en tiempo real (Pill style de Imagen 2 en oscuro)
          h(DarkCustomDropdown, {
            label: "Alumno",
            value: alumnoSeleccionadoId,
            opciones: opcionesAlumnos,
            onSelect: handleSeleccionarAlumno,
            placeholder: "-- Seleccionar Alumno --",
            isSearchable: true,
            searchValue: busquedaAlumno,
            onSearchChange: setBusquedaAlumno
          }),

          // Desplegable de Vista de Año (Pill style de Imagen 2 en oscuro)
          h(DarkCustomDropdown, {
            label: "Ver Año",
            value: anioActivo,
            opciones: opcionesAnios,
            onSelect: setAnioActivo,
            placeholder: "Todos (1° a 7°)"
          }),

          // Botones de Modo Edición (Con Cancelar) - Usando iconos SVG en vez de emojis
          !modoEdicion
            ? h(
                "button",
                {
                  type: "button",
                  className: "matriz-btn matriz-btn--secondary",
                  onClick: handleIniciarEdicion,
                  title: "Habilitar edición de calificaciones, condiciones y fechas"
                },
                h(
                  "svg",
                  { className: "matriz-btn-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", width: "16", height: "16" },
                  h("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
                  h("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
                ),
                "Editar Calificaciones"
              )
            : h(
                React.Fragment,
                null,
                h(
                  "button",
                  {
                    type: "button",
                    className: "matriz-btn matriz-btn--active",
                    onClick: handleGuardarEdicion,
                    title: "Guardar modificaciones realizadas"
                  },
                  h(
                    "svg",
                    { className: "matriz-btn-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", width: "16", height: "16" },
                    h("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
                    h("polyline", { points: "17 21 17 13 7 13 7 21" }),
                    h("polyline", { points: "7 3 7 8 15 8" })
                  ),
                  "Guardar Cambios"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    className: "matriz-btn matriz-btn--cancel",
                    onClick: handleCancelarEdicion,
                    title: "Descartar cambios y restaurar valores anteriores"
                  },
                  h(
                    "svg",
                    { className: "matriz-btn-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", width: "16", height: "16" },
                    h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                    h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
                  ),
                  "Cancelar"
                )
              ),

          // Botón Imprimir / Exportar - Usando icono SVG en vez de emoji
          h(
            "button",
            {
              type: "button",
              className: "matriz-btn matriz-btn--primary",
              onClick: handleImprimir,
              title: "Imprimir o Guardar como PDF oficial"
            },
            h(
              "svg",
              { className: "matriz-btn-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", width: "16", height: "16" },
              h("polyline", { points: "6 9 6 2 18 2 18 9" }),
              h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
              h("rect", { x: "6", y: "14", width: "12", height: "8" })
            ),
            "Imprimir / PDF"
          ),

          // Botón Cerrar en la barra superior que permanece fijo al scrollear
          onCerrar
            ? h(
                "button",
                {
                  type: "button",
                  className: "matriz-close-btn-topright",
                  onClick: onCerrar,
                  "aria-label": "Cerrar modal",
                  title: "Cerrar"
                },
                h(
                  "svg",
                  { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", width: "18", height: "18" },
                  h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                  h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
                )
              )
            : null
        )
      ),

      // CONTENEDOR SCROLLABLE DEL DOCUMENTO
      h(
        "div",
        { className: "matriz-scroll-area" },

        // CONTENIDO OFICIAL DE LA MATRIZ (Idéntico a las fotos)
        h(
          "div",
          { className: "matriz-document-sheet" },

          // Marca de agua central oficial
          h("div", { className: "matriz-watermark", "aria-hidden": "true" }),

          // ENCABEZADO OFICIAL NACIONAL Y PROVINCIAL
          h(
            "header",
            { className: "matriz-official-header" },
            h(
              "div",
              { className: "matriz-header-top-row" },
              h(
                "div",
                { className: "matriz-qr-box" },
                h("img", {
                  src: `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=CERT-${datosEstudiante.numeroCertificado}-${datosEstudiante.dni}`,
                  alt: "QR Oficial",
                  className: "matriz-qr-img"
                })
              ),
              h(
                "div",
                { className: "matriz-national-title-block" },

                // LOGO DEL ESCUDO EN EL MEDIO ENTRE "República" Y "Argentina"
                h(
                  "div",
                  { className: "matriz-rep-title-wrap" },
                  h("span", { className: "matriz-rep-word" }, "República"),
                  h("img", {
                    src: "/assets/icons/escudo-argentina.svg",
                    onError: (e) => {
                      e.target.style.display = "none";
                    },
                    alt: "Escudo de la República Argentina",
                    className: "matriz-escudo-inline"
                  }),
                  h("span", { className: "matriz-rep-word" }, "Argentina")
                ),

                h("h2", { className: "matriz-sub-law" }, "LEY DE EDUCACIÓN NACIONAL Nº 26.206"),
                h("h2", { className: "matriz-sub-province" }, "PROVINCIA DE BUENOS AIRES"),
                h("h3", { className: "matriz-sub-prov-law" }, "LEY DE EDUCACIÓN PROVINCIAL Nº 13.688"),
                h("h3", { className: "matriz-sub-dept" }, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN"),
                h("h3", { className: "matriz-sub-dept-bold" }, "DIRECCIÓN DE EDUCACIÓN TÉCNICA")
              ),
              h(
                "div",
                { className: "matriz-serial-box" },
                h("span", { className: "matriz-serial-number" }, datosEstudiante.numeroCertificado)
              )
            ),

            // Párrafo Certificatorio Legal
            h(
              "div",
              { className: "matriz-certification-text" },
              "La autoridad del establecimiento educativo, ",
              h("strong", null, `${datosEstudiante.establecimientoNombre} CUE ${datosEstudiante.cue}`),
              ", ubicado en ",
              h("strong", null, datosEstudiante.domicilioEstablecimiento),
              ", de ",
              h("strong", null, datosEstudiante.localidad),
              ", provincia de ",
              h("strong", null, datosEstudiante.provincia),
              ", certifica que ",
              h("span", { className: "matriz-highlight-field" }, `${datosEstudiante.apellido} ${datosEstudiante.nombre}`),
              ", con lugar de nacimiento en ",
              h("strong", null, datosEstudiante.lugarNacimiento),
              ", el ",
              h("strong", null, datosEstudiante.fechaNacimiento),
              ", Tipo de Documento DNI Nº ",
              h("span", { className: "matriz-highlight-field" }, datosEstudiante.dni),
              ", aprobó los espacios curriculares que con sus respectivas calificaciones a continuación se expresan:"
            )
          ),

          // TABLAS POR AÑO CON DISEÑO ORIGINAL EXACTO Y ACCORDEÓN
          h(
            "div",
            { className: "matriz-tables-container" },
            aniosAMostrar.map((sec) => {
              const estaColapsado = aniosColapsados[sec.clave];

              return h(
                "section",
                { key: sec.clave, className: `matriz-year-section matriz-year-section--${sec.clave} ${estaColapsado ? "matriz-year-section--collapsed" : ""}` },
                h(
                  "table",
                  { className: "matriz-table" },
                  h(
                    "thead",
                    null,
                    // Fila de título de Año clickeable para colapsar/desplegar manteniendo el diseño exacto original
                    h(
                      "tr",
                      {
                        className: "matriz-table__header-year matriz-table__header-year--clickable",
                        onClick: () => toggleAnioColapso(sec.clave),
                        title: estaColapsado ? `Desplegar ${sec.titulo}` : `Contraer ${sec.titulo}`
                      },
                      h(
                        "th",
                        { colSpan: 6 },
                        h(
                          "svg",
                          {
                            className: `matriz-year-arrow ${estaColapsado ? "matriz-year-arrow--collapsed" : "matriz-year-arrow--open"}`,
                            viewBox: "0 0 20 20",
                            fill: "currentColor",
                            width: "14",
                            height: "14"
                          },
                          h("path", {
                            fillRule: "evenodd",
                            d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
                            clipRule: "evenodd"
                          })
                        ),
                        sec.titulo
                      )
                    ),
                    // Fila de encabezado de columnas (se oculta si está colapsado)
                    !estaColapsado
                      ? h(
                          "tr",
                          { className: "matriz-table__header-cols" },
                          h("th", { className: "col-espacio" }, "ESPACIO CURRICULAR"),
                          h("th", { className: "col-calif" }, "CALIFICACIÓN"),
                          h("th", { className: "col-cond" }, "CONDICIÓN"),
                          h("th", { className: "col-mes" }, "MES"),
                          h("th", { className: "col-anio" }, "AÑO"),
                          h("th", { className: "col-establ" }, "ESTABLECIMIENTO")
                        )
                      : null
                  ),
                  !estaColapsado
                    ? h(
                        "tbody",
                        null,
                        sec.materias.map((fila, filaIdx) =>
                          h(
                            "tr",
                            { key: `${sec.clave}-${filaIdx}`, className: "matriz-row" },
                            // Nombre de Materia
                            h("td", { className: "col-espacio-val" }, fila.materia),

                            // Calificación
                            h(
                              "td",
                              { className: "col-calif-val" },
                              modoEdicion
                                ? h("input", {
                                    type: "text",
                                    className: "matriz-input-inline",
                                    value: fila.calificacion,
                                    onChange: (e) =>
                                      handleFilaChange(sec.clave, filaIdx, "calificacion", e.target.value)
                                  })
                                : fila.calificacionTexto || fila.calificacion
                            ),

                            // Condición con desplegable estilizado
                            h(
                              "td",
                              { className: "col-cond-val" },
                              modoEdicion
                                ? h(TableCustomDropdown, {
                                    value: fila.condicion,
                                    opciones: opcionesCondicion,
                                    onChange: (val) =>
                                      handleFilaChange(sec.clave, filaIdx, "condicion", val)
                                  })
                                : fila.condicion
                            ),

                            // Mes con desplegable estilizado
                            h(
                              "td",
                              { className: "col-mes-val" },
                              modoEdicion
                                ? h(TableCustomDropdown, {
                                    value: fila.mes,
                                    opciones: opcionesMes,
                                    onChange: (val) =>
                                      handleFilaChange(sec.clave, filaIdx, "mes", val)
                                  })
                                : fila.mes
                            ),

                            // Año
                            h(
                              "td",
                              { className: "col-anio-val" },
                              modoEdicion
                                ? h("input", {
                                    type: "text",
                                    className: "matriz-input-inline matriz-input-anio",
                                    value: fila.anio,
                                    onChange: (e) =>
                                      handleFilaChange(sec.clave, filaIdx, "anio", e.target.value)
                                  })
                                : fila.anio
                            ),

                            // Establecimiento
                            h(
                              "td",
                              { className: "col-establ-val" },
                              modoEdicion
                                ? h("input", {
                                    type: "text",
                                    className: "matriz-input-inline",
                                    value: fila.establecimiento,
                                    onChange: (e) =>
                                      handleFilaChange(sec.clave, filaIdx, "establecimiento", e.target.value)
                                  })
                                : fila.establecimiento
                            )
                          )
                        )
                      )
                    : null
                )
              );
            })
          ),

          // SECCIÓN INFERIOR Y PIE DE PÁGINA OFICIAL
          h(
            "footer",
            { className: "matriz-official-footer" },

            // Promedio y Observaciones
            h(
              "div",
              { className: "matriz-promedio-block" },
              h(
                "p",
                { className: "matriz-promedio-text" },
                h("strong", null, "PROMEDIO GENERAL: "),
                promedioTexto
              ),
              h(
                "p",
                { className: "matriz-obs-text" },
                h("strong", null, "Observaciones: "),
                infoOrientacionActiva.observaciones
              )
            ),

            // Texto de Titulación y Validez
            h(
              "div",
              { className: "matriz-titulacion-block" },
              h(
                "p",
                null,
                h("span", { className: "matriz-highlight-field" }, `${datosEstudiante.apellido} ${datosEstudiante.nombre}`),
                ", con tipo de documento DNI Nº ",
                h("span", { className: "matriz-highlight-field" }, datosEstudiante.dni),
                " obtuvo el TITULO de ",
                h("strong", null, infoOrientacionActiva.nombreTitulo),
                " que se corresponde con ",
                h("strong", null, "Educación Secundaria Completa"),
                "."
              ),
              h(
                "p",
                null,
                h("strong", null, "NORMA JURISD. DE APROB. PLAN DE ESTUDIOS: "),
                infoOrientacionActiva.resolucion
              ),
              h(
                "p",
                null,
                h("strong", null, "VALIDEZ NACIONAL otorgada por: "),
                datosEstudiante.validezNacional
              ),
              h(
                "p",
                null,
                h("strong", null, "Fecha de egreso: "),
                datosEstudiante.fechaEgreso
              ),
              h(
                "p",
                null,
                h("strong", null, `Libro Matriz Nº ${datosEstudiante.libroMatriz} Folio Nº ${datosEstudiante.folio}`)
              ),
              h(
                "p",
                null,
                `Otorgado en la localidad de `,
                h("strong", null, datosEstudiante.localidad),
                ` , provincia de `,
                h("strong", null, datosEstudiante.provincia),
                `, República Argentina, el día `,
                datosEstudiante.fechaEmision
              )
            ),

            // Sección de Firmas y Sellos Digitales
            h(
              "div",
              { className: "matriz-signatures-grid" },
              // Firma Izquierda: Responsable Institucional
              h(
                "div",
                { className: "matriz-sig-box matriz-sig-box--left" },
                h("div", { className: "matriz-sig-line" }),
                h("p", { className: "matriz-sig-name" }, datosEstudiante.responsableInstitucional),
                h("p", { className: "matriz-sig-role" }, "RESPONSABLE INSTITUCIONAL"),
                h("p", { className: "matriz-sig-school" }, datosEstudiante.establecimientoNombre)
              ),

              // Firma Derecha: Firma Digital Legalizador
              h(
                "div",
                { className: "matriz-sig-box matriz-sig-box--right" },
                h(
                  "div",
                  { className: "matriz-digital-signature" },
                  h("p", null, `Firmado digitalmente por ${datosEstudiante.agenteLegalizador}`),
                  h("p", null, "Fecha: 2025-03-25 15:42:02.665 ART"),
                  h("p", null, "Ubicación: Buenos Aires"),
                  h("p", { className: "matriz-digital-agent" }, datosEstudiante.agenteLegalizador),
                  h("p", null, "Agente Legalizador"),
                  h("p", null, "Subsecretaría de Educación"),
                  h("p", null, "Dirección General de Cultura y Educación")
                )
              )
            ),

            // Pie con código QR y Serie final
            h(
              "div",
              { className: "matriz-footer-bottom-row" },
              h(
                "div",
                { className: "matriz-qr-box" },
                h("img", {
                  src: `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=MATRIZ-${datosEstudiante.numeroCertificado}`,
                  alt: "QR Validación",
                  className: "matriz-qr-img"
                })
              ),
              h("div", { className: "matriz-serial-bottom" }, datosEstudiante.numeroCertificado)
            )
          )
        )
      )
    )
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

// Vista Completa por si se navega directamente a #/alumnos/matriz o #/libro-matriz
export default function AlumnoMatrizView() {
  const [modalAbierto, setModalAbierto] = useState(true);

  return h(
    "div",
    { className: "matriz-view-page" },
    h(
      "div",
      { className: "matriz-view-header" },
      h("h1", null, "Libro Matriz y Certificado Analítico de Alumnos"),
      h(
        "p",
        null,
        "Gestión y emisión oficial de la matriz curricular para 1° a 3° (Ciclo Básico) y 4° a 7° (Técnico en Programación / Técnico en Informática)."
      ),
      h(
        "button",
        {
          type: "button",
          className: "action-button action-button--primary",
          onClick: () => setModalAbierto(true)
        },
        "Abrir Modal de Matriz"
      )
    ),
    h(AlumnoMatrizModal, {
      abierto: modalAbierto,
      onCerrar: () => setModalAbierto(false)
    })
  );
}
