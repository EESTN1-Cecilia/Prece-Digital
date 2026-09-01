import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const rootArg = process.argv[2] ?? "apps/web";
const port = Number.parseInt(process.argv[3] ?? process.env.WEB_PORT ?? "5173", 10);
const root = resolve(rootArg);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function resolveRequestPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = resolve(join(root, normalizedPath));

  if (!requestedPath.startsWith(root)) {
    return null;
  }

  return requestedPath;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const requestedPath = resolveRequestPath(url.pathname === "/" ? "/index.html" : url.pathname);

  if (!requestedPath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(requestedPath);

    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[extname(requestedPath)] ?? "application/octet-stream"
    });
    createReadStream(requestedPath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Web lista en http://localhost:${port}`);
});
