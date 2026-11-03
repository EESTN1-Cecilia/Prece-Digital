import { spawn } from "node:child_process";
import net from "node:net";

function npmProcess(args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", ["npm", ...args].join(" ")]
    };
  }

  return {
    command: "npm",
    args
  };
}

/* Devuelve true si el puerto ya esta ocupado (por ejemplo, la API ya corre en
   otra terminal). Evita el error EADDRINUSE al volver a levantarla. */
function puertoOcupado(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", (error) => resolve(error.code === "EADDRINUSE"));
    probe.once("listening", () => probe.close(() => resolve(false)));
    probe.listen(port);
  });
}

const apiPort = Number(process.env.API_PORT || process.env.PORT || 3000);
const apiYaCorre = await puertoOcupado(apiPort);

const processes = [];

if (apiYaCorre) {
  console.log(`La API ya esta corriendo en el puerto ${apiPort}: se levanta solo la web.`);
} else {
  processes.push({
    name: "api",
    ...npmProcess(["run", "dev", "-w", "@prece-digital/api"])
  });
}

processes.push({
  name: "web",
  ...npmProcess(["run", "dev", "-w", "@prece-digital/web"])
});

for (const processConfig of processes) {
  const child = spawn(processConfig.command, processConfig.args, {
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${processConfig.name} finalizo con codigo ${code}`);
    }
  });

  child.on("error", (error) => {
    console.error(`No se pudo iniciar ${processConfig.name}: ${error.message}`);
  });
}
