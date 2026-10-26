import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTENIDO_MAXIMO,
  ESTADOS_INFORME,
  contarPalabras,
  contenidoDePlantilla,
  etiquetaEstado,
  fechaCorta,
  metadatosVacios,
  nombreDeArchivo,
  plantillaPorId,
  saneaHtml,
  textoPlano,
  tieneContenido,
  validarMetadatos
} from './informes-datos.js';

const PLANTILLA = {
  id: 'academico',
  nombre: 'Informe Académico',
  descripcion: 'Estructura para el seguimiento del cursado.',
  secciones: [
    { clave: 'datos', titulo: 'Datos generales', ayuda: 'Ciclo lectivo y divisiones analizadas.' },
    { clave: 'resultados', titulo: 'Resultados por división', ayuda: 'Tabla con los indicadores.' },
    { clave: 'conclusiones', titulo: 'Conclusiones', ayuda: 'Cierre y recomendaciones.' }
  ]
};

test('metadatosVacios devuelve un borrador sin contenido', () => {
  const metadatos = metadatosVacios();

  assert.equal(metadatos.titulo, '');
  assert.equal(metadatos.estado, 'borrador');
  assert.equal(metadatos.plantilla, null);
  assert.equal(metadatos.contenido, '');
});

test('validarMetadatos acepta un informe completo', () => {
  const { errores, datos } = validarMetadatos({
    titulo: 'Informe de asistencia',
    asunto: 'Primer trimestre',
    dirigidoA: 'Consejo de Dirección',
    autor: 'Ana Gómez',
    autorCargo: 'Directora',
    estado: 'finalizado',
    contenido: '<p>Contenido</p>'
  });

  assert.deepEqual(errores, {});
  assert.equal(datos.titulo, 'Informe de asistencia');
  assert.equal(datos.estado, 'finalizado');
});

test('validarMetadatos pide un titulo de al menos 3 caracteres', () => {
  const { errores } = validarMetadatos({ titulo: 'ab' });

  assert.ok(errores.titulo);
});

test('validarMetadatos rechaza un estado que no sea borrador ni finalizado', () => {
  const { errores } = validarMetadatos({ titulo: 'Informe válido', estado: 'publicado' });

  assert.ok(errores.estado);
});

test('validarMetadatos rechaza un contenido demasiado largo', () => {
  const { errores } = validarMetadatos({
    titulo: 'Informe válido',
    contenido: 'a'.repeat(CONTENIDO_MAXIMO + 1)
  });

  assert.ok(errores.contenido);
});

test('validarMetadatos recorta los espacios de los metadatos', () => {
  const { datos } = validarMetadatos({ titulo: '  Informe  ', autor: '  Ana  ' });

  assert.equal(datos.titulo, 'Informe');
  assert.equal(datos.autor, 'Ana');
});

test('textoPlano saca las etiquetas y deja el texto del informe', () => {
  const texto = textoPlano('<h2>Presentación</h2><p>Motivo del <strong>informe</strong>.</p>');

  assert.equal(texto, 'Presentación Motivo del informe.');
});

test('tieneContenido y contarPalabras distinguen un informe vacio de uno redactado', () => {
  assert.equal(tieneContenido(''), false);
  assert.equal(tieneContenido('<p></p>'), false);
  assert.equal(tieneContenido('<p>Hola</p>'), true);
  assert.equal(contarPalabras('<p>Hola</p><p>mundo entero</p>'), 3);
});

test('nombreDeArchivo deja un nombre sin acentos ni espacios', () => {
  assert.equal(nombreDeArchivo('Informe de Asistencia'), 'informe-de-asistencia');
  assert.equal(nombreDeArchivo('  '), 'informe');
});

test('plantillaPorId busca la plantilla del catalogo', () => {
  const plantillas = [PLANTILLA];

  assert.equal(plantillaPorId(plantillas, 'academico'), PLANTILLA);
  assert.equal(plantillaPorId(plantillas, 'inexistente'), null);
  assert.equal(plantillaPorId(plantillas, null), null);
});

