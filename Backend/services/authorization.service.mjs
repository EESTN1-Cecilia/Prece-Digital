/* Autorización: qué puede hacer cada rol y, por lo tanto, cada usuario.

   Un permiso es "<modulo>:<accion>", por ejemplo "identity:read". Los permisos de un
   usuario son la unión de los permisos de todos sus roles activos.

   Las consultas reciben la conexión por parámetro para poder probarlas con un doble. */

import { getDatabasePool } from "../database/client.mjs";
import { noEncontrado, errorDeValidacion } from "../utils/api-error.mjs";

function conexion(pool) {
  return pool ?? getDatabasePool();
}

export async function listarRoles(pool) {
  const [filas] = await conexion(pool).query(
    "SELECT id, codigo, nombre, descripcion FROM roles ORDER BY id"
  );

  return filas;
}

export async function listarModulos(pool) {
  const [filas] = await conexion(pool).query(
    "SELECT codigo, nombre, descripcion FROM modulos ORDER BY id"
  );

  return filas;
}

export async function listarPermisos(pool) {
  const [filas] = await conexion(pool).query(
    "SELECT id, codigo, modulo, accion, descripcion FROM permisos ORDER BY modulo, accion"
  );

  return filas;
}

async function buscarRol(pool, codigo) {
  const [filas] = await conexion(pool).query("SELECT id, codigo, nombre FROM roles WHERE codigo = ?", [
    codigo
  ]);

  if (!filas.length) {
    throw noEncontrado("El rol solicitado");
  }

  return filas[0];
}

export async function permisosDeRol(pool, codigoRol) {
  const rol = await buscarRol(pool, codigoRol);

  const [filas] = await conexion(pool).query(
    `SELECT p.codigo
       FROM rol_permisos rp
       JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ?
      ORDER BY p.codigo`,
    [rol.id]
  );

  return { rol, permisos: filas.map((fila) => fila.codigo) };
}

/* Reemplaza por completo los permisos del rol. Se rechaza cualquier código que no
   exista en el catálogo: así el cliente no puede inventar permisos. */
export async function reemplazarPermisosDeRol(pool, codigoRol, codigos) {
  if (!Array.isArray(codigos)) {
    throw errorDeValidacion([{ field: "permisos", message: "Se espera una lista de permisos." }]);
  }

  const rol = await buscarRol(pool, codigoRol);
  const unicos = [...new Set(codigos)];
  const db = conexion(pool);

  let identificadores = [];

  if (unicos.length) {
    const [filas] = await db.query("SELECT id, codigo FROM permisos WHERE codigo IN (?)", [unicos]);
    const conocidos = new Set(filas.map((fila) => fila.codigo));
    const desconocidos = unicos.filter((codigo) => !conocidos.has(codigo));

    if (desconocidos.length) {
      throw errorDeValidacion(
        desconocidos.map((codigo) => ({
          field: "permisos",
          message: `El permiso "${codigo}" no existe en el catálogo.`
        }))
      );
    }

    identificadores = filas.map((fila) => fila.id);
  }

  await db.query("DELETE FROM rol_permisos WHERE rol_id = ?", [rol.id]);

  if (identificadores.length) {
    await db.query("INSERT INTO rol_permisos (rol_id, permiso_id) VALUES ?", [
      identificadores.map((permisoId) => [rol.id, permisoId])
    ]);
  }

  return { rol, permisos: unicos.sort() };
}

/* Permisos efectivos del usuario: unión de los permisos de sus roles activos.
   Los roles se leen de la base, nunca de lo que envíe el cliente. */
export async function permisosDeUsuario(pool, usuarioId) {
  const [filas] = await conexion(pool).query(
    `SELECT DISTINCT p.codigo
       FROM usuario_roles ur
       JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
       JOIN permisos p      ON p.id = rp.permiso_id
      WHERE ur.usuario_id = ? AND ur.activo = 1
      ORDER BY p.codigo`,
    [usuarioId]
  );

  return filas.map((fila) => fila.codigo);
}

export async function rolesDeUsuario(pool, usuarioId) {
  const [filas] = await conexion(pool).query(
    `SELECT r.codigo, r.nombre, ur.escuela_id
       FROM usuario_roles ur
       JOIN roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = ? AND ur.activo = 1
      ORDER BY r.id`,
    [usuarioId]
  );

  return filas;
}

export function tienePermiso(permisos, requerido) {
  return permisos.includes(requerido);
}
