/* Detalle de un docente: legajo completo y asignaciones academicas.

   Las asignaciones (materias y cursos/divisiones, con su periodo y rol) se leen
   del backend al abrir; se muestran tambien las dadas de baja para conservar el
   historial a la vista. */

import { useEffect, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import {
  Acciones,
  Badge,
  BadgeEstado,
  Boton,
  Cargando,
  Dato,
  ListaDatos,
  MensajeError,
  Modal,
  SinDatos
} from "../../../components/ui/index.js";
import { fecha } from "../../../utils/formato.js";
import { DocentesService } from "../docentes-service.js";
import { iniciales, tonoAvatar } from "../docentes-validacion.js";

const PESTANAS = [
  { id: "datos", titulo: "Datos del docente" },
  { id: "asignaciones", titulo: "Asignaciones" }
];

const ROLES = { titular: "Titular", suplente: "Suplente", ayudante: "Ayudante" };

function alcance(asignacion) {
  const curso = asignacion.curso ? `${asignacion.curso.anio}° año` : null;
  const division = asignacion.division?.nombre ?? null;
  return [curso, division].filter(Boolean).join(" · ") || "Todos los cursos";
}

function TablaAsignaciones({ titulo, filas, columnas, vacio }) {
  return h(
    "section",
    { className: "docentes-detalle__bloque" },
    h("h3", { className: "docentes-form__seccion" }, titulo),
    filas.length
      ? h(
          "div",
          { className: "ui-tabla__scroll", tabIndex: 0, role: "region", "aria-label": titulo },
          h(
            "table",
            { className: "ui-tabla docentes-detalle__tabla" },
            h("thead", null, h("tr", null, columnas.map((columna) => h("th", { key: columna.id, scope: "col" }, columna.titulo)))),
            h(
              "tbody",
              null,
              filas.map((fila) =>
                h(
                  "tr",
                  { key: fila.id, className: fila.estado === "inactivo" ? "docentes-detalle__fila--baja" : undefined },
                  columnas.map((columna) => h("td", { key: columna.id }, columna.celda(fila)))
                )
              )
            )
          )
        )
      : h("p", { className: "docentes-detalle__vacio" }, vacio)
  );
}

export function DocenteDetalleModal({ abierto, docente, pestanaInicial = "datos", alCerrar, acciones }) {
  const [pestana, setPestana] = useState(pestanaInicial);
  const [asignaciones, setAsignaciones] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (abierto) {
      setPestana(pestanaInicial);
    }
  }, [abierto, pestanaInicial, docente?.id]);

  useEffect(() => {
    if (!abierto || !docente?.id) {
      return undefined;
    }

    let vigente = true;
    setCargando(true);
    setError(null);

    DocentesService.asignaciones(docente.id)
      .then((respuesta) => vigente && setAsignaciones(respuesta))
      .catch((fallo) => vigente && setError(fallo))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [abierto, docente?.id, recarga]);

  if (!docente) {
    return null;
  }

  const datos = h(
    "div",
    { className: "docentes-detalle__datos" },
    h(
      ListaDatos,
      null,
      h(Dato, { etiqueta: "Apellido y nombre" }, docente.nombreCompleto),
      h(Dato, { etiqueta: "Documento" }, `${String(docente.tipoDocumento ?? "dni").toUpperCase()} ${docente.documento}`),
      h(Dato, { etiqueta: "Correo electrónico" }, docente.email ? h("a", { href: `mailto:${docente.email}` }, docente.email) : "—"),
      h(Dato, { etiqueta: "Teléfono" }, docente.telefono || "—"),
      h(Dato, { etiqueta: "Área / departamento" }, docente.areaNombre || "Sin área asignada"),
      h(Dato, { etiqueta: "Título" }, docente.titulo || "—"),
      h(
        Dato,
        { etiqueta: "Especialidades" },
        docente.especialidades?.length
          ? h("div", { className: "docentes-chips" }, docente.especialidades.map((item) => h(Badge, { key: item, tono: "info" }, item)))
          : "—"
      ),
      h(Dato, { etiqueta: "Estado" }, h(BadgeEstado, { estado: docente.estado })),
      h(Dato, { etiqueta: "Alta en el sistema" }, fecha(docente.creadoEn)),
      h(Dato, { etiqueta: "Última modificación" }, fecha(docente.actualizadoEn)),
      docente.fechaBaja ? h(Dato, { etiqueta: "Fecha de baja" }, fecha(docente.fechaBaja)) : null,
      h(Dato, { etiqueta: "Cuenta de acceso" }, docente.userId ? "Vinculada a un usuario del sistema" : "Sin cuenta vinculada")
    )
  );

  let contenidoAsignaciones;

  if (error) {
    contenidoAsignaciones = h(MensajeError, { error, onReintentar: () => setRecarga((valor) => valor + 1) });
  } else if (cargando || !asignaciones) {
    contenidoAsignaciones = h(Cargando, { texto: "Cargando asignaciones..." });
  } else if (!asignaciones.materias.length && !asignaciones.cursos.length) {
    contenidoAsignaciones = h(SinDatos, {
      titulo: "Sin asignaciones académicas",
      descripcion: "Este docente todavía no tiene materias ni cursos asignados."
    });
  } else {
    contenidoAsignaciones = h(
      "div",
      { className: "docentes-detalle__asignaciones" },
      h(TablaAsignaciones, {
        titulo: "Materias",
        filas: asignaciones.materias,
        vacio: "Sin materias asignadas.",
        columnas: [
          { id: "materia", titulo: "Materia", celda: (fila) => fila.materia?.nombre ?? fila.materiaId },
          { id: "alcance", titulo: "Curso / división", celda: alcance },
          { id: "periodo", titulo: "Período", celda: (fila) => fila.periodo?.etiqueta ?? "—" },
          { id: "horas", titulo: "Hs. semanales", celda: (fila) => fila.horasSemanales ?? "—" },
          { id: "estado", titulo: "Estado", celda: (fila) => h(BadgeEstado, { estado: fila.estado }) }
        ]
      }),
      h(TablaAsignaciones, {
        titulo: "Cursos y divisiones",
        filas: asignaciones.cursos,
        vacio: "Sin cursos o divisiones asignados.",
        columnas: [
          { id: "alcance", titulo: "Curso / división", celda: alcance },
          { id: "rol", titulo: "Rol", celda: (fila) => ROLES[fila.rol] ?? fila.rol ?? "—" },
          { id: "periodo", titulo: "Período", celda: (fila) => fila.periodo?.etiqueta ?? "—" },
          { id: "estado", titulo: "Estado", celda: (fila) => h(BadgeEstado, { estado: fila.estado }) }
        ]
      })
    );
  }

  return h(
    Modal,
    {
      abierto,
      titulo: "Detalle del docente",
      tamano: "grande",
      className: "director-modal",
      classNameFondo: "director-modal-fondo",
      onCerrar: alCerrar,
      acciones: h(
        Acciones,
        null,
        acciones,
        h(Boton, { variante: "contorno", onClick: alCerrar }, "Cerrar")
      )
    },
    h(
      "div",
      { className: "docentes-detalle__cabecera" },
      h("span", { className: `docentes-avatar docentes-avatar--grande docentes-avatar--${tonoAvatar(docente.id)}`, "aria-hidden": "true" }, iniciales(docente)),
      h(
        "div",
        null,
        h("strong", { className: "docentes-detalle__nombre" }, `${docente.nombre} ${docente.apellido}`),
        h("span", { className: "docentes-detalle__sub" }, [docente.titulo, docente.areaNombre].filter(Boolean).join(" · ") || "Docente")
      )
    ),
    h(
      "div",
      { className: "docentes-pestanas", role: "tablist", "aria-label": "Secciones del detalle" },
      PESTANAS.map((item) =>
        h(
          "button",
          {
            key: item.id,
            type: "button",
            role: "tab",
            id: `docente-pestana-${item.id}`,
            "aria-selected": pestana === item.id,
            "aria-controls": `docente-panel-${item.id}`,
            className: `director-tab-btn ${pestana === item.id ? "director-tab-btn--active" : ""}`,
            onClick: () => setPestana(item.id)
          },
          item.titulo
        )
      )
    ),
    h(
      "div",
      { role: "tabpanel", id: `docente-panel-${pestana}`, "aria-labelledby": `docente-pestana-${pestana}` },
      pestana === "datos" ? datos : contenidoAsignaciones
    )
  );
}
