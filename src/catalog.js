// Chargement du catalogue JSON et adaptation de son format brut.

/** Pays suivis en V1, dans l'ordre d'affichage des badges. */
export const COUNTRIES = ['FR', 'IT', 'BE', 'CH'];

const POSTER_BASE = 'https://image.tmdb.org/t/p/w154';

/**
 * Seul endroit qui connaît le schéma brut du JSON (voir scripts/fetch-tmdb.mjs).
 * Le reste de l'application ne manipule que l'objet normalisé retourné ici :
 * { id, type, title, originalTitle, year, poster, popularity, rating, genres, countries }
 */
export function normalizeItem(raw) {
  const availability = raw.availability || {};
  return {
    id: `${raw.media_type}-${raw.id}`,
    type: raw.media_type === 'tv' ? 'series' : 'movie',
    title: raw.title || raw.original_title || '',
    originalTitle: raw.original_title || '',
    year: raw.year || null,
    poster: raw.poster_path ? POSTER_BASE + raw.poster_path : null,
    popularity: raw.popularity || 0,
    rating: raw.rating || 0,
    genres: raw.genres || [],
    countries: COUNTRIES.filter((c) => availability[c]),
  };
}

/** Lit le JSON statique et retourne { items, generatedAt, sample }. */
export async function loadCatalog(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Catalogue indisponible (${response.status})`);
  const data = await response.json();
  return {
    items: (data.items || []).map(normalizeItem),
    generatedAt: data.generated_at || null,
    sample: Boolean(data.sample),
  };
}

/**
 * Texte du badge « Absent en FR · dispo IT, BE ».
 * Retourne null sauf si le titre est indisponible en France ET disponible ailleurs.
 */
export function availabilityBadge(item) {
  if (item.countries.includes('FR')) return null;
  const elsewhere = item.countries.filter((c) => c !== 'FR');
  return elsewhere.length ? `Absent en FR · dispo ${elsewhere.join(', ')}` : null;
}
