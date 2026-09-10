import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import {
  Acciones,
  Alerta,
  Badge,
  BadgeEstado,
  BannerOrigen,
  Boton,
  BotonEnlace,
  CargandoPantalla,
  Casilla,
  Dato,
  ListaDatos,
  MensajeError,
} from "../../components/ui/index.js";
import { fecha } from "../../utils/formato.js";
import {
  guardarRolesDeUsuario,
  listarRoles,
  obtenerUsuario
} from "../../services/identity-api.js";
import { PERMISOS } from "../../utils/permisos.js";
import { usePermisos } from "../../estado/index.js";

export default function UsuarioDetalleView({ id }) {
  const { puede } = usePermisos();

  const [usuario, setUsuario] = useState(null);
  const [origen, setOrigen] = useState(null);
  const [roles, setRoles] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const puedeEditar = puede(PERMISOS.usuariosEditar);

  useEffect(() => {
    listarRoles().then(({ data }) => setRoles(data));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    obtenerUsuario(id)
      .then(({ data, origen: fuente }) => {
        if (vigente) {
          setUsuario(data);
          setOrigen(fuente);
          setSeleccion(data.roles.map((rol) => rol.id));
          setError(null);
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setUsuario(null);
          setError(fallo);
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, [id]);

  const alternarRol = (rolId) =>
    setSeleccion((actuales) =>
      actuales.includes(rolId) ? actuales.filter((valor) => valor !== rolId) : [...actuales, rolId]
    );

  const guardar = async () => {
    setAviso(null);
    setGuardando(true);

    try {
      await guardarRolesDeUsuario(usuario.id, seleccion);
      setAviso({ tono: "ok", texto: "Roles actualizados." });
      setUsuario((actual) => ({
        ...actual,
        roles: roles.filter((rol) => seleccion.includes(rol.id))
      }));
    } catch (fallo) {
      /* Solo el backend autoriza: si rechaza, la asignacion no se aplica. */
      setAviso({ tono: "error", texto: fallo.mensaje });
    } finally {
      setGuardando(false);
    }
  };

  const volver = h(
    BotonEnlace,
    { variante: "contorno", href: "#/usuarios" },
    "Volver al listado"
  );

  const acciones = h(
    Acciones,
    null,
    puedeEditar && usuario
      ? h(BotonEnlace, { variante: "primario", href: `#/usuarios/${id}/editar` }, "Editar")
      : null,
    volver
  );

  if (cargando) {
    return h("section", { className: "data-panel" }, h(CargandoPantalla));
  }

  if (error || !usuario) {
    return h(
      "section",
      { className: "data-panel" },
      h("div", { className: "data-panel__top" }, h("h1", null, "Detalle de usuario"), volver),
      h(MensajeError, { error })
    );
  }

  return h(
    "section",
    { className: "data-panel", "aria-labelledby": "detalle-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h("h1", { id: "detalle-titulo" }, `${usuario.apellido ?? ""}, ${usuario.nombre ?? ""}`),
      acciones
    ),
    h(BannerOrigen, {
      origen,
      detalle: `El backend todavia no expone GET /api/v1/users/${id}: se muestra un usuario de prueba.`
    }),
    h(
      ListaDatos,
      null,
      h(Dato, { etiqueta: "ID" }, usuario.id ?? "—"),
      h(Dato, { etiqueta: "Nombre" }, usuario.nombre ?? "—"),
      h(Dato, { etiqueta: "Apellido" }, usuario.apellido ?? "—"),
      h(Dato, { etiqueta: "Nombre de usuario" }, usuario.usuario ?? "—"),
      h(Dato, { etiqueta: "Email" }, usuario.email ?? "—"),
      h(Dato, { etiqueta: "DNI" }, usuario.dni ?? "—"),
      h(Dato, { etiqueta: "Telefono" }, usuario.telefono ?? "—"),
      h(Dato, { etiqueta: "Sector / area" }, usuario.area ?? "—"),
      h(Dato, { etiqueta: "Estado" }, h(BadgeEstado, { estado: usuario.estado })),
      h(Dato, { etiqueta: "Fecha de creacion" }, fecha(usuario.creadoEn)),
      h(Dato, { etiqueta: "Ultima actualizacion" }, fecha(usuario.actualizadoEn)),
      h(Dato, { etiqueta: "Ultimo acceso" }, fecha(usuario.ultimoAcceso)),
      h(
        Dato,
        { etiqueta: "Roles asignados" },
        usuario.roles.length
          ? usuario.roles.map((rol) => h(Badge, { key: rol.id }, rol.nombre))
          : "—"
      )
    ),
    h(
      "section",
      { className: "data-bloque" },
      h("h2", null, "Asignacion de roles"),
      puedeEditar
        ? h(
            "div",
            null,
            h(
              "div",
              { className: "ui-casillas" },
              roles.map((rol) =>
                h(Casilla, {
                  key: rol.id,
                  id: `rol-${rol.id}`,
                  etiqueta: rol.nombre,
                  descripcion: rol.alcances?.length ? rol.alcances.join(" · ") : undefined,
                  marcado: seleccion.includes(rol.id),
                  onChange: () => alternarRol(rol.id)
                })
              )
            ),
            h(Boton, { cargando: guardando, onClick: guardar }, "Guardar roles")
          )
        : h(
            "p",
            { className: "data-nota" },
            "Solo consulta: tu usuario no tiene permiso para modificar asignaciones."
          ),
      aviso
        ? h(Alerta, { tono: aviso.tono === "ok" ? "exito" : aviso.tono }, aviso.texto)
        : null
    )
  );
}
