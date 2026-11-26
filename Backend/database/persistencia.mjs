/* Persistencia del store en memoria en una base de datos relacional.

   Los repositorios siguen trabajando sobre database/memory-store.mjs (sincronico,
   hace de cache) y este modulo lo refleja en la base:
     - cada coleccion Map/Array tiene su tabla `ps_<coleccion>` con una fila por
       registro: `clave` (id), `orden`, `datos` (el registro completo en JSON) y
       columnas reales para los campos clave (alumno_id, materia_id, dni, fecha...)
       para poder consultar e indexar desde SQL;
     - las colecciones que no son Map/Array (p. ej. objetos sueltos) van como JSON
       a la tabla `app_store`;
     - `ps_colecciones` registra que tabla corresponde a cada coleccion.

   Al arrancar se carga todo desde la base (si hay datos no se corren los seeds).
   Despues de cada pedido que modifica (POST/PUT/PATCH/DELETE), cada minuto y al
   apagar se escriben solo las filas que cambiaron.

   Motores: DB_CLIENT=mysql (XAMPP / MariaDB, driver `mysql2`) o DB_CLIENT=sqlserver
   (driver `mssql`). Con DB_CLIENT=memoria no se guarda nada.

   shortcut: las columnas reales son una copia para consultar; la fuente al cargar es
   `datos`. Pasar a un modelo normalizado (FK, sin cache) modulo por modulo si hace falta. */

import { appConfig } from "../config/app.config.mjs";
import { getStore } from "./memory-store.mjs";

const TABLA_BLOBS = "app_store";
const TABLA_COLECCIONES = "ps_colecciones";
/* Partes chicas: el max_allowed_packet de XAMPP viene en 1 MB (4 bytes por caracter como maximo). */
const TAMANO_PARTE = 200_000;
const ESPERA_GUARDADO_MS = 500;
const LARGO_COLUMNA = 255;

/* Campos que, si aparecen en los registros, se copian a columnas propias. */
const CAMPOS = [
  "escuelaId", "alumnoId", "studentId", "estudianteId", "docenteId", "teacherId", "tutorId",
  "userId", "materiaId", "cursoId", "divisionId", "dni", "apellido", "nombre", "email",
  "fecha", "anio", "cuatrimestre", "tipo", "estado", "isActive", "creadoEn", "actualizadoEn"
];
const INDEXADOS = new Set(["escuelaId", "alumnoId", "studentId", "estudianteId", "docenteId", "teacherId", "tutorId", "userId", "materiaId", "cursoId", "divisionId", "dni", "fecha"]);

export const columnaDe = (campo) => campo.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
export const tablaDe = (coleccion) => `ps_${columnaDe(coleccion).replace(/[^a-z0-9_]/g, "_")}`.slice(0, 60);

/* JSON con Map, Set y Date. */
export function serializar(valor) {
  return JSON.stringify(valor, function reemplazar(clave, v) {
    const original = this[clave];
    if (original instanceof Map) return { __tipo: "Map", v: [...original.entries()] };
    if (original instanceof Set) return { __tipo: "Set", v: [...original.values()] };
    if (original instanceof Date) return { __tipo: "Date", v: original.toISOString() };
    return v;
  });
}

export function deserializar(texto) {
  return JSON.parse(texto, (_clave, v) => {
    if (v && typeof v === "object" && typeof v.__tipo === "string" && Object.hasOwn(v, "v")) {
      if (v.__tipo === "Map") return new Map(v.v);
      if (v.__tipo === "Set") return new Set(v.v);
      if (v.__tipo === "Date") return new Date(v.v);
    }
    return v;
  });
}

function partir(texto) {
  const partes = [];
  for (let i = 0; i < texto.length; i += TAMANO_PARTE) partes.push(texto.slice(i, i + TAMANO_PARTE));
  return partes.length > 0 ? partes : [""];
}

function valorColumna(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "string" || typeof v === "number") return String(v).slice(0, LARGO_COLUMNA);
  return null;
}

/* "Map" si todas las claves son texto, "Array", o null (va como JSON a app_store). */
function tipoDe(valor) {
  if (Array.isArray(valor)) return "Array";
  if (valor instanceof Map && [...valor.keys()].every((k) => typeof k === "string")) return "Map";
  return null;
}

function entradas(valor) {
  return Array.isArray(valor) ? valor.map((v, i) => [String(i), v]) : [...valor.entries()];
}

