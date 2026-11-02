import { PLANES_BOLETIN } from "../../../Shared/src/planes-boletin.mjs";
import studentRepository from "../../modules/students/students.repository.mjs";
import academicRepository from "../../modules/academic/academic.repository.mjs";
import academicRecordsRepository from "../../modules/academic-records/academic-records.repository.mjs";
import inasistenciasRepository from "../../modules/inasistencias/inasistencias.repository.mjs";
import tutorsRepository from "../../modules/tutors/tutors.repository.mjs";
import boletinOficialService from "../../modules/boletin-oficial/boletin-oficial.service.mjs";

/* Datos de desarrollo para TODOS los alumnos del seed, asi cada boletin, legajo
   y portal tiene algo que mostrar:

   - Notas del ciclo actual (1° y 2° informe) en todas las materias del plan de
     su año, y de los ciclos anteriores (1° a año actual - 1) con diciembre y
     febrero cuando el informe final no alcanza.
   - Materias previas: los alumnos "en riesgo" adeudan materias del año pasado.
   - Inasistencias del ciclo actual con los tres estados de justificacion.
   - Datos personales que falten (nacimiento, domicilio, telefono, correo,
     genero, nacionalidad) y un tutor responsable a quien no tenga.

   Las notas se cargan por el MISMO servicio que la planilla y el boletin
   oficial, asi se ven iguales en la planilla, el boletin del personal y el
   portal del alumno. Los valores son pseudoaleatorios pero deterministicos (salen
   del id del alumno): al reiniciar la API se generan los mismos datos.

   Solo corre al iniciar el servidor en desarrollo (no en produccion ni en los
   tests). No pisa datos que ya existan. */

const ACTOR = { id: "seed-datos-alumnos", assignments: [{ role: "admin" }] };
const APROBACION = 7;

/* ---------------- Azar deterministico ------------------------------------- */

