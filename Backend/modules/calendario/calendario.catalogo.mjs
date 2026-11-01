/* Fechas de arranque del ciclo lectivo 2026 (Provincia de Buenos Aires).

   IMPORTANTE: estas fechas NO se leyeron de abc.gob.ar (el sitio no estuvo
   accesible al construir el modulo). Vienen de una nota periodistica que cita
   la Resolucion 6568/2025 y de la Ley 27.399 (feriados). Por eso entran como
   "pendiente": no disparan avisos hasta que alguien autorizado las contraste
   con la fuente oficial (POST /calendario/eventos/:id/verificar) o la
   actualizacion automatica las confirme desde el sitio oficial.

   No hay fechas del Calendario de Actividades Docentes 2026: no se pudo
   acceder al documento y no se inventan. */

const PAGINA_OFICIAL = "https://abc.gob.ar/calendario_escolar";
const NOTA = "Referencia periodistica (cita Res. 6568/2025). Contrastar con abc.gob.ar";
const LEY = "Ley 27.399 (feriados nacionales inamovibles). Contrastar con fuente oficial";

const e = (clave, titulo, categoria, fechaInicio, fechaFin, descripcion, fuente, urlReferencia) => ({
  clave, titulo, categoria, fechaInicio, fechaFin, descripcion, fuente, urlReferencia, ambito: "general", anioLectivo: 2026
});

export const EVENTOS_INICIALES = [
  e("inicio-clases", "Inicio de clases", "inicio_fin_clases", "2026-03-02", null, "Comienzan las clases en Secundaria.", NOTA, PAGINA_OFICIAL),
  e("receso-invernal", "Receso invernal", "receso", "2026-07-20", "2026-07-31", "Receso escolar de invierno.", NOTA, PAGINA_OFICIAL),
  e("fin-clases", "Finalizacion de clases", "inicio_fin_clases", "2026-12-22", null, "Ultimo dia de clases del ciclo lectivo.", NOTA, PAGINA_OFICIAL),
  e("feriado-carnaval-1", "Carnaval", "feriado", "2026-02-16", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-carnaval-2", "Carnaval", "feriado", "2026-02-17", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-memoria", "Dia de la Memoria por la Verdad y la Justicia", "feriado", "2026-03-24", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-malvinas", "Dia del Veterano y de los Caidos en Malvinas", "feriado", "2026-04-02", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-viernes-santo", "Viernes Santo", "feriado", "2026-04-03", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-trabajo", "Dia del Trabajador", "feriado", "2026-05-01", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-revolucion-mayo", "Revolucion de Mayo", "feriado", "2026-05-25", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-belgrano", "Paso a la Inmortalidad del General Manuel Belgrano", "feriado", "2026-06-20", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-independencia", "Dia de la Independencia", "feriado", "2026-07-09", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-inmaculada", "Inmaculada Concepcion de Maria", "feriado", "2026-12-08", null, "Feriado nacional. Sin actividad escolar.", LEY, null),
  e("feriado-navidad", "Navidad", "feriado", "2026-12-25", null, "Feriado nacional. Sin actividad escolar.", LEY, null)
];
