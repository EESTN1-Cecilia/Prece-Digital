import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { Boton, Modal } from "../../components/ui/index.js";
import { CalendarioService } from "./calendario-service.js";
import { CATEGORIAS, CLAVE_FOCO, claveDeAviso, estadoTemporal, textoDias, textoPeriodo } from "./calendario-datos.js";

/* Aviso automatico de fechas importantes. El contenido sale de los eventos
   VERIFICADOS que devuelve el backend; aca no hay textos escritos a mano.
   Reglas: una sola ventana (resumen si hay varias), no bloquea (se cierra con
   Escape o fuera del cuadro), y cada evento avisa una vez por etapa
   (vigente, 1, 3, 7 o 14 dias) para no repetirse. El usuario puede apagarlo. */

const VISTOS = "prece:calendario:avisos-vistos";
const PREFERENCIA = "prece:calendario:avisos";

const leer = (clave, defecto) => { try { const v = localStorage.getItem(clave); return v === null ? defecto : JSON.parse(v); } catch { return defecto; } };
const escribir = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento: se avisa de nuevo la proxima vez */ } };

export function AvisosCalendario({ ruta }) {
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (leer(PREFERENCIA, "on") === "off") return undefined;
    let activo = true;
    CalendarioService.avisos().then((r) => {
      if (!activo) return;
      const vistos = new Set(leer(VISTOS, []));
      const nuevos = r.eventos.filter((e) => !vistos.has(claveDeAviso(e, r.hoy)));
      if (nuevos.length) { setDatos({ ...r, eventos: nuevos }); setAbierto(true); }
    }).catch(() => { /* el aviso es opcional: si falla no se interrumpe nada */ });
    return () => { activo = false; };
  }, []);

  if (!datos || String(ruta ?? "").startsWith("#/calendario")) return null;
  const { eventos, hoy, restantes } = datos;
  const [principal, ...otros] = eventos;

  const cerrar = (silenciar = false) => {
    const vistos = new Set(leer(VISTOS, []));
    eventos.forEach((e) => vistos.add(claveDeAviso(e, hoy)));
    escribir(VISTOS, [...vistos].slice(-200));
    if (silenciar) escribir(PREFERENCIA, "off");
    setAbierto(false);
  };
  const verEnCalendario = () => {
    try { sessionStorage.setItem(CLAVE_FOCO, principal.fechaInicio > hoy ? principal.fechaInicio : hoy); } catch { /* opcional */ }
    cerrar(); window.location.hash = "#/calendario";
  };

  return h(Modal, {
    abierto, titulo: eventos.length > 1 ? "Fechas importantes" : "Fecha importante", tamano: "medio", onCerrar: () => cerrar(),
    acciones: h("div", { className: "cal-aviso__acciones" },
      h(Boton, { variante: "texto", tamano: "chico", onClick: () => cerrar(true) }, "No volver a mostrar avisos"),
      h(Boton, { variante: "contorno", onClick: verEnCalendario }, "Ver en el calendario"),
      h(Boton, { onClick: () => cerrar() }, "Cerrar"))
  },
  h("article", { className: `cal-aviso cal-aviso--${estadoTemporal(principal, hoy)} cal-cat--${principal.categoria}` },
    h("p", { className: "cal-aviso__categoria" }, CATEGORIAS[principal.categoria] ?? "Fecha importante"),
    h("h3", { className: "cal-aviso__titulo" }, principal.titulo),
    h("p", { className: "cal-aviso__cuenta" }, textoDias(principal, hoy)),
    h("p", { className: "cal-aviso__fecha" }, textoPeriodo(principal)),
    principal.descripcion ? h("p", { className: "cal-aviso__texto" }, principal.descripcion) : null,
    principal.urlReferencia ? h("a", { className: "cal-aviso__fuente", href: principal.urlReferencia, target: "_blank", rel: "noopener noreferrer" }, "Fuente oficial") : null),
  otros.length ? h("ul", { className: "cal-aviso__otros", "aria-label": "Otras fechas cercanas" },
    otros.map((e) => h("li", { key: e.id }, h("strong", null, e.titulo), h("span", null, `${textoPeriodo(e)} · ${textoDias(e, hoy)}`)))) : null,
  restantes ? h("p", { className: "cal-aviso__mas" }, `Y ${restantes} fechas más en el calendario.`) : null);
}
