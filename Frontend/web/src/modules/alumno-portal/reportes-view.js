/* Mis Reportes: acceso directo a los informes del alumno. No genera datos
   propios: cada tarjeta abre la seccion que ya muestra (y permite imprimir)
   el informe con la informacion oficial. */

import { h, Encabezado, Icono } from "./componentes.js";

const REPORTES = [
  { icono: "libro", titulo: "Boletín", texto: "Calificaciones por período y estado de cada materia. Se imprime en A4.", href: "#/mi-perfil/boletin" },
  { icono: "calendario", titulo: "Asistencias", texto: "Inasistencias, llegadas tarde y retiros anticipados, con su justificación.", href: "#/mi-perfil/asistencias" },
  { icono: "grafico", titulo: "Situación académica", texto: "Materias con TEP, notas menores a 6 y materias pendientes.", href: "#/mi-perfil/situacion-academica" },
  { icono: "portapapeles", titulo: "Previas", texto: "Materias pendientes de aprobación de ciclos anteriores.", href: "#/mi-perfil/previas" }
];

export default function ReportesAlumnoView() {
  return h(
    "div",
    { className: "pa-pagina" },
    h(Encabezado, { titulo: "Mis Reportes", descripcion: "Consultá e imprimí tus informes académicos." }),
    h(
      "ul",
      { className: "pa-reportes" },
      REPORTES.map((reporte) =>
        h(
          "li",
          { key: reporte.href },
          h(
            "a",
            { className: "pa-reporte", href: reporte.href },
            h("span", { className: "pa-kpi__icono" }, h(Icono, { nombre: reporte.icono, tamano: 24 })),
            h("span", { className: "pa-reporte__texto" }, h("strong", null, reporte.titulo), h("span", null, reporte.texto)),
            h(Icono, { nombre: "chevron", tamano: 18 })
          )
        )
      )
    )
  );
}
