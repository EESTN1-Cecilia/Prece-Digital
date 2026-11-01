/* Lectura y analisis de las listas de alumnos del ciclo lectivo (planillas Excel de
   preceptoria). Funciones puras: reciben filas ya leidas (arrays) y devuelven
   alumnos importables + casos pendientes de revision. No tocan ninguna base.

   Lo que traen las planillas reales (verificado sobre las 29 listas 2026):
     - UN solo campo "APELLIDO Y NOMBRE" en mayusculas (sin DNI ni separador).
     - El encabezado cambia de fila/columna entre archivos: se detecta por contenido.
     - Debajo de la nomina hay filas de totales (PRESENTES, AUSENTES, VARONES...).
     - Las hojas extra ("grupo 1.2"...) son grupos de taller, no la nomina del curso. */

import { buscarDivision } from "../catalogo.mjs";

export const sinAcentos = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
export const normalizarTexto = (texto) => sinAcentos(texto).replace(/\s+/g, " ").trim().toUpperCase();

const SUFIJOS_ORDINALES = /(\d)\s*(?:ro|do|er|to|mo|vo|ero|ra|ta)\b/g;

/* "1° División 2", "1ro 2", "1.º 2", "1°2°", "1 2" -> { curso: 1, division: "2", etiqueta: "1°2°" } */
export function normalizarCurso(texto) {
  const limpio = sinAcentos(texto)
    .toLowerCase()
    .replace(SUFIJOS_ORDINALES, "$1")
    .replace(/[°º.\-–,_]/g, " ")
    .replace(/\b(?:ano|division|div|seccion|curso)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const coincidencia = /^(\d)\s*(\d{1,2})$/.exec(limpio);
  if (!coincidencia) return null;

  const curso = Number(coincidencia[1]);
  const division = String(Number(coincidencia[2]));
  if (curso < 1 || curso > 7 || division === "0") return null;
  return { curso, division, etiqueta: `${curso}°${division}°` };
}

const ENCABEZADO_NOMBRE = /APELLIDO\s*Y\s*NOMBRE/;
const FILA_DE_TOTALES = /^(TOTAL(ES)?|PRESENTES|AUSENTES|VARONES|MUJERES|VARONESA)\b/;

const texto = (celda) => (celda === null || celda === undefined ? "" : String(celda).trim());

/* Ubica encabezado y columnas por contenido. */
export function detectarEstructura(filas) {
  for (let i = 0; i < Math.min(filas.length, 12); i += 1) {
    const fila = filas[i] ?? [];
    const colNombre = fila.findIndex((celda) => ENCABEZADO_NOMBRE.test(normalizarTexto(celda)));
    if (colNombre < 0) continue;

    const colOrden = fila.findIndex((celda) => /ORDEN/.test(normalizarTexto(celda)));
    const colOrigen = fila.findIndex((celda) => /PROV[IE]/.test(normalizarTexto(celda)));
    const previas = filas
      .slice(0, i)
      .flat()
      .map(texto)
      .filter(Boolean);

    return {
      filaEncabezado: i,
      colNombre,
      colOrden: colOrden >= 0 ? colOrden : colNombre - 1,
      colOrigen: colOrigen >= 0 ? colOrigen : colNombre + 1,
      titulo: previas.find((t) => /\d/.test(t)) ?? previas[0] ?? ""
    };
  }
  return null;
}

/* Las planillas traen la nomina en dos bloques: varones y mujeres, cada uno con
   numeracion propia y cerrado por sus renglones de totales ("Varones Totales",
   "Total Mujeres"...). El renglon que cierra el bloque indica el genero. */
export function extraerAlumnos(filas, estructura) {
  const resultado = [];
  const rechazadas = [];
  let bloque = [];

  for (let i = estructura.filaEncabezado + 1; i < filas.length; i += 1) {
    const fila = filas[i] ?? [];
    const original = texto(fila[estructura.colNombre]).replace(/\s+/g, " ");
    if (!original) continue;

    const normalizado = normalizarTexto(original);
    if (FILA_DE_TOTALES.test(normalizado)) {
      const genero = /VARON/.test(normalizado) ? "masculino" : /MUJER/.test(normalizado) ? "femenino" : null;
      if (genero) {
        bloque.forEach((alumno) => {
          alumno.genero = genero;
        });
        bloque = [];
      }
      continue;
    }

    const orden = Number(fila[estructura.colOrden]);
    const registro = {
      fila: i + 1,
      orden: Number.isFinite(orden) && texto(fila[estructura.colOrden]) !== "" ? orden : null,
      original,
      origen: texto(fila[estructura.colOrigen]) || null,
      genero: null
    };
    if (/\d/.test(original)) {
      rechazadas.push({ ...registro, motivo: "nombre_con_digitos" });
    } else {
      resultado.push(registro);
      bloque.push(registro);
    }
  }
  return { alumnos: resultado, rechazadas };
}

/* La planilla no separa apellido y nombre. Convencion: el apellido va primero.
   1-2 palabras: 1 de apellido; 3: 1 + 2 nombres; 4 o mas: 2 + resto. Es una
   estimacion: queda marcada (`dividido`) y el texto original se conserva. */
export function separarNombre(original) {
  const palabras = String(original).trim().split(/\s+/);
  if (palabras.length === 1) return { apellido: palabras[0], nombre: "", dividido: false };
  const nApellido = palabras.length >= 4 ? 2 : 1;
  return { apellido: palabras.slice(0, nApellido).join(" "), nombre: palabras.slice(nApellido).join(" "), dividido: palabras.length >= 3 };
}

export const claveImportacion = (original) => normalizarTexto(original);

/* lista: { archivo, hoja, etiquetaArchivo, filas } -> resultado del analisis. */
export function analizar(listas) {
  const alumnos = [];
  const pendientes = [];
  const advertencias = [];
  const porCurso = {};
  const vistosPorClave = new Map(); // clave -> [alumno]

  for (const lista of listas) {
    const curso = normalizarCurso(lista.etiquetaArchivo);
    const etiqueta = curso?.etiqueta ?? lista.etiquetaArchivo;
    const resumen = (porCurso[etiqueta] ??= { filas: 0, importables: 0, pendientes: 0, archivo: lista.archivo });
    const pendiente = (motivo, extra) => {
      pendientes.push({ motivo, archivo: lista.archivo, hoja: lista.hoja, curso: etiqueta, ...extra });
      resumen.pendientes += 1;
    };

    if (!curso || !buscarDivision(curso.curso, curso.division)) {
      pendientes.push({ motivo: "curso_no_reconocido", archivo: lista.archivo, hoja: lista.hoja, curso: etiqueta, detalle: "El curso no existe en el catalogo de la escuela" });
      resumen.pendientes += 1;
      continue;
    }

    const estructura = detectarEstructura(lista.filas);
    if (!estructura) {
      pendientes.push({ motivo: "estructura_ambigua", archivo: lista.archivo, hoja: lista.hoja, curso: etiqueta, detalle: "No se encontro el encabezado APELLIDO Y NOMBRE" });
      resumen.pendientes += 1;
      continue;
    }

    const cursoTitulo = normalizarCurso((/(\d)\s*[°º]?\s*(\d)\s*[°º]?/.exec(estructura.titulo) ?? []).slice(1, 3).join(" "));
    if (cursoTitulo && cursoTitulo.etiqueta !== curso.etiqueta) {
      advertencias.push({ archivo: lista.archivo, detalle: `El titulo de la planilla dice ${cursoTitulo.etiqueta} pero el archivo es ${curso.etiqueta}` });
    }

    const { alumnos: filas, rechazadas } = extraerAlumnos(lista.filas, estructura);
    resumen.filas += filas.length + rechazadas.length;
    rechazadas.forEach((r) => pendiente(r.motivo, { fila: r.fila, original: r.original }));

    const clavesDeLaLista = new Set();
    for (const f of filas) {
      const clave = claveImportacion(f.original);
      if (clavesDeLaLista.has(clave)) {
        pendiente("duplicado_en_lista", { fila: f.fila, original: f.original });
        continue;
      }
      clavesDeLaLista.add(clave);

      const alumno = {
        clave,
        original: f.original,
        ...separarNombre(f.original),
        curso: curso.curso,
        division: curso.division,
        etiqueta: curso.etiqueta,
        archivo: lista.archivo,
        hoja: lista.hoja,
        fila: f.fila,
        orden: f.orden,
        origen: f.origen,
        genero: f.genero
      };
      alumnos.push(alumno);
      vistosPorClave.set(clave, [...(vistosPorClave.get(clave) ?? []), alumno]);
    }
  }

  /* Misma persona en dos listas: no se reasigna ni se elige una: queda pendiente. */
  const conflicto = new Set();
  for (const repetidos of vistosPorClave.values()) {
    if (repetidos.length > 1) repetidos.forEach((a) => conflicto.add(a));
  }
  const importables = [];
  for (const a of alumnos) {
    if (conflicto.has(a)) {
      pendientes.push({
        motivo: "conflicto_entre_listas",
        archivo: a.archivo,
        hoja: a.hoja,
        curso: a.etiqueta,
        fila: a.fila,
        original: a.original,
        detalle: `Aparece tambien en: ${vistosPorClave.get(a.clave).filter((x) => x !== a).map((x) => x.etiqueta).join(", ")}`
      });
      porCurso[a.etiqueta].pendientes += 1;
    } else {
      importables.push(a);
      porCurso[a.etiqueta].importables += 1;
    }
  }

  return { alumnos: importables, pendientes, advertencias, porCurso };
}