function semilla(texto) {
  let hash = 2166136261;
  for (const caracter of String(texto)) {
    hash ^= caracter.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/* mulberry32 */
function generador(texto) {
  let estado = semilla(texto);
  const siguiente = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    numero: siguiente,
    entero: (minimo, maximo) => minimo + Math.floor(siguiente() * (maximo - minimo + 1)),
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    probabilidad: (p) => siguiente() < p
  };
}

/* ---------------- Notas ---------------------------------------------------- */

const PERFILES = {
  destacado: { base: 8.6, desvio: 1.4 },
  medio: { base: 7.6, desvio: 1.8 },
  riesgo: { base: 6, desvio: 2.4 }
};

function perfilDe(alumno, azar) {
  if (alumno.condicion === "irregular") return "riesgo";
  const valor = azar.numero();
  if (valor < 0.3) return "destacado";
  if (valor < 0.82) return "medio";
  return "riesgo";
}

/* Nota entera de 1 a 10. Se evita el 6: es el unico valor donde la regla del
   backend (aprobacion desde 6) y la de la escuela (desde 7) difieren. */
function nota(azar, perfil, ajuste = 0) {
  const { base, desvio } = PERFILES[perfil];
  let valor = Math.round(base + ajuste + (azar.numero() * 2 - 1) * desvio);
  valor = Math.min(10, Math.max(2, valor));
  if (valor === 6) valor = azar.probabilidad(0.5) ? 7 : 5;
  return valor;
}

/* En el ciclo basico algunos informes son conceptuales (TEA / TEP / TED). */
function informe(valor, azar, anioEstudio) {
  if (anioEstudio > 3 || !azar.probabilidad(0.15)) return String(valor);
  if (valor >= APROBACION) return "TEA";
  return valor >= 4 ? "TEP" : "TED";
}

function materiasDelPlan(anioEstudio, orientacion) {
  const plan = PLANES_BOLETIN[anioEstudio];
  if (!plan) return [];
  const clave = String(orientacion ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().includes("INFORMATICA") ? "informatica" : "programacion";
  return [...(plan.formacionGeneral ?? []), ...(plan.tcoEspecifica ?? plan.orientaciones?.[clave] ?? [])];
}

const aprobado = (valor) => valor === "TEA" || Number(valor) >= APROBACION;

/* Notas de un ciclo. `cerrado` = ciclo anterior: se completan diciembre y
   febrero para quien no aprobo con el 2° informe. `previas` son las materias
   que el alumno sigue adeudando de ese ciclo. */
function notasDelCiclo({ materias, anioEstudio, perfil, azar, cerrado, maxPrevias }) {
  const notas = {};
  const previas = [];

  for (const materia of materias) {
    const ajuste = (azar.numero() - 0.5) * 1.2; // materias que le cuestan mas o menos
    const fila = {
      informe1: informe(nota(azar, perfil, ajuste), azar, anioEstudio),
      informe2: informe(nota(azar, perfil, ajuste + 0.3), azar, anioEstudio)
    };

    if (cerrado && !aprobado(fila.informe2)) {
      const adeuda = previas.length < maxPrevias && azar.probabilidad(0.6);
      if (adeuda) {
        fila.diciembre = String(azar.entero(2, 5));
        fila.febrero = String(azar.entero(3, 5));
        previas.push(materia);
      } else if (azar.probabilidad(0.6)) {
        fila.diciembre = String(azar.entero(7, 9));
      } else {
        fila.diciembre = String(azar.entero(3, 5));
        fila.febrero = String(azar.entero(7, 8));
      }
    }

    notas[materia] = fila;
  }

  return { notas, previas };
}

/* `inasistenciasActuales`: total de faltas del ciclo actual para el pie del
   boletin oficial. Las previas del año pasado se anotan tambien en la tabla de
   "materias pendientes" del boletin oficial del ciclo actual. */
function cargarNotas(alumno, azar, cicloActual, inasistenciasActuales) {
  const anioEstudio = Number(alumno.curso);
  if (!Number.isInteger(anioEstudio) || anioEstudio < 1 || anioEstudio > 7) return { notas: 0, previas: 0 };

  const perfil = perfilDe(alumno, azar);
  let notas = 0;
  let previas = 0;
  let pendientesDelAnioPasado = [];

  for (let anio = 1; anio <= anioEstudio; anio += 1) {
    const ciclo = cicloActual - (anioEstudio - anio);
    const cerrado = anio < anioEstudio;
    /* Solo adeuda materias del año pasado (las mas viejas ya las rindio). */
    const maxPrevias = perfil === "riesgo" && anio === anioEstudio - 1 ? 2 : 0;
    const resultado = notasDelCiclo({ materias: materiasDelPlan(anio, alumno.orientacion), anioEstudio: anio, perfil, azar, cerrado, maxPrevias });

    const cuerpo = {
      anio: ciclo,
      notas: resultado.notas,
      inasistencias: String(cerrado ? azar.entero(2, 16) : inasistenciasActuales),
      libroFolio: { libro: String(ciclo), folio: String(Number(String(alumno.id).replace(/\D/g, "")) || 1) }
    };
    if (!cerrado && pendientesDelAnioPasado.length > 0) {
      cuerpo.pendientes = pendientesDelAnioPasado.map((materia) => ({ materia, anio: `${anioEstudio - 1}°`, abrilC: String(azar.entero(2, 5)), abrilLF: "" }));
    }

    const { cambios } = boletinOficialService.guardar(alumno.id, cuerpo, ACTOR);
    notas += cambios.length;
    pendientesDelAnioPasado = resultado.previas;

    resultado.previas.forEach((materia, indice) => {
      academicRecordsRepository.createSituacion({
        id: `${alumno.id}-previa-${ciclo}-${indice + 1}`,
        escuelaId: alumno.escuelaId ?? "esc-1",
        alumnoId: alumno.id,
        materiaId: academicRepository.ensureSubjectRef(materia).id,
        anio: ciclo,
        cuatrimestre: null,
        tipo: "pendiente",
        estado: indice === 0 ? "regular" : "desaprobada",
        observaciones: indice === 0 ? "Adeuda: rinde en mesa de examen" : null,
        creadoPor: ACTOR.id
      });
      previas += 1;
    });
  }

  return { notas, previas };
}

/* ---------------- Inasistencias ------------------------------------------- */

const MOTIVOS = ["salud", "salud", "personal", "personal", "otra", "institucional"];

function fechaHabil(azar, ciclo, hasta) {
  const inicio = Date.UTC(ciclo, 2, 2); // 2 de marzo
  const fin = Math.min(Date.parse(hasta), Date.UTC(ciclo, 11, 10));
  for (let intento = 0; intento < 20; intento += 1) {
    const fecha = new Date(inicio + Math.floor(azar.numero() * Math.max(1, fin - inicio)));
    const dia = fecha.getUTCDay();
    const mes = fecha.getUTCMonth();
    if (dia !== 0 && dia !== 6 && mes !== 6) return fecha.toISOString().slice(0, 10); // sin fines de semana ni receso de julio
  }
  return null;
}

function cargarInasistencias(alumno, azar, ciclo, hoy) {
  const cantidad = alumno.condicion === "irregular" ? azar.entero(6, 12) : azar.entero(0, 6);
  let cargadas = 0;

  for (let indice = 0; indice < cantidad; indice += 1) {
    const fecha = fechaHabil(azar, ciclo, hoy);
    if (!fecha || inasistenciasRepository.findDuplicada(alumno.id, fecha)) continue;

    const motivo = azar.elegir(MOTIVOS);
    const sorteo = azar.numero();
    const estadoJustificacion = motivo === "institucional" || sorteo < 0.45 ? "justificada" : sorteo < 0.8 ? "no_justificada" : "pendiente";
    const justificacion = estadoJustificacion === "justificada"
      ? {
        motivoJustificacion: motivo === "salud" ? "Certificado medico" : motivo === "institucional" ? "Actividad institucional" : "Nota del adulto responsable",
        descripcion: null,
        documento: null,
        justificadaPor: ACTOR.id,
        fechaJustificacion: `${fecha}T15:00:00.000Z`
      }
      : null;

    inasistenciasRepository.create({
      id: `${alumno.id}-ina-${fecha}`,
      escuelaId: alumno.escuelaId ?? "esc-1",
      alumnoId: alumno.id,
      alumno: { id: alumno.id, apellido: alumno.apellido, nombre: alumno.nombre, dni: alumno.dni },
      curso: alumno.curso,
      division: alumno.division,
      turno: alumno.turno ?? null,
      orientacion: alumno.orientacion ?? null,
      fecha,
      anio: ciclo,
      cuatrimestre: Number(fecha.slice(5, 7)) <= 7 ? 1 : 2,
      motivo,
      estadoJustificacion,
      justificacion,
      observaciones: estadoJustificacion === "pendiente" ? "A la espera de la justificacion" : null,
      createdBy: ACTOR.id,
      createdAt: `${fecha}T12:00:00.000Z`
    });
    cargadas += 1;
  }

  return cargadas;
}

/* ---------------- Datos personales y tutor -------------------------------- */

const CALLES = ["Av. Fernández de Enciso", "Boulevard Buenos Aires", "Alem", "Dorrego", "Rotta", "Mitre", "Sarmiento", "Las Heras", "Vicente López", "Santa Rosa", "Alsina", "Pringles"];
const FEMENINOS = new Set(["ana", "carla", "elena", "florencia", "maria", "sofia", "camila", "abigail", "luz", "iara", "julieta", "alma", "mora", "renata", "micaela", "zoe", "brisa"]);
const MASCULINOS = new Set(["diego", "juan", "tomas", "dante", "benicio", "lautaro", "mateo", "franco", "ciro", "bruno", "leo", "thiago", "simon"]);
const NOMBRES_MADRE = ["Laura", "Marcela", "Verónica", "Carolina", "Natalia", "Gabriela", "Andrea", "Paula"];
const NOMBRES_PADRE = ["Martín", "Pablo", "Sergio", "Gustavo", "Diego", "Hernán", "Javier", "Marcelo"];

const ascii = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "");
const telefono = (azar) => `11-${azar.entero(4000, 6999)}-${String(azar.entero(0, 9999)).padStart(4, "0")}`;

function completarDatosPersonales(alumno, azar, ciclo) {
  const cambios = {};
  const primerNombre = ascii(String(alumno.nombre).split(" ")[0]);
  const anioEstudio = Number(alumno.curso) || 1;

  if (!alumno.fechaNacimiento) {
    const nacimiento = ciclo - 12 - anioEstudio;
    cambios.fechaNacimiento = `${nacimiento}-${String(azar.entero(1, 12)).padStart(2, "0")}-${String(azar.entero(1, 28)).padStart(2, "0")}`;
  }
  if (!alumno.direccion) cambios.direccion = `${azar.elegir(CALLES)} ${azar.entero(100, 2400)}`;
  if (!alumno.localidad) cambios.localidad = "Monte Grande";
  if (!alumno.provincia) cambios.provincia = "Buenos Aires";
  if (!alumno.codigoPostal) cambios.codigoPostal = "1842";
  if (!alumno.nacionalidad) cambios.nacionalidad = "Argentina";
  if (!alumno.telefono) cambios.telefono = telefono(azar);
  if (!alumno.email) cambios.email = `${primerNombre}.${ascii(String(alumno.apellido).split(" ")[0])}@alumno.prece.to`;
  if (!alumno.genero && FEMENINOS.has(primerNombre)) cambios.genero = "Femenino";
  if (!alumno.genero && MASCULINOS.has(primerNombre)) cambios.genero = "Masculino";

  if (Object.keys(cambios).length > 0) studentRepository.update(alumno.id, cambios);
  return { ...alumno, ...cambios, cambios: Object.keys(cambios).length };
}

function asignarTutor(alumno, azar) {
  if (tutorsRepository.listRelations({ studentId: alumno.id }).length > 0) return 0;

  const esMadre = azar.probabilidad(0.65);
  const apellido = String(alumno.apellido).split(" ")[0];
  const nombre = azar.elegir(esMadre ? NOMBRES_MADRE : NOMBRES_PADRE);
  const tutor = tutorsRepository.createTutor({
    id: `tut-${alumno.id}`,
    apellido,
    nombre,
    dni: String(azar.entero(18000000, 32000000)),
    telefono: telefono(azar),
    email: `${ascii(nombre)}.${ascii(apellido)}@mail.com`,
    direccion: alumno.direccion ?? null,
    escuelaId: alumno.escuelaId ?? "esc-1",
    createdBy: ACTOR.id
  });

  tutorsRepository.createRelation({
    id: `rel-${alumno.id}`,
    studentId: alumno.id,
    tutorId: tutor.id,
    parentesco: esMadre ? "madre" : "padre",
    responsablePrincipal: true,
    autorizadoRetiro: true,
    createdBy: ACTOR.id
  });

  if (!alumno.contacto) {
    studentRepository.update(alumno.id, {
      contacto: { nombre, apellido, parentesco: esMadre ? "Madre" : "Padre", telefono: tutor.telefono, email: tutor.email }
    });
  }

  return 1;
}

/* ---------------- Entrada --------------------------------------------------- */

export function seedDatosAlumnos({ ciclo = new Date().getFullYear(), hoy = new Date().toISOString().slice(0, 10) } = {}) {
  const totales = { alumnos: 0, notas: 0, previas: 0, inasistencias: 0, datosPersonales: 0, tutores: 0 };

  for (const original of studentRepository.all()) {
    const azar = generador(original.id);
    const alumno = completarDatosPersonales(original, azar, ciclo);
    if (alumno.cambios > 0) totales.datosPersonales += 1;
    totales.tutores += asignarTutor(alumno, azar);

    /* Notas e inasistencias solo para alumnos activos y con DNI real. */
    if (alumno.isActive === false || alumno.dniProvisorio) continue;

    const faltas = cargarInasistencias(alumno, azar, ciclo, hoy);
    const { notas, previas } = cargarNotas(alumno, azar, ciclo, faltas);
    totales.notas += notas;
    totales.previas += previas;
    totales.inasistencias += faltas;
    totales.alumnos += 1;
  }

  return totales;
}
