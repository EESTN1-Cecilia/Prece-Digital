/* Arma el documento A4 de un informe: encabezado institucional, bloque de
   metadatos, contenido y pie con paginacion.

   Todo se dibuja con operadores PDF sobre una hoja de 595.28 x 841.89 puntos
   (A4). El lienzo mantiene la posicion vertical y salta de pagina cuando un
   bloque no entra. */

import { anchoTexto, construirPdf, escaparTextoPdf, fuenteSegun, partirLineas } from "./pdf.mjs";
import { parsearBloques } from "./bloques.mjs";

const A4 = { ancho: 595.28, alto: 841.89 };
const MARGEN = 56.7;
const ANCHO_UTIL = A4.ancho - MARGEN * 2;
const PIE_RESERVADO = 62;

const COLOR = {
  texto: { r: 0.12, g: 0.16, b: 0.21, hex: "#1F2937" },
  suave: { r: 0.39, g: 0.45, b: 0.52, hex: "#64748B" },
  primario: { r: 0.15, g: 0.39, b: 0.92, hex: "#2563EB" },
  borde: { r: 0.89, g: 0.91, b: 0.94, hex: "#E2E8F0" },
  fondo: { r: 0.94, g: 0.96, b: 1, hex: "#EFF6FF" }
};

function colorRgb(color) {
  return `${color.r} ${color.g} ${color.b}`;
}

