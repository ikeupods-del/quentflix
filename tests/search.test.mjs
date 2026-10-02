import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, buildIndex, search, debounce, highlight } from '../src/search.js';
import { normalizeItem, availabilityBadge } from '../src/catalog.js';

const items = [
  { title: 'Amélie', originalTitle: "Le Fabuleux Destin d'Amélie Poulain", popularity: 1 },
  { title: 'Tom & Jerry', originalTitle: 'Tom & Jerry', popularity: 2 },
  { title: '<b>Piège</b>', originalTitle: '', popularity: 3 },
  { title: 'Cœur de pirate', originalTitle: 'Heart of a Pirate', popularity: 4 },
];
const index = buildIndex(items);

test('normalize ignore casse et accents', () => {
  assert.equal(normalize('  ÉLÉPHANT  Rose '), 'elephant rose');
  assert.equal(normalize('Cœur'), 'coeur');
});

test('« amelie » et « Amélie » donnent les mêmes résultats', () => {
  assert.deepEqual(search(index, 'amelie').results, search(index, 'Amélie').results);
  assert.equal(search(index, 'amelie').total, 1);
});

test('tous les mots requis, ordre indifférent, titre original inclus', () => {
  assert.equal(search(index, 'poulain destin').total, 1);
  assert.equal(search(index, 'jerry tom').total, 1);
  assert.equal(search(index, 'tom absent').total, 0);
  assert.equal(search(index, 'heart').total, 1);
});

test('requête vide : aucun résultat', () => {
  assert.deepEqual(search(index, '   '), { results: [], total: 0 });
});

test('limite de résultats', () => {
  const many = buildIndex(Array.from({ length: 50 }, (_, i) => ({ title: `Film ${i}`, originalTitle: '' })));
  const r = search(many, 'film', 30);
  assert.equal(r.results.length, 30);
  assert.equal(r.total, 50);
});

test('highlight surligne sans tenir compte des accents', () => {
  assert.equal(highlight('Amélie', 'amel'), '<mark>Amél</mark>ie');
  assert.equal(highlight('Cœur', 'coeur'), '<mark>Cœur</mark>');
});

test('highlight échappe le HTML sur chaque segment', () => {
  assert.equal(highlight('<b>Piège</b>', 'piege'), '&lt;b&gt;<mark>Piège</mark>&lt;/b&gt;');
  assert.equal(highlight('Tom & Jerry', 'jerry'), 'Tom &amp; <mark>Jerry</mark>');
  assert.equal(highlight('a < b', '<'), 'a <mark>&lt;</mark> b');
  assert.equal(highlight('x<script>', 'zzz'), 'x&lt;script&gt;');
});

test('debounce regroupe les appels rapprochés', async () => {
  let calls = 0;
  const d = debounce(() => calls++, 20);
  d(); d(); d();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(calls, 1);
});

test('badge : seulement si absent en FR et dispo ailleurs', () => {
  const mk = (a) => normalizeItem({ id: 1, media_type: 'movie', title: 'x', availability: a });
  assert.equal(availabilityBadge(mk({ FR: false, IT: true, BE: true })), 'Absent en FR · dispo IT, BE');
  assert.equal(availabilityBadge(mk({ FR: true, IT: true })), null);
  assert.equal(availabilityBadge(mk({ FR: false })), null);
});
