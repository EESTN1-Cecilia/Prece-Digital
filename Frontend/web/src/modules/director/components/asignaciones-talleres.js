import React, { useCallback, useEffect, useMemo, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { StudentsService } from "../../students/students-service.js";
import { JefaturaService } from "../../jefatura/jefatura-service.js";
import { divisionesVisibles, gruposDeDivision } from "../../jefatura/talleres-cronograma.js";

/* Direccion: asigna un profe a cada grupo de taller (1.1, 1.3, ...).
   Cada eleccion se guarda en el sistema al instante; Jefatura y el docente la leen de ahi. */

const ESTILOS = `
.at-wrap{display:flex;flex-direction:column;gap:14px}
.at-barra{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.at-barra input[type=search]{flex:1 1 220px;min-height:40px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}
.at-filtros{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.at-filtros button{min-height:36px;padding:0 12px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;font:inherit;cursor:pointer}
.at-filtros button[aria-pressed=true]{background:#0f766e;border-color:#0f766e;color:#fff}
.at-resumen{color:#475569;font-size:.9rem}
.at-lista{display:flex;flex-direction:column;gap:10px}
.at-curso{border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;background:#fff;display:grid;gap:10px}
.at-curso h3{margin:0;font-size:1rem}
.at-curso small{color:#64748b}
.at-grupos{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.at-grupo{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0}
.at-grupo label{font-weight:600;font-size:.9rem}
.at-grupo select{min-height:40px;padding:0 8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;width:100%}
.at-grupo--libre{border-style:dashed}
.at-estado{font-size:.8rem;color:#64748b;min-height:1em}
.at-estado--error{color:#b91c1c}
.at-aviso{padding:12px;border-radius:10px;background:#fef9c3;color:#713f12}
`;

function nombreDe(persona) {
  return (
    persona.nombreCompleto ||
    persona.displayName ||
    [persona.nombre, persona.apellido].filter(Boolean).join(" ") ||
    persona.email ||
    "Docente"
  ).trim();
}

function esDocente(persona) {
  return (persona.roles ?? []).some((rol) => {
    const id = typeof rol === "string" ? rol : rol?.id ?? rol?.role;
    return id === "docente" || id === "profesor";
  });
}

export function opcionesDocentes(personal = [], asignaciones = []) {
  const porId = new Map();
  for (const persona of personal.filter(esDocente)) {
    const id = String(persona.id ?? persona.email ?? "");
    if (id) porId.set(id, { id, nombre: nombreDe(persona), email: String(persona.email ?? "").toLowerCase() });
  }
  /* Un profe ya asignado sigue apareciendo aunque ya no figure en el personal. */
  for (const item of asignaciones) {
    if (item.docente?.id && !porId.has(item.docente.id)) porId.set(item.docente.id, item.docente);
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function cursosConGrupos(divisiones = []) {
  const visibles = divisionesVisibles(divisiones).sort((a, b) => a.anio - b.anio || Number(a.division) - Number(b.division));
  return visibles.map((division) => ({
    clave: String(division.clave ?? `${division.anio}-${division.division}`),
    anio: division.anio,
    division: String(division.division),
    turno: division.turnoTaller || division.turnoAula || "",
    grupos: gruposDeDivision(
      division.anio,
      division.division,
      visibles.filter((item) => item.anio === division.anio).map((item) => item.division)
    )
  }));
}

export default function AsignacionesTalleres({ personal = [], onMostrarToast, onContar }) {
  const [cursos, setCursos] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [error, setError] = useState(null);
  const [estados, setEstados] = useState({}); // grupo -> "guardando" | "error"
  const [anio, setAnio] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(() => {
    setError(null);
    Promise.all([StudentsService.getDivisiones(), JefaturaService.listarDocentesTalleres()])
      .then(([divisiones, lista]) => {
        setCursos(cursosConGrupos(divisiones ?? []));
        setAsignaciones(lista ?? []);
      })
      .catch((err) => setError(err.mensaje || err.message || "No se pudieron cargar los grupos de taller."));
  }, []);

  useEffect(() => cargar(), [cargar]);

  useEffect(() => {
    if (onContar) onContar(asignaciones.length);
  }, [asignaciones, onContar]);

  const docentes = useMemo(() => opcionesDocentes(personal, asignaciones), [personal, asignaciones]);
  const porGrupo = useMemo(() => new Map(asignaciones.map((item) => [item.grupo, item])), [asignaciones]);

  const elegir = async (curso, grupo, docenteId) => {
    const docente = docenteId ? docentes.find((item) => item.id === docenteId) ?? null : null;
    setEstados((actual) => ({ ...actual, [grupo]: "guardando" }));
    try {
      const lista = await JefaturaService.guardarDocentesTalleres([{ grupo, anio: curso.anio, division: curso.division, docente }]);
      setAsignaciones(lista ?? []);
      setEstados((actual) => ({ ...actual, [grupo]: undefined }));
      if (onMostrarToast) onMostrarToast(docente ? `Grupo ${grupo}: ${docente.nombre}.` : `Grupo ${grupo} quedó sin profe.`);
    } catch (err) {
      setEstados((actual) => ({ ...actual, [grupo]: "error" }));
      if (onMostrarToast) onMostrarToast(err.mensaje || "No se pudo guardar el profe del grupo.");
    }
  };

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (cursos ?? []).filter((curso) => {
      if (anio !== "todos" && curso.anio !== Number(anio)) return false;
      if (!texto) return true;
      const conProfe = curso.grupos.map((grupo) => porGrupo.get(grupo)?.docente?.nombre ?? "").join(" ");
      return `${curso.anio}° ${curso.division} ${curso.grupos.join(" ")} ${conProfe}`.toLowerCase().includes(texto);
    });
  }, [cursos, anio, busqueda, porGrupo]);

  if (error) {
    return h("div", { className: "at-aviso", role: "alert" }, error, " ", h("button", { type: "button", onClick: cargar }, "Reintentar"));
  }
  if (!cursos) return h("p", { className: "at-resumen" }, "Cargando grupos de taller...");

  const totalGrupos = cursos.reduce((suma, curso) => suma + curso.grupos.length, 0);
  const conProfe = cursos.reduce((suma, curso) => suma + curso.grupos.filter((grupo) => porGrupo.has(grupo)).length, 0);

  return h(
    "div",
    { className: "at-wrap" },
    h("style", null, ESTILOS),
    h(
      "div",
      { className: "at-barra" },
      h("input", { type: "search", value: busqueda, placeholder: "Buscar curso, grupo (1.1) o profe", "aria-label": "Buscar curso, grupo o profe", onChange: (e) => setBusqueda(e.target.value) }),
      h(
        "div",
        { className: "at-filtros", role: "group", "aria-label": "Año" },
        ["todos", 1, 2, 3, 4, 5, 6, 7].map((valor) =>
          h("button", { key: valor, type: "button", "aria-pressed": String(anio) === String(valor), onClick: () => setAnio(valor) }, valor === "todos" ? "Todos" : `${valor}°`)
        )
      )
    ),
    h("p", { className: "at-resumen" }, `${conProfe} de ${totalGrupos} grupos de taller tienen profe asignado.`),
    docentes.length === 0
      ? h("div", { className: "at-aviso" }, "Todavía no hay docentes cargados en el personal. Creá los perfiles docentes para poder asignarlos a los grupos.")
      : null,
    visibles.length === 0
      ? h("p", { className: "at-resumen" }, "No hay cursos para ese filtro.")
      : h(
          "div",
          { className: "at-lista" },
          visibles.map((curso) =>
            h(
              "article",
              { key: curso.clave, className: "at-curso" },
              h("div", null, h("h3", null, `${curso.anio}° año · División ${curso.division}`), curso.turno ? h("small", null, `Turno ${String(curso.turno).toLowerCase()}`) : null),
              h(
                "div",
                { className: "at-grupos" },
                curso.grupos.map((grupo) => {
                  const actual = porGrupo.get(grupo)?.docente ?? null;
                  const estado = estados[grupo];
                  return h(
                    "div",
                    { key: grupo, className: `at-grupo${actual ? "" : " at-grupo--libre"}` },
                    h("label", { htmlFor: `at-${grupo}` }, `Grupo ${grupo}`),
                    h(
                      "select",
                      {
                        id: `at-${grupo}`,
                        value: actual?.id ?? "",
                        disabled: estado === "guardando",
                        onChange: (e) => elegir(curso, grupo, e.target.value)
                      },
                      h("option", { value: "" }, "Sin profe asignado"),
                      docentes.map((docente) => h("option", { key: docente.id, value: docente.id }, docente.nombre))
                    ),
                    h("span", { className: `at-estado${estado === "error" ? " at-estado--error" : ""}`, role: "status" }, estado === "guardando" ? "Guardando..." : estado === "error" ? "No se guardó. Elegí de nuevo." : "")
                  );
                })
              )
            )
          )
        )
  );
}
