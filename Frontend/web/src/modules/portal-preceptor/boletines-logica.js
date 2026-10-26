/* Reglas puras de los boletines del Portal Preceptor (sin React): se prueban
   con node --test (boletines-logica.test.mjs).

   Las notas salen del boletin compartido (backend /api/v1/boletines): el mismo
   que edita Secretaria y que completa cada docente desde su planilla. El plan
   oficial de materias (PLANES_BOLETIN) arma las filas igual que el Boletin
   Digital. Nunca se completa una nota: lo que falta queda vacio. */

export const COLUMNAS_NOTA = ["informe1", "informe2", "promedioAnual", "diciembre", "febrero", "definitiva"];

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Mismo nombre, o uno es la forma corta del otro ("MATEMATICA" y
   "MATEMATICAS"); se exige un largo minimo para no unir materias distintas. */
export function mismaMateria(uno, otro) {
  const a = normalizar(uno);
  const b = normalizar(otro);
  if (!a || !b) return false;
  if (a === b) return true;
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a];
  return corto.length >= 6 && largo.startsWith(corto) && largo.length - corto.length <= 2;
}

/* "Técnico en Informática" -> "informatica"; si no se sabe, programacion (el
   mismo criterio que el Boletin Digital). */
export function claveOrientacion(orientacion) {
  return normalizar(orientacion).includes("INFORMATICA") ? "informatica" : "programacion";
}

/* Secciones del plan, con los mismos titulos que el Boletin Digital. */
export function seccionesDelPlan(planes, anio, orientacion) {
  const plan = planes?.[anio];
  if (!plan) return [];

  const tecnicas = anio <= 3
    ? plan.tcoEspecifica ?? []
    : plan.orientaciones?.[claveOrientacion(orientacion)] ?? plan.orientaciones?.programacion ?? [];

  return [
    { titulo: "FORMACIÓN GENERAL", materias: plan.formacionGeneral ?? [] },
    { titulo: anio <= 3 ? "TCO. ESPECÍFICA / TALLER" : "FORMACIÓN TÉCNICA ESPECÍFICA", materias: tecnicas }
  ].filter((seccion) => seccion.materias.length);
}

/* Notas de una materia del plan: por su nombre exacto (como guarda el Boletin
   Digital) o por un nombre equivalente (como puede guardar una planilla). */
export function notasDeMateria(calificaciones = {}, nombre) {
  if (calificaciones[nombre]) return calificaciones[nombre];
  const clave = Object.keys(calificaciones).find((otra) => mismaMateria(otra, nombre));
  return clave ? calificaciones[clave] : null;
}

function tieneNotas(notas) {
  return Boolean(notas) && COLUMNAS_NOTA.some((campo) => String(notas[campo] ?? "").trim() !== "");
}

export function filasDelBoletin({ planes, anio, orientacion, calificaciones = {} }) {
  return seccionesDelPlan(planes, anio, orientacion).map((seccion) => ({
    titulo: seccion.titulo,
    filas: seccion.materias.map((materia) => {
      const notas = notasDeMateria(calificaciones, materia);
      return {
        materia,
        notas: Object.fromEntries(COLUMNAS_NOTA.map((campo) => [campo, String(notas?.[campo] ?? "").trim()])),
        sinDatos: !tieneNotas(notas)
      };
    })
  }));
}

/* Promedio general anual con el mismo calculo que el Boletin Digital:
   definitiva (o promedio anual) de cada materia con nota numerica. */
export function promedioGeneral(secciones) {
  const notas = secciones
    .flatMap((seccion) => seccion.filas)
    .map((fila) => parseFloat(String(fila.notas.definitiva || fila.notas.promedioAnual).replace(",", ".")))
    .filter((nota) => !Number.isNaN(nota) && nota > 0);
  return notas.length ? (notas.reduce((total, nota) => total + nota, 0) / notas.length).toFixed(2) : "";
}

/* Cuantas materias del plan no tienen ninguna nota cargada. */
export function contarFaltantes(secciones) {
  return secciones.reduce((total, seccion) => total + seccion.filas.filter((fila) => fila.sinDatos).length, 0);
}

/* Agrupa los boletines de a dos por hoja, en el orden recibido (orden de
   lista). Con cantidad impar, la ultima hoja lleva uno solo. */
export function paginarDeADos(lista = []) {
  const hojas = [];
  for (let indice = 0; indice < lista.length; indice += 2) {
    hojas.push(lista.slice(indice, indice + 2));
  }
  return hojas;
}

/* Hoja Oficio horizontal (340 x 216 mm): dos boletines verticales lado a lado
   dentro del area util, con 1 cm de margen en todo el contorno. */
export const PAPEL_BOLETINES = { anchoMm: 340, altoMm: 216, margenMm: 10, separacionMm: 0 };

export function reglaPaginaBoletines(papel = PAPEL_BOLETINES) {
  return `@page { size: ${papel.anchoMm}mm ${papel.altoMm}mm; margin: ${papel.margenMm}mm; }`;
}

/* Area de cada boletin (media hoja util) en mm. */
export function areaDeBoletinMm(papel = PAPEL_BOLETINES) {
  return {
    ancho: (papel.anchoMm - papel.margenMm * 2 - papel.separacionMm) / 2,
    alto: papel.altoMm - papel.margenMm * 2
  };
}

/* Escala para que un boletin de `anchoPx` x `altoPx` entre en su media hoja
   (nunca agranda). */
export function escalaParaBoletin(anchoPx, altoPx, area = areaDeBoletinMm(), pxPorMm = 96 / 25.4) {
  if (!anchoPx || !altoPx) return 1;
  const escala = Math.min(1, (area.ancho * pxPorMm) / anchoPx, (area.alto * pxPorMm) / altoPx);
  return Math.floor(escala * 1000) / 1000;
}
