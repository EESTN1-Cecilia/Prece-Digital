export function requiereCambioInicial(usuario) {
  const obligatorio = process.env.ALUMNO_CAMBIO_CLAVE_OBLIGATORIO === "true"
    || process.env.NODE_ENV === "production";
  return obligatorio && Boolean(usuario?.mustChangePassword);
}
