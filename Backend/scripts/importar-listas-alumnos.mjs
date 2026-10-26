/* Carga masiva de alumnos desde las planillas de preceptoria (LISTAS <ciclo>).

   Lee las planillas de 1° a 5° año (una por division: "1°1°.xlsx", "1°6°.xlsx",
   ...), toma solo el apellido y nombre de cada alumno y completa el resto de los
   campos obligatorios con datos provisorios, que se corrigen despues desde el
   panel de administracion.

       node scripts/importar-listas-alumnos.mjs "<carpeta LISTAS>" [carpeta de salida] [ciclo] [opciones]

   Opciones (para cargar cursos sueltos despues del lote principal):
   --anios=6            años a leer (por defecto 1,2,3,4,5)
   --divisiones=2,3     solo esas divisiones (por defecto todas)
   --dni-desde=99000742 primer DNI provisorio (continuar despues del ultimo usado)
   --nombre=alumnos-6   nombre base de los archivos de salida (por defecto "alumnos")
   --preferir=7°3°      si alguien figura en dos divisiones, se carga en esta (ya
                        confirmada por preceptoria) en lugar de dejarlo afuera

   Genera en la carpeta de salida:
   - alumnos.json: { alumnos: [...] }, el cuerpo que acepta POST /api/v1/students/bulk.
   - alumnos.sql: INSERT en `estudiantes` (schema.sql), dentro de una transaccion.
   - revisar-nombres.csv: alumnos cuyo apellido/nombre se separo con una regla
     dudosa y conviene confirmar a mano.

   Las salidas contienen datos personales de menores: no se versionan
   (Backend/database/imports/ esta en .gitignore).

   Reglas de las planillas:
   - Año y division salen del nombre del archivo: "1°1°" = 1° año, division 1. La
     division 5 no existe: despues de la 4 viene la 6.
   - Solo cuenta la primera hoja (las otras son grupos de taller).
   - Se descartan las filas de totales ("varones presentes", "Totales", ...) y las
     filas numeradas sin nombre. Los alumnos agregados al pie sin numero de orden
     (ingresos posteriores) se incluyen. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const argumentos = process.argv.slice(2);
const opciones = Object.fromEntries(
  argumentos.filter((arg) => arg.startsWith("--")).map((arg) => arg.slice(2).split("="))
);
const [ORIGEN, SALIDA = path.join(AQUI, "../database/imports/listas-2026"), CICLO = "2026"] = argumentos.filter(
  (arg) => !arg.startsWith("--")
);
const lista = (valor) => (valor ? valor.split(",").map((parte) => parte.trim()).filter(Boolean) : null);

if (!ORIGEN) {
  console.error('Uso: node scripts/importar-listas-alumnos.mjs "<carpeta LISTAS>" [salida] [ciclo]');
  process.exit(1);
}

const ANIOS = (lista(opciones.anios) ?? ["1", "2", "3", "4", "5"]).map(Number);
const DIVISIONES = lista(opciones.divisiones);
const NOMBRE_SALIDA = opciones.nombre ?? "alumnos";
const PREFERIDA = opciones.preferir ? opciones.preferir.replace(/\s/g, "") : null;
const FILA_RESUMEN = /presentes|ausentes|total/i;
/* DNI provisorio: rango que hoy no usa ningun DNI argentino real, para que se
   distinga a simple vista y no choque con los que se carguen despues. */
const DNI_PROVISORIO_DESDE = Number(opciones["dni-desde"] ?? 99_000_001);
const INICIO_CLASES = `${CICLO}-03-02`;

/* ---------------- Separacion de apellido y nombre ------------------------ */

/* Las planillas traen "APELLIDO(S) NOMBRE(S)" en una sola celda, sin coma. La
   primera palabra siempre es apellido y la ultima siempre es nombre; las del
   medio se clasifican con estos diccionarios y, si no alcanzan, con lo que
   muestra el propio listado (una palabra que en otro alumno aparece al final es
   un nombre; una que aparece al principio, un apellido). */
