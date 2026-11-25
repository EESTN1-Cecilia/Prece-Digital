/* Prepara el proyecto despues de clonarlo. Corre solo con `npm install`
   (postinstall) y se puede repetir con `npm run setup`.

   - Verifica la version de Node.
   - Crea los .env que falten a partir de los .env.example (nunca pisa uno existente).
   - Al crear Backend/.env: si hay un MySQL escuchando en localhost:3306 (XAMPP),
     lo usa como base (DB_CLIENT=mysql, usuario root sin clave); si no, la API
     queda en memoria y arranca igual. */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NODE_MINIMO = 20;

const mayor = Number(process.versions.node.split(".")[0]);
if (mayor < NODE_MINIMO) {
  console.error(`[setup] Se necesita Node ${NODE_MINIMO} o mas (tenes ${process.versions.node}). Descargar de https://nodejs.org`);
  process.exit(1);
}

function puertoAbierto(puerto, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port: puerto, host });
    socket.setTimeout(800);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
  });
}

/* Cambia o agrega VARIABLE=valor en el texto de un .env. */
export function fijarVariable(texto, nombre, valor) {
  const linea = new RegExp(`^${nombre}=.*$`, "m");
  return linea.test(texto) ? texto.replace(linea, `${nombre}=${valor}`) : `${texto.trimEnd()}\n${nombre}=${valor}\n`;
}

const archivos = ["Backend", "Frontend/web", "Frontend/mobile"];

for (const carpeta of archivos) {
  const ejemplo = join(raiz, carpeta, ".env.example");
  const destino = join(raiz, carpeta, ".env");
  if (!existsSync(ejemplo) || existsSync(destino)) continue;

  copyFileSync(ejemplo, destino);
  console.log(`[setup] Creado ${carpeta}/.env`);

  if (carpeta === "Backend") {
    if (await puertoAbierto(3306)) {
      let texto = readFileSync(destino, "utf8");
      for (const [nombre, valor] of [["DB_CLIENT", "mysql"], ["DB_PORT", "3306"], ["DB_USER", "root"], ["DB_PASSWORD", ""]]) {
        texto = fijarVariable(texto, nombre, valor);
      }
      writeFileSync(destino, texto);
      console.log("[setup] MySQL detectado en localhost:3306 (XAMPP): los datos se guardan en la base prece_digital.");
    } else {
      console.log("[setup] No hay MySQL en localhost:3306: la API usa datos en memoria (se pierden al reiniciar).");
      console.log("[setup] Para guardar en la base: iniciar MySQL en XAMPP y poner DB_CLIENT=mysql y DB_USER=root en Backend/.env.");
    }
  }
}

console.log("[setup] Listo. Para arrancar: npm run dev  (API http://localhost:3000, web http://localhost:5173)");
