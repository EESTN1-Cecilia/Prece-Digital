import { spawn } from "node:child_process";

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

const apiProcess = npmProcess(["run", "dev", "-w", "@prece-digital/api"]);
const webProcess = npmProcess(["run", "dev", "-w", "@prece-digital/web"]);

const processes = [
  {
    name: "api",
    ...apiProcess
  },
  {
    name: "web",
    ...webProcess
  }
];

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