const PARTICULAS = new Set(["DE", "DEL", "LA", "LAS", "LOS", "DOS", "DA", "DI", "VAN", "VON"]);

const NOMBRES = new Set(`
ALEX ANDREA CRISTHIAN GERMAN GISELLA ISAAC ISAIAS MIA NAIARA PABLO PEDRO SARA SHIRLEY VALERIA ZAIDA
CESAR ELBA ELIANA FABRICIO JOAO LISANDRO ROCIO
AARON ABIGAIL ADIB ADRIAN AGOSTINA AGUSTIN AGUSTINA AILEN AITANA ALAN ALDANA ALEJANDRO ALEJO ALEXANDER ALEXIS ALINA
ALISON ALMA ALVARO AMBAR AMIRA ANA ANDRES ANGEL ANGELES ANGELINA ANTONELLA ANTONIO ANYALI ARELI ARIADNA ARIAN ARIEL
ARMANDO ARON AXEL AYELEN AZUL BAUTISTA BELEN BENICIO BENJAMIN BIANCA BRANDON BRENDA BRIAN BRISA BRUNO CALEB CAMILA
CAMILO CANDELA CARLOS CAROLINA CATALINA CAYETANO CAETANO CIRO CLARA CRISTAL CRISTIAN CHRISTIAN DAMIAN DANA DANIEL DANIELA
DANTE DATZIRA DAVID DELFINA DEMIAN DERLIS DEYSI DIANA DIEGO DOMINIC DYLAN EITAN ELIAS ELIO ELIOT ELIAN EMANUEL EMILIA
EMILIANO EMMA ENZO ERIC ERIK ESTEBAN EUNICE EVA EZEQUIEL FABIAN FABRIZIO FACUNDO FEDERICO FELIPE FERNANDO FILIPPA FIORELLA
FLORENCIA FRANCESCA FRANCISCO GABRIEL GAEL GASTON GENARO GIANNA GONZALO GUADALUPE GUSTAVO HELENA HELIO HENRY HERNAN
IAN IGNACIO IRINA ISABELLA ISMAEL ITZEL IVAN JAEL JAIR JAIRO JAVIER JAZMIN JEREMIAS JESICA JOAN JOAQUIN JOEL JOHN JONATHAN
JORGE JOSE JOSUE JUAN JULIAN JULIETA JULIO KARINA KATHERINE KATYA KEILA KIARA LAUREANO LAUTARO LEANDRO LEONEL LIAN LILIAN
LION LIS LIZ LORENZO LOURDES LUANA LUCAS LUCIA LUCIANA LUCIANO LUCILA LUCIO LUDMILA LUKA LUNA MAGALI MAIA MAILEN MAILIN
MAIRA MAITE MALENA MANUEL MARCOS MARIA MARIANA MARIANO MARISOL MARTIN MARTINA MASSIMO MATEO MATHEO MATHIAS MATIAS MAURO
MAX MAXIMILIANO MAXIMO MELANI MELANIE MELISSA MELODY MICAELA MICHAEL MIGUEL MILAGROS MILENA MILO MILTON MIQUEAS MISAEL
MONSERRAT MORENA MARISA NAHUEL NAILAH NANCY NAOMI NARELA NATASHA NAYLA NAZARENO NESTOR NICOLAS NOAH NOELIA NOHA OLIVIA PATRICIO PAULA
PRISCILA RAFAEL RAMIRO RENATA RENE RICHARD ROBERTO RODRIGO ROMAN ROSANA RYAN SAMUEL SANTIAGO SANTINO SEBASTIAN SERGIO
SHAIEL SHARON SHIREL SOFIA SOL TAMARA TATIANA TEO THALIA THIAGO TIARA TIZIANO TOBIAS TOMAS ULISES URIEL VALENTIN
VALENTINA VALENTINO VERONICA VICTORIA WILLIAM XAVIER XIOMRA YAMIR YAZMIN YUDIT ZAMIRA ZOE ZONIA
`.trim().split(/\s+/));

