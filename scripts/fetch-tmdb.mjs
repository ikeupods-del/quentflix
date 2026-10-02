// Génère public/data/catalog.json à partir de l'API TMDB (Netflix = fournisseur 8).
// Usage : TMDB_API_KEY=... node scripts/fetch-tmdb.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('TMDB_API_KEY manquante.');
  process.exit(1);
}

const COUNTRIES = ['FR', 'IT', 'BE', 'CH'];
const NETFLIX = 8;
const MAX_PAGES = 500; // plafond imposé par TMDB
const TYPES = ['movie', 'tv'];

// Clé v4 (jeton, longue) en en-tête, clé v3 en paramètre.
const bearer = KEY.length > 60;

async function api(path, params) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!bearer) url.searchParams.set('api_key', KEY);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, bearer ? { headers: { Authorization: `Bearer ${KEY}` } } : undefined);
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`TMDB ${res.status} sur ${path}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error(`TMDB injoignable sur ${path}`);
}

// Noms des genres (films et séries), pour ne stocker que du texte dans le catalogue.
const genreNames = {};
for (const type of ['movie', 'tv']) {
  const { genres } = await api(`/genre/${type}/list`, { language: 'fr-FR' });
  for (const g of genres) genreNames[g.id] = g.name;
}

/** Parcourt toutes les pages « discover » d'un type pour un pays. */
async function discover(type, country) {
  const base = {
    with_watch_providers: NETFLIX,
    watch_region: country,
    with_watch_monetization_types: 'flatrate',
    language: 'fr-FR',
    sort_by: 'popularity.desc',
  };
  const first = await api(`/discover/${type}`, { ...base, page: 1 });
  const pages = Math.min(first.total_pages, MAX_PAGES);
  const results = [...first.results];
  for (let page = 2; page <= pages; page += 5) {
    const batch = [];
    for (let p = page; p < page + 5 && p <= pages; p++) batch.push(api(`/discover/${type}`, { ...base, page: p }));
    for (const r of await Promise.all(batch)) results.push(...r.results);
  }
  return results;
}

const byKey = new Map();
for (const type of TYPES) {
  for (const country of COUNTRIES) {
    const results = await discover(type, country);
    console.log(`${type} ${country} : ${results.length}`);
    for (const r of results) {
      const key = `${type}-${r.id}`;
      if (!byKey.has(key)) {
        const date = r.release_date || r.first_air_date || '';
        byKey.set(key, {
          id: r.id,
          media_type: type,
          title: r.title || r.name,
          original_title: r.original_title || r.original_name,
          year: date ? Number(date.slice(0, 4)) : null,
          poster_path: r.poster_path || null,
          popularity: Math.round(r.popularity || 0),
          rating: Math.round((r.vote_average || 0) * 10) / 10,
          genres: (r.genre_ids || []).map((g) => genreNames[g]).filter(Boolean),
          availability: { FR: false, IT: false, BE: false, CH: false },
        });
      }
      byKey.get(key).availability[country] = true;
    }
  }
}

const items = [...byKey.values()].sort((a, b) => b.popularity - a.popularity);
await mkdir('public/data', { recursive: true });
await writeFile('public/data/catalog.json',
  JSON.stringify({ generated_at: new Date().toISOString(), items }));
console.log(`${items.length} titres écrits.`);