/* Reemplaza en el lugar: algunos modulos pueden tener referencias a las colecciones. */
function volcar(store, clave, valor) {
  const actual = store[clave];
  if (actual instanceof Map && valor instanceof Map) {
    actual.clear();
    for (const [k, v] of valor) actual.set(k, v);
  } else if (actual instanceof Set && valor instanceof Set) {
    actual.clear();
    for (const v of valor) actual.add(v);
  } else if (Array.isArray(actual) && Array.isArray(valor)) {
    actual.length = 0;
    actual.push(...valor);
  } else {
    store[clave] = valor;
  }
}

/* adaptador:
     leerColecciones() -> [{ coleccion, tabla, tipo }]
     leerTabla(tabla) -> [{ clave, datos }] por orden
     leerBlobs() -> [{ clave, parte, valor }]
     asegurarTabla({ coleccion, tabla, tipo, columnas, indexadas })
     escribirFilas(tabla, columnas, filas, borrar)   filas: [{ clave, orden, datos, ...columnas }]
     escribirBlob(clave, partes), cerrar() */
export function crearPersistencia(adaptador, store = getStore(), opciones = {}) {
  /* opciones.filtros: { coleccion: { alCargar(valor), alGuardar(valor) } } transforman una coleccion al
     leerla de / escribirla en `ps_*` (p. ej. dejar afuera lo que vive en tablas relacionales).
     opciones.alGuardar: funcion async que corre al final de cada guardado. */
  const filtros = opciones.filtros ?? {};
  /* coleccion -> { tipo, tabla, columnas: Set, filas: Map<clave, firma> } | { blob: texto } */
  const guardado = new Map();
  let enCurso = null;
  let pendiente = false;
  let temporizador = null;

  async function cargar() {
    let cargadas = 0;

    const porClave = new Map();
    for (const fila of await adaptador.leerBlobs()) {
      if (!porClave.has(fila.clave)) porClave.set(fila.clave, []);
      porClave.get(fila.clave)[Number(fila.parte)] = fila.valor;
    }
    for (const [clave, partes] of porClave) {
      const texto = partes.join("");
      volcar(store, clave, deserializar(texto));
      guardado.set(clave, { blob: texto });
      cargadas += 1;
    }

    for (const { coleccion, tabla, tipo } of await adaptador.leerColecciones()) {
      const filas = new Map();
      const pares = [];
      for (const [orden, { clave, datos }] of (await adaptador.leerTabla(tabla)).entries()) {
        pares.push([clave, deserializar(datos)]);
        filas.set(clave, `${orden}|${datos}`);
      }
      const cargada = tipo === "Array" ? pares.map(([, v]) => v) : new Map(pares);
      volcar(store, coleccion, filtros[coleccion]?.alCargar ? filtros[coleccion].alCargar(cargada) : cargada);
      guardado.set(coleccion, { tipo, tabla, columnas: null, filas });
      cargadas += 1;
    }

    return cargadas;
  }

  async function guardarColeccion(coleccion, valor) {
    const tipo = tipoDe(valor);
    const previo = guardado.get(coleccion);

    if (!tipo || (previo?.tipo && previo.tipo !== tipo)) {
      const texto = serializar(valor);
      if (previo?.blob === texto) return;
      await adaptador.escribirBlob(coleccion, partir(texto));
      guardado.set(coleccion, { blob: texto });
      return;
    }

    const registros = entradas(valor);
    const campos = CAMPOS.filter((campo) => registros.some(([, r]) => r && typeof r === "object" && r[campo] !== undefined));
    const estado = previo?.tipo ? previo : { tipo, tabla: tablaDe(coleccion), columnas: null, filas: new Map() };

    /* Tabla nueva o con campos nuevos: crearla / agregar columnas. */
    if (!estado.columnas || campos.some((campo) => !estado.columnas.has(campo))) {
      const columnas = new Set([...(estado.columnas ?? []), ...campos]);
      await adaptador.asegurarTabla({
        coleccion, tabla: estado.tabla, tipo,
        columnas: [...columnas].map(columnaDe),
        indexadas: [...columnas].filter((c) => INDEXADOS.has(c)).map(columnaDe)
      });
      estado.columnas = columnas;
    }

    const filas = [];
    const firmas = new Map();
    for (const [orden, [clave, registro]] of registros.entries()) {
      const datos = serializar(registro);
      const firma = `${orden}|${datos}`;
      firmas.set(clave, firma);
      if (estado.filas.get(clave) === firma) continue;
      const fila = { clave, orden, datos };
      for (const campo of estado.columnas) fila[columnaDe(campo)] = valorColumna(registro?.[campo]);
      filas.push(fila);
    }
    const borrar = [...estado.filas.keys()].filter((clave) => !firmas.has(clave));

    if (filas.length > 0 || borrar.length > 0) {
      await adaptador.escribirFilas(estado.tabla, [...estado.columnas].map(columnaDe), filas, borrar);
    }
    estado.filas = firmas;
    guardado.set(coleccion, estado);
  }

  async function guardarAhora() {
    for (const coleccion of Object.keys(store)) {
      const valor = filtros[coleccion]?.alGuardar ? filtros[coleccion].alGuardar(store[coleccion]) : store[coleccion];
      await guardarColeccion(coleccion, valor);
    }
    await opciones.alGuardar?.();
  }

  /* Un guardado a la vez; si piden otro mientras tanto, se repite al terminar. */
  function guardar() {
    if (enCurso) {
      pendiente = true;
      return enCurso;
    }
    enCurso = guardarAhora()
      .catch((error) => console.error(`[persistencia] no se pudo guardar: ${error.message}`))
      .finally(() => {
        enCurso = null;
        if (pendiente) {
          pendiente = false;
          guardar();
        }
      });
    return enCurso;
  }

  /* shortcut: si el proceso muere dentro de ESPERA_GUARDADO_MS se pierde ese ultimo cambio. */
  function programarGuardado() {
    clearTimeout(temporizador);
    temporizador = setTimeout(guardar, ESPERA_GUARDADO_MS);
    temporizador.unref?.();
  }

  async function cerrar() {
    clearTimeout(temporizador);
    await guardar();
    while (enCurso) await enCurso;
    await adaptador.cerrar();
  }

  return { cargar, guardar, programarGuardado, cerrar };
}

