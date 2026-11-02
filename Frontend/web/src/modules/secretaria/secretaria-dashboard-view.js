import { useState, useEffect, useCallback, useMemo } from "react";
import { h } from "../../layouts/site-layout.js";
import { CursoDistribucionGrafico } from "../../components/dashboard/curso-distribucion-grafico.js";
import { LoadingState, ErrorState } from "../../components/common/state-handlers.js";
import { SecretariaService } from "./secretaria-service.js";
import { useUsuarioActual } from "../../estado/index.js";
import { AlumnoMatrizModal } from "../students/alumno-matriz-wiew.js";
import {
  ACCIONES,
  DOCUMENTOS,
  itemsParaRevisar,
  saludo,
  fechaLarga,
  palabra,
  plural
} from "./secretaria-inicio.js";

/* Inicio de Secretaria pensado para personas que no usan pantallas todo el dia:
   primero las tareas (botones grandes con un verbo), despues tres numeros en
   palabras, despues lo que hay que revisar, y al final el detalle plegado.
   Todas las funciones del tablero anterior siguen disponibles. */

const CLAVE_LETRA = "prece.secretaria.letraGrande";
const VISIBLES_PARA_REVISAR = 5;

/* ---------------- Iconos (trazo simple, 24x24) ------------------------------ */

const TRAZOS = {
  buscar: [["circle", { cx: 11, cy: 11, r: 7 }], ["path", { d: "m20 20-3.5-3.5" }]],
  inscribir: [["circle", { cx: 9, cy: 8, r: 4 }], ["path", { d: "M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" }], ["path", { d: "M19 8v6M16 11h6" }]],
  boletin: [["path", { d: "M6 3h9l4 4v14H6z" }], ["path", { d: "M14 3v5h5" }], ["path", { d: "M9 13h6M9 17h4" }]],
  documento: [["path", { d: "M5 4h14v16H5z" }], ["path", { d: "M8 9h8M8 13h8" }], ["circle", { cx: 15, cy: 17, r: 1.5 }]],
  asistencia: [["rect", { x: 3, y: 5, width: 18, height: 16, rx: 2 }], ["path", { d: "M3 10h18M8 3v4M16 3v4" }], ["path", { d: "m9 15 2 2 4-4" }]],
  cursos: [["path", { d: "M3 9 12 4l9 5-9 5z" }], ["path", { d: "M7 11v5c3 2 7 2 10 0v-5" }]],
  observaciones: [["path", { d: "M4 5h16v11H9l-5 4z" }], ["path", { d: "M8 9h8M8 12h5" }]],
  libro: [["path", { d: "M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" }], ["path", { d: "M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z" }]],
  actualizar: [["path", { d: "M20 11a8 8 0 1 0-2.3 5.7" }], ["path", { d: "M20 4v7h-7" }]],
  letra: [["path", { d: "M4 19 9 5l5 14M6 14h6" }], ["path", { d: "M15 19l3-8 3 8M16 17h4" }]],
  ok: [["path", { d: "m5 12 5 5 9-10" }]],
  alerta: [["path", { d: "M12 3 2 20h20z" }], ["path", { d: "M12 10v4M12 17v.5" }]],
  flecha: [["path", { d: "m9 6 6 6-6 6" }]],
  cerrar: [["path", { d: "M6 6l12 12M18 6 6 18" }]]
};