const APELLIDOS = new Set(`
ARGUELLO BARRAZA BOGADO CANO CARDOZO CASTIGLIO FERREYRA LOVERA ROBAINA SOLIZ SULLCA TENAZOA TORRES VARELA VARGAS VELTRI
CAO CHARLONE HEILING IRRAZABAL VERA ZARZA
ALVARENGA ALVARES ANRRIQUEZ ARECO AREVALO AVILA BAILEZ BEDOYA BONINI BULACIO BUONO BURBRIDGE BUSTAMANTE CABRERA CAMIROTTE
CAPRISTANO CARBAJAL CARMONA CASSALZ CASTELLANO CHAMO CHAMORRO CHANA CHAVERO CID CLARK COLQUE CONTRERAS CORE CRISTALDO
CURVALAN DAVILA DESVARS ECHEVARIA ENCISO ESPINOSA ESPINOLA FIORI FLEITAS FRATICOLA FUENTE GARRIDO GELVEZ GUTIERREZ HERBSOMER
HIRSHFELD IBANEZ IBARRA INFRANS INSAURRALDE LAMADRID LAMARQUE LEITE LEIVA LIMA LIRA MAIZARES MARINO MARTIUK MASETTO MENDEZ
MENUTO MONJE MONTANO MONZON MORAN MOREYRA MORINIGO MOURA NOVELLUCIA OLIVEIRA OLIVERA ORREGO ORTIGOZA OTALORA PAINEN PAREDES
PASCUA PAUCARA PEDERNERA PELOZO PENAYO PERALTA PIEROLA PIZARRO PRATI QUISPIA RAMOS RECAITE REJALA REYNAGA RIVEROS ROA ROSSI
RUGNA SALAS SALVATIERRA SAMUDIO SANILLAN SANTOS SERVIN SILGUERO SOBERAL SOLER SOTO SPADA TORRE TORREZ TUTINO VILLANUEVA
VILLAR YUTRONICH ZALAZAR ZIVANO
`.trim().split(/\s+/));

/* Pueden ser nombre o apellido. Se toman como segundo apellido cuando el
   apellido tiene una sola palabra y despues quedan al menos dos nombres
   ("FERNANDEZ FRANCO JOSE MIGUEL"); si no, como nombre ("CORREA FRANCO FABIAN").
   En los dos casos el alumno va a la lista de revision. */
const AMBIGUAS = new Set(["FRANCO", "LEON"]);

const sinTildes = (texto) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();

function limpiar(celda) {
  return String(celda ?? "")
    .replace(/­/g, "") // guion blando pegado desde otros sistemas
    .replace(/\s+/g, " ")
    .trim();
}

/* Agrupa las particulas con la palabra que sigue: "DE LA TORRE" es una unidad. */
function unidades(palabras) {
  const salida = [];
  let pendiente = [];

  for (const palabra of palabras) {
    pendiente.push(palabra);
    if (!PARTICULAS.has(sinTildes(palabra))) {
      salida.push(pendiente.join(" "));
      pendiente = [];
    }
  }

  if (pendiente.length) salida.push(pendiente.join(" "));
  return salida;
}

function crearSeparador(evidencia) {
  return function separar(completo) {
    if (completo.includes(",")) {
      const [apellido, ...resto] = completo.split(",");
      return { apellido: apellido.trim(), nombre: resto.join(" ").trim(), revisar: null };
    }

    const partes = unidades(completo.split(" "));

    if (partes.length === 1) {
      return { apellido: partes[0], nombre: "", revisar: "una sola palabra: falta el nombre" };
    }

    let corte = partes.length - 1;
    let revisar = null;

    for (let i = 1; i < partes.length - 1; i += 1) {
      const clave = sinTildes(partes[i]);
      const esParticula = PARTICULAS.has(sinTildes(partes[i].split(" ")[0]));

      if (AMBIGUAS.has(clave)) {
        revisar = `"${partes[i]}" puede ser nombre o apellido`;
        if (i === 1 && partes.length - i - 1 >= 2) {
          continue;
        }
        corte = i;
        break;
      }

      if (NOMBRES.has(clave)) {
        corte = i;
        break;
      }

      if (esParticula || APELLIDOS.has(clave)) {
        continue;
      }

      if (evidencia.comoUltima.has(clave) && !evidencia.comoPrimera.has(clave)) {
        corte = i;
        break;
      }

      if (evidencia.comoPrimera.has(clave)) {
        continue;
      }

      /* Sin datos: se asume apellido compuesto si quedan al menos dos palabras
         para el nombre; si no, nombre. */
      revisar = `"${partes[i]}" no esta en los diccionarios`;
      if (partes.length - i < 3) {
        corte = i;
        break;
      }
    }

    return {
      apellido: partes.slice(0, corte).join(" "),
      nombre: partes.slice(corte).join(" "),
      revisar
    };
  };
}

