import React from "react";
import { createRoot } from "react-dom/client";
import { ModuleList } from "../components/module-list/module-list.js";
import { useCatalogModules } from "../services/catalog-api.js";

function App() {
  const { modules, source } = useCatalogModules();

  return React.createElement(ModuleList, {
    modules,
    status: source === "api" ? "API conectada" : "Modo estatico"
  });
}

createRoot(document.querySelector("#module-list")).render(React.createElement(App));
