import React, { useCallback, useEffect, useMemo, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { Alerta, Badge, Boton, Campo, Confirmacion, Select, Tabla } from "../../../components/ui/index.js";
import { DirectorService } from "../director-service.js";

/* Direccion: registra quien cubre a un preceptor y hasta cuando. El backend da y
   quita el acceso del suplente segun las fechas. */

const TONOS = { vigente: "ok", programada: "info", vencida: "neutral", finalizada: "off" };
const FORMULARIO = { titularId: "", suplenteId: "", desde: "", hasta: "", motivo: "" };

function fechaCorta(iso) {
  return iso ? iso.split("-").reverse().join("/") : "";
}

export default function AsignacionesSuplencias({ personal = [], divisiones = [], onMostrarToast, onContar }) {
  const [suplencias, setSuplencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(FORMULARIO);
  const [elegidas, setElegidas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [aFinalizar, setAFinalizar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await DirectorService.listarSuplencias();
      setSuplencias(lista);
      onContar?.(lista.filter((item) => item.estado === "vigente").length);
    } catch (fallo) {
      setError(fallo);
    } finally {
      setCargando(false);
    }
  }, [onContar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const preceptores = useMemo(
    () => personal
      .filter((persona) => persona.roles?.some((rol) => rol.id === "preceptor"))
      .map((persona) => ({ valor: persona.id, nombre: persona.nombreCompleto })),
    [personal]
  );
  const cursosDelTitular = useMemo(
    () => divisiones.filter((division) => division.preceptor?.id === form.titularId),
    [divisiones, form.titularId]
  );

  const campo = (nombre) => (valor) => setForm((previo) => ({ ...previo, [nombre]: valor }));

  const elegirTitular = (valor) => {
    setForm((previo) => ({ ...previo, titularId: valor }));
    setElegidas([]);
  };

  const alternarCurso = (id) => {
    setElegidas((previas) => (previas.includes(id) ? previas.filter((item) => item !== id) : [...previas, id]));
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      await DirectorService.crearSuplencia({
        titularId: form.titularId,
        suplenteId: form.suplenteId,
        desde: form.desde,
        hasta: form.hasta,
        motivo: form.motivo.trim() || null,
        /* Sin cursos marcados cubre todos los del titular. */
        ...(elegidas.length ? { divisiones: elegidas } : {})
      });
      setForm(FORMULARIO);
      setElegidas([]);
      onMostrarToast?.("Suplencia registrada.");
      await cargar();
    } catch (fallo) {
      setErrorForm(Object.values(fallo.campos ?? {}).join(" ") || fallo.mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const finalizar = async () => {
    try {
      await DirectorService.finalizarSuplencia(aFinalizar.id);
      onMostrarToast?.("Suplencia finalizada: el suplente ya no accede a esos cursos.");
      await cargar();
    } catch (fallo) {
      setError(fallo);
    } finally {
      setAFinalizar(null);
    }
  };

  const columnas = [
    { id: "titular", titulo: "Titular", celda: (fila) => fila.titular?.nombre ?? fila.titularId },
    { id: "suplente", titulo: "Suplente", celda: (fila) => fila.suplente?.nombre ?? fila.suplenteId },
    { id: "divisiones", titulo: "Cursos", celda: (fila) => fila.divisiones.map((id) => id.replace("-", "° ")).join(", ") },
    { id: "periodo", titulo: "Período", celda: (fila) => `${fechaCorta(fila.desde)} al ${fechaCorta(fila.hasta)}` },
    { id: "motivo", titulo: "Motivo", celda: (fila) => fila.motivo ?? "-" },
    { id: "estado", titulo: "Estado", celda: (fila) => h(Badge, { tono: TONOS[fila.estado] }, fila.estado) },
    {
      id: "acciones",
      titulo: "Acciones",
      celda: (fila) => (["vigente", "programada"].includes(fila.estado)
        ? h(Boton, { variante: "secundario", onClick: () => setAFinalizar(fila) }, "Finalizar")
        : null)
    }
  ];

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 16 } },
    h(
      "form",
      { onSubmit: guardar, style: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" } },
      h(Select, { id: "suplencia-titular", etiqueta: "Preceptor titular", valor: form.titularId, onChange: elegirTitular, opciones: preceptores, placeholder: "Elegir", requerido: true }),
      h(Select, { id: "suplencia-suplente", etiqueta: "Suplente", valor: form.suplenteId, onChange: campo("suplenteId"), opciones: preceptores.filter((item) => item.valor !== form.titularId), placeholder: "Elegir", requerido: true }),
      h(Campo, { id: "suplencia-desde", etiqueta: "Desde", tipo: "date", valor: form.desde, onChange: campo("desde"), requerido: true }),
      h(Campo, { id: "suplencia-hasta", etiqueta: "Hasta", tipo: "date", valor: form.hasta, onChange: campo("hasta"), requerido: true }),
      h(Campo, { id: "suplencia-motivo", etiqueta: "Motivo (opcional)", valor: form.motivo, onChange: campo("motivo") }),
      form.titularId
        ? h(
            "fieldset",
            { style: { gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 } },
            h("legend", null, "Cursos a cubrir (sin marcar: todos los del titular)"),
            cursosDelTitular.length
              ? cursosDelTitular.map((division) =>
                  h(
                    "label",
                    { key: division.id, style: { marginRight: 14, display: "inline-flex", gap: 6, alignItems: "center" } },
                    h("input", { type: "checkbox", checked: elegidas.includes(division.id), onChange: () => alternarCurso(division.id) }),
                    `${division.curso} ${division.numDivision}`
                  ))
              : h("p", null, "Este preceptor no tiene cursos asignados.")
          )
        : null,
      errorForm ? h("div", { style: { gridColumn: "1 / -1" } }, h(Alerta, { tono: "error" }, errorForm)) : null,
      h("div", { style: { gridColumn: "1 / -1" } }, h(Boton, { tipo: "submit", deshabilitado: guardando || !cursosDelTitular.length }, guardando ? "Guardando..." : "Registrar suplencia"))
    ),
    h(Tabla, {
      titulo: "Suplencias de preceptores",
      columnas,
      filas: suplencias,
      cargando,
      error,
      onReintentar: cargar,
      vacio: h("p", null, "Todavía no hay suplencias registradas.")
    }),
    h(Confirmacion, {
      abierto: Boolean(aFinalizar),
      titulo: "Finalizar suplencia",
      mensaje: "El suplente dejará de acceder a estos cursos ahora mismo.",
      onConfirmar: finalizar,
      onCancelar: () => setAFinalizar(null)
    })
  );
}
