/* Zip minimo (sin compresion) para armar archivos .xlsx sin librerias.
   Recibe [{ nombre, datos: string | Uint8Array }] y devuelve un Uint8Array. */

const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = TABLA[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function crearZip(archivos) {
  const codificar = new TextEncoder();
  const partes = [];
  const central = [];
  let desplazamiento = 0;
  const hoy = new Date();
  const hora = (hoy.getHours() << 11) | (hoy.getMinutes() << 5) | (hoy.getSeconds() >> 1);
  const fecha = ((hoy.getFullYear() - 1980) << 9) | ((hoy.getMonth() + 1) << 5) | hoy.getDate();

  archivos.forEach(({ nombre, datos }) => {
    const nom = codificar.encode(nombre);
    const bytes = typeof datos === "string" ? codificar.encode(datos) : datos;
    const crc = crc32(bytes);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // sin compresion
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, nom.length, true);
    partes.push(new Uint8Array(local.buffer), nom, bytes);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(12, hora, true);
    dir.setUint16(14, fecha, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, bytes.length, true);
    dir.setUint32(24, bytes.length, true);
    dir.setUint16(28, nom.length, true);
    dir.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(dir.buffer), nom);
    desplazamiento += 30 + nom.length + bytes.length;
  });

  const tamanoCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, desplazamiento, true);

  const todo = [...partes, ...central, new Uint8Array(fin.buffer)];
  const salida = new Uint8Array(todo.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  todo.forEach((p) => {
    salida.set(p, pos);
    pos += p.length;
  });
  return salida;
}
