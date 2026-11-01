/* Calendario escolar y docente: eventos oficiales + institucionales.

   - Oficiales (origen "oficial"): ids estables "pba-<anio>-<clave>". Los crea la
     carga inicial o el importador; nunca duplican. Si una fecha cambia entre
     versiones oficiales se actualiza el MISMO evento y el cambio queda en el
     historial.
   - Institucionales (origen "institucional"): los carga el personal autorizado;
     la actualizacion automatica jamas los toca. */

import { randomUUID } from "node:crypto";
import { errorDeValidacion, noEncontrado, solicitudInvalida, sinPermisos } from "../../utils/api-error.mjs";
import repo from "./calendario.repository.mjs";
import { EVENTOS_INICIALES } from "./calendario.catalogo.mjs";
import { consultarFuentes } from "./calendario.importador.mjs";
import { diasEntre, esFechaIso, estadoTemporal, hoyEnBuenosAires } from "./calendario.fechas.mjs";

export const CATEGORIAS = ["inicio_fin_clases", "receso", "evaluacion", "intensificacion", "inscripcion", "jornada", "reunion_docente", "feriado", "efemeride", "otro"];
export const AMBITOS = ["general", "docente", "institucional"];
const PRIORIDAD = { inicio_fin_clases: 1, receso: 2, evaluacion: 3, intensificacion: 4, inscripcion: 5, jornada: 6, reunion_docente: 7, feriado: 8, efemeride: 9, otro: 10 };
const VENTANA_AVISO_DIAS = 14;
const MAX_AVISOS = 5;

const ahoraIso = () => new Date().toISOString();
const idOficial = (anio, clave) => `pba-${anio}-${clave}`;

function conTemporal(ev, hoy) {
  const estado = estadoTemporal(ev, hoy);
  const diasParaInicio = diasEntre(hoy, ev.fechaInicio);
  const fin = ev.fechaFin ?? ev.fechaInicio;
  return { ...ev, estadoTemporal: estado, diasParaInicio, diasParaFin: diasEntre(hoy, fin) };
}

