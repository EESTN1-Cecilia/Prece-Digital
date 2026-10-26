import { useState, useEffect, useMemo, useRef } from "react";
import { h } from "../../layouts/site-layout.js";

import { StudentsService } from "../students/students-service.js";

// Lista de alumnos vacía por defecto (sin datos mock ni hardcodeados)
export const ALUMNOS_DEMO = [];

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function getFechaActual() {
  const d = new Date();
  return {
    dia: String(d.getDate()).padStart(2, "0"),
    mes: MESES[d.getMonth()],
    mesNumero: String(d.getMonth() + 1).padStart(2, "0"),
    anio: String(d.getFullYear())
  };
}

// Hook compartido para resolver el alumno activo y opciones de búsqueda en todos los modales de documentos
export function useDocumentStudent(alumnoInicial) {
  const getEffectiveId = (al) => {
    if (!al) return null;
    if (al.id !== undefined && al.id !== null) return al.id;
    if (al.dni) return al.dni;
    return null;
  };

  const [alumnoId, setAlumnoId] = useState(() => getEffectiveId(alumnoInicial));
  const [alumnosBD, setAlumnosBD] = useState(() => (alumnoInicial ? [alumnoInicial] : []));
  const [busqueda, setBusqueda] = useState("");

  // Cargar nómina real de alumnos de la base de datos
  useEffect(() => {
    let cancel = false;
    async function fetchAlumnos() {
      try {
        const res = await StudentsService.getAlumnos({
          estado: "activo",
          limit: 100,
          sortBy: "apellido",
          sortOrder: "asc"
        });
        if (!cancel && res?.data && res.data.length > 0) {
          setAlumnosBD((prev) => {
            const map = new Map();
            if (alumnoInicial) {
              const initId = getEffectiveId(alumnoInicial);
              if (initId) map.set(String(initId), alumnoInicial);
            }
            res.data.forEach((a) => {
              const id = getEffectiveId(a);
              if (id) map.set(String(id), a);
            });
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn("No se pudo cargar la nómina de alumnos desde la BD:", e);
      }
    }

    fetchAlumnos();
    return () => { cancel = true; };
  }, [alumnoInicial]);

  useEffect(() => {
    if (alumnoInicial) {
      setAlumnoId(getEffectiveId(alumnoInicial));
    }
  }, [alumnoInicial]);

  // Lista combinada de opciones con los alumnos reales de la base de datos
  const opcionesAlumnos = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return alumnosBD
      .filter((a) => {
        if (!q) return true;
        const nom = `${a.apellido || ""} ${a.nombre || ""}`.toLowerCase();
        const dni = String(a.dni || "").toLowerCase();
        return nom.includes(q) || dni.includes(q);
      })
      .map((a) => ({
        value: getEffectiveId(a),
        label: `${a.apellido || ""}, ${a.nombre || ""} (${a.curso || "1°"} ${a.division || "1"} - DNI: ${a.dni || "S/D"})`
      }));
  }, [alumnosBD, busqueda]);

  // Alumno resuelto estrictamente desde la base de datos o alumnoInicial
  const alumno = useMemo(() => {
    const curEffId = getEffectiveId(alumnoInicial);
    if (alumnoInicial && (!alumnoId || String(curEffId) === String(alumnoId))) {
      return {
        id: curEffId,
        apellido: alumnoInicial.apellido || alumnoInicial.nombreCompleto?.split(",")[0]?.trim() || "",
        nombre: alumnoInicial.nombre || alumnoInicial.nombreCompleto?.split(",")[1]?.trim() || "",
        dni: alumnoInicial.dni || "S/D",
        curso: alumnoInicial.curso || alumnoInicial.anio || "1°",
        division: String(alumnoInicial.division || "1"),
        turno: alumnoInicial.turno || "Mañana",
        orientacion:
          alumnoInicial.orientacion ||
          (parseInt(String(alumnoInicial.curso || "1"), 10) <= 3 ? "Ciclo Básico" : "Técnico en Informática"),
        ...alumnoInicial
      };
    }

    const found = alumnosBD.find((a) => String(getEffectiveId(a)) === String(alumnoId));
    if (found) {
      return {
        id: getEffectiveId(found),
        apellido: found.apellido || "",
        nombre: found.nombre || "",
        dni: found.dni || "S/D",
        curso: found.curso || "1°",
        division: String(found.division || "1"),
        turno: found.turno || "Mañana",
        orientacion: found.orientacion || "Ciclo Básico",
        ...found
      };
    }

    if (alumnoInicial) return alumnoInicial;
    if (alumnosBD.length > 0) return alumnosBD[0];

    return {
      id: "",
      apellido: "",
      nombre: "",
      dni: "",
      curso: "1°",
      division: "1",
      turno: "Mañana",
      orientacion: "Ciclo Básico"
    };
  }, [alumnoId, alumnoInicial, alumnosBD]);

  return {
    alumnoId,
    setAlumnoId,
    busqueda,
    setBusqueda,
    opcionesAlumnos,
    alumno
  };
}

// Componente Desplegable Estilizado para Barra Superior (Idéntico a AlumnoMatrizModal)
export function DarkCustomDropdown({
  label,
  value,
  opciones = [],
  onSelect,
  placeholder = "Seleccionar...",
  isSearchable = false,
  searchValue = "",
  onSearchChange = null
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [abierto]);

  const opcionSeleccionada = opciones.find((o) => String(o.value) === String(value));
  const textoMostrado = opcionSeleccionada ? opcionSeleccionada.label : placeholder;

  return h(
    "div",
    { className: "custom-dark-dropdown", ref },
    h(
      "button",
      {
        type: "button",
        className: `custom-dark-dropdown__btn ${abierto ? "custom-dark-dropdown__btn--open" : ""}`,
        onClick: () => setAbierto(!abierto),
        "aria-expanded": abierto
      },
      h("span", { className: "custom-dark-dropdown__label-title" }, label ? `${label}: ` : ""),
      h("span", { className: "custom-dark-dropdown__btn-text" }, textoMostrado),
      h(
        "svg",
        {
          className: `custom-dark-dropdown__chevron ${abierto ? "custom-dark-dropdown__chevron--open" : ""}`,
          viewBox: "0 0 20 20",
          fill: "currentColor"
        },
        h("path", {
          fillRule: "evenodd",
          d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z",
          clipRule: "evenodd"
        })
      )
    ),

    abierto
      ? h(
          "div",
          { className: "custom-dark-dropdown__menu" },
          isSearchable
            ? h(
                "div",
                { className: "custom-dark-dropdown__search-wrap" },
                h("input", {
                  type: "text",
                  className: "custom-dark-dropdown__search-input",
                  placeholder: "Buscar por nombre, apellido o DNI...",
                  value: searchValue,
                  onChange: (e) => onSearchChange && onSearchChange(e.target.value),
                  autoFocus: true,
                  onClick: (e) => e.stopPropagation()
                })
              )
            : null,
          h(
            "div",
            { className: "custom-dark-dropdown__list" },
            opciones.length === 0
              ? h("div", { className: "custom-dark-dropdown__item custom-dark-dropdown__item--empty" }, "No se encontraron resultados")
              : opciones.map((opcion) => {
                  const estaActiva = String(opcion.value) === String(value);
                  return h(
                    "button",
                    {
                      key: opcion.value,
                      type: "button",
                      className: `custom-dark-dropdown__item ${estaActiva ? "custom-dark-dropdown__item--active" : ""}`,
                      onClick: () => {
                        onSelect(opcion.value);
                        setAbierto(false);
                      }
                    },
                    h("span", { className: "custom-dark-dropdown__item-text" }, opcion.label),
                    estaActiva
                      ? h(
                          "svg",
                          { className: "custom-dark-dropdown__check-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                          h("path", {
                            fillRule: "evenodd",
                            d: "M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z",
                            clipRule: "evenodd"
                          })
                        )
                      : null
                  );
                })
          )
        )
      : null
  );
}

// Sello Institucional Circular (desactivado a solicitud oficial)
export function SelloInstitucionalCircular() {
  return null;
}

// Botón de Cierre en la barra superior que permanece fijo al scrollear
export function BotonCerrarBarra({ onCerrar }) {
  if (!onCerrar) return null;
  return h(
    "button",
    {
      type: "button",
      className: "matriz-close-btn-topright no-print",
      onClick: onCerrar,
      "aria-label": "Cerrar modal",
      title: "Cerrar"
    },
    h(
      "svg",
      { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", width: "18", height: "18" },
      h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
      h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
    )
  );
}
