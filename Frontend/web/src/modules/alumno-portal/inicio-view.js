/* Inicio del alumno: saludo, cuatro indicadores y sus datos personales.
   Los numeros salen del backend (perfil), calculados con las mismas reglas que
   cada seccion. Es de solo lectura. */

import { h, Cargando, ErrorCarga, Icono, useDatos } from "./componentes.js";
import { obtenerBoletin, obtenerPerfil } from "./portal-api.js";

const mayuscula = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : null);

function Indicador({ icono, titulo, valor, detalle, detalleVacio, href }) {
  return h(
    "li",
    null,
    h(
      "a",
      { className: "pa-kpi", href },
      h("span", { className: "pa-kpi__icono" }, h(Icono, { nombre: icono, tamano: 26 })),
      h(
        "span",
        { className: "pa-kpi__cuerpo" },
        h("span", { className: "pa-kpi__titulo" }, titulo),
        h("strong", { className: `pa-kpi__valor ${valor ? "pa-kpi__valor--activo" : ""}` }, valor ?? "—"),
        h("span", { className: "pa-kpi__detalle" }, valor === null ? (detalleVacio ?? "") : valor ? detalle : "Sin registros hasta el momento")
      ),
      h(Icono, { nombre: "chevron", tamano: 18 })
    )
  );
}

function Dato({ icono, etiqueta, valor }) {
  return h("div", { className: "pa-dato-ico" }, h(Icono, { nombre: icono, tamano: 26 }), h("div", null, h("dt", null, etiqueta), h("dd", null, valor ?? "—")));
}

export default function InicioAlumnoView() {
  const { cargando, error, datos, recargar } = useDatos(() => obtenerPerfil(), []);
  // Materias aprobadas: mismo conteo que el resumen de Mi Boletin (estado "Aprobada").
  const boletin = useDatos(() => obtenerBoletin(), []);
  const aprobadas = boletin.datos ? boletin.datos.materias.filter((materia) => materia.estadoActual === "aprobada").length : null;

  if (cargando && !datos) return h(Cargando);
  if (error) return h(ErrorCarga, { error, onReintentar: recargar });

  const { datosPersonales: alumno, resumen } = datos;
  const taller = alumno.grupoTaller
    ? [alumno.grupoTaller.taller, alumno.grupoTaller.grupo ? `Grupo ${alumno.grupoTaller.grupo}` : null].filter(Boolean).join(" · ")
    : "No corresponde";

  return h(
    "div",
    { className: "pa-pagina pa-inicio" },
    h(
      "section",
      { className: "pa-saludo" },
      h("h1", { className: "pa-saludo__titulo" }, "¡Hola, ", h("span", null, `${alumno.nombre}!`)),
      h("p", { className: "pa-saludo__ciclo" }, `Ciclo lectivo ${alumno.cicloLectivo}`),
      h("span", { className: "pa-saludo__linea", "aria-hidden": "true" })
    ),
    h(
      "ul",
      { className: "pa-kpis" },
      h(Indicador, { icono: "usuario", titulo: "Ausentes", valor: resumen.ausentes, detalle: "Inasistencias registradas", href: "#/mi-perfil/asistencias" }),
      h(Indicador, { icono: "libro", titulo: "Materias con TEP", valor: resumen.materiasConTep, detalle: "Trayectoria en proceso", href: "#/mi-perfil/situacion-academica" }),
      h(Indicador, { icono: "tilde", titulo: "Materias aprobadas", valor: aprobadas, detalle: "En el ciclo actual", detalleVacio: boletin.error ? "No se pudo cargar" : "Cargando...", href: "#/mi-perfil/boletin" }),
      h(Indicador, { icono: "portapapeles", titulo: "Previas pendientes", valor: resumen.previasPendientes, detalle: "De ciclos anteriores", href: "#/mi-perfil/previas" })
    ),
    h(
      "section",
      { className: "pa-misdatos", "aria-labelledby": "pa-misdatos-titulo" },
      h(
        "div",
        { className: "pa-misdatos__cabecera" },
        h("span", { className: "pa-kpi__icono" }, h(Icono, { nombre: "usuario", tamano: 26 })),
        h("div", null, h("h2", { id: "pa-misdatos-titulo" }, "Mis datos"), h("span", { className: "pa-saludo__linea", "aria-hidden": "true" })),
        h("span", { className: "pa-misdatos__barras", "aria-hidden": "true" })
      ),
      h(
        "dl",
        { className: "pa-misdatos__grilla" },
        h(Dato, { icono: "usuario", etiqueta: "Apellido y nombre", valor: alumno.nombreCompleto }),
        h(Dato, { icono: "tarjeta", etiqueta: "DNI", valor: alumno.dni }),
        h(Dato, { icono: "grupo", etiqueta: "Curso y división", valor: alumno.cursoDivision }),
        h(Dato, { icono: "sol", etiqueta: "Turno", valor: mayuscula(alumno.turno) }),
        h(Dato, { icono: "birrete", etiqueta: "Orientación", valor: alumno.orientacion ?? (alumno.curso <= 3 ? "Ciclo Básico" : null) }),
        h(Dato, { icono: "calendario", etiqueta: "Ciclo lectivo", valor: alumno.cicloLectivo }),
        h(Dato, { icono: "engranaje", etiqueta: "Grupo de taller", valor: taller })
      ),
      h("p", { className: "pa-misdatos__nota" }, h(Icono, { nombre: "info", tamano: 18 }), "Si algún dato no es correcto, acercate a Secretaría: desde el portal no se pueden modificar.")
    )
  );
}
