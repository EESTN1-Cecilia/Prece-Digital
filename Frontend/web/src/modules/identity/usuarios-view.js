import { useEffect, useMemo, useState } from "react";
import { h, IconoFigma } from "../../layouts/site-layout.js";
import {
  Acciones,
  Alerta,
  BadgeEstado,
  BannerOrigen,
  Badge,
  Boton,
  BotonEnlace,
  Busqueda,
  Confirmacion,
  Filtro,
  SinResultados,
  Tabla
} from "../../components/ui/index.js";
import {
  areasDemo,
  cambiarEstadoUsuario,
  estadosDemo,
  listarRoles,
  listarUsuarios
} from "../../services/identity-api.js";
import { PERMISOS } from "../../utils/permisos.js";
import { usePermisos } from "../../estado/index.js";
import { fecha } from "../../utils/formato.js";

const POR_PAGINA = 10;
const ESPERA_BUSQUEDA = 350;
const FILTROS_VACIOS = { rol: "", area: "", estado: "" };

/* Las doce columnas pedidas por la issue #55. `celda` arma el contenido cuando
   no alcanza con el valor crudo del usuario. */
const COLUMNAS = [
  { id: "id", titulo: "ID" },
  { id: "nombre", titulo: "Nombre" },
  { id: "apellido", titulo: "Apellido" },
  { id: "usuario", titulo: "Usuario" },
  { id: "email", titulo: "Email" },
  { id: "area", titulo: "Sector / area" },
  {
    id: "roles",
    titulo: "Roles",
    celda: (usuario) =>
      usuario.roles.length
        ? usuario.roles.map((rol) => h(Badge, { key: rol.id }, rol.nombre))
        : "—"
  },
  { id: "estado", titulo: "Estado", celda: (usuario) => h(BadgeEstado, { estado: usuario.estado }) },
  { id: "creadoEn", titulo: "Creado", celda: (usuario) => fecha(usuario.creadoEn) },
  { id: "actualizadoEn", titulo: "Actualizado", celda: (usuario) => fecha(usuario.actualizadoEn) },
  { id: "ultimoAcceso", titulo: "Ultimo acceso", celda: (usuario) => fecha(usuario.ultimoAcceso) }
];

