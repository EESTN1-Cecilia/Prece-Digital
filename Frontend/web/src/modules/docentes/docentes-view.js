/* Gestion de Docentes.

   Pantalla de administracion del cuerpo docente: listado real de la API
   (GET /api/v1/teachers) con busqueda, filtros por area, materia y estado,
   orden y paginacion en el servidor, y dos presentaciones (lista y tarjetas)
   que comparten el mismo estado: cambiar de vista no toca la busqueda ni los
   filtros.

   Por docente solo hay tres acciones: Ver (con sus asignaciones, de solo
   lectura), Editar y Dar de baja. Las asignaciones se administran en su modulo
   y el alta de un docente es el mismo "Crear Nuevo Perfil" de Direccion con el
   rol Docente: la cuenta y el registro docente quedan vinculados.

   Las acciones se muestran segun los permisos de la sesion
   (teachers.read / teachers.write / teachers.manage; identity.create para el
   alta); el backend vuelve a validar cada una. "Dar de baja" es una baja
   logica: el docente queda inactivo, conserva su historial y deja de poder
   ingresar. Nadie ve "Dar de baja" sobre su propio registro. */

import { useEffect, useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import {
  Alerta,
  Badge,
  BadgeEstado,
  Boton,
  Busqueda,
  Confirmacion,
  Esqueleto,
  Filtro,
  MensajeError,
  Paginacion,
  SinResultados,
  Tabla
} from "../../components/ui/index.js";
import { usePermisos, useUsuarioActual } from "../../estado/index.js";
import { PERMISOS } from "../../utils/permisos.js";
import { DirectorService } from "../director/director-service.js";
import { PanelAccesos } from "../director/components/panel-accesos.js";
import { NuevoPerfilModal } from "../director/components/nuevo-perfil-modal.js";
import { DocentesService } from "./docentes-service.js";
import { DocenteFormularioModal } from "./components/docente-formulario-modal.js";
import { DocenteDetalleModal } from "./components/docente-detalle-modal.js";
import {
  OPCIONES_ORDEN,
  VISTAS,
  iniciales,
  opcionDesdeOrden,
  ordenAParametro,
  ordenDesdeOpcion,
  tonoAvatar
} from "./docentes-validacion.js";

const POR_PAGINA = 12;
const ESPERA_BUSQUEDA = 350;
const FILTROS_VACIOS = { area: "", materiaId: "", estado: "" };
const CLAVE_VISTA = "prece:docentes:vista";
const MATERIAS_VISIBLES = 2;

/* La vista elegida es una comodidad de cada navegador: si el almacenamiento
   no esta disponible se arranca en lista. */
function vistaGuardada() {
  try {
    const guardada = window.localStorage.getItem(CLAVE_VISTA);
    return Object.values(VISTAS).includes(guardada) ? guardada : VISTAS.lista;
  } catch {
    return VISTAS.lista;
  }
}

function guardarVista(vista) {
  try {
    window.localStorage.setItem(CLAVE_VISTA, vista);
  } catch {
    /* Sin almacenamiento la vista vale solo para esta visita. */
  }
}

/* ---------------- Iconos ------------------------------------------------- */

function icono(...hijos) {
  return function Icono({ width = "16", height = "16" }) {
    return h(
      "svg",
      { width, height, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 } },
      ...hijos
    );
  };
}

const IconDocente = icono(
  h("rect", { key: "a", x: "9", y: "3", width: "13", height: "10", rx: "1.5" }),
  h("circle", { key: "b", cx: "5.5", cy: "8", r: "2.5" }),
  h("path", { key: "c", d: "M1.5 21v-3.5A3.5 3.5 0 0 1 5 14h1.5l4-2.5" })
);

const IconPlus = icono(h("path", { key: "a", d: "M12 5v14M5 12h14" }));

const IconLista = icono(
  h("line", { key: "a", x1: "8", y1: "6", x2: "21", y2: "6" }),
  h("line", { key: "b", x1: "8", y1: "12", x2: "21", y2: "12" }),
  h("line", { key: "c", x1: "8", y1: "18", x2: "21", y2: "18" }),
  h("line", { key: "d", x1: "3", y1: "6", x2: "3.01", y2: "6" }),
  h("line", { key: "e", x1: "3", y1: "12", x2: "3.01", y2: "12" }),
  h("line", { key: "f", x1: "3", y1: "18", x2: "3.01", y2: "18" })
);

