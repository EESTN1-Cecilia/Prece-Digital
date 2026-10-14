import React, { useState } from "react";
import { h, IconoFigma } from "../../../layouts/site-layout.js";
import { ServerService } from "../server-service.js";

// 1. Modal de Detalle de Material
export function MaterialDetalleModal({ material, abierto, onCerrar, onRegistrarMovimiento }) {
  if (!abierto || !material) return null;

  return h(
    "div",
    { className: "modal-backdrop", onClick: onCerrar },
    h(
      "div",
      { className: "modal-card server-modal-card", onClick: (e) => e.stopPropagation() },
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-header-title-wrap" },
          h(
            "div",
            { className: "modal-header-icon-box" },
            h(IconoFigma, { nombre: "filter" })
          ),
          h(
            "div",
            null,
            h("h3", { className: "modal-title" }, material.name),
            h("p", { className: "modal-subtitle" }, `Código: ${material.code || material.id} • Categoría: ${material.category}`)
          )
        ),
        h(
          "button",
          { type: "button", className: "modal-close-btn", onClick: onCerrar },
          "×"
        )
      ),
      h(
        "div",
        { className: "modal-body server-modal-body" },
        h(
          "div",
          { className: "material-detail-grid" },
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Stock Actual:"),
            h("strong", { className: `detail-val ${material.quantity === 0 ? "text-danger" : material.quantity <= material.minQuantity ? "text-warning" : "text-success"}` },
              `${material.quantity} ${material.unit || "unidades"}`
            )
          ),
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Stock Mínimo:"),
            h("strong", { className: "detail-val" }, `${material.minQuantity} ${material.unit || "unidades"}`)
          ),
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Marca / Fabricante:"),
            h("span", { className: "detail-val" }, material.brand || "Sin especificar")
          ),
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Modelo:"),
            h("span", { className: "detail-val" }, material.model || "Sin especificar")
          ),
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Número de Serie:"),
            h("span", { className: "detail-val" }, material.serialNumber || "N/A")
          ),
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Ubicación / Espacio:"),
            h("span", { className: "detail-val" }, material.location || material.spaceId || "Server Central")
          ),
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Estado Operativo:"),
            h("span", { className: "detail-val" }, material.status || "Disponible")
          ),
          h("div", { className: "detail-field" },
            h("span", { className: "detail-label" }, "Última Actualización:"),
            h("span", { className: "detail-val" }, material.updatedAt ? new Date(material.updatedAt).toLocaleDateString("es-AR") : "Reciente")
          )
        ),
        material.description
          ? h(
              "div",
              { className: "material-detail-desc" },
              h("strong", null, "Descripción:"),
              h("p", null, material.description)
            )
          : null
      ),
      h(
        "div",
        { className: "modal-actions" },
        h(
          "button",
          {
            type: "button",
            className: "modal-actions-btn modal-actions-btn--secondary",
            onClick: onCerrar
          },
          "Cerrar"
        ),
        h(
          "button",
          {
            type: "button",
            className: "modal-actions-btn modal-actions-btn--primary",
            onClick: () => {
              onCerrar();
              if (onRegistrarMovimiento) onRegistrarMovimiento(material);
            }
          },
          "Registrar Movimiento"
        )
      )
    )
  );
}

