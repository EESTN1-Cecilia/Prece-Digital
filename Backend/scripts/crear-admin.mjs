/* Crea una cuenta de administrador en las tablas relacionales (usuarios + usuario_roles).

   Uso (dentro del contenedor de la API):
     node scripts/crear-admin.mjs correo@dominio.com "Nombre y apellido"

   Genera una contrasena temporal, la muestra UNA vez en pantalla y guarda solo el hash.
   No toca ninguna otra cuenta. Despues hay que reiniciar la API para que la cargue
   (docker restart precedigital-api). */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { consultar, enTransaccion, cerrarPool } from "../database/sqlserver/conexion.mjs";

const [, , correo, ...resto] = process.argv;
const nombre = resto.join(" ").trim() || "Administrador";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

if (!correo || !EMAIL_RE.test(correo)) {
  console.error('Uso: node scripts/crear-admin.mjs correo@dominio.com "Nombre y apellido"');
  process.exit(1);
}

const email = correo.trim().toLowerCase();

try {
  const [existente] = await consultar("SELECT id FROM usuarios WHERE email = @email", { email });
  if (existente) {
    console.error(`Ya existe una cuenta con el correo ${email} (id ${existente.id}). No se modifico nada.`);
    process.exitCode = 2;
  } else {
    const [escuela] = await consultar("SELECT TOP 1 id FROM escuelas ORDER BY id");
    const [rol] = await consultar("SELECT id FROM roles WHERE codigo = N'system-admin'");
    if (!escuela || !rol) throw new Error("Falta la escuela o el rol system-admin en la base.");

    const password = crypto.randomBytes(12).toString("base64url");
    const hash = await bcrypt.hash(password, 10);
    const partes = nombre.split(" ");
    const [nombrePila, ...apellidos] = partes;

    const id = await enTransaccion(async (q) => {
      const [fila] = await q(`INSERT INTO usuarios (escuela_id, nombre, apellido, dni, email, password_hash, activo, debe_cambiar_password)
        OUTPUT inserted.id AS id
        VALUES (@escuela, @nombre, @apellido, @dni, @email, @hash, 1, 1)`, {
        escuela: escuela.id,
        nombre: nombrePila,
        apellido: apellidos.join(" ") || "-",
        dni: `SIN-${crypto.randomBytes(5).toString("hex")}`,
        email,
        hash
      });
      await q("INSERT INTO usuario_roles (usuario_id, rol_id, escuela_id, activo) VALUES (@usuario, @rol, @escuela, 1)",
        { usuario: fila.id, rol: rol.id, escuela: escuela.id });
      return fila.id;
    });

    console.log("");
    console.log("Administrador creado");
    console.log(`  Correo:     ${email}`);
    console.log(`  Contrasena: ${password}`);
    console.log(`  (id ${id}). Anotala ahora: no se vuelve a mostrar.`);
    console.log("  Reinicia la API para que la cuenta quede disponible: docker restart precedigital-api");
    console.log("");
  }
} catch (error) {
  console.error(`No se pudo crear el administrador: ${error.message}`);
  process.exitCode = 1;
} finally {
  await cerrarPool();
}