const IconCuadricula = icono(
  h("rect", { key: "a", x: "3", y: "3", width: "7", height: "7", rx: "1" }),
  h("rect", { key: "b", x: "14", y: "3", width: "7", height: "7", rx: "1" }),
  h("rect", { key: "c", x: "3", y: "14", width: "7", height: "7", rx: "1" }),
  h("rect", { key: "d", x: "14", y: "14", width: "7", height: "7", rx: "1" })
);

const IconMail = icono(
  h("rect", { key: "a", x: "2", y: "4", width: "20", height: "16", rx: "2" }),
  h("path", { key: "b", d: "m22 7-10 6L2 7" })
);

const IconVer = icono(
  h("path", { key: "a", d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }),
  h("circle", { key: "b", cx: "12", cy: "12", r: "3" })
);

const IconEditar = icono(
  h("path", { key: "a", d: "M12 20h9" }),
  h("path", { key: "b", d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" })
);

const IconBaja = icono(
  h("path", { key: "a", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
  h("circle", { key: "b", cx: "9", cy: "7", r: "4" }),
  h("line", { key: "c", x1: "17", y1: "8", x2: "22", y2: "13" }),
  h("line", { key: "d", x1: "22", y1: "8", x2: "17", y2: "13" })
);

/* ---------------- Piezas de presentacion --------------------------------- */

/* Accion de fila. En la tabla se muestra solo el icono (con tooltip y
   aria-label) para que la columna no desborde; en tarjetas y detalle, el texto. */
function Accion({ etiqueta, texto, icono: Icono, tono = "neutral", compacto, onClick }) {
  if (!compacto) {
    const variante = tono === "peligro" ? "peligro" : tono === "exito" ? "exito" : "contorno";
    return h(Boton, { variante, tamano: "chico", "aria-label": etiqueta, onClick }, texto);
  }

  return h(
    "button",
    { type: "button", className: `docentes-accion docentes-accion--${tono}`, "aria-label": etiqueta, title: etiqueta, onClick },
    h(Icono, { width: "15", height: "15" })
  );
}


function Avatar({ docente, grande = false }) {
  return h(
    "span",
    {
      className: `docentes-avatar docentes-avatar--${tonoAvatar(docente.id)}${grande ? " docentes-avatar--grande" : ""}`,
      "aria-hidden": "true"
    },
    iniciales(docente)
  );
}

/* Materias asignadas y, a continuacion, las declaradas en el alta del perfil
   que todavia no tienen asignacion (se distinguen con otro estilo). */
function ChipsMaterias({ docente }) {
  const materias = [
    ...(docente.asignaciones?.materias ?? []),
    ...(docente.asignaciones?.materiasDeclaradas ?? []).map((materia) => ({ ...materia, declarada: true }))
  ];

  if (!materias.length) {
    return h("span", { className: "docentes-sin-dato" }, "Sin materias");
  }

  const visibles = materias.slice(0, MATERIAS_VISIBLES);
  const resto = materias.length - visibles.length;

  return h(
    "div",
    { className: "docentes-chips" },
    visibles.map((materia) =>
      h(
        "span",
        {
          key: materia.id,
          className: materia.declarada ? "docentes-chip docentes-chip--declarada" : "docentes-chip",
          title: materia.declarada ? "Materia declarada en el perfil, sin asignación de curso todavía" : undefined
        },
        materia.nombre
      )
    ),
    resto > 0
      ? h("span", { className: "docentes-chip docentes-chip--mas", title: materias.slice(MATERIAS_VISIBLES).map((m) => m.nombre).join(", ") }, `+${resto}`)
      : null
  );
}

/* ---------------- Vista --------------------------------------------------- */

export default function DocentesView() {
  const { puede, tieneRol } = usePermisos();
  const usuario = useUsuarioActual();
  const puedeCrear = puede(PERMISOS.usuariosCrear);
  const puedeEditar = puede(PERMISOS.docentesEditar);
  const puedeDarDeBaja = puede(PERMISOS.docentesGestionar);
  /* El Panel de Accesos es la navegacion del tablero de Direccion. */
  const conPanel = tieneRol("director") || tieneRol("admin");

  const [vista, setVista] = useState(vistaGuardada);
  const [texto, setTexto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [orden, setOrden] = useState({ columna: "docente", direccion: "asc" });
  const [pagina, setPagina] = useState(1);

  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  const [catalogos, setCatalogos] = useState(null);
  const [totales, setTotales] = useState(null);
  const [institucion, setInstitucion] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [formulario, setFormulario] = useState({ abierto: false, docente: null });
  const [altaPerfil, setAltaPerfil] = useState(false);
  const [detalle, setDetalle] = useState({ docente: null, pestana: "datos" });
  const [pendiente, setPendiente] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  /* Debounce: la API se consulta cuando el tipeo se detiene. */
  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(texto.trim()), ESPERA_BUSQUEDA);
    return () => clearTimeout(temporizador);
  }, [texto]);

  /* Cambiar el criterio reinicia la paginacion. */
  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtros, orden]);

  useEffect(() => {
    DocentesService.catalogos().then(setCatalogos).catch(() => setCatalogos(null));
    DirectorService.obtenerInstitucion().then(setInstitucion).catch(() => setInstitucion(null));
  }, []);

  /* Los totales del encabezado no dependen de los filtros. */
  useEffect(() => {
    DocentesService.contar().then(setTotales).catch(() => setTotales(null));
  }, [recarga]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    DocentesService.listar({
      q: busqueda,
      ...filtros,
      orden: ordenAParametro(orden),
      pagina,
      porPagina: POR_PAGINA
    })
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
  }, [busqueda, filtros, orden, pagina, recarga]);

  const hayCriterios = Boolean(texto || filtros.area || filtros.materiaId || filtros.estado);
  const items = resultado?.items ?? [];

  const limpiar = () => {
    setTexto("");
    setBusqueda("");
    setFiltros(FILTROS_VACIOS);
  };

  const cambiarVista = (nueva) => {
    setVista(nueva);
    guardarVista(nueva);
  };

  const cambiarFiltro = (campo) => (valor) => setFiltros((actuales) => ({ ...actuales, [campo]: valor }));

  const recargar = () => setRecarga((valor) => valor + 1);

  const alGuardar = (docente) => {
    setAviso({ tono: "exito", texto: `Se actualizaron los datos de ${docente.nombre} ${docente.apellido}.` });
    recargar();
    DocentesService.catalogos().then(setCatalogos).catch(() => {});

    if (detalle.docente?.id === docente.id) {
      setDetalle((actual) => ({ ...actual, docente }));
    }
  };

  const confirmarPendiente = async () => {
    if (!pendiente) {
      return;
    }

    const { docente } = pendiente;
    setConfirmando(true);
    setAviso(null);

    try {
      const actualizado = await DocentesService.darDeBaja(docente.id);

      setAviso({
        tono: "exito",
        texto: `${docente.nombre} ${docente.apellido} fue dado/a de baja: ya no puede ingresar al Portal Docente y su historial se conserva.`
      });

      if (detalle.docente?.id === docente.id) {
        setDetalle((actual) => ({ ...actual, docente: actualizado }));
      }

      recargar();
    } catch (fallo) {
      /* El boton puede estar visible y el backend rechazar igual la accion. */
      setAviso({ tono: "error", texto: fallo.mensaje ?? "No se pudo completar la operación." });
    } finally {
      setConfirmando(false);
      setPendiente(null);
    }
  };

  /* Mismas acciones en la tabla, las tarjetas y el detalle. */
  const esPropio = (docente) => Boolean(docente.userId && usuario?.id && docente.userId === usuario.id);

  const accionesDe = (docente, { enDetalle = false, compacto = false } = {}) => {
    const nombre = `${docente.nombre} ${docente.apellido}`;

    return [
      enDetalle
        ? null
        : h(Accion, { key: "ver", compacto, etiqueta: `Ver detalle de ${nombre}`, texto: "Ver", icono: IconVer, onClick: () => setDetalle({ docente, pestana: "datos" }) }),
      puedeEditar
        ? h(Accion, { key: "editar", compacto, etiqueta: `Editar a ${nombre}`, texto: "Editar", icono: IconEditar, onClick: () => setFormulario({ abierto: true, docente }) })
        : null,
      docente.estado === "activo" && puedeDarDeBaja && !esPropio(docente)
        ? h(Accion, { key: "baja", compacto, tono: "peligro", etiqueta: `Dar de baja a ${nombre}`, texto: "Dar de baja", icono: IconBaja, onClick: () => setPendiente({ docente }) })
        : null
    ].filter(Boolean);
  };

  const columnas = useMemo(
    () => [
      {
        id: "docente",
        titulo: "Docente",
        ordenable: true,
        celda: (docente) =>
          h(
            "div",
            { className: "docentes-celda-docente" },
            h(Avatar, { docente }),
            h(
              "div",
              null,
              h("strong", null, `${docente.apellido}, ${docente.nombre}`),
              h("span", null, docente.titulo || "Sin título cargado")
            )
          )
      },
      { id: "documento", titulo: "DNI", ordenable: true, celda: (docente) => docente.documento },
      {
        id: "email",
        titulo: "Correo electrónico",
        ordenable: true,
        celda: (docente) => (docente.email ? h("a", { href: `mailto:${docente.email}`, className: "docentes-enlace" }, docente.email) : "—")
      },
      { id: "telefono", titulo: "Teléfono", celda: (docente) => docente.telefono || "—" },
      { id: "area", titulo: "Área", ordenable: true, celda: (docente) => docente.areaNombre || h("span", { className: "docentes-sin-dato" }, "Sin área") },
      { id: "materias", titulo: "Materias", celda: (docente) => h(ChipsMaterias, { docente }) },
      { id: "estado", titulo: "Estado", ordenable: true, celda: (docente) => h(BadgeEstado, { estado: docente.estado }) }
    ],
    []
  );

  const vacio = h(SinResultados, {
    texto: hayCriterios
      ? "Ningún docente coincide con la búsqueda y los filtros aplicados."
      : "Todavía no hay docentes registrados.",
    descripcion: hayCriterios ? "Probá con otros criterios o limpiá los filtros." : undefined,
    accion: hayCriterios
      ? h(Boton, { variante: "contorno", onClick: limpiar }, "Limpiar filtros")
      : puedeCrear
        ? h(Boton, { variante: "primario", onClick: () => setAltaPerfil(true) }, "Nuevo perfil docente")
        : undefined
  });

  const paginacion = resultado
    ? {
        pagina: resultado.pagina,
        paginas: resultado.paginas,
        total: resultado.total,
        etiquetaTotal: "docentes",
        onPagina: setPagina
      }
    : undefined;

  const tarjetas = () => {
    if (error) {
      return h(MensajeError, { error, onReintentar: recargar });
    }

    if (cargando) {
      return h(Esqueleto, { filas: 3, columnas: 3 });
    }

    if (!items.length) {
      return vacio;
    }

    return h(
      "div",
      null,
      h(
        "ul",
        { className: "docentes-grid", "aria-label": "Docentes" },
        items.map((docente) =>
          h(
            "li",
            { key: docente.id, className: `docentes-card${docente.estado === "inactivo" ? " docentes-card--inactivo" : ""}` },
            h(
              "div",
              { className: "docentes-card__cabecera" },
              h(Avatar, { docente, grande: true }),
              h(
                "div",
                { className: "docentes-card__identidad" },
                h("h3", { className: "docentes-card__nombre" }, `${docente.nombre} ${docente.apellido}`),
                h("span", { className: "docentes-card__titulo" }, docente.titulo || "Sin título cargado")
              ),
              h(BadgeEstado, { estado: docente.estado })
            ),
            h(
              "dl",
              { className: "docentes-card__datos" },
              h(
                "div",
                null,
                h("dt", null, "Correo"),
                h(
                  "dd",
                  null,
                  docente.email
                    ? h("a", { href: `mailto:${docente.email}`, className: "docentes-enlace" }, h(IconMail, { width: "13", height: "13" }), docente.email)
                    : "—"
                )
              ),
              h("div", null, h("dt", null, "DNI"), h("dd", null, docente.documento)),
              h("div", null, h("dt", null, "Área"), h("dd", null, docente.areaNombre || "Sin área")),
              h(
                "div",
                null,
                h("dt", null, "Especialidad"),
                h("dd", null, docente.especialidades?.length ? docente.especialidades.join(", ") : "—")
              )
            ),
            h(
              "div",
              { className: "docentes-card__asignaciones" },
              h("span", { className: "docentes-card__etiqueta" }, "Materias"),
              h(ChipsMaterias, { docente }),
              docente.asignaciones?.cursos?.length
                ? h(
                    "span",
                    { className: "docentes-card__cursos" },
                    `Cursos: ${docente.asignaciones.cursos.map((curso) => curso.etiqueta).join(" · ")}`
                  )
                : null
            ),
            h("div", { className: "ui-acciones docentes-card__acciones" }, accionesDe(docente))
          )
        )
      ),
      paginacion ? h(Paginacion, paginacion) : null
    );
  };

  const fechaHoy = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  const contenido = h(
    "section",
    { className: "director-dashboard-wrapper docentes-modulo", "aria-labelledby": "docentes-titulo" },
    h(
      "div",
      { className: "director-top-bar" },
      h(
        "div",
        { className: "director-top-title-wrap" },
        h("span", { className: "director-badge-main" }, "Cuerpo Docente"),
        institucion?.nombre ? h("span", { className: "badge-institucion" }, institucion.nombre) : null
      ),
      institucion?.cicloLectivo
        ? h("div", { className: "alumnos-top-badges" }, h("span", { className: "badge-ciclo" }, `Ciclo Lectivo ${institucion.cicloLectivo}`))
        : null
    ),
    h(
      "div",
      { className: "director-hero-banner" },
      h(
        "div",
        { className: "director-hero-left" },
        h("div", { className: "director-hero-icon-box" }, h(IconDocente, { width: "26", height: "26" })),
        h(
          "div",
          null,
          h("span", { className: "director-hero-date" }, fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)),
          h("h1", { className: "director-hero-title", id: "docentes-titulo" }, "Gestión de Docentes"),
          h("p", { className: "director-hero-subtitle" }, "Administración y consulta del personal docente de la institución"),
          h(
            "div",
            { className: "docentes-totales", "aria-live": "polite" },
            totales
              ? [
                  h("span", { key: "t", className: "docentes-total docentes-total--principal" }, h("strong", null, totales.total), " docentes registrados"),
                  h("span", { key: "a", className: "docentes-total" }, h("strong", null, totales.activos), " activos"),
                  h("span", { key: "i", className: "docentes-total" }, h("strong", null, totales.inactivos), " inactivos")
                ]
              : h("span", { className: "docentes-total" }, "Contando docentes...")
          )
        )
      ),
      puedeCrear
        ? h(
            "div",
            { className: "director-hero-actions" },
            h(
              "button",
              { type: "button", className: "btn-director-hero-primary", onClick: () => setAltaPerfil(true) },
              h(IconPlus, null),
              h("span", null, "Nuevo Perfil Docente")
            )
          )
        : null
    ),
    /* Panel de filtros: el buscador ocupa toda la primera fila; la segunda
       reparte en partes iguales los filtros (area, materia, estado y, en
       tarjetas, el orden) y cierra con "Limpiar filtros" y el modo de vista.
       Las clases docentes-filtros* son propias de este panel. */
    h(
      "div",
      { className: "docentes-filtros", role: "search", "aria-label": "Buscar y filtrar docentes" },
      h(
        "div",
        { className: "docentes-filtros__busqueda" },
        h(Busqueda, {
          id: "buscar-docentes",
          icono: "search",
          valor: texto,
          onChange: setTexto,
          onLimpiar: () => {
            setTexto("");
            setBusqueda("");
          },
          etiqueta: "Buscar por nombre, apellido, DNI o correo electrónico",
          placeholder: "Nombre, apellido, DNI o correo"
        })
      ),
      h(
        "div",
        { className: "docentes-filtros__fila" },
        h(
          "div",
          { className: "docentes-filtros__campos" },
          h(Filtro, { id: "filtro-area", etiqueta: "Área / departamento", valor: filtros.area, opciones: catalogos?.areas ?? [], onChange: cambiarFiltro("area") }),
          h(Filtro, { id: "filtro-materia", etiqueta: "Materia", valor: filtros.materiaId, opciones: catalogos?.materias ?? [], onChange: cambiarFiltro("materiaId") }),
          h(Filtro, {
            id: "filtro-estado",
            etiqueta: "Estado",
            valor: filtros.estado,
            opciones: [
              { id: "activo", nombre: "Activos" },
              { id: "inactivo", nombre: "Inactivos" }
            ],
            onChange: cambiarFiltro("estado")
          }),
          vista === VISTAS.tarjetas
            ? h(Filtro, {
                id: "orden-docentes",
                etiqueta: "Ordenar por",
                valor: opcionDesdeOrden(orden),
                opciones: OPCIONES_ORDEN,
                textoVacio: "Apellido (A-Z)",
                onChange: (valor) => setOrden(ordenDesdeOpcion(valor))
              })
            : null
        ),
        h(
          "div",
          { className: "docentes-filtros__acciones" },
          h(
            "button",
            { type: "button", className: "docentes-filtros__limpiar", disabled: !hayCriterios, onClick: limpiar },
            "Limpiar filtros"
          ),
          h(
            "div",
            { className: "docentes-vistas", role: "group", "aria-label": "Modo de visualización" },
            h(
              "button",
              {
                type: "button",
                className: `docentes-vistas__btn${vista === VISTAS.lista ? " docentes-vistas__btn--activo" : ""}`,
                "aria-pressed": vista === VISTAS.lista,
                "aria-label": "Vista de lista",
                title: "Vista de lista",
                onClick: () => cambiarVista(VISTAS.lista)
              },
              h(IconLista, null),
              h("span", null, "Lista")
            ),
            h(
              "button",
              {
                type: "button",
                className: `docentes-vistas__btn${vista === VISTAS.tarjetas ? " docentes-vistas__btn--activo" : ""}`,
                "aria-pressed": vista === VISTAS.tarjetas,
                "aria-label": "Vista de tarjetas",
                title: "Vista de tarjetas",
                onClick: () => cambiarVista(VISTAS.tarjetas)
              },
              h(IconCuadricula, null),
              h("span", null, "Tarjetas")
            )
          )
        )
      )
    ),
    hayCriterios && resultado && !cargando
      ? h("p", { className: "docentes-resumen", "aria-live": "polite" }, `${resultado.total} ${resultado.total === 1 ? "docente coincide" : "docentes coinciden"} con la búsqueda.`)
      : null,
    aviso ? h(Alerta, { tono: aviso.tono, onCerrar: () => setAviso(null) }, aviso.texto) : null,
    vista === VISTAS.lista
      ? h(Tabla, {
          titulo: "Docentes de la institución",
          columnas,
          filas: items,
          cargando,
          error,
          onReintentar: recargar,
          orden,
          onOrden: (proximo) => setOrden(proximo.columna ? proximo : { columna: "docente", direccion: "asc" }),
          acciones: (docente) => accionesDe(docente, { compacto: true }),
          vacio,
          paginacion
        })
      : tarjetas()
  );

  return h(
    "div",
    { className: conPanel ? "director-page-container" : "director-page-container docentes-sin-panel" },
    conPanel ? h(PanelAccesos, { rutaActiva: "#/docentes" }) : null,
    contenido,
    h(DocenteFormularioModal, {
      abierto: formulario.abierto,
      docente: formulario.docente,
      catalogos,
      bloquearEstado: Boolean(formulario.docente && esPropio(formulario.docente)),
      alCerrar: () => setFormulario({ abierto: false, docente: null }),
      alGuardar
    }),
    h(NuevoPerfilModal, {
      abierto: altaPerfil,
      rolesIniciales: ["docente"],
      alCerrar: () => setAltaPerfil(false),
      alPerfilCreado: (perfil) => {
        setAviso({
          tono: "exito",
          texto: perfil.docenteId
            ? `Se creó el perfil de ${perfil.nombre} ${perfil.apellido} y ya figura en el listado de docentes.`
            : `Se creó el perfil de ${perfil.nombre} ${perfil.apellido}. No tiene el rol Docente, por eso no figura en este listado.`
        });
        recargar();
        /* La materia declarada en el alta puede sumar una opcion al filtro. */
        DocentesService.catalogos().then(setCatalogos).catch(() => {});
      }
    }),
    h(DocenteDetalleModal, {
      abierto: Boolean(detalle.docente) && !formulario.abierto && !pendiente,
      docente: detalle.docente,
      pestanaInicial: detalle.pestana,
      alCerrar: () => setDetalle({ docente: null, pestana: "datos" }),
      acciones: detalle.docente ? accionesDe(detalle.docente, { enDetalle: true }) : null
    }),
    h(Confirmacion, {
      abierto: Boolean(pendiente),
      titulo: "Dar de baja al docente",
      mensaje: pendiente ? `¿Dar de baja a ${pendiente.docente.nombre} ${pendiente.docente.apellido}?` : null,
      detalle: pendiente
        ? [
            "Es una baja lógica: el registro, sus asignaciones y las asistencias que tomó se conservan.",
            pendiente.docente.userId ? "Su cuenta queda desactivada y no podrá ingresar al Portal Docente." : null,
            pendiente.docente.asignaciones?.totalActivas
              ? `Tiene ${pendiente.docente.asignaciones.totalActivas} asignación(es) activa(s): no recibirá nuevas mientras esté inactivo.`
              : null,
            "Solo se puede reactivar editando su estado, con permiso de edición."
          ].filter(Boolean).join(" ")
        : null,
      textoConfirmar: "Dar de baja",
      variante: "peligro",
      cargando: confirmando,
      onConfirmar: confirmarPendiente,
      onCancelar: () => setPendiente(null)
    })
  );
}