function crearLienzo() {
  const paginas = [];
  let ops = null;
  let cursor = 0;

  function asegurarPagina() {
    if (!ops) {
      ops = [];
      paginas.push(ops);
      cursor = A4.alto - MARGEN;
    }
    return ops;
  }

  function saltarSiNoEntra(altoNecesario) {
    asegurarPagina();

    if (cursor - altoNecesario < MARGEN + PIE_RESERVADO) {
      ops = null;
      asegurarPagina();
      return true;
    }

    return false;
  }

  function bajar(cantidad) {
    cursor -= cantidad;
  }

  return {
    paginas: () => paginas,
    cursor: () => cursor,
    asegurarPagina,
    saltarSiNoEntra,
    bajar,

    texto(contenido, { tamano = 10.5, estilo = {}, x = MARGEN, alineacion = "izquierda", ancho = ANCHO_UTIL, color = COLOR.texto, y = null } = {}) {
      if (!contenido) {
        return;
      }

      const destino = y ?? cursor;
      const fuente = fuenteSegun(estilo);
      const medida = anchoTexto(contenido, tamano, Boolean(estilo.negrita));
      let posX = x;

      if (alineacion === "centro") {
        posX = x + (ancho - medida) / 2;
      } else if (alineacion === "derecha") {
        posX = x + ancho - medida;
      }

      asegurarPagina().push(
        `BT /${fuente.codigo} ${tamano} Tf ${colorRgb(color)} rg 1 0 0 1 ${posX.toFixed(2)} ${destino.toFixed(2)} Tm (${escaparTextoPdf(contenido)}) Tj ET`
      );
    },

    /* Escribe una secuencia de fragmentos con estilos distintos en una misma
       linea (negrita, cursiva, subrayado mezclados). */
    fragmentos(fragmentos, { tamano = 10.5, x = MARGEN, color = COLOR.texto, y = null } = {}) {
      const utiles = fragmentos.filter((fragmento) => fragmento.texto);

      if (!utiles.length) {
        return;
      }

      const destino = y ?? cursor;
      const partes = [`BT 1 0 0 1 ${x.toFixed(2)} ${destino.toFixed(2)} Tm ${colorRgb(color)} rg`];

      utiles.forEach((fragmento, indice) => {
        const fuente = fuenteSegun(fragmento);
        partes.push(`/${fuente.codigo} ${tamano} Tf`);
        const texto = indice === utiles.length - 1 ? fragmento.texto : `${fragmento.texto} `;
        partes.push(`(${escaparTextoPdf(texto)}) Tj`);
      });

      partes.push("ET");
      asegurarPagina().push(partes.join(" "));
    },

    rectangulo(x, y, ancho, alto, color) {
      asegurarPagina().push(`${colorRgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${ancho.toFixed(2)} ${alto.toFixed(2)} re f`);
    },

    linea(x1, y1, x2, y2, color = COLOR.borde, grosor = 0.8) {
      asegurarPagina().push(
        `${colorRgb(color)} RG ${grosor} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
      );
    }
  };
}

function fechaLarga(iso) {
  const fecha = iso ? new Date(iso) : new Date();

  if (Number.isNaN(fecha.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(fecha);
}

/* Parte una lista de fragmentos con estilos en lineas que entran en el ancho. */
function ajustarFragmentos(fragmentos, ancho, tamano) {
  const palabras = [];

  for (const fragmento of fragmentos) {
    const trozos = String(fragmento.texto).split(/\s+/).filter(Boolean);

    trozos.forEach((trozo, indice) => {
      palabras.push({
        texto: trozo,
        estilo: fragmento,
        espacio: indice < trozos.length - 1 || fragmento.espacio === true
      });
    });
  }

  const lineas = [];
  let actual = [];
  let medida = 0;

  for (const palabra of palabras) {
    const anchoPalabra = anchoTexto(palabra.texto, tamano, Boolean(palabra.estilo.negrita));
    const anchoEspacio = anchoTexto(" ", tamano, Boolean(palabra.estilo.negrita));

    if (actual.length && medida + anchoPalabra > ancho) {
      lineas.push(actual);
      actual = [];
      medida = 0;
    }

    actual.push(palabra);
    medida += anchoPalabra + (palabra.espacio ? anchoEspacio : 0);
  }

  if (actual.length) {
    lineas.push(actual);
  }

  return lineas.length ? lineas : [[]];
}

function dibujarEncabezado(lienzo, institucion) {
  lienzo.texto(institucion.nombre, {
    tamano: 12.5,
    estilo: { negrita: true },
    alineacion: "centro",
    color: COLOR.texto
  });
  lienzo.bajar(14);

  lienzo.texto(institucion.dependencia, {
    tamano: 9.5,
    estilo: { cursiva: true },
    alineacion: "centro",
    color: COLOR.suave
  });
  lienzo.bajar(13);

  const ciclo = institucion.cicloLectivo ? `Ciclo Lectivo ${institucion.cicloLectivo}` : "";
  const turno = institucion.turnoActivo ? "Turno Activo" : "";
  const linea = [ciclo, turno].filter(Boolean).join(" · ");

  if (linea) {
    lienzo.texto(linea, {
      tamano: 9,
      alineacion: "centro",
      color: COLOR.suave
    });
    lienzo.bajar(12);
  }

  lienzo.linea(MARGEN, lienzo.cursor(), A4.ancho - MARGEN, lienzo.cursor(), COLOR.primario, 1.1);
  lienzo.bajar(22);
}

function dibujarMetadatos(lienzo, informe, institucion) {
  const titulo = informe.titulo || "Informe sin título";

  const lineasTitulo = partirLineas(titulo, ANCHO_UTIL, 15, true);
  lineasTitulo.forEach((linea, indice) => {
    lienzo.texto(linea, {
      tamano: 15,
      estilo: { negrita: true },
      alineacion: indice === 0 ? "centro" : "izquierda",
      ancho: ANCHO_UTIL,
      x: indice === 0 ? MARGEN : MARGEN + (ANCHO_UTIL - anchoTexto(linea, 15, true)) / 2
    });
    lienzo.bajar(19);
  });

  lienzo.bajar(6);

  const campos = [
    ["Asunto", informe.asunto],
    ["Dirigido a", informe.dirigidoA],
    ["Autor", [informe.autor, informe.autorCargo].filter(Boolean).join(" · ")],
    ["Fecha", fechaLarga(informe.actualizadoEn ?? informe.creadoEn)]
  ].filter(([, valor]) => Boolean(valor));

  if (campos.length) {
    lienzo.rectangulo(MARGEN, lienzo.cursor() - 8, ANCHO_UTIL, campos.length * 15 + 10, COLOR.fondo);
    lienzo.bajar(2);

    campos.forEach(([etiqueta, valor]) => {
      lienzo.texto(`${etiqueta}:`, {
        tamano: 9.5,
        estilo: { negrita: true },
        x: MARGEN + 10,
        ancho: 110,
        color: COLOR.primario
      });
      lienzo.texto(valor, {
        tamano: 9.5,
        x: MARGEN + 125,
        ancho: ANCHO_UTIL - 135,
        color: COLOR.texto
      });
      lienzo.bajar(15);
    });

    lienzo.bajar(8);
  }
}

function dibujarBloques(lienzo, bloques) {
  for (const bloque of bloques) {
    if (bloque.tipo === "titulo") {
      const nivel = Math.min(Math.max(bloque.nivel || 1, 1), 3);
      const tamano = nivel === 1 ? 13 : nivel === 2 ? 11.5 : 10.8;
      const lineas = partirLineas(bloque.runs.map((run) => run.texto).join(""), ANCHO_UTIL, tamano, true);

      lienzo.saltarSiNoEntra(lineas.length * (tamano + 6) + 14);
      lienzo.bajar(8);
      lineas.forEach((linea) => {
        lienzo.texto(linea, { tamano, estilo: { negrita: true }, color: COLOR.texto });
        lienzo.bajar(tamano + 5);
      });
      lienzo.bajar(4);
      continue;
    }

    if (bloque.tipo === "parrafo" || bloque.tipo === "cita") {
      const sangria = bloque.tipo === "cita" ? 16 : 0;
      const ancho = ANCHO_UTIL - sangria;
      const lineas = ajustarFragmentos(bloque.runs, ancho, 10.5);

      lienzo.saltarSiNoEntra(lineas.length * 15 + 8);
      lineas.forEach((linea) => {
        lienzo.fragmentos(linea, { tamano: 10.5, x: MARGEN + sangria });
        lienzo.bajar(15);
      });

      if (bloque.tipo === "cita") {
        lienzo.bajar(4);
      } else {
        lienzo.bajar(7);
      }
      continue;
    }

    if (bloque.tipo === "lista") {
      const elementos = bloque.items?.length ? bloque.items : [];

      elementos.forEach((item, indice) => {
        const prefijo = bloque.ordenada ? `${indice + 1}.` : "•";
        const lineas = ajustarFragmentos(item, ANCHO_UTIL - 22, 10.5);

        lienzo.saltarSiNoEntra(lineas.length * 15 + 4);
        lienzo.texto(prefijo, { tamano: 10.5, x: MARGEN + 6, ancho: 16, color: COLOR.primario });
        lineas.forEach((linea, indiceLinea) => {
          lienzo.fragmentos(linea, { tamano: 10.5, x: MARGEN + 22 });
          lienzo.bajar(15);
          if (indiceLinea < lineas.length - 1) {
            /* La continuacion de una linea se corre a la izquierda de la viñeta. */
          }
        });
        lienzo.bajar(2);
      });

      lienzo.bajar(6);
      continue;
    }

    if (bloque.tipo === "tabla") {
      dibujarTabla(lienzo, bloque.filas ?? []);
      lienzo.bajar(10);
      continue;
    }

    if (bloque.tipo === "separador") {
      lienzo.saltarSiNoEntra(14);
      lienzo.linea(MARGEN, lienzo.cursor(), A4.ancho - MARGEN, lienzo.cursor(), COLOR.borde, 0.8);
      lienzo.bajar(14);
    }
  }
}

function dibujarTabla(lienzo, filas) {
  if (!filas.length) {
    return;
  }

  const columnas = Math.max(...filas.map((fila) => fila.length), 1);
  const anchoColumna = ANCHO_UTIL / columnas;

  filas.forEach((fila) => {
    const celdas = fila.map((celda) => ({
      texto: String(celda.texto ?? "").trim(),
      encabezado: Boolean(celda.encabezado)
    }));

    while (celdas.length < columnas) {
      celdas.push({ texto: "", encabezado: false });
    }

    const lineasPorCelda = celdas.map((celda) =>
      partirLineas(celda.texto, anchoColumna - 12, celda.encabezado ? 9 : 9.5, celda.encabezado)
    );
    const altoFila = Math.max(...lineasPorCelda.map((lineas) => lineas.length), 1) * 12 + 8;
    const encabezado = celdas.some((celda) => celda.encabezado);

    lienzo.saltarSiNoEntra(altoFila + 2);

    const base = lienzo.cursor();
    lienzo.rectangulo(MARGEN, base - altoFila + 6, ANCHO_UTIL, altoFila, encabezado ? COLOR.fondo : { r: 1, g: 1, b: 1 });

    celdas.forEach((celda, indice) => {
      const x = MARGEN + indice * anchoColumna + 6;
      lineasPorCelda[indice].forEach((linea, indiceLinea) => {
        lienzo.texto(linea, {
          tamano: celda.encabezado ? 9 : 9.5,
          estilo: celda.encabezado ? { negrita: true } : {},
          x,
          ancho: anchoColumna - 12,
          color: encabezado ? COLOR.primario : COLOR.texto,
          y: base - 10 - indiceLinea * 12
        });
      });
    });

    lienzo.linea(MARGEN, base - altoFila + 6, A4.ancho - MARGEN, base - altoFila + 6, COLOR.borde, 0.6);
    lienzo.bajar(altoFila);
  });

  lienzo.linea(MARGEN, lienzo.cursor(), A4.ancho - MARGEN, lienzo.cursor(), COLOR.borde, 0.6);
}

function dibujarPie(lienzo, institucion, indice, total) {
  const paginas = lienzo.paginas();
  const ops = paginas[indice];
  const y = MARGEN + 22;

  ops.push(`${colorRgb(COLOR.borde)} RG 0.8 w ${MARGEN.toFixed(2)} ${(y + 12).toFixed(2)} m ${(A4.ancho - MARGEN).toFixed(2)} ${(y + 12).toFixed(2)} l S`);

  const izquierda = institucion.nombre;
  ops.push(
    `BT /F1 8.5 Tf ${colorRgb(COLOR.suave)} rg 1 0 0 1 ${MARGEN.toFixed(2)} ${y.toFixed(2)} Tm (${escaparTextoPdf(izquierda)}) Tj ET`
  );

  const paginaTexto = `Página ${indice + 1} de ${total}`;
  const xDerecha = A4.ancho - MARGEN - anchoTexto(paginaTexto, 8.5);
  ops.push(
    `BT /F1 8.5 Tf ${colorRgb(COLOR.suave)} rg 1 0 0 1 ${xDerecha.toFixed(2)} ${y.toFixed(2)} Tm (${escaparTextoPdf(paginaTexto)}) Tj ET`
  );
}

export function generarDocumentoPdf({ informe, institucion }) {
  const lienzo = crearLienzo();
  const bloques = parsearBloques(informe.contenido ?? "");

  lienzo.asegurarPagina();
  dibujarEncabezado(lienzo, institucion);
  dibujarMetadatos(lienzo, informe, institucion);
  dibujarBloques(lienzo, bloques);

  const paginas = lienzo.paginas();
  paginas.forEach((_, indice) => dibujarPie(lienzo, institucion, indice, paginas.length));

  return construirPdf({
    paginas,
    titulo: informe.titulo || "Informe",
    autor: [informe.autor, informe.autorCargo].filter(Boolean).join(" · "),
    asunto: informe.asunto || "Informe de Dirección",
    creador: "Prece Digital"
  });
}
