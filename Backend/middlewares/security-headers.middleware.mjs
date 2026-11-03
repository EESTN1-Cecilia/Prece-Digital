import { appConfig } from "../config/app.config.mjs";

/* Headers de seguridad de todas las respuestas. La API solo devuelve datos, por
   eso la CSP no permite cargar nada, y no-store evita cachear datos personales. */
export function applySecurityHeaders(response, env = appConfig.env) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cache-Control", "no-store");

  if (env === "production") {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}
