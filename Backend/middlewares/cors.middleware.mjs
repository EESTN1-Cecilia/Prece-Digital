export function applyCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
}
