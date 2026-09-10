import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDefaultObservationForm,
  resolveResponsibleFromUser,
  buildObservationRecord
} from './observaciones-service.js';

test('getDefaultObservationForm usa el alumno preseleccionado cuando viene desde el perfil', () => {
  const form = getDefaultObservationForm({ alumno: 'Gómez, Mateo' });

  assert.equal(form.alumno, 'Gómez, Mateo');
  assert.equal(form.descripcion.length <= 500, true);
  assert.equal(form.tipo, '');
  assert.equal(form.estado, '');
});

test('resolveResponsibleFromUser usa el usuario autenticado cuando el backend lo habilita', () => {
  const user = { nombre: 'Preceptoría', rolNombre: 'Preceptoría' };

  assert.equal(resolveResponsibleFromUser(user, true), 'Preceptoría');
});

test('buildObservationRecord guarda el responsable y la relación con el alumno', () => {
  const record = buildObservationRecord({
    alumno: 'Gómez, Mateo',
    tipo: 'Convivencia',
    fecha: '2026-09-10',
    descripcion: 'Se registró una observación de prueba.',
    sector: 'Preceptoría',
    responsable: 'Preceptoría',
    estado: 'Activa'
  });

  assert.equal(record.alumno, 'Gómez, Mateo');
  assert.equal(record.responsable, 'Preceptoría');
  assert.equal(record.estado, 'Activa');
  assert.equal(record.descripcion, 'Se registró una observación de prueba.');
});