export default function UsuariosView() {
  const { puede, permisos } = usePermisos();

  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);

  const [roles, setRoles] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [recarga, setRecarga] = useState(0);
  /* Usuario cuyo cambio de estado espera confirmacion. */
  const [pendiente, setPendiente] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  const puedeCrear = puede(PERMISOS.usuariosCrear);
  const puedeEditar = puede(PERMISOS.usuariosEditar);

  /* Debounce: la API se consulta cuando el tipeo se detiene. */
  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(texto), ESPERA_BUSQUEDA);
    return () => clearTimeout(temporizador);
  }, [texto]);

  /* Cambiar el criterio reinicia la paginacion. */
  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtros]);

  useEffect(() => {
    listarRoles().then(({ data }) => setRoles(data));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    listarUsuarios({ q: busqueda, ...filtros, pagina, porPagina: POR_PAGINA })
      .then((respuesta) => {
        if (vigente) {
          setResultado(respuesta);
          setError(null);
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setResultado(null);
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
  }, [busqueda, filtros, pagina, recarga]);

  /* Los catalogos de area y estado se completan con lo que devuelva la API. */
  const areas = useMemo(
    () =>
      [...new Set([...areasDemo(), ...(resultado?.items ?? []).map((usuario) => usuario.area)])]
        .filter(Boolean)
        .sort()
        .map((area) => ({ id: area, nombre: area })),
    [resultado]
  );

  const estados = useMemo(
    () =>
      [...new Set([...estadosDemo(), ...(resultado?.items ?? []).map((usuario) => usuario.estado)])]
        .filter(Boolean)
        .sort()
        .map((estado) => ({ id: estado, nombre: estado })),
    [resultado]
  );

  const hayCriterios = Boolean(texto || filtros.rol || filtros.area || filtros.estado);

  const limpiar = () => {
    setTexto("");
    setBusqueda("");
    setFiltros(FILTROS_VACIOS);
  };

  const confirmarCambio = async () => {
    if (!pendiente) {
      return;
    }

    const { usuario, estado } = pendiente;

    setAviso(null);
    setConfirmando(true);

    try {
      await cambiarEstadoUsuario(usuario.id, estado);
      setAviso({ tono: "exito", texto: `Estado de ${usuario.usuario} actualizado a ${estado}.` });
      setRecarga((valor) => valor + 1);
      setPendiente(null);
    } catch (fallo) {
      /* El boton puede estar visible y el backend rechazar igual la accion. */
      setAviso({ tono: "error", texto: fallo.mensaje });
      setPendiente(null);
    } finally {
      setConfirmando(false);
    }
  };

  const accionesDeFila = (usuario) => {
    const proximo = usuario.estado === "activo" ? "inactivo" : "activo";

    return [
      h(
        BotonEnlace,
        { key: "ver", variante: "contorno", tamano: "chico", href: `#/usuarios/${usuario.id}` },
        "Ver detalle"
      ),
      puedeEditar
        ? h(
            BotonEnlace,
            {
              key: "editar",
              variante: "contorno",
              tamano: "chico",
              href: `#/usuarios/${usuario.id}/editar`
            },
            "Editar"
          )
        : null,
      puedeEditar
        ? h(
            Boton,
            {
              key: "estado",
              variante: proximo === "activo" ? "contorno" : "peligro",
              tamano: "chico",
              onClick: () => setPendiente({ usuario, estado: proximo })
            },
            proximo === "activo" ? "Activar" : "Desactivar"
          )
        : null
    ];
  };

  return h(
    "section",
    { className: "data-panel", "aria-labelledby": "usuarios-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h(
        "h1",
        { id: "usuarios-titulo" },
        h(IconoFigma, { className: "people-icon", nombre: "people" }),
        "Usuarios"
      ),
      h(
        Acciones,
        null,
        puedeCrear
          ? h(BotonEnlace, { variante: "primario", href: "#/usuarios/nuevo" }, "Nuevo usuario")
          : null,
        h(BotonEnlace, { href: "#/roles" }, "Roles y permisos")
      )
    ),
    h(
      "p",
      { className: "data-nota" },
      `Permisos de la sesion: ${permisos.length ? permisos.join(", ") : "sin permisos"}.`
    ),
    h(
      "div",
      null,
          h(
            "div",
            { className: "ui-barra", role: "search" },
            h(Busqueda, {
              id: "buscar-usuarios",
              valor: texto,
              onChange: setTexto,
              onLimpiar: () => {
                setTexto("");
                setBusqueda("");
              },
              etiqueta: "Buscar por nombre, apellido, usuario, email o ID",
              placeholder: "Buscar por nombre, apellido, usuario, email o ID"
            }),
            h(Filtro, {
              etiqueta: "Rol",
              id: "filtro-rol",
              valor: filtros.rol,
              opciones: roles,
              onChange: (valor) => setFiltros((actuales) => ({ ...actuales, rol: valor }))
            }),
            h(Filtro, {
              etiqueta: "Sector / area",
              id: "filtro-area",
              valor: filtros.area,
              opciones: areas,
              onChange: (valor) => setFiltros((actuales) => ({ ...actuales, area: valor }))
            }),
            h(Filtro, {
              etiqueta: "Estado",
              id: "filtro-estado",
              valor: filtros.estado,
              opciones: estados,
              onChange: (valor) => setFiltros((actuales) => ({ ...actuales, estado: valor }))
            }),
            h(
              Boton,
              { variante: "texto", deshabilitado: !hayCriterios, onClick: limpiar },
              "Limpiar"
            )
          ),
          h(BannerOrigen, {
            origen: resultado?.origen,
            detalle:
              "El backend todavia no expone GET /api/v1/users: la busqueda, los filtros y el paginado se resuelven sobre un juego de prueba."
          }),
          aviso ? h(Alerta, { tono: aviso.tono, onCerrar: () => setAviso(null) }, aviso.texto) : null,
          h(Tabla, {
            titulo: "Usuarios del sistema",
            columnas: COLUMNAS,
            filas: resultado?.items ?? [],
            cargando,
            error,
            onReintentar: () => setRecarga((valor) => valor + 1),
            acciones: accionesDeFila,
            vacio: h(SinResultados, {
              texto: hayCriterios
                ? "Ningun usuario coincide con la busqueda y los filtros aplicados."
                : "Todavia no hay usuarios registrados.",
              descripcion: hayCriterios ? "Proba con otros criterios o limpia los filtros." : undefined,
              accion: hayCriterios
                ? h(Boton, { variante: "contorno", onClick: limpiar }, "Limpiar filtros")
                : puedeCrear
                  ? h(BotonEnlace, { variante: "primario", href: "#/usuarios/nuevo" }, "Nuevo usuario")
                  : undefined
            }),
            paginacion: resultado
              ? {
                  pagina: resultado.pagina,
                  paginas: resultado.paginas,
                  total: resultado.total,
                  etiquetaTotal: "usuarios",
                  onPagina: setPagina
                }
              : undefined
          })
    ),
    h(Confirmacion, {
      abierto: Boolean(pendiente),
      titulo: pendiente?.estado === "activo" ? "Activar cuenta" : "Desactivar cuenta",
      mensaje: pendiente
        ? `${pendiente.estado === "activo" ? "Activar" : "Desactivar"} la cuenta de ${pendiente.usuario.nombre} ${pendiente.usuario.apellido}?`
        : null,
      detalle:
        pendiente?.estado === "inactivo"
          ? "La cuenta no se elimina: deja de poder ingresar y podes reactivarla despues."
          : "La persona vuelve a poder ingresar al sistema.",
      textoConfirmar: pendiente?.estado === "activo" ? "Activar" : "Desactivar",
      variante: pendiente?.estado === "activo" ? "exito" : "peligro",
      cargando: confirmando,
      onConfirmar: confirmarCambio,
      onCancelar: () => setPendiente(null)
    })
  );
}
