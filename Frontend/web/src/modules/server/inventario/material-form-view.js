import React, { useState, useEffect } from "react";
import { h, ActionButton, IconoFigma } from "../../../layouts/site-layout.js";
import { DashboardCard } from "../../../components/dashboard/dashboard-card.js";
import { LoadingState, ErrorState } from "../../../components/common/state-handlers.js";
import { InventarioService } from "./inventario-service.js";
import { usePermisos, useSesion } from "../../../estado/index.js";
import { PERMISOS } from "../../../utils/permisos.js";

export default function MaterialFormView({ match }) {
  const sesion = useSesion();
  const { puede } = usePermisos();
  const schoolId = sesion?.assignments?.[0]?.schoolId || "esc-1";

  // Determinar si es modo edición a partir de la ruta (#/inventario/:id/editar)
  const hash = window.location.hash || "";
  const isEdit = hash.includes("/editar") || Boolean(match?.parametros?.id);
  const materialId = match?.parametros?.id || (isEdit ? hash.split("/")[2] : null);

  // Permisos requeridos
  const canPerform = isEdit
    ? puede(PERMISOS.inventoryEditar)
    : puede(PERMISOS.inventoryCrear);

  // Formulario y Estados
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "tecnologia",
    description: "",
    brand: "",
    model: "",
    serialNumber: "",
    quantity: 0,
    minQuantity: 1,
    unit: "unidad",
    location: "Server Central",
    spaceId: "server-1",
    status: "disponible",
    notes: ""
  });

  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Cargar datos existentes si está en modo edición
  useEffect(() => {
    if (!isEdit || !materialId) {
      setLoadingInitial(false);
      return;
    }

    let isMounted = true;
    async function loadItem() {
      setLoadingInitial(true);
      setApiError(null);
      try {
        const res = await InventarioService.getMaterial(materialId);
        const item = res?.data || res;
        if (isMounted && item) {
          setFormData({
            name: item.name || "",
            code: item.code || "",
            category: item.category || "tecnologia",
            description: item.description || "",
            brand: item.brand || "",
            model: item.model || "",
            serialNumber: item.serialNumber || "",
            quantity: item.quantity !== undefined ? item.quantity : 0,
            minQuantity: item.minQuantity !== undefined ? item.minQuantity : 1,
            unit: item.unit || "unidad",
            location: item.location || "Server Central",
            spaceId: item.spaceId || "server-1",
            status: item.status || "disponible",
            notes: item.notes || ""
          });
        }
      } catch (err) {
        console.error("Error al cargar material:", err);
        if (isMounted) {
          setApiError(err?.message || "No se pudo recuperar la información del material a editar.");
        }
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    loadItem();
    return () => { isMounted = false; };
  }, [isEdit, materialId]);

  // Manejo de cambios en campos del formulario
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value
    }));
    setHasUnsavedChanges(true);

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Validaciones del formulario
  const validateForm = () => {
    const errors = {};

    if (!formData.name || !formData.name.trim()) {
      errors.name = "El nombre del material es obligatorio.";
    } else if (formData.name.trim().length < 3) {
      errors.name = "El nombre debe contener al menos 3 caracteres.";
    }

    if (!formData.code || !formData.code.trim()) {
      errors.code = "El código identificador es obligatorio.";
    } else if (formData.code.trim().length < 2) {
      errors.code = "El código debe tener al menos 2 caracteres.";
    }

    if (!formData.category) {
      errors.category = "Selecciona una categoría válida.";
    }

    if (!isEdit) {
      if (formData.quantity === "" || formData.quantity < 0 || isNaN(formData.quantity)) {
        errors.quantity = "El stock inicial debe ser un número mayor o igual a 0.";
      }
    }

    if (formData.minQuantity === "" || formData.minQuantity < 0 || isNaN(formData.minQuantity)) {
      errors.minQuantity = "El stock mínimo debe ser un número mayor o igual a 0.";
    }

    if (!formData.location || !formData.location.trim()) {
      errors.location = "Indica la ubicación física de almacenamiento.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Solicitar confirmación antes de guardar
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  // Ejecución final del guardado hacia el backend
  const handleExecuteSave = async () => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      if (isEdit) {
        // En modificación, se actualizan solo los metadatos autorizados (el stock físico se gestiona vía movimientos)
        const payload = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          category: formData.category,
          description: formData.description.trim() || null,
          brand: formData.brand.trim() || null,
          model: formData.model.trim() || null,
          serialNumber: formData.serialNumber.trim() || null,
          minQuantity: Number(formData.minQuantity),
          unit: formData.unit,
          location: formData.location.trim(),
          spaceId: formData.spaceId,
          status: formData.status,
          notes: formData.notes.trim() || null
        };

        await InventarioService.updateMaterial(materialId, payload);
        setShowConfirmModal(false);
        setHasUnsavedChanges(false);
        window.location.hash = `#/inventario/${encodeURIComponent(materialId)}`;
      } else {
        // En alta, se registra el nuevo ítem con su stock inicial
        const payload = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          category: formData.category,
          description: formData.description.trim() || null,
          brand: formData.brand.trim() || null,
          model: formData.model.trim() || null,
          serialNumber: formData.serialNumber.trim() || null,
          quantity: Number(formData.quantity) || 0,
          minQuantity: Number(formData.minQuantity) || 0,
          unit: formData.unit,
          location: formData.location.trim(),
          spaceId: formData.spaceId,
          status: formData.status,
          schoolId,
          notes: formData.notes.trim() || null
        };

        const res = await InventarioService.createMaterial(payload);
        const newItemId = res?.id || res?.data?.id;
        setShowConfirmModal(false);
        setHasUnsavedChanges(false);
        window.location.hash = newItemId ? `#/inventario/${encodeURIComponent(newItemId)}` : "#/inventario";
      }
    } catch (err) {
      console.error("Error al guardar material:", err);
      setShowConfirmModal(false);
      setApiError(err?.message || "Ocurrió un error inesperado al procesar la solicitud con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return h(
      "section",
      { className: "welcome-panel alumnos-panel server-panel" },
      h(LoadingState, { mensaje: "Cargando información del material..." })
    );
  }

  if (!canPerform) {
    return h(
      "section",
      { className: "welcome-panel alumnos-panel server-panel" },
      h(ErrorState, {
        mensaje: "No tienes los permisos requeridos para registrar o modificar materiales en este módulo."
      })
    );
  }

  return h(
    "section",
    { className: "welcome-panel alumnos-panel server-panel" },

    // Barra superior institucional
    h(
      "div",
      { className: "dashboard-top-bar alumnos-top-nav" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            window.location.hash = isEdit && materialId ? `#/inventario/${encodeURIComponent(materialId)}` : "#/inventario";
          },
          title: "Volver al Inventario"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, isEdit ? "Volver a la Ficha" : "Volver al Inventario")
      ),
      h(
        "div",
        { className: "alumnos-top-badges" },
        h("span", { className: "badge-institucion" }, "E.E.S.T N° 1 Monte Grande"),
        h("span", { className: "badge-ciclo" }, isEdit ? "Modificación de Material" : "Alta de Material")
      )
    ),

    // Tarjeta Principal Blanca Contenedora
    h(
      DashboardCard,
      {
        title: isEdit ? `Modificar Material: ${formData.name || materialId}` : "Registrar Nuevo Material",
        icon: "clipboard",
        badge: isEdit ? `Código: ${formData.code || "S/C"}` : "Nuevo Registro",
        className: "dashboard-card--highlight alumnos-main-card",
        collapsible: false
      },

    // Mensaje de Error de API si ocurre
    apiError
      ? h(
          "div",
          { className: "server-alert server-alert--danger", role: "alert" },
          h(IconoFigma, { nombre: "alert", className: "alert-icon" }),
          h("div", { className: "alert-text" }, apiError)
        )
      : null,

    // Formulario principal
    h(
      "form",
      { className: "server-form-card", onSubmit: handleSubmit, noValidate: true },
      // Sección 1: Identificación y Clasificación
      h(
        "div",
        { className: "form-section" },
        h("h3", { className: "form-section-title" }, "1. Identificación y Clasificación"),
        h(
          "div",
          { className: "form-row-2" },
          h(
            "div",
            { className: `form-group ${validationErrors.name ? "has-error" : ""}` },
            h("label", { htmlFor: "field-name" }, "Nombre del Material / Equipo *"),
            h("input", {
              id: "field-name",
              name: "name",
              type: "text",
              className: "server-input",
              placeholder: "Ej. Proyector Láser Epson PowerLite",
              value: formData.name,
              onChange: handleChange,
              required: true
            }),
            validationErrors.name ? h("span", { className: "form-error-msg" }, validationErrors.name) : null
          ),
          h(
            "div",
            { className: `form-group ${validationErrors.code ? "has-error" : ""}` },
            h("label", { htmlFor: "field-code" }, "Código Institucional / Server *"),
            h("input", {
              id: "field-code",
              name: "code",
              type: "text",
              className: "server-input font-mono",
              placeholder: "Ej. PROY-01, ARD-04, CAB-06",
              value: formData.code,
              onChange: handleChange,
              required: true
            }),
            validationErrors.code ? h("span", { className: "form-error-msg" }, validationErrors.code) : null
          )
        ),

        h(
          "div",
          { className: "form-row-3" },
          h(
            "div",
            { className: `form-group ${validationErrors.category ? "has-error" : ""}` },
            h("label", { htmlFor: "field-category" }, "Categoría *"),
            h(
              "select",
              {
                id: "field-category",
                name: "category",
                className: "server-select",
                value: formData.category,
                onChange: handleChange
              },
              h("option", { value: "tecnologia" }, "Tecnología e Informática"),
              h("option", { value: "equipamiento" }, "Equipamiento de Laboratorio"),
              h("option", { value: "material" }, "Materiales y Consumibles"),
              h("option", { value: "herramienta" }, "Herramientas de Taller"),
              h("option", { value: "mobiliario" }, "Mobiliario y Racks"),
              h("option", { value: "otro" }, "Otro / Varios")
            ),
            validationErrors.category ? h("span", { className: "form-error-msg" }, validationErrors.category) : null
          ),
          h(
            "div",
            { className: "form-group" },
            h("label", { htmlFor: "field-brand" }, "Marca"),
            h("input", {
              id: "field-brand",
              name: "brand",
              type: "text",
              className: "server-input",
              placeholder: "Ej. Epson, TP-Link, Elegoo",
              value: formData.brand,
              onChange: handleChange
            })
          ),
          h(
            "div",
            { className: "form-group" },
            h("label", { htmlFor: "field-model" }, "Modelo"),
            h("input", {
              id: "field-model",
              name: "model",
              type: "text",
              className: "server-input",
              placeholder: "Ej. EB-L200F, TL-SG1024D",
              value: formData.model,
              onChange: handleChange
            })
          )
        ),

        h(
          "div",
          { className: "form-row-2" },
          h(
            "div",
            { className: "form-group" },
            h("label", { htmlFor: "field-serial" }, "Número de Serie / Lote"),
            h("input", {
              id: "field-serial",
              name: "serialNumber",
              type: "text",
              className: "server-input font-mono",
              placeholder: "Ej. EPS-98214 o S/N",
              value: formData.serialNumber,
              onChange: handleChange
            })
          ),
          h(
            "div",
            { className: "form-group" },
            h("label", { htmlFor: "field-unit" }, "Unidad de Medida"),
            h(
              "select",
              {
                id: "field-unit",
                name: "unit",
                className: "server-select",
                value: formData.unit,
                onChange: handleChange
              },
              h("option", { value: "unidad" }, "Unidad (u.)"),
              h("option", { value: "kit" }, "Kit / Set"),
              h("option", { value: "bobina" }, "Bobina"),
              h("option", { value: "metro" }, "Metros (m)"),
              h("option", { value: "caja" }, "Caja"),
              h("option", { value: "par" }, "Par")
            )
          )
        ),

        h(
          "div",
          { className: "form-group" },
          h("label", { htmlFor: "field-description" }, "Descripción Detallada"),
          h("textarea", {
            id: "field-description",
            name: "description",
            className: "server-textarea",
            rows: 2,
            placeholder: "Especificaciones técnicas, características de uso pedagógico o estado general...",
            value: formData.description,
            onChange: handleChange
          })
        )
      ),

      // Sección 2: Control de Stock y Existencias
      h(
        "div",
        { className: "form-section" },
        h("h3", { className: "form-section-title" }, "2. Control de Stock y Disponibilidad"),
        h(
          "div",
          { className: "form-row-3" },
          h(
            "div",
            { className: `form-group ${validationErrors.quantity ? "has-error" : ""}` },
            h("label", { htmlFor: "field-quantity" }, isEdit ? "Stock Físico Actual (Solo Lectura)" : "Stock Inicial *"),
            h("input", {
              id: "field-quantity",
              name: "quantity",
              type: "number",
              min: 0,
              className: `server-input font-mono ${isEdit ? "input-readonly" : ""}`,
              value: formData.quantity,
              onChange: handleChange,
              disabled: isEdit,
              required: !isEdit
            }),
            isEdit
              ? h("span", { className: "form-help-text text-muted" }, "ℹ Las altas/bajas de stock se realizan mediante movimientos de inventario.")
              : validationErrors.quantity ? h("span", { className: "form-error-msg" }, validationErrors.quantity) : null
          ),
          h(
            "div",
            { className: `form-group ${validationErrors.minQuantity ? "has-error" : ""}` },
            h("label", { htmlFor: "field-minQuantity" }, "Stock Mínimo Sugerido *"),
            h("input", {
              id: "field-minQuantity",
              name: "minQuantity",
              type: "number",
              min: 0,
              className: "server-input font-mono",
              value: formData.minQuantity,
              onChange: handleChange,
              required: true
            }),
            validationErrors.minQuantity ? h("span", { className: "form-error-msg" }, validationErrors.minQuantity) : null
          ),
          h(
            "div",
            { className: "form-group" },
            h("label", { htmlFor: "field-status" }, "Estado Operativo"),
            h(
              "select",
              {
                id: "field-status",
                name: "status",
                className: "server-select",
                value: formData.status,
                onChange: handleChange
              },
              h("option", { value: "disponible" }, "Disponible en Server"),
              h("option", { value: "en_uso" }, "En Uso / Asignado"),
              h("option", { value: "mantenimiento" }, "En Mantenimiento"),
              h("option", { value: "dado_de_baja" }, "Dado de Baja")
            )
          )
        )
      ),

      // Sección 3: Ubicación Física y Depósito
      h(
        "div",
        { className: "form-section" },
        h("h3", { className: "form-section-title" }, "3. Ubicación y Espacio"),
        h(
          "div",
          { className: "form-row-2" },
          h(
            "div",
            { className: `form-group ${validationErrors.location ? "has-error" : ""}` },
            h("label", { htmlFor: "field-location" }, "Ubicación Física (Estante / Armario / Rack) *"),
            h("input", {
              id: "field-location",
              name: "location",
              type: "text",
              className: "server-input",
              placeholder: "Ej. Server Central - Estante A1, Lab Robótica - Armario 2",
              value: formData.location,
              onChange: handleChange,
              required: true
            }),
            validationErrors.location ? h("span", { className: "form-error-msg" }, validationErrors.location) : null
          ),
          h(
            "div",
            { className: "form-group" },
            h("label", { htmlFor: "field-space" }, "Sector / Espacio Asignado"),
            h(
              "select",
              {
                id: "field-space",
                name: "spaceId",
                className: "server-select",
                value: formData.spaceId,
                onChange: handleChange
              },
              h("option", { value: "server-1" }, "Server Central / Recursos"),
              h("option", { value: "lab-robotica" }, "Laboratorio de Robótica"),
              h("option", { value: "lab-elect" }, "Laboratorio de Electrónica"),
              h("option", { value: "lab-informatica" }, "Laboratorio de Informática"),
              h("option", { value: "taller-mant" }, "Taller de Mantenimiento"),
              h("option", { value: "salon-actos" }, "Salón de Actos / Aula Magna")
            )
          )
        ),
        h(
          "div",
          { className: "form-group" },
          h("label", { htmlFor: "field-notes" }, "Observaciones Adicionales"),
          h("textarea", {
            id: "field-notes",
            name: "notes",
            className: "server-textarea",
            rows: 2,
            placeholder: "Recomendaciones de cuidado, accesorios incluidos o historial...",
            value: formData.notes,
            onChange: handleChange
          })
        )
      ),

      // Botones de acción del formulario
      h(
        "div",
        { className: "form-actions-bar" },
        h(
          "a",
          {
            href: isEdit ? `#/inventario/${encodeURIComponent(materialId)}` : "#/inventario",
            className: "action-button action-button--secondary"
          },
          "Cancelar"
        ),
        h(
          ActionButton,
          {
            tone: "primary",
            type: "submit",
            disabled: isSubmitting
          },
          isSubmitting
            ? "Guardando..."
            : isEdit
            ? "Guardar Modificaciones"
            : "Registrar Material"
        )
      )
    ),
    ),

    // Modal de Confirmación previo al guardado
    showConfirmModal
      ? h(
          "div",
          { className: "server-modal-backdrop", onClick: () => setShowConfirmModal(false) },
          h(
            "div",
            {
              className: "server-modal-content",
              onClick: (e) => e.stopPropagation(),
              role: "dialog",
              "aria-modal": "true"
            },
            h(
              "div",
              { className: "server-modal-header" },
              h(
                "div",
                { className: "server-modal-icon-badge" },
                h(IconoFigma, { nombre: "clipboard", className: "modal-header-icon" })
              ),
              h(
                "div",
                null,
                h("h3", { className: "server-modal-title" }, isEdit ? "Confirmar Modificación" : "Confirmar Alta de Material"),
                h("p", { className: "server-modal-subtitle" }, "Verifica los datos antes de sincronizar con la API")
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "server-modal-close-btn",
                  onClick: () => setShowConfirmModal(false)
                },
                "×"
              )
            ),
            h(
              "div",
              { className: "server-modal-body" },
              h(
                "div",
                { className: "confirm-summary-list" },
                h("div", { className: "summary-row" },
                  h("span", { className: "summary-lbl" }, "Material:"),
                  h("span", { className: "summary-val font-semibold" }, formData.name)
                ),
                h("div", { className: "summary-row" },
                  h("span", { className: "summary-lbl" }, "Código:"),
                  h("span", { className: "summary-val font-mono" }, formData.code.toUpperCase())
                ),
                h("div", { className: "summary-row" },
                  h("span", { className: "summary-lbl" }, "Categoría:"),
                  h("span", { className: "summary-val" }, formData.category)
                ),
                !isEdit
                  ? h("div", { className: "summary-row" },
                      h("span", { className: "summary-lbl" }, "Stock Inicial:"),
                      h("span", { className: "summary-val font-mono font-bold" }, `${formData.quantity} ${formData.unit}`)
                    )
                  : null,
                h("div", { className: "summary-row" },
                  h("span", { className: "summary-lbl" }, "Stock Mínimo:"),
                  h("span", { className: "summary-val font-mono" }, `${formData.minQuantity} ${formData.unit}`)
                ),
                h("div", { className: "summary-row" },
                  h("span", { className: "summary-lbl" }, "Ubicación:"),
                  h("span", { className: "summary-val" }, formData.location)
                ),
                h("div", { className: "summary-row" },
                  h("span", { className: "summary-lbl" }, "Estado:"),
                  h("span", { className: "summary-val" }, formData.status)
                )
              )
            ),
            h(
              "div",
              { className: "server-modal-footer" },
              h(
                ActionButton,
                {
                  tone: "secondary",
                  onClick: () => setShowConfirmModal(false),
                  disabled: isSubmitting
                },
                "Revisar"
              ),
              h(
                ActionButton,
                {
                  tone: "primary",
                  onClick: handleExecuteSave,
                  disabled: isSubmitting
                },
                isSubmitting ? "Sincronizando..." : "Confirmar y Guardar"
              )
            )
          )
        )
      : null
  );
}