/* ---------------- Lectura de planillas ----------------------------------- */

function cursoDesdeArchivo(archivo) {
  const encontrado = archivo.match(/^(\d)\s*°\s*(\d)\s*°/);
  return encontrado ? { anio: Number(encontrado[1]), division: encontrado[2] } : null;
}

function leerPlanilla(ruta) {
  const libro = XLSX.readFile(ruta);
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: false, defval: null });
  const cabecera = filas.findIndex((fila) => /APELLIDO/i.test(String(fila[1] ?? "")));

  if (cabecera < 0) {
    throw new Error(`No se encontro la columna "APELLIDO Y NOMBRE" en ${ruta}`);
  }

  return filas
    .slice(cabecera + 1)
    .map((fila) => ({ orden: typeof fila[0] === "number" ? fila[0] : null, completo: limpiar(fila[1]), proviene: limpiar(fila[2]) }))
    .filter((fila) => fila.completo && !FILA_RESUMEN.test(fila.completo));
}

const leidos = [];

for (const anio of ANIOS) {
  const carpeta = path.join(ORIGEN, `${anio}° AÑO`);

  for (const archivo of fs.readdirSync(carpeta).filter((nombre) => nombre.endsWith(".xlsx")).sort()) {
    const curso = cursoDesdeArchivo(archivo);

    if (!curso || curso.anio !== anio) {
      throw new Error(`No se pudo leer año y division del archivo ${archivo}`);
    }

    if (DIVISIONES && !DIVISIONES.includes(curso.division)) {
      continue;
    }

    leerPlanilla(path.join(carpeta, archivo)).forEach((fila, posicion) =>
      leidos.push({ ...curso, posicion: posicion + 1, archivo, indice: leidos.length, ...fila })
    );
  }
}

/* Duplicados: la misma persona dos veces en la misma division se carga una sola
   vez; si figura en dos divisiones distintas no se carga en ninguna hasta que
   alguien decida cual es la correcta (queda en duplicados-<nombre>.csv), salvo
   que --preferir indique la division confirmada. */
const clavePersona = (texto) => sinTildes(texto).replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
const porPersona = new Map();
for (const fila of leidos) {
  const clave = clavePersona(fila.completo);
  porPersona.set(clave, [...(porPersona.get(clave) ?? []), fila]);
}

const duplicados = [];
const crudos = [];
for (const fila of leidos) {
  const grupo = porPersona.get(clavePersona(fila.completo));
  const cursos = new Set(grupo.map((otra) => `${otra.anio}°${otra.division}°`));
  const elegida = cursos.size === 1 ? grupo[0] : PREFERIDA && cursos.has(PREFERIDA)
    ? grupo.find((otra) => `${otra.anio}°${otra.division}°` === PREFERIDA)
    : null;

  if (grupo.length > 1 && grupo[0] === fila) {
    duplicados.push({
      texto: fila.completo,
      cursos: grupo.map((otra) => `${otra.anio}°${otra.division}° fila ${otra.posicion}`).join(" / "),
      decision: cursos.size === 1
        ? "se carga una vez"
        : elegida
          ? `se carga en ${PREFERIDA} (division confirmada)`
          : "NO se carga: figura en dos divisiones"
    });
  }

  if (elegida === fila) {
    crudos.push(fila);
  }
}

