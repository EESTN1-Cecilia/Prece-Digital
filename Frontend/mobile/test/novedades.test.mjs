import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armarActividad, base64ABytes, construirPublicaciones, leerDataUrl, nombreSeguro, paginar, PUBLICACIONES_FIJAS } from "../src/utils/novedades.js";

describe("novedades", () => {
  it("pone los informes de Dirección antes de los avisos fijos", () => {
    const todas = construirPublicaciones([{ id: "i1", titulo: "Acto", texto: "x", fecha: "2026-05-01", archivo: { nombre: "a.pdf", descargable: true } }]);
    assert.equal(todas[0].id, "i1");
    assert.equal(todas[0].categoria, "Comunicado Oficial");
    assert.equal(todas.length, 1 + PUBLICACIONES_FIJAS.length);
    assert.ok(construirPublicaciones([], "Preceptoría").every((p) => p.area === "Preceptoría"));
    assert.equal(construirPublicaciones(null).length, PUBLICACIONES_FIJAS.length);
  });

  it("pagina de a 3 sin salirse de rango", () => {
    const lista = construirPublicaciones([]);
    assert.equal(paginar(lista, 0).items.length, 3);
    assert.equal(paginar(lista, 0).total, 2);
    assert.equal(paginar(lista, 99).pagina, 1);
    assert.equal(paginar([], 0).total, 1);
  });

  it("arma la actividad ordenada por fecha con notas e inasistencias", () => {
    const boletin = { materias: [{ materiaId: 1, materia: "Matemática", periodos: { c1: { resultado: { fecha: "2026-04-10T00:00:00Z", valor: 5, estado: "debajo_de_6", tipoEvaluacion: "parcial_1" } }, c2: {} } }] };
    const asistencias = { detalle: [{ fecha: "2026-05-02", tipo: "ausente", tipoEtiqueta: "Ausente", justificacion: "justificada", justificacionEtiqueta: "Justificada" }] };
    const items = armarActividad(boletin, asistencias);
    assert.equal(items.length, 2);
    assert.equal(items[0].destino, "asistencias");
    assert.equal(items[1].marca.etiqueta, "Menor a 6");
    assert.equal(items[1].titulo, "Matemática: 5");
  });

  it("lee data URLs y decodifica base64", () => {
    const d = leerDataUrl("data:text/plain;base64,SG9sYQ==");
    assert.equal(d.mime, "text/plain");
    assert.equal(Buffer.from(base64ABytes(d.base64)).toString(), "Hola");
    assert.equal(leerDataUrl("javascript:alert(1)"), null);
    assert.equal(leerDataUrl(undefined), null);
    assert.deepEqual([...base64ABytes("AAEC")], [0, 1, 2]);
  });

  it("limpia nombres de adjuntos", () => {
    assert.equal(nombreSeguro("../../etc/passwd"), "passwd");
    assert.equal(nombreSeguro("a<b>.pdf"), "a_b_.pdf");
    assert.equal(nombreSeguro(""), "adjunto");
    assert.equal(nombreSeguro("..oculto"), "oculto");
  });
});
