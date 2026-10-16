import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import * as XLSX from "xlsx";
import { obtenerLibroFolioLegajo, StudentsService, formatDni } from "../students-service.js";
import { pedir } from "../../../services/http.js";

// Definición oficial de materias según Matriz.xlsx y Resoluciones Provinciales PBA
export const PLANES_BOLETIN = {
  1: {
    nombreAnio: "1° Año",
    ciclo: "Ciclo Básico",
    formacionGeneral: [
      "CIENCIAS NATURALES",
      "CIENCIAS SOCIALES",
      "EDUCACION ARTISTICA",
      "EDUCACION FISICA",
      "INGLES",
      "MATEMATICAS",
      "PRACTICAS DEL LENGUAJE",
      "CONSTRUCCION CUIDADANA"
    ],
    tcoEspecifica: [
      "PROCEDIMIENTOS TECNICOS",
      "LENGUAJE TECNOLOGICOS",
      "SISTEMAS TECNOLOGICOS"
    ]
  },
  2: {
    nombreAnio: "2° Año",
    ciclo: "Ciclo Básico",
    formacionGeneral: [
      "BIOLOGÍA",
      "CONSTRUCCIÓN DE CIUDADANÍA",
      "EDUCACIÓN ARTÍSTICA",
      "EDUCACIÓN FÍSICA",
      "FÍSICO QUÍMICA",
      "GEOGRAFÍA",
      "HISTORIA",
      "INGLÉS",
      "MATEMÁTICA",
      "PRÁCTICAS DEL LENGUAJE"
    ],
    tcoEspecifica: [
      "PROCEDIMIENTOS TÉCNICOS",
      "LENGUAJES TECNOLÓGICOS",
      "SISTEMAS TECNOLÓGICOS"
    ]
  },
  3: {
    nombreAnio: "3° Año",
    ciclo: "Ciclo Básico",
    formacionGeneral: [
      "BIOLOGÍA",
      "CONSTRUCCIÓN DE CIUDADANÍA",
      "EDUCACIÓN ARTÍSTICA",
      "EDUCACIÓN FÍSICA",
      "FÍSICO QUÍMICA",
      "GEOGRAFÍA",
      "HISTORIA",
      "INGLÉS",
      "MATEMÁTICA",
      "PRÁCTICAS DEL LENGUAJE"
    ],
    tcoEspecifica: [
      "PROCEDIMIENTOS TÉCNICOS",
      "LENGUAJES TECNOLÓGICOS",
      "SISTEMAS TECNOLÓGICOS"
    ]
  },
  4: {
    nombreAnio: "4° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "SALUD Y ADOLESCENCIA",
      "HISTORIA",
      "GEOGRAFÍA",
      "MATEMÁTICA CICLO SUPERIOR",
      "FÍSICA",
      "QUÍMICA"
    ],
    orientaciones: {
      programacion: [
        "TECNOLOGÍAS ELECTRÓNICAS",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ],
      informatica: [
        "TECNOLOGÍAS ELECTRÓNICAS",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ]
    }
  },
  5: {
    nombreAnio: "5° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "POLÍTICA Y CIUDADANÍA",
      "HISTORIA",
      "GEOGRAFÍA",
      "ANÁLISIS MATEMÁTICO"
    ],
    orientaciones: {
      programacion: [
        "SISTEMAS DIGITALES",
        "BASES DE DATOS",
        "MODELOS Y SISTEMAS",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE REDES INFORMÁTICAS",
        "LABORATORIO DE DISEÑO WEB",
        "LABORATORIO DE DISEÑO DE BASES DE DATOS"
      ],
      informatica: [
        "SISTEMAS DIGITALES",
        "TELEINFORMÁTICA",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ]
    }
  },
  6: {
    nombreAnio: "6° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "LITERATURA",
      "INGLÉS",
      "EDUCACIÓN FÍSICA",
      "FILOSOFÍA",
      "ARTE",
      "MATEMÁTICA DISCRETA",
      "DERECHOS DEL TRABAJO"
    ],
    orientaciones: {
      programacion: [
        "SISTEMAS DIGITALES",
        "SISTEMAS DE GESTIÓN Y AUTOGESTIÓN",
        "SEGURIDAD INFORMÁTICA",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE PROCESOS INDUSTRIALES",
        "DESARROLLO DE APLICACIONES WEB ESTÁTICAS",
        "DESARROLLO DE APLICACIONES WEB DINÁMICAS"
      ],
      informatica: [
        "SISTEMAS DIGITALES",
        "INVESTIGACIÓN OPERATIVA",
        "SEGURIDAD INFORMÁTICA",
        "LABORATORIO DE PROGRAMACIÓN",
        "LABORATORIO DE HARDWARE",
        "LABORATORIO DE SISTEMAS OPERATIVOS",
        "LABORATORIO DE APLICACIONES"
      ]
    }
  },
  7: {
    nombreAnio: "7° Año",
    ciclo: "Ciclo Superior",
    formacionGeneral: [
      "EMPRENDIMIENTOS PRODUCTIVOS Y DESARROLLO LOCAL",
      "EVALUACIÓN DE PROYECTOS",
      "MODELOS Y SISTEMAS",
      "ORGANIZACIÓN Y MÉTODOS"
    ],
    orientaciones: {
      programacion: [
        "PRÁCTICAS PROFESIONALIZANTES DEL SECTOR INFORMÁTICA",
        "PROYECTO, DISEÑO E IMPLEMENTACIÓN DE SISTEMAS COMPUTACIONALES",
        "PROYECTO DE DESARROLLO DE SOFTWARE PARA PLATAFORMAS MÓVILES",
        "PROYECTOS DE IMPLEMENTACIÓN DE SITIOS WEB DINÁMICOS"
      ],
      informatica: [
        "PRÁCTICAS PROFESIONALIZANTES DEL SECTOR INFORMÁTICA",
        "BASES DE DATOS",
        "PROYECTO, DISEÑO E IMPLEMENTACIÓN DE SISTEMAS COMPUTACIONALES",
        "INSTALACIÓN, MANTENIMIENTO Y REPARACIÓN DE SISTEMAS COMPUTACIONALES",
        "INSTALACIÓN, MANTENIMIENTO Y REPARACIÓN DE REDES INFORMÁTICAS"
      ]
    }
  }
};

