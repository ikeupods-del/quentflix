import test from 'node:test';
import assert from 'node:assert/strict';
import { candidates, pick } from '../src/tonight.js';

const items = [
  { id: 1, type: 'movie', countries: ['IT'] },
  { id: 2, type: 'series', countries: ['BE', 'CH'] },
  { id: 3, type: 'movie', countries: ['FR', 'IT'] },
  { id: 4, type: 'movie', countries: [] },
];
test('exclut les titres dispos en FR, nulle part, ou déjà vus', () => {
  assert.deepEqual(candidates(items).map((i) => i.id), [1, 2]);
  assert.deepEqual(candidates(items, {}, [1]).map((i) => i.id), [2]);
});
test('filtre par type et pays', () => {
  assert.deepEqual(candidates(items, { type: 'series', country: 'CH' }).map((i) => i.id), [2]);
  assert.deepEqual(candidates(items, { country: 'IT' }).map((i) => i.id), [1]);
});
test('pick évite le titre précédent et gère le vide', () => {
  assert.equal(pick(items.slice(0, 2), 1).id, 2);
  assert.equal(pick([], null), null);
});
