import { useEffect, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { CustomSelect } from "../../../components/common/custom-select.js";
import { fecha } from "../../../utils/formato.js";
import { PeriodosCargaService } from "../../grades/periodos-carga.js";

/* Pestaña "Carga de notas" del tablero del director: un checkbox por período
   (1° y 2° cuatrimestre, diciembre y febrero) que habilita o bloquea la carga
   de notas del ciclo lectivo elegido. Con un período bloqueado, docentes,
   preceptores y secretaría no pueden cargar ni corregir notas de ese período;
   la Dirección sí. */

function IconLock({ abierto = false }) {
  return h(
    "svg",
    { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    h("rect", { x: "4", y: "11", width: "16", height: "10", rx: "2" }),
    h("path", { d: abierto ? "M8 11V7a4 4 0 0 1 7.5-2" : "M8 11V7a4 4 0 0 1 8 0v4" })
  );
}

export function PeriodosCargaSection({ onMostrarToast = () => {} }) {
  const cicloActual = new Date().getFullYear();
  const [anio, setAnio] = useState(cicloActual);
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null); // id del período o "todos"

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    PeriodosCargaService.obtener(anio)
      .then((datos) => vigente && setEstado(datos))
      .catch((e) => vigente && setError(e?.mensaje ?? "No se pudo cargar el estado de los períodos."))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [anio]);

  const aplicar = async (cambios, clave, mensaje) => {
    setGuardando(clave);
    try {
      setEstado(await PeriodosCargaService.actualizar(anio, cambios));
      onMostrarToast(mensaje);
    } catch (e) {
      onMostrarToast(e?.mensaje ?? "No se pudo actualizar el período.");
    } finally {
      setGuardando(null);
    }
  };

  const alternar = (periodo, habilitado) =>
    aplicar(
      { [periodo.id]: habilitado },
      periodo.id,
      habilitado
        ? `Carga de notas habilitada: ${periodo.nombre} ${anio}.`
        : `Carga de notas bloqueada: ${periodo.nombre} ${anio}.`
    );

  const todos = (habilitado) =>
    aplicar(
      Object.fromEntries((estado?.periodos ?? []).map((periodo) => [periodo.id, habilitado])),
      "todos",
      habilitado ? `Todos los períodos de ${anio} quedaron habilitados.` : `Todos los períodos de ${anio} quedaron bloqueados.`
    );

  const periodos = estado?.periodos ?? [];
  const bloqueados = periodos.filter((periodo) => !periodo.habilitado).length;
  const ocupado = cargando || guardando !== null;

  return h(
    "div",
    { className: "director-periodos-section" },

    h(
      "div",
      { className: "director-pedidos-hero" },
      h(
        "div",
        { className: "director-pedidos-hero__text" },
        h("span", { className: "director-pedidos-tag" }, "Calificaciones"),
        h("h2", { className: "director-pedidos-title" }, "Habilitación de carga de notas"),
        h(
          "p",
          { className: "director-pedidos-subtitle" },
          "Marcá los períodos en los que docentes, preceptores y secretaría pueden cargar y corregir notas. Un período desmarcado queda bloqueado: la planilla y el boletín oficial no aceptan cambios en esas columnas."
        )
      ),
      h(
        "div",
        { className: "director-periodos-ciclo" },
        h("label", { htmlFor: "director-periodos-anio" }, "Ciclo lectivo"),
        h(CustomSelect, {
          id: "director-periodos-anio",
          value: String(anio),
          onChange: (valor) => setAnio(Number(valor)),
          options: [cicloActual - 1, cicloActual, cicloActual + 1].map((valor) => ({ value: String(valor), label: String(valor) })),
          ariaLabel: "Ciclo lectivo"
        })
      )
    ),

    h(
      "div",
      { className: "director-pedidos-security-banner" },
      h("div", { className: "director-pedidos-security-icon" }, h(IconLock, null)),
      h(
        "div",
        { className: "director-pedidos-security-content" },
        h("strong", null, "La Dirección no se bloquea: "),
        h("span", null, "admin y director pueden corregir notas de un período bloqueado. Cada cambio queda registrado con fecha y responsable.")
      )
    ),

    error ? h("div", { className: "director-periodos-error", role: "alert" }, error) : null,

    cargando
      ? h("p", { className: "director-periodos-cargando" }, "Cargando períodos...")
      : h(
        "div",
        { className: "director-periodos-lista" },
        periodos.map((periodo) =>
          h(
            "label",
            {
              key: periodo.id,
              className: `director-periodo-card ${periodo.habilitado ? "director-periodo-card--abierto" : "director-periodo-card--bloqueado"}`,
              htmlFor: `periodo-carga-${periodo.id}`
            },
            h("input", {
              id: `periodo-carga-${periodo.id}`,
              type: "checkbox",
              className: "director-periodo-check",
              checked: periodo.habilitado,
              disabled: ocupado,
              onChange: (evento) => alternar(periodo, evento.target.checked)
            }),
            h(
              "div",
              { className: "director-periodo-card__cuerpo" },
              h(
                "div",
                { className: "director-periodo-card__titulo" },
                h("strong", null, periodo.nombre),
                h(
                  "span",
                  { className: `director-periodo-estado ${periodo.habilitado ? "director-periodo-estado--abierto" : "director-periodo-estado--bloqueado"}` },
                  h(IconLock, { abierto: periodo.habilitado }),
                  guardando === periodo.id ? "Guardando..." : periodo.habilitado ? "Carga habilitada" : "Bloqueado"
                )
              ),
              h("p", { className: "director-periodo-card__desc" }, periodo.descripcion),
              periodo.actualizadoEn
                ? h(
                  "p",
                  { className: "director-periodo-card__meta" },
                  `${periodo.habilitado ? "Habilitado" : "Bloqueado"} el ${fecha(periodo.actualizadoEn)}${periodo.actualizadoPor?.nombre ? ` por ${periodo.actualizadoPor.nombre}` : ""}`
                )
                : null
            )
          )
        )
      ),

    !cargando && periodos.length > 0
      ? h(
        "div",
        { className: "director-periodos-acciones" },
        h("span", null, bloqueados === 0 ? "Todos los períodos están habilitados." : `${bloqueados} de ${periodos.length} períodos bloqueados.`),
        h(
          "div",
          { className: "director-periodos-acciones__botones" },
          h("button", { type: "button", className: "director-periodos-btn", disabled: ocupado || bloqueados === 0, onClick: () => todos(true) }, "Habilitar todos"),
          h("button", { type: "button", className: "director-periodos-btn director-periodos-btn--bloquear", disabled: ocupado || bloqueados === periodos.length, onClick: () => todos(false) }, "Bloquear todos")
        )
      )
      : null
  );
}

export default PeriodosCargaSection;