/* Evidencia del propio listado para las palabras que no estan en los diccionarios. */
const evidencia = { comoUltima: new Set(), comoPrimera: new Set() };
for (const { completo } of crudos) {
  const palabras = completo.replace(",", " ").split(" ").filter(Boolean);
  evidencia.comoPrimera.add(sinTildes(palabras[0]));
  evidencia.comoUltima.add(sinTildes(palabras[palabras.length - 1]));
}

const separar = crearSeparador(evidencia);

/* ---------------- Datos provisorios -------------------------------------- */

/* El DNI provisorio sale de la posicion en las planillas (antes de quitar
   duplicados): asi quitar un duplicado no corre el DNI de los demas. */
const alumnos = crudos.map((crudo) => {
  const { apellido, nombre, revisar } = separar(crudo.completo);
  const dni = String(DNI_PROVISORIO_DESDE + crudo.indice);

  return {
    apellido,
    nombre,
    curso: crudo.anio,
    division: crudo.division,
    dni,
    legajo: `${CICLO}-${crudo.anio}${crudo.division}-${String(crudo.posicion).padStart(3, "0")}`,
    /* Edad tipica del año (1° año: 12 a 13 años). */
    fechaNacimiento: `${Number(CICLO) - 12 - crudo.anio}-07-01`,
    genero: null,
    direccion: "A completar",
    email: `alumno.${dni}@sin-correo.invalid`,
    telefono: "0000000000",
    fechaIngreso: INICIO_CLASES,
    condicion: "regular",
    estado: "activo",
    origen: { archivo: crudo.archivo, fila: crudo.posicion, textoOriginal: crudo.completo },
    ...(revisar ? { revisar } : {})
  };
});

/* ---------------- Controles ---------------------------------------------- */

const dnis = new Set(alumnos.map((alumno) => alumno.dni));
const legajos = new Set(alumnos.map((alumno) => alumno.legajo));

if (dnis.size !== alumnos.length || legajos.size !== alumnos.length) {
  throw new Error("Hay DNI o legajos repetidos en la salida.");
}

if (alumnos.some((alumno) => !alumno.apellido || !alumno.nombre)) {
  console.warn("Atencion: hay alumnos sin apellido o sin nombre (ver revisar-nombres.csv).");
}

/* ---------------- Salidas ------------------------------------------------ */

fs.mkdirSync(SALIDA, { recursive: true });

fs.writeFileSync(
  path.join(SALIDA, `${NOMBRE_SALIDA}.json`),
  JSON.stringify({ ciclo: Number(CICLO), generado: new Date().toISOString(), total: alumnos.length, alumnos }, null, 2)
);

function porCursoSql() {
  const salida = {};
  for (const alumno of alumnos) salida[`${alumno.curso}°${alumno.division}°`] = true;
  return salida;
}

const sql = (valor) => (valor === null || valor === undefined ? "NULL" : `'${String(valor).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`);

const lineas = alumnos.map(
  (alumno) =>
    `  (${alumno.curso}, ${sql(alumno.division)}, ${sql(alumno.legajo)}, ${sql(alumno.nombre)}, ${sql(alumno.apellido)}, ${sql(alumno.dni)}, ${sql(alumno.fechaNacimiento)}, ${sql(alumno.direccion)}, ${sql(alumno.fechaIngreso)})`
);

