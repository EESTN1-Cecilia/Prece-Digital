# Informes (Dirección)

Módulo de redacción, historial y exportación de informes institucionales de
Dirección. El contenido se redacta en un editor enriquecido, se guarda como
HTML saneado, cada guardado deja una versión en el historial y el PDF lo arma
el servidor con la identidad institucional.

## Endpoints

- `GET /api/v1/reports/plantillas` → catálogo de plantillas institucionales (requiere `reports.read`)
- `GET /api/v1/reports` → listado con filtros `q`, `estado`, `plantilla`, `pagina`, `porPagina` (requiere `reports.read`)
- `POST /api/v1/reports` → alta de informe (requiere `reports.create`)
- `GET /api/v1/reports/:reportId` → consulta de un informe
- `PATCH /api/v1/reports/:reportId` → modificación (deja una versión nueva en el historial; requiere `reports.write`)
- `DELETE /api/v1/reports/:reportId` → baja lógica (requiere `reports.write`)
- `GET /api/v1/reports/:reportId/versiones` → historial de versiones guardadas
- `POST /api/v1/reports/:reportId/versiones/:versionId/restaurar` → restaura una versión (requiere `reports.write`)
- `GET /api/v1/reports/:reportId/pdf` → exporta el informe a PDF (requiere `reports.export`)

Los permisos viven en `Shared/src/domain.mjs` (`REPORTS_READ`, `REPORTS_CREATE`,
`REPORTS_WRITE`, `REPORTS_EXPORT`) y el admin y el director los tienen todos.

## Datos de un informe

`titulo`, `asunto`, `dirigidoA`, `autor`, `autorCargo`, `estado` (`borrador` o
`finalizado`), `plantilla` (id del catálogo o `null`) y `contenido` (HTML
saneado).

Las respuestas vienen envueltas en `{ data }`; el listado suma un objeto
hermano `paginacion` (`pagina`, `porPagina`, `total`, `totalPaginas`, `desde`,
`hasta`). Cada informe trae además `resumen` (texto plano recortado) y
`versiones[]` (`version`, `contenido`, `guardadoEn`, `guardadoPor`).

## Reglas de negocio

- El contenido se guarda **ya saneado**: pasa por la lista blanca de
  `sanitizar-html.mjs` antes de persistirse. Se permiten solo etiquetas de
  formato y tablas; los atributos `style`, `class` y `on*` se descartan y los
  enlaces solo se aceptan con esquema `http`, `https` o `mailto`.
- Cada guardado deja una versión con el estado anterior del documento, que se
  puede restaurar. Restaurar no borra la versión actual: agrega una nueva.
- La baja es lógica: el informe queda con `eliminadoEn` y deja de estar
  disponible, pero el registro se conserva.
- Solo el autor del informe o un rol de dirección (admin/director) puede
  modificarlo, restaurarlo o darle de baja.
- Un informe `finalizado` no se puede dar de baja (devuelve `409`).
- El título necesita al menos 3 caracteres y el contenido tiene un máximo de
  200.000 caracteres.

## Plantillas

El catálogo (`plantillas.mjs`) define cuatro estructuras de trabajo:
`institucional`, `academico`, `asistencia` y `personal`. Cada una trae sus
apartados (`secciones`) con título y guía de contenido. Los apartados
`resultados`, `detalle` y `distribucion` arrancan con una tabla de tres
columnas para cargar indicadores por división.

Cuando se crea un informe con `plantilla` y sin `contenido`, el backend arma
ese esqueleto; el frontend lo arma también en el navegador para no obligar a
guardar un informe vacío solo para ver la estructura.

## Exportación a PDF

El PDF se genera en el servidor (`pdf/`) sin dependencias externas: se escribe
a mano un documento PDF 1.4 con las fuentes base-14 (Helvetica), la tabla de
referencia cruzada (`xref`) y la identidad institucional de
`config/institucion.config.mjs`. La respuesta es binaria, con
`Content-Disposition: attachment` y el nombre del archivo normalizado (sin
acentos ni signos).

## Limitaciones

- El almacenamiento es en memoria (`database/memory-store.mjs`, prefijo `rep_`):
  al reiniciar el backend se pierden los informes. No hay migración SQL para
  este módulo todavía.
- El PDF se dibuja solo con texto y formas: no incrusta el escudo ni otras
  imágenes, y el encabezado lleva el nombre de la institución, la dependencia,
  el ciclo lectivo y el turno.
- Los bloques que no entran en la página saltan a la siguiente; las tablas se
  dibujan fila por fila, pero una fila larga no se parte entre páginas.
- El pie de página muestra "Página X de Y", que es la paginación real del
  documento exportado.