function calcularPromedio(n1, n2) {
  const v1 = parseFloat(String(n1).replace(",", "."));
  const v2 = parseFloat(String(n2).replace(",", "."));
  if (isNaN(v1) && isNaN(v2)) return "";
  if (!isNaN(v1) && isNaN(v2)) return v1.toFixed(1);
  if (isNaN(v1) && !isNaN(v2)) return v2.toFixed(1);
  return ((v1 + v2) / 2).toFixed(1);
}

export function BoletinDigitalModal({ abierto, onCerrar, alumno }) {
  // Bloquear scrollbar del fondo mientras el modal esté abierto
  useEffect(() => {
    if (!abierto) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [abierto]);

  const [currentAlumno, setCurrentAlumno] = useState(alumno);

  useEffect(() => {
    if (alumno) {
      setCurrentAlumno(alumno);
    }
  }, [alumno]);

  const datosPersonales = currentAlumno?.datosPersonales || currentAlumno || {};
  const informacionEscolar = currentAlumno?.informacionEscolar || currentAlumno || {};
  const studentId = datosPersonales.id || currentAlumno?.id || "alu-0";

  // Deducir año inicial del alumno (ej: "1° Div. 2" -> 1)
  const initialYear = useMemo(() => {
    const cursoStr = String(informacionEscolar.curso || datosPersonales.curso || "1");
    const m = cursoStr.match(/(\d+)/);
    const y = m ? parseInt(m[1], 10) : 1;
    return y >= 1 && y <= 7 ? y : 1;
  }, [informacionEscolar.curso, datosPersonales.curso]);

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedOrientacion, setSelectedOrientacion] = useState(() => {
    const ori = (informacionEscolar.orientacion || "").toLowerCase();
    return ori.includes("info") ? "informatica" : "programacion";
  });

  // Al cambiar de alumno, actualizar año y orientación por defecto
  useEffect(() => {
    setSelectedYear(initialYear);
    const ori = (informacionEscolar.orientacion || "").toLowerCase();
    setSelectedOrientacion(ori.includes("info") ? "informatica" : "programacion");
  }, [studentId, initialYear, informacionEscolar.orientacion]);

  const [libroFolio, setLibroFolio] = useState(() => {
    const info = obtenerLibroFolioLegajo({ ...datosPersonales, ...informacionEscolar, id: studentId, studentId });
    return { libro: info.libro, folio: info.folio };
  });

  useEffect(() => {
    const info = obtenerLibroFolioLegajo({ ...datosPersonales, ...informacionEscolar, id: studentId, studentId });
    setLibroFolio({ libro: info.libro, folio: info.folio });
  }, [studentId, datosPersonales.libro, datosPersonales.folio, datosPersonales.legajo]);

  const handleUpdateLibroFolio = (patch) => {
    setLibroFolio((prev) => {
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem(`prece_student_${studentId}_libro_folio`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("prece:libro-folio-updated", { detail: { studentId, libroFolio: updated } }));
      } catch {}
      return updated;
    });
  };

  const [inasistencias, setInasistencias] = useState({ total: "0" });
  const [inasistenciasDetalle, setInasistenciasDetalle] = useState(null);
  const [cargandoInasistencias, setCargandoInasistencias] = useState(false);
  const [calificaciones, setCalificaciones] = useState({});
  const [materiasPendientes, setMateriasPendientes] = useState([
    { materia: "", anio: "", abrilCalif: "", abrilLF: "", mayoCalif: "", mayoLF: "", agostoCalif: "", agostoLF: "", octubreCalif: "", octubreLF: "" },
    { materia: "", anio: "", abrilCalif: "", abrilLF: "", mayoCalif: "", mayoLF: "", agostoCalif: "", agostoLF: "", octubreCalif: "", octubreLF: "" }
  ]);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("Calificaciones guardadas correctamente");

  // Estados para búsqueda por DNI
  const [searchDni, setSearchDni] = useState("");
  const [searchingDni, setSearchingDni] = useState(false);
  const [dniFeedback, setDniFeedback] = useState(null);

  // Estados para modal de envío por correo electrónico
  const [emailModalAbierto, setEmailModalAbierto] = useState(false);
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [emailAsunto, setEmailAsunto] = useState("");
  const [emailMensaje, setEmailMensaje] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);

  // Clave de almacenamiento local por alumno y año
  const storageKey = `prece_boletin_${studentId}_anio_${selectedYear}`;

  // Traer la sumatoria dinámica de inasistencias desde el backend (/api/v1/inasistencias/alumno/:id/totales)
  useEffect(() => {
    if (!studentId || studentId === "alu-0") return;
    let cancel = false;
    setCargandoInasistencias(true);

    async function cargarInasistencias() {
      try {
        const res = await pedir(`/api/v1/inasistencias/alumno/${encodeURIComponent(studentId)}/totales`);
        if (!cancel && res?.totales) {
          setInasistenciasDetalle(res.totales);
          const totalAusentes = String(res.totales.total ?? 0);
          setInasistencias((prev) => ({
            ...prev,
            total: totalAusentes,
            justificadas: res.totales.justificadas ?? 0,
            noJustificadas: res.totales.noJustificadas ?? 0
          }));
        }
      } catch (err) {
        if (!cancel) setInasistenciasDetalle(null);
      } finally {
        if (!cancel) setCargandoInasistencias(false);
      }
    }

    cargarInasistencias();
    return () => { cancel = true; };
  }, [studentId]);

  // Cargar calificaciones guardadas para el año seleccionado
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.calificaciones) setCalificaciones(parsed.calificaciones);
        if (parsed.inasistencias) setInasistencias(parsed.inasistencias);
        if (parsed.materiasPendientes) setMateriasPendientes(parsed.materiasPendientes);
        if (parsed.libroFolio) setLibroFolio(parsed.libroFolio);
        return;
      }
    } catch {
      // Ignorar error de parsing
    }

    // Inicializar vacío si no había nada guardado
    setCalificaciones({});
    setInasistencias({
      total: inasistenciasDetalle?.total !== undefined
        ? String(inasistenciasDetalle.total)
        : (selectedYear === initialYear ? String(currentAlumno?.inasistencias?.total ?? 0) : "0")
    });
  }, [storageKey, selectedYear, initialYear, currentAlumno, inasistenciasDetalle]);

  // Manejar cambio de notas
  const handleGradeChange = (materiaKey, field, value) => {
    setCalificaciones((prev) => {
      const current = prev[materiaKey] || {};
      const updated = { ...current, [field]: value };

      // Si se actualiza informe 1 o 2, recalcular automáticamente el promedio anual si no fue forzado manualmente
      if (field === "informe1" || field === "informe2") {
        const inf1 = field === "informe1" ? value : current.informe1;
        const inf2 = field === "informe2" ? value : current.informe2;
        const prom = calcularPromedio(inf1, inf2);
        updated.promedioAnual = prom;
        // Si no hay examen de dic/feb, calificación definitiva toma el promedio anual
        if (!current.diciembre && !current.febrero) {
          updated.definitiva = prom;
        }
      }

      // Si se carga nota en diciembre o febrero, actualizar definitiva
      if (field === "diciembre" || field === "febrero") {
        if (value) {
          updated.definitiva = value;
        } else if (!current.diciembre && !current.febrero) {
          updated.definitiva = updated.promedioAnual || "";
        }
      }

      return {
        ...prev,
        [materiaKey]: updated
      };
    });
  };

  // Guardar calificaciones en localStorage
  const handleSave = () => {
    try {
      const dataToSave = {
        calificaciones,
        inasistencias,
        materiasPendientes,
        libroFolio,
        actualizadoEn: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      localStorage.setItem(`prece_student_${studentId}_libro_folio`, JSON.stringify(libroFolio));
      window.dispatchEvent(new CustomEvent("prece:libro-folio-updated", { detail: { studentId, libroFolio } }));
      setToastMsg("Calificaciones guardadas correctamente");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2400);
    } catch (e) {
      console.error("Error al guardar calificaciones:", e);
    }
  };

  // Buscar boletín directamente ingresando el DNI del alumno
  const handleSearchByDni = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanDni = String(searchDni).replace(/\D/g, "");
    if (!cleanDni || cleanDni.length < 6) {
      setDniFeedback({ type: "error", message: "Ingrese al menos 6 dígitos del DNI." });
      setTimeout(() => setDniFeedback(null), 3500);
      return;
    }

    setSearchingDni(true);
    setDniFeedback(null);
    try {
      const res = await StudentsService.getAlumnos({ dni: cleanDni, estado: "todos" });
      let found = res.data?.[0];
      if (!found) {
        const resQ = await StudentsService.getAlumnos({ q: cleanDni, estado: "todos" });
        found = resQ.data?.[0];
      }

      if (found) {
        try {
          const perfil = await StudentsService.getAlumnoProfile(found.id);
          if (perfil?.data) {
            const dp = perfil.data.datosPersonales || perfil.data;
            const esc = perfil.data.situacionAcademica || perfil.data.informacionEscolar || perfil.data;
            setCurrentAlumno({
              ...found,
              datosPersonales: dp,
              informacionEscolar: esc
            });
          } else {
            setCurrentAlumno(found);
          }
        } catch {
          setCurrentAlumno(found);
        }

        const nombreEncontrado = found.nombreCompleto || `${found.apellido}, ${found.nombre}`;
        setToastMsg(`Boletín cargado: ${nombreEncontrado} (DNI ${formatDni(cleanDni)})`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2800);
        setSearchDni("");
      } else {
        setDniFeedback({ type: "error", message: `No se encontró estudiante con DNI: ${cleanDni}` });
        setTimeout(() => setDniFeedback(null), 4000);
      }
    } catch (err) {
      setDniFeedback({ type: "error", message: "Error al consultar la base de datos." });
      setTimeout(() => setDniFeedback(null), 4000);
    } finally {
      setSearchingDni(false);
    }
  };

  // Plan del año actual
  const planActual = PLANES_BOLETIN[selectedYear] || PLANES_BOLETIN[1];
  const materiasFormacionGeneral = planActual.formacionGeneral || [];
  const materiasTcoEspecifica = selectedYear <= 3
    ? planActual.tcoEspecifica || []
    : (planActual.orientaciones?.[selectedOrientacion] || planActual.orientaciones?.programacion || []);

  const todasLasMaterias = [...materiasFormacionGeneral, ...materiasTcoEspecifica];

  // Calcular promedio general de las materias
  const promedioGeneral = useMemo(() => {
    let sum = 0;
    let count = 0;
    todasLasMaterias.forEach((m) => {
      const g = calificaciones[m]?.definitiva || calificaciones[m]?.promedioAnual;
      const num = parseFloat(String(g).replace(",", "."));
      if (!isNaN(num) && num > 0) {
        sum += num;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : "";
  }, [todasLasMaterias, calificaciones]);

  // Exportar a Excel exactamente con la plantilla oficial
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const nombreCompleto = datosPersonales.nombreCompleto || `${datosPersonales.apellido || ""}, ${datosPersonales.nombre || ""}`.trim() || "ALUMNO";
    const dni = datosPersonales.dni || "S/D";
    const numLegajo = datosPersonales.legajo || studentId;
    const legajoCompleto = `(${libroFolio.libro}-${libroFolio.folio}-${numLegajo})`;
    const anioDiv = `${selectedYear}° ${informacionEscolar.division || "1"}`;

    const rows = [
      ["", "REGISTRO OFICIAL DE CALIFICACIONES - BOLETÍN DIGITAL"],
      ["", "E.E.S.T. N° 1 'Cecilia Berdichevski'"],
      [],
      ["", "Apellido Y Nombre:", nombreCompleto, "", "", "", "", "Año/Div:", anioDiv],
      ["", "Legajo:", legajoCompleto, "", "", "", "", "D.N.I:", dni],
      ["", "Folio:", libroFolio.folio, "", "", "", "", "Libro:", libroFolio.libro],
      [],
      ["", "MATERIAS", "", "", "1 Informe", "2 Informe", "Promedio Anual", "Diciembre", "Febrero", "Calificación Definitiva", "Firmas"],
      ["", "FORMACIÓN GENERAL"]
    ];

    materiasFormacionGeneral.forEach((mat) => {
      const c = calificaciones[mat] || {};
      rows.push([
        "",
        mat,
        "",
        "",
        c.informe1 || "",
        c.informe2 || "",
        c.promedioAnual || "",
        c.diciembre || "",
        c.febrero || "",
        c.definitiva || "",
        ""
      ]);
    });

    rows.push(["", selectedYear <= 3 ? "TCO. ESPECÍFICA / TALLER" : "FORMACIÓN TÉCNICA ESPECÍFICA"]);

    materiasTcoEspecifica.forEach((mat) => {
      const c = calificaciones[mat] || {};
      rows.push([
        "",
        mat,
        "",
        "",
        c.informe1 || "",
        c.informe2 || "",
        c.promedioAnual || "",
        c.diciembre || "",
        c.febrero || "",
        c.definitiva || "",
        ""
      ]);
    });

    rows.push([]);
    rows.push(["", "INASISTENCIA TOTAL:", inasistencias.total || "0", "", "", "", "PROMEDIO GENERAL:", promedioGeneral, "", "", ""]);
    rows.push([]);
    rows.push(["", "MATERIAS PENDIENTES DE ACREDITACIÓN"]);
    rows.push(["", "MATERIA", "AÑO", "", "Abril", "Mayo", "Agosto", "Octubre"]);
    rows.push(["", "", "", "", "CALIF | L/F", "CALIF | L/F", "CALIF | L/F", "CALIF | L/F"]);

    materiasPendientes.forEach((p) => {
      if (p.materia || p.abrilCalif) {
        rows.push([
          "",
          p.materia,
          p.anio,
          "",
          `${p.abrilCalif || "-"} (${p.abrilLF || "-"})`,
          `${p.mayoCalif || "-"} (${p.mayoLF || "-"})`,
          `${p.agostoCalif || "-"} (${p.agostoLF || "-"})`,
          `${p.octubreCalif || "-"} (${p.octubreLF || "-"})`
        ]);
      }
    });

    rows.push([]);
    rows.push(["", "___________________________", "", "", "___________________________", "", "", "___________________________"]);
    rows.push(["", "Autoridad Escolar", "", "", "Preceptor", "", "", "Adulto Responsable"]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Boletin ${selectedYear} Anio`);

    const safeName = nombreCompleto.replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `Boletin_${selectedYear}Ano_${safeName}.xlsx`);
  };

  // Preparar y abrir modal para enviar el boletín por correo electrónico
  const handleOpenEmailModal = () => {
    const emailDestino = datosPersonales.email || currentAlumno?.email || "";
    const nombreCompleto = datosPersonales.nombreCompleto || `${datosPersonales.apellido || ""}, ${datosPersonales.nombre || ""}`.trim() || "Estudiante";
    const dniFormateado = formatDni(datosPersonales.dni);
    const legajoCompleto = `(${libroFolio.libro}-${libroFolio.folio}-${datosPersonales.legajo || studentId})`;
    const anioDiv = `${selectedYear}° ${informacionEscolar.division || "1"}`;

    setEmailDestinatario(emailDestino);
    setEmailAsunto(`Boletín Digital de Calificaciones - E.E.S.T. N° 1 - ${nombreCompleto} (${selectedYear}° Año)`);
    setEmailMensaje(
`Estimada familia / tutor de ${nombreCompleto}:

Por medio de la presente comunicación institucional se envía la notificación oficial del Boletín de Calificaciones correspondiente al Ciclo Lectivo 2026 de la Escuela de Educación Secundaria Técnica N° 1 "Cecilia Berdichevski".

DATOS DEL ESTUDIANTE:
• Apellido y Nombre: ${nombreCompleto}
• D.N.I.: ${dniFormateado}
• Legajo Oficial: ${legajoCompleto}
• Curso y División: ${anioDiv} (${selectedYear <= 3 ? "Ciclo Básico" : "Ciclo Superior - " + (selectedOrientacion === "programacion" ? "Programación" : "Informática")})
• Turno: ${selectedYear <= 2 || selectedYear === 7 ? "Mañana" : "Tarde"}

ESTADO ACADÉMICO:
• Promedio General Anual: ${promedioGeneral}
• Inasistencia Total acumulada: ${inasistencias.total || "0"} días ${inasistenciasDetalle ? `(${inasistenciasDetalle.justificadas || 0} justificadas / ${inasistenciasDetalle.noJustificadas || 0} injustificadas)` : ""}

Puede consultar la ficha completa o descargar el boletín en formato oficial ingresando a la plataforma institucional Prece Digital.

Atentamente,
Equipo Directivo y Preceptoría
E.E.S.T. N° 1 "Cecilia Berdichevski"`
    );
    setEmailFeedback(null);
    setEmailModalAbierto(true);
  };

  const handleSendEmail = () => {
    if (!emailDestinatario || !emailDestinatario.includes("@")) {
      setEmailFeedback({ type: "error", message: "Ingrese un correo electrónico válido." });
      return;
    }
    setEnviandoEmail(true);
    try {
      // Registrar envío de boletín en auditoría local
      const enviosGuardados = JSON.parse(localStorage.getItem("prece_boletin_emails_sent") || "[]");
      enviosGuardados.push({
        studentId,
        alumno: datosPersonales.nombreCompleto || `${datosPersonales.apellido || ""}, ${datosPersonales.nombre || ""}`.trim(),
        destinatario: emailDestinatario,
        asunto: emailAsunto,
        anio: selectedYear,
        fecha: new Date().toISOString()
      });
      localStorage.setItem("prece_boletin_emails_sent", JSON.stringify(enviosGuardados));

      setTimeout(() => {
        setEnviandoEmail(false);
        setEmailModalAbierto(false);
        setToastMsg(`Boletín enviado exitosamente a: ${emailDestinatario}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }, 500);
    } catch {
      setEnviandoEmail(false);
      setEmailFeedback({ type: "error", message: "Error al registrar el envío de correo." });
    }
  };

  // Imprimir / Guardar en PDF
  const handlePrint = () => {
    window.print();
  };

  const nombreAlumno = datosPersonales.nombreCompleto || `${datosPersonales.apellido || ""}, ${datosPersonales.nombre || ""}`.trim() || "Estudiante";

  if (!abierto) return null;

  return h(
    React.Fragment,
    null,
    createPortal(
      h(
      "div",
      {
        className: "boletin-modal-backdrop",
        onClick: (e) => {
          if (e.target === e.currentTarget) onCerrar();
        }
      },
      h(
        "div",
        {
          className: "boletin-modal-container",
          role: "dialog",
          "aria-modal": "true"
        },

        // Toast de guardado o acción exitosa
        showToast
          ? h(
              "div",
              { className: "boletin-toast-save" },
              h(
                "svg",
                { viewBox: "0 0 20 20", width: 16, height: 16, fill: "currentColor" },
                h("path", {
                  fillRule: "evenodd",
                  d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
                  clipRule: "evenodd"
                })
              ),
              h("span", null, toastMsg)
            )
          : null,

        // 1. HEADER DEL MODAL (Con diseño ordenado, jerárquico y profesional)
        h(
          "div",
          { className: "boletin-modal-header" },
          // Fila 1: Título y Datos del Alumno + Botón Cerrar
          h(
            "div",
            { className: "boletin-header-top-row" },
            h(
              "div",
              { className: "boletin-header-left" },
              h(
                "div",
                { className: "boletin-header-icon-box" },
                h(
                  "svg",
                  {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    strokeLinecap: "round",
                    strokeLinejoin: "round"
                  },
                  h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                  h("polyline", { points: "14 2 14 8 20 8" }),
                  h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
                  h("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
                  h("polyline", { points: "10 9 9 9 8 9" })
                )
              ),
              h(
                "div",
                { className: "boletin-header-titles" },
                h("h3", { className: "boletin-header-title" }, "Boletín Digital de Calificaciones"),
                h(
                  "div",
                  { className: "boletin-header-subtitle" },
                  h("span", { className: "pill-student-name" }, nombreAlumno),
                  h("span", null, "•"),
                  h("span", { className: "pill-student-badge" }, `DNI: ${formatDni(datosPersonales.dni || "S/D")}`),
                  h("span", null, "•"),
                  h("span", { className: "pill-student-badge font-mono" }, `Legajo: (${libroFolio.libro}-${libroFolio.folio}-${datosPersonales.legajo || studentId})`),
                  h("span", null, "•"),
                  h("span", { className: "pill-student-badge" }, `${selectedYear}° ${informacionEscolar.division || "1°"}`)
                )
              )
            ),
            h(
              "button",
              {
                type: "button",
                className: "boletin-modal-close-btn",
                onClick: onCerrar,
                title: "Cerrar boletín"
              },
              h(
                "svg",
                { viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: "2.5" },
                h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
              )
            )
          ),

          // Fila 2: Barra de herramientas (Búsqueda por DNI y Acciones agrupadas)
          h(
            "div",
            { className: "boletin-header-toolbar" },
            // Buscador directo por DNI
            h(
              "div",
              { className: "boletin-toolbar-search-wrap" },
              h(
                "form",
                {
                  className: "boletin-dni-search-form",
                  onSubmit: handleSearchByDni
                },
                h(
                  "svg",
                  { className: "boletin-dni-search-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                  h("path", {
                    fillRule: "evenodd",
                    d: "M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z",
                    clipRule: "evenodd"
                  })
                ),
                h("input", {
                  type: "text",
                  className: "boletin-dni-input",
                  placeholder: "Ver por DNI...",
                  value: searchDni,
                  onChange: (e) => setSearchDni(e.target.value),
                  title: "Ingrese el DNI del alumno para ver su boletín"
                }),
                h(
                  "button",
                  {
                    type: "submit",
                    className: "btn-boletin-dni-search",
                    disabled: searchingDni,
                    title: "Buscar boletín por DNI"
                  },
                  searchingDni ? "Buscando..." : "Buscar"
                )
              ),
              dniFeedback
                ? h("div", { className: "boletin-dni-error-bubble" }, dniFeedback.message)
                : null
            ),

            // Acciones del Boletín agrupadas ordenadamente
            h(
              "div",
              { className: "boletin-toolbar-actions" },
              // Botón Enviar por Correo Electrónico
              h(
                "button",
                {
                  type: "button",
                  className: "btn-boletin-action btn-boletin-action--secondary btn-boletin-action--email",
                  onClick: handleOpenEmailModal,
                  title: "Enviar boletín digital por correo electrónico"
                },
                h(
                  "svg",
                  { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                  h("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }),
                  h("polyline", { points: "22,6 12,13 2,6" })
                ),
                h("span", null, "Enviar Correo")
              ),
              // Botón Imprimir / PDF
              h(
                "button",
                {
                  type: "button",
                  className: "btn-boletin-action btn-boletin-action--secondary btn-boletin-action--print",
                  onClick: handlePrint,
                  title: "Imprimir boletín en formato oficial A4 o guardar como PDF"
                },
                h(
                  "svg",
                  { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                  h("polyline", { points: "6 9 6 2 18 2 18 9" }),
                  h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
                  h("rect", { x: "6", y: "14", width: "12", height: "8" })
                ),
                h("span", null, "Imprimir / PDF")
              ),
              // Botón Descargar Excel
              h(
                "button",
                {
                  type: "button",
                  className: "btn-boletin-action btn-boletin-action--secondary btn-boletin-action--excel",
                  onClick: handleExportExcel,
                  title: "Descargar planilla oficial del boletín en Excel (.xlsx)"
                },
                h(
                  "svg",
                  { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                  h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                  h("polyline", { points: "14 2 14 8 20 8" }),
                  h("line", { x1: "8", y1: "13", x2: "16", y2: "13" }),
                  h("line", { x1: "8", y1: "17", x2: "16", y2: "17" })
                ),
                h("span", null, "Excel (.xlsx)")
              ),
              // Botón Guardar Notas (Acción principal destacada)
              h(
                "button",
                {
                  type: "button",
                  className: "btn-boletin-action btn-boletin-action--save",
                  onClick: handleSave,
                  title: "Guardar notas modificadas del boletín"
                },
                h(
                  "svg",
                  { viewBox: "0 0 20 20", fill: "currentColor" },
                  h("path", {
                    fillRule: "evenodd",
                    d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
                    clipRule: "evenodd"
                  })
                ),
                h("span", null, "Guardar Notas")
              )
            )
          )
        ),

        // 2. BARRA DE NAVEGACIÓN DE AÑOS (1° A 7° AÑO)
        h(
          "div",
          { className: "boletin-nav-bar" },
          h(
            "div",
            { className: "boletin-years-tabs" },
            [1, 2, 3, 4, 5, 6, 7].map((anio) => {
              const isActive = selectedYear === anio;
              const cicloLabel = anio <= 3 ? "Básico" : "Superior";
              return h(
                "button",
                {
                  key: anio,
                  type: "button",
                  className: `boletin-year-tab ${isActive ? "boletin-year-tab--active" : ""}`,
                  onClick: () => setSelectedYear(anio)
                },
                h("span", null, `${anio}° Año`),
                h("span", { className: "boletin-year-cycle-badge" }, cicloLabel)
              );
            })
          ),
          selectedYear >= 4
            ? h(
                "div",
                { className: "boletin-orientacion-selector" },
                h("span", null, "Orientación:"),
                h(
                  "select",
                  {
                    className: "boletin-orientacion-select",
                    value: selectedOrientacion,
                    onChange: (e) => setSelectedOrientacion(e.target.value)
                  },
                  h("option", { value: "programacion" }, "Técnico en Programación"),
                  h("option", { value: "informatica" }, "Técnico en Informática")
                )
              )
            : null
        ),

        // 3. ÁREA DE VISUALIZACIÓN DEL BOLETÍN FÍSICO
        h(
          "div",
          { className: "boletin-modal-body" },
          h(
            "div",
            { className: "boletin-paper-card" },

            // Encabezado Institucional Oficial con Escudo
            h(
              "div",
              { className: "boletin-school-header" },
              h(
                "div",
                { className: "boletin-school-logo-wrap" },
                h("img", {
                  src: "/assets/logo_tec.png",
                  alt: "Escudo E.E.S.T. N° 1",
                  className: "boletin-school-logo-img",
                  onError: (e) => {
                    e.target.onerror = null;
                    e.target.src = "/assets/Logo Tec.png";
                  }
                })
              ),
              h(
                "div",
                { className: "boletin-school-text-wrap" },
                h("p", { className: "boletin-school-ministry" }, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN • PROVINCIA DE BUENOS AIRES"),
                h("h2", { className: "boletin-school-name" }, "E.E.S.T. N° 1 \"CECILIA BERDICHEVSKI\""),
                h("h4", { className: "boletin-school-doc-title" }, `BOLETÍN DE CALIFICACIONES • ${selectedYear}° AÑO`)
              )
            ),

            // Grilla de Datos del Alumno (como en Matriz.xlsx)
            h(
              "div",
              { className: "boletin-student-data-grid" },
              h(
                "div",
                { className: "boletin-data-item", style: { gridColumn: "span 2" } },
                h("span", { className: "boletin-data-label" }, "Apellido y Nombre:"),
                h("span", { className: "boletin-data-value" }, nombreAlumno)
              ),
              h(
                "div",
                { className: "boletin-data-item" },
                h("span", { className: "boletin-data-label" }, "Año/Div:"),
                h("span", { className: "boletin-data-value" }, `${selectedYear}° ${informacionEscolar.division || "1°"}`)
              ),
              h(
                "div",
                { className: "boletin-data-item" },
                h("span", { className: "boletin-data-label" }, "Legajo:"),
                h("span", { className: "boletin-data-value font-mono", title: `Libro: ${libroFolio.libro} · Folio: ${libroFolio.folio} · N° Legajo: ${datosPersonales.legajo || studentId}` }, `(${libroFolio.libro}-${libroFolio.folio}-${datosPersonales.legajo || studentId})`)
              ),
              h(
                "div",
                { className: "boletin-data-item" },
                h("span", { className: "boletin-data-label" }, "D.N.I:"),
                h("span", { className: "boletin-data-value" }, datosPersonales.dni || "S/D")
              ),
              h(
                "div",
                { className: "boletin-data-item" },
                h("span", { className: "boletin-data-label" }, "Ciclo Lectivo:"),
                h("span", { className: "boletin-data-value" }, "2026")
              ),
              h(
                "div",
                { className: "boletin-data-item" },
                h("span", { className: "boletin-data-label" }, "Folio:"),
                h(
                  "span",
                  { className: "boletin-data-value" },
                  h("input", {
                    type: "text",
                    value: libroFolio.folio,
                    onChange: (e) => handleUpdateLibroFolio({ folio: e.target.value })
                  })
                )
              ),
              h(
                "div",
                { className: "boletin-data-item" },
                h("span", { className: "boletin-data-label" }, "Libro:"),
                h(
                  "span",
                  { className: "boletin-data-value" },
                  h("input", {
                    type: "text",
                    value: libroFolio.libro,
                    onChange: (e) => handleUpdateLibroFolio({ libro: e.target.value })
                  })
                )
              ),
              h(
                "div",
                { className: "boletin-data-item" },
                h("span", { className: "boletin-data-label" }, "Turno:"),
                h("span", { className: "boletin-data-value" }, selectedYear <= 2 || selectedYear === 7 ? "Mañana" : "Tarde")
              )
            ),

            // Tabla Principal de Calificaciones (Formación General y Tco. Específica)
            h(
              "table",
              { className: "boletin-grades-table" },
              h(
                "colgroup",
                null,
                h("col", { style: { width: "30%" } }),
                h("col", { style: { width: "9.5%" } }),
                h("col", { style: { width: "9.5%" } }),
                h("col", { style: { width: "10.5%" } }),
                h("col", { style: { width: "9.5%" } }),
                h("col", { style: { width: "9.5%" } }),
                h("col", { style: { width: "11.5%" } }),
                h("col", { style: { width: "10%" } })
              ),
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", { className: "col-materia" }, "MATERIAS"),
                  h("th", { className: "col-informe" }, "1° INFORME"),
                  h("th", { className: "col-informe" }, "2° INFORME"),
                  h("th", { className: "col-promedio" }, "PROMEDIO ANUAL"),
                  h("th", { className: "col-instancia" }, "DICIEMBRE"),
                  h("th", { className: "col-instancia" }, "FEBRERO"),
                  h("th", { className: "col-definitiva" }, "CALIF. DEFINITIVA"),
                  h("th", { className: "col-firmas" }, "FIRMAS")
                )
              ),
              h(
                "tbody",
                null,
                // Sección: Formación General
                h(
                  "tr",
                  null,
                  h(
                    "td",
                    { colSpan: 8, className: "boletin-category-row" },
                    "FORMACIÓN GENERAL"
                  )
                ),
                materiasFormacionGeneral.map((materia) => {
                  const mData = calificaciones[materia] || {};
                  return h(
                    "tr",
                    { key: materia },
                    h("td", { className: "boletin-subject-name" }, materia),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.informe1) >= 7 ? "grade--approved" : mData.informe1 ? "grade--disapproved" : ""}`,
                        value: mData.informe1 || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "informe1", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.informe2) >= 7 ? "grade--approved" : mData.informe2 ? "grade--disapproved" : ""}`,
                        value: mData.informe2 || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "informe2", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell boletin-grade-cell--highlight" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.promedioAnual) >= 7 ? "grade--approved" : mData.promedioAnual ? "grade--disapproved" : ""}`,
                        value: mData.promedioAnual || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "promedioAnual", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: "boletin-grade-input",
                        value: mData.diciembre || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "diciembre", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: "boletin-grade-input",
                        value: mData.febrero || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "febrero", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell boletin-grade-cell--highlight-def" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.definitiva) >= 7 ? "grade--approved" : mData.definitiva ? "grade--disapproved" : ""}`,
                        style: { fontWeight: 900 },
                        value: mData.definitiva || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "definitiva", e.target.value)
                      })
                    ),
                    h("td", { style: { textAlign: "center", color: "#64748b", fontSize: "10px" } }, "")
                  );
                }),

                // Sección: Tco. Específica / Científico Tecnológica
                h(
                  "tr",
                  null,
                  h(
                    "td",
                    { colSpan: 8, className: "boletin-category-row" },
                    selectedYear <= 3 ? "TCO. ESPECÍFICA / TALLER" : "FORMACIÓN TÉCNICA ESPECÍFICA"
                  )
                ),
                materiasTcoEspecifica.map((materia) => {
                  const mData = calificaciones[materia] || {};
                  return h(
                    "tr",
                    { key: materia },
                    h("td", { className: "boletin-subject-name" }, materia),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.informe1) >= 7 ? "grade--approved" : mData.informe1 ? "grade--disapproved" : ""}`,
                        value: mData.informe1 || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "informe1", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.informe2) >= 7 ? "grade--approved" : mData.informe2 ? "grade--disapproved" : ""}`,
                        value: mData.informe2 || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "informe2", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell boletin-grade-cell--highlight" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.promedioAnual) >= 7 ? "grade--approved" : mData.promedioAnual ? "grade--disapproved" : ""}`,
                        value: mData.promedioAnual || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "promedioAnual", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: "boletin-grade-input",
                        value: mData.diciembre || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "diciembre", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell" },
                      h("input", {
                        type: "text",
                        className: "boletin-grade-input",
                        value: mData.febrero || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "febrero", e.target.value)
                      })
                    ),
                    h(
                      "td",
                      { className: "boletin-grade-cell boletin-grade-cell--highlight-def" },
                      h("input", {
                        type: "text",
                        className: `boletin-grade-input ${parseFloat(mData.definitiva) >= 7 ? "grade--approved" : mData.definitiva ? "grade--disapproved" : ""}`,
                        style: { fontWeight: 900 },
                        value: mData.definitiva || "",
                        maxLength: 5,
                        onChange: (e) => handleGradeChange(materia, "definitiva", e.target.value)
                      })
                    ),
                    h("td", { style: { textAlign: "center", color: "#64748b", fontSize: "10px" } }, "")
                  );
                }),

                // Fila de Inasistencias y Promedio General
                h(
                  "tr",
                  { className: "boletin-summary-row" },
                  h(
                    "td",
                    { colSpan: 3 },
                    h(
                      "div",
                      { className: "boletin-summary-inasistencias" },
                      h("span", { className: "boletin-inasistencias-label" }, "INASISTENCIA TOTAL:"),
                      h("input", {
                        type: "number",
                        className: "boletin-inasistencias-input",
                        value: inasistencias.total || "0",
                        min: "0",
                        onChange: (e) => setInasistencias((prev) => ({ ...prev, total: e.target.value })),
                        title: "Total de inasistencias acumuladas (calculado dinámicamente desde ausentes)"
                      }),
                      h("span", { style: { fontSize: "11px", color: "#64748b" } }, "días"),
                      inasistenciasDetalle
                        ? h(
                            "span",
                            {
                              className: "boletin-inasistencias-badge",
                              title: "Detalle de ausencias en sistema"
                            },
                            `(${inasistenciasDetalle.justificadas || 0} just. · ${inasistenciasDetalle.noJustificadas || 0} inj.)`
                          )
                        : cargandoInasistencias
                        ? h("span", { style: { fontSize: "10px", color: "#94a3b8" } }, "Cargando...")
                        : null
                    )
                  ),
                  h(
                    "td",
                    { colSpan: 3, style: { textAlign: "right", fontWeight: 800 } },
                    "PROMEDIO GENERAL ANUAL:"
                  ),
                  h(
                    "td",
                    { className: "boletin-promedio-general-val" },
                    promedioGeneral
                  ),
                  h("td", null, "")
                )
              )
            ),

            // Tabla de Materias Pendientes de Acreditación (Previas)
            h(
              "div",
              { className: "boletin-pendientes-section" },
              h("h5", { className: "boletin-pendientes-title" }, "MATERIAS PENDIENTES DE ACREDITACIÓN / REGULARIZACIÓN"),
              h(
                "table",
                { className: "boletin-pendientes-table" },
                h(
                  "colgroup",
                  null,
                  h("col", { style: { width: "32%" } }),
                  h("col", { style: { width: "10%" } }),
                  h("col", { style: { width: "7.25%" } }),
                  h("col", { style: { width: "7.25%" } }),
                  h("col", { style: { width: "7.25%" } }),
                  h("col", { style: { width: "7.25%" } }),
                  h("col", { style: { width: "7.25%" } }),
                  h("col", { style: { width: "7.25%" } }),
                  h("col", { style: { width: "7.25%" } }),
                  h("col", { style: { width: "7.25%" } })
                ),
                h(
                  "thead",
                  null,
                  h(
                    "tr",
                    null,
                    h("th", { rowSpan: 2 }, "MATERIAS PENDIENTES"),
                    h("th", { rowSpan: 2 }, "AÑO"),
                    h("th", { colSpan: 2 }, "Abril"),
                    h("th", { colSpan: 2 }, "Mayo"),
                    h("th", { colSpan: 2 }, "Agosto"),
                    h("th", { colSpan: 2 }, "Octubre")
                  ),
                  h(
                    "tr",
                    null,
                    h("th", null, "CALIF"),
                    h("th", null, "L/F"),
                    h("th", null, "CALIF"),
                    h("th", null, "L/F"),
                    h("th", null, "CALIF"),
                    h("th", null, "L/F"),
                    h("th", null, "CALIF"),
                    h("th", null, "L/F")
                  )
                ),
                h(
                  "tbody",
                  null,
                  materiasPendientes.map((p, idx) => {
                    return h(
                      "tr",
                      { key: idx },
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          style: { textAlign: "left" },
                          placeholder: "Escriba materia previa...",
                          value: p.materia || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], materia: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.anio || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], anio: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.abrilCalif || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], abrilCalif: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.abrilLF || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], abrilLF: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.mayoCalif || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], mayoCalif: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.mayoLF || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], mayoLF: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.agostoCalif || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], agostoCalif: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.agostoLF || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], agostoLF: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.octubreCalif || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], octubreCalif: val };
                              return copy;
                            });
                          }
                        })
                      ),
                      h(
                        "td",
                        null,
                        h("input", {
                          type: "text",
                          className: "boletin-input-table-pending",
                          value: p.octubreLF || "",
                          onChange: (e) => {
                            const val = e.target.value;
                            setMateriasPendientes((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], octubreLF: val };
                              return copy;
                            });
                          }
                        })
                      )
                    );
                  })
                )
              )
            ),

            // Espacio de Firmas Oficiales
            h(
              "div",
              { className: "boletin-signatures-grid" },
              h(
                "div",
                { className: "boletin-signature-box" },
                h("div", { className: "boletin-signature-line" }),
                h("span", { className: "boletin-signature-label" }, "Autoridad Escolar"),
                h("span", { className: "boletin-signature-sub" }, "Firma y Sello Dirección")
              ),
              h(
                "div",
                { className: "boletin-signature-box" },
                h("div", { className: "boletin-signature-line" }),
                h("span", { className: "boletin-signature-label" }, "Preceptor"),
                h("span", { className: "boletin-signature-sub" }, "Firma Preceptor a Cargo")
              ),
              h(
                "div",
                { className: "boletin-signature-box" },
                h("div", { className: "boletin-signature-line" }),
                h("span", { className: "boletin-signature-label" }, "Adulto Responsable"),
                h("span", { className: "boletin-signature-sub" }, "Firma Padre / Madre / Tutor")
              )
            )
          )
        )
      )
    ),
    document.body
  ),

  emailModalAbierto
    ? createPortal(
        h(
          "div",
          {
            className: "boletin-email-modal-overlay",
            onClick: (e) => {
              if (e.target === e.currentTarget) setEmailModalAbierto(false);
            }
          },
          h(
            "div",
            { className: "boletin-email-modal-card" },
            h(
              "div",
              { className: "boletin-email-modal-header" },
              h(
                "div",
                { className: "boletin-email-icon-box" },
                h(
                  "svg",
                  { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                  h("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }),
                  h("polyline", { points: "22,6 12,13 2,6" })
                )
              ),
              h(
                "div",
                null,
                h("h3", { className: "boletin-email-title" }, "Enviar Boletín por Correo Electrónico"),
                h("p", { className: "boletin-email-subtitle" }, `Notificación oficial de calificaciones · ${nombreAlumno}`)
              )
            ),
            emailFeedback
              ? h(
                  "div",
                  {
                    style: {
                      padding: "8px 12px",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      fontSize: "12px",
                      background: emailFeedback.type === "error" ? "#fee2e2" : "#dcfce7",
                      color: emailFeedback.type === "error" ? "#991b1b" : "#166534"
                    }
                  },
                  emailFeedback.message
                )
              : null,
            h(
              "div",
              { className: "boletin-email-field" },
              h("label", { className: "boletin-email-label" }, "Correo del Destinatario:"),
              h("input", {
                type: "email",
                className: "boletin-email-input",
                placeholder: "ejemplo@correo.com",
                value: emailDestinatario,
                onChange: (e) => setEmailDestinatario(e.target.value)
              })
            ),
            h(
              "div",
              { className: "boletin-email-field" },
              h("label", { className: "boletin-email-label" }, "Asunto del Mensaje:"),
              h("input", {
                type: "text",
                className: "boletin-email-input",
                value: emailAsunto,
                onChange: (e) => setEmailAsunto(e.target.value)
              })
            ),
            h(
              "div",
              { className: "boletin-email-field" },
              h("label", { className: "boletin-email-label" }, "Cuerpo del Correo:"),
              h("textarea", {
                className: "boletin-email-textarea",
                rows: 9,
                value: emailMensaje,
                onChange: (e) => setEmailMensaje(e.target.value)
              })
            ),
            h(
              "div",
              { className: "boletin-email-info-box" },
              h("strong", null, "ℹ️ Resumen Académico PBA:"),
              h("span", null, `Se enviará constancia oficial con Promedio General (${promedioGeneral}) e Inasistencia Total acumulada (${inasistencias.total || "0"} días).`)
            ),
            h(
              "div",
              { className: "boletin-email-actions" },
              h(
                "button",
                {
                  type: "button",
                  className: "action-button action-button--secondary",
                  onClick: () => setEmailModalAbierto(false)
                },
                "Cancelar"
              ),
              h(
                "a",
                {
                  href: `mailto:${encodeURIComponent(emailDestinatario)}?subject=${encodeURIComponent(emailAsunto)}&body=${encodeURIComponent(emailMensaje)}`,
                  className: "action-button action-button--secondary",
                  title: "Abrir en tu programa de correo predeterminado (Gmail / Outlook)"
                },
                "Abrir en Cliente de Correo"
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "action-button action-button--primary",
                  style: { background: "#700d18", borderColor: "#700d18" },
                  onClick: handleSendEmail,
                  disabled: enviandoEmail
                },
                enviandoEmail ? "Enviando..." : "Enviar Boletín"
              )
            )
          )
        ),
        document.body
      )
    : null
  );
}
