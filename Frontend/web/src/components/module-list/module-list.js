import React from "react";

export function ModuleList({ modules, status }) {
  const statusElement = document.querySelector("#api-status");

  if (statusElement) {
    statusElement.textContent = status;
  }

  return React.createElement(
    React.Fragment,
    null,
    modules.map((module) =>
      React.createElement(
        "article",
        {
          className: "module-item",
          key: module.id
        },
        React.createElement("strong", null, module.name),
        React.createElement("span", null, module.description)
      )
    )
  );
}