test('fechaCorta muestra la fecha sin depender de la configuracion regional', () => {
  assert.equal(fechaCorta('2026-03-07T10:00:00.000Z'), '07/03/2026');
  assert.equal(fechaCorta(''), '—');
  assert.equal(fechaCorta('no-es-una-fecha'), '—');
});

test('etiquetaEstado dice siempre de que estado se trata', () => {
  assert.equal(etiquetaEstado('finalizado'), 'Finalizado');
  assert.equal(etiquetaEstado('borrador'), 'Borrador');
  assert.equal(etiquetaEstado('inventado'), 'Borrador');
  assert.deepEqual(ESTADOS_INFORME.map((opcion) => opcion.id), ['borrador', 'finalizado']);
});

test('contenidoDePlantilla arma un apartado por cada seccion de la plantilla', () => {
  const contenido = contenidoDePlantilla(PLANTILLA);

  assert.ok(contenido.includes('<h2>Datos generales</h2>'));
  assert.ok(contenido.includes('<p>Ciclo lectivo y divisiones analizadas.</p>'));
  assert.ok(contenido.includes('<h2>Conclusiones</h2>'));
});

test('contenidoDePlantilla agrega la tabla de indicadores donde corresponde', () => {
  const contenido = contenidoDePlantilla(PLANTILLA);

  assert.ok(contenido.includes('<table>'));
  assert.ok(contenido.includes('<th>División</th>'));
  assert.equal(contenido.match(/<table>/g).length, 1);
});

test('contenidoDePlantilla escapa los textos y no inventa secciones', () => {
  const contenido = contenidoDePlantilla({
    secciones: [{ clave: 'x', titulo: '<script>alert(1)</script>', ayuda: 'a & b' }]
  });

  assert.ok(!contenido.includes('<script>'));
  assert.ok(contenido.includes('&lt;script&gt;'));
  assert.ok(contenido.includes('a &amp; b'));
});

test('contenidoDePlantilla devuelve vacio cuando no hay plantilla', () => {
  assert.equal(contenidoDePlantilla(null), '');
  assert.equal(contenidoDePlantilla({ secciones: [] }), '');
});

test('saneaHtml elimina los scripts y su contenido', () => {
  const limpio = saneaHtml('<p>Texto</p><script>alert("hola")</script>');

  assert.ok(!limpio.includes('script'));
  assert.ok(!limpio.includes('alert'));
  assert.ok(limpio.includes('<p>Texto</p>'));
});

test('saneaHtml descarta los manejadores de eventos y los estilos', () => {
  const limpio = saneaHtml('<p onclick="robar()" style="color:red">Texto</p>');

  assert.ok(!limpio.includes('onclick'));
  assert.ok(!limpio.includes('style'));
  assert.equal(limpio, '<p>Texto</p>');
});

test('saneaHtml saca las etiquetas que no estan en la lista blanca', () => {
  const limpio = saneaHtml('<marquee>Hola</marquee><iframe src="x"></iframe>');

  assert.ok(!limpio.includes('marquee'));
  assert.ok(!limpio.includes('iframe'));
  assert.ok(limpio.includes('Hola'));
});

test('saneaHtml deja pasar solo los enlaces con esquema seguro', () => {
  assert.equal(saneaHtml('<a href="https://prece.local">Sitio</a>'), '<a href="https://prece.local">Sitio</a>');
  assert.ok(!saneaHtml('<a href="javascript:alert(1)">Sitio</a>').includes('javascript'));
});

test('saneaHtml conserva la estructura de una tabla de indicadores', () => {
  const limpio = saneaHtml(
    '<table><thead><tr><th>División</th></tr></thead><tbody><tr><td>1° A</td></tr></tbody></table>'
  );

  assert.ok(limpio.includes('<th>División</th>'));
  assert.ok(limpio.includes('<td>1° A</td>'));
});

test('saneaHtml cierra las etiquetas que quedaron abiertas', () => {
  const limpio = saneaHtml('<p>Sin cerrar');

  assert.equal(limpio, '<p>Sin cerrar</p>');
});