// 2. Modal de Cargar Nuevo Material
export function CargarMaterialModal({ abierto, onCerrar, onGuardadoExitoso }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    category: "tecnologia",
    quantity: 1,
    minQuantity: 2,
    unit: "unidad",
    brand: "",
    model: "",
    location: "Server Central",
    description: "",
    schoolId: "esc-1"
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      setError("El nombre y el código del material son obligatorios.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await ServerService.createItem({
        ...form,
        quantity: Number(form.quantity),
        minQuantity: Number(form.minQuantity)
      });
      if (onGuardadoExitoso) onGuardadoExitoso();
      onCerrar();
    } catch (err) {
      setError(err.message || "Error al crear el material en el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return h(
    "div",
    { className: "modal-backdrop", onClick: onCerrar },
    h(
      "div",
      { className: "modal-card server-modal-card", onClick: (e) => e.stopPropagation() },
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-header-title-wrap" },
          h("div", { className: "modal-header-icon-box" }, h(IconoFigma, { nombre: "clipboard" })),
          h(
            "div",
            null,
            h("h3", { className: "modal-title" }, "Nuevo Material / Recurso"),
            h("p", { className: "modal-subtitle" }, "Alta de equipo, insumo o herramienta para Server")
          )
        ),
        h("button", { type: "button", className: "modal-close-btn", onClick: onCerrar }, "×")
      ),
      h(
        "form",
        { onSubmit: handleSubmit },
        h(
          "div",
          { className: "modal-body" },
          error ? h("div", { className: "state-error-inline text-danger" }, error) : null,
          h(
            "div",
            { className: "modal-form-grid" },
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Nombre del Material *"),
              h("input", {
                type: "text",
                className: "form-input",
                required: true,
                value: form.name,
                placeholder: "Ej: Proyector HDMI Láser",
                onChange: (e) => setForm({ ...form, name: e.target.value })
              })
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Código / Identificador *"),
              h("input", {
                type: "text",
                className: "form-input",
                required: true,
                value: form.code,
                placeholder: "Ej: PROY-05",
                onChange: (e) => setForm({ ...form, code: e.target.value })
              })
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Categoría"),
              h("select", {
                className: "form-input",
                value: form.category,
                onChange: (e) => setForm({ ...form, category: e.target.value })
              },
                h("option", { value: "tecnologia" }, "Tecnología"),
                h("option", { value: "material" }, "Material"),
                h("option", { value: "equipamiento" }, "Equipamiento"),
                h("option", { value: "herramienta" }, "Herramienta"),
                h("option", { value: "mobiliario" }, "Mobiliario"),
                h("option", { value: "otro" }, "Otro")
              )
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Cantidad Inicial"),
              h("input", {
                type: "number",
                className: "form-input",
                min: "0",
                value: form.quantity,
                onChange: (e) => setForm({ ...form, quantity: e.target.value })
              })
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Stock Mínimo de Alerta"),
              h("input", {
                type: "number",
                className: "form-input",
                min: "0",
                value: form.minQuantity,
                onChange: (e) => setForm({ ...form, minQuantity: e.target.value })
              })
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Ubicación en Server"),
              h("input", {
                type: "text",
                className: "form-input",
                value: form.location,
                placeholder: "Ej: Estante B2, Rack 1",
                onChange: (e) => setForm({ ...form, location: e.target.value })
              })
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Marca"),
              h("input", {
                type: "text",
                className: "form-input",
                value: form.brand,
                placeholder: "Ej: Epson / TP-Link",
                onChange: (e) => setForm({ ...form, brand: e.target.value })
              })
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Modelo"),
              h("input", {
                type: "text",
                className: "form-input",
                value: form.model,
                placeholder: "Ej: EB-L200F",
                onChange: (e) => setForm({ ...form, model: e.target.value })
              })
            )
          ),
          h("div", { className: "form-group full-width mt-3" },
            h("label", { className: "form-label" }, "Descripción / Observaciones"),
            h("textarea", {
              className: "form-input form-textarea",
              rows: 2,
              value: form.description,
              placeholder: "Detalles adicionales sobre el recurso...",
              onChange: (e) => setForm({ ...form, description: e.target.value })
            })
          )
        ),
        h(
          "div",
          { className: "modal-actions" },
          h(
            "button",
            { type: "button", className: "modal-actions-btn modal-actions-btn--secondary", onClick: onCerrar },
            "Cancelar"
          ),
          h(
            "button",
            {
              type: "submit",
              className: "modal-actions-btn modal-actions-btn--primary",
              disabled: guardando
            },
            guardando ? "Guardando..." : "Crear Material"
          )
        )
      )
    )
  );
}

