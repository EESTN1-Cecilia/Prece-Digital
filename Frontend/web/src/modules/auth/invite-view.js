import { useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { FormCard, TituloSeccion } from "../../components/form-card.js";
import { Boton, Campo, Select } from "../../components/ui/index.js";

/* Listas tomadas del recuadro de notas del Figma (Frame 92). */
const ROLES = ["Preceptor", "Docente", "Secretario", "Directivo", "Jefe de área", "Admin", "Superadmin"];
const TURNOS = ["Mañana", "Tarde", "Ambos"];
const MODALIDADES = ["Aula", "Taller", "Ambas"];
const GRADOS = ["1°", "2°", "3°", "4°", "5°", "6°", "7°"];
const GRUPOS = ["1", "2", "3", "4", "5", "6"];
const AREAS = ["Matemática", "Lengua", "Historia", "Geografía", "Taller", "Informática"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const MODULOS = ["1", "2", "3", "4", "5", "6", "7", "8"];

function BloqueCurso({ indice, modulos, onAgregarModulo }) {
  const prefijo = `curso-${indice}`;

  return h(
    "section",
    { className: "form-block" },
    h(TituloSeccion, null, "Asignar Curso"),
    h(Select, {
      etiqueta: "Turno:",
      id: `${prefijo}-turno`,
      opciones: TURNOS,
      placeholder: "Turno"
    }),
    h(Select, {
      etiqueta: "Modalidad:",
      id: `${prefijo}-modalidad`,
      opciones: MODALIDADES,
      placeholder: "Modalidad"
    }),
    h(Select, {
      etiqueta: "Cursos:",
      id: `${prefijo}-grado`,
      opciones: GRADOS,
      placeholder: "Grado"
    }),
    h(Select, {
      id: `${prefijo}-grupo`,
      opciones: GRUPOS,
      placeholder: "Grupo"
    }),
    h(Select, {
      etiqueta: "Área:",
      id: `${prefijo}-area`,
      opciones: AREAS,
      placeholder: "Área"
    }),
    Array.from({ length: modulos }, (_, fila) =>
      h(
        "div",
        { key: fila },
        h(Select, {
          etiqueta: fila === 0 ? "Módulos:" : undefined,
          id: `${prefijo}-dia-${fila}`,
          opciones: DIAS,
          placeholder: "Día"
        }),
        h(Select, {
          id: `${prefijo}-modulo-${fila}`,
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
        { className: "form-link", type: "button", onClick: onAgregarModulo },
        "Agregar día y módulo"
      )
    )
  );
}

/* Figma: "Crear Cuenta - Secretaria" (2140:252). */
export default function InviteView() {
  const [cursos, setCursos] = useState([1]);

  const agregarModulo = (indice) =>
    setCursos((actuales) => actuales.map((filas, i) => (i === indice ? filas + 1 : filas)));

  return h(
    FormCard,
    { titulo: "Invitar Usuario" },
    h(TituloSeccion, null, "Usuario"),
    h(Campo, {
      etiqueta: "Correo institucional:",
      id: "correo",
      tipo: "text",
      placeholder: "Ingrese su correo....",
      sufijo: "@abc.gob.ar"
    }),
    h(Campo, { etiqueta: "Nombre:", id: "nombre", placeholder: "Ingrese nombre...." }),
    h(Campo, { etiqueta: "Apellido:", id: "apellido", placeholder: "Ingrese apellido...." }),
    h(Select, { etiqueta: "Rol:", id: "rol", opciones: ROLES, placeholder: "Docente" }),
    cursos.map((modulos, indice) =>
      h(BloqueCurso, {
        key: indice,
        indice,
        modulos,
        onAgregarModulo: () => agregarModulo(indice)
      })
    ),
    h(
      "div",
      { className: "form-links" },
      h(
        "button",
        {
          className: "form-link",
          type: "button",
          onClick: () => setCursos((actuales) => [...actuales, 1])
        },
        "Agregar curso"
      )
    ),
    h(Boton, { className: "form-submit", tipo: "submit", ancho: true }, "Cargar Usuario")
  );
}
