/* Contenido del inicio de Secretaria: tareas, documentos y la lista "Para
   revisar" escrita en lenguaje simple. Sin React, para poder probarlo con
   node --test. */

/* Tareas principales. `href` navega; sin `href` la vista abre un modal. */
export const ACCIONES = [
  { id: "buscar-alumno", titulo: "Buscar un alumno", ayuda: "Ver su ficha, legajo y boletín", icono: "buscar", tono: "azul", href: "#/alumnos" },
  { id: "inscribir", titulo: "Inscribir un alumno", ayuda: "Cargar un alumno nuevo o una lista de Excel", icono: "inscribir", tono: "verde", href: "#/alumnos/nuevo" },
  { id: "boletines", titulo: "Boletines y notas", ayuda: "Ver, corregir e imprimir boletines", icono: "boletin", tono: "violeta", href: "#/boletines" },
  { id: "documentos", titulo: "Constancias y certificados", ayuda: "Alumno regular, situación académica, pase y RITE", icono: "documento", tono: "azul" },
  { id: "asistencias", titulo: "Asistencias", ayuda: "Planillas de asistencia de cada curso", icono: "asistencia", tono: "ambar", href: "#/asistencias" },
  { id: "cursos", titulo: "Cursos y divisiones", ayuda: "Qué alumnos hay en cada curso", icono: "cursos", tono: "verde", href: "#/cursos" },
  { id: "observaciones", titulo: "Observaciones", ayuda: "Seguimiento y conducta de los alumnos", icono: "observaciones", tono: "violeta", href: "#/preceptoria/observaciones" },
  { id: "libro-matriz", titulo: "Libro Matriz", ayuda: "Consultar e imprimir el Libro Matriz", icono: "libro", tono: "ambar" }
];

/* Documentos que abre el gestor global de documentos (evento
   "prece:open_document_modal", ver layouts/site-layout.js). */
export const DOCUMENTOS = [
  { tipo: "alumno_regular", titulo: "Constancia de alumno regular", ayuda: "Para presentar en trámites, obra social o trabajo de la familia." },
  { tipo: "situacion_academica", titulo: "Constancia de situación académica", ayuda: "Detalle de materias aprobadas y adeudadas." },
  { tipo: "tramite_pase", titulo: "Certificado de pase", ayuda: "Cuando el alumno se cambia a otra escuela." },
  { tipo: "rite", titulo: "RITE", ayuda: "Registro institucional de trayectorias educativas." }
];

const ORDEN_URGENCIA = { alta: 0, media: 1, baja: 2 };

export function plural(cantidad, singular, pluralTexto) {
  return `${cantidad} ${palabra(cantidad, singular, pluralTexto)}`;
}

export function palabra(cantidad, singular, pluralTexto) {
  return Number(cantidad) === 1 ? singular : pluralTexto;
}

/* Lo que dice cada alerta del backend, en palabras de todos los dias. */
function motivoDeAlerta(alerta) {
  const titulo = String(alerta.titulo ?? "");
  const materias = /^(\d+)\s+materia/i.exec(titulo);

  if (materias) return `${plural(Number(materias[1]), "materia sin aprobar", "materias sin aprobar")}.`;
  if (/irregular/i.test(titulo)) return "Su condición figura como irregular.";
  if (/legajo incompleto/i.test(titulo)) return "Faltan datos en el legajo: fecha de nacimiento o domicilio.";
  return titulo;
}

function motivoDeFaltas({ injustificadas = 0, pendientes = 0 }) {
  const total = plural(injustificadas + pendientes, "falta sin justificar", "faltas sin justificar");
  if (!injustificadas || !pendientes) return `${total}.`;
  return `${total}: ${injustificadas} sin justificación y ${pendientes} esperando nota.`;
}

/* Une las alertas del tablero y los alumnos con muchas faltas sin justificar
   en UNA fila por alumno, con todos sus motivos, ordenada por urgencia. */
export function itemsParaRevisar(data) {
  if (!data) return [];

  const sueltos = [
    ...(data.alertas ?? []).map((alerta) => ({
      clave: alerta.recurso || alerta.alumno,
      alumno: alerta.alumno,
      motivo: motivoDeAlerta(alerta),
      alertaId: alerta.id,
      urgencia: ORDEN_URGENCIA[alerta.prioridad] !== undefined ? alerta.prioridad : "media",
      href: alerta.recurso || null
    })),
    ...(data.inasistencias?.alumnosAtencion ?? []).map((alumno) => ({
      clave: `#/alumnos/${encodeURIComponent(alumno.id)}`,
      alumno: `${alumno.nombre} (${alumno.curso})`,
      motivo: motivoDeFaltas(alumno),
      alertaId: null,
      urgencia: /cr[ií]tico/i.test(alumno.estado ?? "") ? "alta" : "media",
      href: `#/alumnos/${encodeURIComponent(alumno.id)}`
    }))
  ];

  const porAlumno = new Map();
  sueltos.forEach((item, indice) => {
    const grupo = porAlumno.get(item.clave) ?? { id: item.clave, alumno: item.alumno, href: item.href, motivos: [], alertaIds: [], urgencia: "baja", indice };
    grupo.motivos.push(item.motivo);
    if (item.alertaId) grupo.alertaIds.push(item.alertaId);
    if (ORDEN_URGENCIA[item.urgencia] < ORDEN_URGENCIA[grupo.urgencia]) grupo.urgencia = item.urgencia;
    porAlumno.set(item.clave, grupo);
  });

  return [...porAlumno.values()]
    .sort((a, b) => ORDEN_URGENCIA[a.urgencia] - ORDEN_URGENCIA[b.urgencia] || b.motivos.length - a.motivos.length || a.indice - b.indice)
    .map(({ indice, ...grupo }) => grupo);
}

export function saludo(fecha = new Date(), nombre = null) {
  const hora = fecha.getHours();
  const texto = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  return nombre ? `${texto}, ${nombre}` : texto;
}

/* "Hoy es lunes 2 de noviembre de 2026" */
export function fechaLarga(fecha = new Date()) {
  const texto = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(fecha).replace(",", "");
  return `Hoy es ${texto}`;
}