// 3. Modal de Registro de Movimiento de Stock
export function RegistrarMovimientoModal({ materialInicial, materiales = [], abierto, onCerrar, onMovimientoExitoso }) {
  const [itemId, setItemId] = useState(materialInicial?.id || (materiales[0]?.id ?? ""));
  const [tipo, setTipo] = useState("ingreso");
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState("");
  const [destino, setDestino] = useState("Server Central");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemId || !cantidad || Number(cantidad) <= 0) {
      setError("Selecciona un material y una cantidad válida mayor a 0.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await ServerService.createMovement({
        itemId,
        type: tipo,
        quantity: Number(cantidad),
        toSpaceId: destino,
        notes: notas || `Movimiento de ${tipo} registrado desde el dashboard`,
        schoolId: "esc-1"
      });
      if (onMovimientoExitoso) onMovimientoExitoso();
      onCerrar();
    } catch (err) {
      setError(err.message || "Error al registrar el movimiento.");
    } finally {
      setGuardando(false);
    }
  };

  return h(
    "div",
    { className: "modal-backdrop", onClick: onCerrar },
    h(
      "div",
      { className: "modal-card server-modal-card", onClick: (e) => e.stopPropagation() },
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-header-title-wrap" },
          h("div", { className: "modal-header-icon-box" }, h(IconoFigma, { nombre: "activity" })),
          h(
            "div",
            null,
            h("h3", { className: "modal-title" }, "Registrar Movimiento de Stock"),
            h("p", { className: "modal-subtitle" }, "Control de ingreso, egreso o transferencia de recursos")
          )
        ),
        h("button", { type: "button", className: "modal-close-btn", onClick: onCerrar }, "×")
      ),
      h(
        "form",
        { onSubmit: handleSubmit },
        h(
          "div",
          { className: "modal-body" },
          error ? h("div", { className: "state-error-inline text-danger" }, error) : null,
          h(
            "div",
            { className: "modal-form-grid" },
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Material *"),
              h("select", {
                className: "form-input",
                value: itemId,
                onChange: (e) => setItemId(e.target.value)
              },
                materiales.map((m) =>
                  h("option", { key: m.id, value: m.id }, `${m.name} (Stock: ${m.quantity} ${m.unit || "uds"})`)
                )
              )
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Tipo de Movimiento *"),
              h("select", {
                className: "form-input",
                value: tipo,
                onChange: (e) => setTipo(e.target.value)
              },
                h("option", { value: "ingreso" }, "📥 Ingreso (Alta o reposición)"),
                h("option", { value: "egreso" }, "📤 Egreso (Entrega o préstamo)"),
                h("option", { value: "transferencia" }, "🔄 Transferencia a otro sector"),
                h("option", { value: "ajuste" }, "⚖️ Ajuste de inventario")
              )
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Cantidad *"),
              h("input", {
                type: "number",
                className: "form-input",
                min: "1",
                required: true,
                value: cantidad,
                onChange: (e) => setCantidad(e.target.value)
              })
            ),
            h("div", { className: "form-group" },
              h("label", { className: "form-label" }, "Destino / Sector"),
              h("input", {
                type: "text",
                className: "form-input",
                value: destino,
                placeholder: "Ej: Laboratorio 1, Taller 4, Sala Docentes",
                onChange: (e) => setDestino(e.target.value)
              })
            )
          ),
          h("div", { className: "form-group full-width mt-3" },
            h("label", { className: "form-label" }, "Motivo u Observación"),
            h("textarea", {
              className: "form-input form-textarea",
              rows: 2,
              value: notas,
              placeholder: "Detalle del movimiento, persona receptora, orden de trabajo...",
              onChange: (e) => setNotas(e.target.value)
            })
          )
        ),
        h(
          "div",
          { className: "modal-actions" },
          h(
            "button",
            { type: "button", className: "modal-actions-btn modal-actions-btn--secondary", onClick: onCerrar },
            "Cancelar"
          ),
          h(
            "button",
            {
              type: "submit",
              className: "modal-actions-btn modal-actions-btn--primary",
              disabled: guardando
            },
            guardando ? "Registrando..." : "Confirmar Movimiento"
          )
        )
      )
    )
  );
}

// 4. Modal de Gestión de Solicitud
export function GestionarSolicitudModal({ solicitud, abierto, onCerrar, onEstadoActualizado }) {
  const [nuevoEstado, setNuevoEstado] = useState(solicitud?.estado || "en_progreso");
  const [guardando, setGuardando] = useState(false);

  if (!abierto || !solicitud) return null;

  const handleUpdate = async (estado) => {
    setGuardando(true);
    try {
      await ServerService.updateRequest(solicitud.id, { status: estado });
      if (onEstadoActualizado) onEstadoActualizado();
      onCerrar();
    } catch {
      // Fallback
      if (onEstadoActualizado) onEstadoActualizado();
      onCerrar();
    } finally {
      setGuardando(false);
    }
  };

  return h(
    "div",
    { className: "modal-backdrop", onClick: onCerrar },
    h(
      "div",
      { className: "modal-card server-modal-card", onClick: (e) => e.stopPropagation() },
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-header-title-wrap" },
          h("div", { className: "modal-header-icon-box" }, h(IconoFigma, { nombre: "clipboard" })),
          h(
            "div",
            null,
            h("h3", { className: "modal-title" }, solicitud.titulo),
            h("p", { className: "modal-subtitle" }, `Solicitado por: ${solicitud.solicitante} (${solicitud.sector})`)
          )
        ),
        h("button", { type: "button", className: "modal-close-btn", onClick: onCerrar }, "×")
      ),
      h(
        "div",
        { className: "modal-body" },
        h("p", { className: "mb-3" }, solicitud.descripcion),
        h("div", { className: "detail-field mb-2" },
          h("span", { className: "detail-label" }, "Prioridad:"),
          h("strong", null, solicitud.prioridad?.toUpperCase())
        ),
        h("div", { className: "detail-field mb-2" },
          h("span", { className: "detail-label" }, "Fecha límite:"),
          h("span", null, solicitud.fechaLimite || "Sin fecha límite especificada")
        )
      ),
      h(
        "div",
        { className: "modal-actions" },
        h(
          "button",
          { type: "button", className: "modal-actions-btn modal-actions-btn--secondary", onClick: onCerrar },
          "Cerrar"
        ),
        h(
          "button",
          {
            type: "button",
            className: "modal-actions-btn modal-actions-btn--danger",
            disabled: guardando,
            onClick: () => handleUpdate("rechazada")
          },
          "Rechazar"
        ),
        h(
          "button",
          {
            type: "button",
            className: "modal-actions-btn modal-actions-btn--primary",
            disabled: guardando,
            onClick: () => handleUpdate("resuelta")
          },
          "Marcar Resuelta"
        )
      )
    )
  );
}
