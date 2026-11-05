import { useCallback, useEffect, useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { Boton, Cargando, Confirmacion, Modal } from "../../components/ui/index.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { usePermisos } from "../../estado/hooks.js";
import { PERMISOS } from "../../utils/permisos.js";
import { CalendarioService } from "./calendario-service.js";
import {
  AMBITOS, CATEGORIAS, CLAVE_FOCO, DIAS_CORTOS, MESES, agruparAgenda, eventosDelDia, formatoFecha, hoyEnBuenosAires,
  estadoTemporal, partesDe, semanasDelMes, sumarMeses, textoDias, textoPeriodo
} from "./calendario-datos.js";

/* Calendario escolar y docente. Misma estetica del sistema (azules institucionales);
   los eventos vienen del backend. Grilla mensual + agenda lateral + gestion para
   quien tiene permiso (fechas institucionales, verificacion y consulta a la fuente). */

const VACIO = { titulo: "", descripcion: "", fechaInicio: "", fechaFin: "", categoria: "jornada", ambito: "institucional", urlReferencia: "" };

function leerFoco() {
  try { const v = sessionStorage.getItem(CLAVE_FOCO); sessionStorage.removeItem(CLAVE_FOCO); return v; } catch { return null; }
}

export function Etiqueta({ ev, hoy }) {
  const pendiente = ev.estadoVerificacion !== "verificado";
  const estado = pendiente ? "pendiente" : estadoTemporal(ev, hoy);
  const texto = pendiente ? "Pendiente de verificación" : { hoy: "Hoy", en_curso: "En curso", proximo: "Próximo", finalizado: "Finalizado" }[estado];
  return h("span", { className: `cal-etiqueta cal-etiqueta--${estado}` }, texto);
}

function Tarjeta({ ev, hoy, gestion, onVerificar, onEditar, onEliminar, ocupado }) {
  return h("li", { className: `cal-item cal-item--${ev.estadoVerificacion === "verificado" ? estadoTemporal(ev, hoy) : "pendiente"} cal-cat--${ev.categoria}` },
    h("div", { className: "cal-item__cabecera" },
      h("strong", { className: "cal-item__titulo" }, ev.titulo),
      h(Etiqueta, { ev, hoy })),
    h("p", { className: "cal-item__fecha" }, textoPeriodo(ev), " · ", h("span", null, textoDias(ev, hoy))),
    ev.descripcion ? h("p", { className: "cal-item__texto" }, ev.descripcion) : null,
    h("p", { className: "cal-item__meta" },
      CATEGORIAS[ev.categoria] ?? "Otra fecha", " · ", AMBITOS[ev.ambito] ?? ev.ambito,
      ev.urlReferencia ? [" · ", h("a", { key: "f", href: ev.urlReferencia, target: "_blank", rel: "noopener noreferrer" }, "Fuente")] : null),
    ev.estadoVerificacion !== "verificado" ? h("p", { className: "cal-item__aviso" }, "Fecha sin contrastar con la fuente oficial: ", ev.fuente) : null,
    gestion ? h("div", { className: "cal-item__acciones" },
      ev.origen === "oficial" && ev.estadoVerificacion !== "verificado"
        ? h(Boton, { tamano: "chico", variante: "contorno", deshabilitado: ocupado, onClick: () => onVerificar(ev) }, "Marcar como verificado") : null,
      ev.origen === "institucional" ? h(Boton, { tamano: "chico", variante: "texto", onClick: () => onEditar(ev) }, "Editar") : null,
      ev.origen === "institucional" ? h(Boton, { tamano: "chico", variante: "texto", onClick: () => onEliminar(ev) }, "Quitar") : null) : null);
}

function Seccion({ titulo, lista, vacio, ...resto }) {
  return h("section", { className: "cal-seccion" },
    h("h3", null, titulo, lista.length ? h("span", { className: "cal-seccion__n" }, lista.length) : null),
    lista.length ? h("ul", { className: "cal-lista" }, lista.map((ev) => h(Tarjeta, { key: ev.id, ev, ...resto }))) : h("p", { className: "cal-vacio" }, vacio));
}

function FormularioEvento({ valor, onCambio, errores }) {
  const campo = (nombre, etiqueta, props = {}) =>
    h("label", { className: "cal-campo" }, h("span", null, etiqueta),
      h("input", { value: valor[nombre] ?? "", onChange: (x) => onCambio({ ...valor, [nombre]: x.target.value }), ...props }),
      errores?.[nombre] ? h("small", { className: "cal-campo__error" }, errores[nombre]) : null);
  return h("div", { className: "cal-form" },
    campo("titulo", "Título", { maxLength: 160, required: true }),
    campo("fechaInicio", "Fecha de inicio", { type: "date", required: true }),
    campo("fechaFin", "Fecha de fin (opcional)", { type: "date" }),
    h("div", { className: "cal-campo" }, h("span", null, "Categoría"),
      h(CustomSelect, {
        value: valor.categoria,
        options: Object.entries(CATEGORIAS).map(([k, v]) => ({ value: k, label: v })),
        onChange: (val) => onCambio({ ...valor, categoria: val }),
        ariaLabel: "Categoría"
      })),
    h("div", { className: "cal-campo" }, h("span", null, "Corresponde a"),
      h(CustomSelect, {
        value: valor.ambito,
        options: [
          { value: "institucional", label: AMBITOS.institucional },
          { value: "docente", label: AMBITOS.docente }
        ],
        onChange: (val) => onCambio({ ...valor, ambito: val }),
        ariaLabel: "Corresponde a"
      })),
    campo("descripcion", "Descripción", { maxLength: 600 }),
    campo("urlReferencia", "Enlace de referencia (https, opcional)", { type: "url" }),
    errores?._general ? h("p", { className: "cal-campo__error" }, errores._general) : null);
}

export default function CalendarioView() {
  const { puede } = usePermisos();
  const gestion = puede("schedules.calendar");
  const hoy = hoyEnBuenosAires();
  const [vista, setVista] = useState(() => { const f = leerFoco() ?? hoy; return partesDe(f); });
  const [seleccion, setSeleccion] = useState(hoy);
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");
  const [ambito, setAmbito] = useState("todos");
  const [estado, setEstado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [errores, setErrores] = useState({});

  const cargar = useCallback(async () => {
    try {
      const [lista, st] = await Promise.all([
        CalendarioService.eventos(vista.anio),
        gestion ? CalendarioService.estado().catch(() => null) : Promise.resolve(null)
      ]);
      setEventos(lista); setEstado(st); setError("");
    } catch (fallo) { setError(fallo.mensaje ?? "No se pudo cargar el calendario."); setEventos((previo) => previo ?? []); }
  }, [vista.anio, gestion]);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => (eventos ?? []).filter((e) => ambito === "todos" || e.ambito === ambito), [eventos, ambito]);
  const agenda = useMemo(() => agruparAgenda(visibles, hoy), [visibles, hoy]);
  const semanas = useMemo(() => semanasDelMes(vista.anio, vista.mes), [vista]);
  const delDia = eventosDelDia(visibles, seleccion);

  const ejecutar = async (accion, ok) => {
    setOcupado(true); setMensaje("");
    try { await accion(); setMensaje(ok); await cargar(); } catch (fallo) { setMensaje(fallo.mensaje ?? "No se pudo completar la acción."); } finally { setOcupado(false); }
  };
  const guardar = async () => {
    setErrores({});
    const cuerpo = { ...editando, fechaFin: editando.fechaFin || null };
    try {
      setOcupado(true);
      if (editando.id) await CalendarioService.editar(editando.id, cuerpo); else await CalendarioService.crear(cuerpo);
      setEditando(null); setMensaje("Fecha guardada."); await cargar();
    } catch (fallo) {
      setErrores(fallo.campos ?? { _general: fallo.mensaje ?? "No se pudo guardar." });
    } finally { setOcupado(false); }
  };
  const moverMes = (d) => setVista(sumarMeses(vista.anio, vista.mes, d));
  const ultima = estado?.ultimaConsulta;
  const anios = [vista.anio - 1, vista.anio, vista.anio + 1];

  return h("div", { className: "cal" },
    h("header", { className: "cal__encabezado" },
      h("div", null, h("h1", null, "Calendario escolar y docente"), h("p", null, "Fechas del ciclo lectivo, actividades docentes y fechas de la escuela. Zona horaria: Buenos Aires.")),
      gestion ? h("div", { className: "cal__gestion" },
        h(Boton, { variante: "contorno", cargando: ocupado, onClick: () => ejecutar(() => CalendarioService.actualizar(vista.anio).then((r) => { if (!r.ok) throw { mensaje: r.motivo }; }), "Se consultó la fuente oficial.") }, "Actualizar desde la fuente oficial"),
        h(Boton, { onClick: () => { setErrores({}); setEditando({ ...VACIO, fechaInicio: seleccion }); } }, "Agregar fecha")) : null),
    gestion && ultima ? h("p", { className: `cal-estado ${ultima.ok ? "" : "cal-estado--error"}`, role: "status" },
      ultima.ok ? "Última consulta a la fuente oficial: " : "La última consulta a la fuente oficial falló: ", new Date(ultima.fecha).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
      ultima.ok ? "" : ` — ${ultima.motivo ?? "sin detalle"} Se conservan los datos anteriores.`,
      estado.pendientesDeVerificacion ? ` Pendientes de verificación: ${estado.pendientesDeVerificacion}.` : "") : null,
    gestion && !ultima ? h("p", { className: "cal-estado" }, "Todavía no se consultó la fuente oficial. Las fechas cargadas están pendientes de verificación.") : null,
    mensaje ? h("p", { className: "cal-mensaje", role: "status" }, mensaje) : null,
    error ? h("p", { className: "cal-estado cal-estado--error", role: "alert" }, error) : null,
    h("div", { className: "cal__barra" },
      h("div", { className: "cal__mes" },
        h("button", { type: "button", className: "cal__nav", "aria-label": "Mes anterior", onClick: () => moverMes(-1) }, "‹"),
        h(CustomSelect, {
          className: "cal__mes-select",
          ariaLabel: "Mes",
          value: String(vista.mes),
          options: MESES.map((m, i) => ({ value: String(i + 1), label: m })),
          onChange: (val) => setVista({ ...vista, mes: Number(val) })
        }),
        h(CustomSelect, {
          className: "cal__anio-select",
          ariaLabel: "Año",
          value: String(vista.anio),
          options: anios.map((a) => ({ value: String(a), label: String(a) })),
          onChange: (val) => setVista({ ...vista, anio: Number(val) })
        }),
        h("button", { type: "button", className: "cal__nav", "aria-label": "Mes siguiente", onClick: () => moverMes(1) }, "›"),
        h(Boton, { variante: "texto", tamano: "chico", onClick: () => { setVista(partesDe(hoy)); setSeleccion(hoy); } }, "Hoy")),
      h("div", { className: "cal__filtros", role: "group", "aria-label": "Tipo de fechas" },
        [["todos", "Todo"], ...Object.entries(AMBITOS)].map(([k, v]) => h("button", { key: k, type: "button", "aria-pressed": ambito === k, className: ambito === k ? "cal__filtro cal__filtro--on" : "cal__filtro", onClick: () => setAmbito(k) }, v)))),
    eventos === null ? h(Cargando, { texto: "Cargando el calendario..." }) : h("div", { className: "cal__cuerpo" },
      h("div", { className: "cal__grilla", role: "grid", "aria-label": `${MESES[vista.mes - 1]} ${vista.anio}` },
        h("div", { className: "cal__dias", role: "row" }, DIAS_CORTOS.map((d) => h("span", { key: d, role: "columnheader" }, d))),
        semanas.map((sem, i) => h("div", { className: "cal__semana", role: "row", key: i }, sem.map((c) => {
          const evs = eventosDelDia(visibles, c.iso);
          return h("button", { key: c.iso, type: "button", role: "gridcell", "aria-selected": seleccion === c.iso, "aria-label": `${formatoFecha(c.iso)}${evs.length ? `, ${evs.length} fechas` : ""}`,
            className: ["cal__dia", c.delMes ? "" : "cal__dia--fuera", c.iso === hoy ? "cal__dia--hoy" : "", c.iso === seleccion ? "cal__dia--sel" : ""].join(" ").trim(),
            onClick: () => { setSeleccion(c.iso); if (!c.delMes) setVista(partesDe(c.iso)); } },
            h("span", { className: "cal__num" }, c.dia),
            evs.slice(0, 2).map((e) => h("span", { key: e.id, className: `cal__marca cal-cat--${e.categoria} ${e.estadoVerificacion === "verificado" ? "" : "cal__marca--pend"}`, title: e.titulo }, e.titulo)),
            evs.length > 2 ? h("span", { className: "cal__mas" }, `+${evs.length - 2}`) : null);
        })))),
      h("aside", { className: "cal__lateral", "aria-label": "Cronograma" },
        h(Seccion, { titulo: formatoFecha(seleccion), lista: delDia, vacio: "No hay fechas cargadas para este día.", hoy, gestion, ocupado, onVerificar: (ev) => ejecutar(() => CalendarioService.verificar(ev.id), "Evento marcado como verificado."), onEditar: (ev) => { setErrores({}); setEditando({ ...VACIO, ...ev, fechaFin: ev.fechaFin ?? "", descripcion: ev.descripcion ?? "", urlReferencia: ev.urlReferencia ?? "" }); }, onEliminar: setBorrar }),
        ...[["En curso", agenda.vigentes, "Nada en curso."], ["Próximos", agenda.proximos.slice(0, 6), "No hay fechas próximas verificadas."], ["Pendientes de verificación", agenda.pendientes.slice(0, 8), "No hay fechas pendientes."], ["Finalizados", agenda.finalizados.slice(0, 4), "Sin fechas finalizadas."]]
          .map(([titulo, lista, vacio]) => h(Seccion, { key: titulo, titulo, lista, vacio, hoy, gestion, ocupado, onVerificar: (ev) => ejecutar(() => CalendarioService.verificar(ev.id), "Evento marcado como verificado."), onEditar: () => {}, onEliminar: setBorrar })))),
    h(Modal, { abierto: Boolean(editando), titulo: editando?.id ? "Editar fecha" : "Agregar fecha institucional", tamano: "medio", cargando: ocupado, onCerrar: () => setEditando(null),
      acciones: h("div", { className: "cal-form__acciones" }, h(Boton, { variante: "texto", onClick: () => setEditando(null) }, "Cancelar"), h(Boton, { cargando: ocupado, onClick: guardar }, "Guardar fecha")) },
      editando ? h(FormularioEvento, { valor: editando, onCambio: setEditando, errores }) : null),
    h(Confirmacion, { abierto: Boolean(borrar), titulo: "Quitar fecha institucional", mensaje: borrar ? `¿Quitar "${borrar.titulo}" del calendario?` : "", textoConfirmar: "Quitar", cargando: ocupado,
      onCancelar: () => setBorrar(null), onConfirmar: async () => { const ev = borrar; setBorrar(null); await ejecutar(() => CalendarioService.eliminar(ev.id), "Fecha quitada."); } }));
}
