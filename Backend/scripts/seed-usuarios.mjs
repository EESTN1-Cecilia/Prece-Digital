/* Seed de usuarios demo para development.
   Uso: node scripts/seed-usuarios.mjs
   Crea (si no existen) la escuela + un usuario por rol con contrasena "Pr3ceD1git4l!"
   Ejecutar una sola vez; es idempotente por email. */

import { closeDatabaseConnection, getDatabasePool } from "../database/client.mjs";
import { hashContrasena } from "../utils/password.mjs";

const CONTRASENA = "Pr3ceD1git4l!";

const USUARIOS = [
  { email: "admin@prece.escuela.edu.ar", nombre: "Admin", apellido: "Sistema", dni: "30000000", rol: "system-admin" },
  { email: "director@prece.escuela.edu.ar", nombre: "Director", apellido: "Escuela", dni: "30000001", rol: "director" },
  { email: "secretario@prece.escuela.edu.ar", nombre: "Secretaria", apellido: "General", dni: "30000002", rol: "secretary" },
  { email: "preceptor@prece.escuela.edu.ar", nombre: "Preceptor", apellido: "Turno", dni: "30000003", rol: "preceptor" },
  { email: "jefe@prece.escuela.edu.ar", nombre: "Jefe", apellido: "Area", dni: "30000004", rol: "area-lead" },
  { email: "asistencia@prece.escuela.edu.ar", nombre: "Operador", apellido: "Asistencia", dni: "30000005", rol: "attendance-operator" }
];

async function run() {
  const databasePool = getDatabasePool();

  const [escuelas] = await databasePool.query("SELECT id FROM escuelas LIMIT 1");
  let escuelaId = escuelas[0]?.id;

  if (!escuelaId) {
    const [resultado] = await databasePool.query(
      "INSERT INTO escuelas (nombre, activa) VALUES (?, 1)",
      ["EEST N°1 Montegrande"]
    );
    escuelaId = resultado.insertId;
    console.log("Escuela demo creada (id", escuelaId, ").");
  }

  const hash = await hashContrasena(CONTRASENA);

  for (const { email, nombre, apellido, dni, rol } of USUARIOS) {
    const [existentes] = await databasePool.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    let usuarioId = existentes[0]?.id;

    if (!usuarioId) {
      const [resultado] = await databasePool.query(
        `INSERT INTO usuarios (escuela_id, nombre, apellido, dni, email, password_hash, activo)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [escuelaId, nombre, apellido, dni, email, hash]
      );
      usuarioId = resultado.insertId;
      console.log(`Usuario creado: ${email}`);
    }

    const [roles] = await databasePool.query(
      "SELECT id FROM roles WHERE codigo = ?",
      [rol]
    );
    const rolId = roles[0]?.id;

    if (!rolId) {
      console.warn(`Rol no encontrado (${rol}) para ${email}. Omitido.`);
      continue;
    }

    await databasePool.query(
      `INSERT INTO usuario_roles (usuario_id, rol_id, escuela_id, activo)
       SELECT ?, ?, ?, 1
       WHERE NOT EXISTS (
         SELECT 1 FROM usuario_roles
         WHERE usuario_id = ? AND rol_id = ? AND escuela_id = ?
       )`,
      [usuarioId, rolId, escuelaId, usuarioId, rolId, escuelaId]
    );
  }

  console.log(`Seed completado. Contrasena para todos: ${CONTRASENA}`);
}

run()
  .catch((error) => {
    console.error("Error en el seed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });