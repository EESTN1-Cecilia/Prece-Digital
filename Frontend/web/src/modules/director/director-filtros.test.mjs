import test from 'node:test';
import assert from 'node:assert/strict';

import { filtrarPersonal, resumenFiltro } from './director-filtros.js';

const PERSONAL = [
  {
    id: 'u1',
    nombre: 'Ana',
    apellido: 'Gómez',
    nombreCompleto: 'Gómez, Ana',
    email: 'ana.gomez@prece.local',
    dni: '30123456',
    area: 'docencia',
    areaNombre: 'Docencia',
    estado: 'activo',
    roles: [{ id: 'docente' }, { id: 'preceptor' }]
  },
  {
    id: 'u2',
    nombre: 'Beto',
    apellido: 'Sosa',
    nombreCompleto: 'Sosa, Beto',
    email: 'beto.sosa@prece.local',
    dni: '30234567',
    area: 'secretaria',
    areaNombre: 'Secretaría',
    estado: 'activo',
    roles: [{ id: 'secretario' }]
  },
  {
    id: 'u3',
    nombre: 'Caro',
    apellido: 'Ruiz',
    nombreCompleto: 'Ruiz, Caro',
    email: 'caro.ruiz@prece.local',
    dni: '30345678',
    area: 'docencia',
    areaNombre: 'Docencia',
    estado: 'inactivo',
    roles: [{ id: 'docente' }]
  }
];

test('sin filtros el listado devuelve todo el personal', () => {
  const resultado = filtrarPersonal(PERSONAL, { q: '', rol: '', estado: '' });

  assert.equal(resultado.length, 3);
});

test('la opcion "todos" de los filtros no deja a nadie fuera', () => {
  const resultado = filtrarPersonal(PERSONAL, { rol: 'todos', estado: 'todos', area: 'todos' });

  assert.equal(resultado.length, 3);
});

test('el filtro por rol deja solo a quienes lo tienen asignado', () => {
  const resultado = filtrarPersonal(PERSONAL, { rol: 'preceptor' });

  assert.deepEqual(resultado.map((persona) => persona.id), ['u1']);
});

test('el filtro por estado separa los perfiles inactivos', () => {
  const resultado = filtrarPersonal(PERSONAL, { estado: 'inactivo' });

  assert.deepEqual(resultado.map((persona) => persona.id), ['u3']);
});

test('la busqueda busca por nombre, apellido, correo y dni sin distinguir mayusculas', () => {
  assert.deepEqual(filtrarPersonal(PERSONAL, { q: 'gomez' }).map((p) => p.id), ['u1']);
  assert.deepEqual(filtrarPersonal(PERSONAL, { q: 'ruiz' }).map((p) => p.id), ['u3']);
  assert.deepEqual(filtrarPersonal(PERSONAL, { q: '30345678' }).map((p) => p.id), ['u3']);
  assert.deepEqual(filtrarPersonal(PERSONAL, { q: 'sosa' }).map((p) => p.id), ['u2']);
});

test('los filtros se combinan: busqueda + rol + estado + area', () => {
  const resultado = filtrarPersonal(PERSONAL, { q: 'a', rol: 'docente', estado: 'activo', area: 'docencia' });

  assert.deepEqual(resultado.map((persona) => persona.id), ['u1']);
});

test('una combinacion sin coincidencias devuelve una lista vacia, no un error', () => {
  const resultado = filtrarPersonal(PERSONAL, { q: 'ana', rol: 'secretario' });

  assert.deepEqual(resultado, []);
});

test('resumenFiltro cuenta todos cuando no hay filtros activos', () => {
  assert.equal(resumenFiltro(3, 3, false), '3 miembros');
  assert.equal(resumenFiltro(1, 1, false), '1 miembro');
});

test('resumenFiltro muestra cuantos quedan de los que hay cuando hay filtros', () => {
  assert.equal(resumenFiltro(2, 3, true), '2 de 3 miembros');
  assert.equal(resumenFiltro(1, 1, true), '1 de 1 miembro');
});
