import { createApp } from "./app.mjs";

const port = Number.parseInt(process.env.API_PORT ?? "3000", 10);
const server = createApp();

server.listen(port, () => {
  console.log(`API lista en http://localhost:${port}`);
});
