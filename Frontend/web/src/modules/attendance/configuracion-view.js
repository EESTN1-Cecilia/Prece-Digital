import React, { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { pedir } from "../../services/http.js";
import { useUsuarioActual } from "../../estado/index.js";

const CANALES = [
  ["notificacion_interna", "Notificación interna"],
  ["correo", "Correo electrónico"],
  ["sms", "SMS"],
  ["app", "Aplicación móvil"]
];

const TIPOS_INASISTENCIA = [
  ["ausente", "Ausente"],
  ["tarde", "Llegada tarde"],
  ["media_falta", "Retiro anticipado"]
];

export default function ConfiguracionView() {
  const usuario = useUsuarioActual();
  const puedeConfigurar = usuario.permisos?.includes("attendance-alerts.configure") ?? false;
  const [configuracion, setConfiguracion] = useState(null);
  const [fechaNoHabil, setFechaNoHabil] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let vigente = true;
    pedir("/api/v1/configuracion-alertas")
      .then((data) => {
        if (vigente) setConfiguracion(data);
      })
      .catch((fallo) => {
        if (vigente) setError(fallo?.mensaje ?? "No se pudo cargar la configuración.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const cambiar = (campo, valor) => {
    setConfiguracion((actual) => ({ ...actual, [campo]: valor }));
    setError("");
    setAviso("");
  };

  const alternarLista = (campo, valor) => {
    const actual = configuracion[campo] ?? [];
    cambiar(campo, actual.includes(valor)
      ? actual.filter((elemento) => elemento !== valor)
      : [...actual, valor]);
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    if (!puedeConfigurar || !configuracion) return;
    if (!configuracion.tiposContabilizados.length || !configuracion.canales.length) {
      setError("Seleccioná al menos un tipo de inasistencia y un canal de notificación.");
      return;
    }

    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const datos = {
        habilitada: configuracion.habilitada,
        diasConsecutivos: Number(configuracion.diasConsecutivos),
        tiposContabilizados: configuracion.tiposContabilizados,
        justificadasGeneranAlerta: configuracion.justificadasGeneranAlerta,
        justificadasReinicianRacha: configuracion.justificadasReinicianRacha,
        prioridadNotificacion: configuracion.prioridadNotificacion,
        canales: configuracion.canales,
        diasNoHabiles: configuracion.diasNoHabiles,
        umbralAlertaInasistencias: Number(configuracion.umbralAlertaInasistencias)
      };
      const guardada = await pedir("/api/v1/configuracion-alertas", {
        method: "PUT",
        body: JSON.stringify(datos)
      });
      setConfiguracion(guardada);
      setAviso("La configuración se guardó correctamente.");
    } catch (fallo) {
      setError(fallo?.mensaje ?? "No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  };

  const agregarDiaNoHabil = () => {
    if (!fechaNoHabil || configuracion.diasNoHabiles.includes(fechaNoHabil)) return;
    cambiar("diasNoHabiles", [...configuracion.diasNoHabiles, fechaNoHabil].sort());
    setFechaNoHabil("");
  };

  if (cargando) {
    return h("section", { className: "configuracion-page" }, h("p", null, "Cargando configuración..."));
  }
  if (!configuracion) {
    return h(
      "section",
      { className: "configuracion-page" },
      h("h1", null, "Configuración"),
      h("p", { className: "configuracion-alerta configuracion-alerta--error", role: "alert" }, error)
    );
  }

  return h(
    "section",
    { className: "configuracion-page" },
    h("header", { className: "configuracion-header" },
      h("h1", null, "Configuración institucional"),
      h("p", null, "Administrá las reglas existentes para las alertas de inasistencia.")
    ),
    error ? h("p", { className: "configuracion-alerta configuracion-alerta--error", role: "alert" }, error) : null,
    aviso ? h("p", { className: "configuracion-alerta configuracion-alerta--ok", role: "status" }, aviso) : null,
    h(
      "form",
      { className: "configuracion-form", onSubmit: guardar },
      h("section", { className: "configuracion-card" },
        h("h2", null, "Detección de inasistencias consecutivas"),
        h("label", { className: "configuracion-check" },
          h("input", {
            type: "checkbox",
            checked: Boolean(configuracion.habilitada),
            disabled: !puedeConfigurar,
            onChange: (evento) => cambiar("habilitada", evento.target.checked)
          }),
          "Habilitar la detección de alertas"
        ),
        h("label", { className: "configuracion-field" },
          h("span", null, "Días lectivos consecutivos"),
          h("input", {
            type: "number",
            min: 1,
            max: 30,
            step: 1,
            value: configuracion.diasConsecutivos,
            disabled: !puedeConfigurar,
            onChange: (evento) => cambiar("diasConsecutivos", evento.target.value)
          })
        ),
        h("fieldset", { className: "configuracion-options" },
          h("legend", null, "Tipos que cuentan para la alerta"),
          TIPOS_INASISTENCIA.map(([valor, etiqueta]) => h("label", { className: "configuracion-check", key: valor },
            h("input", {
              type: "checkbox",
              checked: configuracion.tiposContabilizados.includes(valor),
              disabled: !puedeConfigurar,
              onChange: () => alternarLista("tiposContabilizados", valor)
            }),
            etiqueta
          ))
        ),
        h("label", { className: "configuracion-check" },
          h("input", {
            type: "checkbox",
            checked: Boolean(configuracion.justificadasGeneranAlerta),
            disabled: !puedeConfigurar,
            onChange: (evento) => cambiar("justificadasGeneranAlerta", evento.target.checked)
          }),
          "Las inasistencias justificadas generan alertas"
        ),
        h("label", { className: "configuracion-check" },
          h("input", {
            type: "checkbox",
            checked: Boolean(configuracion.justificadasReinicianRacha),
            disabled: !puedeConfigurar,
            onChange: (evento) => cambiar("justificadasReinicianRacha", evento.target.checked)
          }),
          "Las inasistencias justificadas reinician la racha"
        )
      ),
      h("section", { className: "configuracion-card" },
        h("h2", null, "Notificaciones y umbral"),
        h("label", { className: "configuracion-field" },
          h("span", null, "Prioridad"),
          h("select", {
            value: configuracion.prioridadNotificacion,
            disabled: !puedeConfigurar,
            onChange: (evento) => cambiar("prioridadNotificacion", evento.target.value)
          },
          h("option", { value: "baja" }, "Baja"),
          h("option", { value: "normal" }, "Normal"),
          h("option", { value: "alta" }, "Alta"))
        ),
        h("fieldset", { className: "configuracion-options" },
          h("legend", null, "Canales"),
          CANALES.map(([valor, etiqueta]) => h("label", { className: "configuracion-check", key: valor },
            h("input", {
              type: "checkbox",
              checked: configuracion.canales.includes(valor),
              disabled: !puedeConfigurar,
              onChange: () => alternarLista("canales", valor)
            }),
            etiqueta
          ))
        ),
        h("label", { className: "configuracion-field" },
          h("span", null, "Umbral de inasistencias"),
          h("input", {
            type: "number",
            min: 1,
            max: 200,
            step: 1,
            value: configuracion.umbralAlertaInasistencias,
            disabled: !puedeConfigurar,
            onChange: (evento) => cambiar("umbralAlertaInasistencias", evento.target.value)
          })
        )
      ),
      h("section", { className: "configuracion-card" },
        h("h2", null, "Días no hábiles"),
        h("p", null, "Las fechas agregadas se excluyen del cálculo de días lectivos."),
        h("div", { className: "configuracion-dia-form" },
          h("input", {
            type: "date",
            value: fechaNoHabil,
            disabled: !puedeConfigurar,
            onChange: (evento) => setFechaNoHabil(evento.target.value),
            "aria-label": "Fecha no hábil"
          }),
          h("button", { type: "button", disabled: !puedeConfigurar || !fechaNoHabil, onClick: agregarDiaNoHabil }, "Agregar fecha")
        ),
        configuracion.diasNoHabiles.length
          ? h("ul", { className: "configuracion-dias" }, configuracion.diasNoHabiles.map((dia) =>
              h("li", { key: dia }, dia,
                puedeConfigurar ? h("button", {
                  type: "button",
                  onClick: () => cambiar("diasNoHabiles", configuracion.diasNoHabiles.filter((item) => item !== dia)),
                  "aria-label": `Quitar ${dia}`
                }, "Quitar") : null
              )
            ))
          : h("p", { className: "configuracion-vacio" }, "No hay fechas configuradas.")
      ),
      puedeConfigurar
        ? h("button", { className: "configuracion-guardar", type: "submit", disabled: guardando },
            guardando ? "Guardando..." : "Guardar configuración")
        : h("p", { className: "configuracion-solo-lectura" }, "Tenés acceso de lectura. Solo Dirección puede modificar estas opciones.")
    )
  );
}