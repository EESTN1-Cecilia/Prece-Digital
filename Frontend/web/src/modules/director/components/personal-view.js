/* Vista de personal: listado en tabla o en tarjetas.

   Las dos formas de ver el listado salen de la misma fuente de datos y de los
   mismos filtros, de modo que cambiar de vista no cambia lo que se esta
   mirando. Los filtros se pueden combinar entre si (busqueda + rol + estado +
   area) y el contador dice cuantos members quedan. */

import React, { useMemo, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import {
  Busqueda,
  Filtro,
  Tabla,
  Boton,
  Esqueleto,
  SinResultados,
  SinDatos,
  MensajeError
} from "../../../components/ui/index.js";
import { ROLES_DISPONIBLES } from "../director-service.js";
import { filtrarPersonal, resumenFiltro } from "../director-filtros.js";

const ESTADOS = [
  { id: "activo", nombre: "Solo activos" },
  { id: "inactivo", nombre: "Solo inactivos" }
];

const VISTAS = [
  { id: "lista", nombre: "Lista" },
  { id: "tarjetas", nombre: "Tarjetas" }
];

function iniciales(nombreCompleto) {
  return String(nombreCompleto ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

function columnaPersonal(fila) {
  return h(
    "div",
    { className: "director-user-cell" },
    h("div", { className: "director-user-avatar" }, iniciales(fila.nombreCompleto)),
    h(
      "div",
      null,
      h("strong", { className: "director-user-name" }, fila.nombreCompleto),
      h("span", { className: "director-user-id" }, `ID: ${fila.id}`)
    )
  );
}

function columnaContacto(fila) {
  return h(
    "div",
    null,
    h("div", { className: "director-contact-email" }, fila.email),
    h("span", { className: "director-contact-dni" }, `DNI: ${fila.dni ?? "—"}`)
  );
}

function columnaRoles(fila) {
  return h(
    "div",
    { className: "director-roles-badges-wrap" },
    (fila.roles ?? []).map((rol) =>
      h(
        "span",
        {
          key: rol.id,
          className: `director-role-pill director-role-pill--${rol.id}`,
          style: { borderLeftColor: rol.color }
        },
        rol.nombre
      )
    )
  );
}

function columnaEstado(fila) {
  return h(
    "span",
    {
      className:
        fila.estado === "activo" ? "director-status-tag director-status-tag--active" : "director-status-tag director-status-tag--inactive"
    },
    fila.estado === "activo" ? "Activo" : "Inactivo"
  );
}

export function PersonalView({
  personal = [],
  areas = [],
  cargando = false,
  error = null,
  onReintentar,
  onEditarRoles,
  onCambiarEstado,
  onCrearPerfil
}) {
  const [vista, setVista] = useState("lista");
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");
  const [area, setArea] = useState("");

  const filtrado = useMemo(
    () => filtrarPersonal(personal, { q: busqueda, rol, estado, area }),
    [personal, busqueda, rol, estado, area]
  );

  const hayFiltros = Boolean(busqueda.trim()) || Boolean(rol) || Boolean(estado) || Boolean(area);

  const acciones = (fila) => [
    h(
      Boton,
      {
        variante: "contorno",
        tamano: "chico",
        onClick: () => onEditarRoles?.(fila)
      },
      "Modificar roles"
    ),
    h(
      Boton,
      {
        variante: fila.estado === "activo" ? "peligro" : "secundario",
        tamano: "chico",
        onClick: () => onCambiarEstado?.(fila)
      },
      fila.estado === "activo" ? "Suspender" : "Activar"
    )
  ];

  const columnas = [
    { id: "personal", titulo: "Personal / Usuario", celda: columnaPersonal },
    { id: "contacto", titulo: "Contacto y DNI", celda: columnaContacto },
    { id: "area", titulo: "Área / Sector", celda: (fila) => h("span", { className: "director-area-badge" }, fila.areaNombre ?? fila.area ?? "—") },
    { id: "roles", titulo: "Roles Asignados", celda: columnaRoles },
    { id: "estado", titulo: "Estado", celda: columnaEstado }
  ];

  const barra = h(
    "div",
    { className: "director-personal-toolbar" },
    h(Busqueda, {
      id: "busqueda-personal",
      valor: busqueda,
      onChange: setBusqueda,
      onLimpiar: () => setBusqueda(""),
      etiqueta: "Buscar personal",
      placeholder: "Buscar por nombre, apellido, DNI, email o área..."
    }),
    h(Filtro, {
      id: "filtro-rol-personal",
      etiqueta: "Rol",
      valor: rol,
      textoVacio: "Todos los roles",
      opciones: ROLES_DISPONIBLES.map((item) => ({ id: item.id, nombre: item.nombre })),
      onChange: setRol
    }),
    h(Filtro, {
      id: "filtro-estado-personal",
      etiqueta: "Estado",
      valor: estado,
      textoVacio: "Todos los estados",
      opciones: ESTADOS,
      onChange: setEstado
    }),
    h(Filtro, {
      id: "filtro-area-personal",
      etiqueta: "Área",
      valor: area,
      textoVacio: "Todas las áreas",
      opciones: areas.map((item) => ({ id: item.id, nombre: item.nombre })),
      onChange: setArea
    }),
    h(
      "div",
      { className: "director-vista-toggle", role: "group", "aria-label": "Forma de ver el personal" },
      VISTAS.map((opcion) =>
        h(
          "button",
          {
            key: opcion.id,
            type: "button",
            className: vista === opcion.id ? "director-vista-toggle__boton director-vista-toggle__boton--activo" : "director-vista-toggle__boton",
            "aria-pressed": vista === opcion.id ? "true" : "false",
            onClick: () => setVista(opcion.id)
          },
          opcion.nombre
        )
      )
    )
  );

  const contador = h(
    "p",
    { className: "director-personal-contador", role: "status" },
    resumenFiltro(filtrado.length, personal.length, hayFiltros)
  );

  if (error) {
    return h(
      "div",
      { className: "director-personal-view" },
      barra,
      h(MensajeError, { error, onReintentar })
    );
  }

  if (cargando) {
    return h(
      "div",
      { className: "director-personal-view" },
      barra,
      h(Esqueleto, { filas: 4, columnas: 5 })
    );
  }

  if (!personal.length) {
    return h(
      "div",
      { className: "director-personal-view" },
      barra,
      h(SinDatos, {
        titulo: "No hay usuarios registrados en el sistema.",
        descripcion: "Creá el primer perfil para poder asignarle roles y permisos.",
        accion: onCrearPerfil
          ? h(Boton, { variante: "primario", icono: "clipboard", onClick: onCrearPerfil }, "Crear Nuevo Perfil")
          : null
      })
    );
  }

  if (vista === "tarjetas") {
    return h(
      "div",
      { className: "director-personal-view" },
      barra,
      contador,
      filtrado.length === 0
        ? h(SinResultados, {
            texto: "No hay personal que coincida con los filtros aplicados.",
            descripcion: "Probá con otros criterios o quitá los filtros activos."
          })
        : h(
            "div",
            { className: "director-personal-cards" },
            filtrado.map((fila) =>
              h(
                "article",
                {
                  key: fila.id,
                  className: fila.estado === "activo" ? "director-personal-card" : "director-personal-card director-personal-card--inactivo"
                },
                h(
                  "header",
                  { className: "director-personal-card__cabecera" },
                  h("div", { className: "director-user-avatar director-user-avatar--grande" }, iniciales(fila.nombreCompleto)),
                  h(
                    "div",
                    null,
                    h("h3", { className: "director-personal-card__nombre" }, fila.nombreCompleto),
                    h("span", { className: "director-user-id" }, `ID: ${fila.id}`)
                  ),
                  columnaEstado(fila)
                ),
                h(
                  "dl",
                  { className: "director-personal-card__datos" },
                  h("dt", null, "Correo"),
                  h("dd", null, fila.email),
                  h("dt", null, "DNI"),
                  h("dd", null, fila.dni ?? "—"),
                  h("dt", null, "Área"),
                  h("dd", null, fila.areaNombre ?? fila.area ?? "—")
                ),
                columnaRoles(fila),
                h(
                  "footer",
                  { className: "director-personal-card__acciones" },
                  h(
                    Boton,
                    { variante: "contorno", tamano: "chico", onClick: () => onEditarRoles?.(fila) },
                    "Modificar roles"
                  ),
                  h(
                    Boton,
                    {
                      variante: fila.estado === "activo" ? "peligro" : "secundario",
                      tamano: "chico",
                      onClick: () => onCambiarEstado?.(fila)
                    },
                    fila.estado === "activo" ? "Suspender" : "Activar"
                  )
                )
              )
            )
          )
    );
  }

  return h(
    "div",
    { className: "director-personal-view" },
    barra,
    contador,
    h(Tabla, {
      columnas,
      filas: filtrado,
      titulo: "Personal de la institución",
      acciones,
      clave: (fila) => fila.id,
      vacio: h(SinResultados, {
        texto: "No hay personal que coincida con los filtros aplicados.",
        descripcion: "Probá con otros criterios o quitá los filtros activos."
      })
    })
  );
}
