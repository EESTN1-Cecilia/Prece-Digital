# Informes (frontend)

Pantalla de informes de Dirección. Vive como pestaña dentro del panel de
Dirección (`modules/director/director-dashboard-view.js`), no como página
independiente.

## Archivos

- `informes-datos.js` → lógica pura: validación de metadatos, texto plano,
  conteo de palabras, nombre de archivo, esqueleto de plantilla y saneado del
  HTML. Se puede probar sin navegador.
- `informes-service.js` → adaptador de la API. La descarga del PDF se hace con
  `fetch` directo porque la respuesta es binaria y `pedir()` siempre
  interpreta el cuerpo como JSON.
- `informes-editor.js` → editor `contentEditable` con barra de formato de dos
  filas. Las acciones usan `document.execCommand` para no sumar una librería de
  editor al proyecto.
- `informes-view.js` → la pantalla: columna lateral (historial, plantillas,
  estado, acciones), fila de metadatos, hoja A4 y vista previa.

## Reglas

- El borrador vive en el navegador hasta que se guarda: elegir una plantilla
  no crea ningún registro.
- El contenido se guarda como HTML y el backend lo vuelve a sanear con su
  lista blanca; antes de mostrarlo, el cliente lo pasa por `saneaHtml`
  (misma lista blanca) para que la vista previa nunca muestre algo ejecutable.
- "Exportar PDF" guarda el borrador primero si todavía no tiene id, y después
  descarga el PDF que genera el servidor.
- Un informe `finalizado` no se puede dar de baja: el botón aparece solo en
  borradores.

## Limitaciones

- El pie de la hoja muestra "Página 1": la paginación real la calcula el
  generador de PDF del backend, no el navegador.
- La hoja A4 se dibuja con medidas fijas (`210mm` × `297mm`); en pantallas
  angostas se muestra en una sola columna con el ancho disponible.
- Las plantillas son un catálogo de estructuras: el frontend replica el
  esqueleto del backend (`contenidoDePlantilla`) para no obligar a guardar un
  informe vacío solo para ver la estructura.
