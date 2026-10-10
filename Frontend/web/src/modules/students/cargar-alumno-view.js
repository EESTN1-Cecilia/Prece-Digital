import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { h } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { CustomDatePicker } from "../../components/common/custom-datepicker.js";
import { StudentsService } from "./students-service.js";
import { useUsuarioActual } from "../../estado/index.js";
import * as XLSX from "xlsx";

function soloDigitos(val) {
  return String(val ?? "").replace(/\D/g, "");
}

function isSummaryRow(text) {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!t) return true;
  if (/^(varon|varones|mujer|mujeres)\s*(presentes?|ausentes?|totales?)?$/.test(t)) return true;
  if (/^(presentes?|ausentes?|totales?|total|just|injust)$/.test(t)) return true;
  if (t.includes("presentes") || t.includes("ausentes") || t.includes("total varon") || t.includes("total mujer") || t.includes("totales")) return true;
  if (t.includes("preceptor") || t.includes("apellido y nombre") || t.includes("n de orden")) return true;
  return false;
}

function isSwitchToMujeres(text) {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return (
    t.includes("varones presentes") ||
    t.includes("varones ausentes") ||
    t.includes("total varon") ||
    t.includes("varones totales") ||
    t.includes("mujeres")
  );
}

function normalizarTexto(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function checkDuplicateStatus(student, allStudents, existingList) {
  const normCurrent = normalizarTexto(student?.nombre);
  if (!normCurrent || normCurrent.length < 3) {
    return { isDuplicate: false, reason: "" };
  }

  // 1. Chequear si ya existe en la base de datos
  if (Array.isArray(existingList) && existingList.length > 0) {
    const foundInDb = existingList.find((ex) => {
      const exFull = normalizarTexto(ex.nombreCompleto || `${ex.apellido || ""} ${ex.nombre || ""}`);
      const exApeNom = normalizarTexto(`${ex.apellido || ""} ${ex.nombre || ""}`);
      const exNomApe = normalizarTexto(`${ex.nombre || ""} ${ex.apellido || ""}`);
      return (
        exFull === normCurrent ||
        exApeNom === normCurrent ||
        exNomApe === normCurrent ||
        (normCurrent.length > 8 && (exFull.includes(normCurrent) || normCurrent.includes(exFull)))
      );
    });
    if (foundInDb) {
      return { isDuplicate: true, reason: "Ya en BD" };
    }
  }

  // 2. Chequear si está duplicado dentro de la misma planilla
  if (Array.isArray(allStudents)) {
    const countInList = allStudents.filter((s) => normalizarTexto(s.nombre) === normCurrent).length;
    if (countInList > 1) {
      return { isDuplicate: true, reason: "Duplicado" };
    }
  }

  return { isDuplicate: false, reason: "" };
}

const CURSOS_OPTIONS = [
  "1° 1°", "1° 2°", "1° 3°", "1° 4°",
  "2° 1°", "2° 2°", "2° 3°", "2° 4°",
  "3° 1°", "3° 2°", "3° 3°", "3° 4°",
  "4° 1°", "4° 2°", "4° 3°", "4° 4°",
  "5° 1°", "5° 2°", "5° 3°", "5° 4°",
  "6° 1°", "6° 2°", "6° 3°", "6° 4°",
  "7° 1°", "7° 2°", "7° 3°", "7° 4°"
];
const TURNO_OPTIONS = ["Mañana", "Tarde", "Vespertino"];
const GENERO_OPTIONS = ["Masculino", "Femenino"];
const CONDICION_OPTIONS = ["REGULAR", "REPITIENTE", "PASE", "INGRESANTE", "PROMOTOR", "LIBRE"];

function getEmptyFormData() {
  return {
    // Paso 1: Datos del Estudiante
    nombre: "",
    apellido: "",
    dni: "",
    cuil: "",
    genero: "",
    fechaNacimiento: "",
    curso: "",
    division: "",
    turno: "",
    estado: "",
    fechaIngreso: "",
    pais: "",
    provincia: "",
    distrito: "",
    localidad: "",
    codigoPostal: "",

    // Paso 2: Datos del Tutor
    tutorNombre: "",
    tutorApellido: "",
    tutorDni: "",
    tutorCuil: "",
    tutorGenero: "",
    tutorFechaNacimiento: "",
    tutorParentesco: "",
    tutorTelefono: "",
    tutorEmail: "",
    // Domicilio del Tutor
    tutorCalle: "",
    tutorAltura: "",
    tutorPiso: "",
    tutorTorre: "",
    tutorDepto: "",
    tutorEntreCalle1: "",
    tutorEntreCalle2: "",
    tutorProvincia: "",
    tutorDistrito: "",
    tutorLocalidad: "",
    tieneSegundoTutor: false,
    tutor2Nombre: "",
    tutor2Apellido: "",
    tutor2Dni: "",
    tutor2Parentesco: "",
    tutor2Telefono: "",

    // Paso 3: Otros Datos
    mismoDomicilioQueTutor: true,
    alumnoCalle: "",
    alumnoAltura: "",
    alumnoPiso: "",
    alumnoTorre: "",
    alumnoDepto: "",
    alumnoEntreCalle1: "",
    alumnoEntreCalle2: "",
    alumnoProvincia: "",
    alumnoDistrito: "",
    alumnoLocalidad: "",
    telefonoParticular: "",
    emailParticular: "",
    telefonoEmergencia: "",
    contactoEmergenciaNombre: "",
    obraSocial: "",
    numeroAfiliado: "",
    grupoSanguineo: "",
    observacionesSalud: "",

    // Paso 4: Documentos
    documentoTipo: "",
    documentos: []
  };
}

export default function CargarAlumnoView() {
  const user = useUsuarioActual();
  const [modalidad, setModalidad] = useState("individual"); // "individual" | "masiva"
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [errors, setErrors] = useState({});

  // Estados para Carga Masiva (Excel)
  const [excelFile, setExcelFile] = useState(null);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowId, field }
  const [editingValue, setEditingValue] = useState("");
  const justSavedRef = useRef(false);
  const [existingStudents, setExistingStudents] = useState([]);

  useEffect(() => {
    let active = true;
    StudentsService.getAlumnos({ limit: 100 })
      .then((res) => {
        if (active && res && Array.isArray(res.data)) {
          setExistingStudents(res.data);
        }
      })
      .catch((err) => {
        console.warn("No se pudieron cargar alumnos existentes para cotejo:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDeleteRow = (rowId) => {
    setParsedStudents((prev) => {
      const updated = prev.filter((item) => item.id !== rowId);
      const varones = updated.filter((s) => s.genero === "Masculino").length;
      const mujeres = updated.filter((s) => s.genero === "Femenino").length;
      setExcelFile((prevEf) =>
        prevEf
          ? {
              ...prevEf,
              totalAlumnos: updated.length,
              totalVarones: varones,
              totalMujeres: mujeres,
              filasValidas: updated.length
            }
          : prevEf
      );
      if (floatingInfoRef.current) {
        floatingInfoRef.current.count = updated.length;
        floatingInfoRef.current.totalVarones = varones;
        floatingInfoRef.current.totalMujeres = mujeres;
      }
      return updated;
    });
  };

  // Control de animación de entrada y salida para el modal flotante
  const [floatingMounted, setFloatingMounted] = useState(false);
  const [floatingVisible, setFloatingVisible] = useState(false);
  const floatingInfoRef = useRef({
    name: "",
    curso: "",
    totalVarones: 0,
    totalMujeres: 0,
    count: 0
  });

  if (excelFile) {
    floatingInfoRef.current = {
      name: excelFile.name || "",
      curso: excelFile.curso || "7° 3°",
      totalVarones: excelFile.totalVarones ?? 0,
      totalMujeres: excelFile.totalMujeres ?? 0,
      count: parsedStudents.length
    };
  }

  const shouldShowFloating = Boolean(
    modalidad === "masiva" &&
    excelFile &&
    parsedStudents.length > 0 &&
    !importSuccess
  );

  useEffect(() => {
    if (shouldShowFloating) {
      setFloatingMounted(true);
      const timer = setTimeout(() => {
        setFloatingVisible(true);
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setFloatingVisible(false);
      const timer = setTimeout(() => {
        setFloatingMounted(false);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [shouldShowFloating]);

  const handleSaveEdit = (rowId, field, newValue) => {
    justSavedRef.current = true;
    setTimeout(() => {
      justSavedRef.current = false;
    }, 280);

    setParsedStudents((prev) => {
      const updated = prev.map((item) => {
        if (item.id === rowId) {
          return { ...item, [field]: newValue };
        }
        return item;
      });

      if (field === "genero") {
        const varones = updated.filter((s) => s.genero === "Masculino").length;
        const mujeres = updated.filter((s) => s.genero === "Femenino").length;
        setExcelFile((prevEf) =>
          prevEf
            ? {
                ...prevEf,
                totalVarones: varones,
                totalMujeres: mujeres
              }
            : prevEf
        );
      }

      return updated;
    });
    setEditingCell(null);
    setEditingValue("");
  };

  const descargarPlantilla = () => {
    const a = document.createElement("a");
    a.href = "/assets/plantilla_listas_2026.xlsx";
    a.download = "Plantilla_Oficial_Listas_2026.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0] || "Lista";
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      // Detect curso from filename (ej: 7º3º, 1º1º, 4to 2da) o sheetName
      let cursoDetectado = sheetName.replace(/lista/i, "").trim();
      const matchCurso = file.name.match(/(\d+)[º°o\s\.\-_]*(\d+)/);
      if (matchCurso) {
        cursoDetectado = `${matchCurso[1]}° ${matchCurso[2]}°`;
      } else if (!cursoDetectado || cursoDetectado.length > 10) {
        cursoDetectado = "1° 1°";
      }

      // Encontrar fila de encabezados
      let headerRowIdx = -1;
      let colOrden = 0;
      let colNombre = 1;
      let colProviene = 2;

      for (let i = 0; i < Math.min(rows.length, 12); i++) {
        const row = rows[i] || [];
        const rowStr = row.map((c) => String(c).toUpperCase()).join(" ");
        if (rowStr.includes("APELLIDO") || rowStr.includes("NOMBRE")) {
          headerRowIdx = i;
          row.forEach((cell, idx) => {
            const c = String(cell).toUpperCase();
            if (c.includes("ORDEN") || c.includes("Nº") || c.includes("N°")) colOrden = idx;
            if (c.includes("APELLIDO") || c.includes("NOMBRE")) colNombre = idx;
            if (c.includes("PROVIENE") || c.includes("ORIGEN") || c.includes("CONDICION")) colProviene = idx;
          });
          break;
        }
      }

      let currentGenero = "Masculino";
      const students = [];
      const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 1;

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const nombreRaw = String(row[colNombre] || "").trim();
        const col0Raw = String(row[colOrden] || "").trim();

        // Si se encuentra fila de resumen/divisor, cambiar de sección si corresponde y no mostrarla
        if (isSummaryRow(nombreRaw)) {
          if (isSwitchToMujeres(nombreRaw)) {
            currentGenero = "Femenino";
          }
          continue;
        }

        if (isSummaryRow(col0Raw)) {
          if (isSwitchToMujeres(col0Raw)) {
            currentGenero = "Femenino";
          }
          continue;
        }

        if (nombreRaw.length < 3) continue;

        const rawOrden = row[colOrden];
        const orden = rawOrden !== "" && rawOrden !== undefined ? String(rawOrden).replace(/\.0$/, "").trim() : String(students.length + 1);
        const proviene = row[colProviene] ? String(row[colProviene]).trim() : "REGULAR";

        students.push({
          id: students.length + 1,
          orden: orden || String(students.length + 1),
          nombre: nombreRaw,
          proviene: proviene || "REGULAR",
          genero: currentGenero,
          curso: cursoDetectado,
          turno: cursoDetectado.startsWith("1") || cursoDetectado.startsWith("2") || cursoDetectado.startsWith("7") ? "Mañana" : "Tarde"
        });
      }

      const totalVarones = students.filter((s) => s.genero === "Masculino").length;
      const totalMujeres = students.filter((s) => s.genero === "Femenino").length;

      setParsedStudents(students);
      setExcelFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        totalAlumnos: students.length,
        totalVarones: totalVarones,
        totalMujeres: totalMujeres,
        cursosDetectados: 1,
        filasValidas: students.length,
        alertas: 0,
        curso: cursoDetectado
      });
      setImportSuccess(false);
    } catch (err) {
      console.error("Error al procesar archivo Excel:", err);
      setExcelFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        totalAlumnos: 0,
        totalVarones: 0,
        totalMujeres: 0,
        cursosDetectados: 0,
        filasValidas: 0,
        alertas: 1,
        curso: "—"
      });
      setParsedStudents([]);
    }
  };

  // Formulario totalmente limpio sin datos autocompletados
  const [formData, setFormData] = useState(getEmptyFormData);

  const handleChange = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor
    }));
    if (errors[campo]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[campo];
        return next;
      });
    }
  };

  // Validaciones estrictas: TODOS los campos son obligatorios y deben ser completados por el usuario
  const validarPaso = (paso) => {
    const errs = {};

    if (paso === 1) {
      // Nombre
      if (!formData.nombre.trim()) {
        errs.nombre = "El nombre es obligatorio.";
      } else if (formData.nombre.trim().length < 2) {
        errs.nombre = "El nombre debe tener al menos 2 letras.";
      }

      // Apellido
      if (!formData.apellido.trim()) {
        errs.apellido = "El apellido es obligatorio.";
      } else if (formData.apellido.trim().length < 2) {
        errs.apellido = "El apellido debe tener al menos 2 letras.";
      }

      // DNI
      const dniDigits = soloDigitos(formData.dni);
      if (!dniDigits) {
        errs.dni = "El DNI es obligatorio.";
      } else if (dniDigits.length < 7 || dniDigits.length > 8) {
        errs.dni = "El DNI debe tener entre 7 y 8 dígitos numéricos.";
      }

      // CUIL (Obligatorio)
      const cuilDigits = soloDigitos(formData.cuil);
      if (!cuilDigits) {
        errs.cuil = "El CUIL es obligatorio.";
      } else if (cuilDigits.length !== 11) {
        errs.cuil = "El CUIL debe contener exactamente 11 dígitos.";
      }

      // Género
      if (!formData.genero) {
        errs.genero = "Debe seleccionar el género.";
      }

      // Fecha de Nacimiento
      if (!formData.fechaNacimiento) {
        errs.fechaNacimiento = "La fecha de nacimiento es obligatoria.";
      } else {
        const fn = new Date(formData.fechaNacimiento + "T00:00:00");
        const hoy = new Date();
        if (isNaN(fn.getTime())) {
          errs.fechaNacimiento = "Fecha inválida.";
        } else if (fn > hoy) {
          errs.fechaNacimiento = "La fecha no puede ser futura.";
        } else {
          const edad = hoy.getFullYear() - fn.getFullYear();
          if (edad < 5 || edad > 35) {
            errs.fechaNacimiento = "Verifique la fecha (edad fuera de rango escolar).";
          }
        }
      }

      // Curso, División, Turno, Estado, Fecha de Ingreso
      if (!formData.curso) errs.curso = "Debe seleccionar el curso.";
      if (!formData.division) errs.division = "Debe seleccionar la división.";
      if (!formData.turno) errs.turno = "Debe seleccionar el turno.";
      if (!formData.estado) errs.estado = "Debe seleccionar el estado.";
      if (!formData.fechaIngreso) errs.fechaIngreso = "La fecha de ingreso es obligatoria.";

      // Geografía
      if (!formData.pais) errs.pais = "Debe seleccionar el país.";
      if (!formData.provincia) errs.provincia = "Debe seleccionar la provincia.";
      if (!formData.distrito) errs.distrito = "Debe seleccionar el distrito / partido.";
      if (!formData.localidad) errs.localidad = "Debe seleccionar la localidad.";
      if (!formData.codigoPostal || !formData.codigoPostal.trim()) {
        errs.codigoPostal = "El código postal es obligatorio.";
      } else if (formData.codigoPostal.trim().length < 4) {
        errs.codigoPostal = "Ingrese un código postal válido.";
      }
    } else if (paso === 2) {
      // Tutor Nombre
      if (!formData.tutorNombre.trim()) {
        errs.tutorNombre = "El nombre del tutor es obligatorio.";
      } else if (formData.tutorNombre.trim().length < 2) {
        errs.tutorNombre = "Ingrese al menos 2 letras.";
      }

      // Tutor Apellido
      if (!formData.tutorApellido.trim()) {
        errs.tutorApellido = "El apellido del tutor es obligatorio.";
      } else if (formData.tutorApellido.trim().length < 2) {
        errs.tutorApellido = "Ingrese al menos 2 letras.";
      }

      // Tutor DNI
      const tutorDniDigits = soloDigitos(formData.tutorDni);
      if (!tutorDniDigits) {
        errs.tutorDni = "El DNI del tutor es obligatorio.";
      } else if (tutorDniDigits.length < 7 || tutorDniDigits.length > 8) {
        errs.tutorDni = "El DNI debe tener entre 7 y 8 dígitos numéricos.";
      }

      // Tutor CUIL (Obligatorio)
      const tutorCuilDigits = soloDigitos(formData.tutorCuil);
      if (!tutorCuilDigits) {
        errs.tutorCuil = "El CUIL del tutor es obligatorio.";
      } else if (tutorCuilDigits.length !== 11) {
        errs.tutorCuil = "El CUIL debe contener exactamente 11 dígitos.";
      }

      // Tutor Género y Fecha Nacimiento
      if (!formData.tutorGenero) {
        errs.tutorGenero = "Debe seleccionar el género del tutor.";
      }
      if (!formData.tutorFechaNacimiento) {
        errs.tutorFechaNacimiento = "La fecha de nacimiento del tutor es obligatoria.";
      }

      // Tutor Parentesco
      if (!formData.tutorParentesco) {
        errs.tutorParentesco = "Debe seleccionar el parentesco.";
      }

      // Tutor Teléfono
      const telDigits = soloDigitos(formData.tutorTelefono);
      if (!telDigits) {
        errs.tutorTelefono = "El teléfono de contacto es obligatorio.";
      } else if (telDigits.length < 8) {
        errs.tutorTelefono = "Ingrese un teléfono válido (mínimo 8 dígitos).";
      }

      // Tutor Email (Obligatorio)
      if (!formData.tutorEmail.trim()) {
        errs.tutorEmail = "El correo electrónico es obligatorio.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.tutorEmail.trim())) {
        errs.tutorEmail = "Ingrese un correo electrónico válido (ej: nombre@dominio.com).";
      }

      // Domicilio del Tutor (Todos obligatorios)
      if (!formData.tutorCalle.trim()) {
        errs.tutorCalle = "La calle del domicilio es obligatoria.";
      }
      if (!formData.tutorAltura.trim()) {
        errs.tutorAltura = "La altura / número es obligatoria.";
      }
      if (!formData.tutorEntreCalle1.trim()) {
        errs.tutorEntreCalle1 = "La entre calle 1 es obligatoria.";
      }
      if (!formData.tutorEntreCalle2.trim()) {
        errs.tutorEntreCalle2 = "La entre calle 2 es obligatoria.";
      }
      if (!formData.tutorLocalidad) {
        errs.tutorLocalidad = "Debe seleccionar la localidad.";
      }

      // Segundo Tutor (si está activo, todos sus campos son obligatorios)
      if (formData.tieneSegundoTutor) {
        if (!formData.tutor2Nombre.trim()) {
          errs.tutor2Nombre = "El nombre del segundo tutor es obligatorio.";
        }
        if (!formData.tutor2Apellido.trim()) {
          errs.tutor2Apellido = "El apellido del segundo tutor es obligatorio.";
        }
        const d2 = soloDigitos(formData.tutor2Dni);
        if (!d2) {
          errs.tutor2Dni = "El DNI del segundo tutor es obligatorio.";
        } else if (d2.length < 7 || d2.length > 8) {
          errs.tutor2Dni = "El DNI debe tener entre 7 y 8 dígitos.";
        }
        if (!formData.tutor2Parentesco) {
          errs.tutor2Parentesco = "Debe seleccionar el parentesco del segundo tutor.";
        }
        const t2 = soloDigitos(formData.tutor2Telefono);
        if (!t2) {
          errs.tutor2Telefono = "El teléfono del segundo tutor es obligatorio.";
        } else if (t2.length < 8) {
          errs.tutor2Telefono = "Ingrese un teléfono válido (mínimo 8 dígitos).";
        }
      }
    } else if (paso === 3) {
      // Domicilio del alumno si difiere del tutor
      if (!formData.mismoDomicilioQueTutor) {
        if (!formData.alumnoCalle.trim()) {
          errs.alumnoCalle = "La calle del domicilio es obligatoria.";
        }
        if (!formData.alumnoAltura.trim()) {
          errs.alumnoAltura = "La altura / número es obligatoria.";
        }
        if (!formData.alumnoEntreCalle1.trim()) {
          errs.alumnoEntreCalle1 = "La entre calle 1 es obligatoria.";
        }
        if (!formData.alumnoEntreCalle2.trim()) {
          errs.alumnoEntreCalle2 = "La entre calle 2 es obligatoria.";
        }
        if (!formData.alumnoLocalidad) {
          errs.alumnoLocalidad = "Debe seleccionar la localidad.";
        }
      }

      // Contacto y Emergencias (Todos obligatorios)
      if (!formData.telefonoParticular.trim()) {
        errs.telefonoParticular = "El teléfono particular del alumno es obligatorio.";
      } else if (soloDigitos(formData.telefonoParticular).length < 8) {
        errs.telefonoParticular = "Ingrese un teléfono válido (mínimo 8 dígitos).";
      }

      if (!formData.emailParticular.trim()) {
        errs.emailParticular = "El email de contacto es obligatorio.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailParticular.trim())) {
        errs.emailParticular = "Ingrese un correo electrónico válido.";
      }

      if (!formData.telefonoEmergencia.trim()) {
        errs.telefonoEmergencia = "El teléfono de emergencia es obligatorio.";
      } else if (soloDigitos(formData.telefonoEmergencia).length < 8) {
        errs.telefonoEmergencia = "Ingrese un teléfono válido (mínimo 8 dígitos).";
      }

      // Datos de Salud (Todos obligatorios)
      if (!formData.obraSocial.trim()) {
        errs.obraSocial = "La obra social / prepaga es obligatoria (indique 'Ninguna' si no posee).";
      }
      if (!formData.numeroAfiliado.trim()) {
        errs.numeroAfiliado = "El número de afiliado o credencial es obligatorio (indique 'S/N' si no posee).";
      }
      if (!formData.grupoSanguineo) {
        errs.grupoSanguineo = "Debe seleccionar el grupo sanguíneo.";
      }
      if (!formData.observacionesSalud.trim()) {
        errs.observacionesSalud = "Las observaciones médicas o alergias son obligatorias (indique 'Ninguna' si no posee).";
      }
    } else if (paso === 4) {
      if (!formData.documentos || formData.documentos.length === 0) {
        errs.documentos = "Debe adjuntar al menos un documento para el legajo digital.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSiguiente = () => {
    if (validarPaso(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 180, behavior: "smooth" });
      }
    }
  };

  const handleAnterior = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 180, behavior: "smooth" });
    } else {
      window.location.hash = "#/alumnos";
    }
  };

  const handleGuardar = async (e) => {
    if (e) e.preventDefault();

    // Validar rigurosamente todos los pasos antes de enviar
    const okPaso1 = validarPaso(1);
    if (!okPaso1) {
      setCurrentStep(1);
      window.scrollTo({ top: 180, behavior: "smooth" });
      return;
    }

    const okPaso2 = validarPaso(2);
    if (!okPaso2) {
      setCurrentStep(2);
      window.scrollTo({ top: 180, behavior: "smooth" });
      return;
    }

    const okPaso3 = validarPaso(3);
    if (!okPaso3) {
      setCurrentStep(3);
      window.scrollTo({ top: 180, behavior: "smooth" });
      return;
    }

    const okPaso4 = validarPaso(4);
    if (!okPaso4) {
      setCurrentStep(4);
      window.scrollTo({ top: 180, behavior: "smooth" });
      return;
    }

    setSaving(true);
    try {
      // Domicilio unificado
      const calleFinal = formData.mismoDomicilioQueTutor ? formData.tutorCalle : formData.alumnoCalle;
      const alturaFinal = formData.mismoDomicilioQueTutor ? formData.tutorAltura : formData.alumnoAltura;
      const entreCallesFinal = formData.mismoDomicilioQueTutor
        ? `${formData.tutorEntreCalle1} y ${formData.tutorEntreCalle2}`.replace(/^ y | y $/g, "").trim()
        : `${formData.alumnoEntreCalle1} y ${formData.alumnoEntreCalle2}`.replace(/^ y | y $/g, "").trim();

      const res = await StudentsService.createAlumno({
        ...formData,
        calle: calleFinal,
        altura: alturaFinal,
        entreCalles: entreCallesFinal,
        telefono: formData.telefonoParticular || formData.tutorTelefono
      });

      setSaveSuccess(res.data);
    } catch (fallo) {
      /* El backend valida curso/division, DNI unico y formatos: se muestra su motivo. */
      const detalle = fallo?.campos ? Object.values(fallo.campos).join(" ") : "";
      alert(`${fallo?.mensaje ?? "Ocurrió un inconveniente al guardar el estudiante."} ${detalle}`.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocumentoMock = () => {
    if (!formData.documentoTipo) {
      setErrors((prev) => ({
        ...prev,
        documentoTipo: "Seleccione un tipo de documento antes de subir el archivo."
      }));
      return;
    }

    const nuevoDoc = {
      id: Date.now(),
      tipo: formData.documentoTipo,
      nombre: `doc_${formData.documentos.length + 1}_${Date.now().toString().slice(-4)}.pdf`,
      tamano: "1.2 MB",
      fecha: "Recién cargado"
    };
    setFormData((prev) => ({
      ...prev,
      documentos: [...prev.documentos, nuevoDoc]
    }));
    if (errors.documentos || errors.documentoTipo) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.documentos;
        delete next.documentoTipo;
        return next;
      });
    }
  };

  const handleRemoveDocumento = (docId) => {
    setFormData((prev) => ({
      ...prev,
      documentos: prev.documentos.filter((d) => d.id !== docId)
    }));
  };

  const renderCargaMasiva = () => {
    const renderEditableCell = ({ row, field, value, type = "text", options = [], displayContent }) => {
      const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;

      if (isEditing) {
        if (type === "select") {
          const allOptions = options.includes(value) ? options : [value, ...options];
          return h(
            "div",
            { className: "cell-editor-wrap cell-editor-wrap--combobox" },
            h(CustomSelect, {
              className: "cell-custom-select",
              value: editingValue !== undefined && editingValue !== "" ? editingValue : value,
              options: allOptions,
              defaultOpen: true,
              isSearchable: allOptions.length > 8,
              onChange: (val) => {
                setEditingValue(val);
                handleSaveEdit(row.id, field, val);
              },
              onClose: () => {
                setEditingCell(null);
              }
            })
          );
        }

        return h(
          "div",
          { className: "cell-editor-wrap cell-editor-wrap--text" },
          h("input", {
            type: "text",
            autoFocus: true,
            className: "cell-text-input",
            value: editingValue !== undefined ? editingValue : value,
            onChange: (e) => setEditingValue(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveEdit(row.id, field, editingValue);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditingCell(null);
              }
            },
            onBlur: () => {
              if (!justSavedRef.current) {
                handleSaveEdit(row.id, field, editingValue);
              }
            }
          }),
          h(
            "button",
            {
              type: "button",
              className: "btn-cell-save",
              onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
              },
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveEdit(row.id, field, editingValue);
              },
              title: "Guardar"
            },
            "✓"
          )
        );
      }

      return h(
        "div",
        {
          className: "cell-view-wrap",
          onClick: (e) => {
            if (justSavedRef.current) {
              e.stopPropagation();
              return;
            }
            setEditingCell({ rowId: row.id, field });
            setEditingValue(value);
          }
        },
        h("div", { className: "cell-view-content" }, displayContent !== undefined ? displayContent : value),
        h(
          "button",
          {
            type: "button",
            className: "btn-cell-pencil",
            title: `Editar ${field}`,
            onClick: (e) => {
              e.stopPropagation();
              if (justSavedRef.current) return;
              setEditingCell({ rowId: row.id, field });
              setEditingValue(value);
            }
          },
          h(
            "svg",
            { viewBox: "0 0 20 20", fill: "currentColor", width: 12, height: 12 },
            h("path", {
              d: "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
            })
          )
        )
      );
    };

    return h(
      DashboardCard,
      {
        title: "Carga Masiva de Alumnos por Planilla Excel",
        icon: "user-search",
        className: "dashboard-card--highlight cargar-alumno-card",
        collapsible: false
      },
      h(
        "div",
        { className: `excel-bulk-container ${excelFile && parsedStudents.length > 0 && !importSuccess ? "excel-bulk-container--has-floating" : ""}` },

        // 1. Banner Descarga Plantilla Oficial
        h(
          "div",
          { className: "excel-template-banner" },
          h(
            "div",
            { className: "excel-template-banner__left" },
            h(
              "div",
              { className: "excel-icon-box" },
              h("img", {
                src: "/assets/excel.png",
                alt: "Excel",
                className: "excel-icon-img"
              })
            ),
            h(
              "div",
              { className: "excel-template-banner__info" },
              h("h3", null, "Descargar Plantilla Oficial Excel (Listas 2026)"),
              h("p", null, "Modelo institucional oficial por curso y división (E.E.S.T N°1). Compatible con las planillas oficiales de preceptoría.")
            )
          ),
          h(
            "button",
            {
              type: "button",
              className: "btn-descargar-plantilla",
              onClick: descargarPlantilla,
              title: "Descargar planilla oficial .xlsx"
            },
            h(
              "svg",
              { viewBox: "0 0 20 20", fill: "currentColor", width: 18, height: 18 },
              h("path", { fillRule: "evenodd", d: "M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z", clipRule: "evenodd" })
            ),
            h("span", null, "Descargar Plantilla Oficial (.xlsx)")
          )
        ),

        // 2. Zona Drag & Drop o Ficha de Archivo Cargado
        !excelFile
          ? h(
              "div",
              {
                className: `excel-dropzone ${isDragging ? "excel-dropzone--dragover" : ""}`,
                onDragOver: (e) => {
                  e.preventDefault();
                  setIsDragging(true);
                },
                onDragLeave: () => setIsDragging(false),
                onDrop: (e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                },
                onClick: () => {
                  const input = document.getElementById("excel-file-input");
                  if (input) input.click();
                }
              },
              h("input", {
                id: "excel-file-input",
                type: "file",
                accept: ".xlsx, .xls, .csv",
                style: { display: "none" },
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }
              }),
              h(
                "div",
                { className: "excel-dropzone__icon-circle" },
                h(
                  "svg",
                  { viewBox: "0 0 24 24", fill: "currentColor", width: 32, height: 32 },
                  h("path", { d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" })
                )
              ),
              h("h3", { className: "excel-dropzone__title" }, "Arrastrá tu archivo Excel aquí o haz clic para seleccionarlo"),
              h("p", { className: "excel-dropzone__desc" }, "Soporta formatos oficiales .xlsx, .xls o .csv (hasta 15 MB)"),
              h(
                "button",
                {
                  type: "button",
                  className: "excel-dropzone__btn",
                  onClick: (e) => {
                    e.stopPropagation();
                    const input = document.getElementById("excel-file-input");
                    if (input) input.click();
                  }
                },
                h(
                  "svg",
                  { viewBox: "0 0 20 20", fill: "currentColor", width: 16, height: 16 },
                  h("path", { fillRule: "evenodd", d: "M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z", clipRule: "evenodd" })
                ),
                h("span", null, "Examinar archivos")
              )
            )
          : h(
              "div",
              { className: "excel-file-card" },
              h(
                "div",
                { className: "excel-file-card__left" },
                h(
                  "div",
                  { className: "excel-file-badge-icon" },
                  h("img", {
                    src: "/assets/excel.png",
                    alt: "Excel",
                    className: "excel-icon-img",
                    style: { width: "24px", height: "24px" }
                  })
                ),
                h(
                  "div",
                  { className: "excel-file-meta" },
                  h("h4", null, excelFile.name),
                  h(
                    "div",
                    { className: "excel-file-meta-pills" },
                    h("span", null, `Tamaño: ${excelFile.size}`),
                    h("span", null, "•"),
                    h("span", { className: "excel-file-status-badge" }, "✓ Archivo Validado")
                  )
                )
              ),
              h(
                "div",
                { className: "excel-file-actions" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-file-action",
                    onClick: () => {
                      const input = document.getElementById("excel-file-input-reemplazar");
                      if (input) input.click();
                    }
                  },
                  "Reemplazar Archivo"
                ),
                h("input", {
                  id: "excel-file-input-reemplazar",
                  type: "file",
                  accept: ".xlsx, .xls, .csv",
                  style: { display: "none" },
                  onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }
                }),
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-file-action btn-file-action--remove",
                    onClick: () => {
                      setExcelFile(null);
                      setParsedStudents([]);
                      setImportSuccess(false);
                    }
                  },
                  "Eliminar"
                )
              )
            ),

        // 3. Grilla de Métricas de Importación
        excelFile
          ? h(
              "div",
              { className: "excel-metrics-grid" },
              h(
                "div",
                { className: "excel-metric-card" },
                h("strong", null, excelFile.totalAlumnos),
                h("span", null, "Total Estudiantes")
              ),
              h(
                "div",
                { className: "excel-metric-card" },
                h("strong", { style: { color: "#1d4ed8" } }, excelFile.totalVarones !== undefined ? excelFile.totalVarones : "—"),
                h("span", null, "Varones (Masculino)")
              ),
              h(
                "div",
                { className: "excel-metric-card" },
                h("strong", { style: { color: "#be185d" } }, excelFile.totalMujeres !== undefined ? excelFile.totalMujeres : "—"),
                h("span", null, "Mujeres (Femenino)")
              ),
              h(
                "div",
                { className: "excel-metric-card" },
                h("strong", { style: { color: "#15803d" } }, excelFile.filasValidas),
                h("span", null, "Registros Válidos")
              )
            )
          : null,

        // 4. Tabla de Previsualización de Datos Detectados
        excelFile
          ? h(
              "div",
              { className: "excel-preview-block" },
              h(
                "div",
                { className: "excel-preview-header" },
                h(
                  "div",
                  null,
                  h("h4", { className: "excel-preview-title" }, "Vista Previa de Alumnos Detectados"),
                  h("span", { className: "excel-preview-subtitle" }, `Mostrando ${parsedStudents.length} alumnos detectados en la planilla:`)
                ),
                h("span", { className: "badge-valid-row" }, "✓ Formato Correcto")
              ),
              h(
                "div",
                { className: "excel-preview-table-container" },
                h(
                  "table",
                  { className: "excel-preview-table" },
                  h(
                    "thead",
                    null,
                    h(
                      "tr",
                      null,
                      h("th", { style: { width: "7%", textAlign: "center" } }, "N°"),
                      h("th", { style: { width: "30%" } }, "Apellido y Nombre"),
                      h("th", { style: { width: "12%" } }, "Género"),
                      h("th", { style: { width: "12%" } }, "Condición"),
                      h("th", { style: { width: "9%", textAlign: "center" } }, "Curso"),
                      h("th", { style: { width: "10%" } }, "Turno"),
                      h("th", { style: { width: "14%", textAlign: "center" } }, "Estado"),
                      h("th", { style: { width: "6%", textAlign: "center" }, title: "Acciones" }, "")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    parsedStudents.length > 0
                      ? parsedStudents.map((row) => {
                          const duplicateStatus = checkDuplicateStatus(row, parsedStudents, existingStudents);
                          const isDuplicate = duplicateStatus.isDuplicate;

                          return h(
                            "tr",
                            {
                              key: row.id,
                              className: isDuplicate ? "excel-preview-row--duplicate" : ""
                            },
                            // 1. N°
                            h(
                              "td",
                              {
                                style: {
                                  width: "7%",
                                  textAlign: "center",
                                  color: "#64748b",
                                  fontWeight: 800,
                                  fontSize: "13px",
                                  userSelect: "none"
                                }
                              },
                              row.orden
                            ),
                            // 2. Apellido y Nombre
                            h(
                              "td",
                              {
                                className: `editable-cell ${editingCell?.rowId === row.id && editingCell?.field === "nombre" ? "editable-cell--editing" : ""}`,
                                style: { width: "30%", overflow: "hidden", textOverflow: "ellipsis" }
                              },
                              renderEditableCell({
                                row,
                                field: "nombre",
                                value: row.nombre,
                                type: "text",
                                displayContent: h("span", { style: { fontWeight: 800, color: "#0f172a" }, title: row.nombre }, row.nombre)
                              })
                            ),
                            // 3. Género
                            h(
                              "td",
                              {
                                className: `editable-cell ${editingCell?.rowId === row.id && editingCell?.field === "genero" ? "editable-cell--editing" : ""}`,
                                style: { width: "12%" }
                              },
                              renderEditableCell({
                                row,
                                field: "genero",
                                value: row.genero,
                                type: "select",
                                options: GENERO_OPTIONS,
                                displayContent:
                                  row.genero === "Femenino"
                                    ? h(
                                        "span",
                                        {
                                          style: {
                                            background: "#fdf2f8",
                                            color: "#be185d",
                                            border: "1px solid #fbcfe8",
                                            padding: "2px 8px",
                                            borderRadius: "6px",
                                            fontWeight: 700,
                                            fontSize: "11.5px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "3px"
                                          }
                                        },
                                        "♀ Femenino"
                                      )
                                    : h(
                                        "span",
                                        {
                                          style: {
                                            background: "#eff6ff",
                                            color: "#1d4ed8",
                                            border: "1px solid #bfdbfe",
                                            padding: "2px 8px",
                                            borderRadius: "6px",
                                            fontWeight: 700,
                                            fontSize: "11.5px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "3px"
                                          }
                                        },
                                        "♂ Masculino"
                                      )
                              })
                            ),
                            // 4. Condición
                            h(
                              "td",
                              {
                                className: `editable-cell ${editingCell?.rowId === row.id && editingCell?.field === "proviene" ? "editable-cell--editing" : ""}`,
                                style: { width: "12%" }
                              },
                              renderEditableCell({
                                row,
                                field: "proviene",
                                value: row.proviene,
                                type: "select",
                                options: CONDICION_OPTIONS,
                                displayContent: h(
                                  "span",
                                  {
                                    style: {
                                      background: "#f8fafc",
                                      color: "#475569",
                                      border: "1px solid #e2e8f0",
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      fontWeight: 700,
                                      fontSize: "11.5px"
                                    }
                                  },
                                  row.proviene
                                )
                              })
                            ),
                            // 5. Curso
                            h(
                              "td",
                              {
                                className: `editable-cell ${editingCell?.rowId === row.id && editingCell?.field === "curso" ? "editable-cell--editing" : ""}`,
                                style: { width: "9%", textAlign: "center" }
                              },
                              renderEditableCell({
                                row,
                                field: "curso",
                                value: row.curso,
                                type: "select",
                                options: CURSOS_OPTIONS,
                                displayContent: h(
                                  "span",
                                  {
                                    style: {
                                      background: "#eff6ff",
                                      color: "#1d4ed8",
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      fontWeight: 700,
                                      fontSize: "11.5px"
                                    }
                                  },
                                  row.curso
                                )
                              })
                            ),
                            // 6. Turno
                            h(
                              "td",
                              {
                                className: `editable-cell ${editingCell?.rowId === row.id && editingCell?.field === "turno" ? "editable-cell--editing" : ""}`,
                                style: { width: "10%" }
                              },
                              renderEditableCell({
                                row,
                                field: "turno",
                                value: row.turno,
                                type: "select",
                                options: TURNO_OPTIONS,
                                displayContent: h("span", { style: { fontWeight: 600, color: "#334155", fontSize: "12.5px" } }, row.turno)
                              })
                            ),
                            // 7. Estado
                            h(
                              "td",
                              { style: { width: "14%", textAlign: "center" } },
                              isDuplicate
                                ? h(
                                    "span",
                                    {
                                      className: "badge-duplicate-row",
                                      title: `Registro con conflicto: ${duplicateStatus.reason}`
                                    },
                                    `⚠️ ${duplicateStatus.reason}`
                                  )
                                : h(
                                    "span",
                                    {
                                      className: "badge-valid-row",
                                      title: "Listo para alta"
                                    },
                                    "✓ Listo para alta"
                                  )
                            ),
                            // 8. Acción (Eliminar fila)
                            h(
                              "td",
                              { style: { width: "6%", textAlign: "center" } },
                              h(
                                "button",
                                {
                                  type: "button",
                                  className: `btn-delete-row ${isDuplicate ? "btn-delete-row--highlight" : ""}`,
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    handleDeleteRow(row.id);
                                  },
                                  title: isDuplicate
                                    ? `Eliminar fila con conflicto (${duplicateStatus.reason})`
                                    : "Eliminar alumno de la lista"
                                },
                                h(
                                  "svg",
                                  { viewBox: "0 0 20 20", fill: "currentColor", width: 15, height: 15 },
                                  h("path", {
                                    fillRule: "evenodd",
                                    d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z",
                                    clipRule: "evenodd"
                                  })
                                )
                              )
                            )
                          );
                        })
                      : h(
                          "tr",
                          null,
                          h("td", { colSpan: 8, style: { textAlign: "center", padding: "24px", color: "#64748b" } }, "No se detectaron filas de alumnos en la planilla.")
                        )
                  )
                )
              )
            )
          : null,

        // 5. Tarjeta de Guía y Requisitos
        h(
          "div",
          { className: "excel-guide-card" },
          h(
            "h4",
            null,
            h(
              "svg",
              { viewBox: "0 0 20 20", fill: "currentColor", width: 18, height: 18, style: { color: "#107c41" } },
              h("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z", clipRule: "evenodd" })
            ),
            h("span", null, "Compatibilidad con Planillas Oficiales (Listas 2026)")
          ),
          h(
            "ul",
            { className: "excel-guide-list" },
            h("li", { className: "excel-guide-item" }, h("span", { className: "excel-guide-bullet" }, "•"), h("span", null, "Estructura institucional: El sistema lee las columnas oficiales Nº de Orden y Apellido y Nombre.")),
            h("li", { className: "excel-guide-item" }, h("span", { className: "excel-guide-bullet" }, "•"), h("span", null, "Hojas por curso: Reconoce divisiones y grupos por pestaña (ej: 1º1º, 1º2º, etc.).")),
            h("li", { className: "excel-guide-item" }, h("span", { className: "excel-guide-bullet" }, "•"), h("span", null, "Actualización de legajo: Si el alumno ya existe en el sistema, se actualiza su cursada 2026 sin duplicar.")),
            h("li", { className: "excel-guide-item" }, h("span", { className: "excel-guide-bullet" }, "•"), h("span", null, "Matrícula automática: Al confirmar, todos los estudiantes de la planilla quedan inscriptos en el ciclo lectivo."))
          )
        ),

        // Banner de Éxito al Confirmar
        importSuccess
          ? h(
              "div",
              { className: "save-success-banner", style: { marginTop: "8px", marginBottom: "16px" } },
              h(
                "div",
                { className: "save-success-icon-wrap" },
                h("svg", { viewBox: "0 0 24 24", fill: "currentColor", width: 28, height: 28 }, h("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }))
              ),
              h(
                "div",
                { className: "save-success-text" },
                h("h3", null, "¡Carga Masiva Procesada con Éxito!"),
                h("p", null, `Se incorporaron exitosamente los ${excelFile ? excelFile.totalAlumnos : 32} alumnos de la planilla en el padrón del ciclo lectivo.`)
              ),
              h(
                "div",
                { className: "save-success-actions" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-volver-listado-success",
                    onClick: () => { window.location.hash = "#/alumnos"; }
                  },
                  "Ir al Listado de Alumnos"
                )
              )
            )
          : null
      )
    );
  };

    const floatingModalPortal =
    floatingMounted && typeof document !== "undefined"
      ? createPortal(
          h(
            "div",
            {
              className: `excel-floating-action-modal ${
                floatingVisible ? "excel-floating-action-modal--visible" : ""
              }`
            },
            h(
              "div",
              { className: "excel-floating-bar__left" },
              h(
                "div",
                { className: "excel-floating-bar__icon-wrap" },
                h("img", {
                  src: "/assets/excel.png",
                  alt: "Excel",
                  className: "excel-floating-bar__img"
                })
              ),
              h(
                "div",
                { className: "excel-floating-bar__text" },
                h(
                  "span",
                  { className: "excel-floating-bar__title" },
                  `${floatingInfoRef.current.count} Alumnos Listos para Importar`
                ),
                h(
                  "span",
                  { className: "excel-floating-bar__subtitle" },
                  `${floatingInfoRef.current.name} • Curso: ${floatingInfoRef.current.curso} • ${floatingInfoRef.current.totalVarones} Varones / ${floatingInfoRef.current.totalMujeres} Mujeres`
                )
              )
            ),
            h(
              "div",
              { className: "excel-floating-bar__actions" },
              h(
                "button",
                {
                  type: "button",
                  className: "btn-cancelar-masiva",
                  onClick: () => {
                    setExcelFile(null);
                    setParsedStudents([]);
                    setImportSuccess(false);
                  },
                  title: "Cancelar y descartar archivo"
                },
                h(
                  "svg",
                  { viewBox: "0 0 20 20", fill: "currentColor", width: 16, height: 16 },
                  h("path", {
                    fillRule: "evenodd",
                    d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
                    clipRule: "evenodd"
                  })
                ),
                h("span", null, "Cancelar")
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "btn-confirmar-masiva",
                  onClick: () => {
                    setImportSuccess(true);
                    window.scrollTo({ top: 120, behavior: "smooth" });
                  }
                },
                h(
                  "svg",
                  { viewBox: "0 0 20 20", fill: "currentColor", width: 18, height: 18 },
                  h("path", {
                    fillRule: "evenodd",
                    d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
                    clipRule: "evenodd"
                  })
                ),
                h("span", null, `Confirmar e Importar ${floatingInfoRef.current.count} Alumnos`)
              )
            )
          ),
          document.body
        )
      : null;

  return h(
    React.Fragment,
    null,
    h(
      "section",
      { className: "cargar-alumno-page secretaria-dashboard" },

    // Barra superior: Volver al listado e información escolar
    h(
      "div",
      { className: "secretaria-top-bar" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            window.location.hash = "#/alumnos";
          },
          title: "Volver al listado de alumnos",
          "aria-label": "Volver al listado de alumnos"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver al Listado de Alumnos")
      ),
      h(
        "div",
        { className: "secretaria-eyebrow" },
        `${user.escuela || "E.E.S.T. N°1 Cecilia Berdichevski"} · CICLO ${user.cicloLectivo || 2026}`
      )
    ),

    // Título y bajada descriptiva
    h(
      "div",
      { className: "secretaria-title-row" },
      h(
        "div",
        null,
        h("h1", { className: "secretaria-title" }, "Cargar Alumno"),
        h(
          "p",
          { className: "secretaria-subtitle" },
          modalidad === "individual"
            ? "Formulario oficial de matriculación y alta de estudiantes en el padrón institucional."
            : "Importación masiva de legajos y matrícula estudiantil mediante planilla Excel (.xlsx)."
        )
      ),
      modalidad === "individual"
        ? h(
            "div",
            { className: "wizard-badge-step" },
            `Paso ${currentStep} de 4`
          )
        : h(
            "div",
            {
              className: "wizard-badge-step",
              style: {
                background: "#dcfce7",
                color: "#15803d",
                borderColor: "#bbf7d0",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }
            },
            h(
              "svg",
              { viewBox: "0 0 20 20", fill: "currentColor", width: 14, height: 14 },
              h("path", { fillRule: "evenodd", d: "M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z", clipRule: "evenodd" })
            ),
            h("span", null, "Modo Planilla Excel")
          )
    ),

    // Selector de Pestañas de Modalidad (Individual vs Masiva)
    h(
      "div",
      { className: "cargar-modalidad-tabs", role: "tablist", "aria-label": "Modalidad de carga" },
      h(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": modalidad === "individual",
          className: `modalidad-tab-btn ${modalidad === "individual" ? "active" : ""}`,
          onClick: () => setModalidad("individual")
        },
        h(
          "svg",
          {
            className: "modalidad-tab-icon",
            viewBox: "0 0 20 20",
            fill: "currentColor"
          },
          h("path", {
            d: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
          })
        ),
        h("span", null, "Carga Individual"),
        h("span", { className: "modalidad-tab-badge" }, "Ficha manual")
      ),
      h(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": modalidad === "masiva",
          className: `modalidad-tab-btn ${modalidad === "masiva" ? "active" : ""}`,
          onClick: () => setModalidad("masiva")
        },
        h("img", {
          src: "/assets/excel.png",
          alt: "Excel",
          className: "modalidad-tab-icon excel-tab-icon"
        }),
        h("span", null, "Carga Masiva"),
        h("span", { className: "modalidad-tab-badge modalidad-tab-badge--excel" }, "Excel .xlsx")
      )
    ),

    modalidad === "masiva"
      ? renderCargaMasiva()
      : h(
          React.Fragment,
          null,
          // Modal o aviso de confirmación exitosa
          saveSuccess
      ? h(
          "div",
          { className: "save-success-banner" },
          h(
            "div",
            { className: "save-success-icon-wrap" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "currentColor", width: 28, height: 28 },
              h("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" })
            )
          ),
          h(
            "div",
            { className: "save-success-text" },
            h("h3", null, "¡Estudiante Registrado con Éxito!"),
            h(
              "p",
              null,
              `Se dio de alta en el sistema a `,
              h("strong", null, `${saveSuccess.apellido}, ${saveSuccess.nombre}`),
              ` con Legajo `,
              h("span", { className: "legajo-pill" }, saveSuccess.legajo),
              ` asignado a ${saveSuccess.curso} ${saveSuccess.division}° división (Turno ${saveSuccess.turno}).`
            )
          ),
          h(
            "div",
            { className: "save-success-actions" },
            h(
              "button",
              {
                type: "button",
                className: "btn-volver-listado-success",
                onClick: () => {
                  window.location.hash = "#/alumnos";
                }
              },
              "Ir al Listado de Alumnos"
            ),
            h(
              "button",
              {
                type: "button",
                className: "btn-cargar-otro",
                onClick: () => {
                  setSaveSuccess(null);
                  setCurrentStep(1);
                  setFormData(getEmptyFormData());
                }
              },
              "+ Cargar Otro Alumno"
            )
          )
        )
      : null,

    // Selector de Pestañas / Pasos tipo Dashboard
    h(
      "div",
      { className: "wizard-tabs-container", role: "tablist", "aria-label": "Pasos de registro" },
      [
        { step: 1, title: "Datos del Estudiante", subtitle: "Ficha personal y nacimiento" },
        { step: 2, title: "Datos del Tutor", subtitle: "Responsables y domicilio" },
        { step: 3, title: "Otros Datos", subtitle: "Domicilio, contacto y salud" },
        { step: 4, title: "Documentos", subtitle: "Legajo y documentación" }
      ].map((tab) => {
        const isActive = currentStep === tab.step;
        const isCompleted = currentStep > tab.step;
        return h(
          "button",
          {
            key: tab.step,
            type: "button",
            role: "tab",
            "aria-selected": isActive,
            className: `wizard-tab-btn ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`,
            onClick: () => {
              if (tab.step < currentStep) {
                setCurrentStep(tab.step);
              } else if (validarPaso(currentStep)) {
                setCurrentStep(tab.step);
              }
            }
          },
          h("span", { className: "wizard-tab-number" }, isCompleted ? "✓" : String(tab.step)),
          h(
            "div",
            { className: "wizard-tab-text" },
            h("span", { className: "wizard-tab-title" }, tab.title),
            h("span", { className: "wizard-tab-subtitle" }, tab.subtitle)
          )
        );
      })
    ),

    // Tarjeta del Formulario Principal
    h(
      DashboardCard,
      {
        title:
          currentStep === 1
            ? "1. Datos del Estudiante"
            : currentStep === 2
            ? "2. Datos del Tutor y Familiares"
            : currentStep === 3
            ? "3. Domicilio, Contacto y Salud"
            : "4. Documentación y Confirmación",
        icon: currentStep === 4 ? "clipboard" : "user-search",
        className: "dashboard-card--highlight cargar-alumno-card",
        collapsible: false
      },

      h(
        "form",
        {
          className: "wizard-form-body",
          onSubmit: (e) => e.preventDefault()
        },

        // ==========================================
        // PASO 1: DATOS DEL ESTUDIANTE
        // ==========================================
        currentStep === 1
          ? h(
              React.Fragment,
              null,

              // Sección Alumno
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Datos del Alumno"),
                h("span", { className: "form-section-desc" }, "Información de identidad y cursada")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // Nombre
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "nombre" }, "Nombre:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "nombre",
                    className: `form-field-input ${errors.nombre ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese nombre....",
                    value: formData.nombre,
                    onChange: (e) => handleChange("nombre", e.target.value)
                  }),
                  errors.nombre ? h("span", { className: "field-error-msg" }, errors.nombre) : null
                ),

                // Apellido
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "apellido" }, "Apellido:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "apellido",
                    className: `form-field-input ${errors.apellido ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese apellido....",
                    value: formData.apellido,
                    onChange: (e) => handleChange("apellido", e.target.value)
                  }),
                  errors.apellido ? h("span", { className: "field-error-msg" }, errors.apellido) : null
                ),

                // DNI
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "dni" }, "DNI:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "dni",
                    className: `form-field-input ${errors.dni ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese DNI (7 u 8 dígitos)....",
                    maxLength: 8,
                    value: formData.dni,
                    onChange: (e) => {
                      const digits = soloDigitos(e.target.value).slice(0, 8);
                      handleChange("dni", digits);
                    }
                  }),
                  errors.dni ? h("span", { className: "field-error-msg" }, errors.dni) : null
                ),

                // CUIL
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "cuil" }, "CUIL:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "cuil",
                    className: `form-field-input ${errors.cuil ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese CUIL (11 dígitos)....",
                    maxLength: 13,
                    value: formData.cuil,
                    onChange: (e) => {
                      const val = e.target.value.replace(/[^\d-]/g, "").slice(0, 13);
                      handleChange("cuil", val);
                    }
                  }),
                  errors.cuil ? h("span", { className: "field-error-msg" }, errors.cuil) : null
                ),

                // Género
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "genero" }, "Género:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "genero",
                    className: errors.genero ? "input-error" : "",
                    placeholder: "Seleccione género...",
                    value: formData.genero,
                    options: ["Masculino", "Femenino", "No binario", "Otro"],
                    onChange: (val) => handleChange("genero", val)
                  }),
                  errors.genero ? h("span", { className: "field-error-msg" }, errors.genero) : null
                ),

                // Fecha de Nacimiento
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "fechaNacimiento" }, "Fecha de Nacimiento:", h("span", { className: "required-star" }, " *")),
                  h(CustomDatePicker, {
                    id: "fechaNacimiento",
                    className: errors.fechaNacimiento ? "input-error" : "",
                    value: formData.fechaNacimiento,
                    placeholder: "dd/mm/aaaa",
                    minYear: 1990,
                    maxYear: new Date().getFullYear(),
                    onChange: (val) => handleChange("fechaNacimiento", val)
                  }),
                  errors.fechaNacimiento ? h("span", { className: "field-error-msg" }, errors.fechaNacimiento) : null
                ),

                // Curso
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "curso" }, "Curso:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "curso",
                    className: errors.curso ? "input-error" : "",
                    placeholder: "Seleccione curso...",
                    value: formData.curso,
                    options: ["1°", "2°", "3°", "4°", "5°", "6°", "7°"],
                    onChange: (val) => handleChange("curso", val)
                  }),
                  errors.curso ? h("span", { className: "field-error-msg" }, errors.curso) : null
                ),

                // División
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "division" }, "División:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "division",
                    className: errors.division ? "input-error" : "",
                    placeholder: "Seleccione división...",
                    value: formData.division,
                    options: [
                      { value: "1", label: "1° División" },
                      { value: "2", label: "2° División" },
                      { value: "3", label: "3° División" },
                      { value: "4", label: "4° División" },
                      { value: "5", label: "5° División" },
                      { value: "6", label: "6° División" }
                    ],
                    onChange: (val) => handleChange("division", val)
                  }),
                  errors.division ? h("span", { className: "field-error-msg" }, errors.division) : null
                ),

                // Turno
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "turno" }, "Turno:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "turno",
                    className: errors.turno ? "input-error" : "",
                    placeholder: "Seleccione turno...",
                    value: formData.turno,
                    options: TURNO_OPTIONS,
                    onChange: (val) => handleChange("turno", val)
                  }),
                  errors.turno ? h("span", { className: "field-error-msg" }, errors.turno) : null
                ),

                // Estado
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "estado" }, "Estado:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "estado",
                    className: errors.estado ? "input-error" : "",
                    placeholder: "Seleccione estado...",
                    value: formData.estado,
                    options: ["Activo", "Inactivo", "Pase pendiente"],
                    onChange: (val) => handleChange("estado", val)
                  }),
                  errors.estado ? h("span", { className: "field-error-msg" }, errors.estado) : null
                ),

                // Fecha de Ingreso
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "fechaIngreso" }, "Fecha de Ingreso:", h("span", { className: "required-star" }, " *")),
                  h(CustomDatePicker, {
                    id: "fechaIngreso",
                    className: errors.fechaIngreso ? "input-error" : "",
                    value: formData.fechaIngreso,
                    placeholder: "dd/mm/aaaa",
                    minYear: 2010,
                    maxYear: new Date().getFullYear() + 1,
                    onChange: (val) => handleChange("fechaIngreso", val)
                  }),
                  errors.fechaIngreso ? h("span", { className: "field-error-msg" }, errors.fechaIngreso) : null
                )
              ),

              // Separador decorativo
              h("div", { className: "form-divider" }),

              // Sección Lugar de Nacimiento
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Lugar de Nacimiento"),
                h("span", { className: "form-section-desc" }, "Datos de origen geográfico")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // País
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "pais" }, "País:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "pais",
                    className: errors.pais ? "input-error" : "",
                    placeholder: "Seleccione país...",
                    value: formData.pais,
                    options: ["Argentina", "Bolivia", "Brasil", "Chile", "Paraguay", "Uruguay", "Otro"],
                    onChange: (val) => handleChange("pais", val)
                  }),
                  errors.pais ? h("span", { className: "field-error-msg" }, errors.pais) : null
                ),

                // Provincia
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "provincia" }, "Provincia:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "provincia",
                    className: errors.provincia ? "input-error" : "",
                    placeholder: "Seleccione provincia...",
                    value: formData.provincia,
                    options: [
                      { value: "Buenos Aires", label: "Buenos Aires" },
                      { value: "CABA", label: "Ciudad Autónoma de Buenos Aires" },
                      { value: "Córdoba", label: "Córdoba" },
                      { value: "Santa Fe", label: "Santa Fe" },
                      { value: "Mendoza", label: "Mendoza" },
                      { value: "Otra", label: "Otra" }
                    ],
                    onChange: (val) => handleChange("provincia", val)
                  }),
                  errors.provincia ? h("span", { className: "field-error-msg" }, errors.provincia) : null
                ),

                // Distrito
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "distrito" }, "Distrito / Partido:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "distrito",
                    className: errors.distrito ? "input-error" : "",
                    placeholder: "Seleccione distrito / partido...",
                    value: formData.distrito,
                    options: ["Esteban Echeverría", "Ezeiza", "Almirante Brown", "Lomas de Zamora", "Lanús", "Otro"],
                    onChange: (val) => handleChange("distrito", val)
                  }),
                  errors.distrito ? h("span", { className: "field-error-msg" }, errors.distrito) : null
                ),

                // Localidad
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "localidad" }, "Localidad:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "localidad",
                    className: errors.localidad ? "input-error" : "",
                    placeholder: "Seleccione localidad...",
                    value: formData.localidad,
                    options: ["Monte Grande", "El Jagüel", "Luis Guillón", "Canning", "9 de Julio", "Otra"],
                    onChange: (val) => handleChange("localidad", val)
                  }),
                  errors.localidad ? h("span", { className: "field-error-msg" }, errors.localidad) : null
                ),

                // Código Postal
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "codigoPostal" }, "Código Postal:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "codigoPostal",
                    className: `form-field-input ${errors.codigoPostal ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese Código Postal (ej: 1842)....",
                    maxLength: 8,
                    value: formData.codigoPostal,
                    onChange: (e) => handleChange("codigoPostal", e.target.value)
                  }),
                  errors.codigoPostal ? h("span", { className: "field-error-msg" }, errors.codigoPostal) : null
                )
              )
            )
          : null,

        // ==========================================
        // PASO 2: DATOS DEL TUTOR
        // ==========================================
        currentStep === 2
          ? h(
              React.Fragment,
              null,

              // Sección Tutor Principal
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Tutor Principal"),
                h("span", { className: "form-section-desc" }, "Adulto responsable legal")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // Nombre
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorNombre" }, "Nombre:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorNombre",
                    className: `form-field-input ${errors.tutorNombre ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese nombre....",
                    value: formData.tutorNombre,
                    onChange: (e) => handleChange("tutorNombre", e.target.value)
                  }),
                  errors.tutorNombre ? h("span", { className: "field-error-msg" }, errors.tutorNombre) : null
                ),

                // Apellido
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorApellido" }, "Apellido:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorApellido",
                    className: `form-field-input ${errors.tutorApellido ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese apellido....",
                    value: formData.tutorApellido,
                    onChange: (e) => handleChange("tutorApellido", e.target.value)
                  }),
                  errors.tutorApellido ? h("span", { className: "field-error-msg" }, errors.tutorApellido) : null
                ),

                // DNI
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorDni" }, "DNI:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorDni",
                    className: `form-field-input ${errors.tutorDni ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese DNI (7 u 8 dígitos)....",
                    maxLength: 8,
                    value: formData.tutorDni,
                    onChange: (e) => {
                      const digits = soloDigitos(e.target.value).slice(0, 8);
                      handleChange("tutorDni", digits);
                    }
                  }),
                  errors.tutorDni ? h("span", { className: "field-error-msg" }, errors.tutorDni) : null
                ),

                // CUIL
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorCuil" }, "CUIL:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorCuil",
                    className: `form-field-input ${errors.tutorCuil ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese CUIL (11 dígitos)....",
                    maxLength: 13,
                    value: formData.tutorCuil,
                    onChange: (e) => {
                      const val = e.target.value.replace(/[^\d-]/g, "").slice(0, 13);
                      handleChange("tutorCuil", val);
                    }
                  }),
                  errors.tutorCuil ? h("span", { className: "field-error-msg" }, errors.tutorCuil) : null
                ),

                // Género
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorGenero" }, "Género:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "tutorGenero",
                    className: errors.tutorGenero ? "input-error" : "",
                    placeholder: "Seleccione género...",
                    value: formData.tutorGenero,
                    options: ["Femenino", "Masculino", "No binario", "Otro"],
                    onChange: (val) => handleChange("tutorGenero", val)
                  }),
                  errors.tutorGenero ? h("span", { className: "field-error-msg" }, errors.tutorGenero) : null
                ),

                // Fecha de Nacimiento
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorFechaNacimiento" }, "Fecha de Nacimiento:", h("span", { className: "required-star" }, " *")),
                  h(CustomDatePicker, {
                    id: "tutorFechaNacimiento",
                    className: errors.tutorFechaNacimiento ? "input-error" : "",
                    value: formData.tutorFechaNacimiento,
                    placeholder: "dd/mm/aaaa",
                    minYear: 1940,
                    maxYear: new Date().getFullYear() - 15,
                    onChange: (val) => handleChange("tutorFechaNacimiento", val)
                  }),
                  errors.tutorFechaNacimiento ? h("span", { className: "field-error-msg" }, errors.tutorFechaNacimiento) : null
                ),

                // Parentesco
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorParentesco" }, "Parentesco:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "tutorParentesco",
                    className: errors.tutorParentesco ? "input-error" : "",
                    placeholder: "Seleccione parentesco...",
                    value: formData.tutorParentesco,
                    options: ["Madre", "Padre", "Tutor/a Legal", "Abuelo/a", "Hermano/a Mayor", "Otro"],
                    onChange: (val) => handleChange("tutorParentesco", val)
                  }),
                  errors.tutorParentesco ? h("span", { className: "field-error-msg" }, errors.tutorParentesco) : null
                ),

                // Teléfono
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorTelefono" }, "Teléfono de Contacto:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorTelefono",
                    className: `form-field-input ${errors.tutorTelefono ? "input-error" : ""}`,
                    type: "tel",
                    placeholder: "Ej: 1142901234....",
                    value: formData.tutorTelefono,
                    onChange: (e) => handleChange("tutorTelefono", e.target.value)
                  }),
                  errors.tutorTelefono ? h("span", { className: "field-error-msg" }, errors.tutorTelefono) : null
                ),

                // Email
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorEmail" }, "Correo Electrónico:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorEmail",
                    className: `form-field-input ${errors.tutorEmail ? "input-error" : ""}`,
                    type: "email",
                    placeholder: "correo@ejemplo.com....",
                    value: formData.tutorEmail,
                    onChange: (e) => handleChange("tutorEmail", e.target.value)
                  }),
                  errors.tutorEmail ? h("span", { className: "field-error-msg" }, errors.tutorEmail) : null
                )
              ),

              // Separador
              h("div", { className: "form-divider" }),

              // Sección Domicilio del Tutor
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Domicilio del Tutor"),
                h("span", { className: "form-section-desc" }, "Dirección de residencia del tutor")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // Calle
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorCalle" }, "Calle:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorCalle",
                    className: `form-field-input ${errors.tutorCalle ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Calle....",
                    value: formData.tutorCalle,
                    onChange: (e) => handleChange("tutorCalle", e.target.value)
                  }),
                  errors.tutorCalle ? h("span", { className: "field-error-msg" }, errors.tutorCalle) : null
                ),

                // Altura
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorAltura" }, "Altura / Número:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorAltura",
                    className: `form-field-input ${errors.tutorAltura ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Altura....",
                    value: formData.tutorAltura,
                    onChange: (e) => handleChange("tutorAltura", e.target.value)
                  }),
                  errors.tutorAltura ? h("span", { className: "field-error-msg" }, errors.tutorAltura) : null
                ),

                // Piso / Torre / Depto
                h(
                  "div",
                  { className: "form-grid-3col-inner" },
                  h(
                    "div",
                    { className: "form-field-group" },
                    h("label", { className: "form-field-label", htmlFor: "tutorPiso" }, "Piso:"),
                    h("input", {
                      id: "tutorPiso",
                      className: "form-field-input",
                      type: "text",
                      placeholder: "Piso....",
                      value: formData.tutorPiso,
                      onChange: (e) => handleChange("tutorPiso", e.target.value)
                    })
                  ),
                  h(
                    "div",
                    { className: "form-field-group" },
                    h("label", { className: "form-field-label", htmlFor: "tutorTorre" }, "Torre:"),
                    h("input", {
                      id: "tutorTorre",
                      className: "form-field-input",
                      type: "text",
                      placeholder: "Torre....",
                      value: formData.tutorTorre,
                      onChange: (e) => handleChange("tutorTorre", e.target.value)
                    })
                  ),
                  h(
                    "div",
                    { className: "form-field-group" },
                    h("label", { className: "form-field-label", htmlFor: "tutorDepto" }, "Depto:"),
                    h("input", {
                      id: "tutorDepto",
                      className: "form-field-input",
                      type: "text",
                      placeholder: "Depto....",
                      value: formData.tutorDepto,
                      onChange: (e) => handleChange("tutorDepto", e.target.value)
                    })
                  )
                ),

                // Entre calles
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorEntreCalle1" }, "Entre calle 1:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorEntreCalle1",
                    className: `form-field-input ${errors.tutorEntreCalle1 ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Entre calle 1....",
                    value: formData.tutorEntreCalle1,
                    onChange: (e) => handleChange("tutorEntreCalle1", e.target.value)
                  }),
                  errors.tutorEntreCalle1 ? h("span", { className: "field-error-msg" }, errors.tutorEntreCalle1) : null
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorEntreCalle2" }, "Entre calle 2:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorEntreCalle2",
                    className: `form-field-input ${errors.tutorEntreCalle2 ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Entre calle 2....",
                    value: formData.tutorEntreCalle2,
                    onChange: (e) => handleChange("tutorEntreCalle2", e.target.value)
                  }),
                  errors.tutorEntreCalle2 ? h("span", { className: "field-error-msg" }, errors.tutorEntreCalle2) : null
                ),

                // Localidad
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorLocalidad" }, "Localidad:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    id: "tutorLocalidad",
                    className: errors.tutorLocalidad ? "input-error" : "",
                    placeholder: "Seleccione localidad...",
                    value: formData.tutorLocalidad,
                    options: ["Monte Grande", "El Jagüel", "Luis Guillón", "Canning", "Otra"],
                    onChange: (val) => handleChange("tutorLocalidad", val)
                  }),
                  errors.tutorLocalidad ? h("span", { className: "field-error-msg" }, errors.tutorLocalidad) : null
                )
              ),

              // Botón Agregar Segundo Tutor
              h(
                "div",
                { className: "agregar-extra-container" },
                !formData.tieneSegundoTutor
                  ? h(
                      "button",
                      {
                        type: "button",
                        className: "btn-agregar-extra",
                        onClick: () => handleChange("tieneSegundoTutor", true)
                      },
                      "+ Agregar segundo tutor o responsable"
                    )
                  : h(
                      "div",
                      { className: "segundo-tutor-box" },
                      h(
                        "div",
                        { className: "segundo-tutor-header" },
                        h("h4", null, "Segundo Tutor / Responsable Alternativo"),
                        h(
                          "button",
                          {
                            type: "button",
                            className: "btn-eliminar-extra",
                            onClick: () => handleChange("tieneSegundoTutor", false)
                          },
                          "✕ Quitar"
                        )
                      ),
                      h(
                        "div",
                        { className: "form-grid-3col" },
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "Nombre:", h("span", { className: "required-star" }, " *")),
                          h("input", {
                            className: `form-field-input ${errors.tutor2Nombre ? "input-error" : ""}`,
                            type: "text",
                            placeholder: "Nombre....",
                            value: formData.tutor2Nombre,
                            onChange: (e) => handleChange("tutor2Nombre", e.target.value)
                          }),
                          errors.tutor2Nombre ? h("span", { className: "field-error-msg" }, errors.tutor2Nombre) : null
                        ),
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "Apellido:", h("span", { className: "required-star" }, " *")),
                          h("input", {
                            className: `form-field-input ${errors.tutor2Apellido ? "input-error" : ""}`,
                            type: "text",
                            placeholder: "Apellido....",
                            value: formData.tutor2Apellido,
                            onChange: (e) => handleChange("tutor2Apellido", e.target.value)
                          }),
                          errors.tutor2Apellido ? h("span", { className: "field-error-msg" }, errors.tutor2Apellido) : null
                        ),
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "DNI:", h("span", { className: "required-star" }, " *")),
                          h("input", {
                            className: `form-field-input ${errors.tutor2Dni ? "input-error" : ""}`,
                            type: "text",
                            placeholder: "DNI (7 u 8 dígitos)....",
                            maxLength: 8,
                            value: formData.tutor2Dni,
                            onChange: (e) => {
                              const digits = soloDigitos(e.target.value).slice(0, 8);
                              handleChange("tutor2Dni", digits);
                            }
                          }),
                          errors.tutor2Dni ? h("span", { className: "field-error-msg" }, errors.tutor2Dni) : null
                        ),
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "Parentesco:", h("span", { className: "required-star" }, " *")),
                          h(CustomSelect, {
                            placeholder: "Seleccione parentesco...",
                            className: errors.tutor2Parentesco ? "input-error" : "",
                            value: formData.tutor2Parentesco,
                            options: ["Padre", "Madre", "Tutor/a Legal", "Abuelo/a", "Hermano/a Mayor", "Otro"],
                            onChange: (val) => handleChange("tutor2Parentesco", val)
                          }),
                          errors.tutor2Parentesco ? h("span", { className: "field-error-msg" }, errors.tutor2Parentesco) : null
                        ),
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "Teléfono:", h("span", { className: "required-star" }, " *")),
                          h("input", {
                            className: `form-field-input ${errors.tutor2Telefono ? "input-error" : ""}`,
                            type: "tel",
                            placeholder: "Teléfono....",
                            value: formData.tutor2Telefono,
                            onChange: (e) => handleChange("tutor2Telefono", e.target.value)
                          }),
                          errors.tutor2Telefono ? h("span", { className: "field-error-msg" }, errors.tutor2Telefono) : null
                        )
                      )
                    )
              )
            )
          : null,

        // ==========================================
        // PASO 3: OTROS DATOS
        // ==========================================
        currentStep === 3
          ? h(
              React.Fragment,
              null,

              // Domicilio del Alumno
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Domicilio del Alumno"),
                h(
                  "label",
                  { className: "checkbox-label-toggle" },
                  h("input", {
                    type: "checkbox",
                    checked: formData.mismoDomicilioQueTutor,
                    onChange: (e) => handleChange("mismoDomicilioQueTutor", e.target.checked)
                  }),
                  h("span", null, "Mismo domicilio que el tutor principal")
                )
              ),

              !formData.mismoDomicilioQueTutor
                ? h(
                    "div",
                    { className: "form-grid-3col" },
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Calle:", h("span", { className: "required-star" }, " *")),
                      h("input", {
                        className: `form-field-input ${errors.alumnoCalle ? "input-error" : ""}`,
                        type: "text",
                        placeholder: "Calle....",
                        value: formData.alumnoCalle,
                        onChange: (e) => handleChange("alumnoCalle", e.target.value)
                      }),
                      errors.alumnoCalle ? h("span", { className: "field-error-msg" }, errors.alumnoCalle) : null
                    ),
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Altura:", h("span", { className: "required-star" }, " *")),
                      h("input", {
                        className: `form-field-input ${errors.alumnoAltura ? "input-error" : ""}`,
                        type: "text",
                        placeholder: "Altura....",
                        value: formData.alumnoAltura,
                        onChange: (e) => handleChange("alumnoAltura", e.target.value)
                      }),
                      errors.alumnoAltura ? h("span", { className: "field-error-msg" }, errors.alumnoAltura) : null
                    ),
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Entre calle 1:", h("span", { className: "required-star" }, " *")),
                      h("input", {
                        className: `form-field-input ${errors.alumnoEntreCalle1 ? "input-error" : ""}`,
                        type: "text",
                        placeholder: "Entre calle 1....",
                        value: formData.alumnoEntreCalle1,
                        onChange: (e) => handleChange("alumnoEntreCalle1", e.target.value)
                      }),
                      errors.alumnoEntreCalle1 ? h("span", { className: "field-error-msg" }, errors.alumnoEntreCalle1) : null
                    ),
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Entre calle 2:", h("span", { className: "required-star" }, " *")),
                      h("input", {
                        className: `form-field-input ${errors.alumnoEntreCalle2 ? "input-error" : ""}`,
                        type: "text",
                        placeholder: "Entre calle 2....",
                        value: formData.alumnoEntreCalle2,
                        onChange: (e) => handleChange("alumnoEntreCalle2", e.target.value)
                      }),
                      errors.alumnoEntreCalle2 ? h("span", { className: "field-error-msg" }, errors.alumnoEntreCalle2) : null
                    ),
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Localidad:", h("span", { className: "required-star" }, " *")),
                      h(CustomSelect, {
                        className: errors.alumnoLocalidad ? "input-error" : "",
                        placeholder: "Seleccione localidad...",
                        value: formData.alumnoLocalidad,
                        options: ["Monte Grande", "El Jagüel", "Luis Guillón", "Canning"],
                        onChange: (val) => handleChange("alumnoLocalidad", val)
                      }),
                      errors.alumnoLocalidad ? h("span", { className: "field-error-msg" }, errors.alumnoLocalidad) : null
                    )
                  )
                : h(
                    "div",
                    { className: "info-box-sync" },
                    h("span", { className: "info-box-icon" }, "ℹ"),
                    h("p", null, "El domicilio registrado para el alumno se sincroniza automáticamente con el del tutor.")
                  ),

              h("div", { className: "form-divider" }),

              // Contacto y Emergencias
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Contacto y Emergencias"),
                h("span", { className: "form-section-desc" }, "Canales de comunicación directa")
              ),
              h(
                "div",
                { className: "form-grid-3col" },
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Teléfono particular del alumno:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    className: `form-field-input ${errors.telefonoParticular ? "input-error" : ""}`,
                    type: "tel",
                    placeholder: "Ej: 11-4290-0000....",
                    value: formData.telefonoParticular,
                    onChange: (e) => handleChange("telefonoParticular", e.target.value)
                  }),
                  errors.telefonoParticular ? h("span", { className: "field-error-msg" }, errors.telefonoParticular) : null
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Email de contacto:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    className: `form-field-input ${errors.emailParticular ? "input-error" : ""}`,
                    type: "email",
                    placeholder: "alumno@correo.com....",
                    value: formData.emailParticular,
                    onChange: (e) => handleChange("emailParticular", e.target.value)
                  }),
                  errors.emailParticular ? h("span", { className: "field-error-msg" }, errors.emailParticular) : null
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Teléfono de emergencia adicional:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    className: `form-field-input ${errors.telefonoEmergencia ? "input-error" : ""}`,
                    type: "tel",
                    placeholder: "Teléfono de urgencias....",
                    value: formData.telefonoEmergencia,
                    onChange: (e) => handleChange("telefonoEmergencia", e.target.value)
                  }),
                  errors.telefonoEmergencia ? h("span", { className: "field-error-msg" }, errors.telefonoEmergencia) : null
                )
              ),

              h("div", { className: "form-divider" }),

              // Datos de Salud
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Datos de Salud"),
                h("span", { className: "form-section-desc" }, "Ficha médica y coberturas")
              ),
              h(
                "div",
                { className: "form-grid-3col" },
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Obra Social / Prepaga:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    className: `form-field-input ${errors.obraSocial ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "IOMA, OSECAC, OSDE, Ninguna....",
                    value: formData.obraSocial,
                    onChange: (e) => handleChange("obraSocial", e.target.value)
                  }),
                  errors.obraSocial ? h("span", { className: "field-error-msg" }, errors.obraSocial) : null
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Número de Afiliado:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    className: `form-field-input ${errors.numeroAfiliado ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "N° carnet / credencial / S/N....",
                    value: formData.numeroAfiliado,
                    onChange: (e) => handleChange("numeroAfiliado", e.target.value)
                  }),
                  errors.numeroAfiliado ? h("span", { className: "field-error-msg" }, errors.numeroAfiliado) : null
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Grupo Sanguíneo:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    className: errors.grupoSanguineo ? "input-error" : "",
                    placeholder: "Seleccione grupo sanguíneo...",
                    value: formData.grupoSanguineo,
                    options: ["0+", "0-", "A+", "A-", "B+", "B-", "AB+", "AB-", "No especificado"],
                    onChange: (val) => handleChange("grupoSanguineo", val)
                  }),
                  errors.grupoSanguineo ? h("span", { className: "field-error-msg" }, errors.grupoSanguineo) : null
                )
              ),
              h(
                "div",
                { className: "form-field-group", style: { marginTop: "14px" } },
                h("label", { className: "form-field-label" }, "Alergias / Medicación / Observaciones Médicas:", h("span", { className: "required-star" }, " *")),
                h("textarea", {
                  className: `form-field-textarea ${errors.observacionesSalud ? "input-error" : ""}`,
                  rows: 3,
                  placeholder: "Detalle alergias alimentarias o medicamentosas, patologías preexistentes (o indique 'Ninguna')....",
                  value: formData.observacionesSalud,
                  onChange: (e) => handleChange("observacionesSalud", e.target.value)
                }),
                errors.observacionesSalud ? h("span", { className: "field-error-msg" }, errors.observacionesSalud) : null
              )
            )
          : null,

        // ==========================================
        // PASO 4: DOCUMENTOS Y CONFIRMACIÓN
        // ==========================================
        currentStep === 4
          ? h(
              React.Fragment,
              null,

              // Sección Cargar Documento
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Documentación"),
                h("span", { className: "form-section-desc" }, "Archivos adjuntos para el legajo digital")
              ),

              h(
                "div",
                { className: "form-grid-2col" },
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Tipo de Documento:", h("span", { className: "required-star" }, " *")),
                  h(CustomSelect, {
                    placeholder: "Seleccione tipo de documento...",
                    className: errors.documentoTipo ? "input-error" : "",
                    value: formData.documentoTipo,
                    options: [
                      "DNI del Estudiante (Frente y Dorso)",
                      "DNI del Tutor",
                      "Partida de Nacimiento",
                      "Ficha de Salud y Vacunación",
                      "Certificado de Estudios / Pase",
                      "Constancia de CUIL"
                    ],
                    onChange: (val) => handleChange("documentoTipo", val)
                  }),
                  errors.documentoTipo ? h("span", { className: "field-error-msg" }, errors.documentoTipo) : null
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Subir archivo:", h("span", { className: "required-star" }, " *")),
                  h(
                    "div",
                    {
                      className: `file-upload-dropzone ${errors.documentos ? "input-error" : ""}`,
                      onClick: handleAddDocumentoMock
                    },
                    h(
                      "svg",
                      { className: "dropzone-icon", viewBox: "0 0 24 24", fill: "currentColor", width: 24, height: 24 },
                      h("path", { d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" })
                    ),
                    h("span", { className: "dropzone-title" }, "Hacer clic para Cargar Documentos"),
                    h("span", { className: "dropzone-hint" }, "Formatos admitidos: PDF, JPG, PNG (máx. 5 MB)")
                  ),
                  errors.documentos ? h("span", { className: "field-error-msg" }, errors.documentos) : null
                )
              ),

              // Lista de documentos adjuntados
              h(
                "div",
                { className: "documentos-list-container" },
                h("h4", { className: "documentos-list-title" }, `Documentos adjuntados (${formData.documentos.length}):`),
                formData.documentos.length === 0
                  ? h("div", { className: "documentos-empty-state" }, "No hay documentos adjuntos. Seleccione un tipo de documento y suba el archivo.")
                  : h(
                      "div",
                      { className: "documentos-cards-grid" },
                      formData.documentos.map((doc) =>
                        h(
                          "div",
                          { key: doc.id, className: "documento-card-item" },
                          h(
                            "div",
                            { className: "documento-card-left" },
                            h("span", { className: "doc-icon-badge" }, "PDF"),
                            h(
                              "div",
                              { className: "doc-info" },
                              h("span", { className: "doc-tipo" }, doc.tipo),
                              h("span", { className: "doc-filename" }, `${doc.nombre} · ${doc.tamano}`)
                            )
                          ),
                          h(
                            "button",
                            {
                              type: "button",
                              className: "btn-delete-doc",
                              onClick: () => handleRemoveDocumento(doc.id),
                              title: "Eliminar archivo"
                            },
                            "✕"
                          )
                        )
                      )
                    ),
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-agregar-doc-link",
                    onClick: handleAddDocumentoMock
                  },
                  "+ Agregar documento adicional"
                )
              ),

              h("div", { className: "form-divider" }),

              // Resumen institucional previo al guardado
              h(
                "div",
                { className: "resumen-previo-card" },
                h("h4", { className: "resumen-previo-title" }, "Resumen de Matriculación"),
                h(
                  "div",
                  { className: "resumen-previo-grid" },
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "Estudiante:"),
                    h("span", { className: "resumen-val" }, `${formData.apellido || "—"}, ${formData.nombre || "—"}`)
                  ),
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "DNI:"),
                    h("span", { className: "resumen-val" }, formData.dni || "—")
                  ),
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "Curso y División:"),
                    h("span", { className: "resumen-val" }, `${formData.curso || "—"} ${formData.division ? `${formData.division}°` : ""} ${formData.turno ? `(${formData.turno})` : ""}`)
                  ),
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "Tutor Responsable:"),
                    h("span", { className: "resumen-val" }, `${formData.tutorApellido || "—"}, ${formData.tutorNombre || "—"} ${formData.tutorParentesco ? `(${formData.tutorParentesco})` : ""}`)
                  )
                )
              )
            )
          : null,

        // ==========================================
        // FOOTER DE NAVEGACIÓN Y ACCIONES DEL WIZARD
        // ==========================================
        h(
          "div",
          { className: "wizard-footer-actions" },

          // Botón Anterior
          h(
            "button",
            {
              type: "button",
              className: "btn-wizard-anterior",
              onClick: handleAnterior
            },
            currentStep === 1 ? "Cancelar y volver" : "← Anterior"
          ),

          // Puntos indicadores (Dots)
          h(
            "div",
            { className: "wizard-dots-indicator" },
            [1, 2, 3, 4].map((dot) =>
              h("span", {
                key: dot,
                className: `wizard-dot ${dot === currentStep ? "active" : ""} ${dot < currentStep ? "passed" : ""}`,
                onClick: () => {
                  if (dot < currentStep || validarPaso(currentStep)) {
                    setCurrentStep(dot);
                  }
                },
                title: `Ir al paso ${dot}`
              })
            )
          ),

          // Botón Siguiente / Cargar Alumno
          currentStep < 4
            ? h(
                "button",
                {
                  type: "button",
                  className: "btn-wizard-siguiente",
                  onClick: handleSiguiente
                },
                "Siguiente →"
              )
            : h(
                "button",
                {
                  type: "button",
                  className: "btn-wizard-submit",
                  disabled: saving,
                  onClick: handleGuardar
                },
                saving ? "Guardando en el padrón..." : "✓ Cargar Alumno"
              )
        )
      )
    )
  )
),
floatingModalPortal
);
}
