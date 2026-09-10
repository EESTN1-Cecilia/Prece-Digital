import { getDatabasePool } from "../../database/client.mjs";

/* Busca un usuario por email (para el inicio de sesion). */
export async function findUserByEmail(email) {
  const databasePool = getDatabasePool();
  const [filas] = await databasePool.query(
    `SELECT id, escuela_id, nombre, apellido, dni, email, password_hash, activo
       FROM usuarios
      WHERE email = ?
      LIMIT 1`,
    [email]
  );

  return filas[0] ?? null;
}

/* Busca un usuario por id sin exponer el hash de la contrasena. */
export async function findUserById(id) {
  const databasePool = getDatabasePool();
  const [filas] = await databasePool.query(
    `SELECT u.id, u.escuela_id, e.nombre AS escuela_nombre,
            u.nombre, u.apellido, u.dni, u.email, u.activo
       FROM usuarios u
       LEFT JOIN escuelas e ON e.id = u.escuela_id
      WHERE u.id = ?
      LIMIT 1`,
    [id]
  );

  return filas[0] ?? null;
}

/* Roles activos del usuario con su alcance por escuela. */
export async function findRolesByUserId(id) {
  const databasePool = getDatabasePool();
  const [filas] = await databasePool.query(
    `SELECT r.codigo, r.nombre, ur.escuela_id
       FROM usuario_roles ur
       JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ?
        AND ur.activo = 1`,
    [id]
  );

  return filas;
}