// Recherche côté client : insensible à la casse et aux accents, tous les mots requis.

/** Normalise un texte : minuscules, sans accents, ligatures et apostrophes uniformisées. */
function normalizeChars(text) {
  return String(text ?? '')
    .normalize('NFD')
    .toLowerCase()
    .replace(/\p{M}/gu, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[’‘`]/g, "'");
}

/** Normalisation pour la comparaison (espaces multiples réduits). */
export function normalize(text) {
  return normalizeChars(text).replace(/\s+/g, ' ').trim();
}

/**
 * Construit l'index une seule fois : on précalcule les textes normalisés
 * pour que chaque frappe ne fasse que des `includes`.
 */
export function buildIndex(items) {
  return items.map((item) => {
    const title = normalize(item.title);
    const original = normalize(item.originalTitle);
    return { item, title, haystack: `${title} ${original}` };
  });
}

/** Découpe une requête en mots normalisés (sans doublons ni mots vides). */
function words(query) {
  return [...new Set(normalize(query).split(' ').filter(Boolean))];
}

/** Début de mot : le terme est en tête de texte ou précédé d'un espace. */
function startsWord(text, word) {
  return text.startsWith(word) || text.includes(` ${word}`);
}

/**
 * Cherche dans l'index. Titre ou titre original, tous les mots présents (ordre indifférent).
 * Tri : titre qui commence par la requête, puis débuts de mots, puis le reste ;
 * à égalité, popularité décroissante.
 * Retourne { results, total } : `results` est limité à `limit`, `total` est le nombre complet.
 */
export function search(index, query, limit = 30) {
  const terms = words(query);
  if (!terms.length) return { results: [], total: 0 };

  const phrase = terms.join(' ');
  const hits = [];
  for (const entry of index) {
    if (!terms.every((t) => entry.haystack.includes(t))) continue;
    let rank = 2;
    if (entry.title.startsWith(phrase)) rank = 0;
    else if (terms.every((t) => startsWord(entry.haystack, t))) rank = 1;
    hits.push({ entry, rank });
  }

  hits.sort((a, b) =>
    a.rank - b.rank ||
    (b.entry.item.popularity || 0) - (a.entry.item.popularity || 0) ||
    a.entry.title.localeCompare(b.entry.title));

  return { results: hits.slice(0, limit).map((h) => h.entry.item), total: hits.length };
}

/** Retourne une fonction qui n'appelle `fn` qu'après `delay` ms sans nouvel appel. */
export function debounce(fn, delay = 150) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** Échappement HTML (utilisé sur chaque segment avant d'insérer du balisage). */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * Surligne dans `text` les mots de `query` avec <mark>, sans tenir compte
 * de la casse ni des accents. Chaque segment (avant / surligné / après) est
 * échappé séparément : le résultat est sûr à injecter avec innerHTML.
 */
export function highlight(text, query) {
  const source = String(text ?? '');
  const terms = words(query);
  if (!terms.length) return escapeHtml(source);

  // Texte normalisé caractère par caractère, avec la correspondance vers l'original
  // (une lettre accentuée ou une ligature peut changer la longueur).
  let normalized = '';
  const origin = []; // position normalisée -> position dans l'original
  let pos = 0;
  for (const ch of source) {
    const n = normalizeChars(ch);
    for (let i = 0; i < n.length; i++) origin.push(pos);
    normalized += n;
    pos += ch.length;
  }

  // Intervalles [début, fin[ à surligner, fusionnés s'ils se chevauchent.
  const ranges = [];
  for (const term of terms) {
    for (let at = normalized.indexOf(term); at !== -1; at = normalized.indexOf(term, at + term.length)) {
      const last = at + term.length - 1;
      const end = origin[last] + (source.codePointAt(origin[last]) > 0xffff ? 2 : 1);
      ranges.push([origin[at], end]);
    }
  }
  if (!ranges.length) return escapeHtml(source);

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (const [start, end] of ranges.slice(1)) {
    const prev = merged[merged.length - 1];
    if (start <= prev[1]) prev[1] = Math.max(prev[1], end);
    else merged.push([start, end]);
  }

  let html = '';
  let cursor = 0;
  for (const [start, end] of merged) {
    html += escapeHtml(source.slice(cursor, start));
    html += `<mark>${escapeHtml(source.slice(start, end))}</mark>`;
    cursor = end;
  }
  return html + escapeHtml(source.slice(cursor));
}
