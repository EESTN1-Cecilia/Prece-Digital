import React, { useMemo, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { Confirmacion } from "../../../components/ui/index.js";
import { DirectorService } from "../director-service.js";

/* Reseteo de contraseñas de acceso del personal. La clave temporal se muestra
   una sola vez; quien la recibe debe cambiarla en su próximo ingreso. */
export function AccesosSection({ personal = [], usuarioActualId = null, onMostrarToast }) {
  const [busqueda, setBusqueda] = useState("");
  const [objetivo, setObjetivo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  const filtrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return personal
      .filter((p) => !p.roles.some((r) => r.id === "alumno"))
      .filter((p) => !q || [p.nombreCompleto, p.email, p.dni].some((c) => String(c ?? "").toLowerCase().includes(q)));
  }, [personal, busqueda]);

  const confirmarReset = async () => {
    if (!objetivo) return;
    setProcesando(true);
    setError("");
    try {
      const res = await DirectorService.resetearPassword(objetivo.id);
      setResultado({ nombre: objetivo.nombreCompleto, email: objetivo.email, password: res.passwordTemporal });
      setCopiado(false);
      setObjetivo(null);
      onMostrarToast?.(`Contraseña de ${objetivo.nombreCompleto} reseteada`);
    } catch (e) {
      setError(e?.message || "No se pudo resetear la contraseña.");
      setObjetivo(null);
    } finally {
      setProcesando(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resultado.password);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const iniciales = (p) =>
    ((p.nombre?.[0] ?? "") + (p.apellido?.[0] ?? "")).toUpperCase() || (p.email?.[0] ?? "?").toUpperCase();

  return h(
    "div",
    { className: "director-accesos" },
    h(
      "header",
      { className: "director-accesos-header" },
      h("span", { className: "director-accesos-icono", "aria-hidden": "true" }, "🔑"),
      h(
        "div",
        null,
        h("h2", { className: "director-accesos-titulo" }, "Accesos del personal"),
        h(
          "p",
          { className: "director-accesos-sub" },
          "Reseteá la contraseña de cualquier integrante del personal. Se genera una clave temporal, se cierran sus sesiones abiertas y deberá cambiarla al ingresar."
        )
      ),
      h("span", { className: "director-accesos-contador" }, `${filtrado.length} ${filtrado.length === 1 ? "persona" : "personas"}`)
    ),
    resultado
      ? h(
          "div",
          { className: "director-accesos-resultado", role: "status" },
          h("span", { className: "director-accesos-resultado-tit" }, `Clave temporal para ${resultado.nombre}`),
          h("code", { className: "director-accesos-clave" }, resultado.password),
          h("p", null, "Se muestra una sola vez. Entregásela en persona: no queda guardada en ningún lado."),
          h(
            "div",
            { className: "director-accesos-acciones" },
            h("button", { type: "button", className: "director-accesos-btn director-accesos-btn--primario", onClick: copiar }, copiado ? "✓ Copiada" : "Copiar clave"),
            h("button", { type: "button", className: "director-accesos-btn", onClick: () => setResultado(null) }, "Ocultar")
          )
        )
      : null,
    error ? h("p", { className: "director-accesos-error", role: "alert" }, error) : null,
    h(
      "div",
      { className: "director-accesos-card" },
      h(
        "div",
        { className: "director-accesos-filtro" },
        h("label", { className: "director-accesos-label", htmlFor: "accesos-buscar" }, "Buscar personal"),
        h(
          "div",
          { className: "director-accesos-buscar" },
          h("span", { className: "director-accesos-buscar-lupa", "aria-hidden": "true" }, "🔍"),
          h("input", {
            id: "accesos-buscar",
            type: "search",
            value: busqueda,
            placeholder: "Nombre, correo o DNI",
            onChange: (e) => setBusqueda(e.target.value)
          })
        )
      ),
      h(
        "div",
        { className: "director-table-responsive" },
        h(
          "table",
          { className: "director-accesos-tabla" },
          h("thead", null, h("tr", null, ["Persona", "Rol", "Estado", ""].map((t, i) => h("th", { key: i }, t)))),
          h(
            "tbody",
            null,
            filtrado.length === 0
              ? h("tr", null, h("td", { colSpan: 4, className: "director-accesos-vacio" }, "No hay personal que coincida con la búsqueda."))
              : filtrado.map((p) => {
                  const esAdmin = p.roles.some((r) => r.id === "admin");
                  const esUno = p.id === usuarioActualId;
                  const activo = p.estado === "activo";
                  return h(
                    "tr",
                    { key: p.id },
                    h(
                      "td",
                      null,
                      h(
                        "div",
                        { className: "director-accesos-persona" },
                        h("span", { className: "director-accesos-avatar", "aria-hidden": "true" }, iniciales(p)),
                        h("div", null, h("strong", null, p.nombreCompleto), h("small", null, p.email))
                      )
                    ),
                    h("td", null, p.roles.map((r) => h("span", { key: r.id, className: "director-accesos-rol" }, r.nombre))),
                    h("td", null, h("span", { className: `director-accesos-estado ${activo ? "is-activo" : "is-inactivo"}` }, activo ? "Activo" : "Inactivo")),
                    h(
                      "td",
                      { className: "director-accesos-celda-accion" },
                      h(
                        "button",
                        {
                          type: "button",
                          className: "director-accesos-btn director-accesos-btn--primario",
                          disabled: !activo || esUno || procesando,
                          title: esUno
                            ? "Cambiá tu clave desde tu perfil"
                            : !activo
                              ? "Reactivá la cuenta primero"
                              : esAdmin
                                ? "Solo un administrador puede resetear a otro administrador"
                                : undefined,
                          onClick: () => {
                            setError("");
                            setObjetivo(p);
                          }
                        },
                        "Resetear contraseña"
                      )
                    )
                  );
                })
          )
        )
      )
    ),
    h(Confirmacion, {
      abierto: Boolean(objetivo),
      titulo: "Resetear contraseña",
      mensaje: objetivo ? `¿Resetear la contraseña de ${objetivo.nombreCompleto}?` : "",
      detalle: "Se cerrarán sus sesiones abiertas y la clave actual dejará de funcionar.",
      textoConfirmar: "Resetear contraseña",
      textoCancelar: "Cancelar",
      variante: "peligro",
      cargando: procesando,
      onConfirmar: confirmarReset,
      onCancelar: () => { if (!procesando) setObjetivo(null); }
    })
  );
}
