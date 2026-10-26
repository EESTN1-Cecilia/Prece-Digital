/* Identidad institucional delestablecimiento.

   La usan el encabezado del panel de Direccion y el modulo de Informes (encabezado
   del documento, pie de pagina y metadatos). Vive en el backend para que el
   nombre de la institucion y el ciclo lectivo tengan una sola fuente: el
   frontend no los escribe a mano.

   Los valores por defecto son los que el sistema ya usaba; se pueden ajustar
   por entorno (INSTITUCION_NOMBRE, INSTITUCION_DEPENDENCIA, CICLO_LECTIVO)
   sin tocar el codigo. */

const cicloDelReloj = () => {
  const anio = new Date().getFullYear();
  return Number.isInteger(anio) && anio > 2000 ? anio : null;
};

export function institucionConfig() {
  const ciclo = Number.parseInt(process.env.CICLO_LECTIVO ?? "", 10);

  return {
    nombre: process.env.INSTITUCION_NOMBRE ?? "E.E.S.T N°1 Monte Grande",
    dependencia: process.env.INSTITUCION_DEPENDENCIA ?? "Dirección General",
    /* Emblema institucional. Vive en el carpeta publica del frontend web, asi
       que se referencia con la ruta publica de la aplicacion (no con una ruta
       del sistema de archivos). Si no hay recurso, la vista muestra el nombre
       y omite el logo (no se dibuja un logo inventado). */
    logo: process.env.INSTITUCION_LOGO ?? "/logo_vertical.jpg",
    cicloLectivo: Number.isInteger(ciclo) && ciclo > 2000 ? ciclo : (cicloDelReloj() ?? new Date().getFullYear()),
    turnoActivo: true
  };
}