function Icono({ nombre, className = "sec-icono" }) {
  return h(
    "svg",
    { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" },
    ...(TRAZOS[nombre] ?? []).map(([tag, props], indice) => h(tag, { key: indice, ...props }))
  );
}

/* ---------------- Preferencia de letra grande ------------------------------ */

function leerLetraGrande() {
  try {
    return window.localStorage.getItem(CLAVE_LETRA) === "1";
  } catch {
    return false;
  }
}

function guardarLetraGrande(valor) {
  try {
    window.localStorage.setItem(CLAVE_LETRA, valor ? "1" : "0");
  } catch {
    /* sin almacenamiento: la preferencia dura hasta recargar */
  }
}

/* ---------------- Piezas de la pantalla ------------------------------------ */

function Accion({ accion, onAbrir }) {
  const contenido = [
    h("span", { key: "i", className: `sec-accion__icono sec-tono--${accion.tono}` }, h(Icono, { nombre: accion.icono })),
    h(
      "span",
      { key: "t", className: "sec-accion__texto" },
      h("strong", { className: "sec-accion__titulo" }, accion.titulo),
      h("span", { className: "sec-accion__ayuda" }, accion.ayuda)
    )
  ];

  return accion.href
    ? h("a", { className: "sec-accion", href: accion.href }, ...contenido)
    : h("button", { type: "button", className: "sec-accion", onClick: () => onAbrir(accion.id) }, ...contenido);
}

function Numero({ valor, texto, tono }) {
  return h(
    "div",
    { className: `sec-numero sec-numero--${tono}` },
    h("strong", { className: "sec-numero__valor" }, valor),
    h("span", { className: "sec-numero__texto" }, texto)
  );
}

function FilaRevisar({ item, onRevisado, guardando }) {
  return h(
    "li",
    { className: `sec-revisar__fila sec-revisar__fila--${item.urgencia}` },
    h(
      "div",
      { className: "sec-revisar__info" },
      h("strong", { className: "sec-revisar__alumno" }, item.alumno),
      h("ul", { className: "sec-revisar__motivos" }, item.motivos.map((motivo, indice) => h("li", { key: indice }, motivo)))
    ),
    h(
      "div",
      { className: "sec-revisar__botones" },
      item.href ? h("a", { className: "sec-boton sec-boton--principal", href: item.href }, "Ver alumno") : null,
      item.alertaIds.length > 0
        ? h(
          "button",
          { type: "button", className: "sec-boton sec-boton--secundario", disabled: guardando, onClick: () => onRevisado(item) },
          h(Icono, { nombre: "ok", className: "sec-icono sec-icono--chico" }),
          guardando ? "Guardando..." : "Ya lo revisé"
        )
        : null
    )
  );
}

function Seccion({ titulo, resumen, children, abierta, onAlternar }) {
  return h(
    "section",
    { className: `sec-detalle${abierta ? " sec-detalle--abierta" : ""}` },
    h(
      "button",
      { type: "button", className: "sec-detalle__cabecera", "aria-expanded": abierta, onClick: onAlternar },
      h("span", { className: "sec-detalle__titulos" }, h("strong", null, titulo), h("span", null, resumen)),
      h("span", { className: "sec-detalle__estado" }, abierta ? "Ocultar" : "Ver", h(Icono, { nombre: "flecha", className: "sec-icono sec-detalle__flecha" }))
    ),
    abierta ? h("div", { className: "sec-detalle__cuerpo" }, children) : null
  );
}

function ElegirDocumento({ onElegir, onCerrar }) {
  useEffect(() => {
    const alTeclear = (evento) => evento.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return h(
    "div",
    { className: "sec-dialogo", role: "dialog", "aria-modal": "true", "aria-labelledby": "sec-dialogo-titulo", onClick: onCerrar },
    h(
      "div",
      { className: "sec-dialogo__panel", onClick: (evento) => evento.stopPropagation() },
      h(
        "div",
        { className: "sec-dialogo__cabecera" },
        h("h2", { id: "sec-dialogo-titulo" }, "¿Qué documento necesitás?"),
        h("button", { type: "button", className: "sec-dialogo__cerrar", onClick: onCerrar, "aria-label": "Cerrar" }, h(Icono, { nombre: "cerrar" }))
      ),
      h("p", { className: "sec-dialogo__ayuda" }, "Elegí el documento. En la pantalla siguiente buscás al alumno y lo imprimís."),
      h(
        "div",
        { className: "sec-dialogo__lista" },
        DOCUMENTOS.map((documento) =>
          h(
            "button",
            { key: documento.tipo, type: "button", className: "sec-documento", onClick: () => onElegir(documento.tipo) },
            h("strong", null, documento.titulo),
            h("span", null, documento.ayuda)
          )
        )
      )
    )
  );
}

/* ---------------- Vista ------------------------------------------------------ */

export default function SecretariaDashboardView() {
  const user = useUsuarioActual();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [turnoFiltro, setTurnoFiltro] = useState("todos");
  const [matrizModalAbierto, setMatrizModalAbierto] = useState(false);
  const [eligiendoDocumento, setEligiendoDocumento] = useState(false);
  const [letraGrande, setLetraGrande] = useState(leerLetraGrande);
  const [verTodos, setVerTodos] = useState(false);
  const [descartando, setDescartando] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [abiertas, setAbiertas] = useState({});

  // Apertura del Libro Matriz desde otros componentes
  useEffect(() => {
    const abrir = () => setMatrizModalAbierto(true);
    window.addEventListener("prece:open_matriz_modal", abrir);
    return () => window.removeEventListener("prece:open_matriz_modal", abrir);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await SecretariaService.getDashboardData());
      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.mensaje || err?.message || "No se pudo cargar la información de la escuela.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* El acceso lo decide la tabla de rutas (app/rutas.js) segun los permisos. */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mostrarAviso = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 4000);
  };

  /* "Ya lo revisé" descarta todas las alertas del alumno. Las faltas sin
     justificar no se descartan: salen de la lista cuando se justifican. */
  const marcarRevisado = async (item) => {
    setDescartando(item.id);
    try {
      for (const alertId of item.alertaIds) {
        await SecretariaService.dismissAlert(alertId);
      }
      setData((prev) => (prev ? { ...prev, alertas: prev.alertas.filter((a) => !item.alertaIds.includes(a.id)) } : prev));
      mostrarAviso(item.motivos.length > item.alertaIds.length
        ? "Listo. Las faltas sin justificar siguen en la lista hasta que se justifiquen."
        : "Listo: lo marcaste como revisado.");
    } catch (err) {
      mostrarAviso(err?.mensaje || "No se pudo guardar. Probá de nuevo.");
    } finally {
      setDescartando(null);
    }
  };

  const alternarLetra = () => {
    setLetraGrande((actual) => {
      guardarLetraGrande(!actual);
      return !actual;
    });
  };

  const abrirAccion = (id) => {
    if (id === "libro-matriz") setMatrizModalAbierto(true);
    if (id === "documentos") setEligiendoDocumento(true);
  };

  const elegirDocumento = (tipo) => {
    setEligiendoDocumento(false);
    window.dispatchEvent(new CustomEvent("prece:open_document_modal", { detail: { tipo } }));
  };

  const alternarSeccion = (id) => setAbiertas((previo) => ({ ...previo, [id]: !previo[id] }));

  const paraRevisar = useMemo(() => itemsParaRevisar(data), [data]);
  const visibles = verTodos ? paraRevisar : paraRevisar.slice(0, VISIBLES_PARA_REVISAR);

  const matricula = data?.resumenAlumnos?.matricula ?? data?.resumenAlumnos?.activos ?? 0;
  const ausentesHoy = data?.asistenciaHoy?.ausentes ?? 0;
  const cursos = (data?.alumnosPorCurso ?? []).filter(
    (curso) => turnoFiltro === "todos" || String(curso.turnoAula ?? curso.turno ?? "").toLowerCase().includes(turnoFiltro)
  );
  const faltas = data?.inasistencias ?? {};
  const academico = data?.situacionesAcademicas ?? {};
  const actividad = data?.actividadReciente ?? [];
  const nombre = user?.nombre && !/secretar/i.test(user.nombre) ? user.nombre.split(" ")[0] : null;

  return h(
    "section",
    { className: `sec-inicio${letraGrande ? " sec-inicio--grande" : ""}`, "aria-labelledby": "sec-inicio-titulo" },

    /* Saludo y herramientas */
    h(
      "header",
      { className: "sec-cabecera" },
      h(
        "div",
        null,
        h("h1", { id: "sec-inicio-titulo", className: "sec-cabecera__titulo" }, saludo(new Date(), nombre)),
        h("p", { className: "sec-cabecera__fecha" }, fechaLarga(new Date())),
        h("p", { className: "sec-cabecera__escuela" }, data?.institucion?.nombre ?? "E.E.S.T. N° 1 Cecilia Berdichevski")
      ),
      h(
        "div",
        { className: "sec-cabecera__herramientas" },
        h(
          "button",
          { type: "button", className: "sec-boton sec-boton--secundario", "aria-pressed": letraGrande, onClick: alternarLetra },
          h(Icono, { nombre: "letra", className: "sec-icono sec-icono--chico" }),
          letraGrande ? "Letra normal" : "Letra más grande"
        ),
        h(
          "button",
          { type: "button", className: "sec-boton sec-boton--secundario", onClick: fetchData, disabled: loading },
          h(Icono, { nombre: "actualizar", className: "sec-icono sec-icono--chico" }),
          loading ? "Actualizando..." : "Actualizar"
        )
      )
    ),

    aviso ? h("div", { className: "sec-aviso", role: "status" }, h(Icono, { nombre: "ok", className: "sec-icono sec-icono--chico" }), aviso) : null,

    /* Tareas */
    h(
      "section",
      { className: "sec-bloque", "aria-labelledby": "sec-tareas" },
      h("h2", { id: "sec-tareas", className: "sec-bloque__titulo" }, "¿Qué necesitás hacer?"),
      h("div", { className: "sec-acciones" }, ACCIONES.map((accion) => h(Accion, { key: accion.id, accion, onAbrir: abrirAccion })))
    ),

    loading && !data ? h(LoadingState, { mensaje: "Buscando la información de la escuela..." }) : null,
    error && !data ? h(ErrorState, { mensaje: error, onRetry: fetchData }) : null,

    data
      ? [
        /* Hoy en la escuela */
        h(
          "section",
          { key: "hoy", className: "sec-bloque", "aria-labelledby": "sec-hoy" },
          h("h2", { id: "sec-hoy", className: "sec-bloque__titulo" }, "Hoy en la escuela"),
          h(
            "div",
            { className: "sec-numeros" },
            h(Numero, { valor: matricula, texto: `${palabra(matricula, "alumno está cursando", "alumnos están cursando")} este año`, tono: "azul" }),
            h(Numero, {
              valor: ausentesHoy,
              texto: ausentesHoy === 0 ? "faltas cargadas hoy" : `${palabra(ausentesHoy, "alumno faltó", "alumnos faltaron")} hoy`,
              tono: ausentesHoy > 0 ? "ambar" : "verde"
            }),
            h(Numero, {
              valor: paraRevisar.length,
              texto: paraRevisar.length === 0 ? "alumnos para revisar: está todo al día" : palabra(paraRevisar.length, "alumno para revisar", "alumnos para revisar"),
              tono: paraRevisar.length > 0 ? "rojo" : "verde"
            })
          )
        ),

        /* Para revisar */
        h(
          "section",
          { key: "revisar", className: "sec-bloque", "aria-labelledby": "sec-revisar" },
          h("h2", { id: "sec-revisar", className: "sec-bloque__titulo" }, "Para revisar"),
          paraRevisar.length === 0
            ? h("p", { className: "sec-vacio" }, h(Icono, { nombre: "ok", className: "sec-icono sec-icono--chico" }), "No hay nada pendiente. Cuando un alumno necesite atención va a aparecer acá.")
            : [
              h("p", { key: "ayuda", className: "sec-bloque__ayuda" }, "Primero lo más urgente. Cuando termines con un alumno, tocá “Ya lo revisé” y deja de aparecer."),
              h(
                "ul",
                { key: "lista", className: "sec-revisar" },
                visibles.map((item) => h(FilaRevisar, { key: item.id, item, onRevisado: marcarRevisado, guardando: descartando === item.id }))
              ),
              paraRevisar.length > VISIBLES_PARA_REVISAR
                ? h(
                  "button",
                  { key: "mas", type: "button", className: "sec-boton sec-boton--texto", onClick: () => setVerTodos((actual) => !actual) },
                  verTodos ? "Mostrar menos" : `Mostrar los ${paraRevisar.length - VISIBLES_PARA_REVISAR} restantes`
                )
                : null
            ]
        ),

        /* Detalle plegado */
        h(
          "section",
          { key: "detalle", className: "sec-bloque", "aria-labelledby": "sec-mas" },
          h("h2", { id: "sec-mas", className: "sec-bloque__titulo" }, "Más información"),
          h("p", { className: "sec-bloque__ayuda" }, "Tocá un tema para ver el detalle."),

          h(
            Seccion,
            {
              titulo: "Alumnos por curso y turno",
              resumen: `${plural(data.resumenAlumnos?.divisiones ?? cursos.length, "división", "divisiones")}, ${(data.resumenAlumnos?.porTurno ?? []).map((t) => `${t.cantidad} a la ${t.turno.toLowerCase()}`).join(" y ")}`,
              abierta: Boolean(abiertas.cursos),
              onAlternar: () => alternarSeccion("cursos")
            },
            h(
              "div",
              { className: "sec-turnos" },
              (data.resumenAlumnos?.porTurno ?? []).map((t) =>
                h("div", { key: t.turno, className: "sec-turno" }, h("strong", null, t.cantidad), h("span", null, `alumnos en el turno ${t.turno.toLowerCase()}`))
              ),
              h("div", { className: "sec-turno" }, h("strong", null, data.resumenAlumnos?.altasDelMes ?? 0), h("span", null, "inscriptos este mes")),
              h("div", { className: "sec-turno" }, h("strong", null, data.resumenAlumnos?.inactivos ?? 0), h("span", null, "dados de baja o egresados"))
            ),
            h(
              "div",
              { className: "sec-filtro", role: "group", "aria-label": "Mostrar turno" },
              h("span", null, "Mostrar:"),
              [["todos", "Todos los turnos"], ["mañana", "Mañana"], ["tarde", "Tarde"]].map(([valor, texto]) =>
                h("button", { key: valor, type: "button", className: `sec-filtro__opcion${turnoFiltro === valor ? " sec-filtro__opcion--activa" : ""}`, "aria-pressed": turnoFiltro === valor, onClick: () => setTurnoFiltro(valor) }, texto)
              )
            ),
            cursos.length === 0
              ? h("p", { className: "sec-vacio" }, "No hay cursos en ese turno.")
              : h(CursoDistribucionGrafico, { cursos, turnoFiltro, totalDivisiones: cursos.length })
          ),

          h(
            Seccion,
            {
              titulo: "Faltas del año",
              resumen: faltas.disponible === false
                ? "Todavía no hay faltas registradas"
                : `${plural(faltas.totalInasistencias ?? 0, "falta cargada", "faltas cargadas")}, ${faltas.pendientes ?? 0} sin justificar todavía`,
              abierta: Boolean(abiertas.faltas),
              onAlternar: () => alternarSeccion("faltas")
            },
            h(
              "div",
              { className: "sec-turnos" },
              h("div", { className: "sec-turno" }, h("strong", null, faltas.totalInasistencias ?? 0), h("span", null, "faltas en total")),
              h("div", { className: "sec-turno sec-turno--verde" }, h("strong", null, faltas.justificadas ?? 0), h("span", null, "justificadas")),
              h("div", { className: "sec-turno sec-turno--rojo" }, h("strong", null, faltas.injustificadas ?? 0), h("span", null, "sin justificación")),
              h("div", { className: "sec-turno sec-turno--ambar" }, h("strong", null, faltas.pendientes ?? 0), h("span", null, "esperando nota o certificado"))
            ),
            (faltas.alumnosAtencion ?? []).length === 0
              ? h("p", { className: "sec-vacio" }, "Ningún alumno tiene 3 o más faltas sin justificar.")
              : h(
                "div",
                null,
                h("h3", { className: "sec-detalle__subtitulo" }, "Alumnos con 3 o más faltas sin justificar"),
                h(
                  "ul",
                  { className: "sec-tabla" },
                  faltas.alumnosAtencion.map((alumno) =>
                    h(
                      "li",
                      { key: alumno.id },
                      h("span", { className: "sec-tabla__nombre" }, alumno.nombre, h("small", null, alumno.curso)),
                      h("span", null, `${alumno.injustificadas} sin justificación, ${alumno.pendientes} esperando nota`),
                      h("a", { className: "sec-boton sec-boton--secundario", href: `#/alumnos/${encodeURIComponent(alumno.id)}` }, "Ver alumno")
                    )
                  )
                )
              ),
            h("a", { className: "sec-boton sec-boton--principal sec-boton--ancho", href: "#/asistencias" }, "Ir a Asistencias")
          ),

          h(
            Seccion,
            {
              titulo: "Materias previas y desaprobadas",
              resumen: `${plural(academico.totalMateriasPendientes ?? 0, "materia previa", "materias previas")} y ${plural(academico.totalMateriasDesaprobadas ?? 0, "desaprobada", "desaprobadas")}`,
              abierta: Boolean(abiertas.academico),
              onAlternar: () => alternarSeccion("academico")
            },
            h(
              "div",
              { className: "sec-turnos" },
              h("div", { className: "sec-turno sec-turno--ambar" }, h("strong", null, academico.totalMateriasPendientes ?? 0), h("span", null, "materias previas")),
              h("div", { className: "sec-turno sec-turno--rojo" }, h("strong", null, academico.totalMateriasDesaprobadas ?? 0), h("span", null, "materias desaprobadas")),
              h("div", { className: "sec-turno" }, h("strong", null, academico.cambiosCursoPendientes ?? 0), h("span", null, "pases en trámite"))
            ),
            (academico.casosDestacados ?? []).length === 0
              ? h("p", { className: "sec-vacio" }, "Ningún alumno adeuda materias.")
              : h(
                "ul",
                { className: "sec-tabla" },
                academico.casosDestacados.map((caso) =>
                  h(
                    "li",
                    { key: caso.id },
                    h("span", { className: "sec-tabla__nombre" }, caso.alumno, h("small", null, caso.curso)),
                    h("span", null, caso.detalle.replace(/\(s\)/g, "s")),
                    h("a", { className: "sec-boton sec-boton--secundario", href: `#/alumnos/${encodeURIComponent(caso.id)}` }, "Ver alumno")
                  )
                )
              ),
            h("a", { className: "sec-boton sec-boton--principal sec-boton--ancho", href: "#/boletines" }, "Ir a Boletines y notas")
          ),

          h(
            Seccion,
            {
              titulo: "Últimos cambios en los legajos",
              resumen: actividad.length === 0 ? "Sin cambios recientes" : plural(actividad.length, "cambio reciente", "cambios recientes"),
              abierta: Boolean(abiertas.actividad),
              onAlternar: () => alternarSeccion("actividad")
            },
            actividad.length === 0
              ? h("p", { className: "sec-vacio" }, "Cuando se inscriba, modifique o dé de baja a un alumno, va a aparecer acá.")
              : h(
                "ul",
                { className: "sec-tabla" },
                actividad.map((item) =>
                  h(
                    "li",
                    { key: item.id },
                    h("span", { className: "sec-tabla__nombre" }, item.recurso, h("small", null, item.descripcion)),
                    h("span", null, item.fecha ? new Date(item.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : ""),
                    h("span", null)
                  )
                )
              )
          ),

          lastUpdated
            ? h("p", { className: "sec-actualizado" }, `Datos actualizados a las ${lastUpdated.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} h`)
            : null
        )
      ]
      : null,

    eligiendoDocumento ? h(ElegirDocumento, { onElegir: elegirDocumento, onCerrar: () => setEligiendoDocumento(false) }) : null,

    h(AlumnoMatrizModal, {
      abierto: matrizModalAbierto,
      onCerrar: () => setMatrizModalAbierto(false),
      permitirSeleccionarAlumno: true
    })
  );
}