const service = {
  /* Carga inicial idempotente: solo agrega lo que falta, nunca pisa. */
  cargarIniciales() {
    let nuevos = 0;
    for (const base of EVENTOS_INICIALES) {
      const id = idOficial(base.anioLectivo, base.clave);
      if (repo.buscar(id)) continue;
      repo.guardar({ ...base, id, origen: "oficial", estadoVerificacion: "pendiente", actualizadoEn: ahoraIso() });
      nuevos += 1;
    }
    return nuevos;
  },

  listar({ anio, desde, hasta, ambito, hoy = hoyEnBuenosAires() } = {}) {
    if (desde && !esFechaIso(desde)) throw errorDeValidacion([{ field: "desde", message: "Fecha invalida (AAAA-MM-DD)." }]);
    if (hasta && !esFechaIso(hasta)) throw errorDeValidacion([{ field: "hasta", message: "Fecha invalida (AAAA-MM-DD)." }]);
    return repo.todos()
      .filter((e) => (!anio || e.anioLectivo === Number(anio)) && (!ambito || e.ambito === ambito))
      .filter((e) => (!desde || (e.fechaFin ?? e.fechaInicio) >= desde) && (!hasta || e.fechaInicio <= hasta))
      .map((e) => conTemporal(e, hoy))
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio) || a.titulo.localeCompare(b.titulo));
  },

  /* Eventos para el modal: solo verificados, vigentes o proximos, priorizados. */
  avisos({ hoy = hoyEnBuenosAires() } = {}) {
    if (!esFechaIso(hoy)) throw errorDeValidacion([{ field: "hoy", message: "Fecha invalida (AAAA-MM-DD)." }]);
    const lista = repo.todos()
      .filter((e) => e.estadoVerificacion === "verificado")
      .map((e) => conTemporal(e, hoy))
      .filter((e) => e.estadoTemporal !== "finalizado")
      .filter((e) => e.categoria !== "feriado" || e.diasParaInicio <= 3)
      .filter((e) => e.diasParaInicio <= VENTANA_AVISO_DIAS || (e.estadoTemporal === "en_curso" && e.diasParaFin <= 7))
      .sort((a, b) => (PRIORIDAD[a.categoria] ?? 10) - (PRIORIDAD[b.categoria] ?? 10) || a.fechaInicio.localeCompare(b.fechaInicio));
    return { hoy, total: lista.length, eventos: lista.slice(0, MAX_AVISOS), restantes: Math.max(0, lista.length - MAX_AVISOS) };
  },

  estado() {
    const ultima = repo.ultimaConsulta();
    const pendientes = repo.todos().filter((e) => e.estadoVerificacion === "pendiente").length;
    return { ultimaConsulta: ultima, ultimaExitosa: repo.ultimaConsultaExitosa(), pendientesDeVerificacion: pendientes, alerta: ultima ? !ultima.ok : false };
  },

  historial(eventoId) {
    return repo.historial(eventoId);
  },

  verificar(id, usuario) {
    const ev = repo.buscar(id);
    if (!ev) throw noEncontrado("El evento");
    if (ev.origen !== "oficial") throw solicitudInvalida("Solo se verifican eventos oficiales.");
    const guardado = repo.guardar({ ...ev, estadoVerificacion: "verificado", verificadoPor: usuario?.id ?? null, actualizadoEn: ahoraIso() });
    return conTemporal(guardado, hoyEnBuenosAires());
  },

  validar(cuerpo, parcial = false) {
    const errores = [];
    const c = cuerpo ?? {};
    const texto = (campo, max, obligatorio) => {
      const v = c[campo];
      if (v === undefined && parcial) return;
      if (typeof v !== "string" || (obligatorio && !v.trim()) || v.length > max) errores.push({ field: campo, message: `Texto invalido (maximo ${max}).` });
    };
    texto("titulo", 160, true);
    if (c.descripcion !== undefined) texto("descripcion", 600, false);
    if (!parcial || c.fechaInicio !== undefined) if (!esFechaIso(c.fechaInicio)) errores.push({ field: "fechaInicio", message: "Fecha invalida (AAAA-MM-DD)." });
    if (c.fechaFin != null && !esFechaIso(c.fechaFin)) errores.push({ field: "fechaFin", message: "Fecha invalida (AAAA-MM-DD)." });
    if (c.fechaInicio && c.fechaFin && c.fechaFin < c.fechaInicio) errores.push({ field: "fechaFin", message: "No puede ser anterior al inicio." });
    if (c.categoria !== undefined && !CATEGORIAS.includes(c.categoria)) errores.push({ field: "categoria", message: "Categoria desconocida." });
    if (c.ambito !== undefined && !["docente", "institucional"].includes(c.ambito)) errores.push({ field: "ambito", message: "Ambito invalido." });
    if (c.urlReferencia != null && c.urlReferencia !== "" && !/^https:\/\/[^\s]+$/.test(c.urlReferencia)) errores.push({ field: "urlReferencia", message: "Debe ser un enlace https." });
    if (errores.length) throw errorDeValidacion(errores);
  },

  crearInstitucional(cuerpo, usuario) {
    this.validar(cuerpo);
    const ev = {
      id: `inst-${randomUUID()}`, clave: null, origen: "institucional", ambito: cuerpo.ambito ?? "institucional",
      titulo: cuerpo.titulo.trim(), descripcion: cuerpo.descripcion?.trim() ?? "", categoria: cuerpo.categoria ?? "otro",
      fechaInicio: cuerpo.fechaInicio, fechaFin: cuerpo.fechaFin || null, fuente: "Carga institucional", urlReferencia: cuerpo.urlReferencia || null,
      anioLectivo: Number(cuerpo.fechaInicio.slice(0, 4)), estadoVerificacion: "verificado", creadoPor: usuario?.id ?? null, actualizadoEn: ahoraIso()
    };
    return conTemporal(repo.guardar(ev), hoyEnBuenosAires());
  },

  actualizarInstitucional(id, cuerpo) {
    const ev = repo.buscar(id);
    if (!ev) throw noEncontrado("El evento");
    if (ev.origen !== "institucional") throw sinPermisos("Los eventos oficiales no se editan a mano: se actualizan desde la fuente o se verifican.");
    this.validar({ ...ev, ...cuerpo });
    const nuevo = { ...ev, ...Object.fromEntries(["titulo", "descripcion", "categoria", "ambito", "fechaInicio", "fechaFin", "urlReferencia"].filter((k) => cuerpo[k] !== undefined).map((k) => [k, cuerpo[k] === "" ? null : cuerpo[k]])), actualizadoEn: ahoraIso() };
    nuevo.anioLectivo = Number(nuevo.fechaInicio.slice(0, 4));
    return conTemporal(repo.guardar(nuevo), hoyEnBuenosAires());
  },

  eliminarInstitucional(id) {
    const ev = repo.buscar(id);
    if (!ev) throw noEncontrado("El evento");
    if (ev.origen !== "institucional") throw sinPermisos("Los eventos oficiales no se eliminan.");
    repo.eliminar(id);
    return { id, eliminado: true };
  },

  /* Aplica fechas halladas en la fuente: crea, actualiza o confirma. Nunca duplica ni toca institucionales. */
  aplicarCandidatos(candidatos, { fuente } = {}) {
    const r = { creados: 0, actualizados: 0, confirmados: 0, sinCambios: 0, cambiosDeFecha: [] };
    for (const c of candidatos) {
      const id = idOficial(c.anioLectivo, c.clave);
      const actual = repo.buscar(id);
      const base = { fuente: c.fuente ?? fuente, urlReferencia: c.urlReferencia, estadoVerificacion: "verificado", actualizadoEn: ahoraIso() };
      if (!actual) {
        repo.guardar({ id, clave: c.clave, origen: "oficial", ambito: "general", titulo: c.titulo, descripcion: c.descripcion, categoria: c.categoria, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, anioLectivo: c.anioLectivo, ...base });
        r.creados += 1;
        continue;
      }
      if (actual.origen !== "oficial") continue;
      const cambioFecha = actual.fechaInicio !== c.fechaInicio || (actual.fechaFin ?? null) !== (c.fechaFin ?? null);
      if (cambioFecha) {
        const cambio = { eventoId: id, fecha: ahoraIso(), antes: { fechaInicio: actual.fechaInicio, fechaFin: actual.fechaFin ?? null }, despues: { fechaInicio: c.fechaInicio, fechaFin: c.fechaFin ?? null }, fuente: c.urlReferencia };
        repo.registrarCambio(cambio);
        r.cambiosDeFecha.push(cambio);
        repo.guardar({ ...actual, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, ...base });
        r.actualizados += 1;
      } else if (actual.estadoVerificacion !== "verificado") {
        repo.guardar({ ...actual, ...base });
        r.confirmados += 1;
      } else {
        r.sinCambios += 1;
      }
    }
    return r;
  },

  /* Consulta las fuentes oficiales. Si falla o la estructura cambio, conserva todo y lo deja registrado. */
  async actualizarDesdeFuentes({ anio = Number(hoyEnBuenosAires().slice(0, 4)), usuario, opciones } = {}) {
    const inicio = ahoraIso();
    let consulta;
    try {
      consulta = await consultarFuentes({ anio, ...opciones });
    } catch (error) {
      consulta = { fuentes: [], candidatos: [], error: String(error.message ?? error) };
    }
    const alguna = consulta.fuentes.some((f) => f.ok);
    let ok = alguna && consulta.candidatos.length > 0;
    let aplicado = { creados: 0, actualizados: 0, confirmados: 0, sinCambios: 0, cambiosDeFecha: [] };
    let motivo = null;
    if (!alguna) motivo = "La fuente oficial no esta disponible. Se conservaron los datos existentes.";
    else if (!ok) motivo = "La fuente respondio pero no se reconocieron fechas: la estructura pudo cambiar. Se conservaron los datos existentes.";
    else aplicado = this.aplicarCandidatos(consulta.candidatos);
    const entrada = { id: randomUUID(), fecha: inicio, anioLectivo: anio, ok, motivo, fuentes: consulta.fuentes, ...aplicado, ejecutadoPor: usuario?.id ?? "automatico" };
    repo.registrarConsulta(entrada);
    return entrada;
  }
};

export default service;