fs.writeFileSync(
  path.join(SALIDA, `${NOMBRE_SALIDA}.sql`),
  `-- Carga masiva de alumnos ${CICLO}: ${Object.keys(porCursoSql()).join(", ")} (${alumnos.length} alumnos).
-- Generado por Backend/scripts/importar-listas-alumnos.mjs a partir de las planillas de preceptoria.
-- Solo apellido y nombre son reales. DNI (rango ${DNI_PROVISORIO_DESDE} en adelante), legajo,
-- fecha de nacimiento, direccion y fecha de ingreso son PROVISORIOS: se corrigen desde el panel.
-- Requiere schema.sql cargado (escuela, ciclo ${CICLO} y anios_divisiones 1°-5°).
-- Todo en una transaccion: si falta una division o un DNI ya existe, no se inserta nada.

USE prece_digital;

SET @escuela_id = (SELECT id FROM escuelas WHERE nombre = 'EEST N°1 Montegrande');
SET @ciclo_id = (SELECT id FROM ciclos_lectivos WHERE escuela_id = @escuela_id AND anio = ${Number(CICLO)});

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_carga_alumnos;
CREATE TEMPORARY TABLE tmp_carga_alumnos (
  anio_curso        TINYINT UNSIGNED NOT NULL,
  division          VARCHAR(5)   NOT NULL,
  legajo            VARCHAR(30)  NOT NULL,
  nombre            VARCHAR(100) NOT NULL,
  apellido          VARCHAR(100) NOT NULL,
  dni               VARCHAR(20)  NOT NULL,
  fecha_nacimiento  DATE         NULL,
  direccion         VARCHAR(200) NULL,
  fecha_ingreso     DATE         NULL
) ENGINE=MEMORY DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_carga_alumnos (anio_curso, division, legajo, nombre, apellido, dni, fecha_nacimiento, direccion, fecha_ingreso) VALUES
${lineas.join(",\n")};

-- Control: debe devolver 0 filas. Si devuelve alguna, falta esa division en anios_divisiones
-- y el INSERT siguiente no la cargaria: hacer ROLLBACK, crearla y volver a ejecutar.
SELECT DISTINCT t.anio_curso, t.division AS division_sin_curso
FROM tmp_carga_alumnos t
LEFT JOIN anios_divisiones ad
  ON ad.ciclo_lectivo_id = @ciclo_id AND ad.anio_curso = t.anio_curso AND ad.division = t.division
WHERE ad.id IS NULL;

INSERT INTO estudiantes
  (escuela_id, anio_division_id, legajo, nombre, apellido, dni, fecha_nacimiento, genero, direccion, fecha_ingreso, condicion, activo)
SELECT @escuela_id, ad.id, t.legajo, t.nombre, t.apellido, t.dni, t.fecha_nacimiento, NULL, t.direccion, t.fecha_ingreso, 'regular', 1
FROM tmp_carga_alumnos t
JOIN anios_divisiones ad
  ON ad.ciclo_lectivo_id = @ciclo_id AND ad.anio_curso = t.anio_curso AND ad.division = t.division;

-- Debe coincidir con ${alumnos.length}.
SELECT ROW_COUNT() AS alumnos_insertados;

DROP TEMPORARY TABLE tmp_carga_alumnos;

COMMIT;
`
);

const revision = alumnos.filter((alumno) => alumno.revisar);

if (duplicados.length) {
  fs.writeFileSync(
    path.join(SALIDA, `duplicados-${NOMBRE_SALIDA}.csv`),
    "\uFEFF" +
      ["texto_original;aparece_en;decision"]
        .concat(duplicados.map((d) => [d.texto, d.cursos, d.decision].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")))
        .join("\r\n")
  );
}
const csv = (valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
fs.writeFileSync(
  path.join(SALIDA, NOMBRE_SALIDA === "alumnos" ? "revisar-nombres.csv" : `revisar-${NOMBRE_SALIDA}.csv`),
  "﻿" +
    ["curso;division;texto_original;apellido;nombre;motivo"]
      .concat(revision.map((a) => [a.curso, a.division, a.origen.textoOriginal, a.apellido, a.nombre, a.revisar].map(csv).join(";")))
      .join("\r\n")
);

/* ---------------- Resumen ------------------------------------------------ */

const porCurso = {};
for (const alumno of alumnos) {
  const clave = `${alumno.curso}°${alumno.division}°`;
  porCurso[clave] = (porCurso[clave] ?? 0) + 1;
}

console.log(`Alumnos: ${alumnos.length}`);
console.log("Por curso:", porCurso);
console.log(`Para revisar: ${revision.length}`);
for (const d of duplicados) console.log(`Duplicado: ${d.texto} (${d.cursos}) -> ${d.decision}`);
console.log(`Salida: ${path.resolve(SALIDA)}`);
