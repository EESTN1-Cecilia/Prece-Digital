/* Cuentas de alumno guardadas en SQL Server (tabla `usuarios` + `usuario_roles`).

   La cuenta vive en la base: sobrevive a reinicios y el DNI deja de servir como
   clave una vez que el alumno la cambio. Como el resto de la autenticacion
   (verifyToken, refresh, logout) todavia lee el repositorio de usuarios en
   memoria, cada cuenta que se usa se refleja ahi con el id "sql-usr-<id>".
   Cuando se migre el modulo de identidad completo, este reflejo se elimina.

   Mismo contrato que cuentas.repository.mjs. */

import { userRepository } from "../../database/repositories/user.repository.mjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { consultar, enTransaccion } from "../../database/sqlserver/conexion.mjs";

const PREFIJO = "sql-usr-";

const SELECT_CUENTA = `
  SELECT u.id, u.escuela_id, u.nombre, u.apellido, u.dni, u.email, u.password_hash, u.activo,
         u.nombre_usuario, u.estudiante_id, u.debe_cambiar_password, u.password_actualizada_en,
         u.ultimo_acceso, u.creado_en, u.actualizado_en
  FROM dbo.usuarios u
  WHERE u.estudiante_id IS NOT NULL`;

const COLUMNAS = {
  username: "nombre_usuario",
  passwordHash: "password_hash",
  mustChangePassword: "debe_cambiar_password",
  passwordChangedAt: "password_actualizada_en",
  lastLoginAt: "ultimo_acceso",
  isActive: "activo"
};

const idSql = (id) => Number(String(id).replace(PREFIJO, ""));
const momento = (valor) => (valor instanceof Date ? valor.toISOString() : valor ?? null);

function cuentaDesdeFila(fila) {
  const studentId = String(fila.estudiante_id);
  return {
    id: `${PREFIJO}${fila.id}`,
    email: fila.email ?? null,
    username: fila.nombre_usuario,
    studentId,
    dni: fila.dni,
    nombre: fila.nombre,
    apellido: fila.apellido,
    displayName: `${fila.nombre} ${fila.apellido}`,
    passwordHash: fila.password_hash,
    mustChangePassword: Boolean(fila.debe_cambiar_password),
    passwordChangedAt: momento(fila.password_actualizada_en),
    lastLoginAt: momento(fila.ultimo_acceso),
    isActive: Boolean(fila.activo),
    assignments: [{ role: ROLES.ALUMNO, schoolId: String(fila.escuela_id), studentId }],
    createdAt: momento(fila.creado_en),
    updatedAt: momento(fila.actualizado_en)
  };
}

/* Deja la cuenta en el repositorio en memoria para que verifyToken la encuentre. */
function reflejar(cuenta) {
  if (!cuenta) return null;
  const { id, ...datos } = cuenta;
  return userRepository.findById(id, { includeInactive: true })
    ? userRepository.update(id, datos)
    : userRepository.create(cuenta);
}

const cuentasRepositorySqlServer = {
  motor: "sqlserver",

  async porUsuario(username) {
    const [fila] = await consultar(`${SELECT_CUENTA} AND u.nombre_usuario = @usuario`, { usuario: String(username).toLowerCase() });
    return fila ? reflejar(cuentaDesdeFila(fila)) : null;
  },

  async porAlumno(studentId) {
    const [fila] = await consultar(`${SELECT_CUENTA} AND u.estudiante_id = @estudiante`, { estudiante: Number(studentId) });
    return fila ? reflejar(cuentaDesdeFila(fila)) : null;
  },

  async crear(datos) {
    const asignacion = datos.assignments?.[0] ?? {};

    const id = await enTransaccion(async (ejecutar) => {
      const [fila] = await ejecutar(
        `INSERT INTO dbo.usuarios (escuela_id, nombre, apellido, dni, email, password_hash, activo,
                                   nombre_usuario, estudiante_id, debe_cambiar_password)
         OUTPUT INSERTED.id
         VALUES (@escuela, @nombre, @apellido, @dni, NULL, @hash, 1, @usuario, @estudiante, @debeCambiar)`,
        {
          escuela: Number(asignacion.schoolId),
          nombre: datos.nombre,
          apellido: datos.apellido,
          dni: datos.dni,
          hash: datos.passwordHash,
          usuario: datos.username.toLowerCase(),
          estudiante: Number(datos.studentId),
          debeCambiar: datos.mustChangePassword ? 1 : 0
        }
      );

      await ejecutar(
        `INSERT INTO dbo.usuario_roles (usuario_id, rol_id, escuela_id)
         SELECT @usuario, r.id, @escuela FROM dbo.roles r WHERE r.codigo = 'alumno'`,
        { usuario: fila.id, escuela: Number(asignacion.schoolId) }
      );

      return fila.id;
    });

    const [fila] = await consultar(`${SELECT_CUENTA} AND u.id = @id`, { id });
    return reflejar(cuentaDesdeFila(fila));
  },

  async actualizar(id, cambios) {
    const asignaciones = [];
    const parametros = { id: idSql(id) };

    for (const [campo, columna] of Object.entries(COLUMNAS)) {
      if (cambios[campo] === undefined) continue;
      let valor = cambios[campo];
      if (typeof valor === "boolean") valor = valor ? 1 : 0;
      if (campo === "username") valor = String(valor).toLowerCase();
      if (/At$/.test(campo) && valor) valor = new Date(valor);
      asignaciones.push(`${columna} = @${campo}`);
      parametros[campo] = valor;
    }

    if (asignaciones.length) {
      await consultar(`UPDATE dbo.usuarios SET ${asignaciones.join(", ")}, actualizado_en = SYSDATETIME() WHERE id = @id`, parametros);
    }

    const [fila] = await consultar(`${SELECT_CUENTA} AND u.id = @id`, { id: idSql(id) });
    return reflejar(cuentaDesdeFila(fila));
  },

  async listarCuentasDeAlumnos() {
    return (await consultar(SELECT_CUENTA)).map(cuentaDesdeFila);
  }
};

export default cuentasRepositorySqlServer;
