export const PAISES_LUGAR_NACIMIENTO = [
  "Argentina",
  "Bolivia",
  "Brasil",
  "Chile",
  "Paraguay",
  "Uruguay",
  "Otro"
];

export const PROVINCIAS_ARGENTINAS = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán"
];

export function esNombrePersona(valor) {
  const nombre = String(valor ?? "").trim();
  return nombre.length >= 2 && nombre.length <= 100 &&
    /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*\.?$/u.test(nombre);
}

export function esDniValido(valor) {
  return /^\d{7,9}$/.test(String(valor ?? ""));
}

export function esCuilValido(valor) {
  const cuil = String(valor ?? "");
  if (!/^\d{11}$/.test(cuil)) return false;
  if (![20, 23, 24, 27].includes(Number(cuil.slice(0, 2)))) return false;

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = [...cuil.slice(0, 10)].reduce((total, digito, indice) => total + Number(digito) * pesos[indice], 0);
  const control = 11 - (suma % 11);
  const digitoControl = control === 11 ? 0 : control === 10 ? 9 : control;
  return digitoControl === Number(cuil[10]);
}

export function esDatoGeograficoValido(valor) {
  const texto = String(valor ?? "").trim();
  return texto.length > 0 && texto.length <= 100 &&
    /\p{L}/u.test(texto) &&
    /^[\p{L}\p{M}\d][\p{L}\p{M}\d .,'’()-]*$/u.test(texto);
}

export function esLugarNacimientoValido({ pais, provincia, distrito, localidad } = {}) {
  if (![pais, provincia, distrito, localidad].every(esDatoGeograficoValido)) return false;

  const normalizar = (valor) => String(valor).normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
  const paisNormalizado = normalizar(pais);
  const provinciaNormalizada = normalizar(provincia);
  const paisValido = PAISES_LUGAR_NACIMIENTO.some((opcion) => normalizar(opcion) === paisNormalizado);
  const esProvinciaArgentina = PROVINCIAS_ARGENTINAS.some((opcion) => normalizar(opcion) === provinciaNormalizada);

  return paisValido && (paisNormalizado === "argentina" ? esProvinciaArgentina : !esProvinciaArgentina);
}
