import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import {
  Acciones,
  Alerta,
  Boton,
  BotonEnlace,
  Campo,
  CargandoPantalla,
  Casilla,
  ErrorCampo,
  MensajeError,
  Select
} from "../../components/ui/index.js";
import {
  actualizarUsuario,
  areasDemo,
  crearUsuario,
  listarRoles,
  obtenerUsuario,
  validarUsuario
} from "../../services/identity-api.js";
import { PERMISOS } from "../../utils/permisos.js";
import { usePermisos } from "../../estado/index.js";

const VACIO = {
  nombre: "",
  apellido: "",
  usuario: "",
  email: "",
  dni: "",
  telefono: "",
  area: "",
  estado: "activo",
  roles: []
};

export default function UsuarioFormularioView({ id }) {
  const esAlta = !id;
  const { puede } = usePermisos();

  const [datos, setDatos] = useState(VACIO);
  const [roles, setRoles] = useState([]);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(!esAlta);
  const [guardando, setGuardando] = useState(false);

  const permisoNecesario = esAlta ? PERMISOS.usuariosCrear : PERMISOS.usuariosEditar;

  useEffect(() => {
    listarRoles().then(({ data }) => setRoles(data));
  }, []);

  useEffect(() => {
    if (esAlta) {
      return undefined;
    }

    let vigente = true;
    setCargando(true);

    obtenerUsuario(id)
      .then(({ data }) => {
        if (vigente) {
          setDatos({
            ...VACIO,
            ...data,
            roles: data.roles.map((rol) => rol.id),
            telefono: data.telefono ?? "",
            dni: data.dni ?? "",
            usuario: data.usuario ?? "",
            area: data.area ?? ""
          });
          setError(null);
        }
      })
      .catch((fallo) => {
        if (vigente) {
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
  }, [id, esAlta]);

  const cambiar = (campo) => (valor) => {
    setDatos((actuales) => ({ ...actuales, [campo]: valor }));
    /* El error del campo desaparece apenas se corrige. */
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
  };

  const alternarRol = (rolId) =>
    setDatos((actuales) => ({
      ...actuales,
      roles: actuales.roles.includes(rolId)
        ? actuales.roles.filter((valor) => valor !== rolId)
        : [...actuales.roles, rolId]
    }));

  const enviar = async (evento) => {
    evento.preventDefault();

    if (guardando) {
      return;
    }

    setAviso(null);
    setError(null);

    const locales = validarUsuario(datos, { esAlta });

    if (locales) {
      setErrores(locales);
      return;
    }

    setErrores({});
    setGuardando(true);

    try {
      if (esAlta) {
        await crearUsuario(datos);
      } else {
        await actualizarUsuario(id, datos);
      }

      setAviso(esAlta ? "Usuario creado." : "Cambios guardados.");
      window.location.hash = "#/usuarios";
    } catch (fallo) {
      /* El backend puede rechazar por permisos o por datos: si trae detalle por
         campo, se muestra al lado del campo; si no, como error de la seccion. */
      if (fallo.campos) {
        setErrores(fallo.campos);
      } else {
        setError(fallo);
      }
    } finally {
      setGuardando(false);
    }
  };

  const volver = h(
    BotonEnlace,
    { variante: "contorno", href: esAlta ? "#/usuarios" : `#/usuarios/${id}` },
    "Cancelar"
  );

  if (cargando) {
    return h("section", { className: "data-panel" }, h(CargandoPantalla));
  }

  return h(
    "section",
    { className: "data-panel", "aria-labelledby": "formulario-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h("h1", { id: "formulario-titulo" }, esAlta ? "Nuevo usuario" : "Editar usuario"),
      volver
    ),
    h(
      "form",
      { className: "data-formulario", onSubmit: enviar, noValidate: true },
      h(
        "div",
        { className: "data-formulario__campos" },
        h(Campo, {
          etiqueta: "Nombre",
          id: "nombre",
          requerido: true,
          valor: datos.nombre,
          error: errores.nombre,
          onChange: cambiar("nombre")
        }),
        h(Campo, {
          etiqueta: "Apellido",
          id: "apellido",
          requerido: true,
          valor: datos.apellido,
          error: errores.apellido,
          onChange: cambiar("apellido")
        }),
        h(Campo, {
          etiqueta: "Nombre de usuario",
          id: "usuario",
          valor: datos.usuario,
          error: errores.usuario,
          ayuda: "Si se deja vacio, lo genera el backend.",
          onChange: cambiar("usuario")
        }),
        h(Campo, {
          etiqueta: "Correo institucional",
          id: "email",
          tipo: "email",
          requerido: true,
          valor: datos.email,
          error: errores.email,
          onChange: cambiar("email")
        }),
        h(Campo, {
          etiqueta: "DNI",
          id: "dni",
          requerido: true,
          valor: datos.dni,
          error: errores.dni,
          ayuda: "Solo numeros, sin puntos.",
          onChange: cambiar("dni")
        }),
        h(Campo, {
          etiqueta: "Telefono",
          id: "telefono",
          tipo: "tel",
          valor: datos.telefono,
          error: errores.telefono,
          onChange: cambiar("telefono")
        }),
        h(Campo, {
          etiqueta: "Sector / area",
          id: "area",
          valor: datos.area,
          error: errores.area,
          list: "areas-conocidas",
          onChange: cambiar("area")
        }),
        h(
          "datalist",
          { id: "areas-conocidas" },
          areasDemo().map((area) => h("option", { key: area, value: area }))
        ),
        h(Select, {
          etiqueta: "Estado",
          id: "estado",
          valor: datos.estado,
          opciones: ["activo", "inactivo", "suspendido", "pendiente"],
          ayuda: "Desactivar es una baja logica: el backend no borra el registro.",
          onChange: cambiar("estado")
        })
      ),
      h(
        "fieldset",
        { className: "data-bloque" },
        h("legend", null, "Roles *"),
        h(
          "div",
          { className: "ui-casillas" },
          roles.map((rol) =>
            h(Casilla, {
              key: rol.id,
              id: `rol-${rol.id}`,
              etiqueta: rol.nombre,
              descripcion: rol.alcances?.length ? rol.alcances.join(" · ") : undefined,
              marcado: datos.roles.includes(rol.id),
              onChange: () => alternarRol(rol.id)
            })
          )
        ),
        h(ErrorCampo, { mensaje: errores.roles, id: "roles-error" })
      ),
      error ? h(MensajeError, { error }) : null,
      aviso ? h(Alerta, { tono: "exito" }, aviso) : null,
      h(
        Acciones,
        { alineacion: "izquierda" },
        h(
          Boton,
          { tipo: "submit", cargando: guardando },
          esAlta ? "Crear usuario" : "Guardar cambios"
        ),
        volver
      )
    )
  );
}