/* Lotes que no pasen el limite de paquete (MySQL) ni el de parametros (SQL Server). */
function enLotes(filas, { maxFilas, maxBytes = 400_000 }) {
  const lotes = [];
  let lote = [];
  let bytes = 0;
  for (const fila of filas) {
    const tamano = fila.datos.length * 4;
    if (lote.length > 0 && (lote.length >= maxFilas || bytes + tamano > maxBytes)) {
      lotes.push(lote);
      lote = [];
      bytes = 0;
    }
    lote.push(fila);
    bytes += tamano;
  }
  if (lote.length > 0) lotes.push(lote);
  return lotes;
}

function trozos(lista, tamano) {
  const salida = [];
  for (let i = 0; i < lista.length; i += tamano) salida.push(lista.slice(i, i + tamano));
  return salida;
}

async function adaptadorMysql(db) {
  let mysql;
  try {
    ({ default: mysql } = await import("mysql2/promise"));
  } catch {
    throw new Error("Falta el driver de MySQL. Ejecutar: npm install mysql2 -w @prece-digital/api");
  }

  const acceso = { host: db.server, port: db.port, user: db.user ?? "root", password: db.password ?? "", charset: "utf8mb4" };

  /* XAMPP arranca sin la base creada. */
  const inicial = await mysql.createConnection(acceso).catch((error) => {
    throw new Error(`No se pudo conectar a MySQL en ${db.server}:${db.port} (${error.code ?? error.message}). `
      + "Iniciar MySQL en el panel de XAMPP, o poner DB_CLIENT=memoria en Backend/.env para usar datos en memoria.");
  });
  await inicial.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(db.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await inicial.end();

  const pool = mysql.createPool({ ...acceso, database: db.database, connectionLimit: db.poolMax });
  const id = (nombre) => mysql.escapeId(nombre);

  await pool.query(`CREATE TABLE IF NOT EXISTS ${TABLA_BLOBS} (
    clave VARCHAR(100) NOT NULL,
    parte INT NOT NULL,
    valor LONGTEXT NOT NULL,
    actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (clave, parte)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ${TABLA_COLECCIONES} (
    coleccion VARCHAR(100) NOT NULL PRIMARY KEY,
    tabla VARCHAR(64) NOT NULL,
    tipo VARCHAR(10) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  async function enTransaccion(trabajo) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      await trabajo(conexion);
      await conexion.commit();
    } catch (error) {
      await conexion.rollback().catch(() => {});
      throw error;
    } finally {
      conexion.release();
    }
  }

  return {
    async leerColecciones() {
      const [filas] = await pool.query(`SELECT coleccion, tabla, tipo FROM ${TABLA_COLECCIONES}`);
      return filas;
    },
    async leerTabla(tabla) {
      const [filas] = await pool.query(`SELECT clave, datos FROM ${id(tabla)} ORDER BY orden`);
      return filas;
    },
    async leerBlobs() {
      const [filas] = await pool.query(`SELECT clave, parte, valor FROM ${TABLA_BLOBS} ORDER BY clave, parte`);
      return filas;
    },
    async asegurarTabla({ coleccion, tabla, tipo, columnas, indexadas }) {
      await pool.query(`CREATE TABLE IF NOT EXISTS ${id(tabla)} (
        clave VARCHAR(191) NOT NULL PRIMARY KEY,
        orden INT NOT NULL,
        datos LONGTEXT NOT NULL,
        actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX ix_orden (orden)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      const [existentes] = await pool.query(
        "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [tabla]);
      const hay = new Set(existentes.map((fila) => fila.c));
      for (const columna of columnas.filter((c) => !hay.has(c))) {
        await pool.query(`ALTER TABLE ${id(tabla)} ADD COLUMN ${id(columna)} VARCHAR(${LARGO_COLUMNA}) NULL`
          + (indexadas.includes(columna) ? `, ADD INDEX ${id(`ix_${columna}`)} (${id(columna)})` : ""));
      }
      await pool.query(`INSERT INTO ${TABLA_COLECCIONES} (coleccion, tabla, tipo) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE tabla = VALUES(tabla), tipo = VALUES(tipo)`, [coleccion, tabla, tipo]);
      await pool.query(`DELETE FROM ${TABLA_BLOBS} WHERE clave = ?`, [coleccion]);
    },
    async escribirFilas(tabla, columnas, filas, borrar) {
      const todas = ["clave", "orden", "datos", ...columnas];
      await enTransaccion(async (conexion) => {
        for (const claves of trozos(borrar, 500)) {
          await conexion.query(`DELETE FROM ${id(tabla)} WHERE clave IN (?)`, [claves]);
        }
        for (const lote of enLotes(filas, { maxFilas: 500 })) {
          await conexion.query(
            `INSERT INTO ${id(tabla)} (${todas.map(id).join(", ")}) VALUES ?
             ON DUPLICATE KEY UPDATE ${todas.slice(1).map((c) => `${id(c)} = VALUES(${id(c)})`).join(", ")}`,
            [lote.map((fila) => todas.map((c) => fila[c] ?? null))]);
        }
      });
    },
    async escribirBlob(clave, partes) {
      await enTransaccion(async (conexion) => {
        await conexion.query(`DELETE FROM ${TABLA_BLOBS} WHERE clave = ?`, [clave]);
        for (const [i, valor] of partes.entries()) {
          await conexion.query(`INSERT INTO ${TABLA_BLOBS} (clave, parte, valor) VALUES (?, ?, ?)`, [clave, i, valor]);
        }
      });
    },
    cerrar: () => pool.end()
  };
}

async function adaptadorSqlServer() {
  const { consultar, enTransaccion, cerrarPool } = await import("./sqlserver/conexion.mjs");
  const id = (nombre) => `[${nombre.replace(/]/g, "]]")}]`;

  const db = appConfig.database;
  await consultar("SELECT 1").catch((error) => {
    throw new Error(`No se pudo conectar a SQL Server en ${db.server}:${db.instanceName ?? db.port}, base ${db.database} (${error.message}). `
      + "Verificar que el servicio este iniciado, que TCP/IP este habilitado, que la base exista y el usuario/clave de Backend/.env, "
      + "o poner DB_CLIENT=memoria para usar datos en memoria.");
  });

  await consultar(`IF OBJECT_ID('dbo.${TABLA_BLOBS}', 'U') IS NULL
    CREATE TABLE dbo.${TABLA_BLOBS} (
      clave NVARCHAR(100) NOT NULL,
      parte INT NOT NULL,
      valor NVARCHAR(MAX) NOT NULL,
      actualizado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT PK_${TABLA_BLOBS} PRIMARY KEY (clave, parte)
    )`);
  await consultar(`IF OBJECT_ID('dbo.${TABLA_COLECCIONES}', 'U') IS NULL
    CREATE TABLE dbo.${TABLA_COLECCIONES} (
      coleccion NVARCHAR(100) NOT NULL PRIMARY KEY,
      tabla NVARCHAR(64) NOT NULL,
      tipo NVARCHAR(10) NOT NULL
    )`);

  return {
    leerColecciones: () => consultar(`SELECT coleccion, tabla, tipo FROM dbo.${TABLA_COLECCIONES}`),
    leerTabla: (tabla) => consultar(`SELECT clave, datos FROM dbo.${id(tabla)} ORDER BY orden`),
    leerBlobs: () => consultar(`SELECT clave, parte, valor FROM dbo.${TABLA_BLOBS} ORDER BY clave, parte`),
    async asegurarTabla({ coleccion, tabla, tipo, columnas, indexadas }) {
      await consultar(`IF OBJECT_ID(@nombre, 'U') IS NULL
        CREATE TABLE dbo.${id(tabla)} (
          clave NVARCHAR(191) NOT NULL PRIMARY KEY,
          orden INT NOT NULL,
          datos NVARCHAR(MAX) NOT NULL,
          actualizado DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        )`, { nombre: `dbo.${tabla}` });
      const existentes = await consultar(
        "SELECT name AS c FROM sys.columns WHERE object_id = OBJECT_ID(@nombre)", { nombre: `dbo.${tabla}` });
      const hay = new Set(existentes.map((fila) => fila.c));
      for (const columna of columnas.filter((c) => !hay.has(c))) {
        await consultar(`ALTER TABLE dbo.${id(tabla)} ADD ${id(columna)} NVARCHAR(${LARGO_COLUMNA}) NULL`);
        if (indexadas.includes(columna)) {
          await consultar(`CREATE INDEX ${id(`ix_${tabla}_${columna}`)} ON dbo.${id(tabla)} (${id(columna)})`);
        }
      }
      await enTransaccion(async (q) => {
        await q(`DELETE FROM dbo.${TABLA_COLECCIONES} WHERE coleccion = @coleccion`, { coleccion });
        await q(`INSERT INTO dbo.${TABLA_COLECCIONES} (coleccion, tabla, tipo) VALUES (@coleccion, @tabla, @tipo)`, { coleccion, tabla, tipo });
        await q(`DELETE FROM dbo.${TABLA_BLOBS} WHERE clave = @coleccion`, { coleccion });
      });
    },
    async escribirFilas(tabla, columnas, filas, borrar) {
      const todas = ["clave", "orden", "datos", ...columnas];
      /* Se borran las que cambiaron o desaparecieron y se insertan de nuevo (limite: 2100 parametros). */
      const claves = [...borrar, ...filas.map((fila) => fila.clave)];
      await enTransaccion(async (q) => {
        for (const grupo of trozos(claves, 1000)) {
          const parametros = Object.fromEntries(grupo.map((clave, i) => [`k${i}`, clave]));
          await q(`DELETE FROM dbo.${id(tabla)} WHERE clave IN (${grupo.map((_, i) => `@k${i}`).join(", ")})`, parametros);
        }
        for (const lote of enLotes(filas, { maxFilas: Math.floor(2000 / todas.length), maxBytes: Infinity })) {
          const parametros = {};
          const valores = lote.map((fila, f) => `(${todas.map((c, i) => {
            parametros[`p${f}_${i}`] = fila[c] ?? null;
            return `@p${f}_${i}`;
          }).join(", ")})`);
          await q(`INSERT INTO dbo.${id(tabla)} (${todas.map(id).join(", ")}) VALUES ${valores.join(", ")}`, parametros);
        }
      });
    },
    escribirBlob: (clave, partes) => enTransaccion(async (q) => {
      await q(`DELETE FROM dbo.${TABLA_BLOBS} WHERE clave = @clave`, { clave });
      for (const [i, valor] of partes.entries()) {
        await q(`INSERT INTO dbo.${TABLA_BLOBS} (clave, parte, valor) VALUES (@clave, @parte, @valor)`, { clave, parte: i, valor });
      }
    }),
    cerrar: cerrarPool
  };
}

/* Devuelve null si DB_CLIENT no es una base (memoria). */
export async function iniciarPersistencia(db = appConfig.database, opciones = {}) {
  if (db.client === "mysql") return crearPersistencia(await adaptadorMysql(db), getStore(), opciones);
  if (db.client === "sqlserver") return crearPersistencia(await adaptadorSqlServer(), getStore(), opciones);
  return null;
}
