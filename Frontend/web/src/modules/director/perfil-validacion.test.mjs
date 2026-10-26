import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DIAS_CURSADA,
  AREA_POR_DEFECTO,
  formularioSucio,
  formularioVacio,
  validarPerfil
} from './perfil-validacion.js';

const AREAS = ['docencia', 'direccion', 'secretaria', 'server', 'preceptoria'];

function perfilValido(extra = {}) {
  return {
    nombre: 'Ana',
    apellido: 'Gómez',
    email: 'Ana.Gomez@Prece.Local',
    dni: '30123456',
    telefono: '11 5555-0000',
    area: 'docencia',
    roles: ['docente'],
    materia: 'Matemática',
    situacion_revista: 'Titular',
    suplente_de: '',
    modulos: '4',
    dia: 'Lunes',
    hora_desde: '08:00',
    hora_hasta: '12:00',
    ...extra
  };
}

test('formularioVacio arranca con el area por defecto y sin roles', () => {
  const formulario = formularioVacio();

  assert.equal(formulario.area, AREA_POR_DEFECTO);
  assert.deepEqual(formulario.roles, []);
  assert.equal(formulario.nombre, '');
  assert.equal(formulario.email, '');
});

test('validarPerfil acepta un formulario completo y normaliza los datos', () => {
  const { errores, datos } = validarPerfil(perfilValido({ roles: ['docente', 'docente', 'preceptor'] }), AREAS);

  assert.deepEqual(errores, {});
  assert.equal(datos.email, 'ana.gomez@prece.local');
  assert.equal(datos.dni, '30123456');
  assert.deepEqual(datos.roles, ['docente', 'preceptor']);
});

test('validarPerfil exige nombre, apellido, correo, dni, area y al menos un rol', () => {
  const { errores } = validarPerfil(formularioVacio(), AREAS);

  assert.ok(errores.nombre);
  assert.ok(errores.apellido);
  assert.ok(errores.email);
  assert.ok(errores.dni);
  assert.ok(errores.roles);
});

test('validarPerfil rechaza un correo con formato invalido', () => {
  const { errores } = validarPerfil(perfilValido({ email: 'ana.gomez' }), AREAS);

  assert.ok(errores.email);
});

test('validarPerfil rechaza un dni que no tiene entre 7 y 9 digitos', () => {
  const { errores } = validarPerfil(perfilValido({ dni: '123' }), AREAS);

  assert.ok(errores.dni);
});

test('validarPerfil rechaza un area que no pertenece al catalogo institucional', () => {
  const { errores } = validarPerfil(perfilValido({ area: 'inventado' }), AREAS);

  assert.ok(errores.area);
});

test('validarPerfil no inventa el catalogo: sin areas de referencia solo exige que haya area', () => {
  const { errores } = validarPerfil(perfilValido({ area: 'inventado' }), []);

  assert.equal(errores.area, undefined);
});

test('validarPerfil rechaza un telefono con caracteres no permitidos', () => {
  const { errores } = validarPerfil(perfilValido({ telefono: 'llamar al 11' }), AREAS);

  assert.ok(errores.telefono);
});

test('validarPerfil exige los datos academicos cuando el area es Docencia', () => {
  const { errores } = validarPerfil({ ...perfilValido(), materia: '', situacion_revista: '', modulos: '', dia: '', hora_desde: '', hora_hasta: '' }, AREAS);

  assert.ok(errores.materia);
  assert.ok(errores.situacion_revista);
  assert.ok(errores.modulos);
  assert.ok(errores.dia);
  assert.ok(errores.hora_desde);
  assert.ok(errores.hora_hasta);
});

test('validarPerfil exige el docente reemplazado cuando la situacion es Suplente', () => {
  const { errores, datos } = validarPerfil(perfilValido({ situacion_revista: 'Suplente', suplente_de: '' }), AREAS);

  assert.ok(errores.suplente_de);

  const valido = validarPerfil(perfilValido({ situacion_revista: 'Suplente', suplente_de: 'Ana Pérez' }), AREAS);
  assert.equal(valido.errores.suplente_de, undefined);
  assert.equal(valido.datos.suplente_de, 'Ana Pérez');
});

test('validarPerfil exige un dia de cursada de lunes a viernes y lo envia', () => {
  assert.deepEqual(DIAS_CURSADA.map((dia) => dia.nombre), ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
  assert.ok(validarPerfil(perfilValido({ dia: '' }), AREAS).errores.dia);
  assert.ok(validarPerfil(perfilValido({ dia: 'Sabado' }), AREAS).errores.dia);

  for (const { id } of DIAS_CURSADA) {
    const { errores, datos } = validarPerfil(perfilValido({ dia: id }), AREAS);
    assert.equal(errores.dia, undefined);
    assert.equal(datos.dia, id);
  }

  /* Fuera de Docencia no se pide ni se envia. */
  const { errores, datos } = validarPerfil(perfilValido({ area: 'secretaria', dia: '' }), AREAS);
  assert.equal(errores.dia, undefined);
  assert.equal(datos.dia, undefined);
});

test('validarPerfil solo acepta los modulos 2, 3, 4 y 6', () => {
  assert.ok(validarPerfil(perfilValido({ modulos: '5' }), AREAS).errores.modulos);
  assert.ok(validarPerfil(perfilValido({ modulos: '8' }), AREAS).errores.modulos);
  assert.equal(validarPerfil(perfilValido({ modulos: '6' }), AREAS).errores.modulos, undefined);
});

test('validarPerfil valida el formato y el orden de las horas', () => {
  assert.ok(validarPerfil(perfilValido({ hora_desde: '8:00' }), AREAS).errores.hora_desde);
  assert.ok(validarPerfil(perfilValido({ hora_hasta: '25:00' }), AREAS).errores.hora_hasta);
  assert.ok(validarPerfil(perfilValido({ hora_desde: '12:00', hora_hasta: '08:00' }), AREAS).errores.hora_hasta);
  assert.equal(validarPerfil(perfilValido({ hora_desde: '08:00', hora_hasta: '12:00' }), AREAS).errores.hora_hasta, undefined);
});

test('validarPerfil no pide ni envia datos academicos fuera de Docencia', () => {
  const { errores, datos } = validarPerfil(
    perfilValido({ area: 'preceptoria', roles: ['preceptor'], materia: '', situacion_revista: '', modulos: '', hora_desde: '', hora_hasta: '' }),
    AREAS
  );

  assert.equal(errores.materia, undefined);
  assert.equal(errores.situacion_revista, undefined);
  assert.equal(errores.modulos, undefined);
  assert.equal(errores.hora_desde, undefined);
  assert.equal(errores.hora_hasta, undefined);
  assert.equal(datos.materia, undefined);
  assert.equal(datos.modulos, undefined);
});

test('formularioSucio detecta lo escrito y los roles marcados', () => {
  assert.equal(formularioSucio(formularioVacio()), false);
  assert.equal(formularioSucio({ ...formularioVacio(), nombre: 'Ana' }), true);
  assert.equal(formularioSucio({ ...formularioVacio(), roles: ['docente'] }), true);
  assert.equal(formularioSucio({ ...formularioVacio(), nombre: '   ' }), false);
});
