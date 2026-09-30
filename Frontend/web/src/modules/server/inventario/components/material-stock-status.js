import { h } from "../../../../layouts/site-layout.js";

/**
 * Componente que calcula y muestra el estado visual del stock de un material.
 */
export function MaterialStockStatus({ quantity = 0, minQuantity = 0, status = "disponible", showDetails = false }) {
  let badgeClass = "server-badge-normal";
  let label = "Normal";
  let description = `${quantity} en inventario`;

  if (status === "dado_de_baja") {
    badgeClass = "server-badge-baja";
    label = "Dado de baja";
    description = "Material inactivo";
  } else if (status === "mantenimiento") {
    badgeClass = "server-badge-mantenimiento";
    label = "En Mantenimiento";
    description = "No disponible temporalmente";
  } else if (status === "en_uso") {
    badgeClass = "server-badge-en-uso";
    label = "En Uso";
    description = `${quantity} asignados`;
  } else if (quantity === 0) {
    badgeClass = "server-badge-agotado";
    label = "Sin Stock";
    description = "Agotado (Mín: " + minQuantity + ")";
  } else if (quantity <= minQuantity) {
    badgeClass = "server-badge-bajo";
    label = "Stock Bajo";
    description = `Crítico (${quantity} de ${minQuantity} mín)`;
  } else {
    badgeClass = "server-badge-disponible";
    label = "Disponible";
    description = `${quantity} disponibles`;
  }

  return h(
    "div",
    { className: "stock-status-wrapper" },
    h("span", { className: `server-badge ${badgeClass}` }, label),
    showDetails ? h("span", { className: "stock-status-detail" }, description) : null
  );
}

export function MaterialCategoryBadge({ category }) {
  const cat = (category || "otro").toLowerCase();
  const catLabels = {
    tecnologia: "Tecnología",
    equipamiento: "Equipamiento",
    material: "Material",
    herramienta: "Herramienta",
    mobiliario: "Mobiliario",
    otro: "Otro"
  };

  return h(
    "span",
    { className: `category-badge category-badge--${cat}` },
    catLabels[cat] || category
  );
}
