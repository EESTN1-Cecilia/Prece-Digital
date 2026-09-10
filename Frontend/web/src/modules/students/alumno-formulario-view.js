import { useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { FormCard, TituloSeccion } from "../../components/form-card.js";
import { Boton, Campo, Select } from "../../components/ui/index.js";

/* Figma: "Cargar Alumno" (2237:2). */

const CURSOS = ["1°", "2°", "3°", "4°", "5°", "6°", "7°"];
const DIVISIONES = ["1", "2", "3", "4", "5", "6"];
const TURNOS = ["Mañana", "Tarde", "Ambos"];
const ESTADOS = ["Activo", "Inactivo", "Pase pendiente"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const MODULOS = ["1", "2", "3", "4", "5", "6", "7", "8"];

function BloqueAlumno({ indice }) {
  const prefijo = `alumno-${indice}`;

  return h(
    "section",
    { className: "form-block" },
    h(TituloSeccion, null, "Alumno"),
    h(Campo, {
      etiqueta: "Nombre:",
      id: `${prefijo}-nombre`,
      placeholder: "Ingrese nombre...."
    }),
    h(Campo, {
      etiqueta: "Apellido:",
      id: `${prefijo}-apellido`,
      placeholder: "Ingrese apellido...."
    }),
    h(Campo, {
      etiqueta: "DNI:",
      id: `${prefijo}-dni`,
      placeholder: "Ingrese DNI...."
    }),
    h(Campo, {
      etiqueta: "Fecha de Nacimiento:",
      id: `${prefijo}-nacimiento`,
      tipo: "date"
    }),
    h(Select, {
      etiqueta: "Curso:",
      id: `${prefijo}-curso`,
      opciones: CURSOS,
      placeholder: "Curso"
    }),
    h(Select, {
      etiqueta: "División:",
      id: `${prefijo}-division`,
      opciones: DIVISIONES,
      placeholder: "División"
    }),
    h(Select, {
      etiqueta: "Turno:",
      id: `${prefijo}-turno`,
      opciones: TURNOS,
      placeholder: "Turno"
    }),
    h(Select, {
      etiqueta: "Estado:",
      id: `${prefijo}-estado`,
      opciones: ESTADOS,
      placeholder: "Estado"
    }),
    h(Campo, {
      etiqueta: "Fecha de ingreso:",
      id: `${prefijo}-ingreso`,
      tipo: "date"
    }),
    h(
      "div",
      { className: "form-field" },
      h("label", { htmlFor: `${prefijo}-documentos` }, "Documentos:"),
      h(
        "button",
        { className: "form-upload", id: `${prefijo}-documentos`, type: "button" },
        "Cargar Documentos"
      )
    )
  );
}

export default function AlumnoFormularioView() {
  /* El Figma dibuja dos bloques "Alumno" para mostrar la grilla de dos
     columnas, no porque se carguen dos alumnos a la vez. Arranca en uno y la
     tarjeta se ensancha recien cuando hay mas de uno. */
  const [alumnos, setAlumnos] = useState(1);
  const [modulos, setModulos] = useState(1);

  return h(
    FormCard,
    { titulo: "Cargar Alumno", ancho: alumnos > 1 },
    h(
      "div",
      { className: "form-grid" },
      Array.from({ length: alumnos }, (_, indice) => h(BloqueAlumno, { key: indice, indice }))
    ),
    h(
      "div",
      { className: "form-links" },
      /* El Figma rotula este enlace "Agregar curso": es texto heredado de
         "Crear Cuenta - Secretaria". Aca el bloque repetible es el alumno. */
      h(
        "button",
        {
          className: "form-link",
          type: "button",
          onClick: () => setAlumnos((actuales) => actuales + 1)
        },
        "Agregar alumno"
      )
    ),
    h(
      "section",
      { className: "form-block form-block--centrado" },
      h(TituloSeccion, null, "Tutor"),
      Array.from({ length: modulos }, (_, fila) =>
        h(
          "div",
          { key: fila },
          h(Select, {
            etiqueta: fila === 0 ? "Módulos:" : undefined,
            id: `tutor-dia-${fila}`,
            opciones: DIAS,
            placeholder: "Día"
          }),
          h(Select, {
            id: `tutor-modulo-${fila}`,
            opciones: MODULOS,
            placeholder: "Módulo"
          })
        )
      ),
      h(
        "div",
        { className: "form-links form-links--derecha" },
        h(
          "button",
          {
            className: "form-link",
            type: "button",
            onClick: () => setModulos((actuales) => actuales + 1)
          },
          "Agregar día y módulo"
        )
      )
    ),
    h(
      "div",
      { className: "form-block--centrado" },
      h(Boton, { className: "form-submit", tipo: "submit", ancho: true }, "Cargar Usuario")
    )
  );
}
